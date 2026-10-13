import { requireMediaCache } from './media-cache-owner.js';
import { imageFingerprint, isImageData } from './image-identity.js';
export function createMessageImageCache(store = new Map(), options = {}) {
    const media = requireMediaCache(options.mediaCache, 'messages');
    let epoch = 0;
    const records = media.auxiliary.createMap('messages', { store, maxEntries: options.limit, onClear: () => { epoch += 1; } });
    const keyOf = (id, scope = {}) => JSON.stringify([String(scope.chatId || ''), id, Number(scope.swipeId) || 0, String(scope.revision || '')]);
    function resolve(entry) {
        if (!entry) return null;
        const images = entry.images.map(image => {
            const { resourceKey, ...metadata } = image;
            return { ...metadata, url: resourceKey ? media.peek(resourceKey) : image.url };
        });
        // 元数据只保存稳定资源键；像素被淘汰后重新向消息/provider 取图，不能返回旧 Blob URL。
        if (images.some(image => !image.url)) return null;
        return { ...cloneData(entry), images, count: images.length };
    }
    return {
        epoch: () => epoch,
        destroy() { records.destroy(); },
        get(messageId, scope) {
            const normalizedId = normalizeMessageId(messageId);
            if (normalizedId == null) return null;
            return resolve(records.get(keyOf(normalizedId, scope)));
        },

        remember(messageId, images, options = {}) {
            const normalizedId = normalizeMessageId(messageId);
            if (normalizedId == null) {
                return { ok: false, reason: 'invalid-message-id', messageId };
            }
            const key = keyOf(normalizedId, options.scope);
            const nextImages = normalizeImages(images).map(image => {
                let resourceKey = media.sourceId(image.url);
                if (isImageData(image.url)) {
                    resourceKey = `external:${imageFingerprint(image.url)}:${image.url.length}`;
                    media.remember(resourceKey, image.url);
                }
                return resourceKey ? { ...image, url: '', resourceKey } : image;
            });
            const current = records.get(key);
            const merged = options.merge === true && current
                ? uniqueImages([...(current.images || []), ...nextImages])
                : nextImages;
            const entry = createEntry(normalizedId, merged);
            records.set(key, entry);
            return { ok: true, entry: resolve(entry) || createEntry(normalizedId, []) };
        },

        clearMessage(messageId, scope) {
            const normalizedId = normalizeMessageId(messageId);
            if (normalizedId == null) return { ok: false, reason: 'invalid-message-id', messageId };
            return { ok: records.delete(keyOf(normalizedId, scope)), messageId: normalizedId };
        },

        clear() {
            records.clear();
            return { ok: true };
        },
    };
}

function createEntry(messageId, images) {
    const normalizedImages = normalizeImages(images);
    return {
        messageId,
        images: normalizedImages,
        count: normalizedImages.length,
        signature: createImageSignature(normalizedImages),
    };
}

function normalizeImages(images) {
    const source = Array.isArray(images) ? images : [];
    return uniqueImages(source.map((image) => {
        if (!image || typeof image !== 'object') return null;
        const url = String(image.url || '').trim();
        const resourceKey = String(image.resourceKey || '');
        if (!url && !resourceKey) return null;
        return {
            url,
            ...(resourceKey ? { resourceKey } : {}),
            providerId: String(image.providerId || '').trim(),
            source: String(image.source || '').trim(),
            filename: String(image.filename || '').trim(),
            imageId: String(image.imageId || '').trim(),
            locationHash: String(image.locationHash || '').trim(),
            slotIndex: normalizeOptionalIndex(image.slotIndex),
            buttonIndex: normalizeOptionalIndex(image.buttonIndex),
            order: normalizeOptionalIndex(image.order),
        };
    }).filter(Boolean));
}

function uniqueImages(images) {
    const output = [];
    const seen = new Map();
    for (const image of Array.isArray(images) ? images : []) {
        const url = String(image && image.url || '').trim();
        const resourceKey = String(image && image.resourceKey || '');
        if (!url && !resourceKey) continue;
        const nextImage = {
            url,
            ...(resourceKey ? { resourceKey } : {}),
            providerId: String(image.providerId || '').trim(),
            source: String(image.source || '').trim(),
            filename: String(image.filename || '').trim(),
            imageId: String(image.imageId || '').trim(),
            locationHash: String(image.locationHash || '').trim(),
            slotIndex: normalizeOptionalIndex(image.slotIndex),
            buttonIndex: normalizeOptionalIndex(image.buttonIndex),
            order: normalizeOptionalIndex(image.order),
        };
        const identity = resourceKey || url;
        const existingIndex = seen.get(identity);
        if (existingIndex == null) {
            seen.set(identity, output.length);
            output.push(nextImage);
            continue;
        }
        output[existingIndex] = mergeImageMetadata(output[existingIndex], nextImage);
    }
    return output;
}

function createImageSignature(images) {
    return imageFingerprint(uniqueImages(images).map((image) => image.resourceKey || image.url).join('\n'));
}

function normalizeMessageId(value) {
    const id = Number(value);
    if (!Number.isFinite(id) || id < 0) return null;
    return id;
}

function cloneData(value) {
    if (value == null) return value;
    if (Array.isArray(value)) return value.map(cloneData);
    if (typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneData(item)]));
    }
    return value;
}

function mergeImageMetadata(current, next) {
    return {
        ...current,
        ...next,
        providerId: current.providerId || next.providerId,
        source: current.source || next.source,
        filename: current.filename || next.filename,
        imageId: current.imageId || next.imageId,
        locationHash: current.locationHash || next.locationHash,
        slotIndex: current.slotIndex ?? next.slotIndex ?? null,
        buttonIndex: current.buttonIndex ?? next.buttonIndex ?? null,
        order: current.order ?? next.order ?? null,
    };
}

function normalizeOptionalIndex(value) {
    if (value == null || value === '') return null;
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) return null;
    return Math.floor(numeric);
}
