import test from 'node:test';
import assert from 'node:assert/strict';
import { PACK } from '../src/visual/igs-ui/fx-pack-variety.js';
import { FX_PACK_SFX_DEFS, FX_PACK_STYLE_TEXT, getPack, normalizePack, validatePacks } from '../src/scene/fx-packs.js';
import { VARIETY_KINDS, VARIETY_TRIGGERS, parseVarietyFxBody, varietyFxOf } from '../src/visual/igs-ui/fx-variety-model.js';
import { VARIETY_BUILDERS, VARIETY_LIFE_MS } from '../src/visual/igs-ui/fx-variety.js';
import { resolveVarietyAmbience, planVarietyAmbient, createVarietyVoices } from '../src/visual/igs-ui/fx-variety-ambience.js';
import { normalizeDailyFxSettings } from '../src/visual/igs-ui/fx-daily-model.js';
import { VARIETY_HOT_LINES, VARIETY_OBSERVER_LINES } from '../src/visual/igs-ui/danmaku-pools.js';
import { classifyLiveTopic } from '../src/visual/igs-ui/live-chatter.js';
import { makeStage } from './helpers/fake-dom.js';


const SAMPLES = {
    guest: ['小满', '24', '设计师', '爱笑;嘴硬'],
    caption: ['粉字', '心动暴击'],
    interview: ['小满', '其实我有点在意他'],
    observe: ['小满', '这个眼神我截图了;他脸红了'],
    rec: ['厨房机位'],
    vote: ['小满:3;阿杰:1', '今晚投票'],
    rank: ['小满:80;阿杰:65;阿宁:92', '心动值'],
    pulse: ['128', '小满'],
    relmap: ['小满>阿杰;阿杰=阿宁:暗恋'],
    pair: ['小满+阿杰;阿宁+老周', '约会抽卡'],
    exit: ['阿杰', '主动退出'],
    finale: ['我选你', '小满'],
    replay: ['心动瞬间', '小满'],
};

function env(doc, extra = {}) {
    return { root: makeStage(), doc, reduced: true, hold: 1, speaker: '小满', messageId: 5, ancient: false, worldview: 'modern', panelSkin: '', play() {}, ...extra };
}

test('gate:fx-pack-variety every kind registered, validated and off by default', () => {
    assert.equal(PACK.id, 'variety');
    assert.equal(PACK.era, 'modern');
    assert.deepEqual([...PACK.kinds], [...VARIETY_KINDS]);
    assert.equal(PACK.kinds.length, 13);
    const pack = normalizePack(PACK);
    assert.deepEqual(validatePacks([pack]), []);
    assert.equal(getPack('variety').kinds.length, 13);
    const legacy = normalizeDailyFxSettings({ enabled: true });
    for (const kind of VARIETY_KINDS) {
        assert.equal(legacy[kind], false, kind);
        assert.ok(PACK.labels[kind], kind);
        assert.ok(PACK.promptLines[kind].startsWith(`[igs-fx:${kind}`), kind);
        const words = VARIETY_TRIGGERS[kind];
        assert.ok(words.length >= 2 && words.length <= 4, kind);
        assert.equal(typeof PACK.builders[kind], 'function', kind);
    }
    assert.equal(legacy.packVariety, false);
});

