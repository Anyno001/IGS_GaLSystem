// 后宫妃子包的合成音效：木梆、铜锣、印章、银针、落锁、掌掴、编钟式报喜等，全部沿用 fx-daily-sfx 的 partial / noise 写法。
// 与 chat-sfx 的 partial 同形；本地定义是为避开 chat-sfx -> scene-audio -> fx-packs 的循环引用。
const p = (wave, from, to, start, duration, gain, extra = {}) => Object.freeze({ wave, from, to, start, duration, gain, ...extra });

const n = (start, duration, gain, extra = {}) => Object.freeze({ start, duration, gain, filter: 'bandpass', freq: 2000, q: 1, attack: 0.002, ...extra });

const bellNote = (freq, start, ring, gain) => [
    p('sine', freq, freq, start, ring, gain, { attack: 0.004 }),
    p('sine', freq * 2, freq * 2, start, ring * 0.45, gain * 0.22, { attack: 0.003 }),
    p('sine', freq * 2.76, freq * 2.76, start, 0.3, gain * 0.26, { attack: 0.002 }),
];

const pluck = (freq, start, ring, gain) => [
    p('sine', freq, freq, start, ring, gain, { attack: 0.003 }),
    p('sine', freq * 2.01, freq * 2.01, start, ring * 0.5, gain * 0.34, { attack: 0.002 }),
    p('sine', freq * 3.02, freq * 3.02, start, ring * 0.28, gain * 0.16, { attack: 0.002 }),
];

const PENTA = [392, 440, 523.25, 587.33, 659.25, 783.99];

