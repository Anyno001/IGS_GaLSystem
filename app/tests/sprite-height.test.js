import test from 'node:test';
import assert from 'node:assert/strict';
import {
    normalizeSettingsValue,
    normalizeSpriteGenderScale,
    normalizeSpriteHeight,
    resolveSpriteLayout,
} from '../src/visual/igs-ui/settings-normalize.js';
import { detectSpriteAge, normalizeCharacterSpriteScales, resolveSpriteBaseScale } from '../src/visual/igs-ui/sprite-height.js';
import { hasCharacterSpriteLayout } from '../src/visual/igs-ui/sprite-key-migration.js';
import { legacyPresetToPack, presetFromAssets } from '../src/scene/legacy-preset.js';

const assets = (over = {}) => ({
    characters: { 爱丽: { 默认: '' }, 小林: { 默认: '' }, 路人: { 默认: '' } },
    characterAliases: { 爱丽: ['小爱'] },
    characterDna: { 爱丽: { identity: '1girl, 银发' }, 小林: { triggerWords: '1boy' } },
    ...over,
});

test('gate:sprite-height:normalize-clamps-rounds-and-falls-back', () => {
    assert.equal(normalizeSpriteHeight(''), null);
    assert.equal(normalizeSpriteHeight('  ', 100), 100);
    assert.equal(normalizeSpriteHeight(undefined, 95), 95);
    assert.equal(normalizeSpriteHeight('abc', 90), 90);
    assert.equal(normalizeSpriteHeight(40), 60);
    assert.equal(normalizeSpriteHeight('200'), 150);
    assert.equal(normalizeSpriteHeight(92.4), 92);
    assert.equal(normalizeSpriteHeight('117'), 117);
});

test('gate:sprite-height:gender-defaults-are-90-100-95-and-off', () => {
    assert.deepEqual(normalizeSpriteGenderScale(null), { enabled: false, female: 90, male: 100, other: 95, elderShorter: 5, childShorter: 20 });
    assert.deepEqual(normalizeSpriteGenderScale({ enabled: false, female: '', male: 300, other: 'x' }), { enabled: false, female: 90, male: 150, other: 95, elderShorter: 5, childShorter: 20 });
    assert.deepEqual(normalizeSpriteGenderScale({ female: 88, elderShorter: '8', childShorter: 99 }), { enabled: false, female: 88, male: 100, other: 95, elderShorter: 8, childShorter: 60 });
});

test('gate:sprite-height:settings-paths-normalize-to-range', () => {
    assert.equal(normalizeSettingsValue('readerSettings.spriteDefaultScale', '45'), 60);
    assert.equal(normalizeSettingsValue('readerSettings.spriteDefaultScale', '123'), 123);
    assert.equal(normalizeSettingsValue('readerSettings.spriteDefaultScale', ''), 100);
    assert.equal(normalizeSettingsValue('readerSettings.spriteGenderScale.elderShorter', ''), 5);
    assert.equal(normalizeSettingsValue('readerSettings.spriteGenderScale.childShorter', '-3'), 0);
    assert.equal(normalizeSettingsValue('readerSettings.spriteGenderScale.childShorter', '25.6'), 26);
    assert.equal(normalizeSettingsValue('readerSettings.spriteGenderScale.male', ''), 100);
    assert.equal(normalizeSettingsValue('readerSettings.spriteGenderScale.female', '130'), 130);
    assert.equal(normalizeSettingsValue('readerSettings.spriteGenderScale.other', '999'), 150);
    assert.equal(normalizeSettingsValue('readerSettings.spriteGenderScale.enabled', 'false'), false);
    assert.equal(normalizeSettingsValue('readerSettings.spriteGenderScale.enabled', true), true);
});

test('gate:sprite-height:character-scales-keep-only-valid-entries', () => {
    const raw = JSON.parse('{"爱丽":"120","小林":"","路人":"abc","__proto__":100,"  ":90,"阿强":30}');
    assert.deepEqual(normalizeCharacterSpriteScales(raw), { 爱丽: 120, 阿强: 60 });
    assert.deepEqual(normalizeCharacterSpriteScales(null), {});
});

