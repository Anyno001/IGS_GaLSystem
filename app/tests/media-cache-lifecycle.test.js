import { createMessageImageCache } from './helpers/media-fixtures.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalImageCache } from '../src/media/tavern-image-cache.js';
import { createFakeIndexedDB } from './helpers/fake-idb.js';
import { pixel } from './helpers/fake-media-server.js';

import { createImageResourceCache } from '../src/media/resource-cache.js';

test('gate:media:identical-bytes-share-one-resident-payload-and-object-url', async () => {
    const revoked = [], created = [];
    const cache = createLocalImageCache({ Blob, atob, btoa, URL: { createObjectURL(blob) { created.push(blob); return `blob:${created.length}`; }, revokeObjectURL(url) { revoked.push(url); } } });
    cache.remember('asset:a', pixel('same')); cache.remember('cg:chat|1|0|1', pixel('same'));
    cache.remember('reader:1', cache.peek('asset:a'));
    assert.equal((await cache.stats()).memoryCount, 1);
    assert.equal(created.length, 1);
    assert.equal(cache.peek('asset:a'), cache.peek('cg:chat|1|0|1'));
    cache.forget('asset:a'); assert.deepEqual(revoked, []);
    await cache.clear(); assert.deepEqual(revoked, ['blob:1']);
});

test('gate:media:memory-and-disk-obey-byte-budgets-even-for-one-oversized-image', async () => {
    const cache = createLocalImageCache({}, { maxBytes: 4, memoryBytes: 8 });
    await cache.put('oversized', pixel('large-image'));
    assert.equal((await cache.stats()).memoryCount, 0);
    assert.equal((await cache.stats()).diskCount, 0);
    assert.equal(await cache.get('oversized'), '');
});

test('gate:media:cache-clear-cancels-old-flights-and-prevents-disk-refill', async () => {
    const cache = createLocalImageCache({});
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    let calls = 0;
    const first = cache.load('image', () => { calls += 1; return gate; });
    const second = cache.load('image', () => { calls += 1; return gate; });
    await new Promise(resolve => setTimeout(resolve, 0));
    await cache.clear(); release(pixel('old'));
    assert.deepEqual(await Promise.all([first, second]), ['', '']);
    assert.equal(calls, 1); assert.equal(await cache.get('image'), '');
    assert.equal(await cache.load('image', async () => pixel('new')), pixel('new'));
});

test('gate:media:payload-and-accounting-commit-in-one-idb-transaction', async () => {
    const indexedDB = createFakeIndexedDB(), host = { indexedDB };
    const cache = createLocalImageCache(host);
    indexedDB.controls.failNextWrite = { store: 'meta' };
    await assert.rejects(cache.put('failed', pixel('a')), /quota/);
    assert.equal(await createLocalImageCache(host).get('failed'), '');
    const rows = indexedDB.databases.get('igs-image-cache').stores;
    assert.equal(rows.get('files').rows.size, 0); assert.equal(rows.get('meta').rows.size, 0);
});

test('gate:media:disk-hydration-does-not-bypass-memory-count-limit', async () => {
    const indexedDB = createFakeIndexedDB();
    const writer = createLocalImageCache({ indexedDB }, { maxCount: 6 });
    for (let i = 0; i < 6; i += 1) await writer.put(`image:${i}`, pixel(i));
    const reader = createLocalImageCache({ indexedDB }, { maxCount: 2 });
    for (let i = 0; i < 6; i += 1) await reader.get(`image:${i}`);
    assert.ok((await reader.stats()).memoryCount <= 2);
    assert.ok((await reader.stats()).diskCount <= 2);
});

test('gate:media:message-associations-are-bounded-and-isolated-by-chat-swipe-and-revision', () => {
    const cache = createMessageImageCache(new Map(), { limit: 2 });
    cache.remember(1, [{ url: '/a.png' }], { scope: { chatId: 'A', swipeId: 0, revision: 'a' } });
    assert.equal(cache.get(1, { chatId: 'B', swipeId: 0, revision: 'a' }), null);
    assert.equal(cache.get(1, { chatId: 'A', swipeId: 1, revision: 'a' }), null);
    assert.equal(cache.get(1, { chatId: 'A', swipeId: 0, revision: 'b' }), null);
    cache.remember(2, [{ url: '/b.png' }]); cache.remember(3, [{ url: '/c.png' }]);
    assert.equal(cache.get(1, { chatId: 'A', swipeId: 0, revision: 'a' }), null);
    cache.destroy();
});

test('gate:media:remote-display-uses-browser-http-cache-without-an-extra-blob-copy', async () => {
    let images = 0, fetches = 0;
    const host = { fetch: async () => { fetches += 1; }, Image: class { set src(value) { images += 1; queueMicrotask(() => this.onload?.()); } } };
    const first = createImageResourceCache(host), second = createImageResourceCache(host);
    const results = await Promise.all([first.load('https://example.test/a.png'), second.load('https://example.test/a.png')]);
    assert.deepEqual(results, ['https://example.test/a.png', 'https://example.test/a.png']);
    assert.equal(images, 1); assert.equal(fetches, 0);
    first.clear();
});
