// COC与推理包的合成音效：心跳、纸张、图钉、红线、系统提示、空间跃迁、撕卡、钟声等。写法同 fx-daily-campus-sfx。
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

const thump = (start, gain) => [
    p('sine', 74, 44, start, 0.2, gain, { attack: 0.004, sweep: 1 }),
    n(start, 0.06, gain * 0.5, { filter: 'lowpass', freq: 240, q: 0.8, attack: 0.002 }),
];

const bellNote = (freq, start, ring, gain) => [
    p('sine', freq, freq, start, ring, gain, { attack: 0.004 }),
    p('sine', freq * 2.01, freq * 2.01, start, ring * 0.45, gain * 0.22, { attack: 0.003 }),
    p('sine', freq * 2.76, freq * 2.76, start, ring * 0.3, gain * 0.26, { attack: 0.002 }),
];

function rustle(rand, from, span, count, gain) {
    return Array.from({ length: count }, () => n(from + rand() * span, 0.015 + rand() * 0.03, gain * (0.5 + rand() * 0.8), {
        filter: 'highpass', freq: 2600 + rand() * 2600, q: 0.7, attack: 0.001,
    })).sort((a, b) => a.start - b.start);
}

const tearRand = seeded(521);
const tearRip = Array.from({ length: 14 }, (_, i) => n(0.02 + i * 0.045 + tearRand() * 0.02, 0.05 + tearRand() * 0.04, 0.3 + tearRand() * 0.2, {
    filter: 'highpass', freq: 2200 + tearRand() * 3000, q: 0.8, attack: 0.002,
}));

