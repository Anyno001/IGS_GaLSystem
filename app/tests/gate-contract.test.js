import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';

import { bootstrapIGS } from '../src/index.js';
import { dispatchImportBundle } from '../src/registry/import-dispatcher.js';
import {
    IGS_FROSTED_GLASS_BACKDROP_FILTER,
    IGS_TRANSPARENT_GLASS_BACKDROP_FILTER,
    IGS_TRANSPARENT_GLASS_BG,
    applyTransparentGlassMaterial,
} from '../src/styles/glass-material.js';
import { checkStyleContract } from '../src/styles/style-contract.js';
import { readLegacyIgsSettings } from '../src/storage/legacy-igs.js';
import { createReaderState } from '../src/visual/reader-state.js';
import { getOriginalReaderStyleText } from '../src/visual/igs-ui/original-reader-source.js';
import { createStageModel } from '../src/visual/stage-model.js';
import {
    normalizeClassicDialogWidthPercent,
} from '../src/visual/igs-ui/classic-dialog-skin.js';
import { getDialogSkinStyleText, listDialogSkinAssetUrls, watchDialogSkinAssets } from '../src/visual/igs-ui/dialog-skin-style.js';
import { checkBundleStartup } from '../scripts/bundle-startup-check.js';
import { resolveSettingsPage } from '../src/visual/igs-ui/settings-pages.js';

const appRoot = path.resolve(import.meta.dirname, '..');
const projectRoot = path.resolve(appRoot, '..');

test('gate:import-contract:dispatches allowed types and rejects forbidden types', () => {
    const bundle = readJson('fixtures/imports/sample-bundle.json');
    const handled = [];
    const result = dispatchImportBundle(bundle, {
        'background-pack': (item) => handled.push(item.id),
    });

    assert.equal(result.ok, false);
    assert.deepEqual(handled, ['pack.library']);
    assert.equal(result.accepted.length, 1);
    assert.equal(result.rejected[0].item.type, 'hotkey-preset');
});

test('gate:import-contract:text-presets', () => {
    const bundle = readJson('fixtures/imports/text-presets-bundle.json');
    const handled = [];
    const result = dispatchImportBundle(bundle, {
        'text-filter-preset': (item) => handled.push(item.type),
        'text-format-preset': (item) => handled.push(item.type),
        'scene-regex-preset': (item) => handled.push(item.type),
    });

    assert.equal(result.ok, true);
    assert.deepEqual(handled, ['text-filter-preset', 'text-format-preset', 'scene-regex-preset']);
    assert.equal(result.accepted.length, 3);
    assert.deepEqual(result.rejected, []);
});

test('gate:style-contract:requires stable slots and reader bridge attributes', () => {
    const skin = readJson('fixtures/styles/skin-contract.json');
    const result = checkStyleContract(skin);

    assert.equal(result.ok, true);
    assert.deepEqual(result.missingSlots, []);
    assert.deepEqual(result.missingData, []);
});

test('gate:style-contract:transparent glass material applies neutral density to foreground surfaces', () => {
    const applied = new Map();
    applyTransparentGlassMaterial({
        style: {
            setProperty(name, value) {
                applied.set(name, value);
            },
        },
    }, 0.62);

    assert.equal(applied.get('--igs-glass-opacity'), '0.62');
    assert.equal(applied.get('--igs-glass-density'), '0.62');
    assert.equal(applied.get('--igs-glass-fill-alpha'), '0.62');
    assert.equal(applied.get('--igs-transparent-glass-bg'), IGS_TRANSPARENT_GLASS_BG);
    assert.equal(applied.get('--igs-glass-bg'), IGS_TRANSPARENT_GLASS_BG);
    assert.equal(applied.get('--igs-dialog-bg'), IGS_TRANSPARENT_GLASS_BG);
    assert.equal(applied.get('--igs-toolbar-bg'), IGS_TRANSPARENT_GLASS_BG);
    assert.equal(applied.get('--igs-choice-bg'), IGS_TRANSPARENT_GLASS_BG);
    assert.equal(applied.get('--igs-db-bg'), IGS_TRANSPARENT_GLASS_BG);
    assert.equal(applied.get('--igs-glass-blur'), IGS_TRANSPARENT_GLASS_BACKDROP_FILTER);
    assert.equal(applied.get('--igs-dialog-blur'), IGS_TRANSPARENT_GLASS_BACKDROP_FILTER);
    assert.equal(applied.get('--igs-toolbar-blur'), IGS_TRANSPARENT_GLASS_BACKDROP_FILTER);
    assert.equal(applied.get('--igs-choice-blur'), IGS_TRANSPARENT_GLASS_BACKDROP_FILTER);
    assert.equal(applied.get('--igs-db-blur'), IGS_TRANSPARENT_GLASS_BACKDROP_FILTER);
    assert.equal(applied.get('--igs-db-head-bg'), IGS_TRANSPARENT_GLASS_BG);
    assert.equal(applied.get('--igs-db-head-blur'), IGS_TRANSPARENT_GLASS_BACKDROP_FILTER);

    applyTransparentGlassMaterial({
        style: {
            setProperty(name, value) {
                applied.set(name, value);
            },
        },
    }, 0.62, { backdropFilter: true });

    assert.equal(applied.get('--igs-glass-blur'), IGS_FROSTED_GLASS_BACKDROP_FILTER);
    assert.equal(applied.get('--igs-db-head-blur'), IGS_FROSTED_GLASS_BACKDROP_FILTER);
});

