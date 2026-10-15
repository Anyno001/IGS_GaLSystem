import test from 'node:test';
import assert from 'node:assert/strict';
import { PETAL_KIND_NAMES, planLanterns } from '../src/visual/igs-ui/fx-daily-particles.js';
import { renderDailyFx } from '../src/visual/igs-ui/fx-daily.js';
import { dailyFxOf, parseDailyFxBody } from '../src/scene/daily-fx-directives.js';
import { PACK } from '../src/visual/igs-ui/fx-pack-festival.js';
import { FX_PACKS_ACTIVE, buildPackRegistry, validatePacks, packOfKind } from '../src/scene/fx-packs.js';
import { normalizeDailyFxSettings } from '../src/visual/igs-ui/fx-daily-model.js';
import { DAILY_SFX } from '../src/visual/igs-ui/fx-daily-sfx.js';
import { DAILY_FX_STYLE_TEXT } from '../src/visual/igs-ui/fx-daily-style.js';
import { applyFxEra } from '../src/scene/fx-era.js';
import { makeStage, makeTimers } from './helpers/fake-dom.js';

const KINDS = ['birthday', 'countdown', 'xmas', 'redpacket', 'ring', 'wedding', 'test', 'riverlamp'];

const item = (type, ...fields) => dailyFxOf(parseDailyFxBody(type, fields));

test('gate:festival-pack registers every kind, default off, valid manifest', () => {
    assert.deepEqual([...PACK.kinds], KINDS);
    assert.deepEqual(validatePacks(buildPackRegistry([PACK]).packs), []);
    assert.ok(FX_PACKS_ACTIVE.some((pack) => pack.id === 'festival'));
    const settings = normalizeDailyFxSettings({ enabled: true });
    assert.equal(settings.packFestival, false);
    for (const kind of KINDS) {
        assert.equal(settings[kind], false, kind);
        assert.equal(packOfKind(kind).id, 'festival', kind);
        assert.ok(PACK.triggers[kind].length >= 2 && PACK.triggers[kind].length <= 4, kind);
        assert.ok(PACK.promptLines[kind].includes(`igs-fx:${kind}`), kind);
        assert.equal(typeof PACK.builders[kind], 'function', kind);
    }
    assert.equal(PACK.eraKinds.birthday, 'modern');
    assert.equal(PACK.eraKinds.xmas, 'modern');
    assert.equal(PACK.eraKinds.riverlamp, 'ancient');
});

test('gate:festival-pack parses fields', () => {
    assert.deepEqual(item('birthday', '小雪', '5岁'), { type: 'birthday', name: '小雪', age: '5' });
    assert.deepEqual(item('birthday', '18'), { type: 'birthday', name: '', age: '18' });
    assert.deepEqual(item('birthday'), { type: 'birthday', name: '', age: '' });
    assert.deepEqual(item('countdown', '5', '新年'), { type: 'countdown', count: '5', label: '新年' });
    assert.equal(item('countdown', '99').count, '10');
    assert.equal(item('countdown', '1').count, '3');
    assert.deepEqual(item('countdown'), { type: 'countdown', count: '5', label: '' });
    assert.deepEqual(item('countdown', '除夕'), { type: 'countdown', count: '5', label: '除夕' });
    assert.deepEqual(item('redpacket', '¥520', '新年快乐'), { type: 'redpacket', amount: '¥520', wish: '新年快乐' });
    assert.deepEqual(item('redpacket', '一盒巧克力', '情人节快乐'), { type: 'redpacket', gift: '一盒巧克力', wish: '情人节快乐' });
    assert.deepEqual(item('redpacket'), { type: 'redpacket', amount: '', wish: '' });
    assert.deepEqual(item('wedding', '中式', '白头偕老'), { type: 'wedding', style: 'cn', text: '白头偕老' });
    assert.deepEqual(item('wedding', '西式'), { type: 'wedding', style: 'west', text: '' });
    assert.deepEqual(item('wedding', '愿同心'), { type: 'wedding', style: '', text: '愿同心' });
    assert.deepEqual(item('test', '阳性'), { type: 'test', result: 'pos' });
    assert.deepEqual(item('test', '两道杠'), { type: 'test', result: 'pos' });
    assert.deepEqual(item('test', '没有怀孕'), { type: 'test', result: 'neg' });
    assert.deepEqual(item('test', '一道杠'), { type: 'test', result: 'neg' });
    assert.equal(parseDailyFxBody('test', ['再看看']), null);
    assert.deepEqual(item('xmas', '圣诞快乐'), { type: 'xmas', text: '圣诞快乐' });
    assert.deepEqual(item('ring', '钻戒'), { type: 'ring', text: '钻戒' });
    assert.deepEqual(item('riverlamp', '平安'), { type: 'riverlamp', text: '平安' });
});

function mount(type, fields, { reduced, ancient = false } = {}) {
    const root = makeStage();
    const timers = makeTimers();
    const sounds = [];
    const parsed = item(type, ...fields);
    const result = renderDailyFx(root, {
        messageId: 7,
        readerSettings: { dailyFx: { enabled: true, petals: false, packFestival: true, [type]: true }, _ancientEra: ancient },
        content: { currentIndex: 0, fx: { daily: [parsed] } },
    }, { schedule: timers.schedule, clear: timers.clear, reducedMotion: reduced, playSfx: (k) => sounds.push(k) });
    return { root, result, sounds };
}

const layerOf = (root, id) => root.querySelector(id).children;

