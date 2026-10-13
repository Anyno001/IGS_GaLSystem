// 短生命周期解码；原图/缩略图的长期字节和 URL 仍由中央缓存管理。
export function decodeImage(globalObject, src, { timeoutMs = 15000, crossOrigin = '', signal } = {}) {
    const ImageCtor = globalObject?.Image;
    if (!src || typeof ImageCtor !== 'function' || signal?.aborted) return Promise.resolve(null);
    return new Promise(resolve => {
        const image = new ImageCtor();
        let timer = null, settled = false;
        const finish = value => {
            if (settled) return;
            settled = true;
            (globalObject.clearTimeout || clearTimeout)(timer);
            signal?.removeEventListener('abort', abort);
            image.onload = null; image.onerror = null;
            if (!value) image.removeAttribute?.('src');
            resolve(value);
        };
        const abort = () => finish(null);
        timer = (globalObject.setTimeout || setTimeout)(abort, timeoutMs);
        image.onload = () => finish(image); image.onerror = abort;
        signal?.addEventListener('abort', abort, { once: true });
        image.decoding = 'async';
        if (crossOrigin) image.crossOrigin = crossOrigin;
        try { image.src = src; } catch { abort(); }
    });
}
