// 阅读源解析缓存：把与页码无关的正文解析结果按消息 + 输入签名缓存，
// 让普通翻页不再重复执行整楼正文过滤、正则、标签解析、分页与图位映射。
import { trimCacheEntries } from '../../media/cache-eviction.js';

export const DEFAULT_SOURCE_CACHE_LIMIT = 8;

export function buildReaderSourceSignature(input = {}) {
    return [
        String(input.messageId == null ? '' : input.messageId),
        hashText(input.rawText),
        hashText(input.visibleText),
        hashText(input.sourceFilter),
        hashText(input.virtualRegex),
        input.sceneAssetsEnabled ? '1' : '0',
        input.sentencePaging ? '1' : '0',
        input.dialogueSentencePaging ? '1' : '0',
    ].join('|');
}

export function createReaderSourceCache(options = {}) {
    const limit = Number(options.limit) > 0 ? Number(options.limit) : DEFAULT_SOURCE_CACHE_LIMIT;
    const parse = typeof options.parse === 'function' ? options.parse : null;
    const entries = new Map();
    let parseCount = 0;
    let prepareCount = 0;
    let signatureMemo = null;

    function signature(input) {
        const fields = Object.values(input);
        if (signatureMemo && fields.length === signatureMemo.fields.length
            && fields.every((value, i) => value === signatureMemo.fields[i])) return signatureMemo.value;
        const value = buildReaderSourceSignature(input);
        signatureMemo = { fields, value };
        return value;
    }

    function get(signature, parseInput) {
        const sceneAssets = parseInput?.parseOptions?.sceneAssets;
        if (entries.has(signature) && entries.get(signature).sceneAssets === sceneAssets) {
            const hit = entries.get(signature);
            entries.delete(signature);
            entries.set(signature, hit);
            return { value: hit.value, hit: true };
        }
        if (!parse) return { value: null, hit: false };
        const value = parse(parseInput);
        parseCount += 1;
        entries.delete(signature);
        entries.set(signature, { value, sceneAssets, prepared: null, dependencies: [] });
        trimCacheEntries(entries, limit);
        return { value, hit: false };
    }

    function invalidate(signature) {
        if (signature == null) { entries.clear(); signatureMemo = null; }
        else entries.delete(signature);
    }

    // 准备结果和解析结果同进同出，最多仍为八楼，不另建跨聊天常驻目录。
    function prepare(signature, dependencies, build) {
        const entry = entries.get(signature);
        if (!entry) return build();
        entries.delete(signature); entries.set(signature, entry);
        if (entry.prepared && dependencies.length === entry.dependencies.length
            && dependencies.every((value, i) => value === entry.dependencies[i])) return entry.prepared;
        entry.prepared = build();
        entry.dependencies = dependencies;
        prepareCount += 1;
        return entry.prepared;
    }

    function visitPrepared(visit) {
        for (const entry of entries.values()) if (entry.prepared) visit(entry.prepared);
    }

    return { get, signature, prepare, visitPrepared, invalidate, size: () => entries.size,
        getParseCount: () => parseCount, getPrepareCount: () => prepareCount };
}

function hashText(value) {
    const text = typeof value === 'string' ? value : safeStringify(value);
    let hash = 5381;
    for (let i = 0; i < text.length; i += 1) {
        hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
    }
    return `${text.length}:${hash >>> 0}`;
}

// 设置对象可能引用宿主 DOM（如 message.element -> defaultView -> document），
// 直接 JSON.stringify 会因为循环引用抛错。这里只序列化解析真正相关的纯值，
// 遇到循环或 DOM 节点时返回稳定占位符，绝不让签名计算影响阅读器主流程。
function safeStringify(value, seen = new Set()) {
    if (value == null) return '';
    const type = typeof value;
    if (type === 'string') return value;
    if (type === 'number' || type === 'boolean') return String(value);
    if (type === 'function') return '[fn]';
    if (type !== 'object') return String(value);
    if (seen.has(value)) return '[circular]';
    seen.add(value);
    try {
        if (Array.isArray(value)) {
            return '[' + value.map((item) => safeStringify(item, seen)).join(',') + ']';
        }
        if (typeof value.nodeType === 'number' || typeof value.querySelector === 'function') {
            return '[dom]';
        }
        return '{' + Object.keys(value).sort()
            .map((key) => `${key}:${safeStringify(value[key], seen)}`)
            .join(',') + '}';
    } finally {
        seen.delete(value);
    }
}
