// 结果展示组件的 DOM 层：卡片挂在 #igs-fx-front（对话层与选项之上）。
// 滚动数字预先整列写入 DOM，播放期只用 CSS 阶梯动画位移，不逐帧改写文本节点。
import { ensureFxLayers } from './fx-layer.js';
import { esc } from './reader-value-utils.js';
import { rollingFrames, rollStrip } from './fx-ticker.js';
import { cloneSpriteLayer, resolveRegionCrop } from './stage-snapshot.js';
import { isLowQuality, punchStage } from './fx-beats-punch.js';

const FADE_MS = 360;
// 结果定格后再停一小段才通知调用方继续（如发送输入），保证玩家看清结论。
const SETTLE_MS = 500;
const ROLL_FRAMES = 8;
const REEL_OUTCOMES = new Set(['win', 'lose', 'tie']);
const RESULT_TIERS = new Set(['crit', 'extreme', 'hard', 'regular', 'fumble']);
const DIE_SIDES = new Set([4, 6, 8, 10, 12, 20, 100]);
// 主题强调色只接受颜色字面量，避免把任意字符串写进样式变量。
const ACCENT_RE = /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\([\d\s.,%deg/]+\))$/i;
const states = new WeakMap();

function removeNode(node) {
    if (node && node.parentNode) node.parentNode.removeChild(node);
}

function clear(root) {
    const state = states.get(root);
    if (!state) return;
    for (const timer of state.timers) {
        try { state.cancel(timer); } catch (error) { /* ignore */ }
    }
    removeNode(state.node);
    if (state.resolve) {
        const resolve = state.resolve;
        state.resolve = null;
        resolve(false);
    }
    states.delete(root);
}

export function cancelResultFx(root) {
    if (root) clear(root);
}

// 骰池的滚动数字限在骰面范围内（d6 不会滚出 87）；最后一帧必为真实点数。
function framesOf(reel, rollMs, random) {
    if (!(rollMs > 0)) return [reel.value];
    const die = Number(reel.die);
    if (!(die > 0)) return rollingFrames(reel.value, ROLL_FRAMES, random);
    const frames = Array.from({ length: ROLL_FRAMES - 1 }, () => 1 + Math.floor(random() * die));
    frames.push(reel.value);
    return frames;
}

function reelHtml(reel, frames) {
    // 减速落点：整列连续滚动，缓动曲线收尾停在最后一格（真实骰点）。
    const { style, html: strip } = rollStrip(frames);
    const outcome = REEL_OUTCOMES.has(reel.outcome) ? ` is-${reel.outcome}` : '';
    const die = DIE_SIDES.has(Number(reel.die)) ? Number(reel.die) : 0;
    const win = `<div class="igs-fx-result-window"><div class="igs-fx-result-strip" style="${style}">${strip}</div></div>`;
    return `<div class="igs-fx-result-reel${outcome}${die ? ` is-die is-d${die}` : ''}"><div class="igs-fx-result-label">${esc(reel.label)}</div>`
        + (die ? `<div class="igs-fx-result-die">${win}</div>` : win)
        + (reel.sub ? `<div class="igs-fx-result-sub">${esc(reel.sub)}</div>` : '')
        + '</div>';
}

// 大成功的白闪与光芒、大失败的裂纹：只在定格后由 CSS 触发一次，低画质不画。
function tierDecoration(tier) {
    if (tier === 'crit') return '<i class="igs-fx-result-flash"></i><i class="igs-fx-result-rays"></i>';
    if (tier === 'fumble') return '<i class="igs-fx-result-flash is-dark"></i><svg class="igs-fx-result-crack" viewBox="0 0 100 60" aria-hidden="true"><path pathLength="1" d="M52 0L47 14L56 22L44 33L53 41L48 60"/><path pathLength="1" d="M47 14L34 20M56 22L70 19M44 33L30 38M53 41L66 47"/></svg>';
    return '';
}

