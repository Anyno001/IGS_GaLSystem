import test from 'node:test';
import assert from 'node:assert/strict';
import { carriesAcrossScene, sceneCarryOf, narrationCastLeft } from '../src/scene/narration-sprite.js';
import { createNarrationNamer } from '../src/scene/narration-focus.js';
import { pickCastMembers } from '../src/scene/stage-cast.js';
import { extractSceneDirectives } from '../src/scene/scene-directives.js';
import { prepareReaderFloor } from '../src/visual/igs-ui/reader-floor-plan.js';
import { prepareReaderFloorAssets } from '../src/visual/igs-ui/reader-floor-assets.js';

const carry = (extra) => sceneCarryOf({ name: '小雪', others: ['白墨'], self: ['林远'], ...extra });

test('换场景：转场句里同行留下，独自 / 道别清掉', () => {
    assert.equal(carry({ before: '我和小雪一起走出了教室' }), 'company');
    assert.equal(carry({ before: '小雪牵着你的手走出校门' }), 'company');
    assert.equal(carry({ before: '你独自走出了教室' }), '');
    assert.equal(carry({ before: '你和小雪道别，走出了教室', ahead: [{ text: '小雪也在食堂。', by: '' }] }), '');
    // 别人独自离开不算这个人分开；否定的「不再一个人」不算分开。
    assert.equal(carry({ before: '白墨独自走了', ahead: [{ text: '小雪坐在长椅上。', by: '' }] }), 'ahead');
    assert.equal(carry({ before: '你不再一个人走出了教室，小雪跟在身边' }), 'company');
});

test('换场景：新场景开口或被写到留下，迟到入场与不在场的提法不留', () => {
    assert.equal(carry({ ahead: [{ text: '[小雪]：这里好安静。', by: 'own' }] }), 'ahead');
    assert.equal(carry({ ahead: [{ text: '图书馆里人不多。', by: '' }, { text: '小雪翻着一本书。', by: '' }] }), 'ahead');
    assert.equal(carry({ ahead: [{ text: '小雪推门进来，手里拿着伞。', by: '' }] }), '');
    assert.equal(carry({ ahead: [{ text: '小雪赶来时已经下雨了。', by: '' }] }), '');
    assert.equal(carry({ ahead: [{ text: '你想起小雪说过的话。', by: '' }] }), '');
    assert.equal(carry({ ahead: [{ text: '听说小雪也报了名。', by: '' }] }), '');
    assert.equal(carry({ ahead: [{ text: '手机上小雪的消息还没回。', by: '' }] }), '');
    // 别人先开口就不再往后看。
    assert.equal(carry({ ahead: [{ text: '[白墨]：来了？', by: 'other' }, { text: '小雪点头。', by: '' }] }), '');
});

test('换场景：没有任何证据时清掉', () => {
    assert.equal(carry({ before: '钟声响了', after: '图书馆里很安静', ahead: [{ text: '图书馆里很安静。', by: '' }] }), '');
    assert.equal(carriesAcrossScene({ name: '小雪', ahead: [] }), false);
});

test('换场景：跳时间只认新场景里出场，同行词不算', () => {
    assert.equal(carry({ before: '我和小雪一起走出了教室', timeJump: true }), '');
    assert.equal(carry({ after: '第二天，小雪和我一起去上学', ahead: [{ text: '第二天，小雪和我一起去上学。', by: '' }] }), 'ahead');
    assert.equal(carry({ after: '第二天她和我一起去上学', lead: true, ahead: [{ text: '第二天她和我一起去上学。', by: '' }] }), 'ahead');
});

test('换场景：集体主语 + 移动带走全员；三档设置', () => {
    assert.equal(carry({ before: '我们一行人来到了操场' }), 'group');
    assert.equal(carry({ before: '我们一行人来到了操场', mode: 'strict' }), '');
    assert.equal(carry({ before: '钟声响了', mode: 'loose' }), 'loose');
    assert.equal(carry({ before: '你独自回到宿舍', mode: 'loose' }), '');
    assert.equal(carry({ before: '钟声响了', mode: 'loose', timeJump: true }), '');
    assert.equal(carry({ mode: 'strict', ahead: [{ text: '操场上风很大。', by: '' }, { text: '小雪在跑步。', by: '' }] }), '');
    assert.equal(carry({ mode: 'strict', ahead: [{ text: '小雪在跑步。', by: '' }] }), 'ahead');
});

