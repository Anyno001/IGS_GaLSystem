// 转身过程：翻转状态变化的那一页播约 300ms 的转身（绕竖轴半圈，中段略压暗、轻微起伏），配一声衣料窸窣。
// 说话人立绘用独立属性 rotate，陪衬用独立属性 scale，均不占 transform；压暗与起伏用 composite:'add' 叠在现有滤镜和 translate 上。
// 低画质与减少动态直接停在终态（调用方已把终态写进内联样式）。
import { createSynthPartial, playSynthPartials } from './chat-sfx.js';

export const SPRITE_TURN_MS = 300;
export const SPRITE_STORM_MS = 520;
export const SPRITE_TURN_PERSPECTIVE = '900px';
export const SPRITE_GLANCE_NUDGE = 1.035;

export const SPRITE_TURN_PARTIALS = Object.freeze([
    createSynthPartial('noise', 3400, 1900, 0, 0.2, 0.5, { attack: 0.02, sweep: 1, q: 0.7 }),
    createSynthPartial('noise', 2200, 4200, 0.11, 0.17, 0.34, { attack: 0.02, sweep: 1, q: 0.8 }),
]);

export function playSpriteTurnSfx(sound) {
    if (!sound || sound.enabled === false || !(sound.volume > 0)) return null;
    try {
        return playSynthPartials(SPRITE_TURN_PARTIALS, { volume: sound.volume }) || null;
    } catch {
        return null;
    }
}

export const SPRITE_TURN_STYLE_TEXT = `
#igs-overlay #igs-sprite[data-igs-sprite-back]:not(.igs-sprite-editing){--igs-sprite-dim:brightness(.6) saturate(.75);}
#igs-overlay #igs-speaker[data-igs-back-hint]::after{content:attr(data-igs-back-hint);margin-left:.7em;font-size:.8em;font-weight:400;opacity:.8;letter-spacing:.04em;}
`.trim();

export const BACK_HINT_DEFAULT = '背对着你';
// 背影：角色登记了这个精确表情槽位就直接用这张图；没有时退回镜像 + 压暗（上方样式）+ 按此比例缩小，做出背身剪影感。
export const SPRITE_BACK_MOOD = '背影';
export const SPRITE_BACK_SCALE = 0.94;

export function cancelSpriteTurn(el) {
    const list = el && el._igsTurnAnims;
    if (!Array.isArray(list)) return;
    for (const anim of list) {
        try { anim.cancel(); } catch { /* 已结束 */ }
    }
    el._igsTurnAnims = null;
}

function frames(prop, from, to) {
    if (prop === 'scale') {
        const at = (on) => (on ? '-1 1' : '1 1');
        return [{ scale: at(from) }, { scale: '0.05 1', offset: 0.5 }, { scale: at(to) }];
    }
    const deg = (on) => `y ${on ? 180 : 0}deg`;
    return [{ rotate: deg(from) }, { rotate: `y ${from ? 93 : 87}deg`, offset: 0.5 }, { rotate: deg(to) }];
}

// el 的终态已写好；这里只播过程。prop 为 'rotate'（说话人）或 'scale'（陪衬）。
// variant：'glance' 回眸（镜头轻推）、'storm' 甩头离开（转身后朝画外退场，停在透明）。
// 回眸前面没有背对（朝向不变）时也播：侧转约 40° 再转回，表现「回头看一眼」。
export function playSpriteTurn(el, { from = false, to = false, prop = 'rotate', variant = '', posX = 50, reduced = false, lowQuality = false, stage = null, sound = null } = {}) {
    if (!el || typeof el.animate !== 'function') return null;
    const glanceInPlace = from === to && variant === 'glance';
    if (from === to && !glanceInPlace) return null;
    cancelSpriteTurn(el);
    if (reduced || lowQuality) return null;
    const anims = [];
    try {
        // 独立 rotate 属性排在 transform 之前，perspective() 放不进去；改给父层动画 perspective，
        // 只在转身期间生效，不碰 --igs-sd-* / --igs-rm-* / camera-impact 的 transform 与立绘自身属性。
        const host = el.parentElement;
        if (prop === 'rotate' && host && typeof host.animate === 'function') {
            const cx = Number(el.offsetLeft) + Number(el.offsetWidth) / 2;
            const cy = Number(el.offsetTop) + Number(el.offsetHeight) / 2;
            const origin = Number.isFinite(cx) && Number.isFinite(cy) ? `${cx}px ${cy}px` : '50% 50%';
            anims.push(host.animate(
                [{ perspective: SPRITE_TURN_PERSPECTIVE, perspectiveOrigin: origin }, { perspective: SPRITE_TURN_PERSPECTIVE, perspectiveOrigin: origin }],
                { duration: SPRITE_TURN_MS },
            ));
        }
        if (glanceInPlace) {
            const base = prop === 'scale' ? (to ? '-1 1' : '1 1') : `y ${to ? 180 : 0}deg`;
            const mid = prop === 'scale' ? (to ? '-0.6 1' : '0.6 1') : `y ${to ? 140 : 40}deg`;
            anims.push(el.animate([{ [prop]: base }, { [prop]: mid, offset: 0.4 }, { [prop]: mid, offset: 0.6 }, { [prop]: base }], { duration: SPRITE_TURN_MS * 2, easing: 'ease-in-out' }));
        } else {
            anims.push(el.animate(frames(prop, from, to), { duration: SPRITE_TURN_MS, easing: 'ease-in-out' }));
        }
        anims.push(el.animate(
            [{ filter: 'brightness(1)' }, { filter: 'brightness(.8)', offset: 0.5 }, { filter: 'brightness(1)' }],
            { duration: SPRITE_TURN_MS, easing: 'ease-in-out', composite: 'add' },
        ));
        anims.push(el.animate(
            [{ translate: '0 0' }, { translate: '0 -1.2%', offset: 0.5 }, { translate: '0 0' }],
            { duration: SPRITE_TURN_MS, easing: 'ease-in-out', composite: 'add' },
        ));
        if (variant === 'storm') {
            const dir = Number(posX) < 50 ? -1 : 1;
            anims.push(el.animate(
                [{ translate: '0 0' }, { translate: `${dir * 26}% 0` }],
                { duration: SPRITE_STORM_MS, delay: SPRITE_TURN_MS, easing: 'ease-in', fill: 'forwards', composite: 'add' },
            ));
            anims.push(el.animate(
                [{ opacity: 1 }, { opacity: 0 }],
                { duration: SPRITE_STORM_MS, delay: SPRITE_TURN_MS, easing: 'ease-in', fill: 'forwards' },
            ));
        }
        if (variant === 'glance' && stage && typeof stage.animate === 'function') {
            anims.push(stage.animate(
                [{ scale: '1' }, { scale: String(SPRITE_GLANCE_NUDGE), offset: 0.45 }, { scale: '1' }],
                { duration: 900, easing: 'ease-in-out' },
            ));
        }
    } catch {
        for (const anim of anims) { try { anim.cancel(); } catch { /* ignore */ } }
        return null;
    }
    el._igsTurnAnims = anims;
    try { playSpriteTurnSfx(sound); } catch { /* 音频不可用时静默 */ }
    return anims;
}
