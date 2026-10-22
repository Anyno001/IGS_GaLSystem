import { localImageCacheFor } from './tavern-image-cache.js';
import { imageFingerprint, isImagePath, normalizeImagePath } from './image-identity.js';

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

export function createImageResourceCache(globalObject = globalThis, { limit = 96, now = Date.now } = {}) {
    const cache = localImageCacheFor(globalObject);
    const sources = cache.auxiliary.createMap('reader-sources', { maxEntries: limit,
        onRemove: (_value, key, reason) => { if (reason === 'clear' || reason === 'destroy') cache.forget(key); } });
    const files = createTavernImageFiles(globalObject, 'igs-media');
    const keyOf = source => isImagePath(source) ? normalizeImagePath(source) : /^(data:|blob:)/i.test(source) ? `display:${imageFingerprint(source)}` : `url:${source}`;
    function statusOf(key) {
        if (cache.peek(key)) return 'available';
        const state = sources.get(key);
        if (state?.until && state.until <= now()) { sources.delete(key); return 'unverified'; }
        return state?.status === 'available' ? 'unverified' : state?.status || 'unverified';
    }
    function load(url) {
        const source = String(url || '').trim();
        if (!source) return Promise.resolve('');
        const key = keyOf(source);
        const ready = cache.peek(key);
        if (ready) return Promise.resolve(ready);
        const state = { status: 'loading' };
        sources.set(key, state);
        const finish = (value, errorStatus = 'read-error') => {
            if (sources.get(key) === state) {
                state.status = value ? (cache.peek(key) ? 'available' : 'unverified') : errorStatus;
                if (!value) state.until = now() + (errorStatus === 'missing' ? 30000 : 1500);
            }
            return value || '';
        };
        if (isImagePath(source)) return files.read(source, { display: true, strictRead: true })
            .then(value => finish(value ? cache.peek(key) || value : ''))
            .catch(error => finish('', [404, 410].includes(error?.status) ? 'missing' : 'read-error'));
        if (typeof globalObject.Image !== 'function') { cache.remember(key, source); return Promise.resolve(finish(cache.peek(key) || source)); }
        return cache.load(key, signal => {
            return new Promise(resolve => {
                const image = new globalObject.Image();
                let settled = false;
                const done = value => {
                    if (settled) return;
                    settled = true;
                    signal?.removeEventListener('abort', abort); image.onload = null; image.onerror = null;
                    if (!value) image.src = '';
                    resolve(value);
                };
                const abort = () => done('');
                signal?.addEventListener('abort', abort, { once: true });
                if (signal?.aborted) { abort(); return; }
                image.onload = () => done(source); image.onerror = abort; image.src = source;
                if (image.complete) done(image.naturalWidth > 0 ? source : '');
            });
        }, { persist: false, timeoutMs: 15000 }).then(value => finish(value ? cache.peek(key) || source : '', 'decode-error'))
            .catch(() => finish('', 'decode-error'));
    }
    return { load, get: url => cache.peek(keyOf(String(url || '').trim())), keyOf: url => keyOf(String(url || '').trim()),
        inspect(url) { return { status: statusOf(keyOf(String(url || '').trim())) }; },
        clearFailures() { for (const [key, value] of sources) if (['read-error', 'decode-error', 'missing'].includes(value?.status)) sources.delete(key); },
        clear() { sources.clear(); }, destroy() { sources.destroy(); },
        size: () => [...sources.keys()].filter(key => cache.peek(key)).length };
}
