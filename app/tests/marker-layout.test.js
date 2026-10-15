import test from 'node:test';
import assert from 'node:assert/strict';
import { findAnchorInsertIndex, insertMarkersAtAnchors, insertMarkers, numberParagraphs, transplantMarkers } from '../src/generated-images/illustration/marker-placer.js';
import { buildIgsTextPayload } from '../src/scene/message-source.js';
import { normalizeImageMarkerLayout } from '../src/scene/image-marker-layout.js';

test('gate:marker-layout:dialogue-anchor-waits-for-complete-directive', () => {
    const dialogue = '[igs-char:白墨|温和|先把画挂起来。你觉得呢？]';
    const raw = `<content>\n${dialogue}\n</content>`;
    assert.equal(insertMarkersAtAnchors(raw, [{ slot: 19, anchorSentence: '先把画挂起来。' }]), `<content>\n${dialogue}\n[igs-img:19]\n</content>`);
});

test('gate:marker-layout:thought-fx-wide-and-multiline-brackets-are-never-split', () => {
    for (const unit of ['[igs-thought:白墨|平和|先把画挂起来。再想一想。]', '[igs-fx:letter|先把画挂起来。再想一想。]', '【igs-char：白墨｜平和｜先把画挂起来。再想一想。】', '[igs-char:白墨|平和|先把画挂起来。\n再想一想。]']) {
        const raw = `<content>\n${unit}\n</content>`;
        assert.equal(insertMarkersAtAnchors(raw, [{ slot: 1, anchorSentence: '先把画挂起来。' }]), `<content>\n${unit}\n[igs-img:1]\n</content>`);
    }
});

test('gate:marker-layout:html-card-and-fenced-block-stay-intact', () => {
    for (const unit of ['<htm1fenge>\n<div><p>先把画挂起来。</p></div>\n</htm1fenge>', '<信件>\n先把画挂起来。\n</信件>', '```html\n<div>先把画挂起来。</div>\n```']) {
        const raw = `<content>\n${unit}\n</content>`;
        assert.equal(insertMarkersAtAnchors(raw, [{ slot: 1, anchorSentence: '先把画挂起来。' }]), `<content>\n${unit}\n[igs-img:1]\n</content>`);
    }
});

test('gate:marker-layout:single-line-content-and-numbered-paragraph-use-standalone-marker', () => {
    const raw = '<content>[igs-scene:宫道|晚上|晴][igs-char:白墨|温和|先把画挂起来。]</content>';
    const expected = '<content>[igs-scene:宫道|晚上|晴][igs-char:白墨|温和|先把画挂起来。]\n[igs-img:19]\n</content>';
    assert.equal(insertMarkersAtAnchors(raw, [{ slot: 19, anchorSentence: '先把画挂起来。' }]), expected);
    assert.equal(insertMarkers(raw, numberParagraphs(raw).paragraphs, [{ slot: 19, at: 1 }]), expected);
});

test('gate:marker-layout:multiple-points-do-not-split-one-line-or-drop-slots', () => {
    const raw = '[igs-char:白墨|平和|先把画挂起来。再把灯点上。]';
    assert.equal(insertMarkersAtAnchors(raw, [{ slot: 4, anchorSentence: '先把画挂起来。' }, { slot: 3, anchorSentence: '再把灯点上。' }]), `${raw}\n[igs-img:4]\n[igs-img:3]`);
});

test('gate:marker-layout:transplant-cannot-insert-inside-new-dialogue-structure', () => {
    const before = '先把画挂起来。\n[igs-img:19]\n然后点灯。';
    const unit = '[igs-char:白墨|温和|先把画挂起来。你觉得呢？]';
    const target = `<content>\n${unit}\n然后点灯。\n</content>`;
    assert.equal(transplantMarkers(before, target).text, `<content>\n${unit}\n[igs-img:19]\n然后点灯。\n</content>`);
});

test('gate:marker-layout:legacy-native-marker-before-dialogue-close-does-not-create-a-second-page', () => {
    const raw = '<content>\n[igs-char:白墨|温和|先把画挂起来，你觉得呢？\n<IMG>\n19\n</IMG>\n]\n</content>';
    const result = buildIgsTextPayload({ text: raw }, { sceneAssets: { enabled: true, characters: { 白墨: { 默认: 'base.png' } } } });
    assert.equal(result.raw, raw, '读取兼容不得改写用户原消息');
    assert.deepEqual(result.textSegments, ['[白墨]：先把画挂起来，你觉得呢？']);
});

test('gate:marker-layout:legacy-igs-marker-before-dialogue-close-does-not-leak-bracket', () => {
    const raw = '<content>\n[igs-char:白墨|温和|先把画挂起来，你觉得呢？\n[igs-img:19]\n]\n</content>';
    const result = buildIgsTextPayload({ text: raw }, { sceneAssets: { enabled: true, characters: { 白墨: { 默认: 'base.png' } } } });
    assert.equal(result.raw, raw, '原文与槽位不得修改');
    assert.match(result.markerLayoutSource, /\[igs-img:19\]/);
    assert.deepEqual(result.textSegments, ['[白墨]：先把画挂起来，你觉得呢？']);
});