test('gate:visual-slots-contract:stage-model', () => {
    const fixture = readJson('fixtures/visual/stage-model.json');
    const readerState = createReaderState(fixture.standard.readerStateInput);
    const stage = createStageModel(fixture.standard.scene, readerState);
    const result = checkStyleContract(stage);

    assert.equal(result.ok, true);
    assert.deepEqual(result.missingSlots, []);
    assert.deepEqual(result.missingData, []);
    assert.equal(stage.layers.hud.toolbar.attributes['data-placement'], 'top-right');
});

test('gate:loader-json:matches loader source and references public bundle', () => {
    const loaderSource = fs.readFileSync(path.join(projectRoot, 'loader', 'igs-loader.js'), 'utf8');
    const loaderJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'loader', 'igs-loader.json'), 'utf8'));

    assert.equal(loaderJson.type, 'script');
    assert.equal(loaderJson.name, '沉浸式Galgame系统（自动更新）');
    assert.equal(loaderJson.content, loaderSource);
    assert.deepEqual(loaderJson.button, {
        enabled: true,
        buttons: [ { name: 'Gal模拟', visible: true } ],
    });
});

test('gate:dist-bundle:boots-minified-and-debug-in-fresh-processes', () => {
    const version = readJson('package.json').version;
    for (const file of ['igs.bundle.js', 'igs.bundle.debug.js']) {
        checkBundleStartup(path.join(appRoot, 'dist', file), version);
    }
});

test('gate:dist-bundle:loads-as-esm-entry', async () => {
    const bundleUrl = `${pathToFileURL(path.join(appRoot, 'dist', 'igs.bundle.js')).href}?gate=${Date.now()}`;
    globalThis.IGS_AUTO_BOOTSTRAP = false;
    try {
        const bundle = await import(bundleUrl);
        assert.equal(typeof bundle.bootstrapIGS, 'function');
        assert.equal(typeof bundle.createIgsReaderHost, 'function');
    } finally {
        delete globalThis.IGS_AUTO_BOOTSTRAP;
    }
});

test('gate:loader-json:repeated enable rescans magic wand without alerting', async () => {
    const loaderJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'loader', 'igs-loader.json'), 'utf8'));
    const documentLike = createLoaderDocumentLike();
    const alerts = [];
    let ensureCalls = 0;
    const root = {
        document: documentLike,
        alert: (message) => alerts.push(message),
        console,
        setTimeout: (callback) => {
            callback();
            return 1;
        },
        IGS_LOADER_REF: 'main',
        __IGS_AUTO_UPDATE_LOADER__: {
            repository: 'Anyno001/IGS_GaLSystem',
            activeRef: 'main',
            activeBase: 'https://cdn.jsdelivr.net/gh/Anyno001/IGS_GaLSystem@main',
        },
        IGS: {
            openSettings() {}, openLatestAvailable() {},
            ensureMagicWandEntry() {
                ensureCalls += 1;
                return { ok: true, entries: 1 };
            },
        },
    };
    root.parent = root;

    const context = vm.createContext({
        window: root,
        document: documentLike,
        console,
        setTimeout: root.setTimeout,
    });

    vm.runInContext(loaderJson.content, context);
    await new Promise(resolve => setImmediate(resolve));

    assert.equal(alerts.length, 0);
    assert.ok(ensureCalls >= 1);
    assert.equal(documentLike.head.children.length, 0);
    assert.equal(root.__IGS_AUTO_UPDATE_LOADER__.status, 'ready');
    assert.equal(root.__IGS_AUTO_UPDATE_LOADER__.reused, true);
});

