import test from 'node:test';
import assert from 'node:assert/strict';
import { createAssetGenerationService, createAutoIllustrationService } from './helpers/media-fixtures.js';
import { createMemoryGeneratedAssetStore } from '../src/media/generated-asset-store.js';
import { createMemoryIllustrationStore } from '../src/media/illustration-store.js';
import { createImageBackend } from '../src/generated-images/image-backend.js';
import { lookupSceneBackground } from '../src/scene/scene-directives.js';
import { resolveBackgroundAsset, bindGeneratedBackground } from '../src/scene/asset-match.js';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDpYAAAAASUVORK5CYII=';
const caption = text => ({
    v4_prompt: { caption: { base_caption: text, char_captions: [] } },
    v4_negative_prompt: { caption: { base_caption: 'lowres', char_captions: [] } },
});
const state = { scene: '教室', time: '夜晚', weather: '雨' };
const assets = () => ({ enabled: true, scenes: { 教室: { url: 'igs-gen:base', times: {} } }, characters: {} });

function host(text = '[igs-scene:教室|夜晚|雨]\n[igs-char:艾莉|平和|教室里的灯已经熄灭。]') {
    let floor = { chatId: 'c', messageId: 3, swipeId: 0, isAi: true, isLatest: true, text };
    return {
        getChatId: () => 'c', readFloor: () => floor, readPreviousAiTexts: () => [], destroy() {},
        setFloor: value => { floor = { ...floor, ...value }; },
        ensureMarkerRegexes: async () => ({ ok: true }),
        writeFloor: async (id, text) => { floor = { ...floor, text }; return { ok: true }; },
    };
}

function variants(t, { prompt, nai, tempRecord, auto = { backgroundEnabled: true } } = {}) {
    const store = createMemoryGeneratedAssetStore();
    const sceneAssets = assets();
    const messageHost = host('[igs-scene:教室|夜晚|雨]\n教室里的灯已经熄灭。');
    const service = createAssetGenerationService({
        store, nai, messageHost, minBodyChars: 0, newId: () => 'new-image',
        getSettings: () => ({ sceneAssets, autoIllustration: { assets: auto } }),
    });
    t.after(() => service.stop());
    const ready = Promise.all([
        store.putImage({ id: 'base', type: 'background', dataUrl: PNG, ...(prompt && { prompt }) }),
        tempRecord ? store.putAsset({ key: 'c|bg|教室|夜晚', chatId: 'c', floorKey: 'c|3|0', type: 'background', name: '教室', time: '夜晚', imageId: '', ...tempRecord }) : null,
    ]);
    return { service, store, sceneAssets, messageHost, ready };
}

test('gate:scene-recovery:empty-or-unavailable-variants-fall-back-within-the-same-scene', () => {
    const sceneAssets = { scenes: { 教室: { url: 'base.png', times: { 夜晚: { url: 'night.png', weathers: { 雨: { url: '' } } } } } } };
    assert.deepEqual([lookupSceneBackground(state, sceneAssets).url, lookupSceneBackground(state, sceneAssets).timed], ['night.png', true]);
    sceneAssets.scenes.教室.times.夜晚.url = '  ';
    assert.deepEqual([lookupSceneBackground(state, sceneAssets).url, lookupSceneBackground(state, sceneAssets).timed], ['base.png', false]);
    sceneAssets.scenes.教室.times.夜晚 = null;
    assert.equal(lookupSceneBackground(state, sceneAssets).url, 'base.png');
    sceneAssets.scenes.教室.times.夜晚 = { url: 'igs-gen:lost' };
    assert.equal(resolveBackgroundAsset(state, { sceneAssets, isMissingImage: url => url === 'igs-gen:lost' }).url, 'base.png');
});

test('gate:scene-recovery:empty-registration-keeps-library-chat-and-generation-fallbacks', () => {
    const sceneAssets = { scenes: { 教室: { url: '', times: {} } } };
    const generatedAssets = { scenes: { 教室: { url: 'library.png', times: {} } } };
    assert.equal(resolveBackgroundAsset(state, { sceneAssets, generatedAssets }).url, 'library.png');
    assert.equal(resolveBackgroundAsset(state, { sceneAssets, tempBackground: () => 'chat.png' }).url, 'chat.png');
    assert.equal(resolveBackgroundAsset(state, { sceneAssets }).needsGeneration, true);
    sceneAssets.scenes.默认 = { url: 'default.png' };
    const placeholder = resolveBackgroundAsset(state, { sceneAssets });
    assert.deepEqual([placeholder.url, placeholder.source, placeholder.needsGeneration], ['default.png', 'placeholder', true]);
});

