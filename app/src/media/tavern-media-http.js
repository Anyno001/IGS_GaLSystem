import { getSillyTavernContext } from '../host/tavern-helper-adapter.js';

export function tavernHeaders(globalObject) {
    const context = getSillyTavernContext(globalObject);
    return context && typeof context.getRequestHeaders === 'function' ? context.getRequestHeaders() : null;
}

export async function mediaRequest(globalObject, url, options = {}, timeoutMs = 30000) {
    if (typeof globalObject.fetch !== 'function') throw new Error('media-offline');
    const Abort = globalObject.AbortController || globalThis.AbortController;
    const controller = Abort ? new Abort() : null, originalSignal = options.signal;
    async function bounded(task) {
        if (originalSignal?.aborted || controller?.signal.aborted) throw new Error('media-request-aborted');
        let timer, abort;
        const interrupt = new Promise((_, reject) => {
            abort = () => { controller?.abort(); reject(new Error('media-request-aborted')); };
            originalSignal?.addEventListener('abort', abort, { once: true });
            timer = (globalObject.setTimeout || setTimeout)(() => { controller?.abort(); reject(new Error('media-request-timeout')); }, timeoutMs);
            timer?.unref?.();
        });
        try { return await Promise.race([Promise.resolve().then(task), interrupt]); }
        finally { (globalObject.clearTimeout || clearTimeout)(timer); originalSignal?.removeEventListener('abort', abort); }
    }
    const response = await bounded(() => globalObject.fetch(url, { ...options, ...(controller ? { signal: controller.signal } : {}) }));
    // fetch 返回头部后，响应体也必须有期限；否则 json/blob 卡住会占住整个提交锁。
    for (const method of ['json', 'blob', 'text']) if (typeof response?.[method] === 'function') {
        const read = response[method].bind(response);
        response[method] = () => bounded(read);
    }
    return response;
}

export function utf8Base64(text, globalObject = globalThis) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return (globalObject.btoa || globalThis.btoa)(binary);
}