test('gate:sprite-height:resolve-uses-dna-gender-then-base', () => {
    const reader = { spriteDefaultScale: 110, spriteGenderScale: { enabled: true } };
    assert.deepEqual(resolveSpriteBaseScale(assets(), reader, '爱丽'), { characterScale: null, defaultScale: 90, source: 'female', age: '' });
    assert.deepEqual(resolveSpriteBaseScale(assets(), reader, '小林'), { characterScale: null, defaultScale: 100, source: 'male', age: '' });
    // 没有 DNA 或看不出性别的算「其他」。
    assert.deepEqual(resolveSpriteBaseScale(assets(), reader, '路人'), { characterScale: null, defaultScale: 95, source: 'other', age: '' });
    // 别名按主名认。
    assert.equal(resolveSpriteBaseScale(assets(), reader, '小爱').source, 'female');
    // 没有角色名、或关掉性别区分时用基准高度。
    assert.deepEqual(resolveSpriteBaseScale(assets(), reader, ''), { characterScale: null, defaultScale: 110, source: 'base' });
    const off = { ...reader, spriteGenderScale: { enabled: false } };
    assert.deepEqual(resolveSpriteBaseScale(assets(), off, '爱丽'), { characterScale: null, defaultScale: 110, source: 'base' });
    // 旧存档两项都没有：性别默认照常生效。
    assert.equal(resolveSpriteBaseScale(assets(), {}, '小林').defaultScale, 100);
});

test('gate:sprite-height:pending-sprites-without-dna-use-generation-tags', () => {
    // 待确认 / 仅本聊天的生成立绘没有 DNA，reader-host 把生成时的 tag 挂在 _tempSpriteTags。
    const on = { spriteGenderScale: { enabled: true } };
    const reader = { ...on, _tempSpriteTags: { 神秘少女: '1girl, silver hair', 路人甲: '1boy, short hair', 无标签: 'standing, smile' } };
    assert.equal(resolveSpriteBaseScale(assets(), reader, '神秘少女').source, 'female');
    assert.equal(resolveSpriteBaseScale(assets(), reader, '路人甲').source, 'male');
    assert.equal(resolveSpriteBaseScale(assets(), reader, '无标签').source, 'other');
    assert.equal(resolveSpriteBaseScale(assets(), on, '神秘少女').source, 'other', '没有 tag 表时照旧归其他');
    // 有 DNA 时 DNA 优先，tag 只兜底。
    assert.equal(resolveSpriteBaseScale(assets(), { ...on, _tempSpriteTags: { 小林: '1girl' } }, '小林').source, 'male');
    // 关掉性别区分时 tag 也不起作用。
    assert.equal(resolveSpriteBaseScale(assets(), { ...reader, spriteGenderScale: { enabled: false } }, '神秘少女').source, 'base');
});

test('gate:sprite-height:detect-age-reads-years-words-and-tags', () => {
    // 明写的岁数优先：60 岁以上老人、12 岁以下儿童，写了成年岁数就不再看称呼。
    assert.equal(detectSpriteAge('72岁，白发'), 'elder');
    assert.equal(detectSpriteAge('8 years old'), 'child');
    assert.equal(detectSpriteAge('25岁，被叫做萝莉'), '');
    // 生成 tag 与中文称呼。
    assert.equal(detectSpriteAge('1boy, old man, grey hair, beard'), 'elder');
    assert.equal(detectSpriteAge('1girl, elderly, kimono'), 'elder');
    assert.equal(detectSpriteAge('慈祥的老奶奶'), 'elder');
    assert.equal(detectSpriteAge('1girl, child, twintails'), 'child');
    assert.equal(detectSpriteAge('1boy, little boy, shorts'), 'child');
    assert.equal(detectSpriteAge('小学生，背着书包'), 'child');
    // 容易误判的写法都不算。
    assert.equal(detectSpriteAge('1girl, mature female, teacher'), '');
    assert.equal(detectSpriteAge('班主任老师，咖啡店老板'), '');
    assert.equal(detectSpriteAge('1girl, elder sister, childhood friend'), '');
    assert.equal(detectSpriteAge('爷爷是剑圣'), '');
    assert.equal(detectSpriteAge(''), '');
});

