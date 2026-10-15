import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { createAssetGenerationService } from '../src/generated-images/illustration/asset-generation-service.js';
import { createLocalImageCache } from '../src/media/tavern-image-cache.js';
import { createMemoryAssetThumbStore } from '../src/media/asset-thumb-store.js';
import { fakeMediaServer, pixel, settleMedia } from './helpers/fake-media-server.js';

let createHost, directory;
before(async () => {
    const file = path.resolve(import.meta.dirname, '../src/visual/igs-ui/reader-host.js');
    let source = await fs.readFile(file, 'utf8');
    const cacheLine = 'const imageResourceCache = createImageResourceCache(options.global || globalThis, { limit: 96 });';
    const renderLine = 'function updateMountedReader(snapshot) {';
    assert.ok(source.includes(cacheLine) && source.includes(renderLine));
    source = source.replace(cacheLine, `${cacheLine} globalThis.__igsStaticReaderProbe = { resolveReaderAssetUrl, state, imageResourceCache };`)
        .replace(renderLine, `${renderLine} if (globalThis.__igsStaticReaderProbe?.onRender) { globalThis.__igsStaticReaderProbe.onRender(snapshot); return; }`);
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'igs-reader-resource-'));
    const outfile = path.join(directory, 'reader-host.mjs');
    await build({ stdin: { contents: source, resolveDir: path.dirname(file), sourcefile: file },
        bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
    createHost = (await import(pathToFileURL(outfile))).createIgsReaderHost;
});
after(async () => {
    delete globalThis.__igsStaticReaderProbe;
    if (directory) await fs.rm(directory, { recursive: true, force: true });
});

function reader(t, { load = async () => '', synchronous = false } = {}) {
    const host = createHost({ global: {}, getUnifiedSettings: () => ({ readerSettings: {}, bridge: {} }) });
    const probe = globalThis.__igsStaticReaderProbe;
    const resident = new Map();
    let reads = 0, renders = 0;
    const source = '/user/images/igs-fixture/background.png';
    const current = { assetLoadRequests: new Map(), snapshot: { content: { backgroundImage: source } } };
    probe.state.activeReader = current;
    probe.imageResourceCache.get = url => resident.get(url) || '';
    probe.imageResourceCache.load = url => {
        reads++;
        return synchronous ? load(url, resident) : Promise.resolve().then(() => load(url, resident));
    };
    probe.onRender = () => {
        renders++;
        if (renders < 200) probe.resolveReaderAssetUrl(source, current);
    };
    t.after(() => { probe.state.activeReader = null; host.destroy(); });
    return { source, current, resident, probe, resolve: () => probe.resolveReaderAssetUrl(source, current),
        reads: () => reads, renders: () => renders };
}

test('gate:reader:empty-read-does-not-start-a-static-render-feedback-loop', async t => {
    const f = reader(t);
    assert.equal(f.resolve(), '');
    await settleMedia();
    assert.equal(f.reads(), 1);
    assert.equal(f.renders(), 0);
    assert.equal(f.current.assetLoadRequests.size, 0);
    await settleMedia();
    assert.equal(f.reads(), 1);
});

test('gate:reader:real-resource-cache-missing-file-settles-and-later-recovers', async t => {
    const server = fakeMediaServer();
    const host = createHost({ global: server.host(), getUnifiedSettings: () => ({ readerSettings: {}, bridge: {} }) });
    const probe = globalThis.__igsStaticReaderProbe;
    const source = '/user/images/igs-fixture/background.png';
    const current = { assetLoadRequests: new Map(), snapshot: { content: { backgroundImage: source } } };
    probe.state.activeReader = current;
    let renders = 0;
    probe.onRender = () => { if (++renders < 200) probe.resolveReaderAssetUrl(source, current); };
    t.after(() => { probe.state.activeReader = null; host.destroy(); });
    probe.resolveReaderAssetUrl(source, current); await settleMedia();
    assert.equal(server.downloads.length, 1); assert.equal(renders, 0);
    await settleMedia(); assert.equal(server.downloads.length, 1);
    server.images.set(source.slice(1), pixel('restored'));
    probe.resolveReaderAssetUrl(source, current); await settleMedia();
    assert.equal(server.downloads.length, 2); assert.equal(renders, 1);
    assert.equal(probe.resolveReaderAssetUrl(source, current), pixel('restored'));
});

