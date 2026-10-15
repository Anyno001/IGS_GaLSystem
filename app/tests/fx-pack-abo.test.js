import test from 'node:test';
import assert from 'node:assert/strict';
import { PACK } from '../src/visual/igs-ui/fx-pack-abo.js';
import { ABO_KINDS, aboFxOf, parseAboFxBody, phaseRatioOf, scentColorOf } from '../src/visual/igs-ui/fx-abo-model.js';
import { ABO_SFX_DEFS } from '../src/visual/igs-ui/fx-abo-sfx.js';
import { makeStage } from './helpers/fake-dom.js';

const FIELDS = {
    scent: ['雪松', '冷杉', '#8a6a4a'],
    scentlink: ['甲', '乙'],
    suppress: ['甲', '全场'],
    soothe: ['甲'],
    inhibitor: ['失效', '强效抑制剂'],
    bond: ['乙', '终身'],
    gendertest: ['乙', 'Omega'],
    match: ['甲', '乙', '87%'],
    nest: ['乙'],
    detector: ['92', '地铁站'],
    phase: ['发情期', '3/7', '乙'],
};

function item(kind) {
    return aboFxOf(parseAboFxBody(kind, FIELDS[kind]));
}

function envOf(extra = {}) {
    const root = makeStage({ waapi: true });
    return { root, doc: root.ownerDocument, reduced: false, hold: 1, ancient: false, worldview: '', speaker: '甲', play() {}, ...extra };
}

test('gate:fx-pack-abo manifest registers every kind, opt-in switch, no era gate', () => {
    assert.equal(PACK.id, 'abo');
    assert.equal(PACK.era, null);
    assert.equal(PACK.packSwitch, 'aboFx.enabled');
    assert.deepEqual([...PACK.kinds].sort(), [...ABO_KINDS].sort());
    for (const kind of PACK.kinds) {
        assert.match(kind, /^[a-z]+$/, kind);
        assert.ok(PACK.labels[kind], `${kind} label`);
        const words = PACK.triggers[kind];
        assert.ok(words.length >= 2 && words.length <= 4, `${kind} triggers`);
        assert.ok(PACK.promptLines[kind].includes(`[igs-fx:${kind}`), `${kind} prompt`);
        assert.equal(typeof PACK.builders[kind], 'function', `${kind} builder`);
        assert.ok(parseAboFxBody(kind, FIELDS[kind]), `${kind} parse`);
    }
    assert.deepEqual(Object.keys(PACK.builders).sort(), [...PACK.kinds].sort());
    assert.ok(!('enabled' in PACK) || PACK.enabled !== true);
});

test('gate:fx-pack-abo parse fields and reject incomplete tags', () => {
    assert.deepEqual(item('scent'), { type: 'scent', who: '雪松', name: '冷杉', color: '#8a6a4a' });
    assert.equal(item('scent').color, '#8a6a4a');
    assert.equal(aboFxOf(parseAboFxBody('scent', ['甲', '蜜桃', '不是颜色'])).color, '');
    assert.equal(parseAboFxBody('scent', []), null);
    assert.equal(parseAboFxBody('scentlink', ['甲']), null);
    assert.equal(item('suppress').range, 'all');
    assert.equal(aboFxOf(parseAboFxBody('suppress', ['甲'])).range, 'near');
    assert.equal(item('inhibitor').mode, 'fail');
    assert.equal(aboFxOf(parseAboFxBody('inhibitor', [])).mode, 'inject');
    assert.equal(aboFxOf(parseAboFxBody('inhibitor', ['阻隔贴'])).mode, 'patch');
    assert.equal(item('bond').mode, 'life');
    assert.equal(aboFxOf(parseAboFxBody('bond', ['乙'])).mode, 'temp');
    assert.equal(parseAboFxBody('gendertest', ['乙']), null);
    assert.equal(item('match').percent, 87);
    assert.equal(parseAboFxBody('match', ['甲', '乙', '没数']), null);
    assert.equal(item('detector').level, 92);
    assert.equal(parseAboFxBody('detector', ['很高']), null);
    assert.equal(item('phase').phase, 'heat');
    assert.equal(item('phase').ratio, 43);
    assert.equal(aboFxOf(parseAboFxBody('phase', ['易感', '三天'])).ratio, -1);
    assert.equal(parseAboFxBody('phase', ['喝醉了']), null);
    assert.equal(phaseRatioOf('60%'), 60);
    assert.equal(parseAboFxBody('unknown', ['x']), null);
});

