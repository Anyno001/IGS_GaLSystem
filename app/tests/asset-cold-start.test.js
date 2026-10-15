import test from 'node:test';
import assert from 'node:assert/strict';
import { createAssetGenerationService } from '../src/generated-images/illustration/asset-generation-service.js';
import { createMemoryGeneratedAssetStore, createIndexedDbGeneratedAssetStore } from '../src/media/generated-asset-store.js';
import { withTavernGeneratedAssetFiles } from '../src/media/tavern-generated-assets.js';
import { localImageCacheFor } from '../src/media/tavern-image-cache.js';
import { stopMediaJournals } from '../src/media/media-record-journal.js';
import { mediaFileGcFor } from '../src/media/media-file-gc.js';
import { createMemoryAssetThumbStore } from '../src/media/asset-thumb-store.js';
import { fakeMediaServer, pixel, settleMedia } from './helpers/fake-media-server.js';

async function fixture(t, { reuseLocal = false, thumbs = false } = {}) {
    const server = fakeMediaServer(), writer = server.host();
    const saved = withTavernGeneratedAssetFiles(createMemoryGeneratedAssetStore(), writer);
    await saved.putImage({ id: 'hero', type: 'sprite', dataUrl: pixel('hero') });
    await saved.putImage({ id: 'room', type: 'background', dataUrl: pixel('room') });
    await saved.flush(); await stopMediaJournals(writer); await mediaFileGcFor(writer).stop();
    const host = server.host(reuseLocal ? writer.indexedDB : undefined), cache = localImageCacheFor(host);
    const store = withTavernGeneratedAssetFiles(createIndexedDbGeneratedAssetStore(host), host);
    const notifications = [];
    const service = createAssetGenerationService({
        store, mediaCache: cache,
        messageHost: { getChatId: () => 'chat', on: () => () => {} },
        getSettings: () => ({ sceneAssets: { enabled: true } }),
        events: { emit: (_name, detail) => notifications.push(detail) },
        ...(thumbs ? { thumbStore: createMemoryAssetThumbStore({ mediaCache: cache }), makeThumb: async () => pixel('thumb') } : {}),
    });
    t.after(async () => { service.stop(); await stopMediaJournals(host); await mediaFileGcFor(host).stop(); await cache.destroy(); });
    return { server, host, cache, store, service, notifications };
}

test('gate:assets:cold-first-read-restores-backup-before-starting-the-image-cache-task', async t => {
    const f = await fixture(t);
    assert.equal(f.service.resolveUrl('igs-gen:hero'), '');
    await settleMedia(); await settleMedia();
    assert.ok(f.notifications.some(row => row.imageId === 'hero' && row.reason === 'image-loaded'), '首楼必须收到图片完成通知，不依赖设置器触发第二次读取');
    assert.ok(f.cache.peek('asset:hero'), '备份恢复不能取消首楼的缓存任务');
    assert.equal(f.notifications.some(row => row.reason === 'image-lost'), false);
});

test('gate:assets:concurrent-first-background-and-sprite-load-without-opening-settings', async t => {
    const f = await fixture(t), uploads = f.server.uploads.length;
    let metadataReads = 0;
    const fetch = f.host.fetch;
    f.host.fetch = (url, options) => { if (String(url).startsWith('/user/files/igs-asset-records.json')) metadataReads += 1; return fetch(url, options); };
    f.service.resolveUrl('igs-gen:hero'); f.service.resolveUrl('igs-gen:room');
    await settleMedia(); await settleMedia();
    assert.deepEqual(new Set(f.notifications.filter(row => row.reason === 'image-loaded').map(row => row.imageId)), new Set(['hero', 'room']));
    assert.ok(f.cache.peek('asset:hero')); assert.ok(f.cache.peek('asset:room'));
    assert.equal(f.server.uploads.length, uploads, '显示已有素材不重写备份');
    assert.equal(metadataReads, 1, '并发素材共享一次记录恢复');
});

test('gate:assets:first-thumbnail-load-also-waits-for-record-recovery', async t => {
    const f = await fixture(t, { thumbs: true });
    assert.equal(f.service.resolveThumbUrl('igs-gen:hero'), '');
    await settleMedia(); await settleMedia();
    assert.ok(f.notifications.some(row => row.imageId === 'hero' && row.reason === 'image-loaded'));
    assert.ok(f.cache.peek('thumb:asset:hero'));
});

