import test from 'node:test';
import assert from 'node:assert/strict';
import { tabletWindowScale } from '../src/visual/igs-ui/reader-runtime.js';

const win = (coarse) => ({ matchMedia: (query) => ({ matches: coarse && query === '(pointer: coarse)' }) });

test('pad-layout: 只有触屏且短边 ≥ 600 的平板放大悬浮窗，最多 1.5 倍', () => {
    // 竖屏 iPad 820×1180 开窄屏模式：480×680 → 720×1020。
    assert.equal(tabletWindowScale(win(true), { width: 820, height: 1180 }, 788 / 480, 1140 / 680), 1.5);
    // 横屏 iPad 1180×820 开电脑模式：900×540 → 宽度先顶到 1148。
    assert.equal(tabletWindowScale(win(true), { width: 1180, height: 820 }, 1148 / 900, 780 / 540), 1148 / 900);
    // 竖屏 iPad 开电脑模式：宽度本来就不够，不放大也不缩小（缩小交给原来的夹取）。
    assert.equal(tabletWindowScale(win(true), { width: 820, height: 1180 }, 788 / 900, 1140 / 540), 1);
    assert.equal(tabletWindowScale(win(true), { width: 390, height: 844 }, 2, 2), 1, '手机不动');
    assert.equal(tabletWindowScale(win(false), { width: 1366, height: 1024 }, 2, 2), 1, '鼠标设备不动');
    assert.equal(tabletWindowScale({}, { width: 1180, height: 820 }, 2, 2), 1, '没有 matchMedia 时不动');
});
