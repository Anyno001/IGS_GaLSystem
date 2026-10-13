import { createTavernImageFiles } from './tavern-image-files.js';
import { createMediaRecordJournal } from './media-record-journal.js';
import { mediaFileGcFor } from './media-file-gc.js';
import { retryInlineMedia } from './media-migration.js';
import { IMAGE_FIELDS } from './image-identity.js';

export function withTavernPhotoFiles(store, globalObject = globalThis) {
    const files = createTavernImageFiles(globalObject, 'igs-photos');
    const journal = createMediaRecordJournal(globalObject, {
        fileName: 'igs-photo-records.json', list: async () => (await store.list()).map(value => [value.id, value]),
        get: id => store.get(id),
        onApply: (id, old, next, previous) => files.acceptRemote(old, next, [], [`thumb:cg:photo|${id}:`], previous),
        async beforeFlush() { return retryInlineMedia((await store.list()).map(record => [record.id, record]), files, (_key, record) => save(record, record)); },
        put: (key, value) => store.put({ ...value, id: key }), remove: key => store.remove(key),
    });
    mediaFileGcFor(globalObject).register(() => store.list());
    async function save(value, expected = null) {
        await journal.restore().catch(() => {});
        const old = await store.get(value?.id), next = await files.offload(value, value?.id, old);
        try {
            const result = await journal.write(value.id, next, async () => {
                if (!files.sameRecord(expected || old, await store.get(value.id))) throw new Error('image-write-stale');
                return store.put(next);
            });
            await files.dropUnused(old, next);
            return { ...result, photo: { ...result.photo, dataUrl: value.dataUrl } };
        } catch (error) { await files.dropUnused(next, old); throw error; }
        finally { await files.release(next); }
    }
    return {
        ...store,
        async list(options = {}) {
            await journal.restore();
            const records = await store.list();
            for (const record of records) if (files.hasData(record)) files.later(async () => {
                if (files.sameRecord(record, await store.get(record.id))) await save(record, record);
            });
            return options.deferImages ? records : Promise.all(records.map(record => files.hydrate(record)));
        },
        async listIds() { await journal.restore(); return store.listIds(); },
        async get(id) { await journal.restore().catch(() => {}); return files.hydrate(await store.get(id)); },
        async getMany(ids) { await journal.restore().catch(() => {}); return store.getMany(ids); },
        getRecord: async id => { await journal.restore().catch(() => {}); return store.get(id); },
        put: save,
        async patchMetadata(id, patch) {
            if (IMAGE_FIELDS.some(field => Object.hasOwn(patch, field)) || Object.hasOwn(patch, 'id')) return { ok: false, reason: 'metadata-only' };
            await journal.restore();
            return journal.write(id, async () => {
                const record = await store.get(id);
                if (!record) throw new Error('not-found');
                return { ...record, ...patch };
            }, value => store.put(value));
        },
        async remove(id) {
            await journal.restore().catch(() => {});
            const old = await store.get(id), result = await journal.write(id, null, () => store.remove(id));
            await files.dropUnused(old, null);
            return result;
        },
        flush: journal.flush,
        diagnostics: journal.diagnostics,
    };
}