test('gate:loader-json:adds-temporary-magic-wand-entry-before-remote-bundle-loads', async () => {
    const loaderJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'loader', 'igs-loader.json'), 'utf8'));
    const documentLike = createLoaderDocumentLike({ magicMenu: true });
    const alerts = [];
    const root = {
        document: documentLike,
        parent: null,
        alert: (message) => alerts.push(message),
        console,
        IGS_LOADER_REF: 'main',
        setTimeout: (callback, delay = 0) => {
            if (delay === 0) callback();
            return 1;
        },
        clearTimeout() {},
    };
    root.parent = root;
    root.top = root;

    const context = vm.createContext({
        window: root,
        document: documentLike,
        console,
        setTimeout: root.setTimeout,
        fetch: root.fetch,
    });
    vm.runInContext(loaderJson.content, context);
    // 等配置与旧实例协调完成，远程脚本仍未触发 onload。
    await new Promise(resolve => setImmediate(resolve));

    const entry = documentLike.magicMenu.querySelector('[data-igs-loader-entry="1"]');
    assert.ok(entry);
    assert.equal(entry.getAttribute('data-igs-magic-entry'), '1');
    assert.equal(entry.getAttribute('data-igs-version'), 'loader');
    assert.match(entry.innerHTML, /沉浸式Galgame系统/);
    assert.deepEqual(alerts, []);
});


function createQrLoaderHarness(options = {}) {
    const loaderJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'loader', 'igs-loader.json'), 'utf8'));
    const documentLike = createLoaderDocumentLike(options.documentOptions || {});
    const subscriptions = [];
    const opened = [];
    const alerts = [];
    const warnings = [];

    const root = {
        document: documentLike,
        parent: null,
        alert: (message) => alerts.push(message),
        console: { info() {}, warn: (message, error) => warnings.push([message, error]), error() {} },
        setTimeout: (callback) => { callback(); return 1; },
        IGS: options.withRuntime
            ? {
                openLatestAvailable() {
                    opened.push('open');
                    return Promise.resolve({ ok: true });
                },
                ensureMagicWandEntry: () => ({ ok: true, entries: 1 }),
            }
            : undefined,
    };
    root.parent = root;
    root.top = root;

    if (options.qrApi === 'direct' || options.qrApi === 'nested' || options.qrApi === 'missing' || options.qrApi === 'throwing') {
        const qrApi = {};
        if (options.qrApi !== 'missing') {
            qrApi.getButtonEvent = (name) => { qrApi.lastButtonName = name; return { name }; };
            qrApi.eventOn = (event, handler) => {
                if (options.qrApi === 'throwing') throw new Error('eventOn unavailable');
                subscriptions.push({ event, handler });
                return { stop() {} };
            };
        }
        if (options.qrApi === 'direct') Object.assign(root, qrApi);
        if (options.qrApi === 'nested' || options.qrApi === 'throwing') root.SillyTavern = qrApi;
    }

    const lexicalHost = options.qrApi === 'lexical'
        ? {
            eventOn: (event, handler) => {
                subscriptions.push({ event, handler });
                return { stop() {} };
            },
            getButtonEvent: (name) => ({ name }),
        }
        : {};
    const context = vm.createContext({
        window: root,
        document: documentLike,
        console: root.console,
        setTimeout: root.setTimeout,
        fetch: options.fetch === null ? undefined : (options.fetch || (async () => ({ ok: true, status: 200 }))),
        ...lexicalHost,
    });

    return {
        root,
        opened,
        alerts,
        warnings,
        subscriptions,
        run() { vm.runInContext(loaderJson.content, context); return root; },
        runTwice() { vm.runInContext(loaderJson.content, context); vm.runInContext(loaderJson.content, context); },
        click() {
            assert.equal(subscriptions.length >= 1, true, 'QR subscription should exist');
            const event = subscriptions[0].event;
            assert.equal(event.name, 'Gal模拟');
            return subscriptions[0].handler();
        },
    };
}

test('gate:loader-qr:registers Gal模拟 button event through host qr api', () => {
    const harness = createQrLoaderHarness({ qrApi: 'direct', withRuntime: true });
    harness.run();

    assert.equal(harness.subscriptions.length, 1);
    assert.equal(harness.subscriptions[0].event.name, 'Gal模拟');
});

test('gate:loader-qr:uses lexical host event api exposed by script runner', () => {
    const harness = createQrLoaderHarness({ qrApi: 'lexical', withRuntime: true });
    harness.run();
    assert.equal(harness.subscriptions.length, 1);
    assert.equal(harness.subscriptions[0].event.name, 'Gal模拟');
});

test('gate:loader-qr:click-opens-latest-reader-when-runtime-ready', async () => {
    const harness = createQrLoaderHarness({ qrApi: 'nested', withRuntime: true });
    harness.run();

    const result = harness.click();
    await Promise.resolve(result);

    assert.equal(harness.opened.length, 1);
    assert.equal(harness.alerts.length, 0);
});

