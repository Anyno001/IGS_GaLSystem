import test from 'node:test';
import assert from 'node:assert/strict';
import { FakeEl } from './helpers/fake-dom.js';
import { closeRomanceIntimate, syncRomanceIntimate } from '../src/visual/igs-ui/romance-intimate-runtime.js';
import { isStagePaused, onStageIdleChange, setStageCovered, setStagePauseReason } from '../src/visual/igs-ui/stage-pause.js';

function runtime(t) {
    let now = 0, id = 0, writes = 0, callbacks = 0;
    const tasks = new Map(), frames = new Map(), listeners = new Set();
    const schedule = (fn, delay = 0) => { const key = ++id; tasks.set(key, { fn, at: now + delay }); return key; };
    t.mock.method(globalThis, 'setTimeout', schedule);
    t.mock.method(globalThis, 'clearTimeout', key => tasks.delete(key));
    t.mock.method(globalThis, 'setInterval', () => { throw new Error('idle runtime must not poll'); });
    const doc = {
        hidden: false,
        defaultView: {
            performance: { now: () => now },
            requestAnimationFrame(fn) { const key = ++id; frames.set(key, fn); return key; },
            cancelAnimationFrame(key) { frames.delete(key); },
        },
        addEventListener(type, fn) { if (type === 'visibilitychange') listeners.add(fn); },
        removeEventListener(type, fn) { if (type === 'visibilitychange') listeners.delete(fn); },
        createElement(tag = 'div') {
            const node = new FakeEl(doc, tag);
            const original = node.style.setProperty;
            node.style.setProperty = function(k, v) { writes++; original.call(this, k, v); };
            node.style.getPropertyValue = k => node.style.vars[k] || '';
            node.hasAttribute = key => node.attrs.has(key);
            return node;
        },
    };
    const root = doc.createElement(); root.id = 'igs-overlay';
    const stage = root.appendChild(doc.createElement()); stage.id = 'igs-stage-motion';
    for (const id of ['igs-bg', 'igs-sprite', 'igs-cast', 'igs-click-layer']) {
        const node = stage.appendChild(doc.createElement()); node.id = id;
    }
    const info = { level: 2, settings: { enabled: true }, fxSound: { enabled: false, volume: 0 }, messageId: 1, index: 0, coarse: true };
    const sync = extra => syncRomanceIntimate(root, { ...info, ...extra });
    t.after(() => closeRomanceIntimate(root));
    return {
        root, stage, tasks, frames, listeners, sync,
        writes: () => writes, callbacks: () => callbacks,
        visibility(hidden) { doc.hidden = hidden; for (const fn of [...listeners]) fn(); },
        advance(ms) {
            const end = now + ms;
            while (now < end) {
                now = Math.min(end, now + 16);
                for (const [key, task] of [...tasks]) if (tasks.has(key) && task.at <= now) {
                    tasks.delete(key); callbacks++; task.fn();
                }
                const ready = [...frames.values()]; frames.clear();
                for (const fn of ready) { callbacks++; fn(now); }
            }
        },
    };
}

test('gate:renderer-idle:muted-static-plan-has-no-timer-or-frame', t => {
    const env = runtime(t);
    env.sync({ reduced: true });
    const writes = env.writes();
    env.advance(60000);
    assert.equal(env.callbacks(), 0);
    assert.equal(env.writes(), writes);
    assert.equal(env.tasks.size + env.frames.size, 0);
});

test('gate:renderer-idle:no-animation-frame-host-does-not-pump-unused-visual-beats', t => {
    const env = runtime(t);
    delete env.stage.ownerDocument.defaultView.requestAnimationFrame;
    env.sync();
    env.advance(60000);
    assert.equal(env.callbacks(), 0);
    assert.equal(env.tasks.size + env.frames.size, 0);
});

