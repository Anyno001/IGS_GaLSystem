export function createFakeIndexedDB() {
    const databases = new Map();
    const controls = { failNextWrite: null };
    function database(name) {
        if (!databases.has(name)) databases.set(name, { version: 0, stores: new Map(), queue: [], busy: false });
        return databases.get(name);
    }
    function pump(record) {
        if (record.busy || !record.queue.length) return;
        record.busy = true;
        record.queue[0].start();
    }
    return {
        controls, databases,
        deleteDatabase(name) { const request = {}; queueMicrotask(() => { databases.delete(name); request.onsuccess?.(); }); return request; },
        open(name, version = 1) {
            const request = {};
            queueMicrotask(() => {
                const record = database(name);
                const db = {
                    close() {},
                    objectStoreNames: { contains: store => record.stores.has(store) },
                    createObjectStore(store, { keyPath } = {}) {
                        const definition = { keyPath, rows: new Map(), indexes: new Map() };
                        record.stores.set(store, definition);
                        return { createIndex(index, field) { definition.indexes.set(index, field); } };
                    },
                    deleteObjectStore(store) { record.stores.delete(store); },
                    transaction(names, mode = 'readonly') {
                        const list = Array.isArray(names) ? names : [names];
                        for (const store of list) if (!record.stores.has(store)) throw new Error(`unknown-store:${store}`);
                        let active = false, finished = false, scheduled = false;
                        const jobs = [], working = new Map();
                        function finish(error) {
                            if (finished) return;
                            finished = true;
                            if (!error && mode === 'readwrite') for (const [store, rows] of working) record.stores.get(store).rows = rows;
                            tx.error = error || null;
                            if (error) tx.onabort?.(); else tx.oncomplete?.();
                            record.queue.shift(); record.busy = false; pump(record);
                        }
                        function process() {
                            scheduled = false;
                            if (!active || finished) return;
                            const job = jobs.shift();
                            if (!job) { finish(); return; }
                            try { job(); } catch (error) { finish(error); return; }
                            schedule();
                        }
                        function schedule() { if (scheduled) return; scheduled = true; queueMicrotask(process); }
                        function req(callback, write = false, storeName = '') {
                            const result = {};
                            jobs.push(() => {
                                if (write && controls.failNextWrite && (!controls.failNextWrite.store || controls.failNextWrite.store === storeName)) {
                                    const error = new Error(controls.failNextWrite.message || 'quota');
                                    error.name = 'QuotaExceededError'; controls.failNextWrite = null; throw error;
                                }
                                result.result = callback(); result.onsuccess?.();
                            });
                            if (active) schedule();
                            return result;
                        }
                        const tx = {
                            objectStore(storeName) {
                                if (!list.includes(storeName)) throw new Error('store-not-in-transaction');
                                const definition = record.stores.get(storeName), rows = () => working.get(storeName);
                                return {
                                    get: key => req(() => structuredClone(rows().get(key))),
                                    getAll: () => req(() => [...rows().values()].map(row => structuredClone(row))),
                                    getAllKeys: () => req(() => [...rows().keys()]),
                                    put: value => req(() => { const key = value[definition.keyPath]; rows().set(key, structuredClone(value)); return key; }, true, storeName),
                                    delete: key => req(() => rows().delete(key), true, storeName),
                                    clear: () => req(() => rows().clear(), true, storeName),
                                    index(index) { return { getAll: key => req(() => [...rows().values()].filter(row => row[definition.indexes.get(index)] === key).map(row => structuredClone(row))) }; },
                                };
                            },
                            abort() { finish(new Error('aborted')); },
                            start() {
                                for (const store of list) working.set(store, new Map(record.stores.get(store).rows));
                                active = true; schedule();
                            },
                        };
                        record.queue.push(tx); queueMicrotask(() => pump(record));
                        return tx;
                    },
                };
                request.result = db;
                if (record.version < version) {
                    request.transaction = { objectStore: store => ({ clear() { record.stores.get(store).rows.clear(); } }) };
                    request.onupgradeneeded?.({ oldVersion: record.version }); record.version = version;
                }
                request.onsuccess?.();
            });
            return request;
        },
    };
}
