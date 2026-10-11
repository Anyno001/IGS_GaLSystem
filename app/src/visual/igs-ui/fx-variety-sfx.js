// 恋综包的合成音效：全部用振荡器与滤波噪声合成。形状同 chat-sfx 的 partial；不能 import chat-sfx（它经 scene-audio 回连到题材包汇总，会成环）。
const p = (wave, from, to, start, duration, gain, extra = {}) => Object.freeze({ wave, from, to, start, duration, gain, ...extra });
const n = (start, duration, gain, extra = {}) => Object.freeze({ start, duration, gain, filter: 'bandpass', freq: 2000, q: 1, attack: 0.002, ...extra });

const bell = (freq, start, ring, gain) => [
    p('sine', freq, freq, start, ring, gain, { attack: 0.004 }),
    p('sine', freq * 2, freq * 2, start, ring * 0.45, gain * 0.22, { attack: 0.003 }),
    p('sine', freq * 2.76, freq * 2.76, start, 0.3, gain * 0.26, { attack: 0.002 }),
];
const thump = (start, from, to, gain) => p('sine', from, to, start, 0.14, gain, { attack: 0.003, sweep: 1 });
const tick = (start, freq, gain = 0.3) => n(start, 0.02, gain, { freq, q: 2.4, attack: 0.001 });

// 心跳：咚、咚两下为一拍，共三拍。
const beats = [0, 0.62, 1.24].flatMap((t) => [thump(t, 90, 52, 0.62), thump(t + 0.17, 80, 48, 0.46)]);