test('gate:loader-qr:click-before-runtime-ready-queues-single-open', async () => {
    const harness = createQrLoaderHarness({ qrApi: 'direct', withRuntime: false });
    harness.run();

    harness.click();
    harness.click();
    assert.equal(harness.opened.length, 0);
    assert.equal(harness.root.__IGS_QR_ENTRY_BINDING__.pendingOpen, true, 'runtime-not-ready click should queue exactly one pending open');

    harness.root.IGS = {
        openLatestAvailable() {
            harness.opened.push('open');
            return Promise.resolve({ ok: true });
        },
        ensureMagicWandEntry: () => ({ ok: true, entries: 1 }),
    };

    harness.root.__IGS_QR_ENTRY_BINDING__.flushPendingOpen();
    assert.equal(harness.opened.length, 1);
    assert.equal(harness.root.__IGS_QR_ENTRY_BINDING__.pendingOpen, false);
});

test('gate:loader-qr:repeated-enable-keeps-single-subscription', () => {
    const harness = createQrLoaderHarness({ qrApi: 'direct', withRuntime: true });
    harness.runTwice();

    assert.equal(harness.subscriptions.length, 1);
});

test('gate:loader-qr:missing-or-throwing-qr-api-fails-open', () => {
    const missing = createQrLoaderHarness({ qrApi: 'missing', withRuntime: true });
    missing.run();
    assert.equal(missing.subscriptions.length, 0);
    assert.equal(missing.alerts.length, 0);

    const throwing = createQrLoaderHarness({ qrApi: 'throwing', withRuntime: true });
    throwing.run();
    assert.equal(throwing.subscriptions.length, 0);
    assert.equal(throwing.alerts.length, 0);
    assert.equal(throwing.warnings.length >= 1, true);
});

test('gate:loader-json:loads-discovered-main-commit-without-probing-bundle', async () => {
    const loaderJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'loader', 'igs-loader.json'), 'utf8'));
    const scripts = [];
    const alerts = [];
    const fetched = [];
    const documentLike = createLoaderDocumentLike({
        onAppend(element) {
            if (element.tagName !== 'SCRIPT') return;
            scripts.push(element.src);
            setTimeout(() => {
                root.IGS = {
                    version: readJson('package.json').version,
                    openSettings() {}, openLatestAvailable() {},
                    ensureMagicWandEntry: () => ({ ok: true }),
                    shutdown: async () => ({ ok: true }),
                };
                element.onload();
            }, 0);
        },
    });
    const root = {
        document: documentLike,
        parent: null,
        alert: (message) => alerts.push(message),
        console,
        setTimeout, clearTimeout,
        fetch: async (url, options = {}) => {
            const text = String(url);
            fetched.push(text);
            if (text.includes('/branches/main')) {
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({ commit: { sha: '1234567890abcdef1234567890abcdef12345678' } }),
                };
            }
            return { ok: true, status: 200 };
        },
    };
    root.parent = root;

    const context = vm.createContext({
        window: root,
        document: documentLike,
        console,
        setTimeout,
        fetch: root.fetch,
    });
    vm.runInContext(loaderJson.content, context);
    await new Promise((resolve) => setTimeout(resolve, 20));

    assert.deepEqual(alerts, []);
    assert.equal(scripts.length, 1);
    assert.match(scripts[0], /@1234567890abcdef1234567890abcdef12345678\/app\/dist\/igs\.bundle\.js/);
    assert.ok(fetched.some((url) => url.includes('/branches/main')));
    assert.ok(!fetched.some((url) => url.includes('/app/dist/igs.bundle.js')), 'auto-discovered commit is not HEAD-probed');
});

async function runLoaderScenario({ rootExtras = {}, branchResponse, bundleOk = () => true } = {}) {
    const loaderJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'loader', 'igs-loader.json'), 'utf8'));
    const scripts = [];
    const fetched = [];
    const store = new Map(Object.entries(rootExtras.storage || {}));
    const documentLike = createLoaderDocumentLike({
        onAppend(element) {
            if (element.tagName !== 'SCRIPT') return;
            scripts.push(element.src);
            setTimeout(() => {
                if (!bundleOk(element.src)) { element.onerror?.(); return; }
                root.IGS = {
                    version: readJson('package.json').version,
                    openSettings() {}, openLatestAvailable() {},
                    ensureMagicWandEntry: () => ({ ok: true }), shutdown: async () => ({ ok: true }),
                };
                element.onload?.();
            }, 0);
        },
    });
    const root = {
        document: documentLike,
        parent: null,
        alert: () => {},
        console: { ...console, info() {}, warn() {} },
        setTimeout, clearTimeout, AbortController, Blob, URL,
        eventOn: () => ({}), getButtonEvent: name => name,
        localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) },
        fetch: async (url) => {
            const text = String(url);
            fetched.push(text);
            if (text.includes('/branches/main')) return branchResponse ? branchResponse() : { ok: false, status: 403 };
            return { ok: true, status: 200, text: async () => `// Generated by app/scripts/build.js. Do not edit this file directly.\n// IGS version: ${readJson('package.json').version}\nexport {};` };
        },
        ...rootExtras,
    };
    delete root.storage;
    root.parent = root;
    const context = vm.createContext({ window: root, document: documentLike, console: root.console, setTimeout, fetch: root.fetch });
    vm.runInContext(loaderJson.content, context);
    await new Promise((resolve) => setTimeout(resolve, 30));
    return { scripts, fetched, store };
}

