import test from 'node:test';
import assert from 'node:assert/strict';
import { createSecondaryLlm } from '../src/host/secondary-llm.js';
import { fakeLlmHost } from './helpers/fake-llm-host.js';

const config = { source: 'openai', endpoint: 'https://upstream.example/v1', apiKey: 'fake-secret', model: 'planner' };
const prompts = { system: 'SYS', user: 'USR' };
const jsonResponse = (data, status = 200) => new Response(JSON.stringify(data), { status });

function nativeOnly(response) {
    const calls = [];
    const fetch = async (url, init) => {
        if (!String(url).startsWith('/api/backends/chat-completions/')) throw new TypeError('upstream has no Access-Control-Allow-Origin');
        const body = JSON.parse(init.body);
        calls.push({ url, init, body });
        return response(url, init, body);
    };
    return { calls, fetch };
}

test('gate:llm:models-use-the-tavern-backend-with-csrf-and-request-local-auth', async () => {
    const backend = nativeOnly(() => jsonResponse({ data: [{ id: ' planner ' }, { name: 'other' }, 'planner'] }));
    const mainSettings = { custom_url: 'https://main.example/v1', apiKey: 'main-secret' };
    const host = fakeLlmHost();
    host.SillyTavern.getContext = () => ({ getRequestHeaders: () => ({ 'X-CSRF-Token': 'fake-csrf' }), settings: mainSettings });
    const llm = createSecondaryLlm({ parent: host }, { fetch: backend.fetch });
    assert.deepEqual((await llm.fetchModels(config)).models, ['planner', 'other']);
    assert.equal(backend.calls.length, 1);
    const { url, init, body } = backend.calls[0];
    assert.equal(url, '/api/backends/chat-completions/status');
    assert.equal(init.method, 'POST');
    assert.equal(init.credentials, 'same-origin');
    assert.equal(init.headers['X-CSRF-Token'], 'fake-csrf');
    assert.equal(init.headers.Authorization, undefined);
    assert.equal(body.chat_completion_source, 'custom');
    assert.equal(body.custom_url, config.endpoint);
    assert.equal(JSON.parse(body.custom_include_headers).Authorization, 'Bearer fake-secret');
    assert.deepEqual(mainSettings, { custom_url: 'https://main.example/v1', apiKey: 'main-secret' });
});

test('gate:llm:planning-uses-the-same-native-channel-and-keeps-messages', async () => {
    const backend = nativeOnly(() => jsonResponse({ choices: [{ message: { content: 'plan' } }] }));
    const llm = createSecondaryLlm(fakeLlmHost(), { fetch: backend.fetch });
    assert.equal(await llm.request(prompts, { ...config, jailbreakHead: 'HEAD', jailbreakTail: 'TAIL' }), 'plan');
    const { url, init, body } = backend.calls[0];
    assert.equal(url, '/api/backends/chat-completions/generate');
    assert.equal(init.headers['X-CSRF-Token'], 'fake-csrf');
    assert.equal(init.credentials, 'same-origin');
    assert.equal(body.chat_completion_source, 'custom');
    assert.equal(body.custom_url, config.endpoint);
    assert.equal(JSON.parse(body.custom_include_headers).Authorization, 'Bearer fake-secret');
    assert.equal(body.model, 'planner');
    assert.equal(body.stream, false);
    assert.deepEqual(body.messages, [{ role: 'system', content: 'HEAD\n\nSYS' }, { role: 'user', content: 'USR\n\nTAIL' }]);
});

test('gate:llm:root-version-and-full-endpoints-resolve-to-the-same-api-base', async () => {
    const backend = nativeOnly(() => jsonResponse({ models: ['planner'] }));
    const llm = createSecondaryLlm(fakeLlmHost(), { fetch: backend.fetch });
    for (const endpoint of ['https://upstream.example', 'https://upstream.example/', config.endpoint, `${config.endpoint}/`, `${config.endpoint}/chat/completions`, `${config.endpoint}/models`]) {
        await llm.fetchModels({ ...config, endpoint });
        assert.equal(backend.calls.at(-1).body.custom_url, config.endpoint);
    }
});

test('gate:llm:missing-host-headers-and-invalid-address-never-send-a-direct-request', async () => {
    let calls = 0;
    const fetch = async () => { calls++; throw new Error('unexpected'); };
    const missing = createSecondaryLlm({}, { fetch });
    await assert.rejects(missing.fetchModels(config), /酒馆.*请求头/);
    await assert.rejects(missing.request(prompts, config), /酒馆.*请求头/);
    const llm = createSecondaryLlm(fakeLlmHost(), { fetch });
    for (const endpoint of ['not-a-url', 'file:///tmp/llm', 'javascript:alert(1)']) {
        await assert.rejects(llm.fetchModels({ ...config, endpoint }), /地址/);
    }
    assert.equal(calls, 0);
});

test('gate:llm:native-http-and-json-errors-report-failure-without-showing-the-key', async () => {
    for (const response of [
        () => jsonResponse({ error: { message: 'Unauthorized fake-secret' } }),
        () => jsonResponse({ error: true }),
        () => new Response('<h1>Forbidden fake-secret</h1>', { status: 403 }),
    ]) {
        const backend = nativeOnly(response);
        const llm = createSecondaryLlm(fakeLlmHost(), { fetch: backend.fetch });
        for (const job of [() => llm.fetchModels(config), () => llm.request(prompts, config)]) {
            await assert.rejects(job(), error => {
                assert.match(error.message, /失败|HTTP 403/);
                assert.doesNotMatch(error.message, /fake-secret|<h1>|跨域/);
                return true;
            });
        }
    }
});

test('gate:llm:an-empty-plugin-key-does-not-inherit-the-main-connection-key', async () => {
    const backend = nativeOnly(() => jsonResponse({ data: ['planner'] }));
    const llm = createSecondaryLlm(fakeLlmHost(), { fetch: backend.fetch });
    await llm.fetchModels({ ...config, apiKey: '' });
    assert.equal(JSON.parse(backend.calls[0].body.custom_include_headers).Authorization, '');
});

test('gate:llm:planning-timeout-aborts-the-response-body-read', async () => {
    const backend = nativeOnly(() => ({ ok: true, status: 200, text: () => new Promise(() => {}) }));
    const llm = createSecondaryLlm(fakeLlmHost(), { fetch: backend.fetch });
    await assert.rejects(llm.request(prompts, { ...config, timeoutMs: 10 }), /超时/);
    assert.equal(backend.calls[0].init.signal.aborted, true);
});

test('gate:llm:model-list-timeout-also-aborts-a-hung-response-body', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const backend = nativeOnly(() => ({ ok: true, status: 200, text: () => new Promise(() => {}) }));
    const llm = createSecondaryLlm(fakeLlmHost(), { fetch: backend.fetch });
    const checked = assert.rejects(llm.fetchModels(config), /超时/);
    await Promise.resolve();
    t.mock.timers.tick(30000);
    await checked;
    assert.equal(backend.calls[0].init.signal.aborted, true);
});
