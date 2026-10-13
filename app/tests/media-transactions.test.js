import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createMemoryGeneratedAssetStore } from '../src/media/generated-asset-store.js';
import { createMemoryIllustrationStore } from '../src/media/illustration-store.js';
import { createMemoryPhotoAlbumStore } from '../src/media/photo-album.js';
import { createTavernImageFiles } from '../src/media/tavern-image-files.js';
import { withTavernGeneratedAssetFiles } from '../src/media/tavern-generated-assets.js';
import { withTavernIllustrationFiles } from '../src/media/tavern-illustrations.js';
import { withTavernPhotoFiles } from '../src/media/tavern-photos.js';
import { createMediaRecordJournal, flushMediaJournals, stopMediaJournals } from '../src/media/media-record-journal.js';
import { mediaFileGcFor } from '../src/media/media-file-gc.js';
import { mapImageRepositoryFor } from '../src/media/tavern-map-images.js';
import { prepareImageImport } from '../src/media/image-import-transaction.js';
import { legacyImageHash } from '../src/media/legacy-image-recovery.js';
import { imageSha256 } from '../src/media/image-sha256.js';
import { fakeMediaServer, pixel, settleMedia } from './helpers/fake-media-server.js';

test('gate:media:http-fallback-content-hash-equals-webcrypto-across-padding-and-multiple-blocks', async () => {
    for (const value of ['', 'abc', 'a'.repeat(55), 'b'.repeat(56), 'c'.repeat(64), 'd'.repeat(70000)]) {
        const bytes = new TextEncoder().encode(value);
        const expected = Buffer.from(await webcrypto.subtle.digest('SHA-256', bytes)).toString('hex');
        assert.equal(await imageSha256(bytes), expected);
    }
});

test('gate:media:offload-failure-releases-all-write-leases-and-queues-partial-upload', async () => {
    const server = fakeMediaServer(), host = server.host();
    let hashes = 0;
    host.crypto = { subtle: { async digest(...args) { if (++hashes === 2) throw new Error('hash-failed'); return webcrypto.subtle.digest(...args); } } };
    const files = createTavernImageFiles(host, 'igs-assets');
    await assert.rejects(files.offload({ dataUrl: pixel('one'), originalDataUrl: pixel('two') }, 'i', null), /hash-failed/);
    assert.equal((await mediaFileGcFor(host).diagnostics()).activeWrites, 0);
    assert.equal((await mediaFileGcFor(host).diagnostics()).pendingDeletes, 1);
    await mediaFileGcFor(host).drain(); assert.equal(server.images.size, 0);
});

test('gate:media:wal-prepare-failure-never-runs-the-business-write', async () => {
    const server = fakeMediaServer(), host = server.host();
    host.navigator = { locks: { request: (_name, callback) => callback() } };
    let writes = 0;
    const journal = createMediaRecordJournal(host, { fileName: 'igs-asset-records.json', list: async () => [], put: async () => {}, remove: async () => {} });
    await journal.restore(); host.indexedDB.controls.failNextWrite = { store: 'state' };
    await assert.rejects(journal.write('i', { dataUrl: 'user/images/igs-media/x.png' }, () => { writes += 1; }), /quota/);
    assert.equal(writes, 0); assert.equal((await journal.diagnostics()).records, 0);
});

