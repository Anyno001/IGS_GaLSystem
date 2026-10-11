import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePromptTriggers, defaultPromptKeywords, describePromptTrigger } from '../src/scene/prompt-triggers.js';
import { normalizePromptEntries, parsePromptKeywords } from '../src/scene/prompt-entries.js';
import { buildTagGrammar } from '../src/visual/igs-ui/tag-grammar.js';
import { normalizeSettingsValue } from '../src/visual/igs-ui/settings-normalize.js';
import { buildPageDiagnostic } from '../src/visual/igs-ui/page-diagnostic.js';
import { createPromptInjector } from '../src/host/prompt-injector.js';

const resolve = (opts) => resolvePromptTriggers(opts);
// 一问一答的聊天记录：pairs 为 [用户, AI] 列表，旧 → 新。
const chat = (pairs) => pairs.flatMap(([u, a]) => [{ user: true, text: u }, { user: false, text: a }]);

test('prompt-entries:defaults-match-old-behaviour', () => {
    const { hits, report } = resolve({ userText: '刷刷微博', recentAiTexts: ['她拔剑了'] });
    assert.deepEqual([...hits].sort(), ['battle', 'feed']);
    assert.equal(report.feed.word, '微博');
    assert.equal(report.feed.source, '你的输入');
    assert.equal(report.battle.source, 'AI上1楼');
});

test('prompt-entries:keywords-keep-regex-with-commas', () => {
    assert.deepEqual(parsePromptKeywords('微博、/翻.{0,2}手机/,热搜\n帖子'), ['微博', '/翻.{0,2}手机/', '热搜', '帖子']);
    assert.ok(resolve({ userText: '偷偷翻了下手机' }).hits.has('feed'));
});

test('prompt-entries:legacy-fields-are-dropped-and-logic-runs-on-defaults', () => {
    const entries = { live: { exclude: '开播', secondary: '不存在的词', scan: 0, sticky: 5, cooldown: 5 } };
    const n = normalizePromptEntries(entries).live;
    for (const gone of ['exclude', 'secondary', 'scan', 'sticky', 'cooldown']) assert.equal(gone in n, false, gone);
    // 排除词 / 次要词不再生效；扫描范围按默认（用户输入 + AI 上 1 楼）；不黏。
    assert.equal(resolve({ userText: '去开播吧', entries }).hits.has('live'), true);
    assert.equal(resolve({ userText: '嗯', recentAiTexts: ['他开播了'], entries }).hits.has('live'), true);
    assert.equal(resolve({ userText: '嗯', recentAiTexts: ['他开播了', '……'], entries }).hits.has('live'), false);
});

test('prompt-entries:always-and-off-change-the-grammar', () => {
    const readerSettings = { battleFx: { enabled: true }, liveFx: { enabled: true }, camera: { enabled: true } };
    const entries = { battle: { mode: 'always' }, live: { mode: 'off' } };
    const g = buildTagGrammar({ readerSettings, entries });
    assert.match(g.system, /【战斗】/);
    assert.doesNotMatch(g.system + g.depth0, /直播/);
    assert.match(g.system, /【按需】以下演出的完整写法在剧情需要时另附：镜头/);
    assert.ok(g.sizes.battle > 0);
    const r = resolve({ userText: '开播', entries });
    assert.equal(r.hits.has('live'), false);
    assert.equal(r.report.live.reason, 'off');
});

test('prompt-entries:settings-store-default-keywords-as-empty', () => {
    assert.equal(normalizeSettingsValue('bridge.sceneAssets.promptEntries.live.keys', defaultPromptKeywords('live')), '');
    assert.equal(normalizeSettingsValue('bridge.sceneAssets.promptEntries.live.keys', ' 开播 '), '开播');
    assert.equal(normalizeSettingsValue('bridge.sceneAssets.promptEntries.live.depth', '999'), 99);
    assert.equal(normalizeSettingsValue('bridge.sceneAssets.promptEntries.live.position', 'weird'), '');
    assert.equal(normalizeSettingsValue('bridge.sceneAssets.promptEntries.live.position', 'depth'), 'depth');
    assert.equal(normalizeSettingsValue('bridge.sceneAssets.promptEntries.live.mode', 'weird'), 'auto');
    assert.equal(normalizePromptEntries({ live: {} }).live.position, '');
});

test('prompt-entries:page-diagnostic-lists-reasons-and-chars', () => {
    const text = buildPageDiagnostic({ content: { segments: [] } }, {
        promptReport: { blocks: { feed: { active: true, reason: 'word', word: '热搜', source: 'AI上1楼', chars: 412 }, live: { active: false, reason: 'off' } } },
    });
    assert.match(text, /提示词按需块（共展开 412 字）/);
    assert.match(text, /社区 展开 命中「热搜」（AI上1楼） · 412 字/);
    assert.match(text, /直播 已关闭/);
});

test('prompt-entries: 泛指社交媒体也点亮手机社区', () => {
    for (const userText of ['我拿起手机看看社交媒体', '上网看看大家怎么说', '刷到一条知乎回答']) {
        assert.ok(resolve({ userText }).hits.has('feed'), userText);
    }
});

const SEG_SETTINGS = { battleFx: { enabled: true }, camera: { enabled: true }, liveFx: { enabled: true } };

