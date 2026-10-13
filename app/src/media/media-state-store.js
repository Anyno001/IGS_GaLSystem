import { createIdbConnection } from './idb-connection.js';
const stores = new WeakMap();
export function mediaStateStoreFor(globalObject = globalThis) {
    if (stores.has(globalObject)) return stores.get(globalObject);
    let store;
    if (globalObject.indexedDB) {
        const connection = createIdbConnection(globalObject.indexedDB, 'igs-media-journal', 1, db => {
            if (!db.objectStoreNames.contains('state')) db.createObjectStore('state', { keyPath: 'id' });
        });
        const run = (mode, callback) => connection.transact('state', mode, tx => callback(tx.objectStore('state')));
        store = {
            async get(id) { return await run('readonly', s => s.get(id)) || null; },
            async put(row) { await run('readwrite', s => s.put(row)); },
            async all() { return await run('readonly', s => s.getAll()) || []; },
            async remove(id) { await run('readwrite', s => s.delete(id)); },
            async update(id, callback) {
                let value;
                await run('readwrite', s => {
                    const request = s.get(id);
                    request.onsuccess = () => {
                        value = callback(request.result || null);
                        if (value) s.put({ ...value, id }); else s.delete(id);
                    };
                    return () => undefined;
                });
                return value;
            },
        };
    } else {
        const rows = new Map();
        store = { async get(id) { return rows.get(id) || null; }, async put(row) { rows.set(row.id, row); },
            async all() { return [...rows.values()]; }, async remove(id) { rows.delete(id); },
            async update(id, callback) { const value = callback(rows.get(id) || null); if (value) rows.set(id, { ...value, id }); else rows.delete(id); return value; } };
    }
    stores.set(globalObject, store);
    return store;
}
