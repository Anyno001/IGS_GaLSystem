import test from 'node:test';
import assert from 'node:assert/strict';
import { applySentencePaging, buildIgsTextPayload } from '../src/scene/message-source.js';
import { TEXT_FX_KINDS, applyTextFxMarkup, stripTextFxMarkup } from '../src/visual/igs-ui/text-fx.js';
import { esc } from '../src/visual/igs-ui/reader-value-utils.js';

const sceneAssets = { enabled: true };
const payloadOf = (body, options = {}) => buildIgsTextPayload({ id: 1, text: `<content>\n${body}\n</content>` }, { sceneAssets, ...options });

test('gate:scene:text-fx-close-stays-with-dialogue-on-sentence-page', () => {
    const body = '[igs-fx:whisper]\n[igs-char:李伯|谨慎|便服|{小:姑娘衣袖上的金线，老夫在堂上便认出来了。}老夫这条命是多年前在北方战场上将军救回来的。]';
    const payload = payloadOf(body, { dialogueSentencePaging: true });
    assert.deepEqual(payload.textSegments, [
        '[李伯]：{小:姑娘衣袖上的金线，老夫在堂上便认出来了。}',
        '[李伯]：老夫这条命是多年前在北方战场上将军救回来的。',
    ]);
    assert.equal(payload.raw, `<content>\n${body}\n</content>`);
    const rendered = payload.textSegments.map((part) => applyTextFxMarkup(esc(part), true));
    assert.match(rendered[0], /igs-tfx-small/);
    assert.ok(rendered[0].includes('姑娘衣袖上的金线，老夫在堂上便认出来了。'));
    rendered.forEach((part) => assert.doesNotMatch(part, /\{小[:：]|\}/));
});

test('gate:scene:all-text-fx-kinds-keep-complete-markers-in-narration-dialogue-and-thought', () => {
    for (const [kind, id] of Object.entries(TEXT_FX_KINDS)) {
        for (const colon of [':', '：']) {
            const marker = `{${kind}${colon}先停下。再说！}`;
            const body = `${marker}然后离开。`;
            assert.equal(applySentencePaging(body), `${marker}\n然后离开。`);
            assert.equal(applySentencePaging(`[甲]：${body}`, { narrationOnly: true, dialogueAndThought: true }), `[甲]：${marker}\n[甲]：然后离开。`);
            assert.equal(applySentencePaging(`*[甲]：${body}*`, { narrationOnly: true, dialogueAndThought: true }), `*[甲]：${marker}*\n*[甲]：然后离开。*`);
            assert.match(applyTextFxMarkup(marker, true), new RegExp(`igs-tfx-${id}`));
            assert.equal(applyTextFxMarkup(marker, false), '先停下。再说！');
        }
    }
});

test('gate:scene:text-fx-in-mid-sentence-does-not-add-a-page', () => {
    assert.equal(applySentencePaging('他说{强:先停下。想清楚}再回答。下一句。'), '他说{强:先停下。想清楚}再回答。\n下一句。');
    assert.equal(applySentencePaging('{小:先停下。}'), '{小:先停下。}');
    assert.equal(applySentencePaging('他说{淡:轻声}离开。下一句。'), '他说{淡:轻声}离开。\n下一句。');
});

test('gate:scene:text-fx-keeps-closing-quotes-spaces-and-translation-on-its-page', () => {
    assert.equal(applySentencePaging('{小:「等等？！」} 随后停下。'), '{小:「等等？！」} \n随后停下。');
    assert.equal(applySentencePaging('{小:等等…… }” 随后停下。'), '{小:等等…… }” \n随后停下。');
    assert.equal(applySentencePaging('{淡:Wait!}〖等等！〗然后出门。'), '{淡:Wait!}〖等等！〗\n然后出门。');
    assert.equal(applySentencePaging('{淡:Wait!} 〖等等！〗然后出门。'), '{淡:Wait!} 〖等等！〗\n然后出门。');
});

test('gate:scene:text-fx-pages-remap-following-character-and-thought-directives', () => {
    const body = '[igs-char:甲|平和|{小:轻声说。}第二句。]\n[igs-thought:甲|谨慎|{强:想清楚。}再想。]\n[igs-char:乙|平和|另一句。]';
    const payload = payloadOf(body, { sentencePaging: true, dialogueSentencePaging: true });
    assert.deepEqual(payload.textSegments, [
        '[甲]：{小:轻声说。}', '[甲]：第二句。', '*{强:想清楚。}*', '*再想。*', '[乙]：另一句。',
    ]);
    assert.deepEqual(payload.sceneDirectives.map(({ type, character, segmentIndex }) => [type, character, segmentIndex]), [
        ['char', '甲', 0], ['thought', '甲', 2], ['char', '乙', 4],
    ]);
    assert.equal(payload.textSegments.map(stripTextFxMarkup).join(''), '[甲]：轻声说。[甲]：第二句。*想清楚。**再想。*[乙]：另一句。');
});

test('gate:scene:text-fx-off-still-strips-whole-markers-after-paging', () => {
    const payload = payloadOf('[igs-char:甲|平和|{小:先停下。}再继续。]', { dialogueSentencePaging: true });
    assert.deepEqual(payload.textSegments.map((part) => applyTextFxMarkup(esc(part), false)), ['[甲]：先停下。', '[甲]：再继续。']);
    assert.deepEqual(payloadOf('[igs-char:甲|平和|{小:先停下。}再继续。]').textSegments, ['[甲]：{小:先停下。}再继续。']);
});

test('gate:scene:unknown-and-unclosed-text-fx-do-not-swallow-following-lines', () => {
    assert.equal(applySentencePaging('普通{键:值}。下一句。'), '普通{键:值}。\n下一句。');
    assert.equal(applyTextFxMarkup('{慢:原文}', true), '{慢:原文}');
    const payload = payloadOf('[igs-char:甲|平和|{小:没写收口。下一句。]\n[igs-char:乙|平和|我还在。]', { dialogueSentencePaging: true });
    assert.equal(payload.textSegments.at(-1), '[乙]：我还在。');
    assert.equal(payload.sceneDirectives.at(-1).segmentIndex, payload.textSegments.length - 1);
});
