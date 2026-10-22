import { migrateOriginalOutfits } from './outfit-migration.js';
import { migrateSpriteKeys } from './sprite-key-migration.js';

const plain = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const safe = key => key && !['__proto__', 'prototype', 'constructor'].includes(key);
const filled = slots => Object.values(plain(slots)).some(url => typeof url === 'string' && url.trim());

function uniqueName(library, character, preferred) {
    const taken = new Set([...Object.keys(plain(library.wardrobe)),
        ...Object.entries(plain(library.characterOutfits?.[character]))
            .flatMap(([name, entry]) => [name, ...(Array.isArray(entry?.words) ? entry.words : [])])]);
    let name = preferred, suffix = 2;
    while (taken.has(name)) name = `${preferred} ${suffix++}`;
    return name;
}

function migrateLibrary(input, plans) {
    let library = input;
    // 修正旧测试包自动生成的通用名字；用户另行命名或绑定的衣柜保持原值。
    for (const [character, outfits] of Object.entries(plain(input.characterOutfits))) {
        if (!safe(character)) continue;
        for (const [oldName, entry] of Object.entries(plain(outfits))) {
            if (entry?.legacyOriginal !== 1 || !/^初始衣装(?: \d+)?$/.test(oldName)) continue;
            const name = uniqueName(library, character, `${character}·初始衣装`);
            const oldKey = String(entry.wardrobe || oldName);
            const wardrobe = plain(library.wardrobe);
            const renameWardrobe = /^初始衣装(?: \d+)?$/.test(oldKey);
            const source = wardrobe[oldKey];
            const nextEntry = { ...entry,
                words: [...new Set([...(Array.isArray(entry.words) ? entry.words : []), oldName])],
                ...(renameWardrobe && { wardrobe: name }) };
            library = { ...library, characterOutfits: { ...library.characterOutfits,
                [character]: Object.fromEntries(Object.entries(library.characterOutfits[character])
                    .map(([key, value]) => key === oldName ? [name, nextEntry] : [key, value])) },
                ...(renameWardrobe && { wardrobe: { ...wardrobe,
                    [name]: typeof source === 'string' ? { prompt: source } : { ...plain(source) } } }) };
            const selected = library.characterDefaultOutfits?.[character];
            if (selected?.version === 1 && selected.outfitName === oldName)
                library = { ...library, characterDefaultOutfits: { ...library.characterDefaultOutfits,
                    [character]: { ...selected, outfitName: name } } };
            plans.push({ character, from: oldName, outfit: name });
        }
    }
    const names = new Set([...Object.keys(plain(input.characters)), ...Object.keys(plain(input.generated?.characters))]);
    for (const character of names) {
        if (!safe(character)) continue;
        const original = plain(library.characters?.[character]);
        const generated = plain(library.generated?.characters?.[character]);
        if (!filled(original) && !filled(generated)) continue;
        library = { ...library, characters: { ...library.characters,
            [character]: Object.fromEntries([...new Set([...Object.keys(generated), ...Object.keys(original)])]
                .map(slot => [slot, typeof original[slot] === 'string' && original[slot].trim() ? original[slot] : generated[slot] ?? original[slot]])) } };
        const outfit = uniqueName(library, character, `${character}·初始衣装`);
        const migrated = migrateOriginalOutfits({ sceneAssets: library, rows: [{ character, name: outfit,
            prompt: library.characterDna?.[character]?.defaultAppearance || '' }] });
        if (!migrated.done.length) continue;
        plans.push({ character, from: '', outfit });
        const conflicts = Object.fromEntries(Object.entries(generated).filter(([mood, url]) =>
            typeof url === 'string' && url.trim() && typeof original[mood] === 'string'
            && original[mood].trim() && original[mood] !== url));
        if (filled(conflicts)) {
            const extra = uniqueName(library, character, '旧生成立绘');
            const entry = { words: [], moods: Object.fromEntries(Object.entries(conflicts).filter(([slot]) => slot !== '默认')),
                ...(conflicts.默认 && { base: conflicts.默认 }) };
            library.characterOutfits = { ...library.characterOutfits,
                [character]: { ...library.characterOutfits[character], [extra]: entry } };
        }
        const gen = { ...library.generated }, remaining = { ...gen.characters };
        delete remaining[character];
        const aliases = { ...library.characterAliases };
        aliases[character] = [...new Set([...(Array.isArray(aliases[character]) ? aliases[character] : []),
            ...(Array.isArray(gen.characterAliases?.[character]) ? gen.characterAliases[character] : [])])];
        const oldAliases = { ...gen.characterAliases };
        delete oldAliases[character];
        library = { ...library, characterAliases: aliases,
            generated: { ...gen, characters: remaining, characterAliases: oldAliases } };
    }
    // 文件中的旧续画资料可能晚于设置恢复；归到最初迁入的衣装，不跟随用户后来更换的默认。
    for (const [sourceKey, notes] of Object.entries(plain(library.generated?.expressionNotes))) {
        const [character, oldOutfit = ''] = sourceKey.split('\u0001');
        if (!safe(character) || (oldOutfit && !/^初始衣装(?: \d+)?$/.test(oldOutfit))) continue;
        const migrated = Object.entries(plain(library.characterOutfits?.[character])).find(([, entry]) =>
            entry?.legacyOriginal === 1 && (!oldOutfit || entry.words?.includes(oldOutfit)));
        if (!migrated) continue;
        const key = `${character}\u0001${migrated[0]}`;
        const all = { ...library.generated.expressionNotes,
            [key]: { ...plain(notes), ...plain(library.generated.expressionNotes[key]) } };
        delete all[sourceKey];
        library = { ...library, generated: { ...library.generated, expressionNotes: all } };
    }
    return library;
}

export function migrateSpriteSystem(sceneAssets, readerSettingsByMode = {}) {
    if (!sceneAssets || typeof sceneAssets !== 'object' || Array.isArray(sceneAssets))
        return { changed: false, sceneAssets, readerSettingsByMode };
    const plans = [];
    let next = migrateLibrary(sceneAssets, plans);
    let cards = sceneAssets.cards;
    for (const [scope, card] of Object.entries(plain(cards))) {
        if (!safe(scope) || !card || typeof card !== 'object' || Array.isArray(card)) continue;
        const migrated = migrateLibrary(card, plans);
        if (migrated !== card) cards = { ...cards, [scope]: migrated };
    }
    if (cards !== sceneAssets.cards) next = { ...next, cards };
    if (next === sceneAssets) return { changed: false, sceneAssets, readerSettingsByMode };
    let settings = readerSettingsByMode;
    if (plans.length) {
        settings = Object.fromEntries(Object.entries(readerSettingsByMode).map(([mode, value]) => [mode,
            { ...value, ...(value?.spriteLayouts && { spriteLayouts: { ...value.spriteLayouts } }),
                ...(value?.spriteHeads && { spriteHeads: { ...value.spriteHeads } }) }]));
        for (const value of Object.values(settings)) {
            for (const { character, from, outfit } of plans)
                migrateSpriteKeys(value, { character, outfit: from }, { outfit }, { copy: true });
            for (const { character, from } of plans)
                migrateSpriteKeys(value, { character, outfit: from }, null);
        }
    }
    return { changed: true, sceneAssets: next, readerSettingsByMode: settings };
}
