// 偶像包常驻层与环境音：后台走廊 idbackstage、练习室 idpractice；环境音 idol（练习室节拍与鞋底摩擦、后台嘈杂）。
// 常驻层只放静态或极慢的 CSS；样式见 fx-idol-style.js。本文件不 import 演出中心模块（会成环）。
const PRACTICE_RE = /练习室|练舞室|舞蹈室|排练室|练习生宿舍|舞房/;
// 后台只认演出语境（舞台/演播厅/剧场等后面的后台，或候场、艺人休息室、化妆间），裸“后台”（网站、服务器后台）与泛用“休息室”不触发。
const BACKSTAGE_RE = /(舞台|演播|剧场|剧院|演唱会|音乐会|体育馆|录制|电视台|礼堂|会场|节目|活动)[^，。\s]{0,4}后台|后台走廊|候场|艺人休息室|艺人化妆间|化妆间|化妆室|演员休息室/;

export const IDOL_AMBIENCE_HTML = Object.freeze({
    idbackstage: '<i class="igs-id-amb-shade"></i><i class="igs-id-amb-strip"></i><i class="igs-id-amb-door is-a"></i><i class="igs-id-amb-door is-b"></i><i class="igs-id-amb-rack"></i><i class="igs-id-amb-floor"></i>',
    idpractice: '<i class="igs-id-amb-shade"></i><i class="igs-id-amb-mirror"></i><i class="igs-id-amb-rail"></i><i class="igs-id-amb-lamp"></i><i class="igs-id-amb-floor"></i>',
});

export const IDOL_AMBIENT_LABELS = Object.freeze({ idol: '练习室与后台' });

export function resolveIdolAmbience(location) {
    const loc = String(location || '');
    if (!loc) return null;
    if (PRACTICE_RE.test(loc)) return { kind: 'idpractice', variant: '' };
    if (BACKSTAGE_RE.test(loc)) return { kind: 'idbackstage', variant: '' };
    return null;
}

export function planIdolAmbient(ctx) {
    const hit = resolveIdolAmbience(ctx && ctx.location);
    if (!hit) return [];
    return [{ kind: 'idol', level: 'light', variant: hit.kind === 'idpractice' ? 'practice' : 'backstage' }];
}

// 合成：练习室是空旷房间底噪、慢节拍器与舞鞋摩擦地板、偶尔的击掌；后台是人声嘈杂、道具推车轮声、对讲机提示音。
export function createIdolVoices(h) {
    const { rand, chain, makeNoise, makeFilter, makeGain, makeLfo, layerLater, noiseBurst, blip, FLOOR } = h;
    const at0 = (layer) => layer.ctx.currentTime + 0.05;
    const every = (layer, fn, min, max, first) => {
        const loop = () => {
            fn(at0(layer));
            layerLater(layer, loop, rand(min, max));
        };
        layerLater(layer, loop, rand(first[0], first[1]));
    };
    const tone = (layer, at, freq, dur, peak, type = 'sine', pan = 0) => blip(layer, at, dur, (osc, amp) => {
        osc.type = type;
        osc.frequency.setValueAtTime(freq, at);
        amp.gain.setValueAtTime(FLOOR, at);
        amp.gain.exponentialRampToValueAtTime(peak, at + 0.003);
        amp.gain.exponentialRampToValueAtTime(FLOOR, at + dur);
    }, pan);

    function voiceIdol(layer) {
        const practice = layer.variant === 'practice';
        const room = makeGain(layer, practice ? 0.02 : 0.026);
        chain(makeNoise(layer), makeFilter(layer, 'lowpass', practice ? 200 : 300), room, layer.out);
        makeLfo(layer, rand(0.05, 0.11), 0.005, room.gain);
        if (practice) {
            const period = rand(560, 640);
            let beat = 0;
            const tick = () => {
                const at = at0(layer);
                tone(layer, at, beat % 4 === 0 ? 1500 : 1000, 0.04, beat % 4 === 0 ? 0.04 : 0.025, 'square', 0.3);
                beat += 1;
                layerLater(layer, tick, period);
            };
            layerLater(layer, tick, 600);
            every(layer, (at) => {
                const pan = rand(-0.6, 0.6);
                const count = 2 + Math.floor(Math.random() * 3);
                for (let i = 0; i < count; i += 1) {
                    noiseBurst(layer, at + i * rand(0.12, 0.22), rand(0.08, 0.14), { type: 'bandpass', frequency: rand(1800, 3000), q: 3, peak: rand(0.03, 0.05), attack: 0.004, pan });
                }
            }, 2200, 6500, [900, 2400]);
            every(layer, (at) => {
                noiseBurst(layer, at, 0.04, { type: 'bandpass', frequency: 2200, q: 1.2, peak: 0.05, attack: 0.001, pan: rand(-0.5, 0.5) });
            }, 14000, 36000, [8000, 18000]);
        } else {
            chain(makeNoise(layer), makeFilter(layer, 'bandpass', 520, 0.6), makeGain(layer, 0.014), layer.out);
            every(layer, (at) => {
                const pan = rand(-0.9, 0.9);
                const f = rand(420, 780);
                let t = at;
                for (let i = 0; i < 3 + Math.floor(Math.random() * 4); i += 1) {
                    const len = rand(0.1, 0.26);
                    noiseBurst(layer, t, len, { type: 'bandpass', frequency: f * rand(0.9, 1.3), q: rand(2.5, 4), peak: rand(0.012, 0.024), attack: 0.04, pan });
                    t += len + rand(0.04, 0.16);
                }
            }, 2500, 8000, [800, 2600]);
            every(layer, (at) => noiseBurst(layer, at, rand(0.8, 1.4), { type: 'bandpass', frequency: rand(700, 1100), q: 2, peak: 0.02, attack: 0.3, pan: rand(-0.8, 0.8) }), 12000, 30000, [6000, 14000]);
            every(layer, (at) => {
                tone(layer, at, 1800, 0.07, 0.02, 'sine', 0.5);
                tone(layer, at + 0.14, 2200, 0.09, 0.02, 'sine', 0.5);
            }, 20000, 50000, [9000, 22000]);
        }
    }

    return Object.freeze({ idol: voiceIdol });
}
