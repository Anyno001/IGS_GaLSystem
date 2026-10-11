import test from 'node:test';
import assert from 'node:assert/strict';
import { FX_PACK_SFX_DEFS } from '../src/scene/fx-packs.js';
import { DAILY_SFX, DAILY_SFX_KINDS, dailySfxDuration, playDailySfx } from '../src/visual/igs-ui/fx-daily-sfx.js';
import { COUNT_STEP_S, FESTIVAL_COUNT_MIN, FESTIVAL_COUNT_MAX } from '../src/visual/igs-ui/fx-festival-sfx.js';
import { BACKSTAGE_FIRST_MS, BACKSTAGE_STEP_MS, BPM_STEPS, DEBUT_STEP_MS } from '../src/visual/igs-ui/fx-idol-sfx.js';

const EXPECTED = ['shutter', 'bell', 'broadcast', 'firework', 'firework-pop', 'alarm', 'vibrate', 'omikuji', 'receipt', 'pat', 'paper', 'sticky', 'clink-glass', 'clink-ceramic', 'clink-plastic', 'clink-can', 'clink-wood', 'clink-metal', 'tv-on', 'clock', 'drum', 'lantern', 'touch', 'spell', 'potion', 'owl', 'broom', 'hourglass', 'howler', 'blackout', 'knock1', 'knock2', 'knock3', 'knock4', 'knock5', 'knock6', 'murmur',
    'screech', 'rein', 'engine', 'giddyup', 'train-depart', 'arrive-chime', 'horn', 'door', 'jet', 'touchdown', 'soar', 'gust', 'alight', 'propeller', 'creak', 'sleep', 'wake', 'dressup', 'rustle', 'punch', 'hiss', 'shower', 'splash', 'dryer', 'dive', 'blub', 'vacuum',
    'sing', 'dance', 'fish', 'draw', 'music', 'ride', 'sweep', 'shopping', 'stroll', 'bike-bell', 'bike-ride', 'bike-skid',
    'sword-ring', 'talisman', 'guqin', 'candle', 'pill', 'qi', 'tap', 'cook', 'fever', 'cat', 'rps', 'tea', 'go', 'go-play', 'tea-pour', 'bow-sleeve', 'edict-open', 'freeze-point', 'light-step', 'qi-chime', 'qi-break', 'shield-ward', 'tend-soft', 'carry-lift', 'bubble-pop',
    'game-boot', 'game-win', 'game-lose', 'game-draw', 'game-versus', 'game-ko', 'game-combo', 'game-snatch',
    'campus-chalk', 'campus-pass', 'campus-drawer', 'campus-rollcall', 'campus-exam', 'campus-festival', 'campus-graduate', 'campus-button'];

function fakeParam(log) {
    return {
        value: 0,
        setValueAtTime() {},
        linearRampToValueAtTime(v) { log.push(v); },
        exponentialRampToValueAtTime(v) { assert.ok(v > 0, 'exponential ramps need positive targets'); log.push(v); },
    };
}

