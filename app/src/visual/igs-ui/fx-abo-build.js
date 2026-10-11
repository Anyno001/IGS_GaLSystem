// ABO 包的构建器：每个返回 { layer, life, sounds, node }。读立绘位置只走 stage-snapshot 读当前 DOM。
// 古风换皮取 env.ancient（淡墨雾、朱砂印），西幻取 worldSkin 追加的 is-magic（魔力雾）；时长乘 env.hold，reduced 时不起任何 JS 动画。
import { esc } from './reader-value-utils.js';
import { charSpans, make } from './fx-daily-kit.js';
import { spawnMist } from './fx-mist.js';
import { drawLinks } from './fx-links.js';
import { panelToneOf, gaugeHtml } from './fx-panel-kit.js';
import { rollNumber } from './fx-ticker.js';
import { playWarp, resolveHeadAnchor, spriteElOf } from './stage-snapshot.js';
import { scentColorOf } from './fx-abo-model.js';
import { at, atFilter, reactSprite } from './fx-sprite-react.js';

const LIFE = Object.freeze({ scent: 4200, scentlink: 4600, suppress: 3600, soothe: 4800, inhibitor: 3400, bond: 3800, bondLife: 5600, gendertest: 5600, match: 4600, nest: 4400, detector: 4600, phase: 4600 });
const life = (ms, env) => Math.round(ms * Math.max(1, env.hold || 1));
const skinOf = (env) => (env.ancient ? ' is-ancient' : '');
const cssSafe = (value) => String(value).replace(/[^\p{L}\p{N}_-]/gu, '');
const pct = (n) => Math.round(n * 10) / 10;

function box(env, className, html = '') {
    return make(env.doc, `igs-dfx igs-abo ${className}${skinOf(env)}`, html);
}

function scentBuilder(item, env) {
    const color = scentColorOf(item.who, item.color);
    const head = resolveHeadAnchor(env, item.who);
    const node = box(env, 'igs-abo-scent');
    spawnMist(node, { x: head.x, y: head.y + head.d * 0.2, size: Math.max(28, head.d * 3.2), color, drift: 5 }, { reduced: env.reduced });
    if (item.name) {
        const tag = make(env.doc, 'igs-abo-scent-name', charSpans(item.name, 90, 700));
        tag.setAttribute('style', `left:${pct(head.x)}%;top:${pct(Math.max(4, head.y - head.d * 0.95))}%;--igs-abo-c:${color}`);
        node.appendChild(tag);
    }
    return { layer: 'stage', life: life(LIFE.scent, env), sounds: ['abo-waft'], node };
}

function scentlinkBuilder(item, env) {
    const ca = scentColorOf(item.a);
    const cb = scentColorOf(item.b);
    const a = resolveHeadAnchor(env, item.a);
    const b = resolveHeadAnchor(env, item.b);
    const node = box(env, 'igs-abo-link');
    spawnMist(node, { x: a.x, y: a.y + a.d * 0.2, size: Math.max(26, a.d * 2.8), color: ca, drift: 3 }, { reduced: env.reduced });
    spawnMist(node, { x: b.x, y: b.y + b.d * 0.2, size: Math.max(26, b.d * 2.8), color: cb, drift: 3 }, { reduced: env.reduced });
    drawLinks(node, [{ from: { x: a.x, y: a.y + a.d * 0.2 }, to: { x: b.x, y: b.y + b.d * 0.2 }, tone: ca, style: 'mist' }, { from: { x: a.x, y: a.y + a.d * 0.3 }, to: { x: b.x, y: b.y + b.d * 0.3 }, tone: cb, style: 'mist' }], env, { reduced: env.reduced });
    const dir = a.x <= b.x ? 1 : -1;
    const lean = (sign) => [at(0, 'translate(0,0) rotate(0deg)'), at(0.3, `translate(${sign * 0.8}%,0) rotate(${sign * 1.1}deg)`), at(0.75, `translate(${sign * 0.8}%,0) rotate(${sign * 1.1}deg)`), at(1, 'translate(0,0) rotate(0deg)')];
    const leanMs = Math.min(life(LIFE.scentlink, env) - 400, 3600);
    reactSprite(env, item.a, lean(dir), { duration: leanMs, delay: 300 });
    reactSprite(env, item.b, lean(-dir), { duration: leanMs, delay: 300 });
    return { layer: 'stage', life: life(LIFE.scentlink, env), sounds: ['abo-link'], node };
}

