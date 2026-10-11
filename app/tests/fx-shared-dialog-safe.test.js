import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FX_STYLE_TEXT } from '../src/visual/igs-ui/fx-style.js';

const SRC = new URL('../src/visual/igs-ui/', import.meta.url);
const read = (f) => fs.readFileSync(new URL(f, SRC), 'utf8');
const rule = (file, sel) => read(file).split(/\r?\n/).filter((l) => l.includes(sel + '{')).join(' ');

test('gate:fx shared dialog-safe variables are defined once on #igs-overlay', () => {
    assert.ok(FX_STYLE_TEXT.includes('#igs-overlay{--igs-fx-safe:min(calc(var(--igs-dialog-h,160px) + 32px),62%);--igs-fx-vis:calc(100% - var(--igs-fx-safe));}'));
    assert.ok(FX_STYLE_TEXT.includes('#igs-overlay[data-igs-live-full]{--igs-fx-safe:64px;}'));
    assert.doesNotMatch(read('fx-idol-style.js'), /--igs-id-(safe|vis)/);
});

test('gate:fx packs keep user-visible bottom elements above the dialog', () => {
    const cases = [
        ['fx-variety-style.js', ['igs-vy-iv-person', 'igs-vy-ex-case', 'igs-vy-ex-card', 'igs-vy-rp-frame', 'igs-vy-rp-title']],
        ['fx-places-style.js', ['igs-pl-pol-tape.is-bottom', 'igs-pl-kit-steam', 'igs-pl-kit-steam.is-b', 'igs-pl-man-candle', 'igs-pl-heard']],
        ['fx-myth-style.js', ['igs-myth-amb-eyes']],
        ['fx-beats-style.js', ['igs-bt-reveal', 'igs-bt-reunion-motes i']],
        ['fx-abo-style.js', ['igs-abo-nest']],
        ['fx-daily-xianxia-style.js', ['igs-dfx-biguan-text']],
        ['fx-daily-care-style.js', ['igs-dfx-carry-stage']],
        ['fx-pack-coc-css-a.js', ['igs-coc-symptom', 'igs-coc-tear']],
        ['fx-pack-coc-css-b.js', ['igs-coc-warp-slit']],
        ['fx-pack-coc-css-c.js', ['igs-coc-accuse-line', 'igs-coc-stats', 'igs-coc-lens']],
        ['fx-festival-style.js', ['igs-dfx-bday-cake', 'igs-dfx-gift-stage', 'igs-dfx-ring-stage', 'igs-dfx-pt-stage']],
    ];
    for (const [file, sels] of cases) {
        for (const sel of sels) {
            const r = rule(file, '.' + sel);
            assert.match(r, /var\(--igs-fx-(safe|vis)\)/, `${file} ${sel}`);
        }
    }
});
