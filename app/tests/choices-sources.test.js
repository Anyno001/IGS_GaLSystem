import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildItemActionText,
    extractBodyChoices,
    listPresentNames,
    normalizeOptionSources,
    normalizeQuickActions,
    splitQuickActions,
} from '../src/choices/option-sources.js';
import { normalizeOptionBubble } from '../src/visual/igs-ui/settings-host-normalize.js';

test('choices-sources: item action text', () => {
    assert.equal(buildItemActionText('use', '回复药'), '我使用了【回复药】');
    assert.equal(buildItemActionText('give', '手帕', '白露'), '我把【手帕】递给了白露');
    assert.equal(buildItemActionText('give', '手帕', ''), '我把【手帕】递给了');
    assert.equal(buildItemActionText('inspect', '手帕'), '我仔细查看了【手帕】');
    assert.equal(buildItemActionText('use', '  '), '');
});

test('choices-sources: present characters from sprite and cast, protagonist excluded', () => {
    const names = listPresentNames({ spriteImage: 'a.png', spriteCharacter: '白露', castSprites: [{ character: '林夏' }, { character: '白露' }, { character: '陈屿' }] }, '陈屿');
    assert.deepEqual(names, ['白露', '林夏']);
    assert.deepEqual(listPresentNames({ spriteImage: null, spriteCharacter: '白露', castSprites: [] }), []);
    assert.deepEqual(listPresentNames(null), []);
});

test('choices-sources: body fallback reads explicit option blocks only', () => {
    const numbered = '白露看着你。\n接下来你要怎么做？\n1. 留在广场\n2. 前往酒店\n3、回家';
    assert.deepEqual(extractBodyChoices(numbered).map(item => item.display), ['留在广场', '前往酒店', '回家']);
    const hintedBullets = '你可以：\n- 开口询问\n- 保持沉默';
    assert.deepEqual(extractBodyChoices(hintedBullets).map(item => item.display), ['开口询问', '保持沉默']);
});

test('choices-sources: body fallback ignores ordinary lists and mid-text lists', () => {
    assert.deepEqual(extractBodyChoices('桌上放着：\n- 苹果\n- 梨\n她笑了笑。'), []);
    assert.deepEqual(extractBodyChoices('购物清单\n- 苹果\n- 梨'), []);
    assert.deepEqual(extractBodyChoices('第一步\n2. 切菜\n3. 下锅'), []);
    assert.deepEqual(extractBodyChoices('只有一条\n1. 留下'), []);
    assert.deepEqual(extractBodyChoices(''), []);
});

test('choices-sources: body fallback strips trailing status blocks before finding options', () => {
    const shown = text => extractBodyChoices(text).map(item => item.display);
    const opts = '她转过身。\n接下来你要怎么做？\n1. 追上去\n2. 原地等待';
    assert.deepEqual(shown(`${opts}\n\n<!-- 状态：好感+1 -->`), ['追上去', '原地等待']);
    assert.deepEqual(shown(`${opts}\n<meta:状态>\n时间：夜\n</meta:状态>`), ['追上去', '原地等待']);
    assert.deepEqual(shown(`${opts}\n<status>\n- 体力：80\n- 好感：50\n</status>`), ['追上去', '原地等待']);
    assert.deepEqual(shown(`${opts}\n【系统面板】\n金币 20\n体力 80】`), ['追上去', '原地等待']);
    assert.deepEqual(shown(`${opts}\n---\n【状态栏】`), ['追上去', '原地等待']);
    assert.deepEqual(shown(`${opts}\n\`\`\`\nHP 10\n\`\`\``), ['追上去', '原地等待']);
    assert.deepEqual(shown('你可以：\n- 开口询问\n- 保持沉默\n<UpdateVariable>x</UpdateVariable>'), ['开口询问', '保持沉默']);
});

test('choices-sources: body fallback rejects status bars and dialogue lists', () => {
    const shown = text => extractBodyChoices(text).map(item => item.display);
    assert.deepEqual(shown('她笑了。\n**当前行动状态**\n- 体力：80\n- 好感：50'), []);
    assert.deepEqual(shown('她笑了。\n你可以看到：\n- 体力：80\n- 好感：50'), []);
    assert.deepEqual(shown('【状态面板】\n- 体力：80\n- 好感：50'), []);
    assert.deepEqual(shown('她说了几句：\n- “早上好。”\n- “今天天气不错。”'), []);
    assert.deepEqual(shown('她笑了。\n<status>\n1. 好感\n</status>'), []);
    assert.deepEqual(shown('<!-- 1. 甲\n2. 乙 -->'), []);
    assert.deepEqual(shown('今天的菜单\n1. 米饭\n2. 汤\n\n她笑了笑，没有再说话。'), []);
});

test('choices-sources: protagonist placeholders are not offered as recipients', () => {
    assert.deepEqual(listPresentNames({ spriteImage: 'a.png', spriteCharacter: '{{user}}', castSprites: [{ character: '玩家' }, { character: '林夏' }] }, '陈屿'), ['林夏']);
});

test('choices-sources: quick actions normalize and split', () => {
    assert.equal(normalizeQuickActions(' 观察四周 \n\n离开这里\n观察四周'), '观察四周\n离开这里');
    assert.deepEqual(splitQuickActions(''), []);
    assert.deepEqual(splitQuickActions(['甲', '乙']), ['甲', '乙']);
    assert.equal(splitQuickActions(Array.from({ length: 20 }, (_, i) => `行动${i}`)).length, 8);
});

test('choices-sources: defaults do not disturb old users', () => {
    assert.deepEqual(normalizeOptionSources(null), { itemButton: true, bodyFallback: true, quickActions: '' });
    const frozen = Object.freeze({ enabled: true, quickActions: '甲' });
    const normalized = normalizeOptionBubble(frozen);
    assert.equal(normalized.itemButton, true);
    assert.equal(normalized.bodyFallback, true);
    assert.equal(normalized.quickActions, '甲');
    assert.equal(frozen.itemButton, undefined);
    assert.equal(normalizeOptionBubble({ itemButton: false, bodyFallback: false }).itemButton, false);
});
