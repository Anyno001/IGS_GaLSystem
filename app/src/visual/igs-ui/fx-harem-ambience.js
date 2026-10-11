// 后宫妃子包的常驻地点层与环境音：妃嫔寝宫、御花园、冷宫、宫中长街。只在古代世界观生效，且同样受包总开关控制。
// 皇帝寝宫（寝宫 / 寝殿 / 暖阁等）已由约会氛围的 palace 层接管，这里的寝宫层只认「某某宫」这类妃嫔居所。
const text = (value) => String(value == null ? '' : value);
const has = (raw, words) => words.some((word) => raw.includes(word));

const COLD_WORDS = Object.freeze(['冷宫', '废宫', '掖庭', '浣衣局', '幽禁']);
const LANE_WORDS = Object.freeze(['长街', '宫道', '夹道', '永巷', '宫墙', '甬道', '宫门外', '回廊']);
const GARDEN_WORDS = Object.freeze(['御花园', '花园', '后花园', '凉亭', '荷塘', '园中', '梅园', '太液池']);
const CHAMBER_RE = /[一-龥]{1,3}(宫|阁|轩|斋|殿)$/;
const CHAMBER_WORDS = Object.freeze(['寝居', '妆台', '梳妆', '偏殿', '小院', '厢房']);

export const HAREM_AMBIENCE_HTML = Object.freeze({
    hmbed: '<i class="hm-amb-shade"></i><i class="hm-amb-lamp"></i><i class="hm-amb-lamp is-b"></i>',
    hmgarden: '<i class="hm-amb-garden"></i><i class="hm-amb-petal"></i><i class="hm-amb-petal is-b"></i>',
    hmcold: '<i class="hm-amb-grey"></i><i class="hm-amb-crack"></i><i class="hm-amb-draft"></i>',
    hmlane: '<i class="hm-amb-wall"></i><i class="hm-amb-lantern"></i><i class="hm-amb-lantern is-b"></i>',
});

export const HAREM_STILL_KINDS = Object.freeze(['hmbed', 'hmgarden', 'hmcold', 'hmlane']);

export function resolveHaremAmbience(location, { worldview = '' } = {}) {
    const raw = text(location);
    if (!raw || worldview !== 'ancient') return null;
    if (has(raw, COLD_WORDS)) return { kind: 'hmcold', variant: '' };
    if (has(raw, LANE_WORDS)) return { kind: 'hmlane', variant: '' };
    if (has(raw, GARDEN_WORDS)) return { kind: 'hmgarden', variant: '' };
    if (has(raw, CHAMBER_WORDS) || CHAMBER_RE.test(raw.trim())) return { kind: 'hmbed', variant: '' };
    return null;
}

export const HAREM_AMBIENT_KINDS = Object.freeze(['hmwatch', 'hmlantern']);
export const HAREM_AMBIENT_LABELS = Object.freeze({ hmwatch: '宫中打更', hmlantern: '宫灯' });

// 夜里在宫中任一地点听见远处打更；宫灯的轻响夜里跟着寝宫、长街、冷宫。
export function planHaremAmbient(ctx, { night = false } = {}) {
    if (!ctx || ctx.worldview !== 'ancient' || !night) return [];
    const hit = resolveHaremAmbience(ctx.location, { worldview: 'ancient' });
    if (!hit) return [];
    const out = [{ kind: 'hmwatch', level: 'light' }];
    if (hit.kind !== 'hmgarden') out.push({ kind: 'hmlantern', level: 'light' });
    return out;
}

export function createHaremVoices(h) {
    const { rand, chain, makeNoise, makeFilter, makeGain, makeLfo, layerLater, noiseBurst, blip, FLOOR } = h;

    // 打更：远处一声木梆「笃」，隔一拍再一声；更次间偶有一记低低的铜锣。
    function voiceWatch(layer) {
        const knock = (at, freq, peak, pan) => {
            blip(layer, at, 0.14, (osc, amp) => {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, at);
                osc.frequency.exponentialRampToValueAtTime(freq * 0.55, at + 0.1);
                amp.gain.setValueAtTime(FLOOR, at);
                amp.gain.exponentialRampToValueAtTime(peak, at + 0.004);
                amp.gain.exponentialRampToValueAtTime(FLOOR, at + 0.14);
            }, pan, { filter: { type: 'lowpass', frequency: 900, q: 0.7 } });
            noiseBurst(layer, at, 0.04, { type: 'bandpass', frequency: rand(900, 1300), q: 2, peak: peak * 0.5, attack: 0.001, pan });
        };
        const round = () => {
            const at = layer.ctx.currentTime + 0.05;
            const pan = rand(-0.7, 0.7);
            const base = rand(300, 380);
            const strokes = 1 + Math.floor(Math.random() * 3);
            for (let i = 0; i < strokes; i++) knock(at + i * 0.78, base * (i % 2 ? 1.18 : 1), rand(0.03, 0.05), pan);
            if (Math.random() < 0.35) {
                const gong = at + strokes * 0.78 + 0.5;
                blip(layer, gong, 1.6, (osc, amp) => {
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(rand(150, 190), gong);
                    amp.gain.setValueAtTime(FLOOR, gong);
                    amp.gain.exponentialRampToValueAtTime(rand(0.02, 0.035), gong + 0.01);
                    amp.gain.exponentialRampToValueAtTime(FLOOR, gong + 1.6);
                }, pan, { filter: { type: 'lowpass', frequency: 600, q: 0.7 } });
            }
            layerLater(layer, round, rand(14000, 30000));
        };
        layerLater(layer, round, rand(2500, 7000));
    }

    // 宫灯：灯芯偶尔「噼」一声，底下是一层几乎听不见的暖气流。
    function voiceLantern(layer) {
        const air = makeGain(layer, 0.012);
        chain(makeNoise(layer), makeFilter(layer, 'lowpass', 260), air, layer.out);
        makeLfo(layer, rand(0.08, 0.16), 0.004, air.gain);
        const snap = () => {
            const at = layer.ctx.currentTime + 0.05;
            const pan = rand(-0.6, 0.6);
            const n = 1 + Math.floor(Math.random() * 3);
            for (let i = 0; i < n; i++) noiseBurst(layer, at + i * rand(0.05, 0.12), rand(0.012, 0.03), { type: 'highpass', frequency: rand(2600, 4600), q: 0.7, peak: rand(0.02, 0.05), attack: 0.001, pan });
            layerLater(layer, snap, rand(5000, 15000));
        };
        layerLater(layer, snap, rand(2000, 6000));
    }

    return Object.freeze({ hmwatch: voiceWatch, hmlantern: voiceLantern });
}
