import { imagePaths, isImagePath, normalizeImagePath } from './image-identity.js';

export function collectImageReferences(value, result = { ids: new Set(), paths: new Set() }) {
    if (typeof value === 'string') {
        if (value.startsWith('igs-gen:')) result.ids.add(value.slice(8));
        if (isImagePath(value)) result.paths.add(normalizeImagePath(value));
    } else if (Array.isArray(value)) for (const item of value) collectImageReferences(item, result);
    else if (value && typeof value === 'object') {
        for (const item of Object.values(value)) collectImageReferences(item, result);
    }
    return result;
}

export function storedImageReferences(globalObject, extra) {
    const references = collectImageReferences(extra);
    const storage = globalObject.localStorage;
    if (!storage) return references;
    for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        if (!/^igs[-_:]/i.test(String(key))) continue;
        const text = storage.getItem(key);
        let value = text;
        try { value = JSON.parse(text); } catch { /* 地图键直接存路径 */ }
        collectImageReferences(value, references);
    }
    return references;
}

export async function generatedImageReferences(store, globalObject, extra) {
    const references = storedImageReferences(globalObject, extra);
    for (const asset of typeof store.listAssets === 'function' ? await store.listAssets() : []) {
        if (['review', 'chat', 'ready'].includes(asset.status) && asset.imageId) references.ids.add(asset.imageId);
    }
    return references;
}

export async function generatedImageAudit(store, globalObject, extra) {
    const references = await generatedImageReferences(store, globalObject, extra);
    const records = typeof store.listImages === 'function' ? await store.listImages() : [];
    return records.map(record => ({ id: record.id, referenced: references.ids.has(record.id), paths: [...imagePaths(record)] }));
}
