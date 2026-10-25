import { decodeImage } from './image-decode.js';
import { isImageData, dataUrlBlob } from './image-identity.js';

export const DISPLAY_IMAGE_EDGE = 1600;
export const DISPLAY_IMAGE_PIXELS = 1600000;

async function animated(blob) {
    if (blob.type === 'image/gif') return true;
    if (blob.type === 'image/webp') {
        const head = new Uint8Array(await blob.slice(0, 32).arrayBuffer());
        return String.fromCharCode(...head.slice(12, 16)) === 'VP8X' && Boolean(head[20] & 2);
    }
    if (blob.type === 'image/png') for (let cursor = 8; cursor + 8 <= blob.size;) {
        const header = new Uint8Array(await blob.slice(cursor, cursor + 8).arrayBuffer());
        const size = new DataView(header.buffer).getUint32(0), kind = String.fromCharCode(...header.slice(4));
        if (kind === 'acTL') return true;
        if (kind === 'IDAT' || kind === 'IEND') break;
        cursor += size + 12;
    }
    return false;
}

export function createDisplayImageEncoder(globalObject) {
    const available = Boolean(globalObject.document?.createElement && globalObject.Image && globalObject.URL?.createObjectURL);
    let tail = Promise.resolve();
    const accepts = value => available && (isImageData(value) || (typeof value !== 'string' && /^image\//i.test(value?.type || '')));
    async function encode(value, { signal } = {}) {
        if (!accepts(value)) return value;
        const task = tail.then(async () => {
            if (signal?.aborted) throw new Error('image-read-aborted');
            const input = typeof value === 'string' ? dataUrlBlob(value, globalObject) : value;
            // Canvas 单帧编码会破坏动画；已有动画格式继续交给浏览器播放。
            if (input && await animated(input)) return value;
            const url = typeof value === 'string' ? value : globalObject.URL.createObjectURL(value);
            let image, canvas;
            try {
                image = await decodeImage(globalObject, url, { signal });
                const width = image?.naturalWidth || image?.width, height = image?.naturalHeight || image?.height;
                if (!width || !height) throw new Error('image-display-decode-failed');
                const scale = Math.min(1, DISPLAY_IMAGE_EDGE / Math.max(width, height), Math.sqrt(DISPLAY_IMAGE_PIXELS / (width * height)));
                canvas = globalObject.document.createElement('canvas');
                canvas.width = Math.max(1, Math.floor(width * scale)); canvas.height = Math.max(1, Math.floor(height * scale));
                const context = canvas.getContext('2d');
                if (!context) throw new Error('image-display-canvas-unavailable');
                context.drawImage(image, 0, 0, canvas.width, canvas.height);
                const result = await new Promise((resolve, reject) => {
                    if (typeof canvas.toBlob !== 'function') { reject(new Error('image-display-encoder-unavailable')); return; }
                    let settled = false;
                    const finish = (blob, error) => {
                        if (settled) return; settled = true;
                        (globalObject.clearTimeout || clearTimeout)(timer); signal?.removeEventListener('abort', abort);
                        if (error) reject(error); else resolve(blob);
                    };
                    const abort = () => finish(null, new Error('image-read-aborted'));
                    const timer = (globalObject.setTimeout || setTimeout)(() => finish(null, new Error('image-display-encode-timeout')), 15000);
                    signal?.addEventListener('abort', abort, { once: true });
                    if (signal?.aborted) { abort(); return; }
                    try { canvas.toBlob(blob => finish(blob, blob ? null : new Error('image-display-encode-failed')), 'image/webp', 0.82); }
                    catch (error) { finish(null, error); }
                });
                if (signal?.aborted) throw new Error('image-read-aborted');
                return result;
            } finally {
                image?.removeAttribute?.('src');
                if (canvas) { canvas.width = 1; canvas.height = 1; }
                if (typeof value !== 'string') globalObject.URL.revokeObjectURL(url);
            }
        });
        tail = task.then(() => {}, () => {});
        return task;
    }
    return { accepts, encode };
}
