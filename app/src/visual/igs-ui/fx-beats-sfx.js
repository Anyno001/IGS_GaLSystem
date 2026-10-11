// 戏剧节拍的合成音效：与 fx-daily-sfx 同一数据形状（partials 振荡器 + noise 滤波噪声），增益取同类日常音效的量级。
// 不引入 chat-sfx（它会连到 scene-audio，和题材包登记中心成环），振荡器分量在这里直接构造。
const p = (wave, from, to, start, duration, gain, extra = {}) => Object.freeze({ wave, from, to, start, duration, gain, ...extra });
const n = (start, duration, gain, extra = {}) => Object.freeze({ start, duration, gain, filter: 'bandpass', freq: 2000, q: 1, attack: 0.002, ...extra });

function seeded(seed) {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

// 钟音：基频加略带非谐的泛音。
const bell = (freq, start, ring, gain) => [
    p('sine', freq, freq, start, ring, gain, { attack: 0.004 }),
    p('sine', freq * 2, freq * 2, start, ring * 0.45, gain * 0.22, { attack: 0.003 }),
    p('sine', freq * 2.76, freq * 2.76, start, ring * 0.3, gain * 0.26, { attack: 0.002 }),
];

const tickTimes = [0, 0.14, 0.27, 0.39, 0.5, 0.6, 0.69, 0.77, 0.84];
const applauseRand = seeded(2711);

export const BEATS_SFX_DEFS = Object.freeze({
    // 揭晓：一记低沉的重击，随后一缕清亮的余响。
    'bt-slam': {
        partials: [
            p('sine', 110, 38, 0, 0.55, 0.9, { attack: 0.003, sweep: 1 }),
            p('triangle', 220, 70, 0, 0.14, 0.35, { attack: 0.002, sweep: 1 }),
            ...bell(988, 0.16, 1.1, 0.14),
        ],
        noise: [n(0, 0.2, 0.55, { filter: 'lowpass', freq: 2600, freqTo: 300, q: 0.7, attack: 0.003 })],
    },
    // 系统面板：两声清脆的提示音，前低后高。
    'bt-chime': {
        partials: [...bell(880, 0, 0.5, 0.3), ...bell(1318.5, 0.15, 0.8, 0.3)],
        noise: [],
    },
    // 数字滚动：越来越密的滴答，最后一声落定。
    'bt-tick': {
        partials: [
            ...tickTimes.map((t, i) => p('sine', 1900, 1500, t, 0.03, 0.16 + i * 0.012, { attack: 0.001, sweep: 1 })),
            ...bell(1318.5, 0.98, 0.7, 0.26),
        ],
        noise: [],
    },
    // 证物甩出：纸卡拍在桌面上的一声闷响。
    'bt-slap': {
        partials: [p('sine', 150, 55, 0, 0.16, 0.6, { attack: 0.002, sweep: 1 })],
        noise: [
            n(0, 0.07, 0.7, { filter: 'highpass', freq: 1800, q: 0.7, attack: 0.001 }),
            n(0.05, 0.16, 0.24, { filter: 'highpass', freq: 3200, q: 0.7, attack: 0.004 }),
        ],
    },
    // 牵线：一缕上行的细光。
    'bt-thread': {
        partials: [
            p('sine', 520, 1040, 0, 0.8, 0.14, { attack: 0.06, sweep: 0.9 }),
            p('sine', 783, 1568, 0.06, 0.65, 0.08, { attack: 0.06, sweep: 0.9 }),
            ...bell(2093, 0.55, 0.5, 0.06),
        ],
        noise: [n(0, 0.8, 0.07, { filter: 'highpass', freq: 6000, q: 0.7, attack: 0.15 })],
    },
    // 众人：低低的议论声起伏。
    'bt-murmur': {
        partials: [],
        noise: [
            n(0, 1.2, 0.3, { freq: 500, freqTo: 420, q: 0.8, attack: 0.3 }),
            n(0.1, 1.1, 0.2, { freq: 900, freqTo: 760, q: 1.2, attack: 0.35 }),
        ],
    },
    // 掌声 / 欢呼：密集错落的噪声脉冲。
    'bt-applause': {
        partials: [],
        noise: Array.from({ length: 34 }, () => {
            const start = applauseRand() * 1.3;
            return n(start, 0.02 + applauseRand() * 0.03, 0.26 + applauseRand() * 0.3, { filter: 'highpass', freq: 1800 + applauseRand() * 2800, q: 0.7, attack: 0.001 });
        }).sort((a, b) => a.start - b.start),
    },
    // 重逢：一束暖色的和弦缓缓张开。
    'bt-glow': {
        partials: [
            p('sine', 392, 392, 0, 1.9, 0.16, { attack: 0.5 }),
            p('sine', 493.9, 493.9, 0.05, 1.8, 0.13, { attack: 0.5 }),
            p('sine', 587.3, 587.3, 0.1, 1.7, 0.12, { attack: 0.5 }),
            p('sine', 784, 784, 0.35, 1.4, 0.07, { attack: 0.4 }),
        ],
        noise: [],
    },
    // 先攻顺序：三下逐级抬高的点按。
    'bt-order': {
        partials: [
            p('triangle', 660, 660, 0, 0.09, 0.3, { attack: 0.002 }),
            p('triangle', 784, 784, 0.14, 0.09, 0.3, { attack: 0.002 }),
            p('triangle', 988, 988, 0.28, 0.16, 0.34, { attack: 0.002 }),
        ],
        noise: [],
    },
    // 内心独白：一口很轻的气声。
    'bt-whisper': {
        partials: [],
        noise: [
            n(0, 0.9, 0.18, { freq: 3200, freqTo: 2400, q: 1.5, attack: 0.3 }),
            n(0.1, 0.7, 0.12, { filter: 'highpass', freq: 5000, q: 0.7, attack: 0.25 }),
        ],
    },
});
