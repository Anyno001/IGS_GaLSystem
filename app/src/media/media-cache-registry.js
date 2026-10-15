import { MEDIA_METADATA_BUDGET, metadataBytes } from './media-metadata-size.js';
// 可再生的元数据和任务索引统一登记；此层不导入业务模块，也不保存图片像素。
export const MEDIA_CACHE_POLICIES = Object.freeze({
    messages: { purpose: '消息与图片的对应关系', maxEntries: 128 },
    'asset-records': { purpose: '当前聊天按需素材记录与分页索引', maxEntries: 512, maxScopes: 1, retention: 'lru' },
    'item-records': { purpose: '当前聊天按需物品记录与分页索引', maxEntries: 512, maxScopes: 1, retention: 'lru' },
    'cg-states': { purpose: 'CG 槽位状态与短期缺图结果', maxEntries: 320, failureTtlMs: 1000, ttlFor: value => value.hasImage ? 0 : 1000 },
    maps: { purpose: '地图生成任务和结果索引', maxEntries: 4, failureTtlMs: 30000, ttlFor: value => value.status === 'failed' ? 30000 : 0 },
    'sprite-geometry': { purpose: '立绘尺寸、头部和脚底探测结果', maxEntries: 48 },
    'sprite-failures': { purpose: '立绘探测失败，抑制反复解码', maxEntries: 48, ttlMs: 30000 },
    'asset-image-failures': { purpose: '素材图片短期读取失败', maxEntries: 128, ttlFor: value => value.missing ? 30000 : 1500 },
    'sprite-probes': { purpose: '立绘在途探测去重', maxEntries: 48, retention: 'in-flight' },
    'cg-failures': { purpose: 'CG 缩略图失败，抑制反复读图', maxEntries: 320, ttlMs: 30000 },
    'cg-catalogue': { purpose: '当前 CG 库视图目录和任务', maxScopes: 1, retention: 'view' },
    directories: { purpose: '旧图库目录与在途查询', maxEntries: 8, ttlMs: 2000 },
    'reader-sources': { purpose: '阅读器预载的资源键', maxEntries: 96 },
});

const OWNER_BYTE_BUDGETS = Object.freeze({
    messages: 512 * 1024, 'asset-records': 4 * 1024 * 1024, 'item-records': 4 * 1024 * 1024,
    'cg-states': 512 * 1024, maps: 128 * 1024, 'sprite-geometry': 64 * 1024,
    'sprite-failures': 64 * 1024, 'sprite-probes': 64 * 1024, 'asset-image-failures': 64 * 1024, 'cg-failures': 256 * 1024,
    'cg-catalogue': 8 * 1024 * 1024, directories: 512 * 1024, 'reader-sources': 256 * 1024,
});

