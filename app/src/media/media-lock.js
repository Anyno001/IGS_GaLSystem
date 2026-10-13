import { mediaStateStoreFor } from './media-state-store.js';
const queues = new WeakMap();
const LEASE_MS = 60000;
async function originLock(globalObject, name, callback) {
    if (globalObject.navigator?.locks?.request) return globalObject.navigator.locks.request(`igs-media:${name}`, callback);
    if (!globalObject.indexedDB) return callback();
    const store = mediaStateStoreFor(globalObject), id = `lock:${name}`;
    const owner = globalThis.crypto?.randomUUID?.() || `${Date.now()}:${Math.random()}`;
    const deadline = Date.now() + LEASE_MS;
    while (true) {
        const row = await store.update(id, current => !current || current.expiresAt < Date.now()
            ? { kind: 'lock', owner, expiresAt: Date.now() + LEASE_MS } : current);
        if (row.owner === owner) break;
        if (Date.now() >= deadline) throw new Error('media-lock-timeout');
        await new Promise(resolve => (globalObject.setTimeout || setTimeout)(resolve, 25));
    }
    const timer = setInterval(() => { void store.update(id, row => row?.owner === owner ? { ...row, expiresAt: Date.now() + LEASE_MS } : row).catch(() => {}); }, LEASE_MS / 3);
    timer?.unref?.();
    try { return await callback(); }
    finally { clearInterval(timer); await store.update(id, row => row?.owner === owner ? null : row); }
}
export function withMediaLock(globalObject, name, callback) {
    let group = queues.get(globalObject);
    if (!group) { group = new Map(); queues.set(globalObject, group); }
    const previous = group.get(name) || Promise.resolve();
    const job = previous.catch(() => {}).then(() => originLock(globalObject, name, callback));
    group.set(name, job);
    job.finally(() => { if (group.get(name) === job) group.delete(name); }).catch(() => {});
    return job;
}
