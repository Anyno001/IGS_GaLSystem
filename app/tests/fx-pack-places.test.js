import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildPackRegistry, normalizePack, packFxOf, validatePacks } from '../src/scene/fx-packs.js';
import { parseDailyFxBody } from '../src/scene/daily-fx-directives.js';
import { normalizeDailyFxSettings, DAILY_FX_LABELS } from '../src/visual/igs-ui/fx-daily-model.js';
import { PACK } from '../src/visual/igs-ui/fx-pack-places.js';
import { PLACES_BUILDERS } from '../src/visual/igs-ui/fx-places-render.js';
import { PLACES_AMBIENCE_HTML } from '../src/visual/igs-ui/fx-places-style.js';
import { createPlacesVoices, placesAmbientPlan } from '../src/visual/igs-ui/fx-places-voices.js';
import { floorFrames, parsePlacesFx, placesFxOf, resolvePlaceKind } from '../src/visual/igs-ui/fx-places-model.js';
import { getVoiceFilter, resetVoiceFilterForTest } from '../src/visual/igs-ui/voice-filter.js';
import { AMBIENT_MUFFLE_EVENT, applySceneAudio, cancelSceneAudio, resolveAmbientPlan } from '../src/visual/igs-ui/scene-audio.js';
import { makeStage } from './helpers/fake-dom.js';

const KINDS = ['elevator', 'eavesdrop', 'concert', 'flashes', 'race', 'chest', 'levelup', 'quest', 'route', 'gust'];
const SRC_DIR = new URL('../src/visual/igs-ui/', import.meta.url);
const FILES = ['fx-pack-places.js', 'fx-places-model.js', 'fx-places-render.js', 'fx-places-sfx.js', 'fx-places-style.js', 'fx-places-voices.js'];

function envOf(extra = {}) {
    const root = makeStage();
    return { root, doc: root.ownerDocument, reduced: true, hold: 1, ancient: false, worldview: '', panelSkin: '', play() {}, ...extra };
}

const SAMPLES = {
    elevator: ['elevator', '12'],
    eavesdrop: ['eavesdrop', '她说今晚不回来'],
    concert: ['concert', '夏日回响'],
    flashes: ['flashes', '6'],
    race: ['race', 'finish', '林晓', '12.8秒'],
    chest: ['chest', '龙鳞胸甲', 'legend'],
    levelup: ['levelup', '15', '生命上限 +20'],
    quest: ['quest', '讨伐哥布林', '200 金币', 'take'],
    route: ['route', '王都', '黑森林', '雪山'],
    gust: ['gust'],
};

test('gate:places-pack registry complete, valid and opt-in default off', () => {
    assert.deepEqual([...PACK.kinds], KINDS);
    assert.deepEqual(validatePacks([normalizePack(PACK)]), []);
    for (const kind of KINDS) {
        assert.ok(PACK.labels[kind], kind);
        assert.ok(PACK.triggers[kind].length >= 2 && PACK.triggers[kind].length <= 4, `${kind} triggers`);
        assert.ok(PACK.promptLines[kind].startsWith(`[igs-fx:${kind}`), kind);
        assert.equal(typeof PLACES_BUILDERS[kind], 'function', kind);
        assert.ok(DAILY_FX_LABELS[kind], `${kind} label in settings`);
    }
    const settings = normalizeDailyFxSettings({ enabled: true });
    // 地点与场景是通用演出包（defaultOn）：总开关与各 kind 默认开，显式写 false 才关。
    for (const kind of KINDS) assert.equal(settings[kind], true, kind);
    assert.equal(settings.packPlaces, true);
    assert.equal(PACK.defaultOn, true);
    assert.equal(PACK.era, null);
    assert.deepEqual(PACK.eraKinds, { elevator: 'modern', concert: 'modern', flashes: 'modern', race: 'modern' });
    const registry = buildPackRegistry([PACK]);
    assert.deepEqual(registry.packs[0].kinds, KINDS);
    assert.deepEqual(registry.eraTables.modern.sort(), ['concert', 'elevator', 'flashes', 'race']);
});

