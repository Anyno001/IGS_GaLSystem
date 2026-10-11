import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

// 演出文件不得用 emoji 当图标（图标一律 SVG）；直播路人弹幕除外。
const dir = path.resolve(import.meta.dirname, '../src/visual/igs-ui');
const EMOJI = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B50}\u{2B55}\u{FE0F}]/u;
test('fx-*.js 不含 emoji 码位（danmaku / live-chatter 除外）', () => {
    const bad = [];
    for (const f of fs.readdirSync(dir)) {
        if (!/^fx-.*\.js$/.test(f) || /danmaku|live-chatter/.test(f)) continue;
        fs.readFileSync(path.join(dir, f), 'utf8').split('\n').forEach((line, i) => { if (EMOJI.test(line)) bad.push(`${f}:${i + 1}`); });
    }
    assert.deepEqual(bad, []);
});
