import test from 'node:test';
import assert from 'node:assert/strict';
import { bootstrapIGS } from '../src/index.js';

function memoryStorage(seed = {}) {
    const m = new Map(Object.entries(seed));
    return { get length() { return m.size; }, key: (i) => [...m.keys()][i] ?? null, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

test('settings-energy: 阅读器选了省电画质时，设置器根节点带上 data-igs-quality="low"', () => {
    const open = (quality) => {
        const storage = memoryStorage({ 'igs-reader-settings-v9-default': JSON.stringify({ performance: { quality } }) });
        const vn = bootstrapIGS({ global: { localStorage: storage }, autoAttachMagicWand: false, hostAdapter: { getCurrentMessage: async () => null, typeAndSend: async () => ({ ok: true }) } });
        try {
            return vn.openSettings({ tab: 'basic', mode: 'pc' }).controller.getSnapshot().html;
        } finally {
            vn.destroy();
        }
    };
    assert.match(open('low'), /<div id="igs-unified-settings"[^>]* data-igs-quality="low">/);
    assert.doesNotMatch(open('normal'), /data-igs-quality=/);
});