test('gate:media:revision-race-keeps-current-image-and-compensates-the-losing-upload', async () => {
    const server = fakeMediaServer(), host = server.host(), raw = createMemoryGeneratedAssetStore();
    const store = withTavernGeneratedAssetFiles(raw, host);
    await store.putImage({ id: 'i', revision: 1, dataUrl: pixel('old'), originalDataUrl: pixel('original') });
    const old = await raw.getImage('i'), fetch = host.fetch;
    let release, arrived;
    const gate = new Promise(resolve => { release = resolve; });
    const started = new Promise(resolve => { arrived = resolve; });
    host.fetch = async (url, options) => {
        if (url === '/api/images/upload' && JSON.parse(options.body).image === pixel('loser').split(',')[1]) { arrived(); await gate; }
        return fetch(url, options);
    };
    const losing = store.updateImage('i', 1, { dataUrl: pixel('loser') });
    await started;
    assert.equal((await store.updateImage('i', 1, { dataUrl: old.dataUrl })).ok, true);
    release(); assert.equal((await losing).reason, 'stale-revision');
    const kept = await raw.getImage('i'); assert.equal(kept.revision, 2); assert.equal(kept.dataUrl, old.dataUrl);
    await mediaFileGcFor(host).drain();
    assert.equal(server.images.size, 2); assert.ok(server.images.has(old.dataUrl)); assert.ok(server.images.has(old.originalDataUrl));
    assert.equal(server.deletions.length, 1);
});