test('gate:marker-layout:legacy-marker-after-closed-dialogue-leaves-no-orphan-bracket-page', () => {
    const raw = '<content>\n[igs-char:白墨|温和|先把画挂起来，你觉得呢？]\n[igs-img:19]\n]\n下一句。\n</content>';
    const result = buildIgsTextPayload({ text: raw }, { sceneAssets: { enabled: true, characters: { 白墨: { 默认: 'base.png' } } } });
    assert.equal(result.raw, raw);
    assert.match(result.markerLayoutSource, /\[igs-img:19\]/);
    assert.deepEqual(result.textSegments, ['[白墨]：先把画挂起来，你觉得呢？', '下一句。']);
});

test('gate:marker-layout:only-an-adjacent-legacy-close-after-a-closed-directive-is-removed', () => {
    const prefix = '[igs-thought:白墨|平和|先看看。]';
    for (const marker of ['[igs-img:19]', '<IMG>19</IMG>']) {
        const raw = `<content>\r\n${prefix}\r\n${marker}\r\n]\r\n下一句。\r\n</content>`;
        const normalized = normalizeImageMarkerLayout(raw);
        assert.equal(normalized.includes(`\r\n${marker}\r\n]\r\n`), false);
        assert.equal(normalizeImageMarkerLayout(normalized), normalized);
        assert.deepEqual(buildIgsTextPayload({ text: raw }, { sceneAssets: { enabled: true } }).textSegments, ['*先看看。*', '下一句。']);
    }
    const narration = '<content>\n普通文字。\n[igs-img:19]\n]\n下一句。\n</content>';
    assert.equal(normalizeImageMarkerLayout(narration), '<content>\n普通文字。\n[igs-img:19]\n下一句。\n</content>');
    assert.deepEqual(buildIgsTextPayload({ text: narration }, { sceneAssets: { enabled: true } }).textSegments, ['普通文字。', '下一句。']);
    const before = '<content>\n普通文字。\n]\n\n[igs-img:19]\n下一句。\n</content>';
    assert.equal(normalizeImageMarkerLayout(before), '<content>\n普通文字。\n[igs-img:19]\n下一句。\n</content>');
    const distant = '<content>\n普通文字。\n]\n另一行。\n[igs-img:19]\n下一句。\n</content>';
    assert.equal(normalizeImageMarkerLayout(distant), distant);
});

test('gate:marker-layout:normalization-is-idempotent-and-keeps-native-slot-identities', () => {
    const raw = '<content>\n[igs-char:白墨|温和|第一句。\n<IMG>\n19\n</IMG>\n第二句。]\n[igs-img:20]\n</content>';
    const expected = '<content>\n[igs-char:白墨|温和|第一句。第二句。]\n<IMG>19</IMG>\n[igs-img:20]\n</content>';
    assert.equal(normalizeImageMarkerLayout(raw), expected);
    assert.equal(normalizeImageMarkerLayout(expected), expected);
});

test('gate:marker-layout:crlf-and-unclosed-structures-do-not-get-corrupted', () => {
    const raw = '<content>\r\n[igs-char:白墨|平和|先把画挂起来。]\r\n</content>';
    assert.equal(insertMarkersAtAnchors(raw, [{ slot: 1, anchorSentence: '先把画挂起来。' }]), '<content>\r\n[igs-char:白墨|平和|先把画挂起来。]\r\n[igs-img:1]\r\n</content>');
    const unfinished = '<content>\n[igs-char:白墨|平和|先把画挂起来。\n</content>';
    assert.equal(insertMarkersAtAnchors(unfinished, [{ slot: 1, anchorSentence: '先把画挂起来。' }]), unfinished);
    const attribute = '<content>\n<img alt="先把画挂起来。\n更多文字" src="a.png">\n</content>';
    assert.equal(insertMarkersAtAnchors(attribute, [{ slot: 1, anchorSentence: '先把画挂起来。' }]), '<content>\n<img alt="先把画挂起来。\n更多文字" src="a.png">\n[igs-img:1]\n</content>');
});

test('marker-layout:thinking-examples-cannot-block-body-anchors', () => {
    const dialogue = '[igs-char:角色甲|平和|先把画挂起来。\n\n再把灯点上。]';
    for (const tag of ['thinking', 'think', 'Subtext_think']) {
        const prefix = `<${tag}>遵循<sentence_hard_constraints>；记录[未闭合；\n\`\`\`html\n<content>示例\n</${tag}>\n`;
        const raw = `${prefix}<content>\n${dialogue}\n</content>`;
        const found = findAnchorInsertIndex(raw, '先把画挂起来。');
        assert.equal(found.mode, 'exact');
        assert.equal(found.index, raw.indexOf(dialogue) + dialogue.length);
        assert.equal(insertMarkersAtAnchors(raw, [{ slot: 1, anchorSentence: '先把画挂起来。' }]), `${prefix}<content>\n${dialogue}\n[igs-img:1]\n</content>`);
    }
});

