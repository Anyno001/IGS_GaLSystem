import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import '../src/visual/igs-ui/scene-audio.js';
import { buildPackRegistry, normalizePack, validatePacks } from '../src/scene/fx-packs.js';
import { PACK } from '../src/visual/igs-ui/fx-pack-harem.js';
import { HAREM_RANKS, favorValueOf, parseRoster, probeGoodOf, rankEdictOf, rankIndexOf, recordKeepOf, sortRoster } from '../src/visual/igs-ui/fx-harem-model.js';
import { resolveHaremAmbience, planHaremAmbient } from '../src/visual/igs-ui/fx-harem-ambience.js';
import { HAREM_SFX_DEFS } from '../src/visual/igs-ui/fx-harem-sfx.js';
import { HAREM_STYLE_TEXT } from '../src/visual/igs-ui/fx-harem-style.js';
import { normalizeDailyFxSettings } from '../src/visual/igs-ui/fx-daily-model.js';

const pack = normalizePack(PACK);
const reg = buildPackRegistry([PACK]);

function el(doc) {
    const node = {
        className: '', innerHTML: '', style: { setProperty() {} }, children: [], ownerDocument: doc, _attrs: {},
        setAttribute(k, v) { this._attrs[k] = v; }, getAttribute(k) { return this._attrs[k] ?? null; },
        appendChild(c) { this.children.push(c); return c; }, querySelector() { return null; }, querySelectorAll() { return []; },
        classList: { add() {} },
    };
    return node;
}
const doc = { createElement: () => el(doc) };
const root = { querySelector: () => null, querySelectorAll: () => [] };
const env = (extra = {}) => ({ doc, root, hold: 1, reduced: true, ancient: true, worldview: 'ancient', speaker: '甲', cast: [], ...extra });

const SAMPLES = {
    hmrank: ['林婉', '贵人', '嫔'],
    hmfavor: ['林婉', '80', '60'],
    hmboard: ['林婉:贵妃;苏浅:嫔;周氏:答应'],
    hmflip: ['林婉', '苏浅;周氏'],
    hmselect: ['留牌子', '林婉'],
    hmrecord: ['留', '林婉'],
    hmannounce: ['皇上驾到'],
    hmgreet: ['晨', '林婉:贵妃;苏浅:嫔'],
    hmreward: ['玉如意;锦缎十匹', '林婉'],
    hmprobe: ['银针', '发黑'],
    hmpunish: ['掌嘴', '周氏'],
    hmtray: ['白绫', '周氏'],
    hmthread: ['林婉', '滑脉'],
    hmcongrats: ['林婉'],
    hmglare: ['苏浅;周氏>林婉'],
};

test('gate:harem-pack manifest is complete, opt-in and ancient only', () => {
    assert.equal(pack.era, 'ancient');
    assert.equal(pack.kinds.length, 15);
    assert.deepEqual(validatePacks([pack]), []);
    for (const kind of pack.kinds) {
        assert.ok(pack.labels[kind], `${kind} label`);
        const words = pack.triggers[kind];
        assert.ok(words.length >= 2 && words.length <= 4, `${kind} triggers`);
        assert.ok(pack.promptLines[kind].includes(`[igs-fx:${kind}`), `${kind} prompt`);
        assert.equal(typeof pack.builders[kind], 'function');
        assert.ok(SAMPLES[kind], `${kind} has sample`);
    }
    assert.deepEqual(reg.eraTables.ancient, [...pack.kinds]);
    assert.deepEqual(reg.eraTables.modern, []);
    const defaults = normalizeDailyFxSettings({});
    assert.equal(defaults.packHarem, false);
});

