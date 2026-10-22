import { createIdbConnection } from './idb-connection.js';
import { recoverOperation } from '../storage/automatic-recovery.js';

// 导出中间块落入独立暂存库。文件写入中断时逐块重放，保持 ZIP 内容完整。
async function recoverableWriter(file, writer, globalObject) {
    const prefix = `${globalThis.crypto?.randomUUID?.() || Date.now()}:`;
    const chunks = new Map();
    const connection = globalObject.indexedDB ? createIdbConnection(globalObject.indexedDB,
        'igs-export-staging', 1, db => { if (!db.objectStoreNames.contains('chunks')) db.createObjectStore('chunks'); }) : null;
    let count = 0, replay = false, committed = false;
    const controller = new AbortController();
    const recovering = execute => recoverOperation(execute, { repeatable: 'save', signal: controller.signal, global: globalObject });
    const read = index => connection ? connection.transact('chunks', 'readonly', tx => tx.objectStore('chunks').get(prefix + index)) : chunks.get(index);
    const put = (index, bytes) => connection ? connection.transact('chunks', 'readwrite', tx => tx.objectStore('chunks').put(bytes, prefix + index)) : chunks.set(index, bytes);
    const cleanup = async () => {
        if (connection) {
            await connection.transact('chunks', 'readwrite', tx => {
                const store = tx.objectStore('chunks');
                for (let index = 0; index < count; index++) store.delete(prefix + index);
            });
            await connection.close();
        }
        chunks.clear();
    };
    const ready = async () => {
        if (!replay) return;
        // createWritable 持有文件独占锁；释放失败写入器后才能在同一文件重放。
        try { await writer.abort(); } catch { /* 已关闭的写入器没有锁 */ }
        writer = await file.createWritable();
        for (let index = 0; index < count; index++) await writer.write(await read(index));
        replay = false;
    };
    return {
        async write(bytes) {
            if (controller.signal.aborted) throw new Error('archive-cancelled');
            await recovering(() => put(count, bytes));
            count++;
            return recovering(async () => {
                try { if (replay) await ready(); else await writer.write(bytes); return { ok: true }; }
                catch (error) { replay = true; throw error; }
            });
        },
        async close() {
            await recovering(async () => {
                try { if (!committed) { await ready(); await writer.close(); committed = true; } return { ok: true }; }
                catch (error) { replay = true; throw error; }
            });
            if (!controller.signal.aborted) await recovering(cleanup);
        },
        async abort(error) { controller.abort(); try { await writer.abort(error); } finally { await cleanup(); } },
    };
}

export async function createArchiveDownload(globalObject, name) {
    const BlobCtor = globalObject.Blob || globalThis.Blob;
    if (typeof globalObject.showSaveFilePicker === 'function') {
        try {
            const file = await globalObject.showSaveFilePicker({ suggestedName: name, types: [{ description: 'ZIP', accept: { 'application/zip': ['.zip'] } }] });
            const writer = await recoverOperation(() => file.createWritable(), { repeatable: 'save', global: globalObject });
            return { mode: 'file', ...await recoverableWriter(file, writer, globalObject) };
        } catch (error) { if (!['SecurityError', 'NotAllowedError', 'NotSupportedError'].includes(error.name)) throw error; }
    }
    let directory, file, writer;
    const temporary = `igs-export-${globalThis.crypto?.randomUUID?.() || Date.now()}.zip`;
    try {
        directory = await globalObject.navigator?.storage?.getDirectory?.();
        if (directory) {
            file = await directory.getFileHandle(temporary, { create: true });
            if (typeof file.createWritable === 'function') writer = await file.createWritable();
            else { await directory.removeEntry(temporary); file = null; directory = null; }
        }
    } catch (error) {
        if (directory) await directory.removeEntry(temporary).catch(() => {});
        if (!['SecurityError', 'NotAllowedError', 'NotSupportedError'].includes(error.name)) throw error;
        directory = null; file = null; writer = null;
    }
    if (writer) writer = await recoverableWriter(file, writer, globalObject);
    const parts = [];
    const cleanup = async () => { parts.length = 0; if (directory) await directory.removeEntry(temporary).catch(() => {}); };
    return {
        mode: writer ? 'temporary-file' : 'browser-blob',
        async write(bytes) { if (writer) await writer.write(bytes); else parts.push(new BlobCtor([bytes])); },
        async close() {
            if (writer) await writer.close();
            const blob = file ? await file.getFile() : new BlobCtor(parts, { type: 'application/zip' }); parts.length = 0;
            const urlApi = globalObject.URL || globalThis.URL, doc = globalObject.document;
            if (!doc?.createElement || !urlApi?.createObjectURL) { await cleanup(); throw new Error('archive-download-unavailable'); }
            const url = urlApi.createObjectURL(blob), link = doc.createElement('a');
            link.href = url; link.download = name; doc.body.appendChild(link); link.click(); doc.body.removeChild(link);
            const timer = (globalObject.setTimeout || setTimeout)(() => { urlApi.revokeObjectURL(url); void cleanup(); }, 60000); timer?.unref?.();
        },
        async abort(error) { try { await writer?.abort(error); } finally { await cleanup(); } },
    };
}