test('gate:places-pack parse fields', () => {
    assert.deepEqual(parseDailyFxBody('elevator', ['12']), ['elevator', '12']);
    assert.deepEqual(placesFxOf(parseDailyFxBody('elevator', ['B2'])), { type: 'elevator', floor: 'B2' });
    assert.deepEqual(parsePlacesFx('eavesdrop', []), ['eavesdrop', '']);
    assert.deepEqual(parsePlacesFx('flashes', ['99']), ['flashes', '6']);
    assert.deepEqual(parsePlacesFx('flashes', ['4']), ['flashes', '4']);
    assert.equal(parsePlacesFx('race', ['乱写']), null);
    assert.deepEqual(placesFxOf(parsePlacesFx('race', ['冲线', '林晓', '12.8'])), { type: 'race', phase: 'finish', a: '林晓', b: '12.8' });
    assert.deepEqual(parsePlacesFx('race', ['记分', '红队 3', '蓝队 2']), ['race', 'score', '红队 3', '蓝队 2']);
    assert.deepEqual(parsePlacesFx('chest', ['短剑', '史诗']), ['chest', '短剑', 'epic']);
    assert.deepEqual(parsePlacesFx('chest', ['短剑']), ['chest', '短剑', 'common']);
    assert.equal(parsePlacesFx('levelup', ['零']), null);
    assert.deepEqual(parsePlacesFx('levelup', ['7']), ['levelup', '7', '']);
    assert.equal(parsePlacesFx('quest', []), null);
    assert.deepEqual(parsePlacesFx('quest', ['采药', '', '完成']), ['quest', '采药', '', 'done']);
    assert.equal(parsePlacesFx('route', ['王都']), null);
    assert.deepEqual(parsePlacesFx('route', ['王都>黑森林>雪山']), ['route', '王都', '黑森林', '雪山']);
    assert.equal(parsePlacesFx('route', ['a', 'b', 'c', 'd', 'e', 'f', 'g']).length, 7);
    assert.deepEqual(floorFrames('3'), ['1', '2', '3']);
    assert.equal(floorFrames('30').length, 7);
    assert.equal(floorFrames('30').at(-1), '30');
    assert.deepEqual(floorFrames('B3'), ['B1', 'B2', 'B3']);
    assert.deepEqual(floorFrames('顶层'), ['顶层']);
});

test('gate:places-pack builders return static nodes under reduced motion', () => {
    for (const kind of KINDS) {
        const item = placesFxOf(SAMPLES[kind]);
        const env = envOf();
        const built = PLACES_BUILDERS[kind](item, env);
        assert.ok(built && built.node, kind);
        assert.ok(['stage', 'front'].includes(built.layer), kind);
        assert.ok(built.life > 0, kind);
        assert.ok(String(built.node.className).includes('is-reduced'), `${kind} reduced class`);
        for (const sound of built.sounds) assert.ok(PACK.sfx[sound], `${kind} sound ${sound}`);
    }
    const hold = PLACES_BUILDERS.chest(placesFxOf(SAMPLES.chest), envOf({ hold: 1.5 }));
    const base = PLACES_BUILDERS.chest(placesFxOf(SAMPLES.chest), envOf());
    assert.ok(hold.life > base.life);
});

