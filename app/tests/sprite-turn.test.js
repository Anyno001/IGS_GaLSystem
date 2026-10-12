import test from 'node:test';
import assert from 'node:assert/strict';
import { extractFxDirectives, resolveFxAtPage } from '../src/scene/fx-directives.js';
import { applyCastPoses, applyCastToDom, resolveSpeakerPose } from '../src/visual/igs-ui/stage-cast-render.js';
import { SPRITE_TURN_MS, playSpriteTurn } from '../src/visual/igs-ui/sprite-turn.js';
import { resolveStageCastFxPromptRule, stageCastGrammarLines } from '../src/visual/igs-ui/fx-prompt.js';
import { spriteGeometry } from '../src/visual/igs-ui/fx-runtime.js';

const fxOf = (text, to) => resolveFxAtPage(extractFxDirectives(text), text.indexOf(to));
const snap = (fx, stageCast) => ({ readerSettings: { stageCast }, content: { fx } });
const ON = { enabled: true, castStage: true };

function el() {
    const attrs = new Map();
    const props = new Map();
    const node = {
        anims: [],
        style: { setProperty(k, v) { props.set(k, String(v)); }, removeProperty(k) { props.delete(k); }, getPropertyValue(k) { return props.get(k) || ''; } },
        setAttribute(k, v) { attrs.set(k, String(v)); },
        getAttribute(k) { return attrs.has(k) ? attrs.get(k) : null; },
        hasAttribute(k) { return attrs.has(k); },
        removeAttribute(k) { attrs.delete(k); },
        animate(frames, opts) { const a = { frames, opts, cancel() {} }; node.anims.push(a); return a; },
    };
    return node;
}

test('gate: single sprite flip follows the stage tag only when castStage is on', () => {
    const fx = fxOf('[igs-fx:stage|背对|Alice]\n台词', '台词');
    assert.equal(resolveSpeakerPose(snap(fx, ON), 'Alice').flip, true);
    assert.equal(resolveSpeakerPose(snap(fx, { enabled: true }), 'Alice').flip, false);
    assert.equal(resolveSpeakerPose(snap(fx, undefined), 'Alice').flip, false);
    assert.equal(resolveSpeakerPose(snap(fx, ON), 'Bob').flip, false);
    // 单人转身不要求打开多角色同屏总开关，与提示词注入同一开关
    assert.equal(resolveSpeakerPose(snap(fx, { castStage: true }), 'Alice').flip, true);
});

test('gate: turn prompt follows castStage alone, full stage prompt needs the cast master switch', () => {
    assert.equal(resolveStageCastFxPromptRule({ enabled: true }), '');
    assert.match(resolveStageCastFxPromptRule({ castStage: true }), /背对/);
    assert.doesNotMatch(resolveStageCastFxPromptRule({ castStage: true }), /靠近/);
    assert.match(resolveStageCastFxPromptRule({ enabled: true, castStage: true }), /靠近/);
    assert.equal(stageCastGrammarLines({ castStage: true }).length, 1);
    assert.equal(stageCastGrammarLines({}).length, 0);
});

test('gate: storm leaves the back turn on its own page only, speaking again returns facing front', () => {
    const text = '[igs-fx:stage|甩头离开|A]\n一\n二';
    const onPage = fxOf(text, '一');
    assert.equal(resolveSpeakerPose(snap(onPage, ON), 'A').flip, true);
    const later = resolveFxAtPage(extractFxDirectives(text), text.indexOf('二'), text.indexOf('一'));
    assert.equal(resolveSpeakerPose(snap(later, ON), 'A').flip, false);
    const plan = { speaker: { posX: 20, scale: 40 }, members: [] };
    assert.equal(applyCastPoses(plan, { poses: later.poses, turns: later.turns, speakerKey: 'A' }).speaker.flip, false);
    assert.equal(applyCastPoses(plan, { poses: onPage.poses, turns: onPage.turns, speakerKey: 'A' }).speaker.flip, true);
});

test('gate: turn variants parse and stay backward compatible', () => {
    const glance = fxOf('[igs-fx:stage|背对|A]\n一\n[igs-fx:stage|回眸|A]\n二', '二');
    assert.equal(glance.poses.A.flip, false);
    assert.equal(glance.turns.A, 'glance');
    const storm = fxOf('[igs-fx:stage|甩头离开|A]\n一', '一');
    assert.equal(storm.poses.A.flip, true);
    assert.ok(Object.hasOwn(storm.goneAt, 'A'));
    const back = fxOf('[igs-fx:stage|背影|A|她不愿回头]\n一', '一');
    assert.equal(back.poses.A.back, true);
    assert.equal(back.poses.A.backText, '她不愿回头');
    assert.equal(resolveSpeakerPose(snap(back, ON), 'A').backText, '她不愿回头');
    const face = fxOf('[igs-fx:stage|转身面对|A|B]\n一', '一');
    assert.equal(face.poses.A.face, 'B');
    assert.equal(face.poses.B.face, 'A');
    assert.equal(fxOf('[igs-fx:stage|转身面对|A]\n一', '一').poses.A, undefined);
    assert.deepEqual(fxOf('[igs-fx:stage|背对|A]\n一', '一').poses, { A: { flip: true, front: false } });
    assert.deepEqual(fxOf('[igs-fx:stage|背对|A]\n一', '一').turns, {});
});