const LOADER_SHA_A = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const LOADER_SHA_B = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const branchOk = (sha) => () => ({ ok: true, status: 200, json: async () => ({ commit: { sha } }) });

test('gate:loader-cache:fresh-sha-cache-skips-github-api', async () => {
    const storage = { 'igs:loader:latest-ref': JSON.stringify({ ref: LOADER_SHA_A, at: Date.now() - 5 * 60 * 1000 }) };
    const { scripts, fetched } = await runLoaderScenario({ rootExtras: { storage }, branchResponse: branchOk(LOADER_SHA_B) });
    assert.ok(!fetched.some((url) => url.includes('/branches/main')));
    assert.equal(scripts.length, 1);
    assert.ok(scripts[0].includes(`@${LOADER_SHA_A}/app/dist/igs.bundle.js`));
});

test('gate:loader-cache:stale-cache-refetches-and-remembers-after-load', async () => {
    const storage = { 'igs:loader:latest-ref': JSON.stringify({ ref: LOADER_SHA_A, at: Date.now() - 2 * 60 * 60 * 1000 }) };
    const { scripts, fetched, store } = await runLoaderScenario({ rootExtras: { storage }, branchResponse: branchOk(LOADER_SHA_B) });
    assert.ok(fetched.some((url) => url.includes('/branches/main')));
    assert.ok(scripts[0].includes(`@${LOADER_SHA_B}/`));
    assert.equal(JSON.parse(store.get('igs:loader:latest-ref')).ref, LOADER_SHA_B);
});

test('gate:loader-cache:api-failure-reuses-stale-sha', async () => {
    const storage = { 'igs:loader:latest-ref': JSON.stringify({ ref: LOADER_SHA_A, at: Date.now() - 3 * 60 * 60 * 1000 }) };
    const { scripts } = await runLoaderScenario({ rootExtras: { storage } });
    assert.equal(scripts.length, 1);
    assert.ok(scripts[0].includes(`@${LOADER_SHA_A}/`));
});

test('gate:loader-cache:main-fallback-cache-bust-is-hourly', async () => {
    const { scripts, store } = await runLoaderScenario();
    assert.equal(scripts.length, 1);
    const mark = scripts[0].match(/@main\/app\/dist\/igs\.bundle\.js\?igs_t=(\d+)$/);
    assert.ok(mark, scripts[0]);
    assert.equal(Number(mark[1]), Math.floor(Date.now() / 3600000));
    assert.equal(store.has('igs:loader:latest-ref'), false);
});

test('gate:loader-cache:unavailable-sha-fetches-the-same-commit', async () => {
    const { scripts, fetched, store } = await runLoaderScenario({
        branchResponse: branchOk(LOADER_SHA_B),
        bundleOk: (src) => !src.includes(`@${LOADER_SHA_B}/`),
    });
    assert.equal(scripts.length, 2);
    assert.ok(scripts[1].startsWith('blob:'));
    assert.ok(fetched.some(url => url.includes(`raw.githubusercontent.com/Anyno001/IGS_GaLSystem/${LOADER_SHA_B}/`)));
    assert.ok(!fetched.some(url => url.includes('@main/')));
    assert.equal(JSON.parse(store.get('igs:loader:latest-ref')).ref, LOADER_SHA_B);
});

test('gate:loader-cache:debug-loader-bypasses-cache-and-prefers-debug-bundle', async () => {
    const storage = { 'igs:loader:latest-ref': JSON.stringify({ ref: LOADER_SHA_A, at: Date.now() }) };
    const { scripts, fetched } = await runLoaderScenario({
        rootExtras: { storage, IGS_DEBUG: true },
        branchResponse: branchOk(LOADER_SHA_B),
        bundleOk: (src) => !src.includes('igs.bundle.debug.js'),
    });
    assert.ok(fetched.some((url) => url.includes('/branches/main')));
    assert.ok(scripts[0].includes(`@${LOADER_SHA_B}/app/dist/igs.bundle.debug.js`));
    assert.ok(scripts[1].includes(`@${LOADER_SHA_B}/app/dist/igs.bundle.js`), 'old refs without the debug bundle fall back to the minified one');
});

