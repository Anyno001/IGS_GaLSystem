import test from 'node:test';
import assert from 'node:assert/strict';
import { migrateOriginalOutfits, promoteOutfitToOriginal, migrationRowOf, splitMigrationWords } from '../src/scene/outfit-migration.js';
import { handleOutfitAction } from '../src/visual/igs-ui/settings-outfit-actions.js';
import { renderCharacterAssetList } from '../src/visual/igs-ui/settings-fields.js';
import { renderMigrateEntry, renderCharacterSlotTabs } from '../src/visual/igs-ui/settings-outfit-fields.js';

function createCtx(assets = {}) {
    const alerts = [];
    const state = {
        activeSettings: {
            tab: 'scene',
            asyncState: {},
            draft: {
                bridge: {
                    sceneAssets: {
                        characters: {},
                        characterAliases: {},
                        characterOutfits: {},
                        wardrobe: {},
                        moodGroups: [{ label: '平和', words: ['平和'] }],
                        generated: { characters: {}, expressionNotes: {} },
                        ...assets,
                    },
                },
                readerSettings: { spriteLayouts: {}, spriteHeads: {} },
            },
        },
    };
    let persisted = 0;
    const ctx = {
        state,
        settingsState: state.activeSettings,
        options: { global: { alert: (m) => alerts.push(m) } },
        persistSettingsDraft: () => { persisted++; return { ok: true }; },
        rerenderSettings: () => ({ ok: true, rerendered: true }),
    };
    return { ctx, state, alerts, persisted: () => persisted, sa: () => state.activeSettings.draft.bridge.sceneAssets, rs: () => state.activeSettings.draft.readerSettings };
}

test('gate:outfits:migration-moves-default-into-calm-and-clears-original', () => {
    const assets = { characters: { 小林海斗: { 默认: 'igs-gen:base', 喜悦: 'igs-gen:joy', 害羞: 'igs-gen:shy' } } };
    const rs = {
        spriteLayouts: { 'pc::小林海斗': { posX: 1 }, 'pc::小林海斗::默认': { posX: 9 }, 'pc::小林海斗::喜悦': { posX: 2 }, 'pc::小林': { posX: 8 } },
        spriteHeads: { '小林海斗::喜悦': { x: 1 }, '小林海斗::默认': { x: 9 }, 小林: { x: 8 } },
    };
    const result = migrateOriginalOutfits({
        sceneAssets: assets,
        readerSettings: rs,
        rows: [{ character: '小林海斗', name: '校服', words: ['制服', '校服'], note: '上学时穿' }],
    });
    assert.equal(result.ok, true);
    assert.deepEqual(result.skipped, []);
    // 默认那张进「平和」（这套衣服缺图时本来就兜底到它），其余槽同名直搬。
    assert.deepEqual(assets.characterOutfits.小林海斗.校服.moods, { 平和: 'igs-gen:base', 喜悦: 'igs-gen:joy', 害羞: 'igs-gen:shy' });
    // 等于自己服装名的别名是多余的（服装名本身就能解析），不重复收。
    assert.deepEqual(assets.characterOutfits.小林海斗.校服.words, ['制服']);
    assert.equal(assets.characterOutfits.小林海斗.校服.note, '上学时穿');
    // 服装显式引用同名衣柜条目，之后改名不会各走各的。
    assert.equal(assets.characterOutfits.小林海斗.校服.wardrobe, '校服');
    assert.deepEqual(assets.wardrobe.校服, { prompt: '' });
    // 原装清空，角色本身留着。
    assert.deepEqual(assets.characters.小林海斗, {});
    // 「调整立绘」的位置与头部标定整体搬进这套服装；默认那张的槽名同时改成平和。
    assert.deepEqual(rs.spriteLayouts['pc::小林海斗|校服'], { posX: 1 });
    assert.deepEqual(rs.spriteLayouts['pc::小林海斗|校服::平和'], { posX: 9 });
    assert.deepEqual(rs.spriteLayouts['pc::小林海斗|校服::喜悦'], { posX: 2 });
    assert.deepEqual(rs.spriteHeads['小林海斗|校服::平和'], { x: 9 });
    assert.deepEqual(rs.spriteHeads['小林海斗|校服::喜悦'], { x: 1 });
    // 只动这个角色：同前缀的别人和别的模式都不受影响。
    assert.deepEqual(rs.spriteLayouts['pc::小林'], { posX: 8 });
    assert.deepEqual(rs.spriteHeads.小林, { x: 8 });
    // 原装身份（恰好是「模式::小林海斗」那几个）已清空，不留孤儿。
    assert.ok(!Object.keys(rs.spriteLayouts).some((key) => /::小林海斗(::|$)/.test(key)));
    assert.ok(!Object.keys(rs.spriteHeads).some((key) => /^小林海斗(::|$)/.test(key)));
});

