export const MEDIA_METADATA_BUDGET = 16 * 1024 * 1024;

// 估算 JS 元数据的驻留成本；它不是浏览器堆或解码像素的精确测量。
export function metadataBytes(value) {
    const pending = [value], seen = new Set();
    let bytes = 0, visits = 0;
    while (pending.length) {
        if (++visits > 100000) return Infinity;
        const item = pending.pop();
        if (typeof item === 'string') { bytes += item.length * 2 + 16; continue; }
        if (item == null || typeof item !== 'object') { bytes += 8; continue; }
        if (seen.has(item)) continue;
        seen.add(item); bytes += 64;
        if (ArrayBuffer.isView(item) || item instanceof ArrayBuffer) { bytes += item.byteLength; continue; }
        if (Array.isArray(item)) { bytes += item.length * 8; for (const child of item) pending.push(child); continue; }
        const prototype = Object.getPrototypeOf(item);
        if (prototype !== Object.prototype && prototype !== null) continue;
        for (const [key, child] of Object.entries(item)) { bytes += key.length * 2 + 16; pending.push(child); }
    }
    return bytes;
}
