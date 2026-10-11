import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyImageError } from '../src/generated-images/failure-classify.js';
import { createRateGate, withImageRetry, readImageRetrySettings } from '../src/generated-images/retry-policy.js';
import { createImageBackend } from '../src/generated-images/image-backend.js';
import { normalizeAutoIllustrationSettings } from '../src/generated-images/illustration/auto-illustration-settings.js';

const fast = () => ({ sleep: async () => {}, gate: createRateGate({ sleep: async () => {} }) });

test('gate:image-retry:classify-table', () => {
    const table = [
        [{ error: 'NAI 请求过于频繁（429）', status: 429 }, 'nai', 'rateLimit429', true],
        [{ error: 'x', status: 503 }, 'nai', 'server5xx', true],
        [{ error: 'NAI 请求超时' }, 'nai', 'timeout', true],
        [{ error: '智绘姬 240 秒内没有返回图片', reason: 'chatu8-timeout' }, 'chatu8', 'pluginTimeout', false],
        [{ error: '超过 180 秒没有返回，已放弃等待' }, 'dbgen', 'pluginTimeout', false],
        [{ error: '浏览器直连 NAI 失败（可能是 CORS 或网络不通）' }, 'nai', 'network', true],
        [{ error: '柏宝绘没有返回图片' }, 'baibai', 'emptyOrBroken', true],
        [{ error: 'NAI 图片响应解析失败' }, 'nai', 'emptyOrBroken', true],
        [{ error: '图片被内容审核拦截 moderation' }, 'baibai', 'moderation', false],
        [{ error: 'NAI 鉴权失败（401）', status: 401 }, 'nai', 'authOrParam', false],
        [{ error: '请先在设置中填写 NAI Key' }, 'nai', 'authOrParam', false],
        [{ error: '未检测到智绘姬' }, 'chatu8', 'authOrParam', false],
        [{ error: '智绘姬出图失败：未知错误' }, 'chatu8', 'unknown', true],
        ['随便什么', 'nai', 'unknown', true],
    ];
    for (const [input, source, kind, retryable] of table) {
        const got = classifyImageError(input, { source });
        assert.equal(got.kind, kind, JSON.stringify(input));
        assert.equal(got.retryable, retryable, JSON.stringify(input));
        assert.ok(got.reason);
    }
});

test('gate:image-retry:retries-twice-then-reports-failure', async () => {
    let calls = 0;
    const events = [];
    const result = await withImageRetry(async () => { calls += 1; return { ok: false, error: 'x', status: 502 }; },
        { source: 'baibai', settings: { enabled: true, times: 2 }, onRetry: (e) => events.push(e.text), ...fast() });
    assert.equal(calls, 3);
    assert.equal(events.length, 2);
    assert.equal(result.ok, false);
    assert.equal(result.failure.kind, 'server5xx');
    assert.equal(result.failure.attempts, 3);
    const ok = await withImageRetry(async ({ attempt }) => (attempt < 1 ? { ok: false, error: '没有返回图片' } : { ok: true, dataUrl: 'd' }),
        { source: 'dbgen', settings: { enabled: true, times: 2 }, ...fast() });
    assert.equal(ok.ok, true);
});

test('gate:image-retry:disabled-by-setting', async () => {
    let calls = 0;
    await withImageRetry(async () => { calls += 1; return { ok: false, error: 'x', status: 500 }; },
        { source: 'dbgen', settings: { enabled: false, times: 2 }, ...fast() });
    assert.equal(calls, 1);
    assert.deepEqual(readImageRetrySettings({ retry: { enabled: false, times: 9 } }), { enabled: false, times: 5 });
    assert.deepEqual(readImageRetrySettings({}), { enabled: true, times: 2 });
    assert.deepEqual(normalizeAutoIllustrationSettings({}).retry, { enabled: true, times: 2 });
});

test('gate:image-retry:no-retry-on-auth-or-moderation', async () => {
    for (const error of ['鉴权失败', '内容审核拦截 moderation']) {
        let calls = 0;
        await withImageRetry(async () => { calls += 1; return { ok: false, error }; }, { source: 'baibai', settings: { enabled: true, times: 2 }, ...fast() });
        assert.equal(calls, 1);
    }
});

test('gate:image-retry:plugin-timeout-not-retried', async () => {
    let calls = 0;
    const result = await withImageRetry(async () => { calls += 1; return { ok: false, error: '智绘姬 240 秒内没有返回图片', reason: 'chatu8-timeout' }; },
        { source: 'chatu8', settings: { enabled: true, times: 2 }, ...fast() });
    assert.equal(calls, 1);
    assert.equal(result.failure.kind, 'pluginTimeout');
});

test('gate:image-retry:nai-not-double-retried', async () => {
    let calls = 0;
    const result = await withImageRetry(async () => { calls += 1; return { ok: false, error: 'x', status: 500 }; },
        { source: 'nai', settings: { enabled: true, times: 2 }, ...fast() });
    assert.equal(calls, 1);
    assert.equal(result.failure.kind, 'server5xx');
});

test('gate:image-retry:empty-image-changes-seed', async () => {
    const seeds = [];
    await withImageRetry(async ({ seed }) => { seeds.push(seed); return seeds.length < 3 ? { ok: false, error: '没有返回图片' } : { ok: true }; },
        { source: 'baibai', settings: { enabled: true, times: 2 }, random: () => 0.5, ...fast() });
    assert.equal(seeds[0], undefined);
    assert.ok(seeds[1] > 0 && seeds[2] > 0);
});

test('gate:image-retry:429-throttles-globally', async () => {
    let t = 1000;
    const slept = [];
    const gate = createRateGate({ now: () => t, sleep: async (ms) => { slept.push(ms); t += ms; } });
    await gate.wait();
    gate.note429();
    t += 1000;
    await gate.wait();
    assert.deepEqual(slept, [2000]);
    t += 61000;
    await gate.wait();
    assert.deepEqual(slept, [2000]);
    let n = 0;
    const waits = [];
    await withImageRetry(async () => { n += 1; return n < 2 ? { ok: false, error: 'x', status: 429, retryAfter: 7 } : { ok: true }; },
        { source: 'baibai', settings: { enabled: true, times: 2 }, gate, sleep: async (ms) => { waits.push(ms); } });
    assert.equal(waits[0], 7000);
    assert.ok(gate.state().until > t);
});

test('gate:image-retry:backend-integration', async () => {
    const hints = [];
    let plugin = 0;
    const api = { apiVersion: 1, getBackendStatus: () => ({ configured: true }), generate: async () => { plugin += 1; if (plugin < 3) throw new Error('503'); return { dataUrl: 'data:image/png;base64,AA' }; } };
    const bridge = { imageApi: { mode: 'baibai' }, autoIllustration: { retry: { enabled: true, times: 2 } } };
    const backend = createImageBackend({ nai: { generate: async () => ({ ok: false, error: 'no' }) }, getBridge: () => bridge, global: { STBaiBaiImage: api },
        onRetry: (e) => hints.push(e.text), retrySleep: async () => {}, retryGate: createRateGate({ sleep: async () => {} }) });
    const done = await backend.generate({ scene: 'a' }, {}, {});
    assert.equal(done.ok, true);
    assert.equal(plugin, 3);
    assert.equal(hints.length, 2);
    plugin = -10;
    const bad = await backend.generate({ scene: 'a' }, {}, {});
    assert.equal(bad.ok, false);
    assert.ok(bad.failure && bad.failure.reason);
});