test('gate:outfits:migration-keeps-existing-calm-image-over-default', () => {
    const assets = { characters: { 雪乃: { 默认: 'igs-gen:base', 平和: 'igs-gen:own-calml' } } };
    const result = migrateOriginalOutfits({ sceneAssets: assets, readerSettings: {}, rows: [{ character: '雪乃', name: '常服' }] });
    assert.equal(result.done[0].replacedCalm, true);
    assert.deepEqual(assets.characterOutfits.雪乃.常服.moods, { 平和: 'igs-gen:own-calml' });
    assert.deepEqual(assets.characters.雪乃, {});
});

test('gate:outfits:migration-preserves-calm-only-old-original', () => {
    const assets = { characters: { 雪乃: { 平和: 'igs-gen:calm' } } };
    const rs = { spriteLayouts: { 'pc::雪乃::平和': { posX: 5 } } };
    const result = migrateOriginalOutfits({ sceneAssets: assets, readerSettings: rs, rows: [{ character: '雪乃', name: '旧衣' }] });
    assert.equal(result.done.length, 1);
    assert.deepEqual(assets.characterOutfits.雪乃.旧衣.moods, { 平和: 'igs-gen:calm' });
    assert.deepEqual(rs.spriteLayouts['pc::雪乃|旧衣::平和'], { posX: 5 });
});

test('gate:outfits:migration-only-default-still-creates-outfit-for-aliases-and-note', () => {
    const assets = { characters: { 雪乃: { 默认: 'igs-gen:base' } } };
    const result = migrateOriginalOutfits({ sceneAssets: assets, readerSettings: {}, rows: [{ character: '雪乃', name: '玩偶装', words: ['睡衣', '玩偶装'], note: '睡觉时' }] });
    // 只有默认也必须建服装，否则别名和说明没有落点。
    assert.deepEqual(assets.characterOutfits.雪乃.玩偶装.moods, { 平和: 'igs-gen:base' });
    // 和服装名一样的别名多余（服装名本身就能解析），丢掉。
    assert.deepEqual(assets.characterOutfits.雪乃.玩偶装.words, ['睡衣']);
    assert.equal(assets.characterOutfits.雪乃.玩偶装.note, '睡觉时');
    assert.equal(result.done[0].replacedCalm, false);
});

test('gate:outfits:migration-rejects-reserved-and-taken-names-and-lone-word-collisions', () => {
    const assets = {
        characters: { 小林海斗: { 默认: 'igs-gen:base' }, 雪乃: { 默认: 'igs-gen:b2' } },
        characterOutfits: { 小林海斗: { 校服: { words: ['制服'], moods: {} } } },
        wardrobe: { 睡衣: { prompt: '已有的词' } },
    };
    const result = migrateOriginalOutfits({
        sceneAssets: assets,
        readerSettings: {},
        rows: [
            { character: '小林海斗', name: '默认' },
            { character: '小林海斗', name: '校服' },
            { character: '小林海斗', name: '  ' },
            { character: '雪乃', name: '睡衣', words: ['制服', '玩偶装'] },
        ],
    });
    assert.deepEqual(result.skipped.map((item) => item.character), ['小林海斗', '小林海斗', '小林海斗']);
    // 词池互斥只在本角色内算：「制服」是别人名下服装的词，本角色可以照用。
    assert.deepEqual(assets.characterOutfits.雪乃.睡衣.words, ['制服', '玩偶装']);
    // 同名衣柜条目已存在就复用，不是另建一条。
    assert.equal(assets.wardrobe.睡衣.prompt, '已有的词');
});

