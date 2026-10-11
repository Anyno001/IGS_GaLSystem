// 与 chat-sfx 的 partial 同形；本地定义是为避开 chat-sfx -> scene-audio -> fx-packs 的循环引用。
const p = (wave, from, to, start, duration, gain, extra = {}) => Object.freeze({ wave, from, to, start, duration, gain, ...extra });

const n = (start, duration, gain, extra = {}) => Object.freeze({ start, duration, gain, filter: 'bandpass', freq: 2000, q: 1, attack: 0.002, ...extra });

function seeded(seed) {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

const bellNote = (freq, start, ring, gain) => [
    p('sine', freq, freq, start, ring, gain, { attack: 0.004 }),
    p('sine', freq * 2, freq * 2, start, ring * 0.45, gain * 0.22, { attack: 0.003 }),
    p('sine', freq * 2.76, freq * 2.76, start, ring * 0.3, gain * 0.2, { attack: 0.002 }),
];

const flashRand = seeded(211);
const flashBursts = Array.from({ length: 9 }, (_, i) => {
    const at = 0.05 + i * 0.17 + flashRand() * 0.08;
    return [
        n(at, 0.03, 0.5, { filter: 'highpass', freq: 3600, q: 0.7, attack: 0.001 }),
        n(at + 0.01, 0.07, 0.3, { filter: 'lowpass', freq: 520, q: 0.8, attack: 0.002 }),
        p('sine', 1900 + flashRand() * 900, 600, at, 0.12, 0.05, { attack: 0.001, sweep: 1 }),
    ];
}).flat();

const cheerRand = seeded(317);
const cheerClaps = Array.from({ length: 22 }, () => n(0.5 + cheerRand() * 1.8, 0.02 + cheerRand() * 0.03, 0.1 + cheerRand() * 0.14, {
    filter: 'bandpass', freq: 1800 + cheerRand() * 2600, q: 0.8, attack: 0.001,
}));

const whistle = (start, ring, gain) => [
    p('sine', 2850, 2950, start, ring, gain, { attack: 0.01, vibrato: { rate: 38, depth: 0.03 } }),
    p('sine', 3410, 3480, start, ring, gain * 0.35, { attack: 0.01, vibrato: { rate: 34, depth: 0.03 } }),
];

export const PLACES_SFX_DEFS = Object.freeze({
    'pl-ding': {
        partials: [...bellNote(1318.5, 0, 1.1, 0.34), ...bellNote(987.77, 0.34, 1.4, 0.3)],
        noise: [n(0, 0.03, 0.12, { filter: 'highpass', freq: 4200, q: 0.7, attack: 0.001 })],
    },
    'pl-doors': {
        partials: [p('sine', 90, 60, 0, 0.5, 0.12, { attack: 0.02, sweep: 1 })],
        noise: [
            n(0, 0.55, 0.18, { filter: 'lowpass', freq: 320, freqTo: 180, q: 0.7, attack: 0.08, env: 'flat' }),
            n(0.02, 0.06, 0.3, { freq: 900, q: 1.4, attack: 0.001 }),
        ],
    },
    'pl-eaves': {
        partials: [p('sine', 140, 110, 0, 0.5, 0.06, { attack: 0.05, sweep: 1 })],
        noise: [
            n(0, 0.9, 0.12, { filter: 'lowpass', freq: 420, freqTo: 300, q: 0.8, attack: 0.2, env: 'flat' }),
            n(0.35, 0.05, 0.16, { filter: 'lowpass', freq: 600, q: 1.2, attack: 0.002 }),
        ],
    },
    'pl-flashes': { partials: [], noise: flashBursts },
    'pl-cheer': {
        partials: [p('sine', 220, 330, 0, 1.4, 0.04, { attack: 0.3, sweep: 1 })],
        noise: [n(0, 2.6, 0.3, { filter: 'bandpass', freq: 900, freqTo: 1500, q: 0.6, attack: 0.5, env: 'flat' }), ...cheerClaps],
    },
    'pl-whistle': {
        partials: [...whistle(0, 0.5, 0.2), ...whistle(0.62, 0.32, 0.18)],
        noise: [n(0, 0.4, 0.04, { filter: 'highpass', freq: 3800, q: 0.7, attack: 0.02, env: 'flat' })],
    },
    'pl-gun': {
        partials: [p('sine', 180, 50, 0, 0.22, 0.4, { attack: 0.001, sweep: 1 })],
        noise: [n(0, 0.05, 0.6, { filter: 'highpass', freq: 2400, q: 0.7, attack: 0.001 }), n(0, 0.4, 0.28, { filter: 'lowpass', freq: 900, freqTo: 220, q: 0.7, attack: 0.002 })],
    },
    'pl-finish': {
        partials: [...bellNote(784, 0, 0.5, 0.26), ...bellNote(1046.5, 0.12, 0.8, 0.28)],
        noise: [n(0, 0.35, 0.14, { filter: 'highpass', freq: 3000, q: 0.7, attack: 0.1 })],
    },
    'pl-chest': {
        partials: [
            p('sine', 120, 70, 0, 0.35, 0.3, { attack: 0.004, sweep: 1 }),
            ...bellNote(1318.5, 0.38, 0.9, 0.2), ...bellNote(1760, 0.5, 1.1, 0.2), ...bellNote(2093, 0.62, 1.3, 0.18),
        ],
        noise: [
            n(0, 0.45, 0.25, { filter: 'bandpass', freq: 700, freqTo: 380, q: 3, attack: 0.04 }),
            n(0.36, 0.08, 0.3, { filter: 'highpass', freq: 3600, q: 0.7, attack: 0.001 }),
        ],
    },
    'pl-levelup': {
        partials: [523.25, 659.25, 783.99, 1046.5, 1318.5].flatMap((freq, i) => [
            p('triangle', freq, freq, i * 0.09, i === 4 ? 0.9 : 0.16, 0.26, { attack: 0.004 }),
            p('sine', freq * 2, freq * 2, i * 0.09, i === 4 ? 0.5 : 0.1, 0.07, { attack: 0.003 }),
        ]),
        noise: [n(0.4, 0.5, 0.1, { filter: 'highpass', freq: 5000, q: 0.7, attack: 0.05 })],
    },
    'pl-quest-take': {
        partials: [p('sine', 150, 80, 0.52, 0.12, 0.32, { attack: 0.002, sweep: 1 })],
        noise: [n(0, 0.5, 0.16, { filter: 'bandpass', freq: 2400, freqTo: 3800, q: 0.8, attack: 0.05, env: 'flat' }), n(0.52, 0.04, 0.4, { freq: 1500, q: 1.3, attack: 0.001 })],
    },
    'pl-quest-done': {
        partials: [...bellNote(1046.5, 0.5, 0.8, 0.2), ...bellNote(1568, 0.62, 0.9, 0.16), p('sine', 150, 80, 0.5, 0.1, 0.24, { attack: 0.002, sweep: 1 })],
        noise: [n(0, 0.45, 0.12, { filter: 'bandpass', freq: 2400, freqTo: 3400, q: 0.8, attack: 0.05, env: 'flat' }), n(0.62, 0.3, 0.1, { filter: 'highpass', freq: 5000, q: 0.7, attack: 0.02 })],
    },
    'pl-quest-fail': {
        partials: [p('sine', 110, 52, 0.6, 0.4, 0.34, { attack: 0.004, sweep: 1 })],
        noise: [n(0, 0.4, 0.14, { filter: 'bandpass', freq: 2200, freqTo: 3200, q: 0.8, attack: 0.05, env: 'flat' }), n(0.52, 0.16, 0.3, { filter: 'highpass', freq: 2600, freqTo: 1200, q: 0.7, attack: 0.001, env: 'flat' }), n(0.6, 0.2, 0.22, { filter: 'lowpass', freq: 400, q: 0.8, attack: 0.002 })],
    },
    'pl-route': {
        partials: [p('sine', 880, 880, 0, 0.1, 0.16, { attack: 0.003 }), p('sine', 1318.5, 1318.5, 0.14, 0.4, 0.2, { attack: 0.003 })],
        noise: [n(0, 0.5, 0.06, { filter: 'highpass', freq: 3200, q: 0.7, attack: 0.08, env: 'flat' })],
    },
    'pl-breeze': {
        partials: [],
        noise: [n(0, 2.4, 0.2, { filter: 'bandpass', freq: 500, freqTo: 900, q: 0.6, attack: 0.7, env: 'flat' })],
    },
});