test('gate:places-pack concert glowsticks capped, flashes safe rate, races cover three phases', () => {
    const concert = PLACES_BUILDERS.concert({ song: '' }, envOf());
    assert.ok((concert.node.innerHTML.match(/igs-pl-stick"/g) || []).length <= 12);
    const flashes = PLACES_BUILDERS.flashes({ count: 9 }, envOf({ reduced: false }));
    const delays = [...flashes.node.innerHTML.matchAll(/animation-delay:(\d+)ms/g)].map((m) => Number(m[1]));
    assert.equal(delays.length, 9);
    assert.ok(delays[1] - delays[0] >= 300, 'flashes spaced under 3 per second');
    assert.equal((PLACES_BUILDERS.flashes({ count: 9 }, envOf()).node.innerHTML.match(/igs-pl-flash"/g) || []).length, 3);
    assert.ok(PLACES_BUILDERS.race({ phase: 'start' }, envOf()).node.className.includes('is-start'));
    assert.ok(PLACES_BUILDERS.race({ phase: 'finish', a: 'A', b: '9.8' }, envOf()).node.className.includes('is-finish'));
    assert.match(PLACES_BUILDERS.race({ phase: 'score', a: '3:2', b: '' }, envOf()).node.innerHTML, /<b>3<\/b>.*<b>2<\/b>/);
});

test('gate:places-pack eavesdrop muffles voices and ambience then restores', () => {
    resetVoiceFilterForTest();
    const realSet = globalThis.setTimeout;
    const timers = [];
    globalThis.setTimeout = (fn, ms) => { timers.push({ fn, ms }); return timers.length; };
    globalThis.clearTimeout = () => {};
    try {
        const events = [];
        const env = envOf();
        env.doc.dispatchEvent = (event) => { events.push(event); return true; };
        PLACES_BUILDERS.eavesdrop({ heard: '' }, env);
        assert.equal(getVoiceFilter(), 'muffled');
        assert.equal(events.length, 1);
        assert.equal(events[0].type, AMBIENT_MUFFLE_EVENT);
        assert.equal(events[0].detail.on, true);
        timers.at(-1).fn();
        assert.equal(getVoiceFilter(), 'none');
    } finally {
        globalThis.setTimeout = realSet;
    }
});

function fakeParam() {
    return { value: 0, history: [], setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime(v) { this.history.push(v); } };
}

function fakeAudio() {
    const biquads = [];
    const node = () => ({ connect() {}, disconnect() {}, start() {}, stop() {}, gain: fakeParam(), frequency: fakeParam(), Q: fakeParam(), pan: fakeParam() });
    const ctx = {
        currentTime: 0, sampleRate: 8000, destination: node(), state: 'running', resume: () => Promise.resolve(),
        createGain: node,
        createBiquadFilter() { const n = node(); biquads.push(n); return n; },
        createBufferSource: node, createOscillator: node, createStereoPanner: node, createConvolver: node,
        createBuffer: (channels, length) => ({ getChannelData: () => new Float32Array(length), length }),
    };
    return { ctx, biquads };
}

test('gate:places-pack scene-audio muffle event lowers the ambient lowpass only', () => {
    const listeners = [];
    const ownerDocument = { addEventListener: (t, f) => listeners.push({ t, f }), removeEventListener: (t, f) => { const i = listeners.findIndex((l) => l.t === t && l.f === f); if (i >= 0) listeners.splice(i, 1); } };
    const root = { ownerDocument, addEventListener() {}, removeEventListener() {} };
    const queue = [];
    const { ctx, biquads } = fakeAudio();
    const opts = { ambient: { enabled: true }, contextFactory: () => ctx, schedule: (fn, ms) => { const t = { fn, ms }; queue.push(t); return t; }, clear: (t) => { const i = queue.indexOf(t); if (i >= 0) queue.splice(i, 1); } };
    applySceneAudio(root, { ...opts, context: { location: '森林', time: '清晨' } });
    const low = biquads[1];
    assert.ok(listeners.some((l) => l.t === AMBIENT_MUFFLE_EVENT));
    const fire = listeners.find((l) => l.t === AMBIENT_MUFFLE_EVENT).f;
    fire({ detail: { on: true, ms: 3000 } });
    assert.equal(low.frequency.history.at(-1), 700);
    const restore = queue.find((t) => t.ms === 3000);
    assert.ok(restore, 'auto restore scheduled');
    restore.fn();
    assert.equal(low.frequency.history.at(-1), 20000);
    fire({ detail: { on: true, ms: 99999 } });
    assert.ok(queue.some((t) => t.ms === 12000), 'muffle capped');
    fire({ detail: { on: false } });
    assert.equal(low.frequency.history.at(-1), 20000);
    assert.equal(cancelSceneAudio(root), true);
    assert.equal(listeners.filter((l) => l.t === AMBIENT_MUFFLE_EVENT).length, 0);
});

test('gate:places-pack place layers resolve per worldview and respect opt-in', () => {
    assert.equal(resolvePlaceKind('市立医院病房').kind, 'plhospital');
    assert.equal(resolvePlaceKind('24小时便利店').kind, 'plkonbini');
    assert.equal(resolvePlaceKind('警戒线外的现场').kind, 'plpolice');
    assert.equal(resolvePlaceKind('地下城第三层').kind, 'pldungeon');
    assert.equal(resolvePlaceKind('厨房', 'ancient').variant, 'ancient');
    assert.equal(resolvePlaceKind('医院', 'ancient'), null);
    assert.equal(resolvePlaceKind('洋馆', 'ancient'), null);
    assert.equal(resolvePlaceKind('地下城', 'magic').variant, 'magic');
    assert.equal(resolvePlaceKind('教室'), null);
    for (const kind of ['plpolice', 'plhospital', 'plkonbini', 'plkitchen', 'plmansion', 'plneonrain', 'plshrine', 'plgym', 'pldungeon']) assert.ok(PLACES_AMBIENCE_HTML[kind], kind);
    assert.deepEqual(PACK.ambience.still.filter((k) => !PLACES_AMBIENCE_HTML[k]), []);
    const on = { enabled: true };
    const plan = resolveAmbientPlan({ location: '医院病房', packs: ['places'] }, on);
    assert.ok(plan.some((l) => l.kind === 'plhospital'));
    assert.ok(!resolveAmbientPlan({ location: '医院病房', packs: [] }, on).some((l) => l.kind === 'plhospital'));
    assert.deepEqual(placesAmbientPlan({ location: '洋馆大厅', worldview: '' }, { night: true }), [{ kind: 'plmansion', level: 'light', variant: '' }]);
    assert.deepEqual(placesAmbientPlan({ location: '教室' }), []);
    assert.deepEqual(PACK.ambient.kinds.filter((k) => !PACK.ambient.labels[k]), []);
});

test('gate:places-pack voices build without throwing', () => {
    const calls = [];
    const stub = () => ({});
    const h = {
        rand: (a, b) => (a + b) / 2, chain: (...n) => n.at(-1), makeNoise: stub, makeFilter: stub, makeGain: () => ({ gain: {} }), makeLfo: stub,
        layerLater: (layer, fn, ms) => calls.push({ fn, ms }), noiseBurst: stub, blip: stub, footsteps: stub, FLOOR: 0.0001,
    };
    const voices = createPlacesVoices(h);
    assert.deepEqual(Object.keys(voices).sort(), [...PACK.ambient.kinds].sort());
    for (const voice of Object.values(voices)) voice({ ctx: { currentTime: 1 }, out: {}, variant: 'ancient' });
    assert.ok(calls.length >= 16);
    for (const call of calls.slice(0, 40)) call.fn();
});

test('gate:places-pack gust resolves through the pack registry', () => {
    assert.deepEqual(parsePlacesFx('gust', []), ['gust']);
    assert.deepEqual(parseDailyFxBody('gust', []), ['gust']);
    assert.deepEqual(placesFxOf(['gust']), { type: 'gust' });
    assert.deepEqual(packFxOf(['gust']), { type: 'gust' });
});

test('gate:places-pack source avoids canvas and mask-image url', () => {
    for (const file of FILES) {
        const source = fs.readFileSync(new URL(file, SRC_DIR), 'utf8');
        assert.ok(!/canvas/i.test(source), `${file} canvas`);
        assert.ok(!/mask-image\s*:\s*url/i.test(source), `${file} mask-image url`);
        assert.ok(!/\r/.test(source), `${file} LF`);
        assert.ok(!/chat-sfx/.test(source.replace(/^\/\/.*$/gm, '')), `${file} imports chat-sfx (cycle)`);
    }
});

test('gate:places-quest three states each use their own sound and stamp', () => {
    for (const state of ['take', 'done', 'fail']) {
        const built = PLACES_BUILDERS.quest({ type: 'quest', title: '采药', reward: '10 金币', state }, envOf());
        assert.deepEqual(built.sounds, [`pl-quest-${state}`]);
        assert.ok(PACK.sfx[`pl-quest-${state}`], state);
        assert.ok(built.node.innerHTML.includes(`igs-pl-stamp is-${state}`), state);
    }
    const ancient = PLACES_BUILDERS.quest({ type: 'quest', title: '采药', reward: '', state: 'done' }, envOf({ ancient: true }));
    assert.ok(ancient.node.innerHTML.includes('is-scroll'));
    assert.ok(ancient.node.innerHTML.includes('igs-pl-q-check'));
});
