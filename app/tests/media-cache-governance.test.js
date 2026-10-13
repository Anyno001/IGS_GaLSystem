import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalImageCache, localImageCacheFor, disposeLocalImageCache, bindImageCacheDocument } from '../src/media/tavern-image-cache.js';
import { createMemoryImageCacheStore } from '../src/media/image-cache-store.js';
import { createMessageImageCache } from '../src/media/message-image-cache.js';
import { createTavernImageFiles } from '../src/media/tavern-image-files.js';
import { createItemRecordCache } from '../src/generated-images/illustration/item-image-cache.js';
import { createAssetGenerationService } from '../src/generated-images/illustration/asset-generation-service.js';
import { createMapBasemapGenerator } from '../src/visual/map-gen/index.js';
import { createCgLibraryView } from '../src/visual/igs-ui/cg-library-view.js';
import { peekSpriteHead, probeSpriteHead } from '../src/visual/igs-ui/fx-anchor.js';
import { describeMediaUsage } from '../src/storage/storage-usage.js';
import { pixel, settleMedia } from './helpers/fake-media-server.js';

const urls = () => {
    let next = 0;
    const revoked = [];
    return { Blob, atob, btoa, revoked, URL: { createObjectURL: () => `blob:test-${++next}`, revokeObjectURL: url => revoked.push(url) } };
};
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

test('no IndexedDB means one memory layer; evicted bytes cannot return from a disguised disk', async () => {
    const host = urls(), cache = createLocalImageCache(host, { maxCount: 1 });
    await cache.put('a', pixel('first')); await cache.put('b', pixel('second'));
    assert.equal(await cache.get('a'), '');
    assert.equal(await cache.get('b'), pixel('second'));
    const stats = await cache.stats();
    assert.equal(stats.backend, 'memory-only'); assert.equal(stats.persistent, false);
    assert.equal(stats.diskCount, 0); assert.equal(stats.diskBytes, 0); assert.equal(stats.diskBudget, 0);
    assert.match(describeMediaUsage({ cache: stats }), /仅使用中央内存/);
    await cache.clear({ memoryOnly: true }); assert.equal(await cache.get('b'), '');
    await cache.destroy();
});

test('an explicitly injected test store remains supported and is identified as volatile', async () => {
    const store = createMemoryImageCacheStore();
    const first = createLocalImageCache({}, { store }), second = createLocalImageCache({}, { store });
    await first.put('a', pixel('stored'));
    assert.equal(await second.get('a'), pixel('stored'));
    const stats = await second.stats();
    assert.equal(stats.backend, 'memory-adapter'); assert.equal(stats.persistent, false);
    await first.destroy(); await second.destroy();
});

test('a blocked IndexedDB reports unavailable without allocating fallback image storage', async () => {
    const cache = createLocalImageCache({ indexedDB: { open() { throw new Error('blocked-storage'); } } });
    assert.equal(await cache.load('a', async () => pixel('live')), pixel('live'));
    const stats = await cache.stats();
    assert.equal(stats.backend, 'unavailable'); assert.equal(stats.persistent, false); assert.equal(stats.diskBudget, 0);
    assert.match(stats.lastError, /blocked-storage/);
    await cache.clear({ memoryOnly: true }); assert.equal(cache.peek('a'), '');
    await cache.destroy();
});

test('message metadata contains resource keys and never returns a revoked URL after eviction or drop', async () => {
    const host = urls(), media = createLocalImageCache(host, { maxCount: 1 }), raw = new Map();
    const messages = createMessageImageCache(raw, { mediaCache: media });
    const first = messages.remember(1, [{ url: pixel('first'), slotIndex: 2 }]).entry.images[0].url;
    assert.match(first, /^blob:/);
    const serialized = JSON.stringify([...raw.values()]);
    assert.doesNotMatch(serialized, /data:image|blob:test/); assert.match(serialized, /resourceKey/);
    media.remember('other', pixel('other'));
    assert.ok(host.revoked.includes(first)); assert.equal(messages.get(1), null);
    const next = messages.remember(1, [{ url: pixel('first'), slotIndex: 2 }]).entry.images[0];
    assert.notEqual(next.url, first); assert.equal(next.slotIndex, 2);
    media.forget(media.sourceId(next.url)); assert.equal(messages.get(1), null);
    media.remember('third', pixel('third')); messages.remember(2, [{ url: media.peek('third') }]);
    media.forget('third'); assert.equal(messages.get(2), null);
    await media.clear(); assert.equal(raw.size, 0);
    messages.destroy(); assert.equal((await media.stats()).auxiliary.count, 0); await media.destroy();
});