test('gate:fx-pack-variety parse gives the documented fields', () => {
    const parsed = (type, fields) => varietyFxOf(parseVarietyFxBody(type, fields));
    assert.deepEqual(parsed('guest', SAMPLES.guest), { type: 'guest', name: '小满', age: '24', job: '设计师', tags: ['爱笑', '嘴硬'] });
    assert.equal(parseVarietyFxBody('guest', []), null);
    assert.deepEqual(parsed('caption', ['贴纸', '好甜']), { type: 'caption', style: 'sticker', text: '好甜' });
    assert.deepEqual(parsed('caption', ['盖章', '名场面']), { type: 'caption', style: 'stamp', text: '名场面' });
    assert.deepEqual(parsed('caption', ['心动暴击']), { type: 'caption', style: 'pink', text: '心动暴击' });
    assert.equal(parsed('caption', ['黑底']).text, '然而他不知道的是……');
    assert.equal(parseVarietyFxBody('caption', ['粉字']), null);
    assert.deepEqual(parsed('interview', ['其实我有点在意他']), { type: 'interview', who: '', text: '其实我有点在意他' });
    assert.equal(parsed('interview', SAMPLES.interview).who, '小满');
    assert.deepEqual(parsed('observe', ['评论一;评论二']), { type: 'observe', who: '', comments: ['评论一', '评论二'] });
    assert.deepEqual(parsed('rec', []), { type: 'rec', cam: '' });
    assert.deepEqual(parsed('vote', SAMPLES.vote), { type: 'vote', mode: 'tally', rows: [{ name: '小满', value: 3 }, { name: '阿杰', value: 1 }], title: '今晚投票' });
    assert.equal(parsed('vote', ['短信', '我在看你', '']).mode, 'sms');
    assert.equal(parseVarietyFxBody('vote', ['谁都没票']), null);
    assert.equal(parseVarietyFxBody('rank', ['只有一个:5']), null);
    assert.deepEqual(parsed('rank', SAMPLES.rank).rows.map((r) => r.value), [80, 65, 92]);
    assert.equal(parsed('pulse', ['999']).bpm, 220);
    assert.equal(parseVarietyFxBody('pulse', ['很快']), null);
    const map = parsed('relmap', SAMPLES.relmap);
    assert.deepEqual(map.edges, [{ from: '小满', to: '阿杰', mutual: false, label: '' }, { from: '阿杰', to: '阿宁', mutual: true, label: '暗恋' }]);
    assert.equal(parseVarietyFxBody('relmap', ['乱写']), null);
    assert.deepEqual(parsed('pair', SAMPLES.pair).pairs, [['小满', '阿杰'], ['阿宁', '老周']]);
    assert.deepEqual(parsed('exit', SAMPLES.exit), { type: 'exit', who: '阿杰', reason: '主动退出' });
    assert.deepEqual(parsed('finale', SAMPLES.finale), { type: 'finale', choice: '我选你', who: '小满' });
    assert.deepEqual(parsed('replay', SAMPLES.replay), { type: 'replay', title: '心动瞬间', who: '小满' });
});

test('gate:fx-pack-variety builders return static nodes under reduced motion', () => {
    const doc = makeStage().ownerDocument;
    for (const kind of VARIETY_KINDS) {
        const item = varietyFxOf(parseVarietyFxBody(kind, SAMPLES[kind]));
        assert.ok(item, kind);
        const built = VARIETY_BUILDERS[kind](item, env(doc));
        assert.ok(built && built.node, kind);
        assert.match(built.node.className, /\bis-reduced\b/, kind);
        assert.match(built.node.className, new RegExp(`igs-vy-${kind}`), kind);
        assert.ok(built.life >= VARIETY_LIFE_MS[kind], kind);
        assert.equal(built.layer, 'front', kind);
        assert.ok(built.sounds.length >= 1, kind);
        for (const sound of built.sounds) assert.ok(FX_PACK_SFX_DEFS[sound], `${kind}:${sound}`);
        const held = VARIETY_BUILDERS[kind](item, env(doc, { hold: 2 }));
        assert.ok(held.life > built.life, `${kind} life scales with hold`);
    }
    const dark = VARIETY_BUILDERS.caption({ type: 'caption', style: 'dark', text: '然而他不知道的是……' }, env(doc));
    assert.deepEqual(dark.sounds, ['vy-sting']);
    assert.match(dark.node.innerHTML, /igs-vy-dark-scrim/);
});

test('gate:fx-pack-variety user text is escaped', () => {
    const doc = makeStage().ownerDocument;
    const guest = VARIETY_BUILDERS.guest(varietyFxOf(parseVarietyFxBody('guest', ['<b>x</b>', '', '', '<i>t</i>'])), env(doc));
    assert.doesNotMatch(guest.node.children[0].innerHTML, /<b>x|<i>t/);
    const cap = VARIETY_BUILDERS.caption({ type: 'caption', style: 'sticker', text: '<script>1</script>' }, env(doc));
    assert.doesNotMatch(cap.node.innerHTML, /<script>/);
});

