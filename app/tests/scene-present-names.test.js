import test from 'node:test';
import assert from 'node:assert/strict';
import { extractSceneDirectives, resolveSceneAtSourceOffset } from '../src/scene/scene-directives.js';
import { detectPromptTriggers } from '../src/scene/prompt-triggers.js';
import { numberParagraphs } from '../src/generated-images/illustration/marker-placer.js';

const scene = (text) => extractSceneDirectives(text).directives.find((d) => d.type === 'scene');

test('gate: igs-scene 3 段与 4 段写法不受第 5 段影响', () => {
    assert.deepEqual(
        { ...scene('[igs-scene:教室|下午|晴天]'), segmentIndex: 0 },
        { type: 'scene', scene: '教室', time: '下午', weather: '晴天', nsfw: false, present: [], segmentIndex: 0, lineIndex: 0, offset: 0 },
    );
    const nsfw = scene('[igs-scene:卧室|深夜|小雨|NSFW]');
    assert.equal(nsfw.nsfw, true);
    assert.deepEqual(nsfw.present, []);
    assert.equal(scene('[igs-scene:卧室|深夜|小雨|]').nsfw, false);
});

test('gate: igs-scene 第 5 段解析为在场名单且不污染前 4 段', () => {
    const a = scene('[igs-scene:卧室|深夜|小雨|nsfw|小雪,白墨]');
    assert.equal(a.nsfw, true);
    assert.equal(a.weather, '小雨');
    assert.deepEqual(a.present, ['小雪', '白墨']);
    const b = scene('[igs-scene:教室|下午|晴天||小雪,白墨]');
    assert.equal(b.nsfw, false);
    assert.equal(b.weather, '晴天');
    assert.deepEqual(b.present, ['小雪', '白墨']);
});

test('gate: igs-scene 第 5 段分隔符混用、去重、空段', () => {
    assert.deepEqual(scene('[igs-scene:教室|下午|晴天||小雪，白墨、林夏, 苏苏 小雪]').present, ['小雪', '白墨', '林夏', '苏苏']);
    assert.deepEqual(scene('[igs-scene:教室|下午|晴天||]').present, []);
    assert.deepEqual(scene('[igs-scene:教室|下午|晴天|nsfw|]').present, []);
    assert.equal(scene('[igs-scene:教室|下午|晴天|nsfw|]').nsfw, true);
});

test('gate: resolveSceneAtSourceOffset 与行内混排识别第 5 段', () => {
    const src = '[igs-scene:教室|下午|晴天||小雪]正文';
    const r = resolveSceneAtSourceOffset(src, src.length);
    assert.equal(r.weather, '晴天');
    assert.equal(r.nsfw, false);
    assert.deepEqual(r.present, ['小雪']);
    assert.equal(scene('他说话。[igs-scene:教室|下午|晴天|NSFW|小雪]正文').nsfw, true);
});

test('gate: prompt-triggers 对带第 5 段的 nsfw 标签仍命中', () => {
    for (const tag of ['[igs-scene:卧室|深夜|小雨|NSFW]', '[igs-scene:卧室|深夜|小雨|NSFW|小雪,白墨]']) {
        const hits = detectPromptTriggers({ recentAiTexts: [`${tag}\n她靠近。`] });
        assert.ok(hits.has('romance'), tag);
        assert.ok(hits.has('courtesy'), tag);
    }
    const none = detectPromptTriggers({ recentAiTexts: ['[igs-scene:教室|下午|晴天||小雪,白墨]\n早安。'] });
    assert.ok(!none.has('romance'));
});

test('gate: marker-placer 的 nsfw 判定认第 5 段', () => {
    const wrap = (tag) => `<content>\n${tag}\n她笑了。\n</content>`;
    assert.equal(numberParagraphs(wrap('[igs-scene:卧室|深夜|小雨|NSFW|小雪,白墨]')).isNsfw, true);
    const plain = numberParagraphs(wrap('[igs-scene:教室|下午|晴天||小雪,白墨]'));
    assert.equal(plain.isNsfw, false);
    assert.equal(plain.scenes[0].weather, '晴天');
    assert.ok(plain.paragraphs.every((p) => !p.text.includes('igs-scene')));
});