function fakeContext() {
    const gains = [];
    const node = (extra = {}) => ({ connect() {}, disconnect() {}, start() {}, stop() {}, ...extra });
    const context = {
        state: 'running',
        currentTime: 0,
        sampleRate: 8000,
        destination: node(),
        created: 0,
        resume: () => Promise.resolve(),
        createOscillator() { context.created += 1; return node({ type: '', frequency: fakeParam([]) }); },
        createGain() { context.created += 1; return node({ gain: fakeParam(gains) }); },
        createBiquadFilter() { context.created += 1; return node({ type: '', Q: fakeParam([]), frequency: fakeParam([]) }); },
        createBufferSource() { context.created += 1; return node({ buffer: null, loop: false }); },
        createBuffer(channels, length) { const data = new Float32Array(length); return { getChannelData: () => data }; },
    };
    return { context, gains };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test('gate: daily sfx exposes every requested kind', () => {
    assert.deepEqual([...DAILY_SFX_KINDS].sort(), [...EXPECTED, ...Object.keys(FX_PACK_SFX_DEFS)].sort());
});

test('gate: daily sfx hands a non-empty description to the scheduler for every kind', () => {
    for (const kind of DAILY_SFX_KINDS) {
        const calls = [];
        const handle = playDailySfx(kind, { enabled: true, volume: 0.5 }, { audioScheduler: (job) => { calls.push(job); return { stop() {} }; } });
        assert.ok(handle, kind);
        assert.equal(calls.length, 1);
        assert.equal(calls[0].kind, kind);
        assert.equal(calls[0].volume, 0.5);
        assert.ok(calls[0].partials.length + calls[0].noise.length > 0, `${kind} has content`);
        assert.equal(calls[0].partials, DAILY_SFX[kind].partials);
        assert.equal(calls[0].noise, DAILY_SFX[kind].noise);
    }
});

test('gate: daily sfx layers stay modest, finite and short', () => {
    for (const kind of DAILY_SFX_KINDS) {
        const { partials, noise } = DAILY_SFX[kind];
        for (const q of [...partials, ...noise]) {
            assert.ok(q.gain > 0 && q.gain <= 1, `${kind} gain in range`);
            assert.ok(q.start >= 0 && q.duration > 0, `${kind} timing valid`);
            assert.ok([q.start, q.duration, q.gain].every(Number.isFinite));
        }
        const countdown = /^fest-count-(\d+)(-cn)?$/.exec(kind);
        const debut = /^id-debut([2-6])$/.exec(kind);
        const metronome = /^id-metro(\d+)$/.exec(kind);
        const backstage = /^id-backstage([45])$/.exec(kind);
        let limit = 5;
        if (countdown) {
            const count = Number(countdown[1]);
            assert.ok(count >= FESTIVAL_COUNT_MIN && count <= FESTIVAL_COUNT_MAX);
            limit = count * COUNT_STEP_S + (countdown[2] ? 2 : 0.5);
            assert.ok(dailySfxDuration(kind) >= count * COUNT_STEP_S, `${kind} reaches zero before its ending`);
        } else if (debut) {
            limit = 0.9 + (Number(debut[1]) - 1) * DEBUT_STEP_MS / 1000 + 0.5 + 1.45;
        } else if (metronome) {
            const bpm = Number(metronome[1]);
            assert.ok(BPM_STEPS.includes(bpm));
            limit = 0.24 + 15 * 60 / bpm;
        } else if (backstage) {
            limit = (BACKSTAGE_FIRST_MS + Number(backstage[1]) * BACKSTAGE_STEP_MS) / 1000 + 0.45;
        }
        assert.ok(dailySfxDuration(kind) <= limit + 1e-9, `${kind} stays within ${limit}s`);
    }
    assert.ok(Math.abs(dailySfxDuration('bell') - 4.5) < 0.3);
    assert.ok(Math.abs(dailySfxDuration('broadcast') - 1.6) < 0.2);
    assert.ok(DAILY_SFX.firework.partials.some((q) => q.from === 600 && q.to === 1800));
    assert.ok(!DAILY_SFX['firework-pop'].partials.some((q) => q.from === 600 && q.to === 1800));
    assert.equal(DAILY_SFX.alarm.partials.length, 16);
});

test('gate: daily sfx rejects unknown kinds and muted settings', () => {
    const scheduler = () => ({ stop() {} });
    assert.equal(playDailySfx('nope', { enabled: true, volume: 0.5 }, { audioScheduler: scheduler }), null);
    assert.equal(playDailySfx('bell', null, { audioScheduler: scheduler }), null);
    assert.equal(playDailySfx('bell', { enabled: false, volume: 0.5 }, { audioScheduler: scheduler }), null);
    assert.equal(playDailySfx('bell', { enabled: true, volume: 0 }, { audioScheduler: scheduler }), null);
});

test('gate: daily sfx returns null without WebAudio and no scheduler', () => {
    assert.equal(playDailySfx('shutter', { enabled: true, volume: 0.5 }), null);
});

test('gate: daily sfx synthesizes every kind on an injected context and scales with volume', async () => {
    for (const kind of DAILY_SFX_KINDS) {
        const full = fakeContext();
        const half = fakeContext();
        const a = playDailySfx(kind, { enabled: true, volume: 1 }, { contextFactory: () => full.context });
        const b = playDailySfx(kind, { enabled: true, volume: 0.5 }, { contextFactory: () => half.context });
        assert.ok(a && typeof a.stop === 'function', kind);
        await tick();
        assert.ok(full.context.created > 0, `${kind} created nodes`);
        const peakFull = Math.max(...full.gains);
        const peakHalf = Math.max(...half.gains);
        assert.ok(peakFull > 0 && peakFull <= 0.4, `${kind} peak ${peakFull} stays modest`);
        assert.ok(Math.abs(peakHalf - peakFull / 2) < 1e-9, `${kind} scales with volume`);
        a.stop();
        b.stop();
    }
});

test('gate: daily sfx survives a failing context factory', () => {
    const handle = playDailySfx('paper', { enabled: true, volume: 0.5 }, { contextFactory: () => { throw new Error('no audio'); } });
    assert.equal(handle, null);
});
