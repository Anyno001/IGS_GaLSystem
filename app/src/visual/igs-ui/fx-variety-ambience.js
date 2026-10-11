// 恋爱小屋常驻层与环境音：客厅 vlounge、厨房 vkitchen、泳池 vpool、露台夜景 vterrace，环境音 cabin。
// 常驻层只放静态或极慢的 CSS；样式见 fx-variety-style.js。本文件不 import 演出中心模块（会成环）。
const CABIN_RE = /恋爱小屋|心动小屋|恋综|小屋|别墅/;
const ROOMS = Object.freeze([
    ['vpool', /泳池|游泳池|池边/],
    ['vterrace', /露台|阳台|天台|屋顶花园/],
    ['vkitchen', /厨房|餐厅|吧台/],
    ['vlounge', /客厅|大厅|沙发|起居室/],
]);

export const VARIETY_AMBIENCE_HTML = Object.freeze({
    vlounge: '<i class="igs-vy-amb-shade"></i><i class="igs-vy-amb-lamp is-l"></i><i class="igs-vy-amb-lamp is-r"></i><i class="igs-vy-amb-rug"></i>',
    vkitchen: '<i class="igs-vy-amb-shade"></i><i class="igs-vy-amb-pendant"></i><i class="igs-vy-amb-window"></i>',
    vpool: '<i class="igs-vy-amb-shade is-blue"></i><i class="igs-vy-amb-water"></i><i class="igs-vy-amb-glint"></i>',
    vterrace: '<i class="igs-vy-amb-shade is-dusk"></i><i class="igs-vy-amb-bokeh"></i><i class="igs-vy-amb-bulbs is-a"></i><i class="igs-vy-amb-bulbs is-b"></i>',
});

// 泳池与露台要能单独认出来；客厅、厨房太普通，必须带着小屋字样才算恋综场景。
export function resolveVarietyAmbience(location) {
    const loc = String(location || '');
    if (!loc) return null;
    const cabin = CABIN_RE.test(loc);
    for (const [kind, re] of ROOMS) {
        if (!re.test(loc)) continue;
        if (cabin || kind === 'vpool' || kind === 'vterrace') return { kind, variant: '' };
    }
    return cabin ? { kind: 'vlounge', variant: '' } : null;
}

export const VARIETY_AMBIENT_LABELS = Object.freeze({ cabin: '恋爱小屋' });

export function planVarietyAmbient(ctx) {
    const hit = resolveVarietyAmbience(ctx && ctx.location);
    if (!hit) return [];
    return [{ kind: 'cabin', level: 'light', variant: hit.kind === 'vpool' ? 'pool' : hit.kind === 'vterrace' ? 'terrace' : '' }];
}

// 合成：房间底噪与冰箱低鸣、偶尔的杯碟轻碰、远处隔墙的人声与笑声；泳池换成水波拍岸，露台加远处车流。
export function createVarietyVoices(h) {
    const { rand, chain, makeNoise, makeFilter, makeGain, makeLfo, layerLater, noiseBurst, blip, FLOOR } = h;

    function voiceCabin(layer) {
        const pool = layer.variant === 'pool';
        const terrace = layer.variant === 'terrace';
        const room = makeGain(layer, pool ? 0.012 : 0.022);
        chain(makeNoise(layer), makeFilter(layer, 'lowpass', pool ? 700 : 240), room, layer.out);
        makeLfo(layer, rand(0.05, 0.11), 0.006, room.gain);
        if (!pool) chain(makeNoise(layer), makeFilter(layer, 'lowpass', 110), makeGain(layer, 0.02), layer.out);
        if (terrace) {
            const traffic = makeGain(layer, 0.016);
            chain(makeNoise(layer), makeFilter(layer, 'bandpass', 520, 0.5), traffic, layer.out);
            makeLfo(layer, rand(0.06, 0.12), 0.008, traffic.gain);
        }
        if (pool) {
            const lap = () => {
                const at = layer.ctx.currentTime + 0.05;
                const pan = rand(-0.8, 0.8);
                noiseBurst(layer, at, rand(0.6, 1.1), { type: 'bandpass', frequency: rand(500, 900), q: 0.8, peak: rand(0.03, 0.06), attack: 0.3, pan });
                noiseBurst(layer, at + 0.2, 0.3, { type: 'highpass', frequency: rand(3200, 4800), q: 0.7, peak: rand(0.01, 0.02), attack: 0.1, pan });
                layerLater(layer, lap, rand(1800, 4200));
            };
            layerLater(layer, lap, rand(300, 1500));
        }
        // 杯碟轻碰：两声错开的清脆短音。
        const clink = () => {
            const at = layer.ctx.currentTime + 0.05;
            const pan = rand(-0.7, 0.7);
            const base = rand(2300, 3200);
            for (const [delay, mul, peak] of [[0, 1, 0.014], [0.06, 1.26, 0.01]]) {
                blip(layer, at + delay, 0.3, (osc, amp) => {
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(base * mul, at + delay);
                    amp.gain.setValueAtTime(FLOOR, at + delay);
                    amp.gain.exponentialRampToValueAtTime(peak * rand(0.8, 1.2), at + delay + 0.004);
                    amp.gain.exponentialRampToValueAtTime(FLOOR, at + delay + 0.3);
                }, pan);
            }
            layerLater(layer, clink, rand(14000, 34000));
        };
        if (!pool) layerLater(layer, clink, rand(4000, 12000));
        // 隔墙的说笑：带共振峰的噪声起伏几下，像有人在另一间屋子聊天。
        const chatter = () => {
            const at = layer.ctx.currentTime + 0.05;
            const pan = rand(-0.9, 0.9);
            const f = rand(420, 760);
            const beats = 3 + Math.floor(Math.random() * 4);
            let t = at;
            for (let i = 0; i < beats; i++) {
                const len = rand(0.12, 0.3);
                noiseBurst(layer, t, len, { type: 'bandpass', frequency: f * rand(0.9, 1.3), q: rand(2.5, 4), peak: rand(0.01, 0.022), attack: 0.04, pan });
                t += len + rand(0.04, 0.16);
            }
            layerLater(layer, chatter, rand(9000, 26000));
        };
        layerLater(layer, chatter, rand(3000, 9000));
    }

    return Object.freeze({ cabin: voiceCabin });
}
