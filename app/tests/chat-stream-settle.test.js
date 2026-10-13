import test from 'node:test';
import assert from 'node:assert/strict';
import { createChatStreamObserver, DEFAULT_IDLE_MS, DEFAULT_HARD_TIMEOUT_MS } from '../src/host/chat-stream-observer.js';

function harness(options = {}) {
    const timers = new Map();
    let timerId = 0;
    let clock = 1000;
    const listeners = new Map();
    const created = [];
    const eventSource = {
        on(name, handler) { if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(handler); },
        off(name, handler) { listeners.set(name, (listeners.get(name) || []).filter((h) => h !== handler)); },
        emit(name, ...args) { for (const h of listeners.get(name) || []) h(...args); },
    };
    const globalObject = {
        setTimeout(handler, delay) { timerId += 1; timers.set(timerId, { handler, delay }); return timerId; },
        clearTimeout(id) { timers.delete(id); },
        MutationObserver: class {
            constructor(handler) { this.handler = handler; created.push(this); }
            observe() {}
            disconnect() {}
        },
    };
    const observer = createChatStreamObserver({
        global: globalObject,
        document: { querySelector: () => ({}), getElementById: () => options.stopButton || null, defaultView: globalObject },
        eventSource,
        eventTypes: { GENERATION_STARTED: 'generation_started', GENERATION_ENDED: 'generation_ended' },
        now: () => clock,
        onStable: options.onStable || (() => true),
        onTimeout: options.onTimeout,
    });
    observer.start();
    return {
        observer, eventSource, timers,
        mutate: () => created[0].handler([{ target: {} }]),
        advance: (ms) => { clock += ms; },
        fire: async (delay) => {
            const entry = [...timers].find(([, timer]) => timer.delay === delay);
            assert.ok(entry, `missing ${delay}ms timer`);
            timers.delete(entry[0]);
            entry[1].handler();
            await new Promise((resolve) => setImmediate(resolve));
        },
    };
}

test('gate:fullscreen-wait:silence-without-a-completion-signal-does-not-settle', () => {
    const h = harness();
    h.observer.prepareForReply();
    h.observer.noteActivity();
    h.mutate();
    assert.equal(h.observer.hasGenerationSettled(), false, '刚有变更时还在等');
    h.advance(DEFAULT_IDLE_MS - 1);
    assert.equal(h.observer.hasGenerationSettled(), false);
    h.advance(2);
    assert.equal(h.observer.hasGenerationSettled(), false, '静默不能证明请求结束');
    h.advance(DEFAULT_HARD_TIMEOUT_MS);
    assert.equal(h.observer.hasGenerationSettled(), false);
    h.observer.stop();
});

test('gate:fullscreen-wait:active-generation-waits-longer-and-normal-path-unchanged', () => {
    const h = harness();
    h.observer.prepareForReply();
    h.eventSource.emit('generation_started', 'normal', {}, false);
    h.mutate();
    h.advance(DEFAULT_IDLE_MS * 6);
    assert.equal(h.observer.hasGenerationSettled(), false, '模型思考间隙不收起');
    h.eventSource.emit('generation_ended');
    assert.equal(h.observer.hasGenerationSettled(), true, '正常结束事件立即收起');
    // 新一轮发送重置静默计时。
    h.observer.prepareForReply();
    assert.equal(h.observer.hasGenerationSettled(), false);
    h.observer.stop();
});

test('gate:fullscreen-wait:host-stop-button-keeps-early-end-events-pending', () => {
    const stopButton = { style: { display: 'block' } };
    const h = harness({ stopButton });
    h.observer.prepareForReply();
    h.eventSource.emit('generation_started', 'normal', {}, false);
    h.mutate();
    h.eventSource.emit('generation_ended');
    h.advance(DEFAULT_IDLE_MS * 6);
    assert.equal(h.observer.hasGenerationSettled(), false);
    stopButton.style.display = 'none';
    assert.equal(h.observer.hasGenerationSettled(), true);
    h.observer.stop();
});

