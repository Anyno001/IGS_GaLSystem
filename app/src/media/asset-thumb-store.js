import { decodeImage } from './image-decode.js';
// 设置页素材缩略图归中央图片缓存：每张生成 / 上传的图存一张 160 宽小图，
// 设置器列表只读小图，原图（立绘动辄 1024×1536）只在看大图时才读。图被改过（抠图、导入覆盖）或删掉时删掉对应小图。
import { localImageCacheFor } from './tavern-image-cache.js';
import { requireMediaCache } from './media-cache-owner.js';
export const ASSET_THUMB_WIDTH = 160;
const keyOf = id => `thumb:asset:${String(id || '')}`;
const adapter = cache => ({
    mediaCache: cache,
    get: id => cache.get(keyOf(id)),
    put: (id, dataUrl, stamp) => cache.put(keyOf(id), dataUrl, stamp),
    remove: ids => Promise.all((ids || []).map(id => cache.drop(keyOf(id)))),
    clear: () => cache.clear(),
});
export function createMemoryAssetThumbStore({ mediaCache } = {}) { return adapter(requireMediaCache(mediaCache, 'asset-thumbs')); }
export function createIndexedDbAssetThumbStore(globalObject = globalThis) { return adapter(localImageCacheFor(globalObject)); }

// 缩成 160 宽 WebP（立绘要留透明底，不能用 JPEG）；浏览器不支持 WebP 编码时自动给 PNG。没有画布或解码失败返回空串。
export function createAssetThumbnailer(globalObject = globalThis, { width = ASSET_THUMB_WIDTH, quality = 0.82 } = {}) {
    return async function makeThumbnail(src) {
        const doc = globalObject && globalObject.document;
        const ImageCtor = globalObject && globalObject.Image;
        if (!src || !doc || typeof doc.createElement !== 'function' || typeof ImageCtor !== 'function') return '';
        const img = await decodeImage(globalObject, src);
        const iw = img && (img.naturalWidth || img.width);
        const ih = img && (img.naturalHeight || img.height);
        if (!iw || !ih) return '';
        if (iw <= width) return '';
        const h = Math.max(1, Math.round((ih * width) / iw));
        const canvas = doc.createElement('canvas');
        canvas.width = width;
        canvas.height = h;
        const ctx = canvas.getContext && canvas.getContext('2d');
        if (!ctx) return '';
        ctx.drawImage(img, 0, 0, width, h);
        try { return canvas.toDataURL('image/webp', quality); } catch { return ''; }
    };
}