test('gate:loader-json:explicit-fixed-ref-never-falls-back-to-main', async () => {
    const loaderJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'loader', 'igs-loader.json'), 'utf8'));
    const scripts = [];
    const alerts = [];
    const fetched = [];
    const documentLike = createLoaderDocumentLike({
        onAppend(element) {
            if (element.tagName !== 'SCRIPT') return;
            scripts.push(element.src);
            setTimeout(() => element.onload(), 0);
        },
    });
    const root = {
        document: documentLike,
        parent: null,
        IGS_LOADER_REF: 'v9.9.9',
        alert: (message) => alerts.push(message),
        console,
        setTimeout,
        clearTimeout, AbortController, eventOn: () => ({}), getButtonEvent: name => name,
        fetch: async (url) => {
            const text = String(url);
            fetched.push(text);
            return {
                ok: false,
                status: 404,
            };
        },
    };
    root.parent = root;

    const context = vm.createContext({
        window: root,
        document: documentLike,
        console,
        setTimeout,
        fetch: root.fetch,
    });
    vm.runInContext(loaderJson.content, context);
    await new Promise((resolve) => setTimeout(resolve, 20));

    assert.equal(alerts.length, 1);
    assert.ok(fetched.some((url) => url.includes('@v9.9.9/app/dist/igs.bundle.js')));
    assert.ok(fetched.some((url) => url.includes('/v9.9.9/app/dist/igs.bundle.js')));
    assert.equal(scripts.length, 0);
    assert.ok(!fetched.some((url) => url.includes('@main/')));
});

test('gate:igs-compat:legacy-storage', () => {
    const fixture = readJson('fixtures/igs/legacy-storage.json');
    const storageLike = {
        getItem(key) {
            return Object.prototype.hasOwnProperty.call(fixture, key) ? fixture[key] : null;
        },
    };

    const result = readLegacyIgsSettings(storageLike, 'mobile');
    assert.equal(result.ok, true);
    assert.equal(result.readerMode, 'mobile');
    assert.equal(result.displayMode, 'pc');
    assert.equal(result.bridge.showToasts, true);
    assert.equal(result.readerSettingsByMode.pc.toolbarDirection, 'horizontal');
    assert.equal(result.readerSettingsByMode.mobile.toolbarDirection, 'vertical');

    const invalidResult = readLegacyIgsSettings({
        getItem(key) {
            if (key === 'igs_bridge_config') return '{bad json';
            return null;
        },
    });
    assert.equal(invalidResult.ok, false);
    assert.equal(invalidResult.reason, 'invalid-legacy-json');
});

test('gate:igs-compat:api-shape', async () => {
    const contract = readJson('fixtures/igs/api-contract.json');
    const legacyStorage = readJson('fixtures/igs/legacy-storage.json');
    const globalObject = {
        localStorage: {
            getItem(key) {
                return Object.prototype.hasOwnProperty.call(legacyStorage, key) ? legacyStorage[key] : null;
            },
        },
    };
    const vn = bootstrapIGS({
        global: globalObject,
        hostAdapter: {
            getCurrentMessage: async () => null,
            typeAndSend: async () => ({ ok: true }),
        },
    });

    for (const method of contract.methods) {
        assert.equal(typeof vn[method], 'function');
    }

    const unifiedSettings = vn.getUnifiedSettings({ mode: 'pc' });
    for (const field of contract.unifiedSettingsFields) {
        assert.ok(Object.prototype.hasOwnProperty.call(unifiedSettings, field));
    }
    assert.equal(unifiedSettings.bridge.imageApi.mode, 'nai');
    try {
        const settingsResult = vn.openSettings({ tab: 'basic' });
        assert.equal(settingsResult.ok, true);
        // 旧的 tab: 'basic' 落到仪表盘；契约按分类给出。
        assert.equal(settingsResult.snapshot.tabs.length, 10);
        assert.equal(settingsResult.snapshot.tabs[0].label, '仪表盘');
        assert.equal(settingsResult.snapshot.page, 'dash');
        const generated = await vn.generateImage({ prompt: 'moon' });
        assert.equal(generated.ok, false);
        // 地址留空走 NAI 官方接口，缺的是 Key。
        assert.equal(generated.reason, '请先在设置中填写 NAI 的 API Key');
    } finally {
        vn.destroy();
    }
});

