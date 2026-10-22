import { recoverOperation, linkRecoverySignals } from '../storage/automatic-recovery.js';
import { getSillyTavernContext } from '../host/tavern-helper-adapter.js';
const owners = new WeakMap();
function requestOwner(global) {
    if (!owners.has(global)) owners.set(global, { stopped: false, controller: new AbortController() });
    return owners.get(global);
}
export function startMediaRequests(global) {
    const owner = requestOwner(global);
    if (owner.stopped) owners.set(global, { stopped: false, controller: new AbortController() });
}
export function stopMediaRequests(global) {
    const owner = requestOwner(global);
    owner.stopped = true; owner.controller.abort();
}

// 文件、目录和本地清单属于同一媒体运行时；关闭时结束等待，重新启动使用新的所有者。
export async function recoverMediaOperation(global, execute, options = {}) {
    const linked = linkRecoverySignals([requestOwner(global).controller.signal, options.signal]);
    try { return await recoverOperation(execute, { repeatable: 'save', ...options, signal: linked.signal, global }); }
    finally { linked.release(); }
}

export function tavernHeaders(globalObject) {
    const context = getSillyTavernContext(globalObject);
    return context && typeof context.getRequestHeaders === 'function' ? context.getRequestHeaders() : null;
}

// 只确认本次固定路径的写入，不将上传响应丢失解释成“再上传一份”。
async function mutationReceipt(globalObject, url, options, signal) {
    let body;
    try { body = JSON.parse(options.body); } catch { return null; }
    const upload = ['/api/images/upload', '/api/files/upload'].includes(url);
    const deletion = ['/api/images/delete', '/api/files/delete'].includes(url);
    if (!upload && !deletion) return null;
    const path = deletion ? body.path : url === '/api/images/upload'
        ? body.filename && body.format && `user/images/${body.ch_name ? `${body.ch_name}/` : ''}${body.filename.replace(/\.[^.]+$/, '')}.${body.format}`
        : body.name && `user/files/${body.name}`;
    if (typeof path !== 'string' || !/^\/?user\/(?:images|files)\//.test(path)
        || /(?:^|\/)\.\.(?:\/|$)/.test(path)) return null;
    const response = await globalObject.fetch(`/${path.replace(/^\//, '')}`, {
        cache: 'no-store', headers: tavernHeaders(globalObject), signal,
    });
    if (deletion) {
        if (response.status !== 404) { void Promise.resolve(response.body?.cancel?.()).catch(() => {}); return null; }
    } else {
        if (!response.ok) return null;
        const expected = body.image || body.data;
        let matches = false;
        if (typeof response.arrayBuffer === 'function' || typeof response.blob === 'function') {
            const data = typeof response.arrayBuffer === 'function' ? await response.arrayBuffer()
                : await (await response.blob()).arrayBuffer();
            const bytes = new Uint8Array(data);
            const binary = (globalObject.atob || globalThis.atob)(expected);
            matches = bytes.length === binary.length && bytes.every((byte, i) => byte === binary.charCodeAt(i));
        } else if (url === '/api/files/upload' && typeof response.json === 'function') {
            // 仅用于返回结构化文件内容的宿主适配器；真实 HTTP 使用上方逐字节比较。
            const binary = (globalObject.atob || globalThis.atob)(expected);
            const text = new TextDecoder().decode(Uint8Array.from(binary, char => char.charCodeAt(0)));
            matches = JSON.stringify(await response.json()) === JSON.stringify(JSON.parse(text));
        }
        if (!matches) return null;
    }
    const value = { path: path.replace(/^\//, '') };
    const responseValue = { ok: true, status: 200, json: async () => value,
        text: async () => JSON.stringify(value) };
    return { response: responseValue, read: method => responseValue[method]() };
}

export async function mediaRequest(globalObject, url, options = {}, timeoutMs = 30000) {
    if (typeof globalObject.fetch !== 'function') throw new Error('media-offline');
    const owner = requestOwner(globalObject);
    if (owner.stopped) throw new Error('media-request-aborted');
    const linked = linkRecoverySignals([options.signal, owner.controller.signal]);
    const originalSignal = linked.signal;
    const { recover = true, onSlow, ...fetchOptions } = options;
    const fetchAttempt = async () => {
        const Abort = globalObject.AbortController || globalThis.AbortController;
        const controller = Abort ? new Abort() : null;
        const bounded = async task => {
            if (originalSignal?.aborted) throw new Error('media-request-aborted');
            let timer, abort;
            const interrupt = new Promise((_, reject) => {
                abort = () => { controller?.abort(); reject(new Error('media-request-aborted')); };
                originalSignal?.addEventListener('abort', abort, { once: true });
                timer = (globalObject.setTimeout || setTimeout)(() => {
                    try { onSlow?.(); } catch { /* 继续接收同一次读写结果。 */ }
                }, timeoutMs);
                timer?.unref?.();
            });
            try { return await Promise.race([Promise.resolve().then(task), interrupt]); }
            finally { (globalObject.clearTimeout || clearTimeout)(timer); originalSignal?.removeEventListener('abort', abort); }
        };
        const headers = options.headers ? { ...options.headers, ...tavernHeaders(globalObject) } : options.headers;
        const response = await bounded(() => globalObject.fetch(url, { ...fetchOptions, headers,
            ...(controller && { signal: controller.signal }) }));
        if (response?.status >= 500 || [408, 425, 429, 401, 403].includes(response?.status)) {
            void Promise.resolve(response.body?.cancel?.()).catch(() => {});
            throw Object.assign(new Error('media-service-recovering'), { status: response.status });
        }
        const readers = Object.fromEntries(['json', 'blob', 'text'].filter(method => typeof response?.[method] === 'function')
            .map(method => [method, response[method].bind(response)]));
        return { response, read: method => bounded(readers[method]) };
    };
    let attempt;
    const readOnly = ['GET', 'HEAD'].includes(String(options.method || 'GET').toUpperCase())
        || url === '/api/images/list';
    const receipt = async () => {
        try { return await mutationReceipt(globalObject, url, options, originalSignal); } catch { return null; }
    };
    const observeRead = readOnly ? async () => ({ completed: true, value: await fetchAttempt() }) : undefined;
    try { attempt = readOnly && recover ? await recoverOperation(fetchAttempt, { signal: originalSignal, global: globalObject,
        observe: observeRead }) : await fetchAttempt().catch(async error => {
            const saved = !readOnly && await receipt();
            if (saved) return saved;
            throw error; // 由原 WAL/固定文件任务续接；这里不重放未知写入。
        });
        if (originalSignal?.aborted) throw new Error('media-request-aborted');
    } catch (error) { linked.release(); throw error; }
    const response = attempt.response, readers = {};
    for (const method of ['json', 'blob', 'text']) if (typeof response?.[method] === 'function') {
        let reload = false;
        readers[method] = async () => {
            const read = async () => {
            if (reload) {
                attempt = await fetchAttempt();
                if (response.ok && !attempt.response.ok) throw new Error('media-response-recovering');
            }
            reload = true;
            return attempt.read(method);
        };
            try { const value = readOnly && recover ? await recoverOperation(read, { signal: originalSignal, global: globalObject,
                observe: async () => ({ completed: true, value: await read() }) }) : await attempt.read(method).catch(async error => {
                    const saved = !readOnly && await receipt();
                    if (saved) { attempt = saved; return saved.read(method); }
                    throw error;
                });
            if (originalSignal?.aborted) throw new Error('media-request-aborted');
            return value;
            } finally { linked.release(); }
        };
    }
    if (!Object.keys(readers).length) linked.release();
    return new Proxy(response, { get(_target, key) {
        if (readers[key]) return readers[key];
        const value = Reflect.get(attempt.response, key, attempt.response);
        return typeof value === 'function' ? value.bind(attempt.response) : value;
    } });
}

export function utf8Base64(text, globalObject = globalThis) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return (globalObject.btoa || globalThis.btoa)(binary);
}
