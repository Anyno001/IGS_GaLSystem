// 可见页面只持有资源键与释放函数；像素仍只有中央缓存的一份。
export function createMediaLeaseScope(cache) {
    const releases = new Map();
    let wanted = new Set();
    return {
        begin() { wanted = new Set(); },
        use(key) {
            if (!key) return;
            wanted.add(key);
            if (!releases.has(key)) releases.set(key, cache.pin(key));
        },
        end() { for (const [key, release] of releases) if (!wanted.has(key)) { release(); releases.delete(key); } },
        releaseAll() { for (const release of releases.values()) release(); releases.clear(); wanted.clear(); },
    };
}
