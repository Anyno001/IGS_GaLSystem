import test from 'node:test';
import assert from 'node:assert/strict';
import { narrationKeepsSprite } from '../src/scene/narration-sprite.js';

test('narration-sprite: 写到这个人离开就清掉，之后的旁白也不沿用', () => {
    const left = '李伯躬身应了一声，端着茶盘退向茶水间。';
    assert.equal(narrationKeepsSprite({ name: '李伯', pages: [left] }), false);
    assert.equal(narrationKeepsSprite({ name: '李伯', pages: [left, '你穿过走廊，推开自己房间的雕花木门。'] }), false);
});

test('narration-sprite: 离开的是别人、或名字离动作太远，不清', () => {
    assert.equal(narrationKeepsSprite({ name: '李伯', pages: ['司徒言的脚步声在走廊转角处消失了。'] }), true);
    assert.equal(narrationKeepsSprite({ name: '李伯', pages: ['李伯看了看你另一只手，又看了看窗外的花园和远处的山，司徒先生早已离开。'] }), true);
});

test('narration-sprite: 紧跟台词的 2 页沿用，再往后要旁白还写着这个人', () => {
    const plain = ['房间里飘着清淡的冷香。', '衣帽间、卫浴和落地窗一应俱全。', '窗外下起了小雨。'];
    assert.equal(narrationKeepsSprite({ name: '李伯', pages: plain.slice(0, 2) }), true);
    assert.equal(narrationKeepsSprite({ name: '李伯', pages: plain }), false);
    assert.equal(narrationKeepsSprite({ name: '李伯', pages: [...plain.slice(0, 2), '李伯还站在门口。'] }), true);
});

test('narration-sprite: 第二人称视角角色写作「你」也算写到；三字名认后两字', () => {
    const pages = ['房间里飘着清淡的冷香。', '衣帽间一应俱全。', '你在床沿坐下，拿出备用手机。'];
    assert.equal(narrationKeepsSprite({ name: '李哪吒', pov: true, pages }), true);
    assert.equal(narrationKeepsSprite({ name: '李哪吒', pov: false, pages }), false);
    assert.equal(narrationKeepsSprite({ name: '李哪吒', pages: [...pages.slice(0, 2), '哪吒盯着屏幕。'] }), true);
    // 视角角色「你离开」不清：镜头跟着走。
    assert.equal(narrationKeepsSprite({ name: '李哪吒', pov: true, pages: ['你离开了客厅。'] }), true);
});

import { narrationCastLeft, otherNamesOf } from '../src/scene/narration-sprite.js';

const OTHERS = ['司徒言', '李伯'];
const keeps = (pages, extra = {}) => narrationKeepsSprite({ name: '苏念', others: OTHERS, pages, ...extra });

test('narration-sprite: 离场后的旁白页一直不显示，按页序推导', () => {
    const pages = ['苏念转身离开了房间。', '窗外的雨停了。', '走廊里很安静。', '远处传来钟声。'];
    for (let i = 1; i <= pages.length; i++) assert.equal(keeps(pages.slice(0, i)), false, `第 ${i} 页`);
});

test('narration-sprite: 他/她指代最近说话人，句首有别人时不猜', () => {
    assert.equal(keeps(['她转身离开了。']), false);
    assert.equal(keeps(['她看着司徒言走出房间。']), true);
    assert.equal(keeps(['司徒言走出了房间，她没有动。']), true);
    assert.equal(keeps(['苏念看着司徒言离开。']), true);
    assert.equal(keeps(['司徒言的背影离开了她的视线。']), true);
    assert.equal(keeps(['她目送李伯离去。']), true);
});

test('narration-sprite: 回来 / 走进 之后立绘恢复，再离开又清', () => {
    assert.equal(keeps(['苏念走出了房间。', '她推门进来，手里端着茶。']), true);
    assert.equal(keeps(['苏念走出了房间。', '雨声。', '雨声。', '苏念推门而入。']), true);
    assert.equal(keeps(['苏念走出了房间。', '苏念又走进来。', '她再次转身离开。']), false);
    assert.equal(keeps(['苏念走出了房间。', '司徒言走进来。']), false);
});

