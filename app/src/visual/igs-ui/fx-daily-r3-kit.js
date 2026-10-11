// 古风修仙与体贴动作演出共用的小工具：寿命表、人体锚点、同屏陪衬读取、安全的 WAAPI 叠加。
import { readStageBackground, resolveHeadAnchor, spritePosX } from './stage-snapshot.js';
import { playSpriteSpec } from './sprite-actions.js';

export const R3_LIFE_MS = Object.freeze({
    guqin: 4200, go: 4200, edict: 5400, tea: 3400, bow: 1500, yujian: 3200, biguan: 5000, dianxue: 2800, qinggong: 2200, yungong: 3800,
    opendoor: 3000, shield: 2800, tend: 3200, carry: 3600, bubble: 3400,
});

// 分镜按绝对时刻编排（音效也是），所以「短」档不压缩，只有「长」档才拉长停留。
export const lifeOf = (kind, env) => Math.round(R3_LIFE_MS[kind] * Math.max(1, env.hold || 1));
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const round1 = (n) => Math.round(n * 10) / 10;

export function seeded(seed) {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

// 指名角色的身体锚点（舞台百分比）：头、嘴、胸、腰；d 是头宽占舞台宽的 %，h 是头高占舞台高的 %。
export function bodyAnchor(env, who = '') {
    const head = resolveHeadAnchor(env, who);
    const aspect = readStageBackground(env.root).aspect || 16 / 9;
    const h = head.d * aspect * 1.1;
    return {
        x: round1(head.x), head: round1(head.y), mouth: round1(head.y + h * 0.28),
        chest: round1(clamp(head.y + h * 1.15, 24, 78)), waist: round1(clamp(head.y + h * 2.6, 30, 82)),
        d: round1(head.d), h: round1(h),
    };
}

// 同屏陪衬：元素与横向位置（百分比）。
export function castFigures(env) {
    return Array.from(env.root.querySelectorAll('.igs-cast-sprite'))
        .filter((el) => el.style && el.style.backgroundImage && el.style.display !== 'none' && !(typeof el.hasAttribute === 'function' && el.hasAttribute('data-igs-cast-leaving')))
        .map((el) => ({ el, x: spritePosX({ visible: true, position: el.style.backgroundPosition }) }));
}

export const spec = (duration, frames, easing = 'ease-in-out') => ({ duration, easing, frames });

export function play(env, el, s) {
    return env.reduced ? null : playSpriteSpec(el, s);
}

export function safeAnimate(el, frames, options) {
    if (!el || typeof el.animate !== 'function') return null;
    try {
        return el.animate(frames, options);
    } catch {
        return null;
    }
}

export function visibleSprite(el) {
    return Boolean(el && el.style && el.style.backgroundImage && el.style.display !== 'none');
}
