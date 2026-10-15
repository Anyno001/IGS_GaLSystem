import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSpriteAsset } from '../src/scene/asset-match.js';
import { createAssetGenerationService } from '../src/generated-images/illustration/asset-generation-service.js';
import { createLocalImageCache } from '../src/media/tavern-image-cache.js';
import { createMemoryAssetThumbStore } from '../src/media/asset-thumb-store.js';
import { pixel, settleMedia } from './helpers/fake-media-server.js';

function fixture(t, { thumbs = false } = {}) {
    let time = 0, image = pixel('white'), error = null, reads = 0;
    const cache = createLocalImageCache({}, { now: () => time });
    const signals = new EventTarget(), notifications = [];
    const global = { addEventListener: signals.addEventListener.bind(signals), removeEventListener: signals.removeEventListener.bind(signals) };
    const service = createAssetGenerationService({
        global, mediaCache: cache, getSettings: () => ({}),
        messageHost: { getChatId: () => 'chat', on: () => () => {} },
        store: { getImage: async () => { reads++; if (error) throw error; return image ? { dataUrl: image } : null; } },
        events: { emit: (_name, detail) => notifications.push(detail) },
        ...(thumbs ? { thumbStore: createMemoryAssetThumbStore({ mediaCache: cache }), makeThumb: async () => pixel('thumb') } : {}),
    });
    t.after(async () => { service.stop(); await cache.destroy(); });
    return { service, cache, signals, notifications, setImage: value => { image = value; }, setError: value => { error = value; }, advance: value => { time += value; }, reads: () => reads };
}

test('gate:sprite:registered-empty-original-does-not-block-the-same-character-library', () => {
    const sceneAssets = { characters: { 白墨: {} }, characterAliases: { 白墨: ['陛下'] } };
    for (const name of ['白墨', '陛下']) {
        const hit = resolveSpriteAsset(name, '惊艳', { sceneAssets, generatedAssets: { characters: { 白墨: { 平和: 'igs-gen:library' } } } });
        assert.equal(hit.url, 'igs-gen:library'); assert.equal(hit.character, '白墨'); assert.equal(hit.source, 'library'); assert.equal(hit.needsGeneration, false);
    }
});

test('gate:sprite:unavailable-original-continues-to-library-and-chat-fallbacks', () => {
    const sceneAssets = { characters: { 白墨: { 默认: 'igs-gen:lost' } } };
    const ctx = { sceneAssets, isMissingImage: url => url === 'igs-gen:lost' };
    assert.equal(resolveSpriteAsset('白墨', '惊艳', { ...ctx, generatedAssets: { characters: { 白墨: { 默认: 'igs-gen:library' } } } }).url, 'igs-gen:library');
    assert.equal(resolveSpriteAsset('白墨', '惊艳', { ...ctx, tempSprite: name => name === '白墨' ? 'igs-gen:chat' : '' }).url, 'igs-gen:chat');
});

test('gate:sprite:original-stays-first-and-fallback-never-borrows-another-character', () => {
    const sceneAssets = { characters: { 白墨: { 平和: 'igs-gen:original' } } };
    assert.equal(resolveSpriteAsset('白墨', '惊艳', { sceneAssets, generatedAssets: { characters: { 白墨: { 惊艳: 'igs-gen:library' } } } }).url, 'igs-gen:original');
    const miss = resolveSpriteAsset('白墨', '惊艳', { sceneAssets: { characters: { 白墨: {} } }, generatedAssets: { characters: { 他人: { 默认: 'igs-gen:other' } } } });
    assert.equal(miss.url, ''); assert.equal(miss.needsGeneration, false);
});