test('gate:reader:nonempty-load-result-without-residency-does-not-trigger-a-render', async t => {
    const f = reader(t, { load: async () => pixel('unretained') });
    f.resolve(); await settleMedia();
    assert.equal(f.reads(), 1); assert.equal(f.renders(), 0);
});

test('gate:reader:a-new-resident-image-refreshes-once-and-then-settles', async t => {
    const f = reader(t, { load: async (url, resident) => { resident.set(url, 'blob:ready'); return pixel('ready'); } });
    f.resolve(); f.resolve(); await settleMedia();
    assert.equal(f.reads(), 1); assert.equal(f.renders(), 1);
    assert.equal(f.resolve(), 'blob:ready');
    await settleMedia(); assert.equal(f.renders(), 1);
});

test('gate:reader:synchronously-displayed-image-does-not-refresh-again-on-completion', async t => {
    const f = reader(t, { synchronous: true, load: (url, resident) => {
        resident.set(url, 'blob:immediate'); return Promise.resolve('blob:immediate');
    } });
    assert.equal(f.resolve(), 'blob:immediate');
    await settleMedia(); assert.equal(f.renders(), 0);
});

test('gate:reader:empty-and-rejected-reads-can-recover-on-a-later-explicit-read', async t => {
    let mode = 'empty';
    const f = reader(t, { load: async (url, resident) => {
        if (mode === 'reject') throw new Error('offline');
        if (mode === 'empty') return '';
        resident.set(url, 'blob:restored'); return pixel('restored');
    } });
    f.resolve(); await settleMedia();
    mode = 'reject'; f.resolve(); await settleMedia();
    assert.equal(f.renders(), 0); assert.equal(f.current.assetLoadRequests.size, 0);
    mode = 'ready'; f.resolve(); await settleMedia();
    assert.equal(f.reads(), 3); assert.equal(f.renders(), 1);
    assert.equal(f.resolve(), 'blob:restored');
});

for (const change of ['page', 'closed']) test(`gate:reader:late-image-does-not-render-after-${change}`, async t => {
    let release;
    const f = reader(t, { load: (url, resident) => new Promise(resolve => {
        release = () => { resident.set(url, 'blob:late'); resolve(pixel('late')); };
    }) });
    f.resolve(); await Promise.resolve();
    if (change === 'page') f.current.snapshot = { content: { backgroundImage: '/user/images/other.png' } };
    else f.probe.state.activeReader = null;
    release(); await settleMedia();
    assert.equal(f.renders(), 0);
    if (change === 'page') assert.equal(f.resolve(), 'blob:late');
});

test('gate:reader:cache-clear-old-completion-cannot-remove-a-new-request', async t => {
    const releases = [];
    const f = reader(t, { load: () => new Promise(resolve => releases.push(resolve)) });
    f.resolve(); await Promise.resolve();
    f.current.assetLoadRequests.clear();
    f.resolve(); await Promise.resolve();
    const request = f.current.assetLoadRequests.get(f.source);
    releases[0](''); await settleMedia();
    assert.equal(f.current.assetLoadRequests.get(f.source), request);
    f.resolve(); assert.equal(f.reads(), 2);
    releases[1](''); await settleMedia();
    assert.equal(f.current.assetLoadRequests.size, 0);
});

for (const source of ['data:image/png;base64,QQ==', 'blob:fixture']) test(`gate:reader:inline-${source.slice(0, 4)}-never-drives-a-refresh`, async t => {
    const f = reader(t);
    assert.equal(f.probe.resolveReaderAssetUrl(source, f.current), source);
    await settleMedia(); assert.equal(f.renders(), 0);
});

