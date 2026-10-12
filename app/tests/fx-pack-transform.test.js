import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PACK } from '../src/visual/igs-ui/fx-pack-transform.js';
import { buildPackRegistry, validatePacks } from '../src/scene/fx-packs.js';
import { normalizeDailyFxSettings } from '../src/visual/igs-ui/fx-daily-model.js';
import { ensureFxLayers } from '../src/visual/igs-ui/fx-layer.js';
import {
    XF_KINDS, fitCrop, headInBox, markPlacement, parseTransformFx, tailCountOf, transformFxOf,
} from '../src/visual/igs-ui/fx-transform-model.js';
import { TRANSFORM_BUILDERS, frameStyleFor } from '../src/visual/igs-ui/fx-transform.js';
import { beastLayout, beastPartsHtml, beastTraitHtml, resolveBeast } from '../src/visual/igs-ui/fx-beast-parts.js';
import { TRANSFORM_STYLE_TEXT } from '../src/visual/igs-ui/fx-transform-style.js';
import { makeStage } from './helpers/fake-dom.js';

const registry = buildPackRegistry([PACK]);
const SOURCES = ['fx-transform.js', 'fx-transform-model.js', 'fx-transform-style.js', 'fx-transform-sfx.js', 'fx-beast-parts.js', 'fx-pack-transform.js'];

function stage({ waapi = false } = {}) {
    const root = makeStage({ waapi });
    const sprite = root.querySelector('#igs-sprite');
    sprite.style.backgroundImage = 'url("hero.png")';
    sprite.style.backgroundSize = 'auto 100%';
    sprite.style.backgroundPosition = '30% 100%';
    return { root, sprite };
}

function envOf(root, extra = {}) {
    const layers = ensureFxLayers(root);
    return { root, doc: layers.doc, layers, reduced: false, hold: 1, ancient: false, worldview: '', speaker: '小雪', sprite: null, cast: [], play() {}, ...extra };
}

const ITEMS = {
    mirror: { type: 'mirror', who: '' },
    reflect: { type: 'reflect', kind: 'water', who: '' },
    silhouette: { type: 'silhouette', who: '', mode: 'glass' },
    frame: { type: 'frame', style: 'monitor', who: '' },
    warp: { type: 'warp', who: '', style: 'glitch' },
    zoom: { type: 'zoom', who: '', region: 'eye' },
    mark: { type: 'mark', who: '', part: 'cheek', style: 'blush' },
    spirit: { type: 'spirit', who: '' },
    shift: { type: 'shift', who: '', form: '九尾狐' },
    tails: { type: 'tails', who: '', count: 9 },
    truemirror: { type: 'truemirror', who: '', form: '白蛇' },
};

test('gate:fx-pack-transform registers every kind with label, 2-4 triggers, prompt line and builder', () => {
    assert.deepEqual([...XF_KINDS].sort(), Object.keys(ITEMS).sort());
    assert.deepEqual(registry.get('transform').kinds, [...XF_KINDS]);
    assert.deepEqual(validatePacks(registry.packs), []);
    for (const kind of XF_KINDS) {
        assert.ok(PACK.labels[kind], kind);
        assert.ok(PACK.triggers[kind].length >= 2 && PACK.triggers[kind].length <= 4, kind);
        assert.ok(PACK.promptLines[kind].startsWith(`[igs-fx:${kind}|`) || PACK.promptLines[kind].startsWith(`[igs-fx:${kind}]`), kind);
        assert.equal(typeof PACK.builders[kind], 'function', kind);
    }
});

test('gate:fx-pack-transform kinds are default-on like the pack', () => {
    const settings = normalizeDailyFxSettings({ enabled: true });
    // 立绘变形是通用演出包（defaultOn）：总开关与各 kind 默认开，显式写 false 才关。
    for (const kind of XF_KINDS) assert.equal(settings[kind], true, kind);
    assert.equal(PACK.id, 'transform');
    assert.equal(PACK.defaultOn, true);
});

test('gate:fx-pack-transform only the mythic four are ancient, the rest are era-free', () => {
    const ancient = registry.eraTables.ancient;
    assert.deepEqual([...ancient].sort(), ['shift', 'spirit', 'tails', 'truemirror']);
    assert.deepEqual(registry.eraTables.modern, []);
});