test('marker-layout:literal-content-examples-do-not-consume-real-body', () => {
    const dialogue = '[igs-char:角色甲|平和|先把画挂起来。]';
    for (const prefix of ['<thinking>示例<content>\n</thinking>\n', '```html\n<content>\n```\n', '<!-- 示例<content> -->\n']) {
        const raw = `${prefix}<content>\n${dialogue}\n</content>`;
        assert.equal(insertMarkersAtAnchors(raw, [{ slot: 2, anchorSentence: '先把画挂起来。' }]), `${prefix}<content>\n${dialogue}\n[igs-img:2]\n</content>`);
    }
});

test('marker-layout:repeated-anchor-only-binds-inside-body', () => {
    const anchor = '先把画挂起来。';
    const prefix = `<thinking>计划：${anchor}</thinking>\n<meta>${anchor}</meta>\n<content-example>${anchor}</content-example>\n`;
    const dialogue = `[igs-char:角色甲|平和|${anchor}]`;
    const raw = `${prefix}<content>\r\n${dialogue}\r\n</content>`;
    assert.equal(findAnchorInsertIndex(raw, anchor).anchorIndex, raw.lastIndexOf(anchor) + anchor.length);
    assert.equal(insertMarkersAtAnchors(raw, [{ slot: 3, anchorSentence: anchor }]), `${prefix}<content>\r\n${dialogue}\r\n[igs-img:3]\r\n</content>`);
    assert.deepEqual(findAnchorInsertIndex('<thinking>只在计划里出现。</thinking><content>这是正文。</content>', '只在计划里出现。'), { index: -1, mode: 'fail' });
});

test('marker-layout:each-body-has-its-own-structure-scope', () => {
    const prefix = '<now_plot>未闭合[示例\n<content><panel>第一段还没结束。\n</content>\n';
    const dialogue = '[igs-char:角色甲|平和|先把画挂起来。]';
    const raw = `${prefix}<content>\n${dialogue}\n</content>\n</now_plot>`;
    assert.equal(findAnchorInsertIndex(raw, '第一段还没结束。').index, -1);
    assert.equal(insertMarkersAtAnchors(raw, [{ slot: 4, anchorSentence: '先把画挂起来。' }]), `${prefix}<content>\n${dialogue}\n[igs-img:4]\n</content>\n</now_plot>`);
});

test('marker-layout:exact-anchor-in-later-body-beats-approximate-earlier-body', () => {
    const raw = '<content>先把画挂起来！</content>\n<content>[igs-char:角色甲|平和|先把画挂起来。]</content>';
    const found = findAnchorInsertIndex(raw, '先把画挂起来。');
    assert.equal(found.mode, 'exact');
    assert.equal(found.anchorIndex, raw.lastIndexOf('先把画挂起来。') + '先把画挂起来。'.length);
    assert.equal(insertMarkersAtAnchors(raw, [{ slot: 5, anchorSentence: '先把画挂起来。' }]), '<content>先把画挂起来！</content>\n<content>[igs-char:角色甲|平和|先把画挂起来。]\n[igs-img:5]\n</content>');
});

test('marker-layout:body-html-and-code-stay-complete-with-misleading-prelude', () => {
    const prefix = '<thinking>遵循<sentence_hard_constraints></thinking>\n';
    for (const unit of ['<div>先把画挂起来。\n再把灯点上。</div>', '```html\n先把画挂起来。\n</content>\n```']) {
        const raw = `${prefix}<content>\n${unit}\n</content>`;
        assert.equal(insertMarkersAtAnchors(raw, [{ slot: 6, anchorSentence: '先把画挂起来。' }]), `${prefix}<content>\n${unit}\n[igs-img:6]\n</content>`);
    }
    for (const unit of ['[igs-char:角色甲|平和|先把画挂起来。', '<div>先把画挂起来。', '```html\n先把画挂起来。']) {
        const raw = `${prefix}<content>\n${unit}\n</content>`;
        const found = findAnchorInsertIndex(raw, '先把画挂起来。');
        assert.equal(found.mode, 'exact');
        assert.ok(found.anchorIndex >= 0);
        assert.equal(found.index, -1);
        assert.equal(insertMarkersAtAnchors(raw, [{ slot: 6, anchorSentence: '先把画挂起来。' }]), raw);
    }
});

test('marker-layout:legacy-marker-repair-ignores-unclosed-prelude-examples', () => {
    const prefix = '<thinking>遵循<sentence_hard_constraints></thinking>\n';
    const raw = `${prefix}<content>\n[igs-char:角色甲|平和|先把画挂起来。\n[igs-img:7]\n再把灯点上。]\n</content>`;
    const expected = `${prefix}<content>\n[igs-char:角色甲|平和|先把画挂起来。再把灯点上。]\n[igs-img:7]\n</content>`;
    assert.equal(normalizeImageMarkerLayout(raw), expected);
    assert.equal(normalizeImageMarkerLayout(expected), expected);
});