test('narration-sprite: 否定与「走了过去」不算离场', () => {
    assert.equal(keeps(['苏念没有离开。']), true);
    assert.equal(keeps(['苏念走了过去，坐在床边。']), true);
});

test('narration-sprite: 连续场景 A 对白 / 旁白离场 / 若干旁白 / B 对白 / 旁白', () => {
    const afterA = ['苏念转身离开了房间。', '屋里只剩下烛火。', '风吹动窗帘。'];
    assert.equal(keeps(afterA), false);
    // B 开口后旁白的继承起点换成 B，A 不再参与。
    assert.equal(narrationKeepsSprite({ name: '司徒言', others: ['苏念', '李伯'], pages: ['他站在窗前沉默。'] }), true);
});

test('narration-sprite: 同屏陪衬被正文写走', () => {
    assert.equal(narrationCastLeft({ name: '李伯', others: ['苏念'], text: '李伯躬身退下。苏念坐了下来。' }), true);
    assert.equal(narrationCastLeft({ name: '李伯', others: ['苏念'], text: '苏念走出房间。' }), false);
    assert.equal(narrationCastLeft({ name: '李伯', others: ['苏念'], text: '李伯退下了。过了会儿李伯又回来了。' }), false);
});

test('gate: narration-sprite: 同屏转身走了仅清最近说话人，空白旁白不重置指代', () => {
    const narration = '门外响起雨声。他转身走了。';
    const cara = '[igs-char:司徒言|平和|好。]\n';
    const bob = '[igs-char:李伯|平和|知道了。]\n';
    assert.equal(narrationCastLeft({ name: '苏念', others: ['李伯', '司徒言'], text: bob + cara + narration }), false);
    assert.equal(narrationCastLeft({ name: '李伯', others: ['苏念', '司徒言'], text: cara + narration }), false);
    assert.equal(narrationCastLeft({ name: '司徒言', others: ['苏念', '李伯'], text: narration }), true);
    // 明确写名的离场仍然单独生效，回来后又上场。
    assert.equal(narrationCastLeft({ name: '李伯', others: ['苏念', '司徒言'], text: cara + '李伯转身走了。' }), true);
    assert.equal(narrationCastLeft({ name: '李伯', others: ['苏念', '司徒言'], text: cara + '李伯转身走了。李伯又回来了。' }), false);
});

test('narration-sprite: otherNamesOf 排除自己并带别名', () => {
    const names = otherNamesOf({ 苏念: {}, 司徒言: {} }, { 司徒言: ['阿言'] }, '苏念', ['玩家']);
    assert.deepEqual(names.sort(), ['司徒言', '徒言', '玩家', '阿言'].sort());
});

test('narration-sprite: 离场句式取舍（真离场 / 仅起身 / 使役 / 意愿 / 否定）', () => {
    const left = (text) => narrationCastLeft({ name: '小雨', others: ['林夏'], text });
    for (const t of ['小雨离开了。', '小雨走出房间。', '小雨告辞。', '小雨消失在走廊尽头。', '小雨拂袖而去。', '小雨夺门而出。', '小雨被叫走了。', '小雨挂断电话，离线了。', '她离开了。']) assert.equal(left(t), true, t);
    for (const t of ['小雨离开了座位。', '小雨离开了他的怀抱。', '目送小雨离开。', '林夏让小雨离开。', '小雨想离开。', '小雨离开前回头看了一眼。', '小雨没有离开。', '小雨别离开。', '小雨走了过来。', '小雨退下盔甲。', '小雨冲出重围。']) assert.equal(left(t), false, t);
});

test('narration-sprite: 回来词不被「出现在脑海里 / 走进回忆」误触', () => {
    const left = (text) => narrationCastLeft({ name: '小雨', others: ['林夏'], text });
    assert.equal(left('小雨离开了。小雨出现在脑海里。'), true);
    assert.equal(left('小雨离开了。小雨走进了回忆。'), true);
    assert.equal(left('小雨离开了。过了会儿小雨回来了。'), false);
});