const NAMER_CHARS = { 严尚义: { 平和: 'a' }, 白墨: { 平和: 'b' }, 小雪: { 平和: 'c' }, 林远: { 平和: 'd' } };
const namer = (extra = {}) => createNarrationNamer({ characters: NAMER_CHARS, aliases: { 严尚义: ['尚义嬷嬷'] }, userKey: '林远', ...extra });

test('旁白点名：简称与别名都换回主名，取最长匹配', () => {
    assert.equal(namer().read('尚义推门而入。'), '严尚义');
    assert.equal(namer().read('尚义嬷嬷看着窗外。'), '严尚义');
    assert.equal(namer().read('白墨坐下。'), '白墨');
    // 后两字是称谓的不当简称。
    assert.equal(createNarrationNamer({ characters: { 尚义嬷嬷: {} } }).read('嬷嬷走了过来。'), '');
    // 两个人简称相同时谁都不认。
    assert.equal(createNarrationNamer({ characters: { 王小雪: {}, 李小雪: {} } }).read('小雪走了过来。'), '');
});

test('感知句：立绘给被感知的人', () => {
    assert.equal(namer().read('你听见小雪在哭。'), '小雪');
    assert.equal(namer().read('白墨看到尚义嬷嬷走来。'), '严尚义');
    assert.equal(namer().read('你抬起头，看到不远处的小雪。'), '小雪');
    // 一句里多个宾语取第一个。
    assert.equal(namer().read('你看见小雪和白墨站在一起。'), '小雪');
    // 被动句给被字前的主语。
    assert.equal(namer().read('白墨被严尚义看到了。'), '白墨');
    assert.equal(namer().read('你被小雪看到了。'), '林远');
    // 主角没有素材时静默跳过，不退回别人的立绘。
    const bare = createNarrationNamer({ characters: { 小雪: {} }, userKey: '林远', allow: (key) => key !== '林远' });
    assert.equal(bare.read('你被小雪看到了。'), '');
});

test('感知句排除：不在场 / 否定 / 媒介 / 代词 / 泛指 / 引号 / 不在近期名单', () => {
    for (const t of ['小雪想起看到白墨的那天。', '你仿佛看到了白墨。', '你好像听见白墨在喊。', '你梦见白墨。']) assert.notEqual(namer().read(t), '白墨', t);
    for (const t of ['小雪没看到白墨。', '你没听见白墨说话。', '你看不见白墨。', '你找不到白墨。']) assert.notEqual(namer().read(t), '白墨', t);
    for (const t of ['你看到白墨的照片。', '你看到手机屏幕上的白墨。', '你听到白墨的消息。', '你看见白墨的影子。']) assert.notEqual(namer().read(t), '白墨', t);
    assert.equal(namer().read('你听见白墨的声音。'), '白墨');
    assert.equal(namer().read('你看见她。'), '');
    assert.equal(namer().read('小雪看到自己。'), '');
    assert.equal(namer().read('小雪看到大家。'), '');
    assert.equal(namer().read('你说：“我看到白墨了。”'), '');
    assert.equal(namer({ allow: (key) => key !== '白墨' }).read('你看到白墨。'), '');
    // 不在场时照旧按句首点名。
    assert.equal(namer().read('小雪想起白墨。'), '小雪');
});

const GENDER = { 严尚义: 'female', 白墨: 'male' };
const gendered = (map = GENDER) => namer({ genderOf: (key) => map[key] || '' });