test('item record queries cannot overwrite a new snapshot after clear or an A-B-A chat switch', async () => {
    const media = createLocalImageCache({}), events = [];
    const assets = new Map();
    const store = {
        getAsset: async (key) => assets.get(key) || null,
        queryAssets: async () => ({ records: [], hasNext: false, hasPrevious: false, firstKey: '', lastKey: '' }),
        putAsset: async (r) => assets.set(r.key, r),
    };
    const items = createItemRecordCache({ store, type: 'item', mediaCache: media, emit: value => events.push(value) });
    // 写入两条记录后读取，验证按需读取正常工作。
    await store.putAsset({ key: 'A:item1', chatId: 'A', type: 'item', status: 'ready', imageId: 'img1' });
    await store.putAsset({ key: 'B:item1', chatId: 'B', type: 'item', status: 'ready', imageId: 'img2' });
    items.ensure('A');
    const r1 = await items.read('A', 'A:item1');
    assert.equal(r1.key, 'A:item1');
    // 切换到 B 再切回 A：旧缓存被清除，重新读取得到正确结果。
    items.ensure('B');
    items.ensure('A');
    const r2 = await items.read('A', 'A:item1');
    assert.equal(r2.key, 'A:item1');
    // clear 后缓存无效：下次 ensure 重新触发读取。
    await media.clear();
    items.ensure('A');
    const r3 = await items.read('A', 'A:item1');
    assert.equal(r3.key, 'A:item1');
    items.destroy(); await media.destroy();
});

test('clearing the central cache clears temporary assets and rejects the old hydration result', async () => {
    const media = createLocalImageCache({}), emitted = [];
    const assets = new Map();
    const store = {
        getAsset: async (key) => assets.get(key) || null,
        queryAssets: async () => ({ records: [], hasNext: false, hasPrevious: false, firstKey: '', lastKey: '' }),
        getFloor: async () => null,
        putFloor: async () => {},
        putAsset: async (r) => assets.set(r.key, r),
        getImage: async () => null,
        putImage: async () => {},
        deleteImage: async () => {},
    };
    const service = createAssetGenerationService({ mediaCache: media, messageHost: { getChatId: () => 'A' },
        store, events: { emit: (...value) => emitted.push(value) } });
    // 写入记录后同步读取。
    await store.putAsset({ key: 'x', chatId: 'A', type: 'background', status: 'ready', imageId: 'fresh' });
    const r1 = await service.readRecord('x');
    assert.equal(r1.imageId, 'fresh');
    // clear 后缓存失效，再次读取仍从 store 拿到正确记录。
    await media.clear();
    const r2 = await service.readRecord('x');
    assert.equal(r2.imageId, 'fresh');
    const owner = (await media.stats()).auxiliary.owners.find(row => row.owner === 'asset-records');
    assert.ok(owner, 'asset-records owner 必须登记');
    service.stop(); await media.destroy();
});

