import test from 'node:test';
import assert from 'node:assert/strict';
import { PACK } from '../src/visual/igs-ui/fx-pack-idol.js';
import { FX_PACK_SFX_DEFS, getPack, normalizePack, validatePacks } from '../src/scene/fx-packs.js';
import { IDOL_KINDS, IDOL_TRIGGERS, idolFxOf, parseIdolFxBody, resolveLightColor } from '../src/visual/igs-ui/fx-idol-model.js';
import { IDOL_BUILDERS, IDOL_LIFE_MS } from '../src/visual/igs-ui/fx-idol.js';
import { createIdolVoices, planIdolAmbient, resolveIdolAmbience } from '../src/visual/igs-ui/fx-idol-ambience.js';
import { normalizeDailyFxSettings } from '../src/visual/igs-ui/fx-daily-model.js';
import { makeStage } from './helpers/fake-dom.js';


const SAMPLES = {
    onstage: ['夏日心跳', '小满', '安可'],
    fancam: ['小满', '小满 直拍'],
    lightsea: ['粉色', '星星'],
    debut: ['小满:1;阿杰:3;阿宁:2;老周:4', '出道夜'],
    award: ['一位', '小满', '开信封'],
    fansign: ['小满', '加油;喜欢你'],
    paparazzi: ['小满', '6'],
    practice: ['小满', '120'],
    backstage: ['小满', '3'],
    banner: ['小满最棒;冲鸭', '#ff6fae'],
};

function env(doc, extra = {}) {
    return { root: makeStage(), doc, reduced: true, hold: 1, speaker: '小满', messageId: 5, ancient: false, worldview: 'modern', panelSkin: '', play() {}, ...extra };
}

test('gate:fx-pack-idol every kind registered, validated and off by default', () => {
    assert.equal(PACK.id, 'idol');
    assert.equal(PACK.era, 'modern');
    assert.equal(PACK.kinds.length, 10);
    assert.deepEqual(validatePacks([normalizePack(PACK)]), []);
    assert.equal(getPack('idol').kinds.length, 10);
    const legacy = normalizeDailyFxSettings({ enabled: true });
    for (const kind of IDOL_KINDS) {
        assert.equal(legacy[kind], false, kind);
        assert.ok(PACK.promptLines[kind].startsWith(`[igs-fx:${kind}`), kind);
        assert.ok(IDOL_TRIGGERS[kind].length >= 2 && IDOL_TRIGGERS[kind].length <= 4, kind);
    }
    assert.equal(legacy.packIdol, false);
});

test('gate:fx-pack-idol parse gives the documented fields', () => {
    const parsed = (type, fields) => idolFxOf(parseIdolFxBody(type, fields));
    assert.deepEqual(parsed('onstage', SAMPLES.onstage), { type: 'onstage', song: '夏日心跳', who: '小满', encore: true });
    assert.equal(parsed('onstage', ['安可']).encore, true);
    assert.equal(parsed('onstage', []).encore, false);
    assert.equal(parsed('fancam', ['小满']).who, '小满');
    assert.equal(resolveLightColor('#FF0000'), '#ff0000');
    assert.equal(resolveLightColor('蓝色'), '#4f8cff');
    assert.equal(resolveLightColor(''), '#ff6fae');
    assert.deepEqual(parsed('debut', SAMPLES.debut).rows.map((r) => r.rank), [1, 3, 2, 4]);
    assert.equal(parseIdolFxBody('debut', ['只有:1']), null);
    assert.deepEqual(parsed('award', SAMPLES.award), { type: 'award', word: '一位', who: '小满', envelope: true });
    assert.deepEqual(parsed('fansign', SAMPLES.fansign).notes, ['加油', '喜欢你']);
    assert.equal(parseIdolFxBody('fansign', []), null);
    assert.equal(parsed('paparazzi', ['小满', '99']).shots, 8);
    assert.equal(parsed('practice', ['小满', '30']).bpm, 60);
    assert.equal(parsed('backstage', []).count, 3);
    assert.deepEqual(parsed('banner', SAMPLES.banner).lines, ['小满最棒', '冲鸭']);
    assert.equal(parseIdolFxBody('banner', []), null);
});

test('gate:fx-pack-idol builders return static nodes under reduced motion', () => {
    const doc = makeStage().ownerDocument;
    for (const kind of IDOL_KINDS) {
        const item = idolFxOf(parseIdolFxBody(kind, SAMPLES[kind]));
        const built = IDOL_BUILDERS[kind](item, env(doc));
        assert.ok(built && built.node, kind);
        assert.match(built.node.className, /\bis-reduced\b/, kind);
        assert.match(built.node.className, new RegExp(`igs-id-${kind}`), kind);
        assert.ok(built.life >= IDOL_LIFE_MS[kind], kind);
        assert.ok(['front', 'stage'].includes(built.layer), kind);
        assert.ok(built.sounds.length >= 1, kind);
        for (const sound of built.sounds) assert.ok(FX_PACK_SFX_DEFS[sound], `${kind}:${sound}`);
        assert.ok(IDOL_BUILDERS[kind](item, env(doc, { hold: 2 })).life > built.life, `${kind} hold`);
    }
    assert.deepEqual(IDOL_BUILDERS.onstage({ type: 'onstage', song: '', who: '', encore: true }, env(doc)).sounds, ['id-encore', 'id-lift']);
    assert.deepEqual(IDOL_BUILDERS.award({ type: 'award', word: '', who: '', envelope: false }, env(doc)).sounds, ['id-award']);
    assert.equal(IDOL_BUILDERS.lightsea({ type: 'lightsea', color: '', name: '' }, env(doc)).layer, 'stage');
});