export const HAREM_SFX_DEFS = {
    // 位份晋升：宫商角徵羽一路拨上去，落在一声钟鸣；降位则反向，只剩低低一声。
    'hm-rank-up': {
        partials: [...[0, 1, 2, 3, 4].flatMap((i) => pluck(PENTA[i], i * 0.13, 0.5, 0.22)), ...bellNote(783.99, 0.74, 1.1, 0.2)],
        noise: [n(0.7, 0.08, 0.16, { freq: 3200, q: 1.4 })],
    },
    'hm-rank-down': {
        partials: [...[4, 3, 2].flatMap((i, k) => pluck(PENTA[i] * 0.5, k * 0.18, 0.55, 0.2)), p('sine', 110, 82, 0.56, 0.7, 0.2, { attack: 0.01, sweep: 1 })],
        noise: [n(0.54, 0.1, 0.2, { filter: 'lowpass', freq: 380, q: 0.7 })],
    },
    // 印章：木柄落在宣纸上的一声闷响，带一点朱泥的黏。
    'hm-seal': {
        partials: [p('sine', 150, 70, 0, 0.16, 0.5, { attack: 0.002, sweep: 1 })],
        noise: [n(0, 0.09, 0.4, { filter: 'lowpass', freq: 900, q: 0.7 }), n(0.01, 0.04, 0.12, { freq: 2600, q: 1.2 })],
    },
    // 恩宠：朱砂泥上一枚小印，随后一声清磬，数字涨上去时带一缕细弦。
    'hm-favor': {
        partials: [p('sine', 150, 74, 0, 0.14, 0.4, { attack: 0.002, sweep: 1 }), ...bellNote(1046.5, 0.12, 0.8, 0.14), p('sine', 523, 784, 0.1, 0.7, 0.07, { attack: 0.05, sweep: 1 })],
        noise: [n(0, 0.07, 0.3, { filter: 'lowpass', freq: 900, q: 0.7 })],
    },
    // 位份榜：竖幅榜文垂挂展开的沙沙声，三记木梆落板，末了铜磬一响。
    'hm-board': {
        partials: [...[0.55, 0.9, 1.25].map((t) => p('sine', 320, 190, t, 0.1, 0.3, { attack: 0.001, sweep: 1 })), ...bellNote(587.33, 1.6, 1.2, 0.16)],
        noise: [n(0, 0.55, 0.2, { filter: 'bandpass', freq: 2600, freqTo: 3800, q: 0.8, attack: 0.1, env: 'flat' }), ...[0.55, 0.9, 1.25].map((t) => n(t, 0.05, 0.3, { freq: 1200, q: 2 }))],
    },
    // 绿头牌：木牌在漆盘上拨动，两下脆响。
    'hm-tablet': {
        partials: [p('triangle', 880, 700, 0, 0.05, 0.18, { attack: 0.001, sweep: 1 }), p('triangle', 740, 620, 0.12, 0.05, 0.14, { attack: 0.001, sweep: 1 })],
        noise: [n(0, 0.03, 0.3, { freq: 2400, q: 1.5 }), n(0.12, 0.03, 0.26, { freq: 2100, q: 1.5 })],
    },
    // 通传：铜锣一响，余韵里一声拖长的低音。
    'hm-gong': {
        partials: [
            p('sine', 196, 188, 0, 1.8, 0.34, { attack: 0.006 }), p('sine', 392.8, 386, 0, 1.2, 0.14, { attack: 0.004 }),
            p('sine', 540, 530, 0, 0.8, 0.1, { attack: 0.003 }), p('sine', 98, 94, 0.02, 1.9, 0.2, { attack: 0.02 }),
        ],
        noise: [n(0, 0.2, 0.34, { freq: 1800, q: 0.8 }), n(0.05, 1.3, 0.1, { filter: 'lowpass', freq: 700, q: 0.7, attack: 0.15 })],
    },
    // 更鼓与木梆：空心的「笃」，用于打更与翻牌的收尾。
    'hm-clapper': {
        partials: [p('sine', 340, 200, 0, 0.1, 0.4, { attack: 0.001, sweep: 1 }), p('sine', 520, 300, 0.4, 0.1, 0.34, { attack: 0.001, sweep: 1 })],
        noise: [n(0, 0.05, 0.34, { freq: 1200, q: 2 }), n(0.4, 0.05, 0.3, { freq: 1200, q: 2 })],
    },
    // 银针：针尖拨在瓷碗沿上的一声细响，之后是一丝长长的颤。
    'hm-needle': {
        partials: [p('sine', 3520, 3480, 0, 0.9, 0.16, { attack: 0.001 }), p('sine', 5280, 5240, 0, 0.4, 0.06, { attack: 0.001 })],
        noise: [n(0, 0.02, 0.2, { filter: 'highpass', freq: 6000, q: 0.7 })],
    },
    // 滴血：两滴水落进瓷碗，第二滴更低。
    'hm-drop': {
        partials: [p('sine', 900, 380, 0, 0.12, 0.3, { attack: 0.002, sweep: 1 }), p('sine', 760, 320, 0.5, 0.14, 0.3, { attack: 0.002, sweep: 1 }), p('sine', 1320, 1300, 0.5, 0.3, 0.06, { attack: 0.002 })],
        noise: [],
    },
    // 掌嘴：一记脆亮的掴响，余下一点耳鸣。
    'hm-slap': {
        partials: [p('sine', 4200, 3900, 0.05, 0.6, 0.035, { attack: 0.01 })],
        noise: [n(0, 0.07, 0.8, { filter: 'highpass', freq: 2200, q: 0.8 }), n(0, 0.11, 0.5, { filter: 'lowpass', freq: 700, q: 0.7 })],
    },
    // 落锁：宫门合拢的闷响，接着铁锁扣上的两下「咔哒」。
    'hm-lock': {
        partials: [p('sine', 90, 48, 0, 0.5, 0.5, { attack: 0.004, sweep: 1 }), p('triangle', 1450, 1100, 0.72, 0.08, 0.16, { attack: 0.001, sweep: 1 }), p('triangle', 1750, 1300, 0.92, 0.1, 0.18, { attack: 0.001, sweep: 1 })],
        noise: [n(0, 0.3, 0.55, { filter: 'lowpass', freq: 380, q: 0.7 }), n(0.72, 0.03, 0.4, { freq: 3000, q: 2 }), n(0.92, 0.04, 0.46, { freq: 2600, q: 2 })],
    },
    // 冷宫：门轴吱呀声压得很低，再是一阵穿堂风。
    'hm-cold': {
        partials: [p('sawtooth', 180, 120, 0, 0.9, 0.05, { attack: 0.2, sweep: 1 })],
        noise: [n(0.1, 1.6, 0.22, { filter: 'lowpass', freq: 520, freqTo: 240, q: 0.8, attack: 0.3 }), n(0, 0.8, 0.12, { freq: 760, freqTo: 480, q: 6, attack: 0.2 })],
    },
    // 托盘：瓷盘搁在漆案上的轻响，后头一声拉长的低鸣。
    'hm-tray': {
        partials: [p('sine', 1560, 1500, 0, 0.5, 0.14, { attack: 0.002 }), p('sine', 2340, 2290, 0, 0.25, 0.06, { attack: 0.002 }), p('sine', 73, 62, 0.15, 1.6, 0.22, { attack: 0.4, sweep: 1 })],
        noise: [n(0, 0.04, 0.28, { freq: 3400, q: 1.5 })],
    },
    // 诊脉：心跳般的「咚咚—咚咚」。
    'hm-pulse': {
        partials: [0, 0.8, 1.6].flatMap((t) => [p('sine', 78, 50, t, 0.16, 0.42, { attack: 0.003, sweep: 1 }), p('sine', 70, 46, t + 0.2, 0.16, 0.3, { attack: 0.003, sweep: 1 })]),
        noise: [],
    },
    // 恭喜：编钟三响，最高的一声收尾，再是一串碎铃。
    'hm-congrats': {
        partials: [...bellNote(523.25, 0, 0.9, 0.24), ...bellNote(659.25, 0.28, 0.9, 0.24), ...bellNote(783.99, 0.56, 1.3, 0.26), ...[1318.5, 1568, 1760, 2093].flatMap((f, i) => p('sine', f, f, 0.9 + i * 0.07, 0.2, 0.06, { attack: 0.002 }))],
        noise: [],
    },
    // 嫉妒的目光：低低一声绷紧的弦，往上微微拧。
    'hm-glare': {
        partials: [p('sawtooth', 110, 150, 0, 0.9, 0.08, { attack: 0.25, sweep: 1 }), p('sine', 55, 52, 0, 1.2, 0.2, { attack: 0.2 })],
        noise: [n(0.1, 0.8, 0.1, { filter: 'highpass', freq: 3200, q: 0.7, attack: 0.3 })],
    },
    // 凤鸾春恩车：木轮碾过石板，车铃叮当。
    'hm-cart': {
        partials: [...[0.1, 0.34, 0.58, 0.82].map((t, i) => p('sine', 2400 + i * 120, 2400 + i * 120, t, 0.22, 0.09, { attack: 0.002 })), p('sine', 70, 64, 0, 1.2, 0.1, { attack: 0.2 })],
        noise: [n(0, 1.2, 0.14, { filter: 'lowpass', freq: 420, q: 0.8, attack: 0.2 })],
    },
    // 赏赐：丝绢展开的沙沙声，加一声清磬。
    'hm-reward': {
        partials: [...bellNote(880, 0.15, 1.0, 0.2)],
        noise: [n(0, 0.5, 0.2, { freq: 3000, freqTo: 4200, q: 0.8, attack: 0.1 })],
    },
};
