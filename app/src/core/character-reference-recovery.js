import { assetOwnerKey, effectiveSceneAssets, ensureCardLibrary, resolveAssetScope } from '../scene/asset-scope.js';
import { consistencyRequirement } from '../generated-images/illustration/cg-consistency-appearance.js';
import { readDefaultOutfit, setOutfitSprite } from '../scene/character-appearance.js';
import { resolveWardrobePrompt } from '../scene/character-outfits.js';
import { prepareOutfitDnaSave } from '../scene/outfit-identity.js';
import { recoverOperation } from '../storage/automatic-recovery.js';

const fields = ['characters', 'characterDna', 'characterOutfits'];

// 一致性任务缺人物参考时，沿同一角色、同一衣装补图，再接回原任务。
export function createCharacterReferenceRecovery({ readAssets, readContext, saveAssets, getService }) {
    return async ({ record, characters, signal, shouldStart, failure }) => {
        const scope = resolveAssetScope(readContext()).key;
        const live = () => !signal?.aborted && (!shouldStart || shouldStart())
            && resolveAssetScope(readContext()).key === scope;
        const recover = (execute, repeatable) => recoverOperation(execute, { signal, isActive: live, repeatable });
        const service = getService();
        const selected = failure?.characterKey
            ? characters.filter(row => row.characterKey === failure.characterKey) : characters;
        const keys = selected.map(row => row.characterKey);
        const initialAssets = effectiveSceneAssets(readAssets(), scope);
        if (typeof service.prepareExternalSpriteDna?.batch === 'function') {
            const prepared = await recover(() => service.prepareExternalSpriteDna.batch({
                characters: keys.map(name => ({ name, dna: initialAssets.characterDna?.[name] })),
                requireDna: true, signal, shouldStart: live,
            }));
            if (prepared?.cancelled || prepared?.ok === false) return prepared;
        }
        const results = await Promise.all(selected.map(async character => {
            const name = character.characterKey;
            const assets = effectiveSceneAssets(readAssets(), scope);
            const requirement = consistencyRequirement(record, name);
            const outfitName = requirement.requestedOutfit || readDefaultOutfit(assets, name).outfitName || '初始衣装';
            const entry = assets.characterOutfits?.[name]?.[outfitName];
            const historical = record.outfitSnapshot?.characters?.find(row => row.characterKey === name && row.name === outfitName)
                || record.characterMeta?.characters?.find(row => row.characterKey === name)?.outfit;
            const prompt = resolveWardrobePrompt(assets.wardrobe, entry, outfitName)?.prompt
                || (historical?.name === outfitName ? historical.description : '') || '';
            const save = buildPatch => recover(() => {
                const root = structuredClone(readAssets());
                const effective = effectiveSceneAssets(root, scope);
                const owner = assetOwnerKey(root, scope, fields, name);
                const target = owner ? ensureCardLibrary(root, owner) : root;
                const patch = buildPatch(effective, target);
                if (patch?.ok === false) return patch;
                Object.assign(target, patch);
                return saveAssets(root);
            }, 'save');
            const result = await service.generateExpressionImage({ name, mood: '平和',
                dna: assets.characterDna?.[name], outfit: { name: outfitName, prompt },
                signal, shouldStart: live,
                onOutfitDna: clothing => save((effective, target) => {
                    const planned = prepareOutfitDnaSave(effective, name, clothing.name, clothing.description,
                        { descriptionHalfBody: clothing.descriptionHalfBody });
                    if (!planned.ok || !planned.patch.characterOutfits) return planned.ok ? {} : planned;
                    return { characterOutfits: { ...target.characterOutfits,
                        [name]: planned.patch.characterOutfits[name] },
                        ...(planned.patch.wardrobe && { wardrobe: { ...target.wardrobe,
                            ...Object.fromEntries(Object.entries(planned.patch.wardrobe)
                                .filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(effective.wardrobe?.[key]))) } }) };
                }),
            });
            if (result?.cancelled) return result;
            const image = result?.items?.find(row => row.ok && row.imageId) || (result?.imageId ? result : null);
            if (!image) return { ok: false, reason: 'reference-generation-pending' };
            return save((effective, target) => {
                const outfits = { ...target.characterOutfits?.[name] };
                outfits[outfitName] = setOutfitSprite(outfits[outfitName] || entry || { words: [], moods: {} },
                    '平和', `igs-gen:${image.imageId}`);
                return { characterOutfits: { ...target.characterOutfits, [name]: outfits },
                    ...(!readDefaultOutfit(effective, name).ok && { characterDefaultOutfits: {
                        ...target.characterDefaultOutfits, [name]: { version: 1, outfitName },
                    } }) };
            });
        }));
        return results.find(row => row?.ok === false) || { ok: true };
    };
}
