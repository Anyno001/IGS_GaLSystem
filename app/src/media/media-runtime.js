import { localImageCacheFor, disposeLocalImageCache } from './tavern-image-cache.js';
import { disposeMapImageRepository } from './tavern-map-images.js';
import { mediaFileGcFor } from './media-file-gc.js';
import { flushMediaJournals, stopMediaJournals, mediaJournalDiagnostics } from './media-record-journal.js';
import { storedImageReferences } from './image-references.js';

export function createMediaRuntime(globalObject, { generatedAssetStore } = {}) {
    const cache = localImageCacheFor(globalObject), gc = mediaFileGcFor(globalObject);
    gc.start();
    const offReferences = gc.register(async () => [...storedImageReferences(globalObject).paths].map(dataUrl => ({ dataUrl })));
    const oldCache = globalObject.indexedDB?.deleteDatabase?.('igs-asset-thumbs');
    if (oldCache) oldCache.onerror = () => {};
    let destroying = null;
    return {
        cache,
        clearCache: options => cache.clear(options),
        async stats() { return { cache: await cache.stats(), lifecycle: await gc.diagnostics(), records: await mediaJournalDiagnostics(globalObject), origin: await Promise.resolve(globalObject.navigator?.storage?.estimate?.()).catch(() => null) || null }; },
        auditImages: () => generatedAssetStore?.auditImages?.() || Promise.resolve([]),
        auditFiles: paths => gc.audit(paths),
        async collectImages(ids) {
            const audit = await generatedAssetStore?.auditImages?.() || [];
            const candidates = new Set(audit.filter(row => !row.referenced).map(row => row.id));
            const removed = [];
            for (const id of ids || []) if (candidates.has(id)) {
                const result = await generatedAssetStore.deleteImage(id);
                if (result?.ok !== false && !result?.retained?.length) removed.push(id);
            }
            return { ok: true, removed, skipped: (ids || []).filter(id => !removed.includes(id)) };
        },
        flush: () => flushMediaJournals(globalObject),
        retryDeletes: () => gc.drain(),
        destroy() {
            if (destroying) return destroying;
            offReferences();
            const settled = Promise.allSettled([stopMediaJournals(globalObject), gc.stop()]).then(results => {
                const failed = results.find(result => result.status === 'rejected');
                if (failed) throw failed.reason;
            });
            disposeMapImageRepository(globalObject);
            destroying = disposeLocalImageCache(globalObject, { expectedCache: cache, settled });
            return destroying;
        },
    };
}
