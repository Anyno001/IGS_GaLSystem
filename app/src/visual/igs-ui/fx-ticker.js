// 数字滚动：掷骰卡的整列滚轮、到账 / 票数的逐帧数字、条形榜的动态排序都从这里出。
import { esc } from './reader-value-utils.js';

const ROLL_LINE_EM = 1.2;

// 过程动画中显示的滚动数字：确定性序列，便于测试；最后一帧必为真实结果。
export function rollingFrames(finalValue, count = 8, random = Math.random) {
    const frames = [];
    for (let i = 0; i < Math.max(0, count - 1); i += 1) frames.push(1 + Math.floor(random() * 100));
    frames.push(finalValue);
    return frames;
}

// 整列滚轮：滚动数字预先整列写入 DOM，播放期只用 CSS 阶梯动画位移，不逐帧改写文本节点。
export function rollStrip(frames) {
    const count = frames.length;
    return {
        style: count > 1 ? `--igs-fx-result-shift:${-(count - 1) * ROLL_LINE_EM}em` : 'animation:none',
        html: frames.map((value) => `<span>${esc(value)}</span>`).join(''),
    };
}

const easeOut = (t) => 1 - (1 - t) ** 3;

function defaultRaf(fn) {
    const raf = globalThis.requestAnimationFrame;
    if (typeof raf === 'function') return raf(fn);
    return setTimeout(() => fn(Date.now()), 16);
}

function defaultCaf(handle) {
    const caf = globalThis.cancelAnimationFrame;
    if (typeof caf === 'function') caf(handle);
    else clearTimeout(handle);
}

// 把 node 的文字从 from 滚到 to；reduced 或 ms<=0 时直接落终值。返回 { stop }，stop 后停在当前帧不再更新。
// format 把数值转成显示文字（默认取整）。raf / caf / now 可注入，方便测试。
export function rollNumber(node, from, to, ms, { reduced = false, format = null, raf = defaultRaf, caf = defaultCaf, now = () => Date.now() } = {}) {
    const a = Number(from);
    const b = Number(to);
    const fmt = typeof format === 'function' ? format : (n) => String(Math.round(n));
    const settle = () => { node.textContent = fmt(Number.isFinite(b) ? b : 0); };
    const duration = Math.max(0, Number(ms) || 0);
    if (reduced || duration <= 0 || !Number.isFinite(a) || !Number.isFinite(b) || a === b) {
        settle();
        return { stop() {} };
    }
    let handle = null;
    let stopped = false;
    const start = now();
    const tick = () => {
        if (stopped) return;
        const t = Math.min(1, (now() - start) / duration);
        if (t >= 1) {
            settle();
            return;
        }
        node.textContent = fmt(a + (b - a) * easeOut(t));
        handle = raf(tick);
    };
    node.textContent = fmt(a);
    handle = raf(tick);
    return { stop() { stopped = true; if (handle != null) caf(handle); } };
}

// 条形榜：rows 为 [{ key, label, value }]，按 value 降序排；每行用 transform 位移到名次位置，宽度是占最大值的百分比。
// 再次对同一个 node 调用会复用已有行，名次变化只改 transform（不触发 layout 动画）。
export function rollBars(node, rows, { rowHeight = 30, max = 8, reduced = false, format = null } = {}) {
    const doc = node.ownerDocument;
    const fmt = typeof format === 'function' ? format : (n) => String(Math.round(n));
    const list = (Array.isArray(rows) ? rows : [])
        .filter((row) => row && row.key != null && Number.isFinite(Number(row.value)))
        .map((row) => ({ key: String(row.key), label: String(row.label == null ? row.key : row.label), value: Number(row.value) }))
        .sort((x, y) => y.value - x.value)
        .slice(0, Math.max(1, max));
    const top = list.reduce((m, row) => Math.max(m, row.value), 0) || 1;
    node.style.setProperty('--igs-bars-row', `${rowHeight}px`);
    node.style.height = `${list.length * rowHeight}px`;
    const existing = new Map(Array.from(node.children || []).map((el) => [el.getAttribute('data-key'), el]));
    list.forEach((row, index) => {
        let el = existing.get(row.key);
        if (!el) {
            el = doc.createElement('div');
            el.className = 'igs-bars-row';
            el.setAttribute('data-key', row.key);
            el.innerHTML = '<span class="igs-bars-label"></span><i class="igs-bars-fill"></i><b class="igs-bars-value"></b>';
            node.appendChild(el);
        }
        existing.delete(row.key);
        el.setAttribute('data-rank', String(index + 1));
        el.style.transform = `translateY(${index * rowHeight}px)`;
        el.style.setProperty('--igs-bars-pct', `${Math.max(2, Math.round(row.value / top * 100))}%`);
        el.children[0].textContent = row.label;
        el.children[2].textContent = fmt(row.value);
        if (reduced) el.classList.add('is-reduced');
    });
    for (const el of existing.values()) el.remove();
    return list.map((row) => row.key);
}

export const TICKER_STYLE_TEXT = `
.igs-bars{position:relative;width:100%;}
.igs-bars-row{position:absolute;left:0;right:0;top:0;height:calc(var(--igs-bars-row,30px) - 4px);display:flex;align-items:center;gap:8px;transition:transform .45s cubic-bezier(.3,.8,.3,1);will-change:transform;}
.igs-bars-label{flex:none;min-width:4em;font-size:.85em;}
.igs-bars-fill{flex:1;height:60%;border-radius:3px;background:currentColor;opacity:.7;max-width:var(--igs-bars-pct,100%);}
.igs-bars-value{flex:none;min-width:2.4em;text-align:right;font-variant-numeric:tabular-nums;}
.igs-bars-row.is-reduced{transition:none;}
`;