test('gate:harem-pack parse yields item for every kind and rejects missing required fields', () => {
    for (const kind of pack.kinds) {
        const parsed = reg.parse(kind, SAMPLES[kind]);
        assert.ok(parsed, `${kind} parses`);
        assert.equal(parsed[0], kind);
        const item = reg.itemOf(parsed);
        assert.equal(item.type, kind);
    }
    assert.deepEqual(reg.itemOf(reg.parse('hmrank', ['林婉', '贵人', '嫔'])), { type: 'hmrank', who: '林婉', from: '贵人', to: '嫔' });
    assert.deepEqual(reg.itemOf(reg.parse('hmrank', ['林婉', '妃'])), { type: 'hmrank', who: '林婉', from: '', to: '妃' });
    assert.equal(reg.parse('hmrank', ['林婉']), null);
    assert.equal(reg.parse('hmfavor', ['林婉', '很高']), null);
    assert.equal(reg.itemOf(reg.parse('hmfavor', ['林婉', '180'])).value, 100);
    assert.equal(reg.parse('hmboard', ['']), null);
    assert.equal(reg.parse('hmselect', ['随便', '林婉']), null);
    assert.equal(reg.parse('hmprobe', ['茶水']), null);
    assert.equal(reg.parse('hmpunish', ['罚抄']), null);
    assert.equal(reg.parse('hmtray', ['汤']), null);
    assert.equal(reg.parse('hmglare', ['苏浅']), null);
    assert.deepEqual(reg.itemOf(reg.parse('hmglare', ['苏浅;周氏>林婉'])), { type: 'hmglare', sources: '苏浅;周氏', target: '林婉' });
    assert.equal(reg.itemOf(reg.parse('hmannounce', [''])).text, '皇上驾到');
    assert.equal(reg.itemOf(reg.parse('hmrecord', ['不留', '林婉'])).keep, false);
    assert.equal(reg.itemOf(reg.parse('hmrecord', ['留', '林婉'])).keep, true);
    assert.equal(reg.itemOf(reg.parse('hmgreet', ['昏', '林婉:妃'])).part, 'dusk');
});

test('gate:harem-pack model rank ladder and helpers', () => {
    assert.deepEqual([...HAREM_RANKS], ['皇后', '皇贵妃', '贵妃', '妃', '嫔', '贵人', '常在', '答应']);
    assert.equal(rankIndexOf('皇贵妃'), 1);
    assert.equal(rankIndexOf('贵妃娘娘'), 2);
    assert.equal(rankIndexOf('常在'), 6);
    assert.equal(rankIndexOf('宫女'), -1);
    assert.match(rankEdictOf('林婉', '贵人', '嫔'), /晋封为嫔/);
    assert.match(rankEdictOf('林婉', '嫔', '常在'), /降为常在/);
    assert.equal(favorValueOf('恩宠 72'), 72);
    assert.equal(parseRoster('甲:妃;乙:嫔;;').length, 2);
    assert.deepEqual(sortRoster(parseRoster('甲:嫔;乙:贵妃;丙:无名')).map((r) => r.name), ['乙', '甲', '丙']);
    assert.equal(recordKeepOf('不留'), false);
    assert.equal(recordKeepOf('留'), true);
    assert.equal(probeGoodOf('needle', '银针发黑'), false);
    assert.equal(probeGoodOf('blood', ''), true);
});

test('gate:harem-pack builders return static nodes under reduced motion', () => {
    for (const kind of pack.kinds) {
        const item = reg.itemOf(reg.parse(kind, SAMPLES[kind]));
        const built = pack.builders[kind](item, env());
        assert.ok(built && built.node, `${kind} builds`);
        assert.ok(['front', 'stage'].includes(built.layer));
        assert.ok(built.life > 0);
        assert.ok(built.sounds.length >= 1);
        for (const s of built.sounds) assert.ok(s === 'paper' || HAREM_SFX_DEFS[s], `${kind} sound ${s}`);
        assert.match(built.node.className, /igs-dfx igs-dfx-hm/);
    }
    const slow = pack.builders.hmboard(reg.itemOf(reg.parse('hmboard', SAMPLES.hmboard)), env({ hold: 1.6 }));
    const base = pack.builders.hmboard(reg.itemOf(reg.parse('hmboard', SAMPLES.hmboard)), env());
    assert.equal(slow.life, Math.round(base.life * 1.6));
});

test('gate:harem-pack reduced announce skips per-char animation and sprite motion', () => {
    const built = pack.builders.hmannounce({ type: 'hmannounce', text: '皇上驾到' }, env());
    assert.ok(!built.node.innerHTML.includes('animation-delay'));
    assert.ok(built.node.innerHTML.includes('皇上驾到'));
});