function suppressBuilder(item, env) {
    const head = resolveHeadAnchor(env, item.who);
    const mainEl = env.root.querySelector('#igs-sprite');
    const sourceEl = spriteElOf(env, item.who);
    const sourceIsMain = sourceEl === mainEl;
    const name = cssSafe(item.who);
    const rings = [0, 1, 2].map((i) => `<i class="igs-abo-ring" style="animation-delay:${i * 260}ms"></i>`).join('');
    const sink = `#igs-overlay:has(.igs-abo-suppress) .igs-cast-sprite${name ? `:not([data-igs-cast-char="${name}"])` : ''}{translate:0 var(--igs-abo-sink,2.4%);}`;
    const node = box(env, `igs-abo-suppress is-${item.range === 'all' ? 'all' : 'near'}${sourceIsMain ? ' is-main' : ''}`,
        `<style>${sink}</style><div class="igs-abo-dim"></div><div class="igs-abo-rings" style="left:${pct(head.x)}%;top:${pct(head.y)}%">${rings}</div>`);
    if (!env.reduced) {
        const motion = env.root.querySelector('#igs-stage-motion');
        if (motion && typeof motion.animate === 'function') {
            try {
                motion.animate([{ translate: '0 0' }, { translate: '0 .35%' }, { translate: '.3% 0' }, { translate: '-.3% .2%' }, { translate: '0 0' }], { duration: 640, easing: 'ease-out', composite: 'add' });
            } catch { /* 不支持时保持静止 */ }
        }
        const others = Array.from(env.root.querySelectorAll('.igs-cast-sprite')).filter((el) => el !== sourceEl);
        if (!sourceIsMain && mainEl) others.push(mainEl);
        for (const el of others.slice(0, 4)) playWarp(el, 'tremble', { reduced: false });
    }
    return { layer: 'stage', life: life(LIFE.suppress, env), sounds: ['abo-press'], node };
}

function sootheBuilder(item, env) {
    const head = resolveHeadAnchor(env, item.who);
    const node = box(env, 'igs-abo-soothe', '<div class="igs-abo-glow"></div>');
    spawnMist(node, { x: head.x, y: head.y + head.d * 0.3, size: Math.max(40, head.d * 4.2), color: '#ffcf9e', drift: 4 }, { reduced: env.reduced });
    return { layer: 'stage', life: life(LIFE.soothe, env), sounds: ['abo-calm'], node };
}

const SYRINGE = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M44 8l12 12-6 6-12-12z" fill="#d9dde3"/><path d="M38 14l12 12-20 20-12-12z" fill="#eef2f6" stroke="#5d6672" stroke-width="2"/><path d="M24 32l8 8-14 14-8-2-2-8z" fill="#7ad0c4"/><path d="M8 56l-4 4" stroke="#5d6672" stroke-width="3" stroke-linecap="round"/></svg>';
const PATCH = '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="10" y="18" width="44" height="28" rx="8" fill="#f1d3b8" stroke="#a97f5d" stroke-width="2"/><rect x="26" y="18" width="12" height="28" fill="#e6c09f"/><circle cx="18" cy="32" r="2" fill="#a97f5d"/><circle cx="46" cy="32" r="2" fill="#a97f5d"/></svg>';
const WARN = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 6l27 48H5z" fill="#d23b3b" stroke="#7d1313" stroke-width="3" stroke-linejoin="round"/><path d="M32 22v16" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle cx="32" cy="46" r="3" fill="#fff"/></svg>';

function inhibitorBuilder(item, env) {
    const fail = item.mode === 'fail';
    const icon = item.mode === 'patch' ? PATCH : (fail ? WARN : SYRINGE);
    const title = fail ? '抑制失效' : (item.mode === 'patch' ? '阻隔贴' : '抑制剂');
    const sub = item.name || (fail ? '信息素外泄' : (item.mode === 'patch' ? '已贴合' : '已注射'));
    const node = box(env, `igs-abo-inhibitor is-${item.mode}`,
        `<div class="igs-abo-item"><span class="igs-abo-item-icon">${icon}</span><span class="igs-abo-item-text"><b>${esc(title)}</b><em>${esc(sub)}</em></span></div>`);
    return { layer: 'front', life: life(LIFE.inhibitor, env), sounds: [fail ? 'abo-warn' : (item.mode === 'patch' ? 'abo-patch' : 'abo-inject')], node };
}

