import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIgsTextPayload, applyImmersiveGalgameSystemBodyFormat } from '../src/scene/message-source.js';
import { normalizeClosedIgsDialogueLines, canonicalizeIgsDirectives, normalizeIgsDirectiveLayout } from '../src/scene/directive-tags.js';
import { extractSceneDirectives } from '../src/scene/scene-directives.js';
import { createOutfitResolver } from '../src/scene/character-outfits.js';
import { normalizeImageMarkerLayout } from '../src/scene/image-marker-layout.js';
import { numberParagraphs, paragraphNoForAnchor, insertMarkers, insertMarkersAtAnchors, transplantMarkers } from '../src/generated-images/illustration/marker-placer.js';
import { applyTextFxMarkup } from '../src/visual/igs-ui/text-fx.js';

const sceneAssets = { enabled: true, characters: { 角色: { 默认: 'base.png' } }, characterOutfits: { 角色: { 便服: { words: [], moods: { 平和: 'outfit.png' } } } } };
const payloadOf = (body, options = {}) => buildIgsTextPayload({ id: 1, text: `<content>\n${body}\n</content>` }, { sceneAssets, ...options });

test('gate:scene:closed-dialogue-with-blank-lines-is-one-complete-unit', () => {
    const body = '[igs-char:角色|平和|完整台词。\n\n]';
    const payload = payloadOf(body);
    assert.deepEqual(payload.textSegments, ['[角色]：完整台词。']);
    assert.equal(payload.raw, `<content>\n${body}\n</content>`);
    assert.equal(payload.sceneDirectives[0].dialogue, '完整台词。');
    assert.equal(canonicalizeIgsDirectives(body), '[igs-char:角色|平和|完整台词。]');
    assert.equal(applyImmersiveGalgameSystemBodyFormat(body).formattedRaw.trim(), '[角色]：完整台词。');
});

test('gate:scene:multiline-char-and-thought-keep-fields-and-optional-sentence-pages', () => {
    for (const newline of ['\n', '\r\n']) {
        for (const type of ['char', 'thought']) {
            const body = `[igs-${type}:角色|${newline}平和|${newline}便服|第一句。${newline}${newline}第二句。${newline}]`;
            const prefix = type === 'char' ? '[角色]：' : '*';
            const suffix = type === 'char' ? '' : '*';
            const payload = payloadOf(body);
            assert.deepEqual(payload.textSegments, [`${prefix}第一句。 第二句。${suffix}`]);
            assert.equal(payload.sceneDirectives[0].character, '角色');
            assert.equal(payload.sceneDirectives[0].mood, '平和');
            assert.equal(payload.sceneDirectives[0].outfit, '便服');
            assert.deepEqual(payloadOf(body, { dialogueSentencePaging: true }).textSegments, [`${prefix}第一句。${suffix}`, `${prefix}第二句。${suffix}`]);
        }
    }
    assert.deepEqual(payloadOf('[igs-char:角色|\n你好。\n]').textSegments, ['[角色]：你好。']);
    assert.deepEqual(payloadOf('[igs-thought:角色|\n先想清楚。\n]').textSegments, ['*先想清楚。*']);
});

test('gate:scene:multiline-loose-directives-canonicalize-idempotently', () => {
    for (const [open, close] of [['[', ']'], ['［', '］'], ['【', '】']]) {
        const raw = `${open} IGS - CHAR ：角色｜平和｜\n完整台词。\n\n${close}`;
        assert.equal(canonicalizeIgsDirectives(raw), '[igs-char:角色|平和|完整台词。]');
        assert.equal(normalizeIgsDirectiveLayout(normalizeIgsDirectiveLayout(raw)), '[igs-char:角色|平和|完整台词。]');
    }
});

test('gate:scene:multiline-directive-extraction-retains-original-offsets-and-outfits', () => {
    const raw = '\n\n[igs-char:角色|平和|便服|第一句。\n\n第二句。\n]\n\n[igs-thought:乙|谨慎|想清楚。\n]\n[igs-img:19]';
    const result = extractSceneDirectives(raw, { outfitResolver: createOutfitResolver(sceneAssets) });
    assert.equal(result.strippedText, raw);
    assert.equal(result.directives.length, 2);
    assert.equal(result.directives[0].outfit, '便服');
    assert.equal(result.directives[0].offset, raw.indexOf('[igs-char:'));
    assert.equal(result.directives[1].offset, raw.indexOf('[igs-thought:'));
    assert.equal(result.directives[1].lineIndex, raw.slice(0, raw.indexOf('[igs-thought:')).split('\n').length - 1);
    assert.equal(result.illustrationMarkers[0].offset, raw.indexOf('[igs-img:19]'));
    assert.equal(normalizeClosedIgsDialogueLines(raw).length, raw.length);
});

test('gate:scene:unclosed-dialogue-cannot-borrow-next-directive-or-content-close', () => {
    const head = '[igs-char:甲|平和|缺了收口。\n旁白。\n';
    for (const tail of ['[igs-char:乙|平和|下一句。]', '[igs-thought:乙|平和|下一句。]', '[igs-scene:教室|白天|晴]', '[igs-fx:whisper]', '[igs-chat:乙]', '</content>\n[外部]']) {
        assert.ok(normalizeClosedIgsDialogueLines(head + tail).startsWith(head), tail);
    }
    const payload = payloadOf(head + '[igs-char:乙|平和|下一句。]');
    assert.deepEqual(payload.textSegments, ['[甲]：缺了收口。', '旁白。', '[乙]：下一句。']);
    assert.deepEqual(payload.sceneDirectives.map(({ character, segmentIndex }) => [character, segmentIndex]), [['甲', 0], ['乙', 2]]);
});