function castSpriteOf(root, name) {
    return Array.from(root.querySelectorAll('.igs-cast-sprite')).find((el) => el.getAttribute('data-igs-cast-char') === name) || null;
}

function urlOfImage(image) {
    const m = String(image || '').match(/url\((['"]?)(.*?)\1\)/);
    return m ? m[2] : '';
}

// 对抗分屏头像：台上有这位角色就裁立绘当前的脸（跟随服装表情），没有就用姓名首字。
function avatarNode(root, doc, who, speaker) {
    const name = String(who || '').trim();
    const wrap = doc.createElement('div');
    wrap.className = 'igs-fx-result-ava';
    wrap.setAttribute('aria-hidden', 'true');
    const sprite = !name ? null : (name === speaker ? root.querySelector('#igs-sprite') : castSpriteOf(root, name));
    if (sprite) {
        const crop = resolveRegionCrop({ url: sprite.style ? urlOfImage(sprite.style.backgroundImage) : '' }, 'face', 1);
        const face = cloneSpriteLayer(root, name, { speaker, crop });
        if (face) {
            wrap.appendChild(face);
            return wrap;
        }
    }
    wrap.className = 'igs-fx-result-ava is-initial';
    wrap.textContent = Array.from(name)[0] || '?';
    return wrap;
}

function mountAvatars(root, node, plan, speaker) {
    if (plan.layout !== 'contest' || typeof node.querySelectorAll !== 'function') return;
    node.querySelectorAll('.igs-fx-result-reel').forEach((reelNode, index) => {
        const reel = plan.reels[index];
        if (!reel || !reel.who) return;
        reelNode.insertBefore(avatarNode(root, node.ownerDocument, reel.who, speaker), reelNode.firstChild);
    });
}

// 返回 { node, settled }：settled 在结论显示后 resolve(true)，被取消时 resolve(false)。
// plan 为空或舞台不可用时返回 null，调用方照常继续。
export function playResultFx(root, plan, options = {}) {
    if (!plan || !Array.isArray(plan.reels)) return null;
    const layers = ensureFxLayers(root);
    if (!layers || !layers.front) return null;
    clear(root);
    const reduced = options.reducedMotion === true;
    const rollMs = reduced ? 0 : Math.max(0, Number(plan.rollMs) || 0);
    const holdMs = Math.max(0, Number(plan.holdMs) || 0);
    const schedule = options.schedule || ((fn, ms) => setTimeout(fn, ms));
    const cancel = options.cancel || ((timer) => clearTimeout(timer));
    const random = options.random || Math.random;
    const reels = plan.reels
        .map((reel) => reelHtml(reel, framesOf(reel, rollMs, random)))
        .join(plan.layout === 'contest' ? '<div class="igs-fx-result-vs">VS</div>' : '');
    const node = layers.doc.createElement('div');
    node.className = `igs-fx-result is-${plan.tone || 'neutral'}${plan.layout ? ` is-${plan.layout}` : ''}${reduced ? ' is-reduced' : ''}`;
    node.setAttribute('data-igs-fx-result', String(plan.type || 'result'));
    if (RESULT_TIERS.has(plan.tier)) node.setAttribute('data-igs-fx-result-tier', plan.tier);
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
    node.setAttribute('aria-label', `${plan.title || ''} ${plan.verdict || ''}`.trim());
    if (node.style && typeof node.style.setProperty === 'function') node.style.setProperty('--igs-fx-result-roll', `${rollMs}ms`);
    const accent = String(options.accent || '').trim();
    if (accent && ACCENT_RE.test(accent) && node.style && typeof node.style.setProperty === 'function') {
        node.style.setProperty('--igs-fx-result-accent', accent);
    }
    node.innerHTML = `<div class="igs-fx-result-title">${esc(plan.title)}</div>`
        + (reels ? `<div class="igs-fx-result-reels">${reels}</div>` : '')
        + `<div class="igs-fx-result-verdict">${esc(plan.verdict)}</div>`
        + (plan.sub ? `<div class="igs-fx-result-note">${esc(plan.sub)}</div>` : '')
        + (reduced ? '' : tierDecoration(plan.tier));
    mountAvatars(root, node, plan, String(options.speaker || '').trim());
    layers.front.appendChild(node);
    const state = { node, timers: [], cancel, resolve: null };
    states.set(root, state);
    const settled = new Promise((resolve) => { state.resolve = resolve; });
    // 落点：滚动结束瞬间切到定格态，触发落点回弹、档位强调与对抗胜负高亮。
    state.timers.push(schedule(() => {
        if (states.get(root) !== state) return;
        node.className = `${node.className} is-settled`;
        if (!reduced && (plan.tier === 'crit' || plan.tier === 'fumble')) {
            const punched = punchStage(layers.motion, { low: isLowQuality(root), scale: plan.tier === 'crit' ? 1.06 : 1.04 });
            if (punched && typeof options.playSfx === 'function') options.playSfx('impact');
        }
    }, rollMs));
    state.timers.push(schedule(() => {
        if (!state.resolve) return;
        const resolve = state.resolve;
        state.resolve = null;
        resolve(true);
    }, rollMs + (reduced ? 0 : SETTLE_MS)));
    state.timers.push(schedule(() => {
        node.className = `${node.className} is-leaving`;
    }, rollMs + holdMs));
    state.timers.push(schedule(() => {
        if (states.get(root) !== state) return;
        removeNode(node);
        states.delete(root);
    }, rollMs + holdMs + FADE_MS));
    return { node, settled };
}

export const RESULT_FX_STYLE_TEXT = `
.igs-fx-result{position:absolute;left:50%;top:36%;transform:translate(-50%,-50%);min-width:min(240px,70%);max-width:88%;box-sizing:border-box;padding:14px 22px 12px;border-radius:14px;background:rgba(18,18,24,.84);color:#fff;text-align:center;box-shadow:0 8px 28px rgba(0,0,0,.35);font-variant-numeric:tabular-nums;border-top:3px solid var(--igs-fx-result-accent,rgba(255,255,255,.28));animation:igs-fx-result-in .22s ease-out both;}
.igs-fx-result.is-leaving{animation:igs-fx-result-out .36s ease-in forwards;}
.igs-fx-result-title{font-size:.9em;opacity:.82;margin-bottom:6px;}
.igs-fx-result-reels{display:flex;gap:22px;justify-content:center;}
.igs-fx-result-label,.igs-fx-result-sub{font-size:.75em;opacity:.72;}
.igs-fx-result-window{height:1.2em;line-height:1.2em;overflow:hidden;font-size:2.2em;font-weight:700;}
.igs-fx-result-strip{animation:igs-fx-result-roll var(--igs-fx-result-roll,0ms) cubic-bezier(.12,.72,.22,1) forwards;}
.igs-fx-result-strip span{display:block;height:1.2em;}
.igs-fx-result-verdict{margin-top:8px;font-size:1.15em;font-weight:700;letter-spacing:.08em;animation:igs-fx-result-verdict .28s ease-out both;animation-delay:var(--igs-fx-result-roll,0ms);}
.igs-fx-result.is-crit .igs-fx-result-verdict{color:#ffd66b;}
.igs-fx-result.is-success .igs-fx-result-verdict{color:#8fe3a6;}
.igs-fx-result.is-fail .igs-fx-result-verdict{color:#ff9f9f;}
.igs-fx-result.is-fumble .igs-fx-result-verdict{color:#ff5c5c;}
.igs-fx-result.is-tie .igs-fx-result-verdict{color:#cfd6ff;}
.igs-fx-result.is-settled .igs-fx-result-window{animation:igs-fx-result-land .32s ease-out;}
.igs-fx-result[data-igs-fx-result-tier="hard"] .igs-fx-result-verdict{text-shadow:0 0 8px currentColor;}
.igs-fx-result[data-igs-fx-result-tier="extreme"] .igs-fx-result-verdict{letter-spacing:.16em;text-shadow:0 0 12px currentColor;}
.igs-fx-result.is-crit.is-settled:not(.is-leaving){animation:igs-fx-result-glow 1.1s ease-out both;}
.igs-fx-result.is-fumble.is-settled:not(.is-leaving){animation:igs-fx-result-shake .42s ease-in-out both;}
.igs-fx-result.is-settled .igs-fx-result-reel.is-win .igs-fx-result-window{color:var(--igs-fx-result-accent,#ffd66b);}
.igs-fx-result.is-settled .igs-fx-result-reel.is-lose{opacity:.5;filter:grayscale(.6);transition:opacity .3s,filter .3s;}
@keyframes igs-fx-result-in{from{opacity:0;transform:translate(-50%,-44%) scale(.92);}to{opacity:1;transform:translate(-50%,-50%) scale(1);}}
@keyframes igs-fx-result-out{to{opacity:0;transform:translate(-50%,-56%);}}
@keyframes igs-fx-result-roll{from{transform:translateY(0);}to{transform:translateY(var(--igs-fx-result-shift,0));}}
@keyframes igs-fx-result-verdict{from{opacity:0;transform:scale(1.4);}to{opacity:1;transform:scale(1);}}
@keyframes igs-fx-result-land{0%{transform:scale(1.18);}60%{transform:scale(.96);}100%{transform:scale(1);}}
@keyframes igs-fx-result-glow{0%{box-shadow:0 0 0 0 var(--igs-fx-result-accent,#ffd66b),0 8px 28px rgba(0,0,0,.35);}40%{box-shadow:0 0 26px 6px var(--igs-fx-result-accent,#ffd66b),0 8px 28px rgba(0,0,0,.35);}100%{box-shadow:0 0 10px 1px var(--igs-fx-result-accent,#ffd66b),0 8px 28px rgba(0,0,0,.35);}}
@keyframes igs-fx-result-shake{0%,100%{transform:translate(-50%,-50%);}25%{transform:translate(calc(-50% - 5px),-50%);}50%{transform:translate(calc(-50% + 4px),-50%);}75%{transform:translate(calc(-50% - 2px),-50%);}}
.igs-fx-result-note{margin-top:4px;font-size:.78em;opacity:.7;}
.igs-fx-result.is-contest .igs-fx-result-reels{align-items:center;gap:14px;}
.igs-fx-result-vs{flex:none;align-self:center;font-weight:800;font-size:.95em;letter-spacing:.1em;color:#ffd66b;opacity:.9;}
.igs-fx-result-ava{position:relative;width:46px;height:46px;margin:0 auto 6px;border-radius:50%;overflow:hidden;background:#2c2c36;border:2px solid #f4f4f4;}
.igs-fx-result-ava.is-initial{display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.2em;color:#f4f4f4;}
.igs-fx-result.is-settled .igs-fx-result-reel.is-lose .igs-fx-result-ava{border-color:#777;}
.igs-fx-result.is-settled .igs-fx-result-reel.is-win .igs-fx-result-ava{border-color:var(--igs-fx-result-accent,#ffd66b);}
.igs-fx-result.is-pool .igs-fx-result-reels{flex-wrap:wrap;gap:12px 14px;}
.igs-fx-result-die{position:relative;width:3.4em;height:3.4em;margin:2px auto;display:flex;align-items:center;justify-content:center;background:var(--igs-fx-result-accent,#d8d8e2);}
.igs-fx-result-die::before{content:"";position:absolute;inset:3px;background:#24242e;}
.igs-fx-result-die .igs-fx-result-window{position:relative;font-size:1.5em;}
.igs-fx-result-reel.is-d4 .igs-fx-result-die,.igs-fx-result-reel.is-d4 .igs-fx-result-die::before{clip-path:polygon(50% 3%,97% 93%,3% 93%);}
.igs-fx-result-reel.is-d4 .igs-fx-result-die::before{inset:0;transform:scale(.88);transform-origin:50% 70%;}
.igs-fx-result-reel.is-d4 .igs-fx-result-die{padding-top:.5em;}
.igs-fx-result-reel.is-d6 .igs-fx-result-die,.igs-fx-result-reel.is-d6 .igs-fx-result-die::before{border-radius:16%;}
.igs-fx-result-reel.is-d100 .igs-fx-result-die,.igs-fx-result-reel.is-d100 .igs-fx-result-die::before{border-radius:50%;}
.igs-fx-result-reel.is-d8 .igs-fx-result-die,.igs-fx-result-reel.is-d8 .igs-fx-result-die::before{clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);}
.igs-fx-result-reel.is-d10 .igs-fx-result-die,.igs-fx-result-reel.is-d10 .igs-fx-result-die::before{clip-path:polygon(50% 0,100% 40%,50% 100%,0 40%);}
.igs-fx-result-reel.is-d12 .igs-fx-result-die,.igs-fx-result-reel.is-d12 .igs-fx-result-die::before{clip-path:polygon(50% 0,100% 38%,82% 100%,18% 100%,0 38%);}
.igs-fx-result-reel.is-d20 .igs-fx-result-die,.igs-fx-result-reel.is-d20 .igs-fx-result-die::before{clip-path:polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%);}
:is(.is-d8,.is-d10,.is-d12,.is-d20) .igs-fx-result-die::before{inset:0;transform:scale(.9);}
.igs-fx-result-flash{position:absolute;left:50%;top:50%;width:280%;aspect-ratio:1;transform:translate(-50%,-50%) scale(.2);border-radius:50%;background:radial-gradient(circle,#ffffff 0,#ffffff00 64%);opacity:0;pointer-events:none;}
.igs-fx-result-flash.is-dark{background:radial-gradient(circle,#2a0606 0,#2a060600 64%);}
.igs-fx-result-rays{position:absolute;left:50%;top:50%;width:230%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;background:repeating-conic-gradient(#ffd66b 0 4deg,#ffd66b00 4deg 20deg);opacity:0;pointer-events:none;-webkit-mask:radial-gradient(circle,#000 0,#0000 68%);mask:radial-gradient(circle,#000 0,#0000 68%);}
.igs-fx-result-crack{position:absolute;left:50%;top:-8px;width:62%;height:auto;transform:translateX(-50%);pointer-events:none;overflow:visible;}
.igs-fx-result-crack path{fill:none;stroke:#ff5c5c;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1;stroke-dashoffset:1;}
.igs-fx-result.is-settled .igs-fx-result-flash{animation:igs-fx-result-flash .75s ease-out both;}
.igs-fx-result.is-settled .igs-fx-result-rays{animation:igs-fx-result-rays 1.3s ease-out both;}
.igs-fx-result.is-settled .igs-fx-result-crack path{animation:igs-fx-result-crack .5s ease-out .08s forwards;}
@keyframes igs-fx-result-flash{0%{opacity:.95;transform:translate(-50%,-50%) scale(.2);}100%{opacity:0;transform:translate(-50%,-50%) scale(1);}}
@keyframes igs-fx-result-rays{0%{opacity:.8;transform:translate(-50%,-50%) rotate(0deg) scale(.5);}100%{opacity:0;transform:translate(-50%,-50%) rotate(24deg) scale(1.1);}}
@keyframes igs-fx-result-crack{to{stroke-dashoffset:0;}}
#igs-overlay[data-igs-quality="low"] :is(.igs-fx-result-flash,.igs-fx-result-rays){display:none;}
#igs-overlay[data-igs-quality="low"] .igs-fx-result-crack path{animation:none;stroke-dashoffset:0;}
.igs-fx-result.is-reduced,.igs-fx-result.is-reduced *{animation:none!important;}
@media (prefers-reduced-motion: reduce){.igs-fx-result,.igs-fx-result.is-leaving,.igs-fx-result-strip,.igs-fx-result-window,.igs-fx-result-verdict,.igs-fx-result-flash,.igs-fx-result-rays,.igs-fx-result-crack path{animation:none!important;}}
`;
