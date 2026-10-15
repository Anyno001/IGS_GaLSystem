import test from 'node:test';
import assert from 'node:assert/strict';
import { createAutoIllustrationService } from './helpers/media-fixtures.js';
import { createMemoryIllustrationStore } from '../src/media/illustration-store.js';

const anchor = '先把画挂起来。';
const scene = '[igs-scene:画室|晚上|晴|NSFW]';
const caption = { v4_prompt: { caption: { base_caption: 'painting, room', char_captions: [] } } };

async function plan(text, anchors) {
    let current = text, paints = 0, writes = 0;
    const logs = [];
    const service = createAutoIllustrationService({
        messageHost: {
            getChatId: () => 'anchor-fixture',
            readFloor: () => ({ chatId: 'anchor-fixture', messageId: 36, swipeId: 0, isAi: true, isLatest: true, text: current }),
            readPreviousAiTexts: () => [],
            writeFloor: async (_id, next) => { writes++; current = next; return { ok: true }; },
            ensureMarkerRegexes: async () => ({ ok: true }),
            destroy() {},
        },
        nai: {
            describe: () => ({ via: 'dbgen', ownPrompts: true, ready: { ok: true } }),
            writeDbgenFloorPrompts: async () => ({ ok: true, captions: anchors.map((anchorSentence, i) => ({ slotId: i + 1, caption, anchorSentence })) }),
            generateDbgenCaption: async () => { paints++; return { ok: true, dataUrl: 'data:image/png;base64,Q0c=' }; },
        },
        store: createMemoryIllustrationStore(),
        getSettings: () => ({ nsfwEnabled: true, nsfwCount: anchors.length }),
        events: { emit() {} }, minBodyChars: 0,
        report: (level, message) => logs.push({ level, message }),
    });
    try {
        const result = await service.processMessage(36);
        return { result, text: current, paints, writes, logs };
    } finally { service.stop(); }
}

test('cg-anchor-scope:matched-body-after-thinking-is-written-before-generation', async () => {
    const prefix = `<thinking>遵循<sentence_hard_constraints>；引用：${anchor}</thinking>\n`;
    const dialogue = `[igs-char:角色甲|平和|${anchor}\n\n再把灯点上。]`;
    const raw = `${prefix}<content>\n${scene}\n${dialogue}\n</content>`;
    const out = await plan(raw, [anchor]);
    assert.equal(out.result.reason, 'done');
    assert.equal(out.paints, 1);
    assert.equal(out.writes, 1);
    assert.equal(out.text, `${prefix}<content>\n${scene}\n${dialogue}\n[igs-img:1]\n</content>`);
    assert.equal(out.logs.some(log => log.level === 'warn' || log.level === 'error'), false);
});

test('cg-anchor-scope:unsafe-body-is-reported-as-matched-and-never-painted', async () => {
    const raw = `<content>\n${scene}\n[igs-char:角色甲|平和|${anchor}\n</content>`;
    const out = await plan(raw, [anchor]);
    assert.equal(out.result.reason, 'plan-failed');
    assert.equal(out.result.error, '生成点已命中正文，但没有安全的独占行插入位置');
    assert.ok(out.logs.some(log => log.level === 'warn' && log.message.includes('已命中正文，但无法在完整结构之后安全插入')));
    assert.equal(out.logs.some(log => log.message.includes('没有能对上正文')), false);
    assert.equal(out.paints + out.writes, 0);
    assert.equal(out.text, raw);
});

test('cg-anchor-scope:missing-and-empty-anchors-remain-unmatched', async () => {
    for (const missing of ['完全不同的生成点。', '']) {
        const raw = `<content>\n${scene}\n${anchor}\n</content>`;
        const out = await plan(raw, [missing]);
        assert.equal(out.result.reason, 'plan-failed');
        assert.equal(out.result.error, '数据库生图插件没有返回能对上正文的生成点');
        assert.equal(out.paints + out.writes, 0);
        assert.equal(out.text, raw);
    }
});

test('cg-anchor-scope:mixed-failures-count-each-cause', async () => {
    const raw = `<content>\n${scene}\n[igs-char:角色甲|平和|${anchor}\n</content>`;
    const out = await plan(raw, [anchor, '完全不同的生成点。']);
    assert.equal(out.result.reason, 'plan-failed');
    assert.equal(out.result.error, '生成点均不可用（正文未命中 1 个，无法安全插入 1 个）');
    assert.equal(out.paints + out.writes, 0);
});