test('gate:fx-pack-transform parse: fields are classified wherever they appear', () => {
    assert.deepEqual(parseTransformFx('mirror', []), ['mirror', '']);
    assert.deepEqual(parseTransformFx('mirror', ['小雪']), ['mirror', '小雪']);
    assert.deepEqual(parseTransformFx('reflect', ['水面', '小雪']), ['reflect', 'water', '小雪']);
    assert.deepEqual(parseTransformFx('reflect', ['小雪']), ['reflect', 'window', '小雪']);
    assert.deepEqual(parseTransformFx('silhouette', ['小雪', '逆光']), ['silhouette', '小雪', 'back']);
    assert.deepEqual(parseTransformFx('silhouette', ['逆光']), ['silhouette', '', 'back']);
    assert.deepEqual(parseTransformFx('frame', ['全息', '小雪']), ['frame', 'holo', '小雪']);
    assert.deepEqual(parseTransformFx('frame', ['小雪']), ['frame', 'monitor', '小雪']);
    assert.deepEqual(parseTransformFx('warp', ['小雪', '黑眼']), ['warp', '小雪', 'blackeye']);
    assert.deepEqual(parseTransformFx('warp', ['负片']), ['warp', '', 'negative']);
    assert.deepEqual(parseTransformFx('zoom', ['小雪', '唇']), ['zoom', '小雪', 'lip']);
    assert.deepEqual(parseTransformFx('zoom', ['颈']), ['zoom', '', 'neck']);
    assert.deepEqual(parseTransformFx('mark', ['小雪', '脸颊', '潮红']), ['mark', '小雪', 'cheek', 'blush']);
    assert.deepEqual(parseTransformFx('mark', ['小雪', '吻痕']), ['mark', '小雪', 'neck', 'kiss']);
    assert.deepEqual(parseTransformFx('mark', ['小雪', '额头']), ['mark', '小雪', 'brow', 'sigil']);
    assert.equal(parseTransformFx('mark', ['小雪']), null);
    assert.deepEqual(parseTransformFx('shift', ['阿九', '九尾狐']), ['shift', '阿九', '九尾狐']);
    assert.deepEqual(parseTransformFx('truemirror', ['阿九']), ['truemirror', '阿九', '']);
    assert.deepEqual(parseTransformFx('tails', ['阿九', '三']), ['tails', '阿九', 3]);
    assert.deepEqual(parseTransformFx('tails', []), ['tails', '', 9]);
    assert.deepEqual(parseTransformFx('tails', ['99']), ['tails', '', 9]);
    assert.equal(parseTransformFx('nope', ['a']), null);
    assert.equal(tailCountOf('九'), 9);
    assert.equal(tailCountOf(''), 0);
});

test('gate:fx-pack-transform of: args round-trip into items', () => {
    assert.deepEqual(registry.itemOf(parseTransformFx('mark', ['小雪', '咬痕', '颈'])), { type: 'mark', who: '小雪', part: 'neck', style: 'bite' });
    assert.deepEqual(registry.itemOf(parseTransformFx('tails', ['阿九', '5'])), { type: 'tails', who: '阿九', count: 5 });
    assert.deepEqual(transformFxOf(['shift', 'a', '狐']), { type: 'shift', who: 'a', form: '狐' });
    assert.equal(transformFxOf(['x']), null);
});

test('gate:fx-pack-transform crop math: full-body fit and head position inside the box', () => {
    assert.deepEqual(fitCrop(2, 1), { size: 50, x: 50, y: 100 });
    assert.equal(fitCrop(1, 2).size, 100);
    const head = { x: 0.5, top: 0.04, w: 0.3 };
    const crop = fitCrop(2, 2);
    const there = headInBox(head, 2, crop, 2, false);
    assert.equal(there.x, 50);
    assert.ok(there.y > 0 && there.y < 25, String(there.y));
    const flipped = headInBox({ ...head, x: 0.3 }, 2, crop, 2, true);
    assert.ok(flipped.x > 50, String(flipped.x));
});

