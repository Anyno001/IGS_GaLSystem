const encoder = new TextEncoder();
const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit++) value = value >>> 1 ^ (value & 1 ? 0xedb88320 : 0);
    return value >>> 0;
});
const crc = (value, bytes) => { for (const byte of bytes) value = value >>> 8 ^ crcTable[(value ^ byte) & 255]; return value; };
const aborted = signal => { if (signal?.aborted) throw new Error('archive-cancelled'); };
const safeName = name => typeof name === 'string' && name && !name.startsWith('/') && !name.includes('\\') && !name.split('/').some(part => part === '..' || !part);

export async function writeZip(entries, sink, { signal } = {}) {
    const central = []; let offset = 0;
    const write = async bytes => { aborted(signal); await sink.write(bytes); offset += bytes.length; };
    try {
        for await (const entry of entries) {
            aborted(signal);
            if (!safeName(entry.name)) throw new Error('archive-entry-name-invalid');
            const name = encoder.encode(entry.name), start = offset;
            if (name.length > 65535) throw new Error('archive-entry-name-invalid');
            const header = new Uint8Array(30 + name.length), view = new DataView(header.buffer);
            view.setUint32(0, 0x04034b50, true); view.setUint16(4, 20, true); view.setUint16(6, 0x0808, true);
            view.setUint16(26, name.length, true); header.set(name, 30); await write(header);
            let size = 0, hash = ~0;
            const blob = typeof entry.blob === 'function' ? await entry.blob() : entry.blob;
            if (!blob?.stream) throw new Error('archive-entry-unreadable');
            const reader = blob.stream().getReader();
            const cancel = () => { void reader.cancel().catch(() => {}); };
            signal?.addEventListener('abort', cancel, { once: true });
            try {
                for (;;) {
                    aborted(signal); const chunk = await reader.read(); if (chunk.done) break;
                    size += chunk.value.length; hash = crc(hash, chunk.value); await write(chunk.value);
                }
            } finally { signal?.removeEventListener('abort', cancel); await reader.cancel().catch(() => {}); reader.releaseLock(); }
            aborted(signal);
            if (size > 0xffffffff || offset > 0xffffffff || central.length >= 65535) throw new Error('archive-zip64-required');
            const checksum = ~hash >>> 0, descriptor = new Uint8Array(16), tail = new DataView(descriptor.buffer);
            tail.setUint32(0, 0x08074b50, true); tail.setUint32(4, checksum, true); tail.setUint32(8, size, true); tail.setUint32(12, size, true); await write(descriptor);
            const row = new Uint8Array(46 + name.length), meta = new DataView(row.buffer);
            meta.setUint32(0, 0x02014b50, true); meta.setUint16(4, 20, true); meta.setUint16(6, 20, true); meta.setUint16(8, 0x0808, true);
            meta.setUint32(16, checksum, true); meta.setUint32(20, size, true); meta.setUint32(24, size, true); meta.setUint16(28, name.length, true);
            meta.setUint32(42, start, true); row.set(name, 46); central.push(row);
        }
        const start = offset;
        if (offset + central.reduce((sum, row) => sum + row.length, 0) > 0xffffffff) throw new Error('archive-zip64-required');
        for (const row of central) await write(row);
        const end = new Uint8Array(22), view = new DataView(end.buffer);
        view.setUint32(0, 0x06054b50, true); view.setUint16(8, central.length, true); view.setUint16(10, central.length, true);
        view.setUint32(12, offset - start, true); view.setUint32(16, start, true); await write(end);
        await sink.close(); return { ok: true, bytes: offset, files: central.length };
    } catch (error) { await sink.abort?.(error); throw error; }
}

export async function readZip(blob) {
    if (!blob?.slice || !Number.isSafeInteger(blob.size) || blob.size < 22) throw new Error('archive-invalid');
    const bytes = async (start, length) => {
        if (start < 0 || length < 0 || start + length > blob.size) throw new Error('archive-invalid');
        return new Uint8Array(await blob.slice(start, start + length).arrayBuffer());
    };
    const from = Math.max(0, blob.size - 65557), tail = await bytes(from, blob.size - from), view = new DataView(tail.buffer);
    let end = -1;
    for (let i = tail.length - 22; i >= 0; i--) if (view.getUint32(i, true) === 0x06054b50 && i + 22 + view.getUint16(i + 20, true) === tail.length) { end = i; break; }
    if (end < 0 || view.getUint16(end + 4, true) || view.getUint16(end + 6, true)) throw new Error('archive-invalid');
    const count = view.getUint16(end + 10, true), size = view.getUint32(end + 12, true), start = view.getUint32(end + 16, true);
    if (start + size !== from + end) throw new Error('archive-invalid');
    const records = new Map(); let cursor = start;
    for (let index = 0; index < count; index++) {
        const row = await bytes(cursor, 46), meta = new DataView(row.buffer);
        if (meta.getUint32(0, true) !== 0x02014b50 || meta.getUint16(8, true) & 1 || meta.getUint16(10, true) !== 0) throw new Error('archive-method-unsupported');
        const nameSize = meta.getUint16(28, true), extra = meta.getUint16(30, true), comment = meta.getUint16(32, true);
        const name = new TextDecoder().decode(await bytes(cursor + 46, nameSize)), length = meta.getUint32(24, true), offset = meta.getUint32(42, true), checksum = meta.getUint32(16, true);
        if (!safeName(name) || records.has(name) || length !== meta.getUint32(20, true)) throw new Error('archive-invalid');
        const local = new DataView((await bytes(offset, 30)).buffer);
        if (local.getUint32(0, true) !== 0x04034b50) throw new Error('archive-invalid');
        const localName = local.getUint16(26, true), dataStart = offset + 30 + localName + local.getUint16(28, true);
        if (new TextDecoder().decode(await bytes(offset + 30, localName)) !== name || dataStart + length > start) throw new Error('archive-invalid');
        records.set(name, { name, size: length, async blob() {
            const result = blob.slice(dataStart, dataStart + length); let hash = ~0;
            const reader = result.stream().getReader();
            try { for (;;) { const chunk = await reader.read(); if (chunk.done) break; hash = crc(hash, chunk.value); } } finally { reader.releaseLock(); }
            if ((~hash >>> 0) !== checksum) throw new Error('archive-checksum-failed');
            return result;
        } });
        cursor += 46 + nameSize + extra + comment;
    }
    if (cursor !== start + size) throw new Error('archive-invalid');
    return records;
}