test('gate:fx-pack-variety cabin ambience resolves rooms and has a voice', () => {
    assert.deepEqual(resolveVarietyAmbience('恋爱小屋客厅'), { kind: 'vlounge', variant: '' });
    assert.equal(resolveVarietyAmbience('恋爱小屋厨房').kind, 'vkitchen');
    assert.equal(resolveVarietyAmbience('别墅泳池').kind, 'vpool');
    assert.equal(resolveVarietyAmbience('小屋露台').kind, 'vterrace');
    assert.equal(resolveVarietyAmbience('小区客厅'), null);
    assert.equal(resolveVarietyAmbience(''), null);
    assert.deepEqual(planVarietyAmbient({ location: '恋爱小屋泳池' }), [{ kind: 'cabin', level: 'light', variant: 'pool' }]);
    assert.deepEqual(planVarietyAmbient({ location: '教室' }), []);
    for (const kind of ['vlounge', 'vkitchen', 'vpool', 'vterrace']) assert.ok(PACK.ambience.html[kind], kind);
    assert.deepEqual(PACK.ambience.still, []);
    assert.deepEqual(PACK.ambient.kinds, ['cabin']);
    assert.ok(PACK.ambient.labels.cabin);
    const voices = createVarietyVoices({});
    assert.equal(typeof voices.cabin, 'function');
    assert.match(FX_PACK_STYLE_TEXT, /data-igs-quality="low"\] \.igs-dfx-amb:is\(\.is-vlounge/);
});

test('gate:fx-pack-variety pools feed observers and the live topic', () => {
    assert.ok(VARIETY_OBSERVER_LINES.length >= 20);
    assert.ok(VARIETY_HOT_LINES.length >= 15 && VARIETY_HOT_LINES.length <= 20);
    const topic = classifyLiveTopic('恋综的观察室里，嘉宾们都盯着屏幕。');
    assert.equal(topic && topic.name, 'variety');
});

test('gate:fx-pack-variety renders through the daily pipeline when the pack is on', async () => {
    const { renderDailyFx, cancelDailyFx } = await import('../src/visual/igs-ui/fx-daily.js');
    const { makeTimers } = await import('./helpers/fake-dom.js');
    const on = { enabled: true, petals: false, packVariety: true, ...Object.fromEntries(VARIETY_KINDS.map((kind) => [kind, true])) };
    for (const kind of VARIETY_KINDS) {
        const root = makeStage();
        const timers = makeTimers();
        const sounds = [];
        const item = varietyFxOf(parseVarietyFxBody(kind, SAMPLES[kind]));
        const result = renderDailyFx(root, {
            messageId: 5,
            readerSettings: { dailyFx: on, _worldview: 'modern' },
            content: { currentIndex: 0, fx: { daily: [item] } },
        }, { schedule: timers.schedule, clear: timers.clear, reducedMotion: true, playSfx: (k) => sounds.push(k) });
        assert.deepEqual(result.played, [kind], kind);
        assert.ok(sounds.length >= 1, kind);
        assert.equal(root.querySelector('#igs-fx-front').children.length, 1, kind);
        timers.advance(30000);
        assert.equal(root.querySelector('#igs-fx-front').children.length, 0, `${kind} cleaned up`);
        cancelDailyFx(root);
    }
    const off = makeStage();
    const result = renderDailyFx(off, {
        messageId: 6,
        readerSettings: { dailyFx: { ...on, packVariety: false }, _worldview: 'modern' },
        content: { currentIndex: 0, fx: { daily: [{ type: 'rec', cam: '' }] } },
    }, { schedule: makeTimers().schedule, clear() {}, reducedMotion: true, playSfx() {} });
    assert.deepEqual(result.played, []);
});