test('gate:sprite-height:elder-and-child-are-shorter-than-same-gender', () => {
    const on = { spriteGenderScale: { enabled: true } };
    const withAge = assets({
        characterDna: {
            奶奶: { identity: '1girl, 慈祥的老奶奶' },
            爷爷: { identity: '1boy, 70岁' },
            小妹: { identity: '1girl, 小学生' },
        },
    });
    assert.deepEqual(resolveSpriteBaseScale(withAge, on, '奶奶'), { characterScale: null, defaultScale: 85, source: 'female', age: 'elder' });
    assert.deepEqual(resolveSpriteBaseScale(withAge, on, '爷爷'), { characterScale: null, defaultScale: 95, source: 'male', age: 'elder' });
    assert.deepEqual(resolveSpriteBaseScale(withAge, on, '小妹'), { characterScale: null, defaultScale: 70, source: 'female', age: 'child' });
    // 没有 DNA 时同样看待确认立绘的 tag。
    const pending = { ...on, _tempSpriteTags: { 路过的老伯: '1boy, old man, cane' } };
    assert.equal(resolveSpriteBaseScale(withAge, pending, '路过的老伯').defaultScale, 95);
    // 矮多少可调，结果不低于 60。
    const tuned = { spriteGenderScale: { enabled: true, female: 70, childShorter: 30 } };
    assert.equal(resolveSpriteBaseScale(withAge, tuned, '小妹').defaultScale, 60);
    // 开关关闭、或角色单独填了高度时，年龄不起作用。
    assert.equal(resolveSpriteBaseScale(withAge, {}, '奶奶').defaultScale, 100);
    const manual = assets({ ...withAge, characterSpriteScales: { 奶奶: 110 } });
    assert.equal(resolveSpriteBaseScale(manual, on, '奶奶').characterScale, 110);
});

test('gate:sprite-height:resolve-prefers-character-setting', () => {
    const withManual = assets({ characterSpriteScales: { 爱丽: 123 } });
    assert.deepEqual(resolveSpriteBaseScale(withManual, {}, '爱丽'), { characterScale: 123, defaultScale: 100, source: 'manual' });
    assert.equal(resolveSpriteBaseScale(withManual, {}, '小爱').characterScale, 123, '别名也用主名的高度');
    assert.equal(resolveSpriteBaseScale(withManual, { spriteGenderScale: { enabled: false } }, '爱丽').characterScale, 123, '和性别开关无关');
});

test('gate:sprite-height:layout-priority-manual-then-character-then-mode-then-default', () => {
    const layouts = {
        pc: { posX: 40, posY: 95, scale: 110 },
        'pc::小林::平和': { posX: 70, posY: 30, scale: 180 },
    };
    // 「调整立绘」存下的位置压过角色自定义高度。
    assert.deepEqual(resolveSpriteLayout(layouts, 'pc', '小林', '平和', '', 90, 120), { posX: 70, posY: 30, scale: 180 });
    // 角色自定义高度压过模式整体缩放，位置沿用模式整体位置。
    assert.deepEqual(resolveSpriteLayout(layouts, 'pc', '小林', '害羞', '', 90, 120), { posX: 40, posY: 95, scale: 120 });
    // 模式整体缩放压过性别默认 / 基准高度（和原来一样）。
    assert.deepEqual(resolveSpriteLayout(layouts, 'pc', '爱丽', '', '', 90, null), { posX: 40, posY: 95, scale: 110 });
    assert.deepEqual(resolveSpriteLayout(null, 'pc', '爱丽', '', '', 90, null), { posX: 50, posY: 100, scale: 90 });
    assert.deepEqual(resolveSpriteLayout(null, 'pc', '爱丽', '', '', 90, 120), { posX: 50, posY: 100, scale: 120 });
    // 没有角色名时不吃角色高度。
    assert.deepEqual(resolveSpriteLayout(null, 'pc', '', '', '', 100, 120), { posX: 50, posY: 100, scale: 100 });
});

