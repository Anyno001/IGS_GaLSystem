import { localImageCacheFor } from './tavern-image-cache.js';
import { imageFingerprint } from './image-identity.js';
import { isImagePath, normalizeImagePath } from './image-identity.js';
import { createTavernImageFiles } from './tavern-image-files.js';
export function createResourceCache(store = new Map()) {
    return {
        put(id, resource) {
            if (!id) return { ok: false, reason: 'missing-id' };
            store.set(id, { ...resource, id });
            return { ok: true, id };
        },

        get(id) {
            return store.get(id) || null;
        },

        list() {
            return Array.from(store.values());
        },

        clear() {
            store.clear();
        },
    };
}

export function createImageResourceCache(globalObject = globalThis, { limit = 96 } = {}) {
    const cache = localImageCacheFor(globalObject);
    const sources = cache.auxiliary.createMap('reader-sources', { maxEntries: limit,
        onRemove: (_value, key, reason) => { if (reason === 'clear' || reason === 'destroy') cache.forget(key); } });
    const files = createTavernImageFiles(globalObject, 'igs-media');
    const keyOf = source => isImagePath(source) ? normalizeImagePath(source) : /^(data:|blob:)/i.test(source) ? `display:${imageFingerprint(source)}` : `url:${source}`;
    function load(url) {
        const source = String(url || '').trim();
        if (!source) return Promise.resolve('');
        const key = keyOf(source);
        sources.set(key, true);
        const ready = cache.peek(key);
        if (ready) return Promise.resolve(ready);
        if (isImagePath(source)) return files.read(source).then(value => value ? cache.peek(key) || value : '');
        if (typeof globalObject.Image !== 'function') { cache.remember(key, source); return Promise.resolve(cache.peek(key) || source); }
        return cache.load(key, signal => {
            return new Promise(resolve => {
                const image = new globalObject.Image();
                const finish = () => { signal?.removeEventListener('abort', abort); image.onload = null; image.onerror = null; resolve(source); };
                const abort = () => { image.onload = null; image.onerror = null; image.src = ''; resolve(''); };
                signal?.addEventListener('abort', abort, { once: true });
                image.onload = finish; image.onerror = finish; image.src = source;
                if (image.complete) finish();
            });
        }, { persist: false, timeoutMs: 15000 }).then(value => value ? cache.peek(key) || source : '').catch(() => source);
    }
    return { load, get: url => cache.peek(keyOf(String(url || '').trim())), keyOf: url => keyOf(String(url || '').trim()),
        clear() { sources.clear(); }, destroy() { sources.destroy(); },
        size: () => [...sources.keys()].filter(key => cache.peek(key)).length };
}