export const COC_SFX_DEFS = Object.freeze({
    // 掉理智：两下沉闷的心跳，上面一声下滑的失谐高音。
    'coc-sanloss': {
        partials: [...thump(0, 0.42), ...thump(0.26, 0.34), p('sine', 880, 330, 0.34, 0.9, 0.08, { attack: 0.06, sweep: 1 }), p('sine', 933, 349, 0.34, 0.9, 0.06, { attack: 0.06, sweep: 1 })],
        noise: [n(0.3, 0.9, 0.1, { filter: 'lowpass', freq: 700, freqTo: 180, q: 0.7, attack: 0.1, env: 'flat' })],
    },
    // 条动一下：轻轻的一记滴答。
    'coc-tick': {
        partials: [p('sine', 1180, 1180, 0, 0.09, 0.22, { attack: 0.001 }), p('sine', 2360, 2360, 0, 0.04, 0.06, { attack: 0.001 })],
        noise: [n(0, 0.02, 0.16, { freq: 3200, q: 1.6, attack: 0.001 })],
    },
    // 症状 / 耳语：带气声的低语，时断时续。
    'coc-whisper': {
        partials: [p('sine', 164, 150, 0.1, 1.6, 0.05, { attack: 0.5 })],
        noise: [
            n(0.1, 0.9, 0.16, { freq: 2400, freqTo: 1700, q: 2.2, attack: 0.25, am: Object.freeze({ rate: 6, depth: 0.7 }) }),
            n(1.1, 0.9, 0.12, { freq: 2100, freqTo: 1500, q: 2.2, attack: 0.3, am: Object.freeze({ rate: 7, depth: 0.7 }) }),
        ],
    },
    // 线索卡 / 线索簿：翻纸，末了笔尖一点。
    'coc-page': {
        partials: [p('triangle', 620, 420, 0.5, 0.06, 0.14, { attack: 0.002, sweep: 1 })],
        noise: [...rustle(seeded(77), 0.02, 0.4, 7, 0.28), n(0.5, 0.03, 0.3, { freq: 2200, q: 2, attack: 0.001 })],
    },
    // 图钉：一记短促的木头轻敲。
    'coc-pin': {
        partials: [p('sine', 1500, 900, 0, 0.05, 0.2, { attack: 0.001, sweep: 1 }), p('sine', 3100, 3100, 0, 0.03, 0.06, { attack: 0.001 })],
        noise: [n(0, 0.04, 0.3, { filter: 'lowpass', freq: 520, q: 0.9, attack: 0.001 }), n(0.07, 0.04, 0.24, { filter: 'lowpass', freq: 520, q: 0.9, attack: 0.001 }), n(0.14, 0.04, 0.2, { filter: 'lowpass', freq: 520, q: 0.9, attack: 0.001 })],
    },
    // 红线拉过：细线绷紧的一道上扬嘶声。
    'coc-string': {
        partials: [p('sine', 1800, 3200, 0.45, 0.5, 0.05, { attack: 0.08, sweep: 1 })],
        noise: [n(0.45, 0.55, 0.14, { filter: 'highpass', freq: 3600, freqTo: 5600, q: 0.7, attack: 0.1 })],
    },
    // 副本公告：三声清冷的系统提示音。
    'coc-chime': {
        partials: [880, 1174.66, 1760].flatMap((freq, i) => [
            p('sine', freq, freq, i * 0.18, 0.7, 0.28, { attack: 0.003 }),
            p('triangle', freq * 2, freq * 2, i * 0.18, 0.2, 0.05, { attack: 0.002 }),
        ]),
        noise: [],
    },
    // 传送：低频蓄力、上扬的扫频与一阵空气声，末了一记轻响。
    'coc-warp': {
        partials: [
            p('sine', 110, 880, 0, 1.2, 0.2, { attack: 0.3, sweep: 1 }),
            p('triangle', 220, 1760, 0.1, 1.0, 0.07, { attack: 0.3, sweep: 1 }),
            ...bellNote(1318.5, 1.25, 0.9, 0.16),
        ],
        noise: [n(0, 1.3, 0.22, { filter: 'bandpass', freq: 500, freqTo: 5200, q: 0.8, attack: 0.5, env: 'flat' })],
    },
    // 盖章 / 血迹抹上：闷响加湿润的一抹。
    'coc-stamp': {
        partials: [p('sine', 120, 56, 0, 0.26, 0.42, { attack: 0.002, sweep: 1 })],
        noise: [n(0, 0.08, 0.5, { filter: 'lowpass', freq: 800, q: 0.8, attack: 0.001 }), n(0.04, 0.3, 0.14, { filter: 'lowpass', freq: 1200, freqTo: 400, q: 0.7, attack: 0.06 })],
    },
    // 血迹涂抹：缓慢的一抹湿声。
    'coc-smear': {
        partials: [p('sine', 90, 62, 0, 0.7, 0.1, { attack: 0.2 })],
        noise: [n(0, 0.7, 0.2, { filter: 'lowpass', freq: 1500, freqTo: 420, q: 0.8, attack: 0.15 })],
    },
    // 结局 / 人数减少：低沉的丧钟。
    'coc-toll': {
        partials: [...bellNote(98, 0, 2.6, 0.38), ...bellNote(73.4, 1.3, 2.2, 0.3)],
        noise: [n(0, 0.05, 0.3, { filter: 'lowpass', freq: 700, q: 0.8, attack: 0.001 })],
    },
    // 撕卡：一串纸张撕裂的高频摩擦，收尾一记闷响。
    'coc-tear': {
        partials: [p('sine', 90, 50, 0.64, 0.3, 0.3, { attack: 0.003, sweep: 1 })],
        noise: [...tearRip, n(0.64, 0.1, 0.4, { filter: 'lowpass', freq: 500, q: 0.8, attack: 0.001 })],
    },
    // 放大镜：玻璃一声轻响，接一点细微的嗡。
    'coc-lens': {
        partials: [...bellNote(2093, 0, 0.5, 0.14), p('sine', 330, 336, 0.1, 1.2, 0.04, { attack: 0.3 })],
        noise: [n(0, 0.04, 0.14, { filter: 'highpass', freq: 4200, q: 0.7, attack: 0.001 })],
    },
    // 指认：落点的一记重击与短促的警示高音。
    'coc-accuse': {
        partials: [p('sine', 140, 48, 0, 0.5, 0.5, { attack: 0.002, sweep: 1 }), p('sawtooth', 660, 660, 0.02, 0.16, 0.06, { attack: 0.002 }), p('sawtooth', 990, 990, 0.02, 0.16, 0.05, { attack: 0.002 })],
        noise: [n(0, 0.14, 0.6, { filter: 'lowpass', freq: 1400, freqTo: 200, q: 0.8, attack: 0.001 })],
    },
    // 属性卡：多边形逐顶点长出的几下递进轻点，末了一声确认。
    'coc-stats': {
        partials: [0, 1, 2, 3, 4].map((i) => p('triangle', 520 + i * 90, 480 + i * 90, 0.5 + i * 0.12, 0.07, 0.12, { attack: 0.002, sweep: 1 })),
        noise: [n(0.02, 0.2, 0.16, { filter: 'highpass', freq: 3200, q: 0.8, attack: 0.002 })],
    },
    // 守秘人开口：骰子在桌上滚动的几下清脆磕碰。
    'coc-dice': {
        partials: [p('triangle', 1700, 1100, 0.36, 0.05, 0.1, { attack: 0.001, sweep: 1 })],
        noise: [0, 0.07, 0.14, 0.23, 0.36].map((at, i) => n(at, 0.03, 0.34 - i * 0.04, { filter: 'bandpass', freq: 1700 + i * 260, q: 1.8, attack: 0.001 })),
    },
});