test('话题主语：感知句之后的她 / 他按性别归给感知者或宾语', () => {
    const n = gendered();
    assert.equal(n.read('严尚义盯着白墨看。'), '白墨');
    assert.equal(n.read('她感到愤怒。', { focus: '白墨' }), '严尚义');
    const same = gendered({ 严尚义: 'female', 白墨: 'female' });
    same.read('严尚义盯着白墨看。');
    assert.equal(same.read('她感到愤怒。', { focus: '白墨' }), '严尚义');
    const left = gendered();
    left.read('严尚义盯着白墨看。');
    assert.equal(left.read('他转身离开。', { focus: '白墨' }), '白墨');
    const passive = gendered();
    passive.read('白墨被严尚义看到。');
    assert.equal(passive.read('他慌了。', { focus: '白墨' }), '白墨');
    // 都对不上不猜。
    const none = gendered({ 严尚义: 'female', 白墨: 'female' });
    none.read('严尚义推开门。');
    assert.equal(none.read('他笑了。', { focus: '严尚义' }), '');
});

const ASSETS = {
    enabled: true,
    characters: { 白墨: { 平和: 'u1', 愤怒: 'u2' }, 小雪: { 平和: 'u3' } },
    characterAliases: {},
    characterDna: { 白墨: { triggerWords: '1boy' } },
    generated: { characters: { 严尚义: { 平和: 'g1', 愤怒: 'g2' } }, characterAliases: { 严尚义: ['尚义嬷嬷'] } },
};

function floorOf(lines, { assets = ASSETS, userName = '林远', recentCast = null, stageCast } = {}) {
    const raw = [], segments = [];
    for (const line of lines) {
        if (line.startsWith('[igs-scene:')) { raw.push(line); continue; }
        const said = line.match(/^(.+?)\|(.*?)\|(.+)$/);
        if (said) { raw.push(`[igs-char:${said[1]}|${said[2]}|${said[3]}]`); segments.push(`[${said[1]}]：${said[3]}`); }
        else { raw.push(line); segments.push(line); }
    }
    const source = raw.join('\n');
    const extracted = { sceneDirectives: extractSceneDirectives(source).directives, markerLayoutSource: source };
    const readerSettings = { _sceneAssets: assets, stageCast: stageCast || { enabled: true }, titleCard: { enabled: true } };
    return { floor: prepareReaderFloor({ text: segments.join('\n'), segments, extracted, payload: { raw: source, recentCast }, scene: { speaker: '' }, readerSettings, userName }), readerSettings };
}
const sprites = (floor) => floor.pages.map((p) => p.spriteChar || '-');

test('楼层：换场景后旧说话人不再沿用，同行的留下且计数重来', () => {
    const { floor } = floorOf(['[igs-scene:教室|下午|晴]', '白墨|平和|走吧。', '钟声响了。', '[igs-scene:图书馆|下午|晴]', '图书馆里很安静。', '书架很高。']);
    assert.deepEqual(sprites(floor), ['-', '白墨', '白墨', '-', '-', '-']);
    const { floor: walked } = floorOf(['[igs-scene:教室|下午|晴]', '白墨|平和|走吧。', '我和白墨一起走出了教室。', '[igs-scene:走廊|下午|晴]', '走廊很长。', '窗外有风。', '灯亮着。']);
    assert.deepEqual(sprites(walked), ['-', '白墨', '白墨', '-', '白墨', '白墨', '-']);
});

test('楼层：场景标签的在场名单优先', () => {
    const { floor } = floorOf(['[igs-scene:教室|下午|晴]', '白墨|平和|走吧。', '我和白墨一起走出了教室。', '[igs-scene:走廊|下午|晴||小雪]', '走廊很长。']);
    assert.deepEqual(sprites(floor), ['-', '白墨', '白墨', '-', '小雪']);
});

test('楼层：生成区别名点名并当页离场', () => {
    const { floor } = floorOf(['白墨|平和|你好。', '尚义嬷嬷转身离开了房间。', '窗外下着雨。']);
    assert.equal(floor.pages[1].spriteChar, '');
    assert.equal(floor.pages[1].narrationDroppedKey, '严尚义');
    assert.equal(floor.pages[2].spriteChar, '');
    const { floor: stay } = floorOf(['白墨|平和|你好。', '尚义推开门。', '她恼怒地皱眉。']);
    assert.deepEqual(sprites(stay), ['白墨', '严尚义', '严尚义']);
    assert.equal(stay.pages[2].spriteMood, '愤怒');
});

