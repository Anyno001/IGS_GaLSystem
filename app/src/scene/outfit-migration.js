import { OUTFIT_RESET, isValidOutfitName, isValidOutfitWord, normalizeOutfitNote } from './character-outfits.js';
import { migrateSpriteKeys } from './sprite-key-migration.js';

const plain = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : null);

// 保留历史槽名常量；原装默认图现在写入衣装 base，不再占用平和槽。
export const MIGRATED_BASE_SLOT = '平和';

function takenOutfitWords(outfits, except) {
    const taken = new Set();
    for (const [name, entry] of Object.entries(outfits)) {
        if (name === except) continue;
        taken.add(name);
        for (const word of Array.isArray(entry && entry.words) ? entry.words : []) taken.add(word);
    }
    return taken;
}

// 与普通服装别名一样，单个别名可以包含空格；只把明确的列表符号当分隔。
export function splitMigrationWords(value) {
    const out = [];
    for (const raw of String(value || '').split(/[、,，;；]+/)) {
        const word = raw.trim();
        if (word && !out.includes(word)) out.push(word);
    }
    return out;
}

// 基础图与表情分别保存；只有完整补丁保存成功后调用方才切换配置。
export function migrateOriginalOutfits({ sceneAssets, readerSettings, rows } = {}) {
    const assets = plain(sceneAssets);
    if (!assets) return { ok: false, reason: 'no-assets', done: [], skipped: [] };
    const done = [], skipped = [];
    for (const row of Array.isArray(rows) ? rows : []) {
        const character = String(row?.character || '').trim(), name = String(row?.name || '').trim();
        if (!character) continue;
        const base = plain(assets.characters?.[character]);
        const outfits = plain(assets.characterOutfits?.[character]) || {};
        const reject = reason => skipped.push({ character, name, reason });
        if (!name) { reject('未填服装名'); continue; }
        if (!base) { reject('已不是登记角色'); continue; }
        if (!isValidOutfitName(name)) { reject('服装名无效'); continue; }
        if (Object.hasOwn(outfits, name) || takenOutfitWords(outfits).has(name)) { reject('服装名或别名已存在'); continue; }
        const filled = Object.entries(base).filter(([, url]) => typeof url === 'string' && url.trim());
        if (!filled.length) { reject('原装已迁移或没有图片'); continue; }
        const moods = Object.fromEntries(Object.entries(base).filter(([slot]) => slot !== OUTFIT_RESET));
        const words = [], taken = takenOutfitWords(outfits);
        for (const raw of Array.isArray(row.words) ? row.words : []) {
            const word = String(raw || '').trim();
            if (isValidOutfitWord(word) && word !== name && word !== OUTFIT_RESET
                && !taken.has(word) && !words.includes(word)) words.push(word);
        }
        const entry = { words, moods, legacyOriginal: 1 };
        if (typeof base[OUTFIT_RESET] === 'string' && base[OUTFIT_RESET].trim()) entry.base = base[OUTFIT_RESET].trim();
        const note = normalizeOutfitNote(row.note);
        if (note) entry.note = note;
        const prompt = String(row.prompt || '').trim();
        {
            const wardrobe = plain(assets.wardrobe) || {};
            let key = name, suffix = 2;
            while (Object.hasOwn(wardrobe, key) && String(wardrobe[key]?.prompt || '').trim() !== prompt) key = `${name} ${suffix++}`;
            entry.wardrobe = key;
            assets.wardrobe = { ...wardrobe, [key]: wardrobe[key] || { prompt } };
        }
        const mine = Object.fromEntries(Object.entries(outfits).map(([key, value]) => {
            if (!value?.legacyOriginal) return [key, value];
            const { legacyOriginal, ...rest } = value;
            return [key, rest];
        }));
        assets.characterOutfits = { ...assets.characterOutfits, [character]: { ...mine, [name]: entry } };
        assets.characters = { ...assets.characters, [character]: {} };
        if (!Object.hasOwn(assets.characterDefaultOutfits || {}, character))
            assets.characterDefaultOutfits = { ...assets.characterDefaultOutfits, [character]: { version: 1, outfitName: name, migrated: true } };
        const generated = plain(assets.generated) || {}, notes = plain(generated.expressionNotes) || {};
        if (plain(notes[character])) {
            const key = `${character}\u0001${name}`;
            const next = { ...notes, [key]: { ...notes[character], ...plain(notes[key]) } };
            delete next[character];
            assets.generated = { ...generated, expressionNotes: next };
        }
        migrateSpriteKeys(readerSettings, { character, outfit: '' }, { outfit: name });
        done.push({ character, name, moods: filled.length, cleared: filled.length, replacedCalm: false });
    }
    return { ok: true, done, skipped };
}

// 旧“设为原装”入口统一为选择默认衣装，不再搬回旧槽。
export function promoteOutfitToOriginal({ sceneAssets, character, outfit } = {}) {
    const entry = sceneAssets?.characterOutfits?.[character]?.[outfit];
    if (!entry || !isValidOutfitName(outfit)) return { ok: false, reason: 'outfit-not-found' };
    if (!String(entry.base || '').trim() && !Object.values(entry.moods || {}).some(url => typeof url === 'string' && url.trim()))
        return { ok: false, reason: 'outfit-has-no-base' };
    sceneAssets.characterDefaultOutfits = { ...sceneAssets.characterDefaultOutfits,
        [character]: { version: 1, outfitName: outfit } };
    return { ok: true, character, outfit, backup: '' };
}

// 迁移清单的一行：说明这个角色是「整套有图」还是「只有默认」，以及会搬走几张。
export function migrationRowOf(character, base) {
    const record = plain(base) || {};
    const filled = Object.entries(record).filter(([, url]) => String(url || '').trim());
    const defaults = String(record[OUTFIT_RESET] || '').trim();
    const others = filled.filter(([slot]) => slot !== OUTFIT_RESET);
    return {
        character,
        count: filled.length,
        hasSprite: filled.length > 0,
        whole: others.length > 0 && Boolean(defaults),
        stat: others.length ? `整套 ${filled.length} 张` : '仅默认',
    };
}