test('gate:outfits:migration-moves-expression-notes-without-dropping-newer-ones', () => {
    const assets = {
        characters: { 小林海斗: { 默认: 'igs-gen:base' } },
        generated: {
            characters: {},
            // 原装那边与目标服装那边都有注记时，新写的不能丢。
            expressionNotes: { 小林海斗: { 喜悦: { caption: 'base' } }, '小林海斗\u0001校服': { 害羞: { caption: 'outfit' } } },
        },
    };
    migrateOriginalOutfits({ sceneAssets: assets, readerSettings: {}, rows: [{ character: '小林海斗', name: '校服' }] });
    assert.deepEqual(assets.generated.expressionNotes['小林海斗\u0001校服'], { 害羞: { caption: 'outfit' }, 喜悦: { caption: 'base' } });
    assert.ok(!Object.prototype.hasOwnProperty.call(assets.generated.expressionNotes, '小林海斗'));
});

test('gate:outfits:migration-row-stats-distinguish-whole-from-default-only', () => {
    assert.equal(migrationRowOf('a', { 默认: 'x' }).stat, '仅默认');
    assert.equal(migrationRowOf('b', { 默认: 'x', 喜悦: 'y' }).stat, '整套 2 张');
    assert.equal(migrationRowOf('c', { 喜悦: 'y' }).hasSprite, false);
    assert.deepEqual(splitMigrationWords('睡衣、家居服, 玩偶装、睡衣'), ['睡衣', '家居服', '玩偶装']);
    assert.deepEqual(splitMigrationWords('旅行 风衣、家居服'), ['旅行 风衣', '家居服']);
});

test('gate:outfits:migration-character-menu-seeds-only-selected-character-and-applies', async () => {
    const t = createCtx({ characters: { 小林海斗: { 默认: 'igs-gen:base' }, 雪乃: { 默认: 'igs-gen:b2', 喜悦: 'igs-gen:y' } } });
    const html = renderCharacterAssetList(t.sa().characters);
    assert.match(html, /data-action="scene-migrate-outfit:%E9%9B%AA%E4%B9%83"/);
    assert.equal(renderMigrateEntry(undefined), '');
    const requested = [];
    t.ctx.options.generatedAssets = { getImagePrompt: async (id) => { requested.push(id); return { positive: '原装提示词' }; } };
    await handleOutfitAction('scene-migrate-outfit:' + encodeURIComponent('雪乃'), t.ctx);
    const rows = t.ctx.state.activeSettings.asyncState.migrateRows;
    assert.deepEqual(rows.map((row) => row.character), ['雪乃']);
    assert.deepEqual(rows.map((row) => row.name), ['雪乃原装']);
    assert.equal(t.persisted(), 0);
    rows[0].name = '玩偶装';
    rows[0].words = ['旅行 风衣'];
    const done = await handleOutfitAction('scene-migrate-outfit-apply', t.ctx);
    assert.equal(done.ok, true);
    assert.deepEqual(requested, ['b2']);
    assert.deepEqual(t.sa().characters.雪乃, {});
    assert.deepEqual(t.sa().characters.小林海斗, { 默认: 'igs-gen:base' });
    assert.equal(t.sa().characterOutfits.雪乃.玩偶装.wardrobe, '玩偶装');
    assert.deepEqual(t.sa().characterOutfits.雪乃.玩偶装.words, ['旅行 风衣']);
    assert.equal(t.sa().wardrobe.玩偶装.prompt, '原装提示词');
    assert.equal(t.persisted(), 1);
    assert.equal(t.ctx.state.activeSettings.asyncState.migrateRows, undefined);
});