test('gate:festival-pack builders mount nodes, reduced marks them static, sounds exist', () => {
    const cases = [['birthday', ['小雪', '5']], ['countdown', ['5']], ['xmas', []], ['redpacket', ['520']], ['redpacket', ['巧克力']], ['ring', []], ['wedding', ['西式']], ['wedding', ['中式']], ['test', ['阳性']], ['riverlamp', ['平安']]];
    for (const [type, fields] of cases) {
        for (const reduced of [true, false]) {
            const ancient = type === 'riverlamp' || fields[0] === '中式';
            const { root, result, sounds } = mount(type, fields, { reduced, ancient });
            assert.deepEqual(result.played, [type], `${type} ${reduced}`);
            const nodes = [...layerOf(root, type === 'riverlamp' ? '#igs-fx-stage' : '#igs-fx-front')];
            assert.ok(nodes.some((node) => String(node.className).includes('igs-dfx-fest')), type);
            assert.ok(sounds.length >= 1, type);
            for (const sound of sounds) assert.ok(DAILY_SFX[sound], sound);
        }
    }
});

test('gate:festival-pack variants follow the worldview', () => {
    const modern = mount('countdown', ['4'], { reduced: true });
    assert.deepEqual(modern.sounds, ['fest-count-4']);
    const ancient = mount('countdown', ['4'], { reduced: true, ancient: true });
    assert.deepEqual(ancient.sounds, ['fest-count-4-cn']);
    assert.match(layerOf(ancient.root, '#igs-fx-front')[0].innerHTML, /igs-dfx-cd-couplet/);
    assert.doesNotMatch(layerOf(modern.root, '#igs-fx-front')[0].innerHTML, /igs-dfx-cd-couplet/);
    const gift = mount('redpacket', ['玫瑰'], { reduced: true });
    assert.match(layerOf(gift.root, '#igs-fx-front')[0].className, /igs-dfx-gift/);
    const envelope = mount('redpacket', ['88.8'], { reduced: true });
    assert.match(layerOf(envelope.root, '#igs-fx-front')[0].innerHTML, /88\.8/);
    const west = mount('wedding', [], { reduced: true });
    assert.match(layerOf(west.root, '#igs-fx-front')[0].className, /is-west/);
    const cn = mount('wedding', [], { reduced: true, ancient: true });
    assert.match(layerOf(cn.root, '#igs-fx-front')[0].className, /is-cn/);
});

test('gate:festival-pack escapes text and styles every kind', () => {
    const { root } = mount('ring', ['<img src=x>'], { reduced: true });
    assert.doesNotMatch(layerOf(root, '#igs-fx-front')[0].innerHTML, /<img/);
    for (const cls of ['bday', 'countdown', 'xmas', 'rp', 'gift', 'ring', 'wedding', 'pt', 'riverlamp']) assert.ok(DAILY_FX_STYLE_TEXT.includes(`igs-dfx-${cls}`), cls);
    assert.ok(DAILY_FX_STYLE_TEXT.includes('[data-igs-quality="low"] .igs-dfx-xmas-snow'));
});

test('gate:festival-pack era split strips modern and ancient kinds', () => {
    const reader = { dailyFx: { enabled: true, packFestival: true, birthday: true, xmas: true, riverlamp: true, ring: true } };
    const modern = applyFxEra(reader, false);
    assert.equal(modern.dailyFx.birthday, true);
    assert.equal(modern.dailyFx.riverlamp, false);
    const ancient = applyFxEra(reader, true);
    assert.equal(ancient.dailyFx.birthday, false);
    assert.equal(ancient.dailyFx.xmas, false);
    assert.equal(ancient.dailyFx.riverlamp, true);
    assert.equal(ancient.dailyFx.ring, true);
});

test('gate:festival-pack reduced builders start no particles and stay static', () => {
    const doc = makeStage().ownerDocument;
    let rafCalls = 0;
    doc.defaultView = { requestAnimationFrame: () => { rafCalls += 1; }, setTimeout: () => { rafCalls += 1; } };
    const env = { doc, root: makeStage(), reduced: true, hold: 2, ancient: false, play() {}, worldview: '', sprite: null };
    for (const [type, fields] of [['birthday', ['小雪']], ['countdown', ['5']], ['wedding', ['西式']], ['riverlamp', ['平安']]]) {
        const built = PACK.builders[type](PACK.of(PACK.parse(type, fields)), env);
        assert.ok(built.node.innerHTML.length > 20, type);
        assert.ok(built.life >= 4000, type);
    }
    assert.equal(rafCalls, 0);
    env.reduced = false;
    PACK.builders.birthday(PACK.of(PACK.parse('birthday', [])), { ...env, hold: 1 });
    assert.equal(rafCalls, 0, 'host not mounted yet, node has no children list in the fake DOM');
});

test('gate:festival-pack particles add confetti and a river lantern variant', () => {
    assert.ok(PETAL_KIND_NAMES.includes('confetti'));
    assert.ok(PETAL_KIND_NAMES.includes('sakura'));
    const sky = planLanterns({ width: 800, height: 600, count: 5 });
    const river = planLanterns({ width: 800, height: 600, count: 5, variant: 'river' });
    assert.equal(river.length, 5);
    assert.ok(sky.every((lamp) => lamp.rise > 0));
    assert.ok(river.every((lamp) => lamp.rise === 0 && lamp.drift > 0 && lamp.y0 >= 300));
});