test('gate:fx-pack-transform mark placement follows the head anchor', () => {
    const anchor = { x: 40, y: 30, d: 12 };
    const cheeks = markPlacement('cheek', anchor, 16 / 9);
    assert.equal(cheeks.length, 2);
    assert.ok(cheeks[0].x < anchor.x && cheeks[1].x > anchor.x);
    const neck = markPlacement('neck', anchor, 16 / 9)[0];
    assert.ok(neck.y > cheeks[0].y);
    assert.equal(markPlacement('unknown', anchor).length, 2);
});

test('gate:fx-pack-transform beast parts: form name picks parts and color, tails fan out', () => {
    const fox = resolveBeast('九尾狐');
    assert.equal(fox.id, 'fox');
    assert.deepEqual(fox.parts.map((p) => p.part), ['ear', 'tail']);
    assert.equal(resolveBeast('白蛇').id, 'snake');
    assert.equal(resolveBeast('不认识的东西').id, 'beast');
    const anchor = { x: 50, y: 30, d: 14 };
    assert.equal(beastLayout(fox, anchor, 16 / 9, { only: ['tail'], tailCount: 9 }).length, 9);
    assert.equal(beastLayout(resolveBeast('龙'), anchor, 16 / 9).filter((i) => i.part === 'wing').length, 2);
    const html = beastPartsHtml(beastLayout(fox, anchor, 16 / 9), { color: 'red;x' });
    assert.ok(html.includes('igs-bp is-ear') && !html.includes('red;x'));
    assert.ok(beastTraitHtml('狐', anchor, 16 / 9).includes('is-trait'));
});

test('gate:fx-pack-transform frame style: monitor and hologram fall back to the memory frame in ancient and fantasy', () => {
    assert.equal(frameStyleFor('monitor', { ancient: false, worldview: '' }), 'monitor');
    assert.equal(frameStyleFor('holo', { ancient: false, worldview: 'scifi' }), 'holo');
    assert.equal(frameStyleFor('monitor', { ancient: true, worldview: '' }), 'memory');
    assert.equal(frameStyleFor('holo', { ancient: false, worldview: 'magic' }), 'memory');
});

test('gate:fx-pack-transform builders return a static node under reduced motion', () => {
    for (const kind of XF_KINDS) {
        const { root } = stage();
        const env = envOf(root, { reduced: true, ancient: kind === 'mirror' });
        const built = TRANSFORM_BUILDERS[kind](ITEMS[kind], env);
        assert.ok(built, kind);
        assert.ok(['front', 'stage'].includes(built.layer), kind);
        assert.ok(String(built.node.className).includes('is-reduced'), kind);
        assert.ok(String(built.node.className).includes('igs-xf'), kind);
        assert.ok(built.life > 0 && built.sounds.length === 1 && PACK.sfx[built.sounds[0]], kind);
    }
});

test('gate:fx-pack-transform life scales with the hold setting', () => {
    const { root } = stage();
    const base = TRANSFORM_BUILDERS.zoom(ITEMS.zoom, envOf(root, { hold: 1 }));
    const { root: root2 } = stage();
    const long = TRANSFORM_BUILDERS.zoom(ITEMS.zoom, envOf(root2, { hold: 2 }));
    assert.equal(long.life, base.life * 2);
});

test('gate:fx-pack-transform at most one transform layer per page', () => {
    const { root } = stage();
    const env = envOf(root);
    const first = TRANSFORM_BUILDERS.mirror(ITEMS.mirror, env);
    assert.ok(first);
    env.layers.front.appendChild(first.node);
    for (const kind of XF_KINDS) assert.equal(TRANSFORM_BUILDERS[kind](ITEMS[kind], env), null, kind);
});

test('gate:fx-pack-transform no visible sprite means no layer', () => {
    const root = makeStage();
    const env = envOf(root);
    for (const kind of XF_KINDS) assert.equal(TRANSFORM_BUILDERS[kind](ITEMS[kind], env), null, kind);
});

