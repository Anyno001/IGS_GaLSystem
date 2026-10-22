// 内置一致性任务的只读来源预检；比较快照只留内存，不进入日志或模型。
import { resolveCharacterAppearance, outfitSpriteSlots } from '../../scene/character-appearance.js';
import { recoverOperation } from '../../storage/automatic-recovery.js';


const fail = (reason, characterKey = '') => ({ ok: false, reason, characterKey,
    error: `${characterKey ? `「${characterKey}」` : ''}正在恢复对应衣装的角色参考` });
const copy = value => structuredClone(value);

export function consistencyRequirement(record, characterKey) {
    if (record.outfitAnchor !== undefined) {
        const anchor = record.outfitAnchor;
        const rows = anchor?.characters?.filter(c => c.characterKey === characterKey);
        if (anchor?.version !== 1 || !Number.isFinite(anchor.offset) || rows?.length !== 1
            || typeof rows[0].requestedOutfit !== 'string') return fail('cg-outfit-anchor-invalid', characterKey);
        const row = rows[0];
        return { ok: true, requestedOutfit: row.requestedOutfit || row.inferredOutfit || '',
            requirementSource: row.requirementSource || row.source || 'anchor' };
    }
    const rows = record.outfitSnapshot?.version === 1
        ? record.outfitSnapshot.characters?.filter(c => c.characterKey === characterKey) : null;
    const original = rows?.length === 1 ? rows[0]
        : record.characterMeta?.characters?.find(c => c.characterKey === characterKey)?.outfit;
    if (!original?.name || typeof original.name !== 'string') return fail('cg-outfit-anchor-missing', characterKey);
    return { ok: true, requestedOutfit: original.name, requirementSource: 'historical-snapshot' };
}

export async function prepareConsistencyAppearances({ record, characters, assets, scope, readImage, codec, signal }) {
    const selections = [], references = [], confirmations = [];
    const states = Object.create(null), images = new Map();
    const check = () => { if (signal?.aborted) throw new Error('cancelled'); };
    for (const character of characters) {
        check();
        const requirement = consistencyRequirement(record, character.characterKey);
        if (!requirement.ok) return requirement;
        let selected;
        for (;;) {
            check();
            selected = resolveCharacterAppearance({ characterKey: character.characterKey,
                requestedOutfit: requirement.requestedOutfit, purpose: 'reader',
                sceneAssets: assets, ownerScope: JSON.stringify(scope), imageAvailability: states });
            if (!selected.ok) return { ...selected, characterKey: character.characterKey, error: fail(selected.reason, character.characterKey).error };
            const slots = outfitSpriteSlots(assets.characterOutfits?.[character.characterKey]?.[selected.effectiveOutfit]);
            const urls = [...new Set(['平和', '默认', '裸体', ...Object.keys(slots)].map(key => slots[key]).filter(Boolean))];
            const pending = urls.filter(url => !states[url]);
            if (!pending.length) break;

            for (const url of pending) {
                check();
                let image;
                try { image = await recoverOperation(async () => {
                    const value = await readImage(url, { signal });
                    if (value && !value.dataUrl) throw new Error('reference-read-pending');
                    return value;
                }, { signal, observe: async () => {
                    const value = await readImage(url, { signal });
                    return { completed: value === null || Boolean(value?.dataUrl), value };
                } }); }
                catch { states[url] = { status: 'read-error' }; continue; }
                check();
                if (!image) { states[url] = { status: 'missing' }; continue; }
                if (!image.dataUrl || (image.type !== undefined && image.type !== 'sprite')) {
                    states[url] = { status: 'read-error' }; continue;
                }
                try {
                    const pixels = await codec.decodeImage(image.dataUrl, { signal });
                    check();
                    if (!pixels?.width || !pixels?.height || pixels.data?.length !== pixels.width * pixels.height * 4)
                        throw new Error('invalid-pixels');
                    images.set(url, pixels);
                    states[url] = { status: 'available', revision: image.revisionToken ?? image.revision ?? image.updatedAt };
                    break;
                } catch { check(); states[url] = { status: 'decode-error' }; }
            }
            if (pending.some(url => states[url]?.status === 'available')) break;
        }
        selected = resolveCharacterAppearance({ characterKey: character.characterKey,
            requestedOutfit: requirement.requestedOutfit, purpose: 'consistency', sceneAssets: assets,
            ownerScope: JSON.stringify(scope), imageAvailability: states });
        if (!selected.ok) return { ...selected, characterKey: character.characterKey, error: fail(selected.reason, character.characterKey).error };
        const reference = selected.referenceImage;
        if (!reference?.ok || !reference.verified || !images.has(reference.url))
            return fail('cg-reference-unverified', character.characterKey);
        const row = { characterKey: character.characterKey, requestedOutfit: requirement.requestedOutfit,
            effectiveOutfit: selected.effectiveOutfit, requirementSource: requirement.requirementSource,
            selectionSource: selected.selectionSource, fallbackReason: selected.fallbackReason,
            reference: { url: reference.url, slot: reference.slot,
                ...(reference.revision !== undefined && { revision: reference.revision }) },
            outfit: { name: selected.effectiveOutfit, description: selected.outfitDescription } };
        selections.push(row);
        references.push(images.get(reference.url));
        if (selected.confirmationRequired) confirmations.push({ characterKey: row.characterKey,
            requestedOutfit: row.requestedOutfit, effectiveOutfit: row.effectiveOutfit });
    }
    return { ok: true, selections, references, confirmations,
        scope: copy(scope) };
}

// 追溯仅保存受控标识；URL 凭据、图片载荷与比较租约不落盘。
export function consistencyAppearanceAudit(appearance, characterKey, confirmed) {
    const selected = appearance.selections.find(row => row.characterKey === characterKey);
    if (!selected) throw new Error('cg-reference-unverified');
    const url = selected.reference.url;
    let h1 = 0x811c9dc5, h2 = 0x9e3779b9;
    for (let i = 0; i < url.length; i++) {
        h1 = Math.imul(h1 ^ url.charCodeAt(i), 16777619);
        h2 = Math.imul(h2 ^ url.charCodeAt(i), 2246822507);
    }
    const reference = { slot: selected.reference.slot,
        sourceId: `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`,
        ...(url.startsWith('igs-gen:') && { url }),
        ...(selected.reference.revision !== undefined && { revision: selected.reference.revision }) };
    const owner = appearance.scope?.owners?.find(row => row.characterKey === characterKey);
    return { version: 1, requestedOutfit: selected.requestedOutfit,
        effectiveOutfit: selected.effectiveOutfit, requirementSource: selected.requirementSource,
        selectionSource: selected.selectionSource, fallbackReason: selected.fallbackReason,
        confirmed: appearance.confirmations.some(row => row.characterKey === characterKey) && confirmed === true,
        reference,
        ...(typeof appearance.scope?.scopeKey === 'string' && { scopeKey: appearance.scope.scopeKey }),
        ...(typeof owner?.ownerKey === 'string' && { ownerKey: owner.ownerKey }) };
}