test('gate:fullscreen-wait:missing-events-require-host-idle-evidence', () => {
    const stopButton = { style: { display: 'block' } };
    const h = harness({ stopButton });
    h.observer.prepareForReply();
    h.observer.noteActivity();
    h.mutate();
    h.advance(DEFAULT_IDLE_MS * 6);
    assert.equal(h.observer.hasGenerationSettled(), false);
    stopButton.style.display = 'none';
    assert.equal(h.observer.hasGenerationSettled(), true);
    h.observer.stop();
});

test('gate:fullscreen-wait:timeout-notifies-without-turning-partial-output-into-success', async () => {
    let timedOut = 0;
    let stable = 0;
    const h = harness({ onTimeout: () => { timedOut += 1; }, onStable: () => { stable += 1; return true; } });
    h.observer.prepareForReply();
    h.eventSource.emit('generation_started', 'normal', {}, false);
    h.mutate();
    h.advance(DEFAULT_HARD_TIMEOUT_MS);
    await h.fire(DEFAULT_HARD_TIMEOUT_MS);
    await h.fire(DEFAULT_IDLE_MS);
    assert.equal(timedOut, 1);
    assert.equal(stable, 0);
    assert.equal(h.observer.hasGenerationSettled(), false);
    h.eventSource.emit('generation_ended');
    await h.fire(800);
    assert.equal(stable, 1, '超时提醒后仍能接到正常完成');
    h.observer.stop();
});

test('gate:fullscreen-wait:progress-resets-the-inactivity-timeout', () => {
    const h = harness();
    h.observer.prepareForReply();
    h.eventSource.emit('generation_started');
    h.mutate();
    const before = [...h.timers].find(([, timer]) => timer.delay === DEFAULT_HARD_TIMEOUT_MS)[0];
    h.advance(DEFAULT_HARD_TIMEOUT_MS - 1);
    h.mutate();
    assert.equal(h.timers.has(before), false);
    assert.ok([...h.timers].some(([, timer]) => timer.delay === DEFAULT_HARD_TIMEOUT_MS));
    h.observer.stop();
});

test('gate:fullscreen-wait:quiet-completion-does-not-finish-the-foreground-request', () => {
    const h = harness();
    h.observer.prepareForReply();
    h.eventSource.emit('generation_started', 'normal', {}, false);
    h.mutate();
    h.eventSource.emit('generation_started', 'quiet', {}, false);
    h.eventSource.emit('generation_ended');
    assert.equal(h.observer.hasGenerationSettled(), false);
    h.eventSource.emit('generation_ended');
    assert.equal(h.observer.hasGenerationSettled(), true);
    h.observer.stop();
});

test('gate:fullscreen-wait:stopped-is-preserved-when-ended-follows', async () => {
    let reason;
    const h = harness({ onStable: (settled) => { reason = settled.reason; return true; } });
    h.observer.prepareForReply();
    h.eventSource.emit('generation_started');
    h.eventSource.emit('generation_stopped');
    h.eventSource.emit('generation_ended');
    await h.fire(800);
    assert.equal(reason, 'stopped');
    h.observer.stop();
});

test('gate:fullscreen-wait:late-write-invalidates-an-inflight-settle', async () => {
    let finish;
    let revision;
    const h = harness({ onStable: (settled) => {
        revision = settled.revision;
        return new Promise((resolve) => { finish = resolve; });
    } });
    h.observer.prepareForReply();
    h.eventSource.emit('generation_started');
    h.eventSource.emit('generation_ended');
    await h.fire(800);
    h.mutate();
    assert.equal(h.observer.isCurrentRevision(revision), false);
    finish(true);
    await new Promise((resolve) => setImmediate(resolve));
    assert.ok([...h.timers].some(([, timer]) => timer.delay === 800));
    assert.ok([...h.timers].some(([, timer]) => timer.delay === DEFAULT_HARD_TIMEOUT_MS));
    h.observer.stop();
});
