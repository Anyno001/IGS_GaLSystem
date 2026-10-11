// 连线：红线 / 视线 / 光丝 / 关系箭头 / 信息素交缠。挂在 #igs-fx-stage 上的一层 SVG，端点取立绘头部位置。
// 样式只有两种：line（细线，描一次后静止）和 mist（宽描边 + 模糊的雾状带，静态）。同一层最多 3 条。
import { esc } from './reader-value-utils.js';
import { resolveHeadAnchor } from './stage-snapshot.js';

export const LINK_MAX = 3;
export const LINK_STYLES = Object.freeze(['line', 'mist']);
export const LINK_TONES = Object.freeze({ red: '#d23b3b', amber: '#ffb84d', cyan: '#7fe0ff', pink: '#ff8ab8', violet: '#a98bff', white: '#f4f4f4' });

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const num = (n) => Math.round(n * 10) / 10;

// 纯函数：两点之间下垂的二次曲线（单位是舞台百分比），端点略微内缩免得线头压在脸上。
export function linkPath(a, b, { sag = 8, trim = 4 } = {}) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const p1 = { x: a.x + ux * trim, y: a.y + uy * trim };
    const p2 = { x: b.x - ux * trim, y: b.y - uy * trim };
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2 + sag;
    return `M${num(p1.x)} ${num(p1.y)}Q${num(mx)} ${num(my)} ${num(p2.x)} ${num(p2.y)}`;
}

function pointOf(env, end) {
    if (end && typeof end === 'object' && Number.isFinite(Number(end.x)) && Number.isFinite(Number(end.y))) return { x: clamp(Number(end.x), 0, 100), y: clamp(Number(end.y), 0, 100) };
    const anchor = resolveHeadAnchor(env, end);
    return { x: clamp(anchor.x, 0, 100), y: clamp(anchor.y, 0, 100) };
}

function toneColor(tone) {
    if (Object.hasOwn(LINK_TONES, tone)) return LINK_TONES[tone];
    return /^#[0-9a-f]{3,8}$/i.test(String(tone || '')) ? tone : LINK_TONES.red;
}

// links: [{ from, to, tone, style, label }]，from / to 是角色名或 {x,y}（舞台百分比）。返回挂好的容器节点，没有可画的线时返回 null。
// reduced 时线条不描画动画（直接显示）。
export function drawLinks(layer, links, env, { reduced = false } = {}) {
    if (!layer || !env || !Array.isArray(links)) return null;
    const doc = layer.ownerDocument;
    const list = links.filter((link) => link && link.from != null && link.to != null).slice(0, LINK_MAX);
    if (!list.length) return null;
    const box = doc.createElement('div');
    box.className = `igs-links${reduced ? ' is-reduced' : ''}`;
    box.setAttribute('aria-hidden', 'true');
    let paths = '';
    let labels = '';
    list.forEach((link, index) => {
        const a = pointOf(env, link.from);
        const b = pointOf(env, link.to);
        const style = LINK_STYLES.includes(link.style) ? link.style : 'line';
        const color = toneColor(link.tone);
        paths += `<path class="igs-link is-${style}" pathLength="1" d="${linkPath(a, b, { sag: 6 + index * 3 })}" stroke="${color}"/>`;
        if (link.label) labels += `<span class="igs-link-label" style="left:${num((a.x + b.x) / 2)}%;top:${num((a.y + b.y) / 2 + 3)}%;background:${color}">${esc(link.label)}</span>`;
    });
    box.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none">${paths}</svg>${labels}`;
    layer.appendChild(box);
    return box;
}

export const LINKS_STYLE_TEXT = `
.igs-links{position:absolute;inset:0;pointer-events:none;}
.igs-links svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;}
.igs-link{fill:none;stroke-linecap:round;vector-effect:non-scaling-stroke;}
.igs-link.is-line{stroke-width:2px;stroke-dasharray:1;stroke-dashoffset:0;animation:igs-link-draw .9s ease-out both;}
.igs-link.is-mist{stroke-width:16px;opacity:.55;filter:blur(7px);}
.igs-link-label{position:absolute;transform:translate(-50%,-50%);padding:1px 8px;border-radius:9px;color:#1b1b1b;font-size:.75em;font-weight:700;white-space:nowrap;}
.igs-links.is-reduced .igs-link.is-line{animation:none;}
#igs-overlay[data-igs-quality="low"] .igs-link.is-mist{filter:none;opacity:.35;}
#igs-overlay[data-igs-quality="low"] .igs-link.is-line{animation:none;}
@keyframes igs-link-draw{from{stroke-dashoffset:1;}to{stroke-dashoffset:0;}}
`;
