import { createTavernImageFiles } from './tavern-image-files.js';
import { createMediaRecordJournal } from './media-record-journal.js';
import { mediaFileGcFor } from './media-file-gc.js';
import { localImageCacheFor } from './tavern-image-cache.js';
import { retryInlineMedia } from './media-migration.js';
import { mediaRequest } from './tavern-media-http.js';
const repositories = new WeakMap();
const PREFIX = 'igs-map-custom:';

export function mapImageRepositoryFor(globalObject = globalThis) {
    if (repositories.has(globalObject)) return repositories.get(globalObject);
    const files = createTavernImageFiles(globalObject, 'igs-map');
    const intents = new Map();
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
    async function save(key, dataUrl, expected) {
        if (expected !== undefined && intents.has(key)) return { ok: false, error: 'map-image-stale' };
        const intent = {}; intents.set(key, intent);
        let old, next;
        try {
            await journal.restore().catch(() => {});
            old = { settingKey: key, dataUrl: storage()?.getItem(key) || '' };
            if (expected !== undefined && expected !== old.dataUrl) throw new Error('map-image-stale');
            next = await files.offload({ settingKey: key, dataUrl }, key, old);
            await journal.write(key, () => {
                if (intents.get(key) !== intent || (storage()?.getItem(key) || '') !== old.dataUrl) throw new Error('map-image-stale');
                return next;
            }, value => put(key, value));
            await files.dropUnused(old, next);
            return { ok: true, url: next.dataUrl };
        } catch (error) { if (next) await files.dropUnused(next, { dataUrl: storage()?.getItem(key) || '' }); return { ok: false, error: error.message }; }
        finally { if (next) await files.release(next); if (intents.get(key) === intent) intents.delete(key); }
    }
    const repository = {
        restore,
        async resolveUrl(path) { const value = await files.read(path); return value ? localImageCacheFor(globalObject).peek(path) || value : ''; },
        set: save,
        async remove(key) {
            const intent = {}; intents.set(key, intent);
            try {
                await journal.restore().catch(() => {});
                const old = { dataUrl: storage()?.getItem(key) || '' };
                await journal.write(key, () => {
                    if (intents.get(key) !== intent || (storage()?.getItem(key) || '') !== old.dataUrl) throw new Error('map-image-stale');
                    return null;
                }, () => storage()?.removeItem(key));
                await files.dropUnused(old, null);
                return { ok: true };
            } finally { if (intents.get(key) === intent) intents.delete(key); }
        },
        diagnostics: journal.diagnostics,
    };
    repositories.set(globalObject, repository);
    return repository;
}

export function disposeMapImageRepository(globalObject) { repositories.delete(globalObject); }
