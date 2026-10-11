import test from 'node:test';
import assert from 'node:assert/strict';
import { isNodeVisible, isWideLayout, resolveStepTarget } from '../src/visual/igs-ui/onboarding-guide-runtime.js';
import { getOnboardingStep, stepIndex } from '../src/visual/igs-ui/onboarding-guide.js';
import { mountOnboardingInvite } from '../src/visual/igs-ui/onboarding-guide-invite.js';

const node = (visible = true, hiddenAncestor = false) => ({
    offsetParent: visible ? {} : null,
    getClientRects: () => (visible ? [{}] : []),
    closest: (sel) => (sel === '[hidden]' && hiddenAncestor ? {} : null),
});
const container = (map) => ({ querySelector: (sel) => map[sel] || null });

test('onboarding runtime: 可见性判定', () => {
    assert.equal(isNodeVisible(node(true)), true);
    assert.equal(isNodeVisible(node(false)), false);
    assert.equal(isNodeVisible(node(true, true)), false);
    assert.equal(isNodeVisible(null), false);
    // 固定定位元素 offsetParent 为 null 但有布局盒
    assert.equal(isNodeVisible({ offsetParent: null, getClientRects: () => [{}], closest: () => null }), true);
});

test('onboarding runtime: 与外壳同一断点（900px）判断窄屏', () => {
    const doc = (width, mq) => ({ defaultView: { innerWidth: width, matchMedia: mq } });
    assert.equal(isWideLayout(doc(899)), false);
    assert.equal(isWideLayout(doc(900)), true);
    let asked = '';
    assert.equal(isWideLayout(doc(300, (q) => { asked = q; return { matches: true }; })), true);
    assert.equal(asked, '(min-width:900px)');
});

test('onboarding runtime: 侧边栏步骤手机高亮 ☰、电脑高亮侧边栏', () => {
    const step = getOnboardingStep(stepIndex('sidebar'));
    const nav = node(); const toggle = node();
    const c = container({ '.igs-settings-nav': nav, '.igs-settings-nav-toggle': toggle });
    assert.equal(resolveStepTarget(c, step, true).target, nav);
    assert.equal(resolveStepTarget(c, step, false).target, toggle);
});

test('onboarding runtime: 素材模式没开时高亮开关并提示先开启', () => {
    const step = getOnboardingStep(stepIndex('assets'));
    const sw = node(); const add = node();
    const hiddenContent = node(false);
    const off = resolveStepTarget(container({ '.igs-scene-settings-content': hiddenContent, '[data-switch="bridge.sceneAssets.enabled"]': sw, '[data-add-menu="scenes"]': node(false) }), step, true);
    assert.equal(off.target, sw);
    assert.equal(off.note, '先开启「启用场景素材模式」');
    const on = resolveStepTarget(container({ '.igs-scene-settings-content': node(), '[data-add-menu="scenes"]': add }), step, true);
    assert.equal(on.target, add);
    assert.equal(on.note, '');
});

test('onboarding runtime: 目标找不到或隐藏时提示这一项当前不可见', () => {
    const step = getOnboardingStep(stepIndex('toolbar'));
    const miss = resolveStepTarget(container({}), step, true);
    assert.equal(miss.target, null);
    assert.equal(miss.note, '这一项当前不可见');
    const none = resolveStepTarget(container({}), getOnboardingStep(0), true);
    assert.equal(none.note, '');
});

test('onboarding invite: 有进度时按钮写「继续」', () => {
    const made = [];
    const doc = { createElement: () => { const el = { setAttribute() {}, addEventListener() {}, set innerHTML(v) { el.html = v; } }; made.push(el); return el; } };
    const overlay = { querySelector: () => null, appendChild() {}, ownerDocument: doc };
    mountOnboardingInvite(overlay, () => {}, doc, { resume: true });
    assert.ok(made[0].html.includes('>继续<'));
    mountOnboardingInvite(overlay, () => {}, doc);
    assert.ok(made[1].html.includes('>开始<'));
});