test('gate:harem-pack record keep emits no cue event and builds both outcomes', () => {
    const cues = [];
    const keep = pack.builders.hmrecord({ type: 'hmrecord', keep: true, who: '林婉' }, env({ onPackCue: (c) => cues.push(c) }));
    const no = pack.builders.hmrecord({ type: 'hmrecord', keep: false, who: '林婉' }, env({ onPackCue: (c) => cues.push(c) }));
    assert.deepEqual(cues, []);
    assert.ok(keep.node.innerHTML.includes('hm-cart') && !no.node.innerHTML.includes('hm-cart'));
    assert.doesNotThrow(() => pack.builders.hmrecord({ type: 'hmrecord', keep: true, who: '' }, env()));
});

test('gate:harem-pack rank-down uses grey tone, rank-up uses gold', () => {
    const down = pack.builders.hmrank({ type: 'hmrank', who: '林婉', from: '嫔', to: '常在' }, env());
    const up = pack.builders.hmrank({ type: 'hmrank', who: '林婉', from: '贵人', to: '嫔' }, env());
    assert.match(down.node.className, /is-down/);
    assert.doesNotMatch(up.node.className, /is-down/);
    assert.deepEqual(down.sounds, ['hm-rank-down', 'hm-seal']);
});

test('gate:harem-pack ambience resolves four ancient places only', () => {
    const ancient = { worldview: 'ancient' };
    assert.equal(resolveHaremAmbience('钟粹宫', ancient).kind, 'hmbed');
    assert.equal(resolveHaremAmbience('御花园', ancient).kind, 'hmgarden');
    assert.equal(resolveHaremAmbience('冷宫', ancient).kind, 'hmcold');
    assert.equal(resolveHaremAmbience('东长街', ancient).kind, 'hmlane');
    assert.equal(resolveHaremAmbience('御花园', { worldview: 'modern' }), null);
    assert.equal(resolveHaremAmbience('集市', ancient), null);
    assert.deepEqual(reg.resolveAmbience('冷宫', { worldview: 'ancient', enabled: ['harem'] }), { kind: 'hmcold', variant: '' });
    assert.equal(reg.resolveAmbience('冷宫', { worldview: 'ancient', enabled: [] }), null);
    for (const kind of pack.ambience.still) assert.ok(pack.ambience.html[kind]);
});

test('gate:harem-pack night watch ambient only at night in ancient palace places', () => {
    const ctx = { worldview: 'ancient', location: '永巷', packs: ['harem'] };
    assert.deepEqual(planHaremAmbient(ctx, { night: false }), []);
    assert.deepEqual(planHaremAmbient(ctx, { night: true }).map((x) => x.kind), ['hmwatch', 'hmlantern']);
    assert.deepEqual(planHaremAmbient({ ...ctx, location: '御花园' }, { night: true }).map((x) => x.kind), ['hmwatch']);
    assert.deepEqual(planHaremAmbient({ ...ctx, worldview: 'modern' }, { night: true }), []);
    assert.deepEqual(reg.ambientCandidates(ctx, { night: true }).map((x) => x.kind), ['hmwatch', 'hmlantern']);
    const voices = pack.ambient.voices({});
    for (const kind of pack.ambient.kinds) assert.equal(typeof voices[kind], 'function');
});

test('gate:harem-pack sources avoid canvas and mask-image url, css has low-quality guard', () => {
    for (const file of ['fx-pack-harem', 'fx-harem', 'fx-harem-model', 'fx-harem-style', 'fx-harem-sfx', 'fx-harem-ambience']) {
        const src = readFileSync(new URL(`../src/visual/igs-ui/${file}.js`, import.meta.url), 'utf8');
        assert.doesNotMatch(src, /canvas/i, file);
        assert.doesNotMatch(src, /mask-image\s*:\s*url/i, file);
        assert.doesNotMatch(src, /TODO|@param/, file);
    }
    assert.match(HAREM_STYLE_TEXT, /data-igs-quality="low"/);
    assert.doesNotMatch(HAREM_STYLE_TEXT, /@@/);
    assert.ok(HAREM_STYLE_TEXT.includes('#igs-overlay .hm-ladder'));
});

test('gate:harem-hmfavor-hmboard own sounds are defined', () => {
    assert.ok(HAREM_SFX_DEFS['hm-favor']);
    assert.ok(HAREM_SFX_DEFS['hm-board']);
    const src = readFileSync(new URL('../src/visual/igs-ui/fx-harem.js', import.meta.url), 'utf8');
    assert.ok(src.includes("sounds: ['hm-favor']"));
    assert.ok(src.includes("sounds: ['hm-board']"));
});
