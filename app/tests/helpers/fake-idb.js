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
        open(name, version) {
            const request = {};
            queueMicrotask(() => {
                const record = database(name);
                const requestedVersion = version === undefined ? record.version || 1 : version;
                if (requestedVersion < record.version) {
                    request.error = Object.assign(new Error(`The requested version (${requestedVersion}) is less than the existing version (${record.version}).`), { name: 'VersionError' });
                    request.onerror?.();
                    return;
                }
                const db = {
                    get version() { return record.version; },
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
                        function cursor(source, direction = 'next', keyOf = entry => entry[0]) {
                            const request = {};
                            let entries;
                            const next = () => {
                                const pending = req(() => {
                                    if (!entries) {
                                        entries = source().sort((a, b) => keyOf(a) < keyOf(b) ? -1 : keyOf(a) > keyOf(b) ? 1 : a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
                                        if (direction === 'prev') entries.reverse();
                                    }
                                    const entry = entries.shift();
                                    return entry ? { key: keyOf(entry), primaryKey: entry[0], value: structuredClone(entry[1]), continue: next } : null;
                                });
                                pending.onsuccess = () => { request.result = pending.result; request.onsuccess?.(); };
                            };
                            next();
                            return request;
                        }
                        const tx = {
                            objectStore(storeName) {
                                if (!list.includes(storeName)) throw new Error('store-not-in-transaction');
                                const definition = record.stores.get(storeName), rows = () => working.get(storeName);
                                return {
                                    keyPath: definition.keyPath,
                                    get: key => req(() => structuredClone(rows().get(key))),
                                    getAll: () => req(() => [...rows().values()].map(row => structuredClone(row))),
                                    getAllKeys: () => req(() => [...rows().keys()]),
                                    put: value => req(() => { const key = value[definition.keyPath]; rows().set(key, structuredClone(value)); return key; }, true, storeName),
                                    delete: key => req(() => rows().delete(key), true, storeName),
                                    clear: () => req(() => rows().clear(), true, storeName),
                                    index(index) {
                                        const field = definition.indexes.get(index);
                                        return {
                                            getAll: key => req(() => [...rows().values()].filter(row => row[field] === key).map(row => structuredClone(row))),
                                            openCursor: (key, direction) => cursor(() => [...rows()].filter(([, row]) => key == null || row[field] === key), direction, entry => entry[1][field]),
                                        };
                                    },
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
                if (record.version < requestedVersion) {
                    request.transaction = { objectStore: store => ({ clear() { record.stores.get(store).rows.clear(); } }) };
                    request.onupgradeneeded?.({ oldVersion: record.version }); record.version = requestedVersion;
                }
                request.onsuccess?.();
            });
            return request;
        },
    };
}
