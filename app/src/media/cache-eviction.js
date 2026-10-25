export const CACHE_LOW_WATER_RATIO = 0.8;
export const cacheLowWater = limit => limit > 0 ? Math.max(1, Math.floor(limit * CACHE_LOW_WATER_RATIO)) : 0;

// Map/Set 仍逐个释放资源，容量策略一次选出低水位前的整批旧项。
export function trimCacheEntries(entries, limit, canEvict = () => true) {
    if (entries.size <= limit) return 0;
    const target = cacheLowWater(limit);
    let removed = 0;
    for (const [key, value] of entries.entries()) {
        if (entries.size <= target) break;
        if (!canEvict(value, key)) continue;
        entries.delete(key); removed++;
    }
    return removed;
}