test('gate:outfits:promote-to-original-keeps-old-original-as-outfit-and-isolates-keys', () => {
    const assets = {
        characters: { 雪乃: { 默认: 'base', 喜悦: 'base-joy' }, 雪: { 默认: 'other' } },
        characterOutfits: { 雪乃: { 校服: { words: ['制服'], moods: { 平和: 'uniform', 喜悦: 'uniform-joy' }, wardrobe: '校服' }, 睡衣: { words: [], moods: {} } } },
        generated: { expressionNotes: { 雪乃: { 喜悦: { caption: 'old' } }, '雪乃\u0001校服': { 喜悦: { caption: 'uniform' } } } },
    };
    const reader = { spriteLayouts: { 'pc::雪乃': { posX: 1 }, 'pc::雪乃::默认': { posX: 2 }, 'pc::雪乃|校服': { posX: 3 }, 'pc::雪乃|校服::平和': { posX: 4 }, 'pc::雪': { posX: 5 } }, spriteHeads: { '雪乃::默认': { x: 1 }, '雪乃|校服::平和': { x: 2 } } };
    const result = promoteOutfitToOriginal({ sceneAssets: assets, readerSettings: reader, character: '雪乃', outfit: '校服', oldOriginal: 'migrate' });
    assert.equal(result.ok, true);
    assert.deepEqual(assets.characters.雪乃, { 默认: 'uniform', 喜悦: 'uniform-joy' });
    assert.deepEqual(assets.characterOutfits.雪乃.原装备份.moods, { 平和: 'base', 喜悦: 'base-joy' });
    assert.equal(assets.characterOutfits.雪乃.校服, undefined);
    assert.equal(assets.characterOutfits.雪乃.睡衣.moods && Object.keys(assets.characterOutfits.雪乃.睡衣.moods).length, 0);
    assert.deepEqual(assets.characters.雪, { 默认: 'other' });
    assert.deepEqual(assets.generated.expressionNotes.雪乃, { 喜悦: { caption: 'uniform' } });
    assert.deepEqual(assets.generated.expressionNotes['雪乃\u0001原装备份'], { 喜悦: { caption: 'old' } });
    assert.deepEqual(reader.spriteLayouts['pc::雪乃'], { posX: 3 });
    assert.deepEqual(reader.spriteLayouts['pc::雪乃::默认'], { posX: 4 });
    assert.deepEqual(reader.spriteLayouts['pc::雪乃|原装备份'], { posX: 1 });
    assert.deepEqual(reader.spriteLayouts['pc::雪'], { posX: 5 });
    assert.deepEqual(reader.spriteHeads['雪乃|原装备份::平和'], { x: 1 });
    assert.deepEqual(reader.spriteHeads['雪乃::默认'], { x: 2 });
});
test('gate:outfits:promote-to-original-discard-removes-old-images-and-keys-without-touching-other-outfits', () => {
    const assets = { characters: { 小林: { 默认: 'old' }, 小林海斗: { 默认: 'untouched' } }, characterOutfits: { 小林: { 泳装: { words: ['泳衣'], moods: { 平和: 'new' } }, 睡衣: { moods: { 平和: 'sleep' } } } } };
    const reader = { spriteLayouts: { 'pc::小林::默认': { posX: 1 }, 'pc::小林|泳装::平和': { posX: 2 }, 'pc::小林海斗::默认': { posX: 3 } }, spriteHeads: {} };
    const rejected = promoteOutfitToOriginal({ sceneAssets: assets, readerSettings: reader, character: '小林', outfit: '泳装' });
    assert.equal(rejected.ok, false, '旧原装处理方式必须明确选择');
    const result = promoteOutfitToOriginal({ sceneAssets: assets, readerSettings: reader, character: '小林', outfit: '泳装', oldOriginal: 'discard' });
    assert.equal(result.ok, true);
    assert.deepEqual(assets.characters.小林, { 默认: 'new' });
    assert.equal(assets.characterOutfits.小林.泳装, undefined);
    assert.deepEqual(assets.characterOutfits.小林.睡衣.moods, { 平和: 'sleep' });
    assert.equal(reader.spriteLayouts['pc::小林::默认'].posX, 2);
    assert.deepEqual(reader.spriteLayouts['pc::小林海斗::默认'], { posX: 3 });
});

