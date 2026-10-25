import { createTavernImageFiles } from './tavern-image-files.js';

// 编辑/一致性任务需要原像素，独立读取，不把原图放进网页显示缓存。
export async function readReferenceImageUrl(url, globalObject = globalThis, { signal } = {}) {
    if (signal?.aborted) throw new Error('cancelled');
    if (typeof url !== 'string' || !url.trim()) throw new Error('reference-read-failed');
    if (/^data:image\//i.test(url)) return url;
    if (/^\/?user\/images\/igs-[^?#]+$/i.test(url)) {
        try { return await createTavernImageFiles(globalObject, 'igs-media').read(url, { original: true, strictRead: true, signal }); }
        catch (error) { if ([404, 410].includes(error.status)) return null; throw error; }
    }
    if (!/^(?:https?:\/\/|blob:|\/?user\/images\/)/i.test(url)) throw new Error('reference-read-failed');
    const source = /^\/?user\/images\//.test(url) ? `/${url.replace(/^\//, '')}` : url;
    const Controller = globalObject.AbortController || globalThis.AbortController;
    const controller = new Controller();
    let reader;
    return new Promise((resolve, reject) => {
        let settled = false;
        const finish = (error, value) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            signal?.removeEventListener('abort', abort);
            controller.abort();
            if (reader) {
                reader.onload = null; reader.onerror = null; reader.onabort = null;
                if (reader.readyState === 1) reader.abort();
            }
            if (error) reject(error); else resolve(value);
        };
        const abort = () => finish(new Error('cancelled'));
        const timer = setTimeout(() => finish(new Error('reference-read-failed')), 30000);
        signal?.addEventListener('abort', abort, { once: true });
        if (signal?.aborted) { abort(); return; }
        (async () => {
            const response = await globalObject.fetch(source, { cache: 'no-store', signal: controller.signal });
            if (settled) return;
            if ([404, 410].includes(response?.status)) { finish(null, null); return; }
            if (!response?.ok) throw new Error('reference-read-failed');
            const blob = await response.blob();
            if (settled) return;
            reader = new globalObject.FileReader();
            reader.onload = () => finish(null, String(reader.result || ''));
            reader.onerror = reader.onabort = () => finish(new Error('reference-read-failed'));
            reader.readAsDataURL(blob);
        })().catch(() => finish(new Error('reference-read-failed')));
    });
}
