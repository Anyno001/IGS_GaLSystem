import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureImageEmptyPlaceholder, isImageRetryTap, setImageRetryState } from '../src/visual/igs-ui/reader-dom-utils.js';
import { createMissedHint, detectMissedAssets, hasUnclosedAssetTag, MISSED_HINT_TEXT } from '../src/visual/igs-ui/missed-assets.js';

class El {
    constructor(doc, tag) {
        this.ownerDocument = doc; this.tag = tag; this.children = []; this.attrs = {}; this.listeners = {};
        this.className = ''; this.id = ''; this.parentNode = null; this._text = ''; this.rect = { left: 100, right: 200, top: 100, bottom: 130 };
    }
    get textContent() { return this._text; }
    set textContent(v) { this._text = String(v); if (v === '') this.children = []; }
    setAttribute(k, v) { this.attrs[k] = String(v); }
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
    removeAttribute(k) { delete this.attrs[k]; }
    appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
    addEventListener(t, fn) { this.listeners[t] = fn; }
    getBoundingClientRect() { return this.rect; }
    all() { return this.children.flatMap((c) => [c, ...c.all()]); }
    querySelector(sel) {
        const parts = sel.split(' ');
        const match = (el, p) => {
            const cls = p.match(/\.([\w-]+)/);
            const id = p.match(/#([\w-]+)/);
            const attr = p.match(/\[([\w-]+)\]/);
            return (!cls || el.className.split(' ').includes(cls[1])) && (!id || el.id === id[1]) && (!attr || attr[1] in el.attrs);
        };
        if (parts.length === 1) return this.all().find((e) => match(e, parts[0])) || null;
        const outer = this.all().find((e) => match(e, parts[0]));
        return outer ? outer.querySelector(parts[1]) : null;
    }
}
const doc = { createElement: (t) => new El(doc, t) };
const make = () => new El(doc, 'div');

test('gate:failed-retry:placeholder-plain-without-slot', () => {
    const bg = make();
    ensureImageEmptyPlaceholder(bg, '图片未生成', null);
    const empty = bg.querySelector('.igs-image-empty');
    assert.equal(empty.textContent, '图片未生成');
    assert.equal(empty.getAttribute('data-retry'), null);
    assert.equal(isImageRetryTap(bg, 150, 110), false);
});

test('gate:failed-retry:placeholder-clickable-with-reason', () => {
    const bg = make();
    ensureImageEmptyPlaceholder(bg, '图片未生成', { reason: '请求超时' });
    const empty = bg.querySelector('.igs-image-empty');
    assert.equal(empty.getAttribute('data-retry'), '1');
    assert.equal(bg.querySelector('.igs-image-retry').textContent, '点一下重画');
    assert.equal(bg.querySelector('.igs-image-retry-reason').textContent, '请求超时');
    assert.equal(isImageRetryTap(bg, 150, 110), true);
    assert.equal(isImageRetryTap(bg, 20, 20), false);
});

test('gate:failed-retry:placeholder-busy-state-not-clickable', () => {
    const bg = make();
    ensureImageEmptyPlaceholder(bg, '图片未生成', { reason: '请求超时' });
    assert.equal(setImageRetryState(bg, { busy: true }), true);
    assert.equal(bg.querySelector('.igs-image-retry').textContent, '正在重画…');
    assert.equal(bg.querySelector('.igs-image-retry-reason'), null);
    assert.equal(isImageRetryTap(bg, 150, 110), false);
    setImageRetryState(bg, { busy: false, reason: '' });
    assert.equal(bg.querySelector('.igs-image-retry').textContent, '点一下重画');
    assert.equal(isImageRetryTap(bg, 150, 110), true);
});

test('gate:failed-retry:set-state-ignores-plain-placeholder', () => {
    const bg = make();
    assert.equal(setImageRetryState(bg, { busy: true }), false);
    ensureImageEmptyPlaceholder(bg, '图片未生成', null);
    assert.equal(setImageRetryState(bg, { busy: true }), false);
});

test('gate:missed-assets:unclosed-tags-detected', () => {
    for (const text of [
        '她笑了。\n[igs-scene:教室|午后',
        '她笑了。\n[igs-img:',
        '正文<bbi_image>1girl, smile',
        '正文<image>image###1girl, smile',
        '正文 image###1girl, smile',
    ]) assert.equal(hasUnclosedAssetTag(text), true, text);
});

test('gate:missed-assets:complete-tags-not-flagged', () => {
    for (const text of [
        '她笑了。\n[igs-scene:教室|午后|晴]\n正文继续',
        '正文<bbi_image>1girl<nl>x</nl></bbi_image>',
        '正文<image>image###1girl###</image>',
        '普通正文，没有任何标签。',
        '',
    ]) assert.equal(hasUnclosedAssetTag(text), false, text);
});

test('gate:missed-assets:guards-suppress-hint', () => {
    const open = { text: '正文\n[igs-scene:教室|午后', enabled: true };
    assert.equal(detectMissedAssets(open).missed, true);
    assert.equal(detectMissedAssets({ ...open, enabled: false }).missed, false);
    assert.equal(detectMissedAssets({ ...open, busy: true }).missed, false);
    assert.equal(detectMissedAssets({ ...open, isLatest: false }).missed, false);
    assert.equal(detectMissedAssets({ ...open, text: '   ' }).missed, false);
});

test('gate:missed-assets:unbound-marker-only-when-short', () => {
    const base = { text: '正文\n[igs-img:1]\n正文', enabled: true, expected: 1, bound: 0 };
    assert.deepEqual(detectMissedAssets(base), { missed: true, reason: 'unbound-marker' });
    assert.equal(detectMissedAssets({ ...base, bound: 1 }).missed, false);
    assert.equal(detectMissedAssets({ ...base, text: '正文没有挂载点' }).missed, false);
    assert.equal(detectMissedAssets({ ...base, expected: 0 }).missed, false);
});

test('gate:missed-assets:hint-shows-and-click-retries-once', async () => {
    const dialog = make();
    let calls = 0;
    const hint = createMissedHint({ getDialog: () => dialog, onRetry: async () => { calls += 1; } });
    assert.equal(hint.sync({ missed: false }, 'k'), false);
    assert.equal(dialog.querySelector('#igs-missed-hint'), null);
    assert.equal(hint.sync({ missed: true }, 'k'), true);
    const el = dialog.querySelector('#igs-missed-hint');
    assert.equal(el.textContent, MISSED_HINT_TEXT);
    assert.equal(el.getAttribute('hidden'), null);
    await el.listeners.click({ stopPropagation() {} });
    assert.equal(calls, 1);
    assert.equal(hint.sync({ missed: true }, 'k'), false);
    assert.notEqual(el.getAttribute('hidden'), null);
    assert.equal(hint.sync({ missed: true }, 'k2'), true);
});

test('gate:missed-assets:hint-hides-when-detection-clears', () => {
    const dialog = make();
    const hint = createMissedHint({ getDialog: () => dialog });
    hint.sync({ missed: true }, 'k');
    hint.sync({ missed: false }, 'k');
    assert.notEqual(dialog.querySelector('#igs-missed-hint').getAttribute('hidden'), null);
});