test('gate:igs-ui:legacy-settings-navigation-resolves-current-pages', () => {
    // 旧 tab / 子页 id 都映射到新页面。
    const legacy = [
        [{ tab: 'basic' }, 'dash'], [{ tab: 'regex' }, 'parse'], [{ tab: 'basic', open: ['source-filter'] }, 'parse'], [{ tab: 'basic', open: ['body-format'] }, 'parse'],
        [{ tab: 'reader' }, 'style'], [{ tab: 'reader', readerSubTab: 'display' }, 'style'], [{ tab: 'reader', readerSubTab: 'theme' }, 'text'],
        [{ tab: 'reader', readerSubTab: 'toolbar' }, 'ui-reader'], [{ tab: 'reader', readerSubTab: 'visual' }, 'ui-reader'], [{ tab: 'reader', readerSubTab: 'options' }, 'ui-reader'], [{ page: 'ui' }, 'ui-reader'], [{ tab: 'ui' }, 'ui-reader'],
        [{ tab: 'reader', readerSubTab: 'performance' }, 'perf-text'], [{ tab: 'reader', readerSubTab: 'performance', open: ['perf-group-sound'] }, 'sound'],
        [{ tab: 'reader', readerSubTab: 'performance', open: ['perf-group-rhythm'] }, 'perf-rhythm'],
        [{ tab: 'scene' }, 'chars'], [{ tab: 'scene', sceneSubTab: 'scenes' }, 'scenes'], [{ tab: 'scene', sceneSubTab: 'review' }, 'review'],
        [{ tab: 'scene', sceneSubTab: 'generated' }, 'review'], [{ tab: 'scene', sceneSubTab: 'rules' }, 'rules'],
        [{ tab: 'scene', sceneSubTab: 'rules', open: ['rules-mood'] }, 'wardrobe'], [{ tab: 'scene', sceneSubTab: 'rules', wardrobeFocus: '校服' }, 'wardrobe'],
        [{ tab: 'scene', sceneSubTab: 'rules', open: ['rules-event-cg'] }, 'eventcg'],
        [{ tab: 'image' }, 'source'], [{ tab: 'image', imageSubTab: 'llm' }, 'llm'], [{ tab: 'image', imageSubTab: 'auto' }, 'kinds'],
        [{ tab: 'image', imageSubTab: 'prompts' }, 'kinds'], [{ tab: 'image', imageSubTab: 'content' }, 'kinds'], [{ tab: 'image', imageSubTab: 'logs' }, 'logs'],
        [{ tab: 'image', imageSubTab: 'cg' }, 'cglib'], [{ tab: 'image', imageSubTab: 'other' }, 'source'],
        [{ tab: 'perf' }, 'perf-text'], [{ tab: 'ai' }, 'source'], [{ page: 'wardrobe' }, 'wardrobe'], [{ tab: 'nonsense' }, 'dash'], [{}, 'dash'],
    ];
    for (const [spec, expected] of legacy) assert.equal(resolveSettingsPage(spec), expected, JSON.stringify(spec));

});

