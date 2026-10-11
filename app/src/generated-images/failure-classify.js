export const IMAGE_FAILURE_KINDS = Object.freeze(['timeout', 'network', 'server5xx', 'rateLimit429', 'emptyOrBroken', 'moderation', 'authOrParam', 'pluginTimeout', 'unknown']);

const MODERATION = /审核|违规|违禁|敏感内容|内容安全|moderation|safety|nsfw filter|content policy|blocked|censor/i;
const AUTH_PARAM = /请先|未就绪|未检测到|请求无效|参数|鉴权|余额|订阅不足|版本过旧|不是生图提示词|没有可(?:交给|出图|用于)|unauthori[sz]ed|forbidden|invalid/i;
const TIMEOUT = /超时|超过\s*\d+\s*秒|\d+\s*秒内没有返回|timed?\s*out|timeout|aborted/i;
const NETWORK = /直连失败|无法连接|网络|cors|failed to fetch|networkerror|network error|代理请求/i;
const EMPTY = /没有图片|没有返回图片|未返回图片|返回的不是图片|解析失败|读取失败|视频|空图|损坏|empty|corrupt/i;
const RATE = /过于频繁|too many|rate.?limit/i;

const RETRYABLE = new Set(['timeout', 'network', 'server5xx', 'rateLimit429', 'emptyOrBroken', 'unknown']);

const REASON = {
    timeout: '请求超时',
    network: '网络不通或被浏览器拦截',
    server5xx: '生图服务暂时出错',
    rateLimit429: '请求过于频繁，已被限流',
    emptyOrBroken: '没有拿到有效的图片',
    moderation: '可能被内容审核拦截，请换一种描述',
    authOrParam: '配置或参数有误，请检查生图设置',
    pluginTimeout: '插件长时间没有返回，可能仍在出图',
    unknown: '出图失败',
};

export const PLUGIN_SOURCES = Object.freeze(['chatu8', 'baibai', 'dbgen']);

function textOf(input) {
    if (input == null) return '';
    if (typeof input === 'string') return input;
    if (input instanceof Error) return input.message || '';
    return [input.error, input.reason, input.message].filter((v) => typeof v === 'string').join(' ');
}

function statusOf(input) {
    const status = input && typeof input === 'object' ? Number(input.status) : NaN;
    return Number.isFinite(status) ? status : 0;
}

export function classifyImageError(input, context = {}) {
    const text = textOf(input);
    const status = statusOf(input);
    const plugin = PLUGIN_SOURCES.includes(context.source);
    let kind = 'unknown';
    if (status === 429 || RATE.test(text)) kind = 'rateLimit429';
    else if (status >= 500) kind = 'server5xx';
    else if (status === 401 || status === 402 || status === 403 || status === 400 || status === 422) kind = 'authOrParam';
    else if (MODERATION.test(text)) kind = 'moderation';
    else if (/chatu8-timeout/.test(text) || TIMEOUT.test(text) || status === 408) kind = plugin ? 'pluginTimeout' : 'timeout';
    else if (AUTH_PARAM.test(text)) kind = 'authOrParam';
    else if (NETWORK.test(text)) kind = 'network';
    else if (EMPTY.test(text)) kind = 'emptyOrBroken';
    return { kind, retryable: RETRYABLE.has(kind), reason: REASON[kind], status };
}

export function describeFailure(kind) {
    return REASON[kind] || REASON.unknown;
}