test('gate:sprite:temporary-unavailability-selects-a-fallback-without-requesting-regeneration', () => {
    const ctx = { sceneAssets: { characters: { 白墨: { 惊艳: 'igs-gen:blocked', 平和: 'igs-gen:calm' } } }, isUnavailableImage: url => url === 'igs-gen:blocked' };
    const hit = resolveSpriteAsset('白墨', '惊艳', ctx);
    assert.equal(hit.url, 'igs-gen:calm'); assert.equal(hit.needsGeneration, false);
    const miss = resolveSpriteAsset('白墨', '惊艳', { ...ctx, sceneAssets: { characters: { 白墨: { 惊艳: 'igs-gen:blocked' } } } });
    assert.equal(miss.needsGeneration, false); assert.equal(miss.reason, 'original-unavailable');
});

test('gate:sprite:temporary-read-failure-is-not-missing-and-retries-on-a-later-read', async t => {
    const f = fixture(t); f.setError(new Error('network-offline'));
    f.service.resolveUrl('igs-gen:white'); await settleMedia();
    assert.equal(f.service.isMissingImage('igs-gen:white'), false);
    assert.equal(f.service.isUnavailableImage('igs-gen:white'), true);
    for (let i = 0; i < 10; i++) f.service.resolveUrl('igs-gen:white');
    await settleMedia(); assert.equal(f.reads(), 1, '冷却期间及静置不反复请求');
    f.setError(null); f.advance(1501);
    f.service.resolveUrl('igs-gen:white'); await settleMedia();
    assert.equal(f.service.resolveUrl('igs-gen:white'), pixel('white'));
    assert.equal(f.service.hasUnavailableImages(), false);
});

test('gate:sprite:an-empty-read-cannot-permanently-blacklist-a-restored-original', async t => {
    const f = fixture(t); f.setImage(null);
    f.service.resolveUrl('igs-gen:white'); await settleMedia();
    assert.equal(f.service.isMissingImage('igs-gen:white'), true);
    f.setImage(pixel('white')); f.advance(30001);
    f.service.resolveUrl('igs-gen:white'); await settleMedia();
    assert.equal(f.service.resolveUrl('igs-gen:white'), pixel('white'));
    assert.equal(f.service.isMissingImage('igs-gen:white'), false);
});

test('gate:sprite:a-successful-full-read-for-a-thumbnail-clears-the-failure', async t => {
    const f = fixture(t, { thumbs: true }); f.setImage(null);
    f.service.resolveUrl('igs-gen:white'); await settleMedia();
    f.setImage(pixel('white')); f.service.resolveThumbUrl('igs-gen:white'); await settleMedia();
    assert.equal(f.service.isMissingImage('igs-gen:white'), false);
    f.service.resolveUrl('igs-gen:white'); await settleMedia();
    assert.equal(f.service.resolveUrl('igs-gen:white'), pixel('white'));
});

test('gate:sprite:network-online-retries-once-and-stop-removes-the-listener', async t => {
    const f = fixture(t); f.service.start(); f.setError(new Error('network-offline'));
    f.service.resolveUrl('igs-gen:white'); await settleMedia();
    f.setError(null); f.signals.dispatchEvent(new Event('online'));
    assert.equal(f.service.hasUnavailableImages(), false);
    assert.equal(f.notifications.filter(row => row.reason === 'image-retry-ready').length, 1);
    f.service.resolveUrl('igs-gen:white'); await settleMedia();
    assert.equal(f.service.resolveUrl('igs-gen:white'), pixel('white'));
    f.service.stop(); const before = f.notifications.length;
    f.signals.dispatchEvent(new Event('online')); assert.equal(f.notifications.length, before);
});

test('gate:sprite:changed-image-token-clears-the-old-failure-immediately', async t => {
    const f = fixture(t); f.setImage(null);
    f.service.resolveUrl('igs-gen:white'); await settleMedia();
    f.setImage(pixel('white')); f.cache.forget('asset:white');
    assert.equal(f.service.isMissingImage('igs-gen:white'), false);
    f.service.resolveUrl('igs-gen:white'); await settleMedia();
    assert.equal(f.service.resolveUrl('igs-gen:white'), pixel('white'));
});