test('gate:fx-pack-idol sprite kinds clone the current sprite and dim fades before the dialog', () => {
    const doc = makeStage().ownerDocument;
    for (const kind of ['onstage', 'fancam', 'paparazzi', 'practice', 'backstage']) {
        const item = idolFxOf(parseIdolFxBody(kind, SAMPLES[kind]));
        const root = makeStage();
        root.querySelector('#igs-sprite').style.backgroundImage = 'url("xm-dress-smile.png")';
        const built = IDOL_BUILDERS[kind](item, env(doc, { root }));
        const clone = built.node.descendants().find((n) => String(n.className).includes('igs-clone-sprite'));
        assert.ok(clone && clone.getAttribute('style').includes('xm-dress-smile.png'), `${kind} clones live sprite`);
    }
});

test('gate:fx-pack-idol user text is escaped', () => {
    const doc = makeStage().ownerDocument;
    const sign = IDOL_BUILDERS.fansign({ type: 'fansign', name: '<b>x</b>', notes: ['<i>n</i>'] }, env(doc));
    const html = sign.node.children.map((c) => c.innerHTML).join('');
    assert.doesNotMatch(html, /<b>x<\/b>|<i>n<\/i>/);
    const banner = IDOL_BUILDERS.banner({ type: 'banner', lines: ['<script>1</script>'], color: '' }, env(doc));
    assert.doesNotMatch(banner.node.children.map((c) => c.innerHTML).join(''), /<script>/);
});

test('gate:fx-pack-idol residents resolve and have a voice', () => {
    assert.equal(resolveIdolAmbience('练习室').kind, 'idpractice');
    assert.equal(resolveIdolAmbience('演播厅后台走廊').kind, 'idbackstage');
    assert.equal(resolveIdolAmbience('教室'), null);
    assert.deepEqual(planIdolAmbient({ location: '练习室' }), [{ kind: 'idol', level: 'light', variant: 'practice' }]);
    assert.deepEqual(planIdolAmbient({ location: '舞台后台' }), [{ kind: 'idol', level: 'light', variant: 'backstage' }]);
    assert.equal(resolveIdolAmbience('候场区').kind, 'idbackstage');
    for (const loc of ['后台管理系统', '服务器后台', '办公室休息室', '图书馆', '']) assert.equal(resolveIdolAmbience(loc), null, loc);
    assert.ok(!IDOL_TRIGGERS.award.includes('一位'));
    assert.ok(PACK.ambience.html.idpractice && PACK.ambience.html.idbackstage);
    assert.equal(typeof createIdolVoices({}).idol, 'function');
});

test('gate:fx-pack-idol renders through the daily pipeline when the pack is on', async () => {
    const { renderDailyFx, cancelDailyFx } = await import('../src/visual/igs-ui/fx-daily.js');
    const { makeTimers } = await import('./helpers/fake-dom.js');
    const on = { enabled: true, petals: false, packIdol: true, ...Object.fromEntries(IDOL_KINDS.map((kind) => [kind, true])) };
    for (const kind of IDOL_KINDS) {
        const root = makeStage();
        const timers = makeTimers();
        const sounds = [];
        const item = idolFxOf(parseIdolFxBody(kind, SAMPLES[kind]));
        const result = renderDailyFx(root, {
            messageId: 5,
            readerSettings: { dailyFx: on, _worldview: 'modern' },
            content: { currentIndex: 0, fx: { daily: [item] } },
        }, { schedule: timers.schedule, clear: timers.clear, reducedMotion: true, playSfx: (k) => sounds.push(k) });
        assert.deepEqual(result.played, [kind], kind);
        assert.ok(sounds.length >= 1, kind);
        timers.advance(40000);
        cancelDailyFx(root);
    }
    const off = makeStage();
    const result = renderDailyFx(off, {
        messageId: 6,
        readerSettings: { dailyFx: { ...on, packIdol: false }, _worldview: 'modern' },
        content: { currentIndex: 0, fx: { daily: [{ type: 'banner', lines: ['x'], color: '' }] } },
    }, { schedule: makeTimers().schedule, clear() {}, reducedMotion: true, playSfx() {} });
    assert.deepEqual(result.played, []);
});