test('gate:renderer-idle:covered-stage-stops-immediately-and-resumes-once', t => {
    const env = runtime(t);
    env.sync();
    env.advance(1000);
    assert.equal(env.frames.size, 1);
    setStagePauseReason(env.root, 'panel:settings', true);
    setStagePauseReason(env.root, 'offscreen', true);
    const before = { callbacks: env.callbacks(), writes: env.writes() };
    env.advance(60000);
    assert.equal(env.callbacks(), before.callbacks);
    assert.equal(env.writes(), before.writes);
    assert.equal(env.tasks.size + env.frames.size, 0);
    setStagePauseReason(env.root, 'panel:settings', false);
    assert.equal(env.tasks.size + env.frames.size, 0);
    setStagePauseReason(env.root, 'offscreen', false);
    assert.equal(env.frames.size, 1);
    assert.equal(env.tasks.size, 1);
    setStagePauseReason(env.root, 'offscreen', false);
    assert.equal(env.frames.size, 1);
});

test('gate:renderer-idle:hidden-stage-and-close-leave-no-repeating-work', t => {
    const env = runtime(t);
    env.sync();
    env.visibility(true);
    env.advance(60000);
    assert.equal(env.callbacks(), 0);
    assert.equal(env.frames.size + env.tasks.size, 0);
    env.visibility(false);
    assert.equal(env.frames.size, 1);
    closeRomanceIntimate(env.root);
    assert.equal(env.frames.size + env.tasks.size + env.listeners.size, 0);
    setStagePauseReason(env.root, 'hidden', true);
    setStagePauseReason(env.root, 'hidden', false);
    assert.equal(env.frames.size + env.tasks.size, 0);
});

test('gate:renderer-idle:visible-heartbeats-remain-active-without-50ms-polling', t => {
    const env = runtime(t);
    env.sync();
    const writes = env.writes();
    env.advance(60000);
    assert.ok(env.writes() > writes, 'enabled visual effect continues');
    assert.ok(env.callbacks() < 3900, 'heartbeat pump follows beat deadlines instead of polling');
    const vig = env.stage.querySelector('.igs-rm-vig');
    assert.ok(vig.style.getPropertyValue('--igs-rm-pulse'));
    assert.equal(env.tasks.size, 1);
    assert.equal(env.frames.size, 1);
    for (let i = 0; i < 5; i++) env.sync();
    assert.equal(env.tasks.size, 1, 'same-page render cannot duplicate clocks');
    assert.equal(env.frames.size, 1);
});

test('gate:renderer-idle:detached-stage-cleans-up-and-late-frame-cannot-restart', t => {
    const env = runtime(t);
    env.sync();
    const stale = [...env.frames.values()][0];
    env.stage.isConnected = false;
    env.advance(16);
    assert.equal(env.tasks.size + env.frames.size + env.listeners.size, 0);
    const before = env.writes();
    stale(48);
    env.advance(60000);
    assert.equal(env.writes(), before);
    assert.equal(env.tasks.size + env.frames.size, 0);
});

test('gate:renderer-idle:closed-stage-rejects-an-already-queued-frame', t => {
    const env = runtime(t);
    env.sync();
    const stale = [...env.frames.values()][0];
    closeRomanceIntimate(env.root);
    const before = env.writes();
    stale(16);
    env.advance(60000);
    assert.equal(env.writes(), before);
    assert.equal(env.tasks.size + env.frames.size + env.listeners.size, 0);
});

test('gate:renderer-idle:covered-and-panel-reasons-share-transition-notifications', () => {
    const root = { id: 'igs-overlay', attrs: new Map(), getAttribute(k) { return this.attrs.get(k) ?? null; }, setAttribute(k, v) { this.attrs.set(k, v); }, removeAttribute(k) { this.attrs.delete(k); } };
    const changes = [];
    const off = onStageIdleChange(root, idle => changes.push(idle));
    setStageCovered(root, true);
    assert.equal(isStagePaused(root), false, 'covering the backdrop must not block auto-play');
    setStagePauseReason(root, 'panel:map', true);
    setStageCovered(root, false);
    assert.deepEqual(changes, [true]);
    setStagePauseReason(root, 'panel:map', false);
    assert.deepEqual(changes, [true, false]);
    off();
    setStageCovered(root, true);
    assert.equal(changes.length, 2);
});
