import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalImageCache } from '../src/media/tavern-image-cache.js';
import { mediaRequest } from '../src/media/tavern-media-http.js';
import { createFakeIndexedDB } from './helpers/fake-idb.js';
import { pixel, settleMedia } from './helpers/fake-media-server.js';

test('gate:media:same-content-disk-aliases-share-bytes-and-deleting-one-preserves-the-other', async () => {
    const indexedDB = createFakeIndexedDB(), host = { indexedDB, Blob, atob, btoa };
    const cache = createLocalImageCache(host);
    await cache.put('asset:a', pixel('same')); await cache.put('cg:b', pixel('same'));
    const stores = indexedDB.databases.get('igs-image-cache').stores;
    assert.equal(stores.get('files').rows.size, 1); assert.equal(stores.get('meta').rows.size, 2);
    assert.equal((await cache.stats()).diskBytes, 4);
    await cache.drop('asset:a');
    const reader = createLocalImageCache(host);
    assert.equal(await reader.get('asset:a'), ''); assert.equal(await reader.get('cg:b'), pixel('same'));
    assert.equal(stores.get('files').rows.size, 1);
});

test('gate:media:clear-during-file-reader-rejects-old-memory-hits-and-cancels-load-immediately', async () => {
    const readers = [];
    const host = { Blob, atob, btoa, FileReader: class {
        readAsDataURL() { readers.push(this); }
    } };
    const cache = createLocalImageCache(host);
    cache.remember('one', pixel('old'));
    const get = cache.get('one'), load = cache.load('one', () => assert.fail('memory-hit-must-not-download'));
    await cache.clear();
    assert.equal(await load, '');
    for (const reader of readers) { reader.result = pixel('old'); reader.onload?.(); }
    assert.equal(await get, ''); assert.equal(cache.peek('one'), '');
    assert.equal((await cache.stats()).diskCount, 0);
});

test('gate:media:peer-clear-reload-cannot-read-the-pre-clear-disk-cache', async () => {
    const peers = new Set();
    class Channel {
        constructor() { peers.add(this); }
        postMessage(data) { for (const peer of peers) if (peer !== this) queueMicrotask(() => peer.onmessage?.({ data })); }
        close() { peers.delete(this); }
    }
    const indexedDB = createFakeIndexedDB();
    const first = createLocalImageCache({ indexedDB, BroadcastChannel: Channel });
    const second = createLocalImageCache({ indexedDB, BroadcastChannel: Channel });
    await first.put('one', pixel('old')); await settleMedia();
    assert.equal(await second.get('one'), pixel('old'));
    let reloaded;
    second.onClear(() => { reloaded = second.get('one'); });
    await first.clear(); await settleMedia();
    assert.equal(await reloaded, ''); assert.equal(second.peek('one'), '');
    await first.destroy(); await second.destroy();
});

test('gate:media:one-item-setting-keeps-visible-cg-page-and-map-layers-until-release', async () => {
    const cache = createLocalImageCache({ Blob, atob, btoa, URL: { createObjectURL: () => `blob:${Math.random()}`, revokeObjectURL() {} } }, { maxCount: 1 });
    const releases = [];
    for (let i = 0; i < 26; i += 1) {
        const key = i < 24 ? `thumb:cg:${i}` : `map:${i}`;
        releases.push(cache.pin(key)); cache.remember(key, pixel(i));
    }
    assert.equal((await cache.stats()).activeCount, 26); assert.equal(cache.size(), 26);
    for (let i = 0; i < 24; i += 1) assert.ok(cache.peek(`thumb:cg:${i}`));
    assert.ok(cache.peek('map:24')); assert.ok(cache.peek('map:25'));
    for (const release of releases.slice(0, 24)) release();
    assert.equal(cache.size(), 2);
    releases[24](); releases[25](); assert.equal(cache.size(), 1);
    const bounded = createLocalImageCache({}, { maxCount: 1, memoryBytes: 8 });
    bounded.pin('huge'); bounded.remember('huge', pixel('too-big'));
    assert.equal(bounded.size(), 0);
});

test('gate:media:download-concurrency-is-four-and-clear-releases-queued-and-hung-jobs', async () => {
    const cache = createLocalImageCache({ AbortController });
    let running = 0, maximum = 0;
    const jobs = Array.from({ length: 12 }, (_, i) => cache.load(`image:${i}`, async signal => {
        running += 1; maximum = Math.max(maximum, running);
        signal.addEventListener('abort', () => { running -= 1; }, { once: true });
        return new Promise(() => {});
    }, { download: true }));
    await settleMedia(); assert.equal(maximum, 4);
    assert.deepEqual((await cache.stats()).downloads, { active: 4, queued: 8, limit: 4 });
    await cache.clear(); assert.deepEqual(await Promise.all(jobs), Array(12).fill(''));
    await settleMedia();
    assert.deepEqual((await cache.stats()).downloads, { active: 0, queued: 0, limit: 4 });
    assert.equal(await cache.load('fresh', () => pixel('new'), { download: true }), pixel('new'));
});

test('gate:media:response-body-timeout-does-not-hold-the-next-request', async () => {
    const keepAlive = setTimeout(() => {}, 1000);
    try {
        const response = await mediaRequest({ fetch: async () => ({ ok: true, json: () => new Promise(() => {}) }) }, '/fixture', {}, 10);
        await assert.rejects(response.json(), /media-request-timeout/);
        const next = await mediaRequest({ fetch: async () => ({ ok: true, json: async () => ({ ok: true }) }) }, '/fixture', {}, 10);
        assert.deepEqual(await next.json(), { ok: true });
    } finally { clearTimeout(keepAlive); }
});

test('gate:media:destroy-blocks-disk-rehydration-and-late-load-refill', async () => {
    const indexedDB = createFakeIndexedDB(), cache = createLocalImageCache({ indexedDB });
    await cache.put('saved', pixel('saved'));
    let finish;
    const job = cache.load('late', () => new Promise(resolve => { finish = resolve; }));
    await settleMedia(); await cache.destroy(); finish(pixel('late'));
    assert.equal(await job, ''); assert.equal(await cache.get('saved'), '');
    const fresh = createLocalImageCache({ indexedDB });
    assert.equal(await fresh.get('saved'), pixel('saved')); assert.equal(await fresh.get('late'), '');
});
