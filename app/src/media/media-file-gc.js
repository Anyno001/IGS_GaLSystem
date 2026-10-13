import { imagePaths, normalizeImagePath } from './image-identity.js';
import { collectImageReferences } from './image-references.js';
import { mediaStateStoreFor } from './media-state-store.js';
import { MEDIA_BACKUP_FILES, parseMediaBackup, flushMediaJournals } from './media-record-journal.js';
import { mediaRequest, tavernHeaders } from './tavern-media-http.js';
import { localImageCacheFor } from './tavern-image-cache.js';
import { withMediaLock } from './media-lock.js';
const collectors = new WeakMap();
const WRITE_LEASE_MS = 120000;

export function mediaFileGcFor(globalObject = globalThis) {
    if (collectors.has(globalObject)) return collectors.get(globalObject);
    const state = mediaStateStoreFor(globalObject), sources = new Set(), leases = new Map();
    const owner = globalThis.crypto?.randomUUID?.() || `${Date.now()}:${Math.random()}`;
    let draining = null, timer = null, leaseTimer = null, lastError = '', stopped = false;
    let generation = 0;
    const leaseId = path => `lease:${owner}:${path}`;
    async function leaseRows() {
        for (const path of leases.keys()) await state.put({ id: leaseId(path), kind: 'lease', path, expiresAt: Date.now() + WRITE_LEASE_MS });
        if (!stopped && leases.size && !leaseTimer) {
            leaseTimer = (globalObject.setTimeout || setTimeout)(() => { leaseTimer = null; void leaseRows().catch(() => {}); }, WRITE_LEASE_MS / 3);
            leaseTimer?.unref?.();
        }
    }
    async function references() {
        const live = new Set(leases.keys()), local = await state.all(), catalog = new Map();
        for (const row of local) if (row.kind === 'lease' && row.expiresAt > Date.now()) live.add(row.path);
        for (const fileName of MEDIA_BACKUP_FILES) {
            if (!tavernHeaders(globalObject)) throw new Error('media-offline');
            const response = await mediaRequest(globalObject, `/user/files/${fileName}?t=${Date.now()}`, { cache: 'no-store' }, 8000);
            let records = {};
            if (response.status !== 404) {
                if (!response.ok) throw new Error('media-reference-check-failed');
                records = parseMediaBackup(await response.json(), fileName === 'igs-cg-records.json' ? 'slots' : 'records');
            }
            for (const row of local) if (row.kind === 'record' && row.id.startsWith(`${fileName}:`)) {
                const key = row.id.slice(fileName.length + 1);
                if (!records[key] || String(row.version) >= String(records[key].version)) records[key] = row;
            }
            for (const [key, row] of Object.entries(records)) {
                catalog.set(`${fileName}:${key}`, row);
                if (!row.deleted) for (const path of imagePaths(row.value)) live.add(path);
            }
        }
        // 全局配置/预设以图片 ID 间接引用原图；旧设备尚未同步删除时继续保护它们。
        const response = await mediaRequest(globalObject, `/user/files/igs-settings.json?t=${Date.now()}`, { cache: 'no-store' }, 8000);
        if (response.status !== 404) {
            if (!response.ok) throw new Error('media-settings-reference-check-failed');
            const file = await response.json(), refs = { ids: new Set(), paths: new Set() };
            if (!file?.settings || typeof file.settings !== 'object') throw new Error('media-settings-reference-check-failed');
            for (const [key, text] of Object.entries(file.settings)) {
                if (file.deletedKeys?.includes(key)) continue;
                let value = text; try { value = JSON.parse(text); } catch { /* 地图是直接路径 */ }
                collectImageReferences(value, refs);
            }
            for (const path of refs.paths) live.add(path);
            for (const id of refs.ids) {
                const row = catalog.get(`igs-asset-records.json:image:${id}`);
                for (const path of imagePaths(row?.value || row?.previousValue)) live.add(path);
            }
        }
        for (const source of sources) for (const record of await source()) for (const path of imagePaths(record)) live.add(path);
        return live;
    }
    function schedule(delay = 5000) {
        if (stopped || timer || !tavernHeaders(globalObject)) return;
        timer = (globalObject.setTimeout || setTimeout)(() => { timer = null; void drain().catch(() => schedule()); }, delay);
        timer?.unref?.();
    }
    async function drain() {
        if (draining) return draining;
        if (stopped) throw new Error('media-stopped');
        const stamp = generation;
        draining = (async () => {
            if (!(await state.all()).some(row => row.kind === 'gc')) return { ok: true, pending: 0, protected: 0 };
            // flush 自己持有 commit 锁，必须在最终引用检查锁之外执行。
            if (!(await flushMediaJournals(globalObject)).ok) throw new Error('media-backup-pending');
            return withMediaLock(globalObject, 'commit', async () => {
                if (stopped || generation !== stamp) throw new Error('media-stopped');
                const live = await references(), tasks = (await state.all()).filter(row => row.kind === 'gc');
                let protectedCount = 0, failed = 0;
                for (const task of tasks) {
                    if (stopped || generation !== stamp) throw new Error('media-stopped');
                    if (live.has(task.path)) { protectedCount += 1; await state.put({ ...task, protected: true }); continue; }
                    try {
                        const response = await mediaRequest(globalObject, '/api/images/delete', { method: 'POST', headers: tavernHeaders(globalObject), body: JSON.stringify({ path: task.path }) });
                        if (!response?.ok && response?.status !== 404) throw new Error('media-file-delete-failed');
                        if (!stopped && generation === stamp) await localImageCacheFor(globalObject).drop(task.path);
                        await state.remove(task.id);
                    } catch (error) {
                        failed += 1;
                        await state.put({ ...task, protected: false, attempts: (task.attempts || 0) + 1, error: error.message });
                    }
                }
                if (failed) throw new Error('media-file-delete-failed');
                lastError = '';
                if (protectedCount) schedule(30000);
                return { ok: true, pending: protectedCount, protected: protectedCount };
            });
        })().catch(error => { lastError = error.message || String(error); schedule(); throw error; }).finally(() => { draining = null; });
        return draining;
    }
    const gc = {
        register(source) { sources.add(source); return () => sources.delete(source); },
        async hold(path) {
            const key = normalizeImagePath(path);
            await withMediaLock(globalObject, 'commit', async () => {
                if (stopped) throw new Error('media-stopped');
                const previous = leases.get(key) || 0; leases.set(key, previous + 1);
                try { await leaseRows(); }
                catch (error) { if (previous) leases.set(key, previous); else leases.delete(key); throw error; }
            });
        },
        async release(path) {
            const key = normalizeImagePath(path);
            await withMediaLock(globalObject, 'commit', async () => {
                const count = (leases.get(key) || 0) - 1;
                if (count > 0) leases.set(key, count); else { leases.delete(key); await state.remove(leaseId(key)); }
                if (!leases.size) { (globalObject.clearTimeout || clearTimeout)(leaseTimer); leaseTimer = null; }
            });
        },
        async released(old, next) {
            const keep = imagePaths(next);
            for (const path of imagePaths(old)) if (!keep.has(path)) {
                await state.update(`gc:${path}`, previous => ({ ...previous, id: `gc:${path}`, kind: 'gc', path, queuedAt: previous?.queuedAt || Date.now(), attempts: previous?.attempts || 0, protected: false }));
                if (!stopped) await localImageCacheFor(globalObject).drop(path);
            }
            schedule();
        },
        drain, references,
        async audit(paths) { const live = await references(); return { referenced: [...live], candidates: (paths || []).map(normalizeImagePath).filter(path => !live.has(path)), pending: (await state.all()).filter(row => row.kind === 'gc') }; },
        async diagnostics() {
            const rows = await state.all(), tasks = rows.filter(row => row.kind === 'gc');
            return { pendingDeletes: tasks.length, protectedDeletes: tasks.filter(row => row.protected).length, failedDeletes: tasks.filter(row => row.error && !row.protected).length,
                activeWrites: rows.filter(row => row.kind === 'lease' && row.expiresAt > Date.now()).length, lastError };
        },
        start() { stopped = false; schedule(); },
        stop() { stopped = true; generation += 1; sources.clear(); (globalObject.clearTimeout || clearTimeout)(timer); (globalObject.clearTimeout || clearTimeout)(leaseTimer); timer = null; leaseTimer = null; return Promise.allSettled(draining ? [draining] : []); },
    };
    collectors.set(globalObject, gc);
    return gc;
}