const BITE = '<svg viewBox="0 0 100 100" aria-hidden="true" style="fill:none"><path class="igs-abo-fang" pathLength="1" d="M30 38q-6 14 8 26M70 38q6 14-8 26M38 68q12 8 24 0"/><circle class="igs-abo-dot" cx="40" cy="44" r="3"/><circle class="igs-abo-dot" cx="60" cy="44" r="3"/></svg>';
const SIGIL = '<svg viewBox="0 0 100 100" aria-hidden="true" style="fill:none"><circle class="igs-abo-sigil-ring" pathLength="1" cx="50" cy="50" r="40"/><path class="igs-abo-sigil-core" pathLength="1" d="M50 22l6 20 20 8-20 8-6 20-6-20-20-8 20-8z"/><circle class="igs-abo-dot" cx="50" cy="50" r="3"/></svg>';

function bondBuilder(item, env) {
    const head = resolveHeadAnchor(env, item.who);
    const forever = item.mode === 'life';
    const size = Math.max(7, head.d * 0.9);
    const node = box(env, `igs-abo-bond is-${forever ? 'life' : 'temp'}`,
        `<div class="igs-abo-mark" style="left:${pct(head.x)}%;top:${pct(head.y + head.d * 0.85)}%;width:${pct(size)}%">${forever ? SIGIL : BITE}</div>${forever ? `<div class="igs-abo-pulse" style="left:${pct(head.x)}%;top:${pct(head.y + head.d * 0.85)}%;width:${pct(size * 1.5)}%"></div>` : ''}`);
    return { layer: 'stage', life: life(forever ? LIFE.bondLife : LIFE.bond, env), sounds: [forever ? 'abo-seal' : 'abo-bond'], node };
}

function gendertestBuilder(item, env) {
    const tone = panelToneOf(env);
    const node = box(env, 'igs-abo-report',
        `<div class="igs-panel is-${tone}"><div class="igs-panel-title">第二性别分化报告</div><div class="igs-panel-rows">`
        + `<div class="igs-panel-row"><span class="igs-panel-k">受检者</span><span class="igs-panel-v">${esc(item.who)}</span></div>`
        + '<div class="igs-panel-row"><span class="igs-panel-k">检测项</span><span class="igs-panel-v">腺体与信息素</span></div>'
        + `<div class="igs-panel-row igs-abo-result"><span class="igs-panel-k">分化结果</span><span class="igs-panel-v igs-abo-reveal">${charSpans(item.result, 220, 1500)}</span></div>`
        + '</div><div class="igs-panel-foot">检测完毕</div></div>');
    return { layer: 'front', life: life(LIFE.gendertest, env), sounds: ['abo-scan'], node };
}

function matchBuilder(item, env) {
    const value = Math.max(0, Math.min(100, Number(item.percent) || 0));
    const node = box(env, 'igs-abo-match',
        `<div class="igs-abo-match-card"><div class="igs-abo-match-names"><span>${esc(item.a)}</span><i></i><span>${esc(item.b)}</span></div>`
        + `<div class="igs-abo-ring-wrap" style="--igs-abo-pct:${value}"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="igs-abo-track" cx="50" cy="50" r="42"/><circle class="igs-abo-arc" pathLength="100" cx="50" cy="50" r="42"/></svg><b class="igs-abo-pct-num"><span class="igs-abo-pct">${value}</span>%</b></div>`
        + '<div class="igs-abo-match-cap">信息素匹配度</div></div>');
    const target = typeof node.querySelector === 'function' ? node.querySelector('.igs-abo-pct') : null;
    if (target) rollNumber(target, 0, value, 1600, { reduced: env.reduced });
    return { layer: 'front', life: life(LIFE.match, env), sounds: ['abo-match'], node };
}

const SHIRT = '<path d="M-7-6l4-3h6l4 3 4 3-3 4-3-2v12h-12v-12l-3 2-3-4z"/>';

