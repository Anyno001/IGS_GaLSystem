// 日常演出构建器共用的小工具：造节点、按寿命挂载并自动回收、按字拆成逐字动画。
import { esc } from './reader-value-utils.js';

export function later(state, fn, delay) {
    const timer = state.schedule(() => {
        state.timers.delete(timer);
        fn();
    }, delay);
    state.timers.add(timer);
}

export function removeNode(node) {
    if (node && node.parentNode && typeof node.parentNode.removeChild === 'function') node.parentNode.removeChild(node);
}

export function make(doc, className, html = '') {
    const node = doc.createElement('div');
    node.className = className;
    if (html) node.innerHTML = html;
    return node;
}

export function spawn(state, parent, node, life) {
    parent.appendChild(node);
    if (node.style && typeof node.style.setProperty === 'function') node.style.setProperty('--igs-dfx-life', `${life}ms`);
    state.transients.add(node);
    later(state, () => {
        removeNode(node);
        state.transients.delete(node);
    }, life);
    return node;
}

export function chars(value) {
    return Array.from(String(value || ''));
}

export function charSpans(value, stepMs, startMs) {
    return chars(value).map((ch, index) => `<span style="animation-delay:${startMs + index * stepMs}ms">${esc(ch)}</span>`).join('');
}