test('gate:scene-recovery:a-new-floor-can-retry-a-failed-time-variant-without-polling', async t => {
    let paints = 0;
    const { service, messageHost, ready } = variants(t, {
        prompt: { positive: 'classroom, day', negative: 'lowres' },
        nai: {
            describe: () => ({ ownPrompts: true, ready: { ok: true } }),
            async generateDbgenCaption() { paints++; return paints === 1 ? { ok: false, error: 'controlled failure' } : { ok: true, dataUrl: PNG }; },
        },
    });
    await ready;
    assert.equal((await service.processMessage(3)).ok, false);
    await service.processMessage(3);
    assert.equal(paints, 1);
    messageHost.setFloor({ messageId: 4 });
    assert.equal((await service.processMessage(4)).count, 1);
    assert.equal(paints, 2);
});

test('gate:scene-recovery:failed-time-variant-can-be-retried-manually-without-rewriting-words', async t => {
    let paints = 0;
    const { service, store, ready } = variants(t, {
        prompt: { positive: 'classroom, day, desk', negative: 'lowres' },
        nai: {
            describe: () => ({ ownPrompts: true, ready: { ok: true } }),
            async generateDbgenCaption() { paints++; return paints === 1 ? { ok: false, error: 'controlled failure' } : { ok: true, dataUrl: PNG }; },
            async writeDbgenPrompt() { assert.fail('a stored background prompt should be reused'); },
        },
    });
    await ready;
    assert.equal((await service.processMessage(3)).ok, false);
    assert.equal((await service.processMessage(3)).reason, 'nothing-missing');
    assert.equal(paints, 1);
    const retry = await service.processMessage(3, { manual: true });
    assert.deepEqual([retry.ok, retry.count, paints], [true, 1, 2]);
    assert.equal((await store.getAsset('c|bg|教室|夜晚')).status, 'review');
    assert.equal((await service.processMessage(3, { manual: true })).reason, 'nothing-missing');
    assert.equal(paints, 2);
});

test('gate:scene-recovery:legacy-skipped-without-prompt-uses-the-background-writing-queue', async t => {
    let writes = 0, paints = 0;
    const { service, store, sceneAssets, ready } = variants(t, {
        tempRecord: { status: 'skipped' },
        nai: {
            describe: () => ({ ownPrompts: true, ready: { ok: true } }),
            async writeDbgenPrompt(meta) { writes++; assert.match(meta.description, /教室/); return { ok: true, captions: [{ slotId: 1, caption: caption('classroom, night') }] }; },
            async generateDbgenCaption() { paints++; return { ok: true, dataUrl: PNG }; },
        },
    });
    await ready;
    const result = await service.processMessage(3);
    assert.deepEqual([result.ok, result.count, writes, paints], [true, 1, 1, 1]);
    const record = await store.getAsset('c|bg|教室|夜晚');
    assert.deepEqual([record.status, record.variantOf, record.imageId], ['review', 'base', 'new-image']);
    assert.equal(resolveBackgroundAsset(state, { sceneAssets, tempSceneTime: service.tempSceneTime }).url, 'igs-gen:new-image');
    const bound = bindGeneratedBackground(sceneAssets, record, '教室');
    assert.equal(bound.scenes.教室.url, 'igs-gen:base');
    assert.equal(bound.scenes.教室.times.夜晚.url, 'igs-gen:new-image');
});

test('gate:scene-recovery:same-time-and-user-discard-still-do-not-generate', async t => {
    const nai = {
        describe: () => ({ ownPrompts: true, ready: { ok: true } }),
        async generateDbgenCaption() { assert.fail('no missing time variant'); },
        async writeDbgenPrompt() { assert.fail('no missing time variant'); },
    };
    for (const tempRecord of [undefined, { status: 'discarded' }]) {
        const { service, store, ready } = variants(t, { nai, tempRecord, prompt: { positive: 'classroom, night, desk', negative: 'lowres' } });
        await ready;
        assert.equal((await service.processMessage(3)).count || 0, 0);
        assert.equal((await service.processMessage(3, { manual: true })).reason, 'nothing-missing');
        if (!tempRecord) assert.equal((await store.getAsset('c|bg|教室|夜晚')).skipReason, 'same-time');
    }
});

test('gate:scene-recovery:manual-background-button-reaches-the-dbgen-painter-with-auto-disabled', async t => {
    let writes = 0, paints = 0;
    const bridge = { imageApi: { mode: 'dbgen' }, autoIllustration: { retry: { enabled: false }, assets: { backgroundEnabled: false, spriteEnabled: false } }, sceneAssets: { enabled: true, scenes: {}, characters: {} } };
    const backend = createImageBackend({ getBridge: () => bridge, global: { NaiDbGen: {
        async generateSinglePrompt(req) { writes++; assert.equal(req.skipRecall, true); assert.equal(req.messageId, 3); return { ok: true, value: { caption: caption('classroom, night') } }; },
        async generate(req) { paints++; assert.equal(req.replaceCharacterKeywords, true); return { ok: true, value: [{ blob: new Blob([Uint8Array.from(atob(PNG.split(',')[1]), c => c.charCodeAt(0))], { type: 'image/png' }) }] }; },
    } } });
    const service = createAssetGenerationService({ store: createMemoryGeneratedAssetStore(), nai: backend, messageHost: host('[igs-scene:教室|夜晚|雨]\n教室里的灯已经熄灭。'), getSettings: () => bridge });
    t.after(() => service.stop());
    assert.equal((await service.processMessage(3)).reason, 'disabled');
    assert.equal((await service.processMessage(3, { manual: true })).count, 1);
    assert.deepEqual([writes, paints], [1, 1]);
    assert.equal(service.listReview('c|3|0').length, 1);
    assert.equal(bridge.autoIllustration.assets.backgroundEnabled, false);
});

