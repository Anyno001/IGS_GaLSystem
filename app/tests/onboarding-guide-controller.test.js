import test from 'node:test';
import assert from 'node:assert/strict';
import { createOnboardingController } from '../src/visual/igs-ui/onboarding-guide-controller.js';
import { handleOnboardingKeydown } from '../src/visual/igs-ui/onboarding-guide-invite.js';
import { ONBOARDING_STEPS, ONBOARDING_STORAGE_KEY as KEY, stepIndex } from '../src/visual/igs-ui/onboarding-guide.js';

function setup(initial = {}) {
    const data = new Map(Object.entries(initial));
    const storage = { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)) };
    const calls = [];
    let open = false;
    const settings = {
        switchPage: (p, open) => calls.push(['page', p, open]),
    };
    const warns = [];
    const ctl = createOnboardingController({
        getStorage: () => storage,
        openSettings: (page) => { open = true; calls.push(['open', page]); return { ok: true }; },
        getSettingsController: () => (open ? settings : null),
        rerenderSettings: () => ({ ok: true }),
        warn: (r) => warns.push(r),
    });
    return { ctl, data, calls, warns };
}

test('onboarding controller: 换步只切页面，不写设置；每步按 id 对应页面', () => {
    const { ctl, calls } = setup();
    ctl.handleAction('onboarding-start');
    for (let i = 1; i < ONBOARDING_STEPS.length; i += 1) ctl.handleAction('onboarding-next');
    const pages = calls.filter((c) => c[0] === 'page').map((c) => c[1]);
    assert.deepEqual(pages, ONBOARDING_STEPS.map((s) => s.page));
    assert.deepEqual(calls[0], ['open', 'dash']);
    assert.equal(ctl.getState().step, ONBOARDING_STEPS.length - 1);
    ctl.handleAction('onboarding-prev');
    assert.equal(ctl.getState().step, ONBOARDING_STEPS.length - 2);
});

test('onboarding controller: 每次换步持久化进度；邀请继续和仪表盘入口都从进度开始', () => {
    const { ctl, data, calls } = setup();
    ctl.handleAction('onboarding-start');
    for (let i = 0; i < stepIndex('perf'); i += 1) ctl.handleAction('onboarding-next');
    assert.equal(JSON.parse(data.get(KEY)).step, stepIndex('perf'));
    assert.equal(JSON.parse(data.get(KEY)).status, 'unseen');
    // Esc 暂停：进度保留，会话回到未回应，下次打开阅读器邀请条显示「继续」。
    ctl.keydown({ key: 'Escape', preventDefault() {}, stopPropagation() {} }, { getElementById: () => ({ contains: () => false }) });
    assert.equal(ctl.getState().step, null);
    assert.equal(ctl.getState().answered, false);
    calls.length = 0;
    ctl.handleAction('onboarding-start');
    assert.equal(ctl.getState().step, stepIndex('perf'));
    assert.deepEqual(calls.at(-1).slice(0, 2), ['page', 'perf-text']);
});

test('onboarding controller: 完成或跳过后进度清零', () => {
    const { ctl, data } = setup();
    ctl.handleAction('onboarding-start');
    ctl.handleAction('onboarding-next');
    ctl.handleAction('onboarding-skip');
    assert.equal(JSON.parse(data.get(KEY)).step, 0);
    ctl.handleAction('onboarding-start');
    assert.equal(ctl.getState().step, 0);
});

test('onboarding controller: 完成写 done，跳过写 dismissed', () => {
    for (const [action, status] of [['onboarding-finish', 'done'], ['onboarding-skip', 'dismissed']]) {
        const { ctl, data } = setup();
        ctl.handleAction('onboarding-start');
        ctl.handleAction(action);
        assert.equal(JSON.parse(data.get(KEY)).status, status);
        assert.equal(ctl.getState().step, null);
    }
});

test('onboarding controller: 非引导动作返回 null；以后再说不写存储', () => {
    const { ctl, data } = setup();
    assert.equal(ctl.handleAction('settings-export-all'), null);
    ctl.chooseInvite('later', null);
    assert.equal(data.has(KEY), false);
    assert.equal(ctl.getState().answered, true);
    assert.equal(ctl.syncInvite({ ownerDocument: null }), false);
});

test('onboarding controller: 坏数据不邀请并告警', () => {
    const { ctl, warns } = setup({ [KEY]: '{bad' });
    assert.equal(ctl.syncInvite({ querySelector: () => null, ownerDocument: null }), false);
    assert.deepEqual(warns, ['invalid-json']);
});

test('onboarding keydown: 引导卡在时 Esc 只关卡片，卡内按键不外泄', () => {
    const inside = {};
    const card = { contains: (n) => n === inside };
    const doc = { getElementById: (id) => (id === 'igs-onboarding-card' ? card : null) };
    let closed = 0;
    let stopped = 0;
    const ev = (key, target) => ({ key, target, preventDefault() {}, stopPropagation() { stopped += 1; } });
    assert.equal(handleOnboardingKeydown(ev('Escape', {}), doc, () => { closed += 1; }), true);
    assert.equal(closed, 1);
    assert.equal(handleOnboardingKeydown(ev('ArrowRight', inside), doc, () => {}), true);
    assert.equal(handleOnboardingKeydown(ev('ArrowRight', {}), doc, () => {}), false);
    assert.equal(handleOnboardingKeydown(ev('Escape', {}), { getElementById: () => null }, () => {}), false);
    assert.equal(stopped, 2);
});