test('楼层：感知宾语换焦点，她 / 他按话题主语消解，代词离场只下被认领的人', () => {
    const assets = { ...ASSETS, characterDna: { 白墨: { triggerWords: '1boy' }, 严尚义: { triggerWords: '1girl' } } };
    const { floor } = floorOf(['严尚义|平和|哼。', '白墨|平和|嗯。', '严尚义盯着白墨看。', '她感到愤怒。', '他笑了。'], { assets });
    assert.deepEqual(sprites(floor).slice(2), ['白墨', '严尚义', '严尚义']);
    assert.equal(floor.pages[3].spriteMood, '愤怒');
    // 感知句紧接「他转身离开」：他与话题主语性别冲突、与宾语相符，下台的是宾语。
    const { floor: left } = floorOf(['严尚义|平和|哼。', '白墨|平和|嗯。', '严尚义盯着白墨看。', '他转身离开。'], { assets });
    assert.equal(left.pages[3].narrationDroppedKey, '白墨');
});

function staged(lines, opts) {
    const { floor, readerSettings } = floorOf(lines, opts);
    const tableData = { revision: 0, prepareCharacters() {}, outfitClues: null };
    prepareReaderFloorAssets(floor, { payload: {}, readerSettings, assetMatchCtx: {}, tableData });
    return floor;
}
const seats = (page) => page.cast.map((m) => `${m.character}${m.temp ? '*' : ''}@${m.order}`).sort();

test('同屏：感知换焦点只改主立绘，不重排座位', () => {
    const floor = staged(['严尚义|平和|哼。', '白墨|平和|嗯。', '严尚义盯着白墨看。', '她感到愤怒。']);
    assert.deepEqual(seats(floor.pages[2]), seats(floor.pages[1]));
    assert.deepEqual(seats(floor.pages[3]), seats(floor.pages[1]));
    assert.deepEqual(sprites(floor).slice(2), ['白墨', '严尚义']);
});

test('同屏：满座时临时焦点不挤掉已开口的人', () => {
    const cast = [{ character: 'A', order: 0 }, { character: 'B', order: 1 }, { character: 'C', order: 2 }, { character: 'D', order: 1000, temp: true }];
    const resolve = (m) => ({ character: m.character });
    const full = pickCastMembers(cast, { speakerKey: 'D', seats: 2, resolve, speakerTemp: true });
    assert.equal(full.hideSpeaker, true);
    assert.deepEqual(full.members.map((m) => m.character), ['A', 'B', 'C']);
    const free = pickCastMembers(cast.filter((m) => m.character !== 'C'), { speakerKey: 'D', seats: 2, resolve, speakerTemp: true });
    assert.equal(free.hideSpeaker, undefined);
    assert.equal(free.speakerOrder, 1000);
    // 临时座位只坐空座。
    const temps = pickCastMembers([{ character: 'E', order: 1001, temp: true }, ...cast.slice(0, 2)], { speakerKey: 'A', seats: 1, resolve });
    assert.deepEqual(temps.members.map((m) => m.character), ['B']);
});

test('同屏：集体主语带过去的陪衬没被写到就下台', () => {
    const floor = staged(['[igs-scene:教室|下午|晴]', '小雪|平和|走吧。', '白墨|平和|好。', '我们一行人来到了操场。',
        '[igs-scene:操场|下午|晴]', '风很大。', '跑道上没人。', '远处有鸟。', '天色暗了。']);
    const castOf = (i) => floor.pages[i].cast.map((m) => m.character);
    assert.ok(castOf(5).includes('小雪'));
    assert.ok(!castOf(8).includes('小雪'));
});

test('同屏：同性别两人时「她离开」不误删陪衬', () => {
    assert.equal(narrationCastLeft({ name: '小雪', others: ['严尚义'], text: '她转身离开了。', pronoun: false }), false);
    const assets = { ...ASSETS, characterDna: { 小雪: { triggerWords: '1girl' }, 严尚义: { triggerWords: '1girl' } } };
    const floor = staged(['小雪|平和|嗯。', '严尚义|平和|哼。', '窗外下着雨。', '雨声。', '雨声。', '雨声。', '她转身离开了。'], { assets });
    const last = floor.pages[floor.pages.length - 1];
    assert.ok(last.cast.some((m) => m.character === '小雪'));
});
