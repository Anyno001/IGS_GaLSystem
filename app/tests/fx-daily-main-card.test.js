import test from 'node:test';
import assert from 'node:assert/strict';
import { MAIN_CARD_KINDS, renderDailyFx } from '../src/visual/igs-ui/fx-daily.js';

function makeEl(doc, id = '') {
    const el = {
        id, ownerDocument: doc, children: [], parentNode: null, className: '', innerHTML: '',
        style: { setProperty() {}, removeProperty() {} },
        classList: { add(name) { el.className = `${el.className} ${name}`.trim(); }, remove() {} },
        setAttribute() {}, getAttribute() { return null; },
        appendChild(child) { child.parentNode = el; el.children.push(child); return child; },
        insertBefore(child, ref) { child.parentNode = el; const i = ref ? el.children.indexOf(ref) : -1; if (i < 0) el.children.push(child); else el.children.splice(i, 0, child); return child; },
        removeChild(child) { el.children.splice(el.children.indexOf(child), 1); child.parentNode = null; },
        get nextSibling() { const l = el.parentNode ? el.parentNode.children : []; return l[l.indexOf(el) + 1] || null; },
        querySelector(selector) {
            const want = selector.replace(/^#/, '');
            const walk = (node) => { for (const c of node.children) { if (c.id === want) return c; const f = walk(c); if (f) return f; } return null; };
            return walk(el);
        },
    };
    return el;
}

function setup() {
    const doc = { createElement: () => makeEl(doc) };
    const root = makeEl(doc, 'igs-overlay');
    const motion = root.appendChild(makeEl(doc, 'igs-stage-motion'));
    for (const id of ['igs-bg', 'igs-sprite', 'igs-dialog-layer']) motion.appendChild(makeEl(doc, id));
    const timers = [];
    const ctx = {
        reducedMotion: false,
        schedule(fn, delay) { const t = { fn, delay, at: now + delay }; timers.push(t); return t; },
        clear(t) { const i = timers.indexOf(t); if (i >= 0) timers.splice(i, 1); },
        playSfx() {},
    };
    let now = 0;
    const advance = (to) => {
        for (;;) {
            const due = timers.filter((t) => t.at <= to).sort((a, b) => a.at - b.at)[0];
            if (!due) break;
            timers.splice(timers.indexOf(due), 1);
            now = due.at;
            due.fn();
        }
        now = to;
    };
    const live = () => {
        const front = root.querySelector('#igs-fx-front');
        return (front ? front.children : []).map((n) => String(n.className).match(/igs-dfx-(\w+)/)?.[1]);
    };
    return { root, ctx, advance, live };
}

const snap = (fx, index = 0) => ({ messageId: 'm1', readerSettings: { dailyFx: { enabled: true } }, content: { currentIndex: index, textType: 'dialogue', fx } });

test('main cards: second main card waits until the first leaves', () => {
    assert.ok(MAIN_CARD_KINDS.has('note') && MAIN_CARD_KINDS.has('timeskip'));
    const r = setup();
    const fx = { daily: [{ type: 'note', text: 'A' }, { type: 'timeskip', text: 'B' }] };
    const out = renderDailyFx(r.root, snap(fx), r.ctx);
    assert.deepEqual(out.played, ['note', 'timeskip']);
    assert.deepEqual(r.live(), ['note']);
    r.advance(3700);
    assert.deepEqual(r.live(), ['note']);
    r.advance(4100);
    assert.deepEqual(r.live(), ['timeskip']);
});

test('main cards: page change drops the queued card', () => {
    const r = setup();
    renderDailyFx(r.root, snap({ daily: [{ type: 'note', text: 'A' }, { type: 'timeskip', text: 'B' }] }), r.ctx);
    renderDailyFx(r.root, snap({ daily: [] }, 1), r.ctx);
    r.advance(20000);
    assert.deepEqual(r.live(), []);
});

test('main cards: a non-main effect still plays alongside a main card', () => {
    const r = setup();
    const out = renderDailyFx(r.root, snap({ daily: [{ type: 'note', text: 'A' }, { type: 'bell' }] }), r.ctx);
    assert.deepEqual(out.played, ['note', 'bell']);
    assert.equal(r.live().length, 2);
});
