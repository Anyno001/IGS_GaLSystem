// AI 局部重绘事务：必须由用户显式触发；预览只在内存中，接受时按 revision 原子写入。
// 暂时失败在当前步骤恢复，主动取消结束等待；originalDataUrl 永不改写。
import { buildCharacterDnaPromptParts, mergePromptTags } from '../../scene/character-dna.js';
import { recoverOperation } from '../../storage/automatic-recovery.js';
import { inheritImageTaskLease } from '../image-task-runtime.js';

export const INPAINT_KEEP_TAGS = 'same character, consistent hair color, consistent hairstyle, same face, same viewpoint, same lighting, detailed hair strands';

// 顺序：DNA（triggerWords → identity）→ 用户修复说明 → 固定保持项；负向只用 DNA negative。
export function buildInpaintPrompt({ prompt = '', dna = null } = {}) {
    const parts = dna ? buildCharacterDnaPromptParts(dna) : { positive: '', negative: '' };
    return { positive: mergePromptTags(parts.positive, prompt, INPAINT_KEEP_TAGS), negative: parts.negative };
}

function normalizeMatteResult(raw) {
    if (typeof raw === 'string' && raw) return { dataUrl: raw, alphaMaskDataUrl: '', crop: null };
    const r = raw && typeof raw === 'object' ? raw : {};
    if (typeof r.dataUrl !== 'string' || !r.dataUrl) throw new Error('matte-result-unavailable');
    return {
        dataUrl: r.dataUrl,
        alphaMaskDataUrl: typeof r.alphaMaskDataUrl === 'string' ? r.alphaMaskDataUrl : '',
        crop: r.diagnostics && r.diagnostics.crop ? { ...r.diagnostics.crop } : null,
    };
}

// service：getEditableImage / saveMatteEdit；backend：describeEdit / edit；matte：自动抠图（支持 detailed）。
export function createInpaintTransaction({ service, backend, matte }) {
    let inflight = null;
    let candidate = null;
    let controller = new AbortController();
    const rematte = async (dataUrl) => normalizeMatteResult(await matte(dataUrl, { detailed: true }));
    function readImage(imageId, signal) {
        const read = () => service.getEditableImage(imageId);
        return recoverOperation(read, { signal,
            shouldRecover: result => !['not-found', 'source-unavailable'].includes(result?.reason),
            observe: async () => {
                const value = await read();
                return { completed: value?.ok === true || ['not-found', 'source-unavailable'].includes(value?.reason), value };
            } });
    }
    function saveCandidate(imageId, revision, changes, signal) {
        let currentRevision = revision;
        return recoverOperation(() => service.saveMatteEdit(imageId, currentRevision, changes, { signal }), {
            signal, repeatable: 'save',
            repair: async failure => {
                if (!['stale-revision', 'revision-conflict'].includes(failure?.reason)) return;
                const latest = await service.getEditableImage(imageId);
                if (!latest?.ok || latest.record?.revision === currentRevision) return;
                currentRevision = latest.record.revision;
                return { changed: true };
            },
        });
    }

    // options：{ maskDataUrl, width, height, prompt, dna, strength }；遮罩为原图尺寸，由调用方提供。
    function preview(imageId, options = {}) {
        if (inflight) return inflight;
        const signal = controller.signal;
        inflight = (async () => {
            const ready = backend?.describe?.().mode === 'nai' && typeof backend.waitUntilReady === 'function'
                ? await backend.waitUntilReady({ signal }) : null;
            if (ready?.ok === false) return ready;
            const capability = backend && typeof backend.describeEdit === 'function'
                ? backend.describeEdit(undefined, ready || {})
                : { supported: false, reason: 'image-edit-unsupported', message: '当前图像来源不支持局部重绘' };
            if (!capability.supported) return { ok: false, reason: capability.reason, message: capability.message };
            const loaded = await readImage(imageId, signal);
            if (loaded?.cancelled) return loaded;
            if (!loaded || !loaded.ok) return { ok: false, reason: (loaded && loaded.reason) || 'not-found' };
            if (!loaded.editable) return { ok: false, reason: 'source-unavailable', message: '这张立绘没有保存原图，无法局部重绘。' };
            const record = loaded.record;
            const prompt = buildInpaintPrompt({ prompt: options.prompt, dna: options.dna });
            const request = inheritImageTaskLease(ready, {
                sourceDataUrl: record.workingDataUrl || record.originalDataUrl,
                maskDataUrl: options.maskDataUrl,
                prompt: prompt.positive,
                negative: prompt.negative,
                width: options.width,
                height: options.height,
                strength: options.strength,
                signal,
            });
            const result = await recoverOperation(async () => {
                const value = await backend.edit(request);
                return value?.ok && value.dataUrl ? value : { ...value, ok: false, reason: value?.reason || 'edit-failed' };
            }, { signal });
            if (result?.cancelled || result?.ok === false) return result;
            candidate = { imageId, revision: record.revision, dataUrl: result.dataUrl };
            return { ok: true, candidateDataUrl: result.dataUrl };
        })().finally(() => { inflight = null; });
        return inflight;
    }

    async function accept() {
        if (!candidate) return { ok: false, reason: 'no-candidate' };
        const c = candidate;
        const signal = controller.signal;
        const matted = await recoverOperation(() => rematte(c.dataUrl), { signal });
        if (matted?.cancelled || matted?.ok === false) return matted;
        const saved = await saveCandidate(c.imageId, c.revision, {
            workingDataUrl: c.dataUrl,
            dataUrl: matted.dataUrl,
            alphaMaskDataUrl: matted.alphaMaskDataUrl,
            matteCrop: matted.crop,
        }, signal);
        // 只有成功采用或用户主动放弃才释放候选。
        if (saved?.ok) candidate = null;
        return saved || { ok: false, reason: 'update-failed' };
    }

    function cancel() { controller.abort(); controller = new AbortController(); candidate = null; }

    // 恢复首次原图：清除 workingDataUrl 并从原图重新自动抠图。
    async function restoreOriginal(imageId) {
        const signal = controller.signal;
        const loaded = await readImage(imageId, signal);
        if (loaded?.cancelled) return loaded;
        if (!loaded || !loaded.ok) return { ok: false, reason: (loaded && loaded.reason) || 'not-found' };
        if (!loaded.editable) return { ok: false, reason: 'source-unavailable' };
        const record = loaded.record;
        const matted = await recoverOperation(() => rematte(record.originalDataUrl), { signal });
        if (matted?.cancelled || matted?.ok === false) return matted;
        const result = await saveCandidate(imageId, record.revision, {
            workingDataUrl: '',
            dataUrl: matted.dataUrl,
            alphaMaskDataUrl: matted.alphaMaskDataUrl,
            matteCrop: matted.crop,
        }, signal);
        if (result?.ok) candidate = null;
        return result;
    }

    return { preview, accept, cancel, restoreOriginal, hasCandidate: () => Boolean(candidate) };
}