test('gate: face variant makes both look toward each other', () => {
    const plan = { speaker: { posX: 20, scale: 40 }, members: [{ character: 'B', posX: 80, scale: 40 }] };
    const poses = { A: { face: 'B' }, B: { face: 'A' } };
    const out = applyCastPoses(plan, { poses, speakerKey: 'A' });
    assert.equal(out.speaker.flip, false);
    assert.equal(out.members[0].flip, true);
});

test('gate: turn animation plays only on state change and respects reduced / low quality', () => {
    const a = el();
    assert.equal(playSpriteTurn(a, { from: false, to: false }), null);
    assert.ok(playSpriteTurn(a, { from: false, to: true }));
    const main = a.anims[0];
    assert.equal(main.opts.duration, SPRITE_TURN_MS);
    assert.deepEqual(main.frames.map((f) => f.rotate), ['y 0deg', 'y 87deg', 'y 180deg']);
    assert.ok(a.anims.every((x) => x.opts.composite === 'add' || x === main));
    const b = el();
    assert.equal(playSpriteTurn(b, { from: false, to: true, reduced: true }), null);
    assert.equal(playSpriteTurn(b, { from: false, to: true, lowQuality: true }), null);
    assert.equal(b.anims.length, 0);
});

test('gate: speaker turn adds perspective on the parent layer without touching sprite transform', () => {
    const a = el();
    const host = el();
    a.parentElement = host;
    assert.ok(playSpriteTurn(a, { from: false, to: true }));
    assert.equal(host.anims.length, 1);
    assert.ok(host.anims[0].frames.every((f) => /^\d+px$/.test(f.perspective)));
    assert.ok(a.anims.every((x) => x.frames.every((f) => !('transform' in f))));
    const b = el();
    const host2 = el();
    b.parentElement = host2;
    assert.equal(playSpriteTurn(b, { from: false, to: true, reduced: true }), null);
    assert.equal(host2.anims.length, 0);
    const c = el();
    const host3 = el();
    c.parentElement = host3;
    playSpriteTurn(c, { from: false, to: true, prop: 'scale' });
    assert.equal(host3.anims.length, 0);
});

test('gate: cast turn animates only when flip changes, reduced lands on final state', () => {
    const layer = el();
    layer.children = [];
    layer.ownerDocument = { createElement: () => { const c = el(); c.children = []; return c; } };
    layer.appendChild = (c) => { c.parentNode = layer; layer.children.push(c); return c; };
    layer.removeChild = (c) => { layer.children = layer.children.filter((x) => x !== c); return c; };
    const root = { querySelector: (s) => (s === '#igs-cast' ? layer : null) };
    const m = (flip) => [{ character: 'B', url: 'https://e.com/b.png', posX: 18, posY: 100, scale: 40, flip }];
    applyCastToDom(root, m(false), { reduced: true, turn: {} });
    const bob = layer.children[0];
    const before = bob.anims.length;
    applyCastToDom(root, m(false), { turn: {} });
    assert.equal(bob.anims.length, before);
    applyCastToDom(root, m(true), { reduced: true, turn: {} });
    assert.equal(bob.style.getPropertyValue('scale'), '-1 1');
    assert.equal(bob.anims.filter((a) => a.frames.some((f) => f.scale === '0.05 1')).length, 0);
    applyCastToDom(root, m(false), { turn: {} });
    assert.equal(bob.anims.filter((a) => a.frames.some((f) => f.scale === '0.05 1')).length, 1);
    assert.equal(bob.style.getPropertyValue('scale'), '');
});

test('gate: head anchor stays mirrored for a flipped sprite', () => {
    const base = { posX: 50, posY: 100, scale: 40, head: { x: 0.3, y: 0.2, w: 0.1, h: 0.1, aspect: 1.6 } };
    assert.equal(spriteGeometry(base, null).head.x, 0.3);
    assert.ok(Math.abs(spriteGeometry({ ...base, flip: true }, null).head.x - 0.7) < 1e-9);
});

test('gate: several turn tags on one page resolve to the last one instead of cancelling out', () => {
    const fx = fxOf('[igs-fx:stage|回眸|A]\n[igs-fx:stage|背影|A]\n[igs-fx:stage|甩头离开|A]\n一', '一');
    assert.equal(fx.turns.A, 'storm');
    const pose = resolveSpeakerPose(snap(fx, ON), 'A');
    assert.equal(pose.flip, true);
    assert.equal(pose.turn, 'storm');
    const back = fxOf('[igs-fx:stage|回眸|A]\n[igs-fx:stage|背影|A]\n一', '一');
    assert.equal(back.turns.A, 'back');
    assert.equal(resolveSpeakerPose(snap(back, ON), 'A').back, true);
});

test('gate: glance without a prior back turn still plays a look-back in place', () => {
    const a = el();
    const anims = playSpriteTurn(a, { from: false, to: false, variant: 'glance' });
    assert.ok(anims);
    assert.deepEqual(a.anims[0].frames.map((f) => f.rotate), ['y 0deg', 'y 40deg', 'y 40deg', 'y 0deg']);
    assert.equal(playSpriteTurn(el(), { from: false, to: false, variant: 'glance', reduced: true }), null);
    assert.equal(playSpriteTurn(el(), { from: true, to: true, variant: 'back' }), null);
});

