import test from 'node:test';
import assert from 'node:assert/strict';
import { growDialogForOverflow, recheckDialogAfterFonts } from '../src/visual/igs-ui/reader-dom-render.js';
test('gate:dialog:overflow-temporarily-grows-then-short-page-uses-base-height', () => {
    const root = { getBoundingClientRect: () => ({ height: 400, bottom: 400 }) };
    const dialog = {
        style: { height: '160px', maxHeight: 'none' },
        getBoundingClientRect() { return { height: parseFloat(this.style.height), bottom: 380 }; },
    };
    const text = {
        style: {}, scrollHeight: 180,
        get clientHeight() { return parseFloat(dialog.style.height) - 80; },
    };
    assert.equal(growDialogForOverflow(root, dialog, text), true);
    assert.equal(dialog.style.height, '262px');
    assert.equal(text.style.overflowY, '', '内容放得下无需滚动，但异步重排时仍可滚动');
    dialog.style.height = '160px';
    dialog.style.maxHeight = 'none';
    text.scrollHeight = 40;
    assert.equal(growDialogForOverflow(root, dialog, text), false);
    assert.equal(dialog.style.height, '160px');
    text.scrollHeight = 600;
    assert.equal(growDialogForOverflow(root, dialog, text), true);
    assert.equal(dialog.style.height, '364px');
    assert.equal(text.style.overflowY, '', '超出舞台上限时仍须保留滚动，不可裁字');
    assert.equal(growDialogForOverflow(root, dialog, text, { comic: true }), false);
});

test('gate:dialog:late-font-rechecks-only-the-current-page-once', async () => {
    let resolveOld;
    let resolveNew;
    const oldReady = new Promise((resolve) => { resolveOld = resolve; });
    const newReady = new Promise((resolve) => { resolveNew = resolve; });
    const root = {
        getBoundingClientRect: () => ({ height: 400, bottom: 400 }),
        querySelector: (selector) => selector === '#igs-dialog' ? dialog : text,
    };
    const dialog = {
        style: { height: '160px', maxHeight: 'none' },
        getBoundingClientRect() { return { height: parseFloat(this.style.height), bottom: 380 }; },
    };
    const text = {
        style: {}, scrollHeight: 80, dataset: { igsTextRenderKey: 'page-1' },
        ownerDocument: { fonts: { status: 'loading', ready: oldReady } },
        get clientHeight() { return parseFloat(dialog.style.height) - 80; },
    };
    recheckDialogAfterFonts(root, dialog, text, 'page-1');
    recheckDialogAfterFonts(root, dialog, text, 'page-1');
    text.scrollHeight = 180;
    // Flip before the first font promise settles. Its callback must not enlarge page 2.
    text.dataset.igsTextRenderKey = 'page-2';
    text.scrollHeight = 80;
    text.ownerDocument.fonts.ready = newReady;
    recheckDialogAfterFonts(root, dialog, text, 'page-2');
    resolveOld();
    await oldReady;
    await Promise.resolve();
    assert.equal(dialog.style.height, '160px', '旧页字体就绪不得影响新页');
    text.scrollHeight = 180;
    resolveNew();
    await newReady;
    await Promise.resolve();
    assert.equal(dialog.style.height, '262px', '新页字体晚到须增高');
    recheckDialogAfterFonts(root, dialog, text, 'page-2');
    await Promise.resolve();
    assert.equal(dialog.style.height, '262px', '重复观察同一轮字体不得反复增高');
});
