import test from 'node:test';
import assert from 'node:assert/strict';
import { createTavernSettingsSync, collectGlobalSettings } from '../src/storage/tavern-settings-file.js';
import { mapImageRepositoryFor } from '../src/media/tavern-map-images.js';
import { mediaFileGcFor } from '../src/media/media-file-gc.js';
import { flushMediaJournals } from '../src/media/media-record-journal.js';
import { handleSettingsAction } from '../src/visual/igs-ui/settings-actions.js';
import { LEGACY_PRESET_KEY } from '../src/scene/legacy-preset.js';
import { fakeMediaServer, pixel } from './helpers/fake-media-server.js';

test('gate:media:settings-network-and-server-errors-never-become-a-missing-file-upload', async () => {
    for (const mode of ['network', '500']) {
        const server = fakeMediaServer(), host = server.host();
        server.files.set('igs-settings.json', { version: 2, savedAt: 100, settings: { igs_bridge_config: 'keep' } });
        const sync = createTavernSettingsSync(host, { storage: host.localStorage, debounceMs: 10000 });
        await sync.start(); host.localStorage.setItem('igs_bridge_config', 'local');
        if (mode === 'network') server.failRead = true;
        else { const fetch = host.fetch; host.fetch = (url, options) => String(url).startsWith('/user/files/') ? Promise.resolve({ ok: false, status: 500 }) : fetch(url, options); }
        assert.equal(await sync.flush(), false); sync.stop();
        assert.equal(server.uploads.length, 0); assert.equal(server.files.get('igs-settings.json').settings.igs_bridge_config, 'keep');
    }
});

test('gate:media:settings-upload-merges-unrelated-remote-edits-and-keeps-deletion-markers', async () => {
    const server = fakeMediaServer(), host = server.host();
    server.files.set('igs-settings.json', { version: 2, savedAt: 100, settings: { igs_bridge_config: 'old', 'igs-map-gen-palette': 'classic', 'igs-reader-settings-v9-default': '{}' } });
    const sync = createTavernSettingsSync(host, { storage: host.localStorage, debounceMs: 10000 });
    await sync.start(); host.localStorage.setItem('igs_bridge_config', 'local');
    server.files.set('igs-settings.json', { version: 2, savedAt: 200, settings: { igs_bridge_config: 'remote', 'igs-map-gen-palette': 'bright' }, deletedKeys: ['igs-reader-settings-v9-default'] });
    assert.equal(await sync.flush(), true); sync.stop();
    const file = server.files.get('igs-settings.json');
    assert.equal(file.settings.igs_bridge_config, 'local'); assert.equal(file.settings['igs-map-gen-palette'], 'bright');
    assert.equal(host.localStorage.getItem('igs-reader-settings-v9-default'), null);
    assert.deepEqual(file.deletedKeys, ['igs-reader-settings-v9-default']);
});

test('gate:media:map-tombstone-overrides-legacy-settings-and-old-reference-delays-file-deletion', async () => {
    const server = fakeMediaServer(), host = server.host(), maps = mapImageRepositoryFor(host), key = 'igs-map-custom:c:t:l';
    const saved = await maps.set(key, pixel('old'));
    server.files.set('igs-settings.json', { version: 1, savedAt: 100, settings: { [key]: saved.url, igs_bridge_config: '{}' } });
    await maps.remove(key); await flushMediaJournals(host);
    const freshHost = server.host(), fresh = mapImageRepositoryFor(freshHost);
    const sync = createTavernSettingsSync(freshHost, { storage: freshHost.localStorage, debounceMs: 10000 });
    await Promise.all([fresh.restore(), sync.start()]);
    assert.equal(freshHost.localStorage.getItem(key), null);
    assert.equal((await mediaFileGcFor(freshHost).drain()).protected, 1); assert.equal(server.images.size, 1);
    freshHost.localStorage.setItem('igs-map-gen-palette', 'bright'); await sync.flush(); sync.stop();
    assert.equal(Object.hasOwn(collectGlobalSettings(freshHost.localStorage), key), false);
    await mediaFileGcFor(freshHost).drain(); assert.equal(server.images.size, 0);
});

test('gate:media:legacy-map-path-migrates-only-when-there-is-no-map-record-backup', async () => {
    const server = fakeMediaServer(), host = server.host(), key = 'igs-map-custom:c:t:l';
    server.files.set('igs-settings.json', { version: 1, savedAt: 100, settings: { [key]: 'https://example.test/map.png' } });
    const maps = mapImageRepositoryFor(host); await maps.restore();
    assert.equal(host.localStorage.getItem(key), 'https://example.test/map.png');
    assert.equal((await flushMediaJournals(host)).ok, true);
    assert.equal(server.files.get('igs-map-records.json').records[key].value.dataUrl, 'https://example.test/map.png');
});

test('gate:media:reference-save-failure-restores-persisted-settings-before-import-image-rollback', async () => {
    const server = fakeMediaServer(), host = server.host(), images = new Map([['shared', pixel('keep')]]);
    const old = { bridge: { sceneAssets: { enabled: true, statusAvatars: { 人: 'igs-gen:shared' } } }, readerSettings: {} };
    host.localStorage.setItem(LEGACY_PRESET_KEY, JSON.stringify({ version: 1, presets: { 导入: { statusAvatars: { 人: pixel('avatar') }, scenes: { 家: { url: '/home.png' } } } } }));
    const state = { activeSettings: { draft: structuredClone(old), readerMode: 'pc', asyncState: {} } };
    let stored = JSON.stringify(old), writes = 0;
    const ctx = {
        state, options: { global: host, generatedAssets: {
            async writeStoredImage(record) { images.set(record.id, record.dataUrl); return { ok: true }; },
            async deleteImages(ids) { const retained = ids.filter(id => stored.includes(`igs-gen:${id}`)); for (const id of ids) if (!retained.includes(id)) images.delete(id); return { ok: true, retained }; },
        } }, dialogs: { confirm: async () => true }, rerenderSettings: () => ({ ok: true }),
        persistSettingsDraft() { stored = JSON.stringify(state.activeSettings.draft); return { ok: ++writes > 1 }; },
    };
    const result = await handleSettingsAction(`legacy-preset-restore:${encodeURIComponent('导入')}`, ctx);
    assert.equal(result.ok, false); assert.equal(result.rollbackFailed, false);
    assert.equal(JSON.parse(stored).bridge.sceneAssets.statusAvatars.人, 'igs-gen:shared');
    assert.deepEqual([...images.keys()], ['shared']);
});
