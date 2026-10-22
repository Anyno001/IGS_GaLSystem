import { assetOwnerKey, effectiveSceneAssets, resolveAssetScope, relocateLegacyCard } from '../scene/asset-scope.js';
import { buildCharacterContext } from '../scene/character-identity.js';
import { mergeGeneratedCharacterDna } from '../scene/character-dna-preparation.js';

const fields = ['characters', 'characterDna', 'characterOutfits', 'characterAliases', 'characterDefaultOutfits', 'generated.characters'];
const stale = () => ({ ok: false, reason: 'stale-target', stopGeneration: true, error: '角色或角色卡已变化，未继续生成立绘' });

// 自动建档按角色原归属保存；只写本次 DNA，不回写生图服务拿到的合并视图。
export function createCharacterDnaStore({ readAssets, readContext, saveAssets }) {
    function snapshot(requested, source = readAssets() || {}) {
        const scope = resolveAssetScope(readContext());
        const root = { ...source, cards: { ...source.cards } };
        relocateLegacyCard(root, scope.key, scope.legacyKey);
        const effective = effectiveSceneAssets(root, scope.key);
        const character = buildCharacterContext([requested], effective)[0];
        if (!character) return null;
        const name = character.characterKey;
        const owner = assetOwnerKey(root, scope.key, fields, name);
        const library = owner ? root.cards?.[owner] || {} : root;
        return { root, library, name, owner, scope: scope.key, dna: character.dna };
    }
    return { capture(requested) {
        const initial = snapshot(requested);
        if (!initial) return null;
        const isCurrent = () => resolveAssetScope(readContext()).key === initial.scope;
        return { key: JSON.stringify([initial.scope, initial.owner, initial.name]), name: initial.name,
            scope: initial.scope, owner: initial.owner, dna: initial.dna, isCurrent,
            save(dna) {
                if (!isCurrent()) return stale();
                const live = snapshot(requested);
                const mergedDna = mergeGeneratedCharacterDna(initial.dna, live.library.characterDna?.[live.name], dna);
                const library = { ...live.library, characterDna: { ...live.library.characterDna, [live.name]: mergedDna } };
                const next = live.owner ? { ...live.root, cards: { ...live.root.cards, [live.owner]: library } } : library;
                let saved;
                try { saved = saveAssets(next); } catch { saved = { ok: false }; }
                if (saved?.ok !== true) return { ok: false, reason: 'dna-save-failed', error: '角色 DNA 保存失败，未发起立绘生成' };
                return isCurrent() ? { ok: true, dna: mergedDna } : stale();
            } };
    } };
}
