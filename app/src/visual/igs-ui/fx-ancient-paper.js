// 古代文书共用竖排纸页。动态文字全部转义；交互只绑定纸页自身，移除节点即随之回收。
import { esc } from './reader-value-utils.js';
import { chars, make } from './fx-daily-kit.js';
import { ANCIENT_PAPER_SEALS } from './fx-ancient-paper-assets.js';

const LABELS = Object.freeze({ letter: '书信', note: '字条', poem: '诗笺', edict: '圣旨', notice: '告示' });
const SEALS = Object.freeze({ letter: 'rect', note: '', poem: 'rect', edict: 'square', notice: 'square' });

// Size is a bounded column budget, not a fixed poster. CSS clamps the resulting sheet to
// the real stage/dialogue safe area; additional columns stay horizontally scrollable.
export function ancientPaperLayout(text, kind = 'letter', from = '') {
    const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    const count = lines.reduce((sum, line) => sum + chars(line).length, 0);
    const note = kind === 'note';
    const rows = Math.min(note ? 7 : 10, Math.max(note ? 3 : 6, Math.ceil(Math.sqrt(Math.max(1, count) * 2))));
    const bodyColumns = lines.reduce((sum, line) => sum + Math.max(1, Math.ceil(chars(line).length / rows)), 0);
    const signatureColumns = from || SEALS[kind] ? 1 : 0;
    const headingColumns = kind === 'edict' ? 2 : 0;
    const columns = Math.min(note ? 4 : kind === 'edict' ? 8 : 6, Math.max(kind === 'notice' ? 3 : 1, bodyColumns + signatureColumns + headingColumns));
    return { rows, columns, characterCount: count };
}

function signatureHtml(from, kind, delay) {
    const shape = SEALS[kind] || '';
    if (!from && !shape) return '';
    const name = from ? `<span class="igs-dfx-document-sign">${esc(from)}</span>` : '';
    const seal = shape ? `<span class="igs-dfx-document-seal" data-shape="${shape}"><img src="${ANCIENT_PAPER_SEALS[shape]}" width="${shape === 'rect' ? 32 : 28}" height="${shape === 'rect' ? 48 : 28}" alt="装饰性朱印" draggable="false"></span>` : '';
    return `<br class="igs-dfx-document-sign-break" aria-hidden="true"><span class="igs-dfx-document-sign-column"><span class="igs-dfx-document-tail igs-dfx-document-ink" style="animation-delay:${delay}ms">${name}${seal}</span><span class="igs-dfx-document-lower-inset" aria-hidden="true"></span></span>`;
}

function followInk(scroll, ink) {
    if (!scroll.getBoundingClientRect || !ink.getBoundingClientRect) return;
    const view = scroll.getBoundingClientRect();
    const next = ink.getBoundingClientRect();
    if (next.left < view.left) scroll.scrollLeft += next.left - view.left - 4;
    else if (next.right > view.right) scroll.scrollLeft += next.right - view.right + 4;
}

