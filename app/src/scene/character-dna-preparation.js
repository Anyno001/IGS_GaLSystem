import { normalizeCharacterDna, characterDnaNeedsViews, characterDnaIdentityCleared, hasLegacyCharacterIdentity, checkDnaViews, checkCharacterPersonality } from './character-dna.js';

// 旧格式继续作为参考；三景别只补缺项，不借本开关强制升级已有旧档。
export function spriteDnaPreparationState(raw) {
    const dna = normalizeCharacterDna(raw);
    const hasViews = Object.values(dna.views || {}).some(view => view.subject?.trim());
    return { needed: !hasLegacyCharacterIdentity(dna) && (!hasViews || characterDnaNeedsViews(dna)),
        cleared: characterDnaIdentityCleared(dna) };
}

// 独立建档无需借图片伪造采用证据；模型候选仍使用内置立绘的三景别校验。
export function prepareCharacterDnaSave(raw, candidate, name) {
    const fail = () => ({ ok: false, reason: 'DNA_ADOPTION_CONFLICT', error: 'DNA 候选或原资料已变化，未保存角色资料' });
    const dna = normalizeCharacterDna(raw);
    if (spriteDnaPreparationState(dna).cleared || candidate?.characterKey !== name) return fail();
    const checked = checkDnaViews(candidate.views, { complete: true });
    if (!checked.ok) return checked;
    for (const [view, saved] of Object.entries(dna.views || {})) {
        if ((saved.subject && checked.value[view]?.subject !== saved.subject)
            || ((saved.subject || saved.negative) && checked.value[view]?.negative !== saved.negative)) return fail();
    }
    const personality = checkCharacterPersonality(candidate.personality);
    if (!personality.ok) return personality;
    if (dna.personality !== undefined && candidate.personality !== undefined && dna.personality !== personality.value) return fail();
    return { ok: true, dna: { ...dna, version: 2, views: { ...dna.views, ...checked.value },
        ...(dna.personality === undefined && candidate.personality !== undefined && { personality: personality.value }),
        identityInitialized: true, identitySource: dna.identitySource || 'secondary-api' } };
}


// 只合并本次生成字段；资料编辑不取消任务，也不回写旧库。
export function mergeGeneratedCharacterDna(before, current, generated) {
    const merge = (old, live, next) => {
        if (JSON.stringify(live) === JSON.stringify(old)) return structuredClone(next);
        if (live && next && typeof live === 'object' && typeof next === 'object'
            && !Array.isArray(live) && !Array.isArray(next)) {
            const result = { ...live };
            for (const key of Object.keys(next)) {
                const value = merge(old?.[key], live[key], next[key]);
                if (value !== undefined) result[key] = value;
            }
            return result;
        }
        return structuredClone(live);
    };
    return normalizeCharacterDna(merge(normalizeCharacterDna(before), normalizeCharacterDna(current),
        normalizeCharacterDna(generated)));
}