test('gate:igs-ui:reader-style-has-no-unclosed-rule', () => {
    // 普通规则里再出现「{」说明上一条没闭合，后面整段样式会失效（下课铃图标曾因此铺成满屏黑块）。
    const css = getOriginalReaderStyleText().replace(/\/\*[\s\S]*?\*\//g, '');
    const stack = [];
    let last = 0;
    for (let i = 0; i < css.length; i += 1) {
        if (css[i] === '{') {
            const head = css.slice(last, i).trim();
            if (stack.length && !stack[stack.length - 1].startsWith('@')) assert.fail(`未闭合的规则：${stack[stack.length - 1].slice(-80)}`);
            stack.push(head);
            last = i + 1;
        } else if (css[i] === '}') {
            assert.ok(stack.length, `多余的右括号，位置 ${i}`);
            stack.pop();
            last = i + 1;
        } else if (css[i] === ';' && stack.length && stack[stack.length - 1].startsWith('@')) last = i + 1;
    }
    assert.equal(stack.length, 0);
});

test('gate:igs-ui:classic-dialog-assets-and-style', () => {
    const skinCss = getDialogSkinStyleText('western-classic', { base: 'https://cdn.example/app/dist/skins/' });
    assert.doesNotMatch(skinCss, /__IGS_ASSET__|data:image/);
    assert.deepEqual(listDialogSkinAssetUrls(skinCss).slice(0, 2), [
        'https://cdn.example/app/dist/skins/western-classic/dialog.png',
        'https://cdn.example/app/dist/skins/western-classic/name.png',
    ]);
    assert.doesNotMatch(skinCss, /data-igs-dialog-skin="plant-coffee"/);
    const images = [];
    const timers = [];
    class FakeImage { constructor() { images.push(this); } }
    const env = { Image: FakeImage, setTimeout: (fn) => { timers.push(fn); return timers.length; }, clearTimeout: () => {} };
    const fakeRoot = () => {
        const attrs = new Map();
        return { attrs, setAttribute: (k, v) => attrs.set(k, v), removeAttribute: (k) => attrs.delete(k) };
    };
    const failed = fakeRoot();
    watchDialogSkinAssets(failed, 'western-classic', skinCss, env);
    assert.equal(images.length, listDialogSkinAssetUrls(skinCss).length);
    images[0].onerror();
    assert.equal(failed.attrs.get('data-igs-skin-fallback'), '1');
    const slow = fakeRoot();
    watchDialogSkinAssets(slow, 'western-classic', skinCss, env);
    timers[timers.length - 1]();
    assert.equal(slow.attrs.get('data-igs-skin-fallback'), '1');
    const loaded = fakeRoot();
    const start = images.length;
    watchDialogSkinAssets(loaded, 'western-classic', skinCss, env);
    images.slice(start).forEach((image) => image.onload());
    timers[timers.length - 1]();
    assert.equal(loaded.attrs.has('data-igs-skin-fallback'), false);
    assert.equal(normalizeClassicDialogWidthPercent(undefined), 100);
    assert.equal(normalizeClassicDialogWidthPercent(40), 60);
    assert.equal(normalizeClassicDialogWidthPercent(120), 100);
});

test('gate:api:public-api-exposes-text-preset-groups', () => {
    const vn = bootstrapIGS({
        global: {},
        hostAdapter: {
            getCurrentMessage: async () => null,
            typeAndSend: async () => ({ ok: true }),
        },
    });

    assert.equal(typeof vn.api.textFilterPresets.register, 'function');
    assert.equal(typeof vn.api.textFormatPresets.register, 'function');
    assert.equal(typeof vn.api.sceneRegexPresets.register, 'function');
    assert.equal(typeof vn.api.textFilterPresets.setCurrent, 'function');
    assert.equal(typeof vn.api.textFormatPresets.getCurrent, 'function');
    assert.equal(typeof vn.api.sceneRegexPresets.exportAll, 'function');

    vn.destroy();
});

function readJson(relativePath) {
    return JSON.parse(fs.readFileSync(path.join(appRoot, relativePath), 'utf8'));
}

function createLoaderDocumentLike(options = {}) {
    const magicMenu = options.magicMenu ? createLoaderElement('div') : null;
    if (magicMenu) magicMenu.id = 'extensionsMenu';
    const head = {
        children: [],
        appendChild(element) {
            this.children.push(element);
            if (typeof options.onAppend === 'function') options.onAppend(element);
            return element;
        },
    };
    return {
        head,
        body: createLoaderElement('body'),
        magicMenu,
        querySelector(selector) {
            return this.querySelectorAll(selector)[0] || null;
        },
        querySelectorAll(selector) {
            const normalized = String(selector || '');
            if (normalized === '#extensionsMenu') return magicMenu && !magicMenu.removed ? [magicMenu] : [];
            const idMatch = normalized.match(/^#(.+)$/);
            if (!idMatch) return [];
            const headMatch = head.children.find((element) => element.id === idMatch[1] && !element.removed);
            return headMatch ? [headMatch] : [];
        },
        createElement(tagName) {
            return createLoaderElement(tagName);
        },
    };
}

function createLoaderElement(tagName) {
    const attributes = new Map();
    return {
        tagName: String(tagName || '').toUpperCase(),
        children: [],
        parentNode: null,
        innerHTML: '',
        className: '',
        href: '',
        set id(value) {
            this._id = value;
            attributes.set('id', String(value));
        },
        get id() {
            return this._id;
        },
        setAttribute(name, value) {
            attributes.set(String(name), String(value));
            if (name === 'id') this._id = String(value);
        },
        getAttribute(name) {
            return attributes.has(String(name)) ? attributes.get(String(name)) : null;
        },
        appendChild(child) {
            child.parentNode = this;
            this.children.push(child);
            return child;
        },
        addEventListener() {},
        removeEventListener() {},
        querySelector(selector) {
            return this.querySelectorAll(selector)[0] || null;
        },
        querySelectorAll(selector) {
            const normalized = String(selector || '');
            const dataMatch = normalized.match(/^\[([^=]+)="([^"]+)"\]$/);
            if (!dataMatch) return [];
            return this.children.filter((child) => child.getAttribute && child.getAttribute(dataMatch[1]) === dataMatch[2] && !child.removed);
        },
        remove() {
            this.removed = true;
        },
    };
}