function nestBuilder(item, env) {
    const items = Array.from({ length: 6 }, (_, i) => `<g class="igs-abo-cloth" style="--i:${i}">${SHIRT}</g>`).join('');
    const who = item.who ? `<span class="igs-abo-nest-who">${esc(item.who)}</span>` : '';
    const node = box(env, 'igs-abo-nest',
        `<div class="igs-abo-nest-badge"><svg viewBox="-50 -50 100 100" aria-hidden="true"><circle class="igs-abo-nest-ring" r="38"/>${items}<path class="igs-abo-nest-heart" d="M0 10c-9-6-12-11-12-15a6 6 0 0112-1 6 6 0 0112 1c0 4-3 9-12 15z" transform="scale(.8)"/></svg>${who}<em>筑巢中</em></div>`);
    const nestMs = life(LIFE.nest, env) - 600;
    reactSprite(env, item.who, [at(0, 'translate(0,0) scale(1)'), at(0.28, 'translate(0,1.4%) scale(.985)'), at(0.8, 'translate(0,1.4%) scale(.985)'), at(1, 'translate(0,0) scale(1)')], { duration: nestMs, delay: 300 });
    reactSprite(env, item.who, [atFilter(0, 'saturate(1) brightness(1)'), atFilter(0.3, 'saturate(1.1) brightness(1.04) hue-rotate(-5deg)'), atFilter(0.8, 'saturate(1.1) brightness(1.04) hue-rotate(-5deg)'), atFilter(1, 'saturate(1) brightness(1)')], { duration: nestMs, delay: 300 });
    return { layer: 'front', life: life(LIFE.nest, env), sounds: ['abo-nest'], node };
}

function detectorBuilder(item, env) {
    const level = Math.max(0, Math.min(100, Number(item.level) || 0));
    const tone = level >= 75 ? 'bad' : (level >= 40 ? 'warn' : 'good');
    const g = gaugeHtml({ label: '浓度', value: level, max: 100, tone, text: `${level}%` });
    const alarm = level >= 75;
    const node = box(env, `igs-abo-detector is-${tone}`,
        `<div class="igs-abo-det-card"><div class="igs-abo-det-head"><b>信息素检测仪</b>${item.place ? `<span>${esc(item.place)}</span>` : ''}</div>`
        + `<div class="${g.className}" style="${g.style}">${g.html}</div><div class="igs-abo-det-state">${alarm ? '浓度超标' : (tone === 'warn' ? '浓度偏高' : '浓度正常')}</div></div>${alarm ? '<div class="igs-abo-det-flash"></div>' : ''}`);
    const value = typeof node.querySelector === 'function' ? node.querySelector('.igs-gauge-value') : null;
    if (value) rollNumber(value, 0, level, 1200, { reduced: env.reduced, format: (n) => `${Math.round(n)}%` });
    return { layer: 'front', life: life(LIFE.detector, env), sounds: [alarm ? 'abo-alarm' : 'abo-scan'], node };
}

function phaseBuilder(item, env) {
    const heat = item.phase === 'heat';
    const known = item.ratio >= 0;
    const g = gaugeHtml({ label: '剩余', value: known ? item.ratio : 100, max: 100, tone: heat ? 'warn' : 'bad', text: item.remain || (known ? `${item.ratio}%` : '') });
    const who = item.who ? `<span class="igs-abo-phase-who">${esc(item.who)}</span>` : '';
    const node = box(env, `igs-abo-phase is-${item.phase}`,
        `<div class="igs-abo-phase-card"><div class="igs-abo-phase-head"><b>${heat ? '发情期' : '易感期'}</b>${who}</div>${known ? `<div class="${g.className}" style="${g.style}">${g.html}</div>` : `<div class="igs-abo-phase-text">${esc(item.remain || '持续中')}</div>`}</div>`);
    return { layer: 'front', life: life(LIFE.phase, env), sounds: ['abo-pulse'], node };
}

export const ABO_BUILDERS = Object.freeze({
    scent: scentBuilder,
    scentlink: scentlinkBuilder,
    suppress: suppressBuilder,
    soothe: sootheBuilder,
    inhibitor: inhibitorBuilder,
    bond: bondBuilder,
    gendertest: gendertestBuilder,
    match: matchBuilder,
    nest: nestBuilder,
    detector: detectorBuilder,
    phase: phaseBuilder,
});
