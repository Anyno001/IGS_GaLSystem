import { IMAGE_FIELDS, isImageData, imageFingerprint } from './image-identity.js';
import { collectImageReferences } from './image-references.js';
export const IMAGE_IMPORT_READER = Symbol('igs-archive-image-reader');

export function remapImageReferences(value, ids) {
    if (typeof value === 'string') return value.startsWith('igs-gen:') && ids.has(value.slice(8)) ? `igs-gen:${ids.get(value.slice(8))}` : value;
    if (Array.isArray(value)) return value.map(item => remapImageReferences(item, ids));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, remapImageReferences(item, ids)]));
    return value;
}
function extractInlineAvatars(value, records, seen = new Map()) {
    if (!value || typeof value !== 'object') return value;
    const copy = Array.isArray(value) ? value.map(item => extractInlineAvatars(item, records, seen))
        : Object.fromEntries(Object.entries(value).map(([key, item]) => [key, extractInlineAvatars(item, records, seen)]));
    if (copy.statusAvatars && typeof copy.statusAvatars === 'object') for (const [name, raw] of Object.entries(copy.statusAvatars)) {
        if (!isImageData(raw)) continue;
        let id = seen.get(raw);
        if (!id) { id = `inline-avatar-${imageFingerprint(raw)}`; records.push({ id, type: 'avatar', dataUrl: raw }); seen.set(raw, id); }
        copy.statusAvatars[name] = `igs-gen:${id}`;
    }
    return copy;
}
export async function prepareImageImport(images, value, service, options = {}) {
    const records = Array.isArray(images) ? [...images] : [];
    const source = extractInlineAvatars(value, records), ids = new Map(), written = [];
    const newId = options.newId || (() => `import-${Date.now().toString(36)}-${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`);
    for (const record of records) {
        if (!record?.id || ids.has(String(record.id)) || (typeof record[IMAGE_IMPORT_READER] !== 'function' && (!isImageData(record.dataUrl)
            || IMAGE_FIELDS.some(field => record[field] && !isImageData(record[field]))))) return { ok: false, reason: 'invalid-image-pack' };
        const id = newId();
        if (!id || [...ids.values()].includes(id) || id === String(record.id)) return { ok: false, reason: 'image-import-id-collision' };
        ids.set(String(record.id), id);
    }
    if (options.remapMissing) for (const oldId of collectImageReferences(source).ids) if (!ids.has(oldId)) {
        const id = newId();
        if (!id || id === oldId || [...ids.values()].includes(id)) return { ok: false, reason: 'image-import-id-collision' };
        ids.set(oldId, id);
    }
    const rollback = async () => {
        if (!written.length) return { ok: true };
        if (typeof service?.deleteImages !== 'function') return { ok: false, reason: 'import-rollback-unavailable', ids: [...written] };
        try { const result = await service.deleteImages(written); return result?.retained?.length ? { ...result, ok: false, reason: 'import-rollback-referenced' } : result; } catch (error) { return { ok: false, reason: 'import-rollback-failed', error: error.message }; }
    };
    try {
        for (const record of records) {
            const id = ids.get(String(record.id));
            const loaded = typeof record[IMAGE_IMPORT_READER] === 'function' ? await record[IMAGE_IMPORT_READER]() : record;
            if (loaded?.id !== record.id || !isImageData(loaded.dataUrl) || IMAGE_FIELDS.some(field => loaded[field] && !isImageData(loaded[field]))) throw new Error('invalid-image-pack');
            written.push(id); // 包括可能已落盘、但后续返回失败的当前记录。
            const result = await service?.writeStoredImage?.(remapImageReferences({ ...loaded, id }, ids), { cacheDisplay: false });
            if (!result?.ok) throw new Error(result?.error || 'image-import-save-failed');
        }
    } catch (error) {
        const compensation = await rollback();
        return { ok: false, reason: 'image-import-save-failed', error: error.message, rollbackFailed: !compensation.ok };
    }
    return { ok: true, value: remapImageReferences(source, ids), ids: [...written], remap: ids, rollback };
}