function generated(t, { memoryBytes = 1024, thumbs = false } = {}) {
    const cache = createLocalImageCache({}, { memoryBytes });
    let reads = 0;
    const notifications = [];
    const queued = [];
    const service = createAssetGenerationService({ mediaCache: cache, getSettings: () => ({}),
        messageHost: { getChatId: () => 'static-fixture', on: () => () => {} },
        store: { getImage: async id => { reads++; return { dataUrl: pixel(id) }; } },
        events: { emit: (_name, detail) => { notifications.push(detail); if (detail.reason === 'image-loaded') queued.push(detail); } },
        ...(thumbs ? { thumbStore: createMemoryAssetThumbStore({ mediaCache: cache }), makeThumb: async data => data } : {}),
    });
    t.after(async () => { service.stop(); await cache.destroy(); });
    return { service, cache, notifications, queued, reads: () => reads };
}

for (const thumbs of [false, true]) test(`gate:reader:generated-${thumbs ? 'thumbnail' : 'image'}-rejected-by-budget-does-not-announce-ready`, async t => {
    const f = generated(t, { memoryBytes: 4, thumbs });
    const resolve = () => thumbs ? f.service.resolveThumbUrl('igs-gen:oversized') : f.service.resolveUrl('igs-gen:oversized');
    assert.equal(resolve(), ''); await settleMedia();
    assert.equal(f.reads(), 1);
    assert.equal(f.queued.length, 0);
    assert.equal(f.service.isMissingImage('igs-gen:oversized'), false);
    await settleMedia(); assert.equal(f.reads(), 1);
    f.cache.remember(thumbs ? 'thumb:asset:oversized' : 'asset:oversized', 'x');
    assert.equal(resolve(), 'x', '预算拒绝不永久屏蔽素材');
});

test('gate:reader:generated-image-retained-by-cache-announces-ready-and-stops', async t => {
    const f = generated(t);
    assert.equal(f.service.resolveUrl('igs-gen:ready'), ''); await settleMedia();
    assert.equal(f.service.resolveUrl('igs-gen:ready'), pixel('ready'));
    assert.equal(f.queued.length, 1); assert.equal(f.reads(), 1);
    await settleMedia(); assert.equal(f.queued.length, 1);
});

test('gate:reader:ordinary-unpinned-images-still-follow-lru', async t => {
    const cache = createLocalImageCache({}, { maxCount: 2 });
    t.after(() => cache.destroy());
    cache.remember('one', pixel('one')); cache.remember('two', pixel('two'));
    assert.equal(cache.peek('one'), pixel('one'));
    cache.remember('three', pixel('three'));
    assert.equal(cache.peek('two'), '');
    assert.equal(cache.peek('one'), pixel('one'));
    assert.equal(cache.peek('three'), pixel('three'));
});

test('gate:reader:active-images-over-combined-budget-cannot-evict-and-reload-each-other', async t => {
    const bytes = pixel('one').length * 2;
    const f = generated(t, { memoryBytes: bytes + 1 });
    const releases = ['one', 'two'].map(id => f.cache.pin(`asset:${id}`));
    t.after(() => releases.forEach(release => release()));
    const render = () => { f.service.resolveUrl('igs-gen:one'); f.service.resolveUrl('igs-gen:two'); };
    render(); await settleMedia();
    for (let i = 0; i < 10 && f.queued.length; i++) {
        f.queued.splice(0); render(); await settleMedia();
    }
    assert.equal(f.queued.length, 0);
    assert.ok(f.reads() <= 3, `静态页必须收敛，实际读取 ${f.reads()} 次`);
    assert.equal(f.service.resolveUrl('igs-gen:one'), pixel('one'));
    const before = f.reads(); await settleMedia(); assert.equal(f.reads(), before);
    assert.ok((await f.cache.stats()).memoryBytes <= bytes + 1);
    releases[0]();
    f.service.resolveUrl('igs-gen:two'); await settleMedia();
    assert.equal(f.service.resolveUrl('igs-gen:two'), pixel('two'), '离开旧图后可重新读取此前未接纳的图');
});
