// 人生大事与节日的合成音效：与 fx-daily-sfx 同一份格式 { partials, noise }，由 fx-pack-festival.js 的 sfx 字段登记。
// partial 工厂本地定义（与 chat-sfx 同形），避免清单模块在加载期依赖 chat-sfx 造成循环初始化。
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
    p('sine', freq * 2.76, freq * 2.76, start, 0.32, gain * 0.28, { attack: 0.002 }),
];

const sparkle = (freq, start, gain) => [
    p('sine', freq, freq, start, 0.42, gain, { attack: 0.002 }),
    p('sine', freq * 2.01, freq * 2.01, start, 0.22, gain * 0.3, { attack: 0.001 }),
];

function crackle(rand, from, span, count, gain = 0.2) {
    return Array.from({ length: count }, () => n(from + rand() * span, 0.012 + rand() * 0.02, gain + rand() * 0.2, {
        filter: 'highpass', freq: 2600 + rand() * 2400, q: 0.7, attack: 0.001,
    })).sort((a, b) => a.start - b.start);
}

export const COUNT_STEP_S = 0.7;

const crackerBurst = (offset) => [...crackle(seeded(31), offset, 1.9, 34, 0.22), n(offset, 2, 0.1, { filter: 'lowpass', freq: 260, q: 0.6, attack: 0.05 })];

// 倒数：每秒一声嘀；古代到零时接一串爆竹，现代到零时接清亮的收尾音（烟花本身的声音由演出里的 firework 音效负责）。
function countdown(count, ancient) {
    const partials = [];
    for (let i = 0; i < count; i += 1) partials.push(p('sine', 880, 880, i * COUNT_STEP_S, 0.09, 0.32, { attack: 0.002 }));
    const end = count * COUNT_STEP_S;
    if (ancient) return { partials, noise: crackerBurst(end) };
    partials.push(...sparkle(1318.5, end, 0.34), ...sparkle(1760, end + 0.06, 0.28));
    return { partials, noise: [] };
}

const rand = seeded(23);

export const FESTIVAL_COUNT_MIN = 3;
export const FESTIVAL_COUNT_MAX = 10;

const countdownDefs = {};
for (let count = FESTIVAL_COUNT_MIN; count <= FESTIVAL_COUNT_MAX; count += 1) {
    countdownDefs[`fest-count-${count}`] = countdown(count, false);
    countdownDefs[`fest-count-${count}-cn`] = countdown(count, true);
}

export const FESTIVAL_SFX_DEFS = Object.freeze({
    ...countdownDefs,
    'fest-blow': {
        partials: [
            ...sparkle(523.25, 2.1, 0.3), ...sparkle(659.25, 2.25, 0.3), ...sparkle(783.99, 2.4, 0.3), ...sparkle(1046.5, 2.55, 0.34),
        ],
        noise: [
            n(0.7, 0.8, 0.5, { filter: 'lowpass', freq: 500, freqTo: 1500, q: 0.6, attack: 0.3 }),
            n(0.9, 0.4, 0.08, { freq: 2600, freqTo: 1800, q: 0.8, attack: 0.1 }),
            ...[1.5, 1.62, 1.74].map((t) => n(t, 0.05, 0.18, { filter: 'highpass', freq: 3200, q: 0.7, attack: 0.001 })),
        ],
    },
    'fest-pop': {
        partials: [p('sine', 220, 70, 0, 0.14, 0.5, { attack: 0.002, sweep: 1 })],
        noise: [n(0, 0.2, 0.55, { filter: 'highpass', freq: 2200, freqTo: 5000, q: 0.6, attack: 0.001 }), ...crackle(rand, 0.05, 0.4, 8, 0.1)],
    },
    'fest-xmas': {
        partials: [
            ...[2093, 2637, 3136, 2637, 3520, 3136, 2349].flatMap((f, i) => [
                p('sine', f, f, i * 0.16, 0.5, 0.12, { attack: 0.002 }),
                p('sine', f * 2.76, f * 2.76, i * 0.16, 0.18, 0.05, { attack: 0.001 }),
            ]),
            ...bellNote(523.25, 1.2, 1.0, 0.18), ...bellNote(659.25, 1.2, 1.0, 0.14), ...bellNote(783.99, 1.2, 1.0, 0.14),
        ],
        noise: [n(0, 1.1, 0.06, { freq: 5200, q: 0.9, attack: 0.04 })],
    },
    'fest-redpacket': {
        partials: [...sparkle(1318.5, 0.14, 0.34), ...sparkle(1760, 0.24, 0.36), ...sparkle(2217, 0.34, 0.3)],
        noise: [n(0, 0.2, 0.3, { freq: 3600, freqTo: 2400, q: 0.8, attack: 0.01 }), n(0.5, 0.22, 0.12, { freq: 3000, q: 0.9, attack: 0.02 })],
    },
    'fest-ring': {
        partials: [...sparkle(1568, 0.5, 0.3), ...sparkle(2093, 0.62, 0.3), ...sparkle(2637, 0.74, 0.26), ...bellNote(1046.5, 0.5, 1.1, 0.12)],
        noise: [n(0, 0.04, 0.5, { filter: 'highpass', freq: 1800, q: 0.7, attack: 0.001 }), n(0.28, 0.12, 0.3, { filter: 'lowpass', freq: 1400, q: 0.8, attack: 0.004 })],
    },
    'fest-wedding-bell': {
        partials: [
            ...[523.25, 659.25, 783.99, 659.25, 1046.5].flatMap((f, i) => bellNote(f, i * 0.5, 1.4, 0.26)),
            ...bellNote(261.63, 0, 2.4, 0.22),
        ],
        noise: [n(0, 0.04, 0.12, { freq: 2800, q: 1, attack: 0.001 })],
    },
    'fest-wedding-cn': {
        partials: [
            p('sine', 196, 188, 0, 1.8, 0.34, { attack: 0.01 }),
            p('sine', 392, 380, 0, 1.2, 0.14, { attack: 0.01 }),
            p('sine', 592, 570, 0, 0.9, 0.08, { attack: 0.01 }),
            ...sparkle(1760, 2.2, 0.26), ...sparkle(2349, 2.34, 0.22),
        ],
        noise: [n(0, 0.3, 0.2, { filter: 'lowpass', freq: 600, q: 0.8, attack: 0.002 }), n(2.2, 0.03, 0.3, { filter: 'highpass', freq: 3000, q: 0.8, attack: 0.001 })],
    },
    'fest-test-pos': {
        partials: [
            p('square', 1760, 1760, 0, 0.07, 0.09, { attack: 0.002 }), p('square', 1760, 1760, 0.14, 0.07, 0.09, { attack: 0.002 }),
            ...sparkle(1046.5, 0.75, 0.3), ...sparkle(1318.5, 0.9, 0.3), ...sparkle(1568, 1.05, 0.3),
        ],
        noise: [],
    },
    'fest-test-neg': {
        partials: [
            p('square', 1760, 1760, 0, 0.07, 0.09, { attack: 0.002 }), p('square', 1760, 1760, 0.14, 0.07, 0.09, { attack: 0.002 }),
            p('sine', 440, 392, 0.75, 0.5, 0.22, { attack: 0.01 }),
        ],
        noise: [],
    },
    'fest-water': {
        partials: [...[1, 2, 3].flatMap((i) => [p('sine', 900 + i * 260, 1500 + i * 200, i * 0.8, 0.12, 0.08, { attack: 0.004 })])],
        noise: [n(0, 3.4, 0.14, { filter: 'lowpass', freq: 520, freqTo: 780, q: 0.7, attack: 1.0 })],
    },
});
