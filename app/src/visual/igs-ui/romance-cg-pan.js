import { CG_SHOTS, cgShotTransform } from './romance-senses.js';

// CG 镜头缓移：在 #igs-bg（CG 画在背景层上）的 transform 上跑一段慢速运镜，只动 transform，不加滤镜、不改尺寸。
// 状态挂在 #igs-stage-motion：data-igs-cgp 为 1 / 2 交替（换镜头时换动画名，让动画从头播），data-igs-cgp-hold 定格。
// 换镜头时从当前位置接着走（读一次计算样式），不会跳回起点。
const VARS = Object.freeze(['--igs-cgp-a', '--igs-cgp-b', '--igs-cgp-dur', '--igs-cgp-iter']);
const states = new WeakMap();

// 节奏档：只缩放运镜一圈的时长。auto 由阶段与本页文字长度决定（升温缓、顶点快、余韵缓；短句快、长段缓）。
export const CG_PACE_SCALE = Object.freeze({ slow: 1.6, medium: 1, fast: 0.55 });
export const CG_CUT_MS = 380;
const PHASE_PACE = Object.freeze({ rise: 'slow', steady: 'medium', climax: 'fast', after: 'slow' });

export function resolveCgPace({ pace = '', phase = '', textLength = 0 } = {}) {
    if (Object.hasOwn(CG_PACE_SCALE, pace)) return pace;
    if (pace !== 'auto') return '';
    const base = PHASE_PACE[phase] || 'medium';
    const n = Number(textLength) || 0;
    if (n > 0 && n < 30 && base === 'medium') return 'fast';
    if (n > 140 && base === 'medium') return 'slow';
    return base;
}

function setAttr(el, name, value) {
    if (!el || typeof el.setAttribute !== 'function') return;
    if (value == null || value === false) {
        if (el.hasAttribute(name)) el.removeAttribute(name);
    } else if (el.getAttribute(name) !== String(value)) {
        el.setAttribute(name, String(value));
    }
}

function setVar(el, name, value) {
    if (!el || !el.style || typeof el.style.setProperty !== 'function') return;
    if (value == null) el.style.removeProperty(name);
    else el.style.setProperty(name, String(value));
}

// 当前运镜位置（矩阵字符串）；读不到或没有变换时返回 ''。
function currentTransform(bg) {
    try {
        const view = bg && bg.ownerDocument && bg.ownerDocument.defaultView;
        const value = view && typeof view.getComputedStyle === 'function' ? view.getComputedStyle(bg).transform : '';
        return value && value !== 'none' ? value : '';
    } catch {
        return '';
    }
}

function cutIn(stage) {
    const bg = stage.querySelector && stage.querySelector('#igs-bg');
    if (!bg || typeof bg.animate !== 'function') return;
    try {
        bg.animate([{ opacity: 0.25, scale: '1.08' }, { opacity: 1 }], { duration: CG_CUT_MS, easing: 'cubic-bezier(.2,.7,.2,1)' });
    } catch { /* 不支持独立 scale 时保持直切 */ }
}

export function cancelCgPan(stage) {
    if (!stage) return;
    setAttr(stage, 'data-igs-cgp', null);
    setAttr(stage, 'data-igs-cgp-hold', null);
    for (const name of VARS) setVar(stage, name, null);
    states.delete(stage);
}

// info：{ url, shot, hold, pace, cut }；pace 缺省读舞台上的 data-igs-cgp-pace，cut 缺省读 data-igs-cgp-cut（换图时淡入 + 微推）；shot 为空表示不运镜。返回实际在跑的镜头名。
export function syncCgPan(stage, info = {}) {
    const spec = info.url ? CG_SHOTS[info.shot] : null;
    if (!stage || !spec) {
        if (stage && states.has(stage)) cancelCgPan(stage);
        return '';
    }
    let state = states.get(stage);
    const fresh = !state;
    if (!state) {
        state = { url: '', shot: '', pace: '', flip: 0 };
        states.set(stage, state);
    }
    const pace = Object.hasOwn(CG_PACE_SCALE, info.pace) ? info.pace : (stage.getAttribute && CG_PACE_SCALE[stage.getAttribute('data-igs-cgp-pace')] ? stage.getAttribute('data-igs-cgp-pace') : '');
    const cut = info.cut != null ? info.cut === true : Boolean(stage.getAttribute && stage.getAttribute('data-igs-cgp-cut'));
    if (state.url !== info.url || state.shot !== info.shot || state.pace !== pace) {
        // 同一张 CG 换镜头：从当前位置接着走；换了一张 CG：从新镜头的起点开始。
        const sameCg = !fresh && state.url === info.url;
        const from = sameCg ? currentTransform(stage.querySelector && stage.querySelector('#igs-bg')) : '';
        const swapped = !fresh && state.url !== info.url;
        state.url = info.url;
        state.shot = info.shot;
        state.pace = pace;
        state.flip = state.flip === 1 ? 2 : 1;
        setVar(stage, '--igs-cgp-a', from || cgShotTransform(spec.from));
        setVar(stage, '--igs-cgp-b', cgShotTransform(spec.to));
        setVar(stage, '--igs-cgp-dur', `${Number((spec.dur * (CG_PACE_SCALE[pace] || 1)).toFixed(2))}s`);
        setVar(stage, '--igs-cgp-iter', spec.loop ? 'infinite' : '1');
        setAttr(stage, 'data-igs-cgp', String(state.flip));
        if (swapped && cut) cutIn(stage);
    }
    setAttr(stage, 'data-igs-cgp-hold', info.hold === true ? '1' : null);
    return info.shot;
}
