// 偶像包的合成音效：振荡器与滤波噪声。形状同 chat-sfx 的 partial；不能 import chat-sfx（会经 scene-audio 回连成环）。
const p = (wave, from, to, start, duration, gain, extra = {}) => Object.freeze({ wave, from, to, start, duration, gain, ...extra });
const n = (start, duration, gain, extra = {}) => Object.freeze({ start, duration, gain, filter: 'bandpass', freq: 2000, q: 1, attack: 0.002, ...extra });

function seeded(seed) {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

const bell = (freq, start, ring, gain) => [
    p('sine', freq, freq, start, ring, gain, { attack: 0.004 }),
    p('sine', freq * 2, freq * 2, start, ring * 0.45, gain * 0.22, { attack: 0.003 }),
    p('sine', freq * 2.76, freq * 2.76, start, ring * 0.3, gain * 0.2, { attack: 0.002 }),
];
const thump = (start, from, to, gain) => p('sine', from, to, start, 0.16, gain, { attack: 0.003, sweep: 1 });
const click = (start, freq, gain = 0.3) => n(start, 0.02, gain, { freq, q: 2.4, attack: 0.001 });

const crowdRand = seeded(523);
const cheers = Array.from({ length: 16 }, () => n(0.4 + crowdRand() * 1.6, 0.02 + crowdRand() * 0.03, 0.1 + crowdRand() * 0.12, { freq: 1800 + crowdRand() * 2600, q: 0.8, attack: 0.001 }));

export const DEBUT_STEP_MS = 640;
export const SIGN_STEP_MS = 420;
export const SHUTTER_STEP_MS = 220;
export const BPM_STEPS = Object.freeze([60, 80, 100, 120, 140, 160, 180]);
export const BACKSTAGE_FIRST_MS = 1500;
export const BACKSTAGE_STEP_MS = 900;

// 名次逐个揭晓：每个名次一记鼓点加短铃（音高逐级上行），最后一个（第一名）前停顿再加一记重鼓与亮铃。
const debutDef = (count) => ({
    partials: Array.from({ length: count }, (_, i) => {
        const t = 0.9 + i * (DEBUT_STEP_MS / 1000) + (i === count - 1 ? 0.5 : 0);
        return [thump(t, 130, 58, i === count - 1 ? 0.7 : 0.45), ...bell(659.25 * (1 + i * 0.12), t + 0.05, i === count - 1 ? 1.4 : 0.5, i === count - 1 ? 0.3 : 0.16)];
    }).flat(),
    noise: [n(0.9 + (count - 1) * (DEBUT_STEP_MS / 1000) + 0.5, 0.8, 0.2, { filter: 'highpass', freq: 4800, q: 0.7, attack: 0.04 })],
});

// 逐笔签名：每个字一串笔划摩擦，写完一声亮铃。
const signDef = (chars) => ({
    partials: bell(1568, 0.3 + chars * (SIGN_STEP_MS / 1000), 0.7, 0.14),
    noise: Array.from({ length: chars }, (_, c) => Array.from({ length: 4 }, (_, k) => n(0.3 + c * (SIGN_STEP_MS / 1000) + k * 0.09, 0.07, 0.16, { freq: 2400 + ((c + k) % 3) * 500, q: 1.6, attack: 0.01 }))).flat(),
});

const shutterDef = (shots) => ({
    partials: [p('sine', 1500, 2100, 0, 0.25, 0.12, { attack: 0.01, sweep: 1 }), p('sine', 2100, 2100, 0.6, 0.08, 0.2, { attack: 0.002 })],
    noise: [n(0, 0.28, 0.1, { freq: 2800, q: 2, attack: 0.02 }), ...Array.from({ length: shots }, (_, i) => {
        const at = 1.0 + i * (SHUTTER_STEP_MS / 1000);
        return [click(at, 2600, 0.5), n(at + 0.03, 0.05, 0.3, { filter: 'lowpass', freq: 700, q: 0.8, attack: 0.002 })];
    }).flat()],
});

// 节拍器：预备四拍（5、6、7、8）与十二拍滴答，第一拍重音；间隔随 BPM。
const metronomeDef = (bpm) => {
    const gap = 60 / bpm;
    return {
        partials: Array.from({ length: 16 }, (_, i) => p('square', i % 4 === 0 ? 1500 : 1000, i % 4 === 0 ? 1500 : 1000, 0.2 + i * gap, 0.04, i < 4 ? 0.1 : 0.2, { attack: 0.001, lowpass: 3000 })),
        noise: Array.from({ length: 16 }, (_, i) => n(0.2 + i * gap, 0.03, i < 4 ? 0.1 : 0.2, { freq: 1800, q: 1.5, attack: 0.001 })),
    };
};

// 候场：耳返静电与节目组杂音，倒数每一声短哔，最后一声长哔（上台）。
const backstageDef = (count) => ({
    partials: [...Array.from({ length: count }, (_, i) => p('sine', 1000, 1000, BACKSTAGE_FIRST_MS / 1000 + i * (BACKSTAGE_STEP_MS / 1000), 0.12, 0.2, { attack: 0.002 })),
        p('sine', 1500, 1500, BACKSTAGE_FIRST_MS / 1000 + count * (BACKSTAGE_STEP_MS / 1000), 0.45, 0.24, { attack: 0.002 })],
    noise: [n(0, BACKSTAGE_FIRST_MS / 1000 + count * (BACKSTAGE_STEP_MS / 1000), 0.06, { filter: 'bandpass', freq: 600, q: 0.6, attack: 0.5, env: 'flat' }), click(BACKSTAGE_FIRST_MS / 1000 - 0.1, 3000, 0.3)],
});

export const IDOL_SFX_DEFS = Object.freeze({
    ...Object.fromEntries([2, 3, 4, 5, 6].map((c) => [`id-debut${c}`, debutDef(c)])),
    ...Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`id-sign${i + 1}`, signDef(i + 1)])),
    ...Object.fromEntries([3, 4, 5, 6, 7, 8].map((c) => [`id-shutter${c}`, shutterDef(c)])),
    ...Object.fromEntries(BPM_STEPS.map((b) => [`id-metro${b}`, metronomeDef(b)])),
    ...Object.fromEntries([3, 4, 5].map((c) => [`id-backstage${c}`, backstageDef(c)])),
    // 升降台升起：低频机械上行,舞台灯点亮的一声高亮和弦。
    'id-lift': {
        partials: [p('sawtooth', 70, 140, 0, 1.4, 0.16, { attack: 0.2, sweep: 1, lowpass: 600 }), ...bell(1046.5, 1.3, 1.0, 0.22), ...bell(1568, 1.38, 1.1, 0.18)],
        noise: [n(0, 1.4, 0.14, { filter: 'lowpass', freq: 260, freqTo: 520, q: 0.7, attack: 0.3, env: 'flat' }), n(1.3, 0.5, 0.16, { filter: 'highpass', freq: 4800, q: 0.7, attack: 0.04 })],
    },
    'id-encore': {
        partials: [p('sine', 200, 300, 0, 1.2, 0.05, { attack: 0.3, sweep: 1 })],
        noise: [n(0, 2.0, 0.26, { freq: 1100, freqTo: 1600, q: 0.6, attack: 0.5, env: 'flat' }), ...cheers],
    },
    'id-rec': {
        partials: [p('sine', 880, 880, 0.04, 0.07, 0.22, { attack: 0.002 }), p('sine', 1320, 1320, 0.16, 0.12, 0.2, { attack: 0.002 })],
        noise: [click(0, 3000, 0.3), n(0.4, 0.8, 0.04, { filter: 'lowpass', freq: 300, q: 0.7, attack: 0.2, env: 'flat' })],
    },
    'id-lightsea': {
        partials: [p('sine', 220, 330, 0, 1.8, 0.05, { attack: 0.5, sweep: 1 }), ...bell(1318.5, 0.9, 1.2, 0.14)],
        noise: [n(0, 2.6, 0.2, { freq: 900, freqTo: 1400, q: 0.6, attack: 0.7, env: 'flat' }), ...cheers.slice(0, 8)],
    },
    'id-award': {
        partials: [p('sine', 90, 50, 0, 0.3, 0.42, { attack: 0.004, sweep: 1 }), ...[523.25, 659.25, 783.99, 1046.5].flatMap((f, i) => [p('triangle', f, f, 0.2 + i * 0.1, i === 3 ? 0.9 : 0.18, 0.24, { attack: 0.004 }), p('sine', f * 2, f * 2, 0.2 + i * 0.1, 0.4, 0.06, { attack: 0.003 })])],
        noise: [n(0.2, 0.9, 0.2, { filter: 'highpass', freq: 5200, q: 0.7, attack: 0.04 }), ...cheers.slice(0, 10)],
    },
    'id-envelope': {
        partials: [p('sine', 110, 104, 0, 1.2, 0.3, { attack: 0.3 }), p('triangle', 164.8, 155, 0.1, 1.0, 0.16, { attack: 0.3 })],
        noise: [n(0.9, 0.3, 0.2, { freq: 3000, q: 1.2, attack: 0.02 })],
    },
    'id-banner': {
        partials: [p('sine', 260, 520, 0, 0.5, 0.12, { attack: 0.04, sweep: 1 }), ...bell(1318.5, 0.5, 0.6, 0.12)],
        noise: [n(0, 0.5, 0.12, { filter: 'bandpass', freq: 1200, freqTo: 2400, q: 0.8, attack: 0.1, env: 'flat' }), ...cheers.slice(0, 5)],
    },
});
