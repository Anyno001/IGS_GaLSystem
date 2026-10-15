import { getTavernHelper, getSillyTavernContext } from './tavern-helper-adapter.js';
import { runBackgroundGeneration } from './background-generation.js';

function apiBaseUrl(endpoint) {
    const base = String(endpoint || '').trim().replace(/\/+$/, '');
    if (!base) throw new Error('请先填写副 LLM 地址');
    let parsed;
    try { parsed = new URL(base); } catch { throw new Error('副 LLM 地址无效，请填写 HTTP/HTTPS 接口地址'); }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.search || parsed.hash) {
        throw new Error('副 LLM 地址无效，请填写不含查询参数的 HTTP/HTTPS 接口地址');
    }
    const root = base.replace(/\/(?:chat\/completions|models)$/i, '');
    return /\/v\d+$/i.test(root) ? root : `${root}/v1`;
}

function withTimeout(promise, ms, onTimeout = () => {}) {
    let timer = null;
    return Promise.race([
        promise,
        new Promise((_, reject) => { timer = setTimeout(() => { reject(new Error('副 LLM 请求超时')); onTimeout(); }, ms); }),
    ]).finally(() => clearTimeout(timer));
}

export function readSseContent(body) {
    let text = '';
    for (const line of String(body || '').split(/\r?\n/)) {
        const payload = line.replace(/^\s*data:\s*/, '');
        if (payload === line || !payload || payload === '[DONE]') continue;
        try {
            const choice = JSON.parse(payload).choices?.[0];
            text += String(choice?.delta?.content ?? choice?.message?.content ?? choice?.text ?? '');
        } catch (error) { /* 心跳或非 JSON 行 */ }
    }
    return text;
}

function customConnection(llm) {
    const key = String(llm.apiKey || '').trim();
    return {
        chat_completion_source: 'custom',
        custom_url: apiBaseUrl(llm.endpoint),
        // JSON 是有效 YAML；显式覆盖 Authorization，空 Key 也不借用酒馆主连接的密钥。
        custom_include_headers: JSON.stringify({ Authorization: key ? `Bearer ${key}` : '' }),
    };
}

function safeDetail(value, apiKey) {
    let text = String(value || '');
    const key = String(apiKey || '').trim();
    if (key) text = text.split(key).join('[已隐藏]');
    return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 160);
}

export function createSecondaryLlm(globalObject = globalThis, deps = {}) {
    const fetchImpl = deps.fetch || (typeof globalObject.fetch === 'function' ? globalObject.fetch.bind(globalObject) : null);
    const createAbort = () => new (globalObject.AbortController || globalThis.AbortController)();

    async function postToTavern(route, body, llm, signal, label) {
        if (!fetchImpl) throw new Error('当前环境无法发起网络请求');
        const context = getSillyTavernContext(globalObject);
        if (!context || typeof context.getRequestHeaders !== 'function') {
            throw new Error('无法获取酒馆请求头，请确认脚本在酒馆页面内加载');
        }
        let response;
        try {
            response = await fetchImpl(`/api/backends/chat-completions/${route}`, {
                method: 'POST', credentials: 'same-origin', cache: 'no-cache', signal,
                headers: { ...context.getRequestHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
        } catch {
            throw new Error(`${label}：无法连接酒馆后端，请检查酒馆连接`);
        }
        let text = '', data = null;
        if (typeof response.text === 'function') {
            text = String(await response.text());
            try { data = JSON.parse(text); } catch { /* 下方兼容 SSE 或报告无效响应 */ }
        } else data = await response.json();
        if (!response.ok || data?.error) {
            const detail = safeDetail(data?.error?.message || (typeof data?.error === 'string' ? data.error : '')
                || data?.message || (!response.ok ? text : '酒馆未返回可用结果，请核对接口地址和密钥'), llm.apiKey);
            throw new Error(`${label}${!response.ok ? `（HTTP ${response.status}）` : ''}${detail ? `：${detail}` : ''}`);
        }
        if (data == null) {
            if (route === 'generate' && /^\s*data:/.test(text)) return { choices: [{ message: { content: readSseContent(text) } }] };
            throw new Error(`${label}：返回的不是 JSON${text ? `：${safeDetail(text, llm.apiKey)}` : ''}`);
        }
        return data;
    }

    async function viaTavern(system, user) {
        const helper = getTavernHelper(globalObject);
        if (helper && typeof helper.generateRaw === 'function') {
            // should_silence：后台请求不显示停止按钮、不广播生成事件，避免被当成正文流式。
            return String(await helper.generateRaw({
                should_stream: false,
                should_silence: true,
                ordered_prompts: [{ role: 'system', content: system }, { role: 'user', content: user }],
            }) || '');
        }
        const ctx = getSillyTavernContext(globalObject);
        if (ctx && typeof ctx.generateRaw === 'function') {
            return String(await ctx.generateRaw({ systemPrompt: system, prompt: user }) || '');
        }
        throw new Error('当前酒馆不支持 generateRaw，请在设置中改用独立 API');
    }

    async function viaOpenAi(system, user, llm, signal) {
        const data = await postToTavern('generate', {
            ...customConnection(llm),
            model: llm.model, stream: false, temperature: 0.7, use_sysprompt: true,
            messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        }, llm, signal, '副 LLM 请求失败');
        return String(data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '');
    }

    async function fetchModels(llm = {}) {
        const controller = createAbort();
        return withTimeout((async () => {
            const data = await postToTavern('status', customConnection(llm), llm, controller.signal, '副 LLM 模型拉取失败');
            const entries = Array.isArray(data && data.data) ? data.data : data && data.models;
            const models = [...new Set((Array.isArray(entries) ? entries : [])
                .map((item) => typeof item === 'string' ? item : item && (item.id || item.name))
                .filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim()))];
            if (!models.length) throw new Error('副 LLM 接口未返回可用模型');
            return { ok: true, models, message: `已拉取 ${models.length} 个副 LLM 模型` };
        })(), 30000, () => controller.abort());
    }

    return {
        fetchModels,
        async request({ system, user }, llm = {}) {
            const timeoutMs = Number(llm.timeoutMs) || 90000;
            const head = String(llm.jailbreakHead || '').trim();
            const tail = String(llm.jailbreakTail || '').trim();
            const finalSystem = head ? `${head}\n\n${system}` : system;
            const finalUser = tail ? `${user}\n\n${tail}` : user;
            const controller = llm.source === 'openai' ? createAbort() : null;
            const job = controller
                ? viaOpenAi(finalSystem, finalUser, llm, controller.signal)
                : runBackgroundGeneration(() => viaTavern(finalSystem, finalUser));
            return withTimeout(job, timeoutMs, () => controller?.abort());
        },
    };
}