test('gate:outfits:promote-menu-action-migrates-and-persists-only-selected-character', async () => {
    const t = createCtx({
        characters: { 小林: { 默认: 'old' }, 小林海斗: { 默认: 'other' } },
        characterOutfits: { 小林: {
            '夏:装': { words: ['夏装'], moods: { 平和: 'new', 喜悦: 'new-joy' } },
            睡衣: { words: [], moods: { 平和: 'sleep' } },
        } },
        generated: { expressionNotes: { 小林: { 默认: { caption: 'old' } }, '小林\u0001夏:装': { 平和: { caption: 'new' } } } },
    });
    t.rs().spriteLayouts = { 'pc::小林::默认': { posX: 1 }, 'pc::小林|夏:装::平和': { posX: 2 }, 'pc::小林海斗::默认': { posX: 3 } };
    const menu = renderCharacterSlotTabs({ charName: '小林', activeOutfit: '夏:装', outfits: t.sa().characterOutfits.小林, baseMoods: [], baseListHtml: '', sceneAssets: t.sa(), icons: {}, expressionNotes: {}, resolveUrl: (url) => url });
    assert.match(menu, /data-action="scene-promote-outfit:%E5%B0%8F%E6%9E%97:%E5%A4%8F%3A%E8%A3%85"/);
    const prompts = [];
    t.ctx.dialogs = {
        choose: async (...args) => { assert.deepEqual(args[1].map((choice) => choice.value), ['migrate', 'discard']); return 'migrate'; },
        prompt: async () => { prompts.push('asked'); return '旧衣'; },
        alert: (message) => t.alerts.push(message),
    };
    t.ctx.settingsState.asyncState.outfitTabs = { 小林: '夏:装', 小林海斗: '校服' };
    const result = await handleOutfitAction('scene-promote-outfit:' + encodeURIComponent('小林') + ':' + encodeURIComponent('夏:装'), t.ctx);
    assert.equal(result.ok, true);
    assert.equal(prompts.length, 1);
    assert.equal(t.persisted(), 1);
    assert.deepEqual(t.sa().characters.小林, { 喜悦: 'new-joy', 默认: 'new' });
    assert.deepEqual(t.sa().characterOutfits.小林.旧衣.moods, { 平和: 'old' });
    assert.deepEqual(t.sa().characterOutfits.小林.睡衣.moods, { 平和: 'sleep' });
    assert.equal(t.sa().characterOutfits.小林['夏:装'], undefined);
    assert.deepEqual(t.sa().characters.小林海斗, { 默认: 'other' });
    assert.deepEqual(t.sa().generated.expressionNotes.小林, { 默认: { caption: 'new' } });
    assert.deepEqual(t.sa().generated.expressionNotes['小林\u0001旧衣'], { 默认: { caption: 'old' } });
    assert.deepEqual(t.rs().spriteLayouts['pc::小林::默认'], { posX: 2 });
    assert.deepEqual(t.rs().spriteLayouts['pc::小林|旧衣::平和'], { posX: 1 });
    assert.deepEqual(t.rs().spriteLayouts['pc::小林海斗::默认'], { posX: 3 });
    assert.deepEqual(t.ctx.settingsState.asyncState.outfitTabs, { 小林海斗: '校服' });
});

test('gate:outfits:promote-discard-cancel-conflict-and-name-collision-never-silently-lose-images', async () => {
    const t = createCtx({ characters: { 雪乃: { 默认: 'old', 平和: 'old-calm' } }, characterOutfits: { 雪乃: { 校服: { moods: { 平和: 'new' } }, 睡衣: { words: ['旧衣'], moods: {} } } } });
    const action = 'scene-promote-outfit:' + encodeURIComponent('雪乃') + ':' + encodeURIComponent('校服');
    const original = JSON.stringify(t.sa());
    let choice = null;
    let name = '旧衣';
    t.ctx.dialogs = { choose: async () => choice, prompt: async () => name, alert: (message) => t.alerts.push(message) };
    await handleOutfitAction(action, t.ctx);
    assert.equal(JSON.stringify(t.sa()), original);
    choice = 'migrate';
    await handleOutfitAction(action, t.ctx);
    assert.match(t.alerts.at(-1), /「默认」和「平和」都有图/);
    assert.equal(JSON.stringify(t.sa()), original);
    delete t.sa().characters.雪乃.平和;
    const beforeCollision = JSON.stringify(t.sa());
    await handleOutfitAction(action, t.ctx);
    assert.match(t.alerts.at(-1), /冲突/);
    assert.equal(JSON.stringify(t.sa()), beforeCollision);
    assert.equal(t.persisted(), 0);
    choice = 'discard';
    const done = await handleOutfitAction(action, t.ctx);
    assert.equal(done.ok, true);
    assert.equal(t.persisted(), 1);
    assert.deepEqual(t.sa().characters.雪乃, { 默认: 'new' });
    assert.deepEqual(t.sa().characterOutfits.雪乃.睡衣, { words: ['旧衣'], moods: {} });
});