test('gate:scene:multiline-speech-keeps-narration-and-next-speaker-outside', () => {
    const body = '先开门。\n[igs-char:甲|平和|第一句。\n第二句。\n]随后关门。\n[igs-thought:乙|谨慎|再等等。\n想清楚。\n]风停了。';
    const payload = payloadOf(body, { dialogueSentencePaging: true, sentencePaging: true });
    assert.deepEqual(payload.textSegments, ['先开门。', '[甲]：第一句。', '[甲]：第二句。', '随后关门。', '*再等等。*', '*想清楚。*', '风停了。']);
    assert.deepEqual(payload.sceneDirectives.map(({ type, character, segmentIndex }) => [type, character, segmentIndex]), [['char', '甲', 1], ['thought', '乙', 4]]);
});

test('gate:scene:multiline-dialogue-still-renders-complete-text-effects', () => {
    const body = '[igs-char:角色|平和|\n{小:轻声说。}\n第二句。\n]';
    const payload = payloadOf(body, { dialogueSentencePaging: true });
    assert.deepEqual(payload.textSegments, ['[角色]：{小:轻声说。}', '[角色]：第二句。']);
    assert.match(applyTextFxMarkup(payload.textSegments[0], true), /igs-tfx-small/);
    assert.equal(applyTextFxMarkup(payload.textSegments[0], false), '[角色]：轻声说。');
});

test('gate:marker-layout:legacy-cg-with-many-blank-lines-restores-complete-dialogue', () => {
    for (const type of ['char', 'thought']) {
        for (const gap of ['\n\n', '\n \n\t\n', '\r\n\r\n\r\n']) {
            for (const marker of ['<IMG>\n19\n</IMG>', '[igs-img:19]']) {
                const raw = `<content>\n[igs-${type}:角色|平和|第一句。${gap}${marker}${gap}第二句。${gap}]\n</content>`;
                const payload = buildIgsTextPayload({ text: raw }, { sceneAssets });
                assert.deepEqual(payload.textSegments, [type === 'char' ? '[角色]：第一句。第二句。' : '*第一句。第二句。*']);
                assert.equal(payload.raw, raw);
                assert.equal(normalizeImageMarkerLayout(payload.markerLayoutSource), payload.markerLayoutSource);
                const token = marker.startsWith('<') ? '<IMG>19</IMG>' : marker;
                assert.ok(payload.markerLayoutSource.replace(/\r\n/g, '\n').includes(`]\n${token}`));
            }
        }
    }
});

test('gate:illustration:multiline-dialogue-is-one-numbered-paragraph-and-cg-stays-after-close', () => {
    const unit = '[igs-char:角色|平和|第一句。\n\n第二句。\n]';
    const raw = `<content>\n${unit}\n随后离开。\n</content>`;
    const numbered = numberParagraphs(raw);
    assert.equal(numbered.paragraphs.length, 2);
    assert.deepEqual(numbered.paragraphs.map(({ lineIndex }) => lineIndex), [1, 5]);
    assert.ok(numbered.paragraphs[0].text.includes('第一句。') && numbered.paragraphs[0].text.includes('第二句。'));
    assert.equal(paragraphNoForAnchor(raw, numbered.paragraphs, '第二句。'), 1);
    const expected = `<content>\n${unit}\n[igs-img:19]\n随后离开。\n</content>`;
    for (const anchorSentence of ['第一句。', '第二句。']) assert.equal(insertMarkersAtAnchors(raw, [{ slot: 19, anchorSentence }]), expected);
    assert.equal(insertMarkers(raw, numbered.paragraphs, [{ slot: 19, at: 1 }]), expected);
});

test('gate:marker-layout:multiple-legacy-cg-points-retain-slots-after-one-speech', () => {
    const raw = '<content>\n[igs-char:角色|平和|第一句。\n\n<IMG>19</IMG>\n\n第二句。\n\n[igs-img:20]\n\n第三句。\n\n]\n</content>';
    const payload = buildIgsTextPayload({ text: raw }, { sceneAssets });
    assert.deepEqual(payload.textSegments, ['[角色]：第一句。第二句。第三句。']);
    assert.ok(payload.markerLayoutSource.includes(']\n<IMG>19</IMG>\n[igs-img:20]'));
    assert.equal(payload.raw, raw);
    assert.equal(normalizeImageMarkerLayout(payload.markerLayoutSource), payload.markerLayoutSource);
});

test('gate:illustration:multiline-transplant-uses-complete-speech-as-context', () => {
    const unit = '[igs-char:角色|平和|第一句。\n第二句。\n]';
    const marked = `<content>\n[igs-scene:教室|白天|晴]\n${unit}\n[igs-img:19]\n随后离开。\n</content>`;
    const current = `<content>\n[igs-scene:教室|白天|晴]\n先开门。\n${unit}\n随后离开。\n</content>`;
    assert.equal(transplantMarkers(marked, current).text, current.replace(`${unit}\n`, `${unit}\n[igs-img:19]\n`));
});
