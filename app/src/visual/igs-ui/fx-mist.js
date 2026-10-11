// 气雾：信息素、水汽、香气。单个节点叠几层径向渐变，颜色由 CSS 变量传入；慢飘只用一次性 WAAPI 位移，
// 低画质与减少动态效果时静态。同一层最多 3 团。
export const MIST_MAX = 3;
const COLOR_RE = /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\([\d\s.,%deg/]+\))$/i;

// color 只接受颜色字面量；x / y / size 是舞台百分比（中心点与宽度）。
// 返回节点，超过上限或参数无效时返回 null。
export function spawnMist(layer, { x = 50, y = 60, size = 46, color = '#ff9ec7', drift = 6 } = {}, { reduced = false } = {}) {
    if (!layer || typeof layer.appendChild !== 'function') return null;
    const doc = layer.ownerDocument;
    const live = Array.from(layer.children || []).filter((el) => el.classList && el.classList.contains('igs-mist')).length;
    if (live >= MIST_MAX) return null;
    const c = COLOR_RE.test(String(color)) ? color : '#ff9ec7';
    const node = doc.createElement('div');
    node.className = `igs-mist${reduced ? ' is-reduced' : ''}`;
    node.setAttribute('aria-hidden', 'true');
    const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Number(n) || 0));
    node.setAttribute('style', `left:${clamp(x, 0, 100)}%;top:${clamp(y, 0, 100)}%;width:${clamp(size, 10, 100)}%;--igs-mist-color:${c}`);
    node.innerHTML = '<i class="igs-mist-a"></i><i class="igs-mist-b"></i><i class="igs-mist-c"></i>';
    layer.appendChild(node);
    if (!reduced && typeof node.animate === 'function') {
        const d = clamp(drift, 0, 20);
        try {
            node.animate([{ transform: 'translate(-50%,-50%)' }, { transform: `translate(calc(-50% + ${d}%),calc(-50% - ${d / 2}%))` }], { duration: 9000, easing: 'ease-in-out', direction: 'alternate', iterations: 1, fill: 'forwards' });
        } catch { /* 不支持 WAAPI 时保持静态 */ }
    }
    return node;
}

export const MIST_STYLE_TEXT = `
.igs-mist{position:absolute;aspect-ratio:1/1;transform:translate(-50%,-50%);pointer-events:none;filter:blur(14px);}
.igs-mist i{position:absolute;inset:0;border-radius:50%;}
.igs-mist-a{background:radial-gradient(closest-side,var(--igs-mist-color),transparent 72%);opacity:.55;}
.igs-mist-b{inset:14% 0 0 22%!important;background:radial-gradient(closest-side,var(--igs-mist-color),transparent 70%);opacity:.4;}
.igs-mist-c{inset:30% 26% 0 0!important;background:radial-gradient(closest-side,var(--igs-mist-color),transparent 68%);opacity:.34;}
.igs-mist.is-reduced{filter:none;}
#igs-overlay[data-igs-quality="low"] .igs-mist{filter:none;}
`;