export function createMediaCacheRegistry({ now = () => Date.now(), memoryBudget = MEDIA_METADATA_BUDGET } = {}) {
    const owners = new Map(), shared = new Map();
    let sequence = 0, access = 0, destroyed = false, lastError = '', estimatedBytes = 0, rejected = 0;
    const budget = Math.max(0, Number(memoryBudget) || 0);
    const invoke = (fn, ...args) => {
        try { fn?.(...args); } catch (error) { lastError = error.message || String(error); }
    };
    function policyFor(name, options) {
        const policy = MEDIA_CACHE_POLICIES[name];
        if (!policy) throw new Error(`unknown-media-cache:${name}`);
        return { ttlMs: 0, retention: 'lru', ...policy, maxBytes: Math.min(budget, OWNER_BYTE_BUDGETS[name]),
            ...(options.maxEntries != null ? { maxEntries: Math.max(1, Math.floor(Number(options.maxEntries) || policy.maxEntries || 1)) } : {}) };
    }
    function register(name, options = {}) {
        const policy = policyFor(name, options), id = `${name}:${++sequence}`;
        const entry = { id, name, policy, ...options, estimatedBytes: 0, accessedAt: ++access };
        let disposed = false;
        const handle = {
            policy,
            touch() { entry.accessedAt = ++access; },
            reserve(bytes) {
                if (disposed || destroyed) return false;
                const next = Math.max(0, Number(bytes) || 0);
                if (Number.isFinite(next) && next <= policy.maxBytes && next > entry.estimatedBytes) {
                    // 总预算有压力时先淘汰其他最久未使用的可再生条目，让当前查询有驻留空间。
                    const peers = [...owners.values()].filter(peer => peer !== entry && peer.evict).sort((a, b) => a.accessedAt - b.accessedAt);
                    for (const peer of peers) {
                        while (estimatedBytes - entry.estimatedBytes + next > budget && peer.estimatedBytes > 0) {
                            if (!peer.evict()) break;
                        }
                        if (estimatedBytes - entry.estimatedBytes + next <= budget) break;
                    }
                }
                if (!Number.isFinite(next) || next > policy.maxBytes || estimatedBytes - entry.estimatedBytes + next > budget) {
                    rejected += 1; lastError = `media-metadata-budget:${name}`; return false;
                }
                estimatedBytes += next - entry.estimatedBytes; entry.estimatedBytes = next;
                return true;
            },
            clear(reason = 'clear') { if (!disposed) { estimatedBytes -= entry.estimatedBytes; entry.estimatedBytes = 0; invoke(options.clear, reason); } },
            destroy() {
                if (disposed) return;
                disposed = true; owners.delete(id);
                estimatedBytes -= entry.estimatedBytes; entry.estimatedBytes = 0;
                invoke(options.clear, 'destroy'); invoke(options.destroy);
            },
        };
        if (destroyed) handle.destroy(); else { entry.handle = handle; owners.set(id, entry); }
        return handle;
    }
    function createMap(name, options = {}) {
        const policy = policyFor(name, options), records = options.store || new Map(), deadlines = new Map();
        const clock = options.now || now;
        let generation = 0, disposed = false, bytes = 0, handle;
        const sizes = new Map();
        function remove(key, reason) {
            if (!records.has(key)) return false;
            const value = records.get(key); records.delete(key); deadlines.delete(key);
            bytes -= sizes.get(key) || 0; sizes.delete(key); handle?.reserve(bytes);
            invoke(options.onRemove, value, key, reason);
            return true;
        }
        const prune = () => {
            for (const [key, expiresAt] of deadlines) if (expiresAt <= clock()) remove(key, 'expired');
        };
        const clear = reason => {
            generation += 1;
            for (const key of [...records.keys()]) remove(key, reason);
            invoke(options.onClear, reason);
        };
        handle = register(name, { ...options, clear, evict: () => records.size > 0 && remove(records.keys().next().value, 'capacity'), destroy: () => { disposed = true; invoke(options.onDestroy); },
            stats: () => { prune(); return { count: records.size, pending: [...records.values()].filter(value => value?.status === 'pending').length, ...options.stats?.() }; } });
        const api = {
            get size() { prune(); return records.size; },
            get(key) {
                handle.touch();
                prune();
                if (!records.has(key)) return undefined;
                const value = records.get(key); records.delete(key); records.set(key, value);
                return value;
            },
            has(key) { prune(); return records.has(key); },
            set(key, value, { ttlMs = policy.ttlFor?.(value) ?? policy.ttlMs } = {}) {
                if (disposed) return api;
                handle.touch();
                prune();
                const size = metadataBytes(key) + metadataBytes(value) + 32;
                if (!Number.isFinite(size) || size > policy.maxBytes) {
                    rejected += 1; lastError = `media-metadata-budget:${name}`;
                    const same = records.get(key) === value;
                    remove(key, 'capacity');
                    if (!same) invoke(options.onRemove, value, key, 'capacity');
                    return api;
                }
                if (records.has(key) && records.get(key) !== value) remove(key, 'replaced');
                records.delete(key); records.set(key, value);
                bytes -= sizes.get(key) || 0;
                sizes.set(key, size); bytes += size;
                if (ttlMs > 0) deadlines.set(key, clock() + ttlMs); else deadlines.delete(key);
                while (records.size && (records.size > policy.maxEntries || !handle.reserve(bytes))) remove(records.keys().next().value, 'capacity');
                return api;
            },
            delete: key => remove(key, 'delete'),
            clear: () => clear('clear'),
            destroy: handle.destroy,
            epoch: () => generation,
            keys() { prune(); return records.keys(); },
            values() { prune(); return records.values(); },
            entries() { prune(); return records.entries(); },
            [Symbol.iterator]() { return api.entries(); },
        };
        const initial = [...records]; records.clear();
        for (const [key, value] of initial) api.set(key, value);
        return api;
    }
    function sharedMap(name, options) {
        if (!shared.has(name)) shared.set(name, createMap(name, options));
        return shared.get(name);
    }
    return {
        register, createMap, sharedMap,
        clear() { for (const owner of [...owners.values()]) owner.handle.clear(); },
        destroy() { destroyed = true; for (const owner of [...owners.values()]) owner.handle.destroy(); shared.clear(); },
        stats() {
            const rows = [...owners.values()].map(({ id, name, policy, stats }) => {
                const { ttlFor, ...descriptor } = policy;
                let measured = {};
                try { measured = stats?.() || {}; } catch (error) { lastError = error.message || String(error); }
                return { id, owner: name, ...descriptor, ...measured, estimatedBytes: owners.get(id)?.estimatedBytes || 0 };
            });
            return { owners: rows, count: rows.length, entries: rows.reduce((sum, row) => sum + (row.count || 0), 0), estimatedBytes, memoryBudget: budget, rejected, lastError };
        },
    };
}
