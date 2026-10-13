export function requireMediaCache(cache, consumer, otherCache) {
    if (!cache || !cache.auxiliary || typeof cache.peek !== 'function' || typeof cache.load !== 'function') {
        throw new Error(`missing-media-cache:${consumer}`);
    }
    if (otherCache && otherCache !== cache) throw new Error(`different-media-cache:${consumer}`);
    if (cache.destroyed) throw new Error(`destroyed-media-cache:${consumer}`);
    return cache;
}