test('gate:assets:real-file-adapter-keeps-a-503-temporary-and-recovers-after-a-full-thumb-read', async t => {
    const f = await fixture(t, { thumbs: true }), fetch = f.host.fetch;
    let offline = true, reads = 0;
    f.host.fetch = (url, options) => {
        if (String(url).startsWith('/user/images/')) { reads++; if (offline) return Promise.resolve({ ok: false, status: 503 }); }
        return fetch(url, options);
    };
    f.service.resolveUrl('igs-gen:hero'); await settleMedia(); await settleMedia();
    assert.equal(f.service.isMissingImage('igs-gen:hero'), false, 'HTTP 503 不是文件不存在');
    assert.equal(f.service.isUnavailableImage('igs-gen:hero'), true);
    f.service.resolveUrl('igs-gen:hero'); await settleMedia(); assert.equal(reads, 1);
    offline = false; f.service.resolveThumbUrl('igs-gen:hero'); await settleMedia(); await settleMedia();
    assert.equal(f.service.isUnavailableImage('igs-gen:hero'), false);
    f.service.resolveUrl('igs-gen:hero'); await settleMedia(); await settleMedia();
    assert.ok(f.cache.peek('asset:hero'));
});

test('gate:assets:backup-network-error-still-allows-existing-local-image-records', async t => {
    const f = await fixture(t, { reuseLocal: true });
    f.server.failRead = true;
    f.service.resolveUrl('igs-gen:hero');
    await settleMedia(); await settleMedia();
    assert.ok(f.notifications.some(row => row.imageId === 'hero' && row.reason === 'image-loaded'));
    assert.ok(f.cache.peek('asset:hero'));
    assert.equal(f.service.isMissingImage('igs-gen:hero'), false);
});

test('gate:assets:clear-during-record-recovery-prevents-old-pixel-load-and-can-be-retried', async t => {
    const f = await fixture(t), fetch = f.host.fetch;
    let release, arrived;
    f.server.gateRead = new Promise(resolve => { release = resolve; });
    const started = new Promise(resolve => { arrived = resolve; });
    f.host.fetch = (url, options) => { if (String(url).startsWith('/user/files/igs-asset-records.json')) arrived(); return fetch(url, options); };
    f.service.resolveUrl('igs-gen:hero'); await started;
    await f.cache.clear({ memoryOnly: true }); release();
    await settleMedia(); await settleMedia();
    assert.equal(f.server.downloads.length, 0);
    assert.equal(f.notifications.some(row => row.reason === 'image-loaded' || row.reason === 'image-lost'), false);
    f.service.resolveUrl('igs-gen:hero'); await settleMedia(); await settleMedia();
    assert.ok(f.cache.peek('asset:hero'));
});

test('gate:assets:stop-during-record-recovery-never-loads-or-announces-old-pixels', async t => {
    const f = await fixture(t), fetch = f.host.fetch;
    let release, arrived;
    f.server.gateRead = new Promise(resolve => { release = resolve; });
    const started = new Promise(resolve => { arrived = resolve; });
    f.host.fetch = (url, options) => { if (String(url).startsWith('/user/files/igs-asset-records.json')) arrived(); return fetch(url, options); };
    f.service.resolveUrl('igs-gen:hero'); await started;
    f.service.stop(); release(); await settleMedia(); await settleMedia();
    assert.equal(f.server.downloads.length, 0);
    assert.equal(f.notifications.some(row => row.reason === 'image-loaded' || row.reason === 'image-lost'), false);
    assert.equal(f.cache.peek('asset:hero'), '');
});

test('gate:assets:indexed-metadata-cursor-is-scoped-ordered-and-paginated', async t => {
    const f = await fixture(t);
    for (const [key, chatId] of [['b', 'chat'], ['x', 'other'], ['a', 'chat']]) {
        await f.store.putAsset({ key, chatId, type: 'sprite', name: key, status: 'chat', imageId: 'hero' });
    }
    const first = await f.store.queryAssets({ chatId: 'chat', types: ['sprite'], statuses: ['chat'], limit: 1, includeTotal: true });
    assert.deepEqual(first.records.map(row => row.key), ['a']);
    assert.equal(first.total, 2); assert.equal(first.hasNext, true);
    const next = await f.store.queryAssets({ chatId: 'chat', afterKey: 'a', limit: 1 });
    assert.deepEqual(next.records.map(row => row.key), ['b']);
    const previous = await f.store.queryAssets({ chatId: 'chat', beforeKey: 'b', limit: 1 });
    assert.deepEqual(previous.records.map(row => row.key), ['a']);
});