// No document/window listeners, observers or timers: old page/cancel removal owns every listener.
export function installAncientPaperNavigation(scroll, { followInk: autoFollow = true } = {}) {
    if (!scroll || typeof scroll.addEventListener !== 'function') return;
    let follow = autoFollow;
    let drag = null;
    const pause = () => { follow = false; };
    const stopBubble = (event) => event.stopPropagation();
    scroll.addEventListener('animationstart', (event) => {
        if (follow && event.target.classList?.contains('igs-dfx-document-ink')) followInk(scroll, event.target);
    });
    scroll.addEventListener('touchstart', pause, { passive: true });
    scroll.addEventListener('wheel', pause, { passive: true });
    scroll.addEventListener('click', stopBubble);
    scroll.addEventListener('pointerdown', (event) => {
        event.stopPropagation();
        if (event.pointerType === 'touch' || event.button !== 0) return;
        drag = { id: event.pointerId, x: event.clientX, left: scroll.scrollLeft, moved: false };
        try { scroll.setPointerCapture(event.pointerId); } catch { /* Optional in test/older hosts. */ }
        if (typeof scroll.focus === 'function') scroll.focus({ preventScroll: true });
    });
    scroll.addEventListener('pointermove', (event) => {
        if (!drag || drag.id !== event.pointerId) return;
        const dx = event.clientX - drag.x;
        if (!drag.moved && Math.abs(dx) < 4) return;
        drag.moved = true;
        pause();
        scroll.style.cursor = 'grabbing';
        scroll.scrollLeft = drag.left - dx;
        event.preventDefault();
        event.stopPropagation();
    });
    const stop = (event) => {
        if (!drag || drag.id !== event.pointerId) return;
        const id = drag.id;
        drag = null;
        scroll.style.cursor = 'grab';
        try { if (scroll.hasPointerCapture(id)) scroll.releasePointerCapture(id); } catch { /* Already released. */ }
        event.stopPropagation();
    };
    scroll.addEventListener('pointerup', stop);
    scroll.addEventListener('pointercancel', stop);
    scroll.addEventListener('lostpointercapture', stop);
    scroll.addEventListener('keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        pause();
        event.preventDefault();
        event.stopPropagation();
        if (event.key === 'Home') scroll.scrollLeft = 0;
        else if (event.key === 'End') scroll.scrollLeft = -scroll.scrollWidth;
        else scroll.scrollLeft += (event.key === 'ArrowLeft' ? -1 : 1) * Math.max(100, scroll.clientWidth * .8);
    });
}

export function makeAncientPaper(item, env, { kind = 'letter', stepMs = 55, startMs = 620 } = {}) {
    const text = String(item.text || '');
    if (kind === 'edict' && /^\s*[【\[(（]?皇榜/.test(text)) kind = 'notice';
    const royalNotice = kind === 'notice' && /^\s*[【\[(（]?皇榜/.test(text);
    const bodyText = kind === 'notice' ? text.replace(/^\s*[【\[(（]?(?:告示|皇榜|榜文|公告|布告)[】\])）]?\s*[:：]?\s*/, '') : text;
    const letters = chars(bodyText);
    const label = LABELS[kind] || LABELS.letter;
    const type = kind === 'notice' ? 'edict' : kind;
    const ink = letters.map((ch, index) => `<span class="igs-dfx-document-ink" aria-hidden="true" style="animation-delay:${startMs + index * stepMs}ms">${esc(ch)}</span>`).join('');
    const tail = signatureHtml(String(item.from || ''), kind, startMs + letters.length * stepMs);
    const head = kind === 'edict' ? '<span class="igs-dfx-document-heading">奉天承运\n皇帝诏曰</span><br aria-hidden="true">' : '';
    const body = `<div class="igs-dfx-document-scroll" tabindex="0" aria-label="${label}，从右往左阅读；可横向滑动、拖动或使用左右方向键"><div class="igs-dfx-document-text" role="document" aria-label="${esc(text)}">${head}${ink}${tail}</div></div>`;
    const title = kind === 'notice' ? `<div class="igs-dfx-document-notice-title">${royalNotice ? '皇榜' : '告示'}</div>` : '';
    const rods = kind === 'edict' ? '<i class="igs-dfx-edict-rod igs-dfx-document-rod is-left" aria-hidden="true"></i><i class="igs-dfx-edict-rod igs-dfx-document-rod is-right" aria-hidden="true"></i>' : '';
    const layout = ancientPaperLayout(bodyText, kind, String(item.from || ''));
    const node = make(env.doc, `igs-dfx igs-dfx-${type} is-ancient igs-dfx-document${kind === 'notice' ? ' is-notice' : ''}${env.reduced ? ' is-reduced' : ''}`, `<div class="igs-dfx-document-paper" style="--igs-document-rows:${layout.rows};--igs-document-columns:${layout.columns}">${title}${body}${rods}</div>`);
    installAncientPaperNavigation(node.querySelector?.('.igs-dfx-document-scroll'), { followInk: stepMs > 0 });
    return node;
}