test('gate:fx-pack-transform truemirror is the mirror path with true-form content', () => {
    const { root } = stage();
    const plain = TRANSFORM_BUILDERS.mirror(ITEMS.mirror, envOf(root));
    const { root: root2 } = stage();
    const truth = TRANSFORM_BUILDERS.truemirror(ITEMS.truemirror, envOf(root2));
    assert.ok(String(truth.node.className).includes('is-true'));
    assert.ok(!String(plain.node.className).includes('is-true'));
    const allHtml = (node) => node.innerHTML + node.children.map(allHtml).join('');
    assert.ok(allHtml(truth.node).includes('igs-bp'));
    assert.ok(!allHtml(plain.node).includes('igs-bp'));
    const styles = (node) => node.descendants().map((n) => n.getAttribute('style') || '').join('|');
    assert.ok(styles(truth.node).includes('brightness(0)'));
    assert.ok(!styles(plain.node).includes('brightness(0)'));
    const src = readFileSync(new URL('../src/visual/igs-ui/fx-transform.js', import.meta.url), 'utf8');
    assert.ok(src.includes("buildMirror(item, env, 'true-form')") && src.includes("buildMirror(item, env, 'self')"));
});

test('gate:fx-pack-transform shift leaves the real sprite alone apart from a shake and covers it with a silhouette clone', () => {
    const { root, sprite } = stage({ waapi: true });
    const built = TRANSFORM_BUILDERS.shift(ITEMS.shift, envOf(root));
    assert.equal(built.layer, 'stage');
    assert.ok(sprite.animations && sprite.animations.length >= 1);
    const clone = built.node.descendants().find((n) => String(n.className).includes('igs-clone-sprite'));
    assert.ok(clone.getAttribute('style').includes('brightness(0)'));
    assert.ok(clone.getAttribute('style').includes('hero.png'));
});

test('gate:fx-pack-transform clones follow the live sprite background (outfit and expression)', () => {
    const { root, sprite } = stage();
    sprite.style.backgroundImage = 'url("hero-dress-smile.png")';
    const built = TRANSFORM_BUILDERS.zoom(ITEMS.zoom, envOf(root));
    const clone = built.node.descendants().find((n) => String(n.className).includes('igs-clone-sprite'));
    assert.ok(clone.getAttribute('style').includes('hero-dress-smile.png'));
});

test('gate:fx-pack-transform tails draws the requested number of tails capped at nine', () => {
    const { root } = stage();
    const built = TRANSFORM_BUILDERS.tails({ type: 'tails', who: '', count: 4 }, envOf(root));
    const tails = built.node.descendants().filter((n) => n.innerHTML.includes('igs-bp is-tail')).flatMap((n) => n.innerHTML.match(/igs-bp is-tail/g));
    assert.equal(tails.length, 4);
});

test('gate:fx-pack-transform blackeye and mark build their patches from the head anchor', () => {
    const { root } = stage();
    const eyes = TRANSFORM_BUILDERS.warp({ type: 'warp', who: '', style: 'blackeye' }, envOf(root));
    assert.equal(eyes.node.children.filter((n) => String(n.className).includes('igs-xf-eyepatch')).length, 2);
    const { root: root2 } = stage();
    const marks = TRANSFORM_BUILDERS.mark(ITEMS.mark, envOf(root2));
    assert.equal(marks.node.children.filter((n) => String(n.className).includes('igs-xf-patch')).length, 2);
});

test('gate:fx-pack-transform sources have no canvas and no mask-image:url, and low quality is handled', () => {
    for (const file of SOURCES) {
        const text = readFileSync(new URL(`../src/visual/igs-ui/${file}`, import.meta.url), 'utf8');
        assert.ok(!/canvas/i.test(text), `${file} canvas`);
        assert.ok(!/mask-image/i.test(text), `${file} mask-image`);
        assert.ok(!/\r/.test(text), `${file} CRLF`);
    }
    assert.ok(TRANSFORM_STYLE_TEXT.includes('data-igs-quality="low"'));
    assert.ok(TRANSFORM_STYLE_TEXT.includes('.igs-xf.is-reduced'));
});

test('gate:fx-pack-transform sfx layers are finite, modest and short', () => {
    for (const [name, def] of Object.entries(PACK.sfx)) {
        const layers = [...def.partials, ...def.noise];
        assert.ok(layers.length > 0, name);
        for (const q of layers) {
            assert.ok(q.gain > 0 && q.gain <= 1, `${name} gain`);
            assert.ok(q.start >= 0 && q.duration > 0, `${name} timing`);
            assert.ok([q.start, q.duration, q.gain].every(Number.isFinite), name);
        }
        assert.ok(Math.max(...layers.map((q) => q.start + q.duration)) <= 5, `${name} short`);
    }
});
