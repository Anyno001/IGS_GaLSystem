import test from 'node:test';
import assert from 'node:assert/strict';
import { FX_PACK_KINDS, packOfKind, packFxOf, parsePackFxBody } from '../src/scene/fx-packs.js';

const MIN_FIELDS = {
    mark: ['', '潮红', '脸颊'],
    crowd: ['鼓掌'],
    test: ['阳性'],
    vote: ['甲:3;乙:2'],
    rank: ['甲:30;乙:20'],
    relmap: ['甲>乙'],
    pair: ['甲+乙'],
    hmselect: ['留牌子', '甲'],
    hmprobe: ['银针', '无毒'],
    hmpunish: ['冷宫', '甲'],
    hmtray: ['白绫', '甲'],
    phase: ['发情期', '3/7', '甲'],
    traits: ['甲', '耳,尾'],
    stats: ['甲', 'STR:60;CON:55;DEX:70'],
    race: ['冲线', '甲', '10'],
    levelup: ['2'],
    quest: ['委托'],
    route: ['甲地', '乙地'],
    debut: ['甲:1;乙:2', '出道'],
};

const GENERIC = [[], ['甲'], ['甲', '乙'], ['1'], ['1', '2'], ['甲', '乙', '50']];

test('every registered pack kind parses through parsePackFxBody and packFxOf', () => {
    const missing = [];
    for (const kind of FX_PACK_KINDS) {
        const candidates = MIN_FIELDS[kind] ? [MIN_FIELDS[kind]] : GENERIC;
        let body = null;
        for (const fields of candidates) {
            body = parsePackFxBody(kind, fields);
            if (body) break;
        }
        if (!body) {
            missing.push(kind);
            continue;
        }
        const item = packFxOf(body);
        if (!item || item.type !== kind) missing.push(`${kind}(of)`);
    }
    assert.deepEqual(missing, []);
});

test('every registered pack kind has a builder', () => {
    const noBuilder = [];
    for (const kind of FX_PACK_KINDS) {
        const owner = packOfKind(kind);
        if (!owner || typeof owner.builders[kind] !== 'function') noBuilder.push(kind);
    }
    assert.deepEqual(noBuilder, []);
});

// 题材包总开关：在设置里打开、关闭设置后重新启动，读回来仍为开（存档与 normalize 都不能把它丢掉或重置）。
test('gate:fx-packs:pack-switch-survives-close-and-reload', async () => {
    const { bootstrapIGS, createMemoryStorage } = await import('../src/index.js');
    const { FX_PACKS_ACTIVE, packSwitchPath } = await import('../src/scene/fx-packs.js');
    const { normalizeReaderSettings } = await import('../src/visual/igs-ui/settings-host-normalize.js');
    const storage = createMemoryStorage();
    const boot = () => bootstrapIGS({ global: { localStorage: storage }, autoAttachMagicWand: false, tavernSettingsSync: false, hostAdapter: { getCurrentMessage: async () => null, typeAndSend: async () => ({ ok: true }) } });
    const paths = FX_PACKS_ACTIVE.map((pack) => `readerSettings.${packSwitchPath(pack)}`);
    const valueAt = (obj, path) => path.split('.').reduce((node, key) => (node && typeof node === 'object' ? node[key] : undefined), obj);
    let vn = boot();
    let settings = vn.openSettings({ mode: 'pc' }).controller;
    // defaultOn 的通用包（镜头空间、立绘变形、戏剧节拍、地点与场景）出厂就是开，再 toggle 会变关；只把还关着的拨到开。
    const before = vn.getUnifiedSettings({});
    const initial = { readerSettings: normalizeReaderSettings(before.readerSettings) };
    for (const path of paths) if (valueAt(initial, path) !== true) settings.toggle(path);
    assert.equal(settings.close().ok, true);
    vn.destroy();
    vn = boot();
    try {
        const unified = vn.getUnifiedSettings({});
        const normalized = { readerSettings: normalizeReaderSettings(unified.readerSettings) };
        for (const path of paths) {
            assert.equal(valueAt(unified, path), true, `${path} 存档后应为开`);
            assert.equal(valueAt(normalized, path), true, `${path} normalize 后应为开`);
        }
        settings = vn.openSettings({ mode: 'pc' }).controller;
        settings.goToPath(paths[0]);
        for (const path of paths) {
            const html = settings.getSnapshot().html;
            if (!html.includes(`data-switch="${path}"`)) settings.goToPath(path);
            assert.match(settings.getSnapshot().html, new RegExp(`data-switch="${path.replace(/\./g, '\.')}" aria-pressed="true"`), `${path} 重新打开设置后应显示为开`);
        }
        settings.close();
    } finally {
        vn.destroy();
    }
});

// 题材包总开关打开时全部细项一起开；关掉时细项原样保留；defaultOn 通用包开关不往草稿里写细项。
test('gate:fx-packs:pack-switch-on-enables-kinds', async () => {
    const { bootstrapIGS, createMemoryStorage } = await import('../src/index.js');
    const { getPack, packSwitchPath } = await import('../src/scene/fx-packs.js');
    const { normalizeReaderSettings } = await import('../src/visual/igs-ui/settings-host-normalize.js');
    const storage = createMemoryStorage();
    const boot = () => bootstrapIGS({ global: { localStorage: storage }, autoAttachMagicWand: false, tavernSettingsSync: false, hostAdapter: { getCurrentMessage: async () => null, typeAndSend: async () => ({ ok: true }) } });
    let vn = boot();
    try {
        let settings = vn.openSettings({ mode: 'pc' }).controller;
        const pack = getPack('harem');
        settings.setValue(`readerSettings.${packSwitchPath(pack)}`, true);
        assert.equal(settings.close().ok, true);
        vn.destroy(); vn = boot();
        const opened = normalizeReaderSettings(vn.getUnifiedSettings({}).readerSettings);
        for (const kind of pack.kinds) assert.equal(opened.dailyFx[kind], true, `${kind} 开总开关后应为开`);
        settings = vn.openSettings({ mode: 'pc' }).controller;
        settings.setValue('readerSettings.dailyFx.hmselect', false);
        settings.setValue(`readerSettings.${packSwitchPath(pack)}`, false);
        assert.equal(settings.close().ok, true);
        vn.destroy(); vn = boot();
        const closed = normalizeReaderSettings(vn.getUnifiedSettings({}).readerSettings);
        assert.equal(closed.dailyFx.hmselect, false, '关总开关不动细项勾选');
        assert.equal(closed.dailyFx.hmprobe, true, '关总开关保留其余勾选');
        const camera = getPack('camera');
        assert.equal(camera.defaultOn, true);
        settings = vn.openSettings({ mode: 'pc' }).controller;
        settings.setValue(`readerSettings.${packSwitchPath(camera)}`, false);
        settings.setValue(`readerSettings.${packSwitchPath(camera)}`, true);
        assert.equal(settings.close().ok, true);
        vn.destroy(); vn = boot();
        const after = normalizeReaderSettings(vn.getUnifiedSettings({}).readerSettings);
        for (const kind of camera.kinds) assert.equal(after.dailyFx[kind], true, `${kind} defaultOn 通用包关过再开仍默认开`);
    } finally {
        vn.destroy();
    }
});
