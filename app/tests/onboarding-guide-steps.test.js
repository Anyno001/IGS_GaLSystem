import test from 'node:test';
import assert from 'node:assert/strict';
import {
    ONBOARDING_STEPS, getOnboardingStep, nextOnboardingStep, prevOnboardingStep, isLastOnboardingStep, stepIndex,
} from '../src/visual/igs-ui/onboarding-guide.js';
import { SETTINGS_PAGES } from '../src/visual/igs-ui/settings-pages.js';
import { PUBLIC_READER_MODES, getReaderModeLabel } from '../src/schemas/reader-mode.js';

const step = (id) => getOnboardingStep(stepIndex(id));

test('onboarding steps: 步骤顺序、第 2 步是问卷、生图可选', () => {
    assert.deepEqual(ONBOARDING_STEPS.map((s) => s.id),
        ['welcome', 'quick', 'sidebar', 'preset', 'perf', 'style', 'mode', 'toolbar', 'assets', 'image', 'search']);
    assert.equal(stepIndex('quick'), 1);
    assert.equal(step('quick').quiz, true);
    assert.equal(step('image').optional, true);
    assert.equal(stepIndex('nope'), -1);
});

test('onboarding steps: 文案与实际界面一致', () => {
    assert.ok(step('welcome').body.includes('Esc'));
    assert.ok(step('sidebar').body.includes('仪表盘'));
    assert.deepEqual(step('sidebar').targetNarrow, ['.igs-settings-nav-toggle']);
    assert.ok(step('preset').body.includes('省电模式'));
    for (const mode of PUBLIC_READER_MODES) assert.ok(step('mode').body.includes(getReaderModeLabel(mode)), mode);
    assert.ok(step('mode').body.includes('「楼层内嵌」'));
    assert.ok(step('toolbar').body.includes('CG库'));
    assert.ok(step('assets').body.includes('多选') && step('assets').body.includes('立绘设置'));
    assert.ok(step('search').body.includes('黑边') && step('search').body.includes('最近改过'));
});

test('onboarding steps: 素材模式相关步骤带 requires', () => {
    assert.equal(step('assets').requires.switch, 'bridge.sceneAssets.enabled');
    assert.ok(step('assets').requires.hint.includes('先开启'));
});

test('onboarding steps: 文案规则（按钮不超过 4 字、中英文数字间不加空格、不用皮肤主题）', () => {
    for (const s of ONBOARDING_STEPS) {
        for (const text of [s.title, s.body]) {
            assert.equal(/[一-龥] [A-Za-z0-9]|[A-Za-z0-9] [一-龥]/.test(text), false, `${s.id}: ${text}`);
            assert.equal(/皮肤|主题/.test(text), false, s.id);
        }
    }
});

test('onboarding steps: 前后导航边界', () => {
    const last = ONBOARDING_STEPS.length - 1;
    assert.equal(prevOnboardingStep(0), 0);
    assert.equal(nextOnboardingStep(0), 1);
    assert.equal(nextOnboardingStep(last), last);
    assert.equal(isLastOnboardingStep(last), true);
    assert.equal(isLastOnboardingStep(last - 1), false);
    assert.equal(getOnboardingStep(-1).id, 'welcome');
});

test('onboarding steps: 只指向已注册的设置页面，open 是字符串数组，不留旧字段', () => {
    const pages = SETTINGS_PAGES.map(([id]) => id);
    for (const s of ONBOARDING_STEPS) {
        assert.ok(pages.includes(s.page), s.id);
        assert.equal('tab' in s || 'subTabs' in s, false, s.id);
        if (s.open) assert.ok(Array.isArray(s.open) && s.open.every((k) => typeof k === 'string'), s.id);
    }
});