test('prompt-entries:per-entry-position-splits-segments-by-position-and-depth', () => {
    const entries = {
        battle: { mode: 'always', position: 'depth', depth: 3 },
        camera: { mode: 'always', position: 'depth', depth: 3 },
        live: { mode: 'always', position: 'system' },
    };
    const g = buildTagGrammar({ readerSettings: SEG_SETTINGS, entries });
    // 位置与深度相同的合并成一段；各段 key 独立。
    assert.deepEqual(g.segments.map((x) => [x.id, x.position, x.depth]).sort(), [
        ['igs-scene-assets-entry-d3', 'depth', 3],
        ['igs-scene-assets-entry-system', 'system', 0],
    ]);
    const d3 = g.segments.find((x) => x.id.endsWith('-d3'));
    assert.match(d3.content, /【战斗】/);
    assert.match(d3.content, /【镜头】/);
    assert.deepEqual(d3.keys, ['battle', 'camera']);
    // 自己带位置的块不再混进主段和聊天末尾段。
    assert.doesNotMatch(g.system + g.depth0, /【战斗】|【镜头】|【直播间】/);
    assert.deepEqual(g.placements.battle, { position: 'depth', depth: 3 });
});

test('prompt-entries:unset-position-keeps-global-channels-and-keyword-hit-gates-segment', () => {
    const entries = { battle: { mode: 'always' }, camera: { position: 'depth0' } };
    const none = buildTagGrammar({ readerSettings: SEG_SETTINGS, entries });
    assert.match(none.system, /【战斗】/);
    assert.deepEqual(none.segments, []);
    // 关键词条目没命中不出段，只留索引；命中才出段。
    assert.match(none.system, /【按需】.*镜头/);
    const hit = buildTagGrammar({ readerSettings: SEG_SETTINGS, entries, expand: new Set(['camera']) });
    assert.deepEqual(hit.segments.map((x) => [x.id, x.position, x.depth]), [['igs-scene-assets-entry-depth0', 'depth0', 0]]);
    // 指定深度 0 等同聊天末尾，同一段。
    const both = buildTagGrammar({ readerSettings: SEG_SETTINGS, entries: { battle: { mode: 'always', position: 'depth', depth: 0 }, camera: { mode: 'always', position: 'depth0' } } });
    assert.equal(both.segments.length, 1);
    assert.deepEqual(both.segments[0].keys, ['battle', 'camera']);
});

test('prompt-entries:injector-passes-position-and-depth-to-extension-prompts', () => {
    const calls = [];
    const extensionPrompts = {};
    const ctx = { extensionPrompts, setExtensionPrompt: (...args) => { calls.push(args); extensionPrompts[args[0]] = { value: args[1], position: args[2], depth: args[3] }; } };
    const injector = createPromptInjector({ SillyTavern: { getContext: () => ctx } });
    const result = injector.inject('主段', {
        placement: 'system',
        depth0Content: '末尾',
        segments: [
            { id: 'igs-scene-assets-entry-d3', position: 'depth', depth: 3, content: '深度三' },
            { id: 'igs-scene-assets-entry-system', position: 'system', depth: 0, content: '系统段' },
            { id: 'igs-scene-assets-entry-depth0', position: 'depth0', depth: 0, content: '' },
        ],
    });
    assert.equal(result.ok, true);
    const byId = Object.fromEntries(calls.map((c) => [c[0], c]));
    assert.deepEqual([byId['igs-scene-assets-format-rule'][2], byId['igs-scene-assets-format-rule'][3]], [0, 0]);
    assert.deepEqual([byId['igs-scene-assets-depth0'][2], byId['igs-scene-assets-depth0'][3]], [1, 0]);
    assert.deepEqual([byId['igs-scene-assets-entry-d3'][1], byId['igs-scene-assets-entry-d3'][2], byId['igs-scene-assets-entry-d3'][3]], ['深度三', 1, 3]);
    assert.deepEqual([byId['igs-scene-assets-entry-system'][2], byId['igs-scene-assets-entry-system'][3]], [0, 0]);
    assert.equal('igs-scene-assets-entry-depth0' in byId, false, '空段不注入');
    // clear 把分段 key 一并清掉。
    injector.clear();
    assert.equal(Object.keys(extensionPrompts).length, 0);
});

test('prompt-entries:diagnostic-shows-position-and-depth', () => {
    const text = buildPageDiagnostic({ content: { segments: [] } }, {
        promptReport: { blocks: { battle: { active: true, reason: 'always', chars: 80, position: 'depth', depth: 3 } } },
    });
    assert.match(text, /战斗 展开 常驻 · 80 字 · 指定深度 @D3/);
});

test('写法正文字数节点随输入就地更新，清空显示内置字数', async () => {
    const { updateCharCounts, chars, renderPromptEntryFields } = await import('../src/visual/igs-ui/prompt-entries-fields.js');
    const mk = (path, fallback) => { const attrs = { 'data-char-count-for': path, 'data-char-fallback': String(fallback) }; return { textContent: '0', getAttribute: (k) => attrs[k] }; };
    const a = mk('x.a', 7); const b = mk('x.b', 3);
    const root = { querySelectorAll: () => [a, b] };
    updateCharCounts(root, 'x.a', '你好😀ab');
    assert.equal(a.textContent, '5');
    assert.equal(b.textContent, '0');
    updateCharCounts(root, 'x.a', '');
    assert.equal(a.textContent, '7');
    assert.equal(chars('😀😀'), 2);
    assert.equal(typeof renderPromptEntryFields, 'function');
});
