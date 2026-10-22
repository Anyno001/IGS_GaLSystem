import { IMAGE_FIELDS, isImageData, isImagePath, dataUrlBlob, blobDataUrl, imageFingerprint } from '../media/image-identity.js';
import { collectImageReferences } from '../media/image-references.js';
import { IMAGE_IMPORT_READER } from '../media/image-import-transaction.js';
import { createTavernImageFiles } from '../media/tavern-image-files.js';
import { createArchiveDownload } from '../media/archive-download.js';
import { writeZip, readZip } from '../media/archive-zip.js';
import { recoverOperation } from '../storage/automatic-recovery.js';

const formats = new Set(['igs-character-card', 'igs-scene-preset', 'igs-settings-pack']);
const inlineImages = (value, found = new Set()) => {
    if (isImageData(value)) found.add(value);
    else if (value && typeof value === 'object') for (const item of Object.values(value)) inlineImages(item, found);
    return found;
};
const replacePaths = (value, paths) => {
    if (typeof value === 'string') return paths.get(value) || value;
    if (Array.isArray(value)) return value.map(item => replacePaths(item, paths));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replacePaths(item, paths)]));
    return value;
};

export async function exportAssetArchive(input, service, globalObject, fileName, options = {}) {
    if (!formats.has(input.format)) throw new Error('archive-format-invalid');
    const sink = options.sink || await createArchiveDownload(globalObject, fileName);
    const files = createTavernImageFiles(globalObject, 'igs-media');
    const refs = collectImageReferences(input), ids = new Set(refs.ids), direct = new Map(), replacements = new Map();
    for (const source of [...refs.paths, ...inlineImages(input)]) {
        const base = `file-${imageFingerprint(source)}`; let id = base, suffix = 0;
        while (ids.has(id)) id = `${base}-${++suffix}`;
        direct.set(id, { id, type: 'background', dataUrl: source });
        replacements.set(source, `igs-gen:${id}`);
        if (isImagePath(source)) replacements.set(`/${source}`, `igs-gen:${id}`);
        ids.add(id);
    }
    const manifest = { ...replacePaths(input, replacements), version: 1, images: Object.create(null) };
    const BlobCtor = globalObject.Blob || globalThis.Blob;
    async function* entries() {
        let index = 0;
        for (const id of ids) {
            if (options.signal?.aborted) throw new Error('archive-cancelled');
            const readRecord = async () => {
                const value = direct.get(id) || await service?.readStoredImageRecord?.(id);
                if (!value?.dataUrl) throw new Error('archive-image-pending');
                return value;
            };
            const record = await recoverOperation(readRecord, { signal: options.signal, global: globalObject,
                observe: async () => ({ completed: true, value: await readRecord() }) });
            if (record?.cancelled) throw new Error('archive-cancelled');
            const meta = Object.fromEntries(Object.entries(record).filter(([key]) => !IMAGE_FIELDS.includes(key)));
            const referenced = collectImageReferences(meta);
            for (const nested of referenced.ids) ids.add(nested);
            const pixelFiles = {}, seen = new Map(); meta.files = pixelFiles; manifest.images[id] = meta;
            for (const field of IMAGE_FIELDS) {
                const value = record[field]; if (!value) continue;
                if (seen.has(value)) { pixelFiles[field] = seen.get(value); continue; }
                if (!isImageData(value) && !isImagePath(value)) throw new Error(`archive-image-invalid:${id}:${field}`);
                const name = `images/${index}-${String(id).replace(/[^\w.-]/g, '_')}-${field}.bin`, info = { name, mime: '' };
                pixelFiles[field] = info; seen.set(value, info);
                yield { name, async blob() {
                    const readPixels = async () => {
                        const read = isImageData(value) ? dataUrlBlob(value, { ...globalObject, Blob: BlobCtor, atob: globalObject.atob || globalThis.atob }) : await files.readBlob(value, { signal: options.signal });
                        if (!read) throw new Error('archive-image-pending');
                        return read;
                    };
                    const blob = await recoverOperation(readPixels, { signal: options.signal, global: globalObject,
                        observe: async () => ({ completed: true, value: await readPixels() }) });
                    if (blob?.cancelled) throw new Error('archive-cancelled');
                    info.mime = blob.type || 'image/png'; return blob;
                } };
            }
            index += 1; options.onProgress?.({ done: index, total: ids.size });
        }
        yield { name: 'pack.json', blob: new BlobCtor([JSON.stringify(manifest)], { type: 'application/json' }) };
    }
    const result = await writeZip(entries(), sink, options);
    return { ...result, fileName, images: ids.size, missing: 0, storage: sink.mode };
}

export async function readAssetArchive(blob, globalObject = globalThis) {
    const entries = await readZip(blob), packed = entries.get('pack.json');
    if (!packed) throw new Error('archive-manifest-missing');
    const manifest = JSON.parse(await (await packed.blob()).text());
    if (!formats.has(manifest?.format) || manifest.version !== 1) throw new Error('archive-format-invalid');
    if (manifest.format === 'igs-character-card' && !String(manifest.characterName || '').trim()) throw new Error('archive-format-invalid');
    if (manifest.format === 'igs-scene-preset' && (!manifest.preset || typeof manifest.preset !== 'object')) throw new Error('archive-format-invalid');
    if (manifest.format === 'igs-settings-pack' && (!manifest.settings || typeof manifest.settings !== 'object')) throw new Error('archive-format-invalid');
    const images = Object.values(manifest.images || {}).map(meta => {
        if (!meta?.id || !meta.files || typeof meta.files !== 'object') throw new Error('archive-image-invalid');
        for (const info of Object.values(meta.files)) if (!info?.name || !entries.has(info.name)) throw new Error('archive-image-file-missing');
        const { files, ...record } = meta;
        Object.defineProperty(record, IMAGE_IMPORT_READER, { value: async () => {
            const value = { ...record }, loaded = new Map();
            for (const field of IMAGE_FIELDS) {
                const info = files[field]; if (!info) continue;
                if (!loaded.has(info.name)) loaded.set(info.name, await blobDataUrl(new Blob([await entries.get(info.name).blob()], { type: info.mime }), globalObject));
                value[field] = loaded.get(info.name);
            }
            return value;
        } });
        return record;
    });
    return { ...manifest, images };
}

export async function readAssetFile(file, globalObject = globalThis) {
    const bytes = new Uint8Array(await file.slice(0, 2).arrayBuffer());
    if (bytes[0] === 0x50 && bytes[1] === 0x4b) return { fileName: file.name, bytes, archive: await readAssetArchive(file, globalObject) };
    return { fileName: file.name, bytes: new Uint8Array(await file.arrayBuffer()) };
}
