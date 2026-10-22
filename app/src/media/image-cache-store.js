import { createIdbConnection } from './idb-connection.js';

export function createMemoryImageCacheStore() {
    const files = new Map(), meta = new Map();
    const discard = identity => { if (![...meta.values()].some(row => row.identity === identity)) files.delete(identity); };
    return {
        backend: 'memory-adapter', persistent: false,
        async get(path) { return files.get(meta.get(path)?.identity)?.data || ''; },
        async put(path, data, usedAt, bytes, identity = path, displayCompressed = false) {
            const old = meta.get(path)?.identity;
            files.set(identity, { data }); meta.set(path, { path, identity, usedAt, bytes, displayCompressed });
            if (old && old !== identity) discard(old);
        },
        async touch(path, usedAt, bytes) { if (meta.has(path)) { meta.get(path).usedAt = usedAt; if (Number.isFinite(bytes)) meta.get(path).bytes = bytes; } },
        async delete(path) { const old = meta.get(path)?.identity; meta.delete(path); if (old) discard(old); },
        async deleteMany(paths) {
            const identities = new Set(paths.map(path => meta.get(path)?.identity));
            for (const path of paths) meta.delete(path);
            for (const identity of identities) if (identity) discard(identity);
        },
        async clear() { files.clear(); meta.clear(); },
        async allMeta() { return [...meta.values()].map(row => ({ ...row })); },
    };
}

export function createIdbImageCacheStore(idb) {
    // displayCompressed 是记录字段，未改变 v3 表结构，无需提升数据库版本。
    // 已用本地草稿升至 v4 的库直接兼容读取，保留已有像素及别名。
    const conn = createIdbConnection(idb, 'igs-image-cache', 3, (db, transaction, oldVersion) => {
        if (!db.objectStoreNames.contains('files')) db.createObjectStore('files', { keyPath: 'path' });
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'path' });
        if (oldVersion > 0 && oldVersion < 3) {
            transaction.objectStore('files').clear(); transaction.objectStore('meta').clear();
        }
    }, { acceptNewerVersion(db) {
        if (!db.objectStoreNames.contains('files') || !db.objectStoreNames.contains('meta')) return false;
        const tx = db.transaction(['files', 'meta'], 'readonly');
        return ['files', 'meta'].every(name => tx.objectStore(name).keyPath === 'path');
    } });
    const mutate = callback => conn.transact(['files', 'meta'], 'readwrite', tx => {
        const files = tx.objectStore('files'), meta = tx.objectStore('meta');
        const request = meta.getAll();
        request.onsuccess = () => callback(files, meta, request.result || []);
        return () => undefined;
    });
    return {
        backend: 'indexeddb', persistent: true,
        close: conn.close,
        async get(path) {
            let data = '';
            await conn.transact(['files', 'meta'], 'readonly', tx => {
                const request = tx.objectStore('meta').get(path);
                request.onsuccess = () => {
                    if (!request.result?.identity) return;
                    const file = tx.objectStore('files').get(request.result.identity);
                    file.onsuccess = () => { data = file.result?.data || ''; };
                };
                return () => data;
            });
            return data;
        },
        async put(path, data, usedAt, bytes, identity = path, displayCompressed = false) {
            await mutate((files, meta, rows) => {
                const old = rows.find(row => row.path === path)?.identity;
                files.put({ path: identity, data }); meta.put({ path, identity, usedAt, bytes, displayCompressed });
                if (old && old !== identity && !rows.some(row => row.path !== path && row.identity === old)) files.delete(old);
            });
        },
        async touch(path, usedAt, bytes) {
            await conn.transact('meta', 'readwrite', tx => {
                const store = tx.objectStore('meta'), request = store.get(path);
                request.onsuccess = () => { if (request.result) store.put({ ...request.result, usedAt, ...(Number.isFinite(bytes) ? { bytes } : {}) }); };
                return () => undefined;
            });
        },
        async delete(path) {
            await mutate((files, meta, rows) => {
                const old = rows.find(row => row.path === path)?.identity;
                meta.delete(path);
                if (old && !rows.some(row => row.path !== path && row.identity === old)) files.delete(old);
            });
        },
        async deleteMany(paths) {
            if (!paths.length) return;
            const selected = new Set(paths);
            await mutate((files, meta, rows) => {
                const retained = new Set(rows.filter(row => !selected.has(row.path)).map(row => row.identity));
                const removed = new Set(rows.filter(row => selected.has(row.path)).map(row => row.identity));
                for (const path of paths) meta.delete(path);
                for (const identity of removed) if (!retained.has(identity)) files.delete(identity);
            });
        },
        async clear() {
            await conn.transact(['files', 'meta'], 'readwrite', tx => {
                tx.objectStore('files').clear(); tx.objectStore('meta').clear(); return () => undefined;
            });
        },
        async allMeta() { return await conn.transact('meta', 'readonly', tx => tx.objectStore('meta').getAll()) || []; },
    };
}