test('gate:media:offline-pixels-retry-before-backup-without-overwriting-new-prompt', async () => {
    const server = fakeMediaServer(), host = server.host(), raw = createMemoryGeneratedAssetStore();
    const store = withTavernGeneratedAssetFiles(raw, host);
    server.failUpload = true;
    await store.putImage({ id: 'i', dataUrl: pixel('offline'), prompt: { positive: 'old' } });
    await store.patchImageMetadata('i', { prompt: { positive: 'edited-offline' } });
    assert.equal((await store.diagnostics()).pendingPixelUploads, 1);
    assert.equal((await store.flush()).ok, false);
    server.failUpload = false; assert.equal((await store.flush()).ok, true);
    assert.match((await raw.getImage('i')).dataUrl, /^user\/images\/igs-media\//);
    assert.equal((await store.diagnostics()).dirty, 0);
    const fresh = withTavernGeneratedAssetFiles(createMemoryGeneratedAssetStore(), server.host());
    assert.equal((await fresh.getImage('i')).prompt.positive, 'edited-offline');
    assert.equal((await fresh.getImage('i')).dataUrl, pixel('offline'));
});

test('gate:media:cg-photo-and-map-offline-records-resume-upload-and-restore-on-a-new-device', async () => {
    const server = fakeMediaServer(), host = server.host(); server.failUpload = true;
    const cg = withTavernIllustrationFiles(createMemoryIllustrationStore(), host);
    const photos = withTavernPhotoFiles(createMemoryPhotoAlbumStore(), host), maps = mapImageRepositoryFor(host);
    await cg.putSlot('chat|1|0', { slot: 16, status: 'done', dataUrl: pixel('cg') });
    await photos.put({ id: 'p', dataUrl: pixel('photo'), caption: '纪念', favorite: true });
    await maps.set('igs-map-custom:chat:table:level', pixel('map'));
    server.failUpload = false; assert.equal((await flushMediaJournals(host)).ok, true);
    const freshHost = server.host(), restoredCg = withTavernIllustrationFiles(createMemoryIllustrationStore(), freshHost);
    const restoredPhotos = withTavernPhotoFiles(createMemoryPhotoAlbumStore(), freshHost), restoredMaps = mapImageRepositoryFor(freshHost);
    await restoredMaps.restore();
    assert.equal((await restoredCg.getSlots('chat|1|0'))[0].dataUrl, pixel('cg'));
    assert.equal((await restoredPhotos.get('p')).favorite, true);
    assert.match(freshHost.localStorage.getItem('igs-map-custom:chat:table:level'), /^user\/images\/igs-media\//);
});

test('gate:media:map-clear-wins-over-an-earlier-delayed-upload-and-recycles-both-files', async () => {
    const server = fakeMediaServer(), host = server.host(), maps = mapImageRepositoryFor(host), key = 'igs-map-custom:chat:t:l';
    await maps.set(key, pixel('old'));
    const fetch = host.fetch;
    let release, arrived;
    const gate = new Promise(resolve => { release = resolve; }), started = new Promise(resolve => { arrived = resolve; });
    host.fetch = async (url, options) => {
        if (url === '/api/images/upload' && JSON.parse(options.body).image === pixel('late').split(',')[1]) { arrived(); await gate; }
        return fetch(url, options);
    };
    const pending = maps.set(key, pixel('late')); await started;
    await maps.remove(key); release(); assert.equal((await pending).ok, false);
    assert.equal(host.localStorage.getItem(key), null); await mediaFileGcFor(host).drain(); assert.equal(server.images.size, 0);
    const freshHost = server.host(); await mapImageRepositoryFor(freshHost).restore(); assert.equal(freshHost.localStorage.getItem(key), null);
});

test('gate:media:legacy-slot-sixteen-recovery-coalesces-all-directory-listings', async () => {
    const server = fakeMediaServer(), host = server.host(), fetch = host.fetch;
    server.images.set('user/images/igs-cg/chat_1_0_16@@dataUrl@abc.png', pixel('sixteen'));
    let lists = 0;
    host.fetch = (url, options) => { if (url === '/api/images/list') lists += 1; return fetch(url, options); };
    const cg = withTavernIllustrationFiles(createMemoryIllustrationStore(), host);
    const records = await cg.getSlots('chat|1|0'); assert.equal(records[0].slot, 16); assert.equal(records[0].dataUrl, pixel('sixteen'));
    assert.equal(lists, 1);
});

test('gate:media:legacy-unicode-content-hash-recovers-original-result-and-mask', async () => {
    const server = fakeMediaServer(), host = server.host(), id = '角色'.repeat(90);
    for (const value of ['original', 'transparent', 'mask']) {
        const data = pixel(value); server.images.set(`user/images/igs-assets/${legacyImageHash(`${id}\n${data}`)}.png`, data);
    }
    const store = withTavernGeneratedAssetFiles(createMemoryGeneratedAssetStore(), host);
    const image = await store.getImage(id, { fields: '*' });
    assert.equal(image.originalDataUrl, pixel('original')); assert.equal(image.dataUrl, pixel('transparent')); assert.equal(image.alphaMaskDataUrl, pixel('mask'));
    assert.equal(server.downloads.length, 3); assert.equal((await store.flush()).ok, true);
});

test('gate:media:import-second-write-failure-rolls-back-new-ids-including-a-partially-written-record', async () => {
    const images = new Map([['shared', { id: 'shared', dataUrl: pixel('keep') }]]), removed = [];
    let writes = 0, ids = 0;
    const service = {
        async writeStoredImage(record) { images.set(record.id, record); if (++writes === 2) throw new Error('disk-full'); return { ok: true }; },
        async deleteImages(values) { for (const id of values) { images.delete(id); removed.push(id); } return { ok: true }; },
    };
    const result = await prepareImageImport([{ id: 'shared', dataUrl: pixel('a') }, { id: 'b', dataUrl: pixel('b') }], { scene: 'igs-gen:shared' }, service, { newId: () => `new-${++ids}` });
    assert.equal(result.ok, false); assert.equal(result.rollbackFailed, false); assert.deepEqual(removed, ['new-1', 'new-2']);
    assert.deepEqual([...images.keys()], ['shared']); assert.equal(images.get('shared').dataUrl, pixel('keep'));
});

test('gate:media:import-inline-avatars-and-shared-links-use-new-ids-and-rollback-together', async () => {
    const images = new Map([['shared', pixel('keep')]]);
    let ids = 0;
    const service = { async writeStoredImage(record) { images.set(record.id, record.dataUrl); return { ok: true }; }, async deleteImages(values) { for (const id of values) images.delete(id); return { ok: true }; } };
    const prepared = await prepareImageImport([{ id: 'shared', dataUrl: pixel('new') }], { a: 'igs-gen:shared', b: ['igs-gen:shared'], statusAvatars: { 人: pixel('avatar') } }, service, { newId: () => `new-${++ids}` });
    assert.equal(prepared.ok, true); assert.equal(prepared.value.a, prepared.value.b[0]); assert.equal(prepared.value.a, 'igs-gen:new-1');
    assert.equal(prepared.value.statusAvatars.人, 'igs-gen:new-2'); assert.equal(images.get('shared'), pixel('keep'));
    await prepared.rollback(); assert.deepEqual([...images.keys()], ['shared']);
});

test('gate:media:stopped-journal-does-not-commit-a-delayed-upload', async () => {
    const server = fakeMediaServer(), host = server.host(), raw = createMemoryGeneratedAssetStore(), fetch = host.fetch;
    const store = withTavernGeneratedAssetFiles(raw, host);
    let release, arrived;
    const gate = new Promise(resolve => { release = resolve; }), started = new Promise(resolve => { arrived = resolve; });
    host.fetch = async (url, options) => { if (url === '/api/images/upload') { arrived(); await gate; } return fetch(url, options); };
    const pending = store.putImage({ id: 'late', dataUrl: pixel('late') }); await started;
    stopMediaJournals(host); release(); await assert.rejects(pending, /media-stopped/);
    assert.equal(await raw.getImage('late'), null); await settleMedia();
    assert.equal((await mediaFileGcFor(host).diagnostics()).activeWrites, 0);
});

test('gate:media:stopped-gc-does-not-delete-after-a-delayed-reference-check', async () => {
    const server = fakeMediaServer(), host = server.host(), gc = mediaFileGcFor(host);
    const path = 'user/images/igs-media/unused.png';
    server.images.set(path, pixel('keep-until-resumed'));
    await gc.released({ dataUrl: path }, null);
    let release, started;
    server.gateRead = new Promise(resolve => { release = resolve; });
    const checking = new Promise(resolve => { started = resolve; }), fetch = host.fetch;
    host.fetch = (url, options) => { if (String(url).startsWith('/user/files/')) started(); return fetch(url, options); };
    const draining = gc.drain();
    await checking; gc.stop(); release();
    await assert.rejects(draining, /media-stopped/);
    assert.deepEqual(server.deletions, []); assert.ok(server.images.has(path));
    assert.equal((await gc.diagnostics()).pendingDeletes, 1);
    gc.start(); await gc.drain(); gc.stop();
    assert.deepEqual(server.deletions, [path]);
});

test('gate:media:deleted-record-backup-reconstructs-gc-after-browser-data-loss', async () => {
    const server = fakeMediaServer(), host = server.host();
    const cg = withTavernIllustrationFiles(createMemoryIllustrationStore(), host);
    await cg.putSlot('chat|1|0', { slot: 1, status: 'done', dataUrl: pixel('old') });
    await cg.deleteSlot('chat|1|0', 1); await cg.flush();
    assert.equal(server.images.size, 1);
    const freshHost = server.host(), fresh = withTavernIllustrationFiles(createMemoryIllustrationStore(), freshHost);
    assert.deepEqual(await fresh.getSlots('chat|1|0'), []);
    assert.equal((await mediaFileGcFor(freshHost).diagnostics()).pendingDeletes, 1);
    await mediaFileGcFor(freshHost).drain(); assert.equal(server.images.size, 0);
});

test('gate:media:one-corrupt-legacy-payload-does-not-block-backup-of-healthy-images', async () => {
    const server = fakeMediaServer(), host = server.host(), raw = createMemoryGeneratedAssetStore();
    await raw.putImage({ id: 'bad', dataUrl: 'data:image/png;base64,!!!!' });
    await raw.putImage({ id: 'good', dataUrl: pixel('good') });
    const store = withTavernGeneratedAssetFiles(raw, host);
    assert.equal((await store.flush()).ok, false);
    assert.ok(server.files.get('igs-asset-records.json').records['image:good']);
    assert.equal((await store.diagnostics()).migrationFailures[0].key, 'bad');
    assert.equal((await raw.getImage('bad')).dataUrl, 'data:image/png;base64,!!!!');
});