test('gate:scene-recovery:new-image-thumbnail-can-use-pixels-before-file-storage-is-readable', async t => {
    let fileReads = 0;
    const store = createMemoryGeneratedAssetStore();
    store.getImageRecord = async () => { fileReads++; throw new Error('controlled file read failure'); };
    const thumbs = new Map();
    const events = [];
    const service = createAssetGenerationService({
        store, messageHost: host(), getSettings: () => ({ sceneAssets: assets() }),
        thumbStore: { get: async id => thumbs.get(id), put: async (id, data) => thumbs.set(id, data), remove: async () => {} },
        makeThumb: async data => { assert.ok(data); return PNG; }, events: { emit: (type, detail) => events.push(detail) },
    });
    t.after(() => service.stop());
    await service.writeStoredImage({ id: 'new', type: 'background', dataUrl: PNG });
    assert.ok(service.resolveUrl('igs-gen:new'));
    service.resolveThumbUrl('igs-gen:new');
    await new Promise(resolve => setImmediate(resolve));
    assert.ok(service.resolveThumbUrl('igs-gen:new'));
    assert.equal(fileReads, 0);
    assert.ok(events.some(event => event.reason === 'image-loaded'));
});

test('gate:scene-recovery:cg-empty-success-is-a-failure-and-second-click-retries-painting', async t => {
    const store = createMemoryIllustrationStore();
    const messageHost = host();
    let writes = 0, paints = 0;
    const service = createAutoIllustrationService({
        store, messageHost, getSettings: () => ({ interludeEnabled: true, interludeMaxCount: 1 }),
        nai: {
            describe: () => ({ via: 'dbgen', ready: { ok: true } }),
            async writeDbgenFloorPrompts() { writes++; return { ok: true, captions: [{ slotId: 1, caption: caption('classroom'), anchorSentence: '教室里的灯已经熄灭。' }] }; },
            async generateDbgenCaption() { paints++; return paints === 1 ? { ok: true, dataUrl: '' } : { ok: true, dataUrl: PNG }; },
        },
    });
    t.after(() => service.stop());
    const first = await service.processMessage(3, { manual: true });
    assert.deepEqual([first.ok, first.reason, first.count], [false, 'generation-failed', 0]);
    assert.match(first.error, /未返回图片/);
    const second = await service.processMessage(3, { manual: true });
    assert.deepEqual([second.ok, second.count, writes, paints], [true, 1, 1, 2]);
    assert.equal((await store.getSlots('c|3|0'))[0].status, 'done');
    assert.match(messageHost.readFloor().text, /。\]\n\[igs-img:1\]/);
});

test('gate:scene-recovery:cg-done-record-with-no-pixels-is-still-retryable', async t => {
    const store = createMemoryIllustrationStore();
    await store.putSlot('c|3|0', { slot: 1, caption: caption('classroom'), status: 'done', dataUrl: 'data:image/png;base64,' });
    let paints = 0;
    const service = createAutoIllustrationService({
        store, messageHost: host('灯熄灭了。\n[igs-img:1]'), getSettings: () => ({ interludeEnabled: true }),
        nai: { describe: () => ({ via: 'dbgen', ready: { ok: true } }), async generateDbgenCaption() { paints++; return { ok: true, dataUrl: PNG }; } },
    });
    t.after(() => service.stop());
    assert.equal((await service.processMessage(3, { manual: true })).count, 1);
    assert.equal(paints, 1);
});

test('gate:scene-recovery:dbgen-empty-blob-is-a-retryable-image-failure', async () => {
    const backend = createImageBackend({
        global: { NaiDbGen: { async generate() { return { ok: true, value: [{ blob: new Blob([], { type: 'image/png' }) }] }; } } },
        getBridge: () => ({ imageApi: { mode: 'dbgen' }, autoIllustration: { retry: { enabled: false } } }),
    });
    const result = await backend.generateDbgenCaption({ caption: caption('classroom') });
    assert.equal(result.ok, false);
    assert.equal(result.failure.kind, 'emptyOrBroken');
    assert.match(result.error, /空图/);
    assert.ok(result.prompt);
});