export const VARIETY_SFX_DEFS = Object.freeze({
    // 嘉宾入场：上扬的两声“叮咚”，随后一阵小礼花。
    'vy-guest': {
        partials: [...bell(1174.66, 0, 0.5, 0.3), ...bell(1567.98, 0.16, 0.9, 0.3), ...bell(2093, 0.34, 0.8, 0.18)],
        noise: [n(0.3, 0.5, 0.2, { filter: 'highpass', freq: 5200, q: 0.7, attack: 0.02 }), tick(0.02, 3800, 0.3)],
    },
    // 粉字花字：弹性的“啵”，一个上滑音加一点亮片。
    'vy-pop': {
        partials: [p('sine', 320, 980, 0, 0.12, 0.5, { attack: 0.004, sweep: 1 }), p('triangle', 980, 1560, 0.1, 0.1, 0.22, { attack: 0.003, sweep: 1 }), ...bell(2349, 0.2, 0.5, 0.14)],
        noise: [n(0.18, 0.3, 0.14, { filter: 'highpass', freq: 6200, q: 0.7, attack: 0.01 })],
    },
    // 盖章：一记闷实的“咚”，带纸面的短促摩擦。
    'vy-stamp': {
        partials: [thump(0.38, 150, 60, 0.7), p('sine', 520, 300, 0.38, 0.06, 0.2, { attack: 0.001, sweep: 1 })],
        noise: [n(0.38, 0.08, 0.55, { filter: 'lowpass', freq: 700, q: 0.8, attack: 0.001 }), n(0.39, 0.05, 0.3, { freq: 2600, q: 1.3, attack: 0.001 })],
    },
    // 黑底字幕：低沉的悬念和弦，缓缓铺开再收住。
    'vy-sting': {
        partials: [p('sine', 110, 104, 0, 1.8, 0.36, { attack: 0.3 }), p('triangle', 164.8, 155, 0.1, 1.6, 0.2, { attack: 0.35 }), p('sine', 233, 220, 0.2, 1.4, 0.12, { attack: 0.4 })],
        noise: [n(0, 1.8, 0.08, { filter: 'lowpass', freq: 400, freqTo: 900, q: 0.7, attack: 0.5 })],
    },
    // 采访间：摄像机开机的轻响，一声提示音。
    'vy-interview': {
        partials: [p('sine', 880, 880, 0.05, 0.08, 0.24, { attack: 0.002 }), p('sine', 1320, 1320, 0.2, 0.18, 0.2, { attack: 0.003 }), thump(0, 120, 70, 0.3)],
        noise: [n(0, 0.06, 0.3, { freq: 3200, q: 1.6, attack: 0.001 }), n(0.3, 0.9, 0.05, { filter: 'lowpass', freq: 300, q: 0.7, attack: 0.2 })],
    },
    // 观察室：画中画弹出的小滴声，评论依次滴答。
    'vy-observe': {
        partials: [p('sine', 660, 990, 0, 0.1, 0.3, { attack: 0.003, sweep: 1 }), p('sine', 1320, 1320, 0.55, 0.08, 0.16, { attack: 0.002 }), p('sine', 1568, 1568, 0.85, 0.08, 0.16, { attack: 0.002 }), p('sine', 1760, 1760, 1.15, 0.1, 0.16, { attack: 0.002 })],
        noise: [tick(0.02, 3000, 0.22)],
    },
    // 机位角标：REC 提示音，之后是切镜的快门。
    'vy-rec': {
        partials: [p('square', 1760, 1760, 0.4, 0.08, 0.12, { attack: 0.002 }), p('square', 1760, 1760, 0.55, 0.08, 0.12, { attack: 0.002 }), thump(0, 200, 90, 0.34)],
        noise: [n(0, 0.04, 0.5, { freq: 3400, q: 1.8, attack: 0.001 }), n(0.05, 0.05, 0.35, { freq: 2200, q: 1.4, attack: 0.001 })],
    },
    // 信封揭晓：纸张摩擦，翻盖，一声清亮的钟，票数落定时的小滴答。
    'vy-vote': {
        partials: [...bell(1318.5, 0.9, 0.9, 0.3), ...bell(1760, 1.06, 1.0, 0.22), thump(0.62, 160, 90, 0.2)],
        noise: [n(0, 0.4, 0.34, { filter: 'highpass', freq: 3000, q: 0.7, attack: 0.1 }), n(0.62, 0.1, 0.4, { filter: 'lowpass', freq: 900, q: 0.8, attack: 0.002 }), tick(1.4, 3200, 0.2), tick(1.55, 3600, 0.2), tick(1.7, 4000, 0.2)],
    },
    // 排行榜：数字滚动的细密滴答，名次互换时一声“嗖”。
    'vy-rank': {
        partials: [p('sine', 440, 1180, 1.0, 0.3, 0.2, { attack: 0.02, sweep: 1 }), ...bell(1568, 1.9, 0.9, 0.22)],
        noise: [...Array.from({ length: 14 }, (_, i) => tick(0.1 + i * 0.07, 2600 + (i % 3) * 400, 0.18)), n(1.0, 0.3, 0.25, { filter: 'highpass', freq: 1800, freqTo: 5200, q: 0.7, attack: 0.08 })],
    },
    // 心率：三拍心跳。
    'vy-pulse': {
        partials: beats,
        noise: [n(0, 2.0, 0.04, { filter: 'lowpass', freq: 200, q: 0.7, attack: 0.3 })],
    },
    // 关系图：每画一条线一声轻拨，头像弹出时一声小气泡。
    'vy-relmap': {
        partials: [0, 1, 2, 3].flatMap((i) => [p('triangle', 660 + i * 110, 660 + i * 110, 0.2 + i * 0.32, 0.22, 0.2, { attack: 0.003 }), p('sine', 1320 + i * 220, 1320 + i * 220, 0.2 + i * 0.32, 0.1, 0.08, { attack: 0.002 })]),
        noise: [n(0.05, 0.1, 0.2, { freq: 2400, q: 1.2, attack: 0.002 })],
    },
    // 抽卡配对：牌面一张张翻开的“啪”，最后一声心动的钟。
    'vy-pair': {
        partials: [...bell(1046.5, 1.1, 0.8, 0.24), ...bell(1318.5, 1.5, 0.8, 0.22), ...bell(1568, 1.9, 1.0, 0.2)],
        noise: [1.0, 1.4, 1.8, 2.2].flatMap((t) => [n(t, 0.05, 0.4, { filter: 'highpass', freq: 2400, q: 0.7, attack: 0.001 }), n(t, 0.05, 0.3, { filter: 'lowpass', freq: 600, q: 0.8, attack: 0.001 })]),
    },
    // 离场：拉杆箱轮子滚过的低噪，关门的一声闷响。
    'vy-exit': {
        partials: [thump(1.55, 110, 55, 0.56)],
        noise: [n(0.2, 1.3, 0.3, { filter: 'lowpass', freq: 420, freqTo: 260, q: 0.9, attack: 0.3 }), n(0.2, 1.3, 0.12, { filter: 'highpass', freq: 3000, q: 0.7, attack: 0.3, am: { rate: 11, depth: 0.5 } }), n(1.55, 0.1, 0.5, { filter: 'lowpass', freq: 700, q: 0.8, attack: 0.001 })],
    },
    // 告白之夜：灯牌一盏盏点亮的上行音，最后和弦铺开。
    'vy-finale': {
        partials: [
            ...[523.25, 587.33, 659.25, 783.99, 880, 1046.5].flatMap((freq, i) => bell(freq, 0.9 + i * 0.28, 0.5, 0.18)),
            p('triangle', 261.63, 261.63, 2.7, 2.2, 0.2, { attack: 0.3 }), p('triangle', 329.63, 329.63, 2.7, 2.2, 0.18, { attack: 0.3 }), p('triangle', 392, 392, 2.7, 2.2, 0.16, { attack: 0.3 }),
        ],
        noise: [n(0.3, 1.8, 0.05, { filter: 'lowpass', freq: 500, freqTo: 1400, q: 0.7, attack: 0.9 })],
    },
    // 心动瞬间回放：磁带倒带的上滑啸叫，停住后“咔”一声，再三次推近的低“咚”。
    'vy-replay': {
        partials: [p('sawtooth', 1800, 420, 0, 0.5, 0.1, { attack: 0.02, sweep: 1 }), thump(1.0, 130, 70, 0.4), thump(2.05, 130, 70, 0.4), thump(3.1, 130, 70, 0.44)],
        noise: [n(0, 0.5, 0.3, { filter: 'highpass', freq: 2400, freqTo: 6000, q: 0.7, attack: 0.05 }), n(0.52, 0.03, 0.5, { freq: 2600, q: 2, attack: 0.001 })],
    },
});
