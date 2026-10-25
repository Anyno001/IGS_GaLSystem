import { createTavernImageFiles } from './tavern-image-files.js';
import { createMediaRecordJournal } from './media-record-journal.js';
import { mediaFileGcFor } from './media-file-gc.js';
import { localImageCacheFor } from './tavern-image-cache.js';
import { retryInlineMedia } from './media-migration.js';
import { mediaRequest, recoverMediaOperation } from './tavern-media-http.js';
const repositories = new WeakMap();
const PREFIX = 'igs-map-custom:';

export function mapImageRepositoryFor(globalObject = globalThis) {
    if (repositories.has(globalObject)) return repositories.get(globalObject);
    const files = createTavernImageFiles(globalObject, 'igs-map');
    const writes = new Map(), controller = new AbortController();
    const recover = execute => recoverMediaOperation(globalObject, execute, { signal: controller.signal });
    const enqueue = (key, execute) => {
        const pending = (writes.get(key) || Promise.resolve()).catch(() => {}).then(execute);
        writes.set(key, pending);
        void pending.finally(() => { if (writes.get(key) === pending) writes.delete(key); }).catch(() => {});
        return pending;
    };
    const storage = () => globalObject.localStorage;
    const list = async () => {
        const out = [], store = storage();
        for (let i = 0; store && i < store.length; i += 1) {
            const key = store.key(i);
            if (String(key).startsWith(PREFIX)) out.push([key, { settingKey: key, dataUrl: store.getItem(key) }]);
        }
        return out;
    };
    const put = (key, value) => {
        const store = storage();
        if (!store) throw new Error('map-storage-unavailable');
        store.setItem(key, value.dataUrl);
        if (store.getItem(key) !== value.dataUrl) throw new Error('map-save-failed');
    };
    const journal = createMediaRecordJournal(globalObject, { fileName: 'igs-map-records.json', list, put, remove: key => storage()?.removeItem(key),
        get: key => storage()?.getItem(key) ? { settingKey: key, dataUrl: storage().getItem(key) } : null,
        onApply: (_key, old, next, previous) => files.acceptRemote(old, next, [], [], previous),
        async beforeFlush() { return retryInlineMedia(await list(), files, (key, record) => save(key, record.dataUrl, record.dataUrl)); },
    });
    mediaFileGcFor(globalObject).register(async () => (await list()).map(([, value]) => value));
    let legacyRestored = false, restoringLegacy = null;
    async function restore() {
        await journal.restore();
        if (legacyRestored || journal.remoteExists() === null) return;
        if (restoringLegacy) return restoringLegacy;
        restoringLegacy = (async () => {
            if (journal.remoteExists()) { legacyRestored = true; return; }
            const response = await mediaRequest(globalObject, `/user/files/igs-settings.json?t=${Date.now()}`, { cache: 'no-store' }, 8000);
            if (response.status !== 404) {
                if (!response.ok) throw new Error('map-legacy-settings-read-failed');
                const file = await response.json();
                const deleted = new Set(Array.isArray(file.deletedKeys) ? file.deletedKeys : []);
                for (const [key, value] of Object.entries(file.settings || {})) {
                    if (!key.startsWith(PREFIX) || deleted.has(key) || typeof value !== 'string' || storage()?.getItem(key) !== null || await journal.deleted(key)) continue;
                    const result = await save(key, value);
                    if (!result.ok) throw new Error(result.error);
                }
            }
            legacyRestored = true;
        })().finally(() => { restoringLegacy = null; });
        return restoringLegacy;
    }
    function save(key, dataUrl, expected) {
        return enqueue(key, async () => {
            await journal.restore().catch(() => {}); // 本机 WAL 已先恢复；离线写入由原同步队列补传。
            const old = { settingKey: key, dataUrl: storage()?.getItem(key) || '' };
            // 后台内联迁移遇到已经替换的图片时，采用当前引用；用户写入依次完成。
            if (expected !== undefined && expected !== old.dataUrl) return { ok: true, url: old.dataUrl };
            const next = await recover(() => files.offload({ settingKey: key, dataUrl }, key, old));
            if (next?.cancelled) return next;
            try {
                const saved = await recover(() => journal.write(key, next, value => put(key, value)));
                if (saved?.cancelled) return saved;
                const cleaned = await recover(() => files.dropUnused(old, next));
                return cleaned?.cancelled ? cleaned : { ok: true, url: next.dataUrl };
            } finally { await recover(() => files.release(next)); }
        });
    }
    const repository = {
        restore: () => recover(restore),
        async resolveUrl(path) { const value = await files.read(path, { display: true }); return value ? localImageCacheFor(globalObject).peek(path) || value : ''; },
        set: save,
        remove: key => enqueue(key, async () => {
            await journal.restore().catch(() => {});
            const old = { dataUrl: storage()?.getItem(key) || '' };
            const saved = await recover(() => journal.write(key, null, () => {
                const store = storage();
                if (!store) throw new Error('map-storage-unavailable');
                store.removeItem(key);
                if (store.getItem(key) !== null) throw new Error('map-remove-failed');
            }));
            if (saved?.cancelled) return saved;
            const cleaned = await recover(() => files.dropUnused(old, null));
            return cleaned?.cancelled ? cleaned : { ok: true };
        }),
        dispose: () => controller.abort(),
        diagnostics: journal.diagnostics,
    };
    repositories.set(globalObject, repository);
    return repository;
}

export function disposeMapImageRepository(globalObject) { repositories.get(globalObject)?.dispose(); repositories.delete(globalObject); }