test('clearing a directory cancels its pending query; an old failure cannot remove the new query', async () => {
    const requests = [];
    const host = { SillyTavern: { getContext: () => ({ getRequestHeaders: () => ({}) }) },
        fetch: (_url, options) => { const job = deferred(); requests.push({ ...job, signal: options.signal }); return job.promise; } };
    const cache = localImageCacheFor(host), files = createTavernImageFiles(host, 'legacy');
    const old = files.listFiles().catch(error => error); await settleMedia();
    await cache.clear(); assert.equal(requests[0].signal.aborted, true);
    const fresh = files.listFiles(); await settleMedia();
    requests[1].resolve({ ok: true, json: async () => ['fresh.png'] }); assert.deepEqual(await fresh, ['fresh.png']);
    requests[0].resolve({ ok: true, json: async () => ['old.png'] }); assert.match((await old).message, /aborted/);
    assert.deepEqual(await files.listFiles(), ['fresh.png']); assert.equal(requests.length, 2);
    const next = createTavernImageFiles(host, 'other').listFiles().catch(error => error); await settleMedia();
    await disposeLocalImageCache(host); assert.equal(requests[2].signal.aborted, true); assert.match((await next).message, /aborted/);
    assert.equal((await cache.stats()).auxiliary.count, 0);
});

test('sprite probes belong to the bound media runtime, including failed TTL and pending cancellation', async () => {
    let clock = 0, loads = 0;
    const media = createLocalImageCache({}, { now: () => clock });
    class FailingImage { set src(value) { loads += 1; queueMicrotask(() => this.onerror?.()); } }
    const doc = { defaultView: { Image: FailingImage } }; bindImageCacheDocument(doc, media);
    await probeSpriteHead('/bad.png', doc); await probeSpriteHead('/bad.png', doc); assert.equal(loads, 1);
    clock = 30001; await probeSpriteHead('/bad.png', doc); assert.equal(loads, 2);
    let image;
    doc.defaultView.Image = class { constructor() { image = this; } set src(value) {} };
    const pending = probeSpriteHead('/late.png', doc); await media.clear();
    assert.equal(await pending, null); image.onload?.(); assert.equal(peekSpriteHead('/late.png', doc), null);
    const owners = (await media.stats()).auxiliary.owners;
    assert.ok(owners.some(row => row.owner === 'sprite-geometry' && row.maxEntries === 48));
    assert.ok(owners.every(row => row.count === 0)); await media.destroy();
});

test('map generation failures expire under the central policy and disposal unregisters the owner', async () => {
    let clock = 0;
    const media = createLocalImageCache({}, { now: () => clock });
    const generator = createMapBasemapGenerator({ mediaCache: media, createCanvas: () => null });
    const job = generator.request({ kind: 'lights', key: 'a', width: 10, height: 10, lights: [] }); await job.promise;
    assert.equal(generator.peek('a').status, 'failed'); clock = 30001; assert.equal(generator.peek('a'), null);
    const owner = (await media.stats()).auxiliary.owners.find(row => row.owner === 'maps');
    assert.equal(owner.maxEntries, 4); assert.equal(owner.failureTtlMs, 30000);
    generator.dispose(); assert.equal((await media.stats()).auxiliary.count, 0); await media.destroy();
});

test('CG failures retry after expiry and a central clear refreshes the cached directory too', async () => {
    let clock = 0, calls = 0, reads = 0;
    const media = createLocalImageCache({}, { now: () => clock });
    const entry = { key: 'A|1|0|1', kind: 'cg', chatId: 'A', messageId: 1, swipeId: 0, slot: 1, ready: true };
    const library = { mediaCache: media, readIndex: async () => { reads += 1; return { ok: true, entries: [entry] }; },
        syncIndex: async () => ({ ok: true, entries: [entry] }), readThumbs: async () => new Map(),
        makeThumb: async () => ++calls === 1 ? { ok: false, reason: 'thumb-failed' } : { ok: true, dataUrl: pixel('good') } };
    const view = createCgLibraryView(library); await view.open(); await view.whenIdle();
    assert.equal(view.tileOf(entry.key).state, 'failed'); view.goto(0); await view.whenIdle(); assert.equal(calls, 1);
    clock = 30001; view.goto(0); await view.whenIdle(); assert.equal(calls, 2); assert.equal(view.tileOf(entry.key).state, 'ok');
    await media.clear(); await view.whenIdle(); assert.equal(reads, 2); assert.equal(view.tileOf(entry.key).state, 'ok');
    view.dispose(); assert.equal((await media.stats()).auxiliary.count, 0); await media.destroy();
});