test('gate:sprite-height:detects-manual-layouts-by-full-identity', () => {
    const layouts = { pc: {}, 'pc::小林::平和': {}, 'mobile::小林|泳装': {}, 'pc::小林海斗::平和': {} };
    assert.equal(hasCharacterSpriteLayout(layouts, '小林'), true);
    assert.equal(hasCharacterSpriteLayout(layouts, '小林海斗'), true);
    assert.equal(hasCharacterSpriteLayout(layouts, '小'), false);
    assert.equal(hasCharacterSpriteLayout(layouts, '爱丽'), false);
    assert.equal(hasCharacterSpriteLayout(null, '小林'), false);
});

test('gate:sprite-height:preset-export-and-import-carry-character-heights', () => {
    const preset = presetFromAssets(assets(), { root: { characterSpriteScales: { 爱丽: 120 } } });
    assert.deepEqual(preset.characterSpriteScales, { 爱丽: 120 });
    assert.deepEqual(legacyPresetToPack(preset).characterSpriteScales, { 爱丽: 120 });
    assert.deepEqual(legacyPresetToPack({}).characterSpriteScales, {});
});

test('gate:sprite-height:settings-row-saves-renames-and-clears', async () => {
    const { bootstrapIGS } = await import('../src/index.js');
    const answers = [];
    const global = { prompt: () => answers.shift() ?? '', confirm: () => true };
    const vn = bootstrapIGS({ global, autoAttachMagicWand: false, hostAdapter: { getCurrentMessage: async () => null, typeAndSend: async () => ({ ok: true }) } });
    try {
        const controller = vn.openSettings({ tab: 'reader', mode: 'pc' }).controller;
        controller.setValue('bridge.sceneAssets.characters', { 爱丽: { 默认: '' } });
        controller.setValue('bridge.sceneAssets.characterDna', { 爱丽: { identity: '1girl' } });
        controller.switchTab('scene');
        let html = controller.switchSceneSubTab('characters').html || controller.getSnapshot().html;
        assert.match(html, /data-path="readerSettings\.spriteDefaultScale" type="number" min="60" max="150" value="100"/);
        // 默认关：不打开就不改动老用户的立绘大小。
        assert.match(html, /data-switch="readerSettings\.spriteGenderScale\.enabled" aria-pressed="false"/);
        assert.doesNotMatch(html, /data-path="readerSettings\.spriteGenderScale\.female"/);
        controller.toggle('readerSettings.spriteGenderScale.enabled');
        html = controller.getSnapshot().html;
        assert.match(html, /data-switch="readerSettings\.spriteGenderScale\.enabled" aria-pressed="true"/);
        assert.match(html, /data-path="readerSettings\.spriteGenderScale\.female" type="number" min="60" max="150" value="90"/);
        assert.match(html, /data-path="readerSettings\.spriteGenderScale\.male" type="number" min="60" max="150" value="100"/);
        assert.match(html, /data-path="readerSettings\.spriteGenderScale\.other" type="number" min="60" max="150" value="95"/);
        assert.match(html, /老人比同性别矮<\/span><input data-path="readerSettings\.spriteGenderScale\.elderShorter" type="number" min="0" max="60" value="5"/);
        assert.match(html, /儿童比同性别矮<\/span><input data-path="readerSettings\.spriteGenderScale\.childShorter" type="number" min="0" max="60" value="20"/);

        const name = encodeURIComponent('爱丽');
        // 角色收起时、角色设定面板里都没有这一行；点名字展开后在立绘列表最上面。
        assert.doesNotMatch(html, /data-char-height=/);
        html = (await controller.invoke(`scene-toggle-dna:${name}`)).snapshot.html;
        assert.doesNotMatch(html, /data-char-height=/);
        html = (await controller.invoke(`ui-toggle-open:${encodeURIComponent('char-open:爱丽')}`)).snapshot.html;
        assert.match(html, /<div class="igs-char-body"><div class="igs-char-info-row igs-char-height-row">/);
        assert.match(html, /data-char-height="爱丽" value="" placeholder="90"/);
        assert.match(html, /留空＝自动（女性 90%）/);
        // 认出老人时提示里带上年龄档。
        html = controller.setValue('bridge.sceneAssets.characterDna', { 爱丽: { identity: '1girl, 慈祥的老奶奶' } }).snapshot.html;
        assert.match(html, /data-char-height="爱丽" value="" placeholder="85"/);
        assert.match(html, /留空＝自动（女性 · 老人 85%）/);
        controller.setValue('bridge.sceneAssets.characterDna', { 爱丽: { identity: '1girl' } });

        html = (await controller.invoke(`char-height:${name}:117`)).snapshot.html;
        assert.deepEqual(controller.getSnapshot().draft.bridge.sceneAssets.characterSpriteScales, { 爱丽: 117 });
        assert.match(html, /data-char-height="爱丽" value="117" placeholder="90"/);
        await controller.invoke(`char-height:${name}:999`);
        assert.deepEqual(controller.getSnapshot().draft.bridge.sceneAssets.characterSpriteScales, { 爱丽: 150 });

        // 「调整立绘」调过的角色提示调整结果优先。
        controller.setValue('readerSettings.spriteLayouts', { 'pc::爱丽::默认': { posX: 50, posY: 100, scale: 130 } });
        html = controller.switchSceneSubTab('characters').html || controller.getSnapshot().html;
        assert.match(html, /用「调整立绘」调过的表情按调整结果/);

        // 关掉性别区分后，自动值回到基准高度，性别格子收起。
        controller.toggle('readerSettings.spriteGenderScale.enabled');
        html = controller.getSnapshot().html;
        assert.doesNotMatch(html, /data-path="readerSettings\.spriteGenderScale\.female"/);
        assert.match(html, /data-char-height="爱丽" value="150" placeholder="100"/);

        // 角色改名时高度跟着走。
        answers.push('爱丽丝');
        await controller.invoke(`scene-rename-char:${name}`);
        assert.deepEqual(controller.getSnapshot().draft.bridge.sceneAssets.characterSpriteScales, { 爱丽丝: 150 });

        // 留空就删掉，回到自动。
        const renamed = encodeURIComponent('爱丽丝');
        await controller.invoke(`char-height:${renamed}:`);
        assert.deepEqual(controller.getSnapshot().draft.bridge.sceneAssets.characterSpriteScales, {});

        // 删除角色时一起清掉。
        await controller.invoke(`char-height:${renamed}:80`);
        assert.deepEqual(controller.getSnapshot().draft.bridge.sceneAssets.characterSpriteScales, { 爱丽丝: 80 });
        await controller.invoke(`scene-remove-char:${renamed}`);
        assert.deepEqual(controller.getSnapshot().draft.bridge.sceneAssets.characterSpriteScales, {});
        controller.close();
    } finally {
        vn.destroy();
    }
});

