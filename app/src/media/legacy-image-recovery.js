import { IMAGE_FIELDS, IMAGE_RECOVERY_PIXELS } from './image-identity.js';
import { decodeImage } from './image-decode.js';
const HASH_NAME = /^[0-9a-f]{16}\.\w+$/;
export function legacyImageHash(text) {
    let a = 0xdeadbeef, b = 0x41c6ce57;
    for (let i = 0; i < text.length; i += 1) {
        const value = text.charCodeAt(i);
        a = Math.imul(a ^ value, 2654435761); b = Math.imul(b ^ value, 1597334677);
    }
    a = Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909);
    b = Math.imul(b ^ (b >>> 16), 2246822507) ^ Math.imul(a ^ (a >>> 13), 3266489909);
    return (b >>> 0).toString(16).padStart(8, '0') + (a >>> 0).toString(16).padStart(8, '0');
}
export function createLegacyImageRecovery(globalObject, { dir, listFiles, read, slug }) {
    let batch = null;
    const yieldTurn = () => new Promise(resolve => (globalObject.setTimeout || setTimeout)(resolve, 0));
    async function hasAlpha(dataUrl) {
        try {
            const bitmap = await decodeImage(globalObject, dataUrl, { timeoutMs: 5000 });
            if (!bitmap) return false;
            const canvas = globalObject.document.createElement('canvas'); canvas.width = 24; canvas.height = 24;
            const ctx = canvas.getContext('2d'); ctx.drawImage(bitmap, 0, 0, 24, 24);
            const pixels = ctx.getImageData(0, 0, 24, 24).data;
            for (let i = 3; i < pixels.length; i += 4) if (pixels[i] < 250) return true;
        } catch { /* 无解码器时保留旧版原图→透明结果→遮罩顺序。 */ }
        return false;
    }
    function scan(key) {
        if (!batch) {
            const keys = new Set();
            const current = { keys, promise: null };
            current.promise = yieldTurn().then(async () => {
                batch = null;
                const hits = new Map([...keys].map(value => [value, []]));
                for (const name of (await listFiles()).filter(value => HASH_NAME.test(value))) {
                    const path = `user/images/${dir}/${name}`, dataUrl = await read(path);
                    if (!dataUrl) continue;
                    for (const [id, list] of hits) if (legacyImageHash(`${id}\n${dataUrl}`) === name.slice(0, 16)) list.push({ path, dataUrl });
                    await yieldTurn();
                }
                return hits;
            });
            batch = current;
        }
        batch.keys.add(key);
        return batch.promise.then(hits => hits.get(key) || []);
    }
    return async key => {
        if (!key) return null;
        // 不可反解的 Unicode/截断名称不猜归属；旧内容哈希可以验证任意真实键。
        const safeTagged = /^[a-zA-Z0-9-]+(?:\|\d+\|\d+\|\d+)?$/.test(String(key)) && String(key).length < 80;
        if (safeTagged) {
            const record = { id: key };
            for (const name of (await listFiles()).filter(value => value.startsWith(`${slug(key)}@`))) {
                const [, type, field] = name.replace(/\.\w+$/, '').split('@');
                if (type) record.type = type;
                if (IMAGE_FIELDS.includes(field)) record[field] = `user/images/${dir}/${name}`;
            }
            if (record.dataUrl) return record;
        }
        const hits = await scan(key);
        if (!hits.length) return null;
        const recovered = record => Object.defineProperty(record, IMAGE_RECOVERY_PIXELS, { value: new Map(hits.map(hit => [hit.path, hit.dataUrl])) });
        if (hits.length === 1) return recovered({ id: key, dataUrl: hits[0].path });
        let current = 0;
        while (current < hits.length && !await hasAlpha(hits[current].dataUrl)) current += 1;
        if (current >= hits.length) current = 1;
        return recovered({ id: key, type: 'sprite', revision: 1, dataUrl: hits[current].path, originalDataUrl: hits[current > 0 ? 0 : current].path,
            workingDataUrl: '', alphaMaskDataUrl: current < hits.length - 1 ? hits.at(-1).path : '' });
    };
}