test('gate:fx-pack-abo scent colour is explicit or stable per name, no scent lexicon', () => {
    assert.equal(scentColorOf('甲', '#123456'), '#123456');
    assert.equal(scentColorOf('甲'), scentColorOf('甲'));
    assert.match(scentColorOf('乙'), /^#[0-9a-f]{6}$/i);
});

test('gate:fx-pack-abo every builder returns a node in normal and reduced mode', () => {
    for (const kind of PACK.kinds) {
        for (const reduced of [false, true]) {
            const env = envOf({ reduced });
            const built = PACK.builders[kind](item(kind), env);
            assert.ok(built && built.node, `${kind} node`);
            assert.ok(['front', 'stage'].includes(built.layer), `${kind} layer`);
            assert.ok(built.life > 0, `${kind} life`);
            assert.ok(built.sounds.length > 0, `${kind} sounds`);
            for (const s of built.sounds) assert.ok(ABO_SFX_DEFS[s], `${kind} sfx ${s}`);
            assert.match(built.node.className, /igs-dfx igs-abo /, kind);
        }
    }
});

test('gate:fx-pack-abo life scales with hold and ancient adds skin class', () => {
    const base = PACK.builders.scent(item('scent'), envOf({ hold: 1 }));
    const long = PACK.builders.scent(item('scent'), envOf({ hold: 2 }));
    assert.equal(long.life, base.life * 2);
    const ancient = PACK.builders.scent(item('scent'), envOf({ ancient: true }));
    assert.match(ancient.node.className, /is-ancient/);
    const report = PACK.builders.gendertest(item('gendertest'), envOf({ ancient: true }));
    assert.match(report.node.innerHTML, /igs-panel is-ancient/);
});

test('gate:fx-pack-abo reduced builders start no scripted animation', () => {
    const env = envOf({ reduced: true });
    const mist = PACK.builders.scent(item('scent'), env).node;
    for (const child of mist.children) assert.ok(!child.animations || child.animations.length === 0, 'mist static');
    const motion = env.root.querySelector('#igs-stage-motion');
    PACK.builders.suppress(item('suppress'), env);
    assert.ok(!motion.animations || motion.animations.length === 0, 'no stage shake in reduced');
    const live = envOf();
    PACK.builders.suppress(item('suppress'), live);
    assert.ok(live.root.querySelector('#igs-stage-motion').animations.length > 0, 'shake when motion allowed');
});

test('gate:fx-pack-abo match number settles on final value in reduced mode', () => {
    const built = PACK.builders.match(item('match'), envOf({ reduced: true }));
    assert.match(built.node.innerHTML, /igs-abo-pct">87</);
    const det = PACK.builders.detector(item('detector'), envOf({ reduced: true }));
    assert.match(det.node.innerHTML, /igs-abo-det-flash/);
    assert.match(det.node.innerHTML, /浓度超标/);
});

test('gate:fx-pack-abo text fields are escaped', () => {
    const built = PACK.builders.gendertest(aboFxOf(parseAboFxBody('gendertest', ['<b>乙</b>', '<i>O</i>'])), envOf());
    assert.doesNotMatch(built.node.innerHTML, /<b>乙/);
    const card = PACK.builders.inhibitor(aboFxOf(parseAboFxBody('inhibitor', ['注射', '<script>'])), envOf());
    assert.doesNotMatch(card.node.innerHTML, /<script>/);
});