test('gate:asset-batch-delete:select-pick-and-delete-characters', async () => {
    const { bootstrapIGS } = await import('../src/index.js');
    const global = { prompt: () => '', confirm: () => true };
    const vn = bootstrapIGS({ global, autoAttachMagicWand: false, hostAdapter: { getCurrentMessage: async () => null, typeAndSend: async () => ({ ok: true }) } });
    try {
        const controller = vn.openSettings({ tab: 'scene', mode: 'pc' }).controller;
        controller.setValue('bridge.sceneAssets.characters', { 甲: { 默认: '' }, 乙: { 默认: '' }, 丙: { 默认: '' } });
        let html = controller.switchSceneSubTab('characters').html || controller.getSnapshot().html;
        assert.match(html, /data-action="asset-select:characters"[^>]*>多选</);
        html = (await controller.invoke('asset-select:characters')).snapshot.html;
        assert.match(html, /已选 0 项/);
        assert.match(html, /data-action="asset-delete-picked:characters" disabled/);
        await controller.invoke(`asset-pick:characters:${encodeURIComponent('甲')}`);
        html = (await controller.invoke(`asset-pick:characters:${encodeURIComponent('丙')}`)).snapshot.html;
        assert.match(html, /已选 2 项/);
        await controller.invoke('asset-delete-picked:characters');
        assert.deepEqual(Object.keys(controller.getSnapshot().draft.bridge.sceneAssets.characters), ['乙']);
        assert.doesNotMatch(controller.getSnapshot().html, /已选/);
    } finally {
        vn.destroy();
    }
});
