// 神话妖魔包的常驻地点层与环境音：天界、妖市鬼市、幽冥黄泉、妖洞。只在古代世界观生效。
// 画面全部是静态或极慢的 CSS；环境音全部用滤波噪声与短音合成，原语由 scene-audio 传入。
const SKY_RE = /南天门|凌霄|蟠桃|天界|九重天|兜率|琼楼玉宇|天门/;
const BAZAAR_RE = /鬼市|妖市|妖街|魑魅|百鬼夜|妖坊/;
const HADES_RE = /幽冥|黄泉|彼岸花|忘川|奈何桥|冥界|地府|阎罗|三途|鬼门关/;
const CAVE_RE = /妖洞|妖窟|魔窟|盘丝洞|蛇窟|狐狸洞|魔洞|妖巢/;

export const MYTH_AMBIENCE_HTML = Object.freeze({
    mythsky: '<i class="igs-myth-amb-sky"></i><i class="igs-myth-amb-cloud"></i><i class="igs-myth-amb-cloud is-b"></i><i class="igs-myth-amb-pillar is-l"></i><i class="igs-myth-amb-pillar is-r"></i>',
    mythbazaar: '<i class="igs-myth-amb-veil"></i><i class="igs-myth-amb-lowmist"></i><i class="igs-myth-amb-lantern" style="left:12%;--lamp:#3fe0b0"></i><i class="igs-myth-amb-lantern" style="left:36%;--lamp:#ff8a3d;animation-delay:-2s"></i><i class="igs-myth-amb-lantern" style="left:61%;--lamp:#3fe0b0;animation-delay:-3s"></i><i class="igs-myth-amb-lantern" style="left:85%;--lamp:#c58cff;animation-delay:-1s"></i>',
    mythhades: '<i class="igs-myth-amb-veil"></i><i class="igs-myth-amb-redmist"></i><svg class="igs-myth-amb-lilies" viewBox="0 0 100 16" preserveAspectRatio="none" aria-hidden="true">'
        + [6, 17, 29, 41, 55, 67, 79, 91].map((x, i) => `<path class="stem" d="M${x} 16Q${x + 1} 10 ${x} ${5 + (i % 3)}"/><path d="M${x} ${5 + (i % 3)}q-3 -2 -4 -5M${x} ${5 + (i % 3)}q3 -2 4 -5M${x} ${5 + (i % 3)}q-1 -3 -1 -5M${x} ${5 + (i % 3)}q1 -3 1 -5"/>`).join('')
        + '</svg>',
    mythcave: '<i class="igs-myth-amb-dark"></i><i class="igs-myth-amb-stalac"></i><i class="igs-myth-amb-glint"></i><i class="igs-myth-amb-eyes"></i>',
});

export function resolveMythAmbience(location, { worldview = '' } = {}) {
    if (worldview !== 'ancient') return null;
    const text = String(location == null ? '' : location);
    if (!text) return null;
    if (HADES_RE.test(text)) return { kind: 'mythhades' };
    if (CAVE_RE.test(text)) return { kind: 'mythcave' };
    if (BAZAAR_RE.test(text)) return { kind: 'mythbazaar' };
    if (SKY_RE.test(text)) return { kind: 'mythsky' };
    return null;
}

export const MYTH_AMBIENT_LABELS = Object.freeze({ mythwind: '天风', mythbazaar: '妖市嘈杂', mythriver: '冥河水声', mythdrip: '洞穴滴水' });

const AUDIO_OF = Object.freeze({ mythsky: 'mythwind', mythbazaar: 'mythbazaar', mythhades: 'mythriver', mythcave: 'mythdrip' });

export function planMythAmbient(ctx) {
    if (!ctx || ctx.worldview !== 'ancient') return [];
    const hit = resolveMythAmbience(ctx.location, { worldview: 'ancient' });
    return hit ? [{ kind: AUDIO_OF[hit.kind], level: 'medium' }] : [];
}

export function createMythVoices(h) {
    const { rand, chain, makeNoise, makeFilter, makeGain, makeLfo, layerLater, noiseBurst, blip, FLOOR } = h;

    // 天风：高处的宽带风声缓缓起伏，偶有一缕清越的高音随风而过。
    function voiceMythWind(layer) {
        const band = makeFilter(layer, 'bandpass', 700, 0.8);
        const swell = makeGain(layer, 0.36);
        chain(makeNoise(layer), band, swell, layer.out);
        makeLfo(layer, rand(0.05, 0.1), 420, band.frequency);
        makeLfo(layer, rand(0.04, 0.08), 0.16, swell.gain);
        chain(makeNoise(layer), makeFilter(layer, 'highpass', 2600), makeGain(layer, 0.025), layer.out);
        const chime = () => {
            const at = layer.ctx.currentTime + 0.05;
            const freq = rand(1300, 2100);
            const pan = rand(-0.6, 0.6);
            blip(layer, at, 2.4, (osc, amp) => {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, at);
                amp.gain.setValueAtTime(FLOOR, at);
                amp.gain.exponentialRampToValueAtTime(rand(0.012, 0.024), at + 0.6);
                amp.gain.exponentialRampToValueAtTime(FLOOR, at + 2.4);
            }, pan);
            layerLater(layer, chime, rand(9000, 24000));
        };
        layerLater(layer, chime, rand(4000, 12000));
    }

    // 妖市：层层叠叠的低语底噪、远处吆喝的拖腔、偶尔一声铜铃或杯盏。
    function voiceMythBazaar(layer) {
        const murmur = makeGain(layer, 0.2);
        chain(makeNoise(layer), makeFilter(layer, 'highpass', 200), makeFilter(layer, 'lowpass', 1200), murmur, layer.out);
        const formant = makeFilter(layer, 'bandpass', 520, 1.3);
        chain(makeNoise(layer), formant, makeGain(layer, 0.1), layer.out);
        makeLfo(layer, rand(0.18, 0.34), 220, formant.frequency);
        const wander = () => {
            murmur.gain.setTargetAtTime(rand(0.12, 0.26), layer.ctx.currentTime, 0.7);
            layerLater(layer, wander, rand(800, 2200));
        };
        wander();
        const call = () => {
            const at = layer.ctx.currentTime + 0.05;
            const base = rand(180, 300);
            const pan = rand(-0.8, 0.8);
            blip(layer, at, 0.9, (osc, amp) => {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(base, at);
                osc.frequency.linearRampToValueAtTime(base * rand(1.1, 1.4), at + 0.25);
                osc.frequency.linearRampToValueAtTime(base * 0.9, at + 0.9);
                amp.gain.setValueAtTime(FLOOR, at);
                amp.gain.exponentialRampToValueAtTime(rand(0.008, 0.016), at + 0.12);
                amp.gain.exponentialRampToValueAtTime(FLOOR, at + 0.9);
            }, pan, { filter: { type: 'bandpass', frequency: base * 3, q: 1.4 } });
            layerLater(layer, call, rand(7000, 18000));
        };
        layerLater(layer, call, rand(3000, 8000));
        const bell = () => {
            const at = layer.ctx.currentTime + 0.05;
            const pan = rand(-0.9, 0.9);
            const base = rand(1900, 2700);
            for (const [ratio, gain, decay] of [[1, 1, 0.7], [2.4, 0.4, 0.3]]) {
                blip(layer, at, decay, (osc, amp) => {
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(base * ratio, at);
                    amp.gain.setValueAtTime(FLOOR, at);
                    amp.gain.exponentialRampToValueAtTime(0.02 * gain, at + 0.004);
                    amp.gain.exponentialRampToValueAtTime(FLOOR, at + decay);
                }, pan);
            }
            layerLater(layer, bell, rand(8000, 22000));
        };
        layerLater(layer, bell, rand(5000, 14000));
    }

    // 冥河：缓慢的水流，间或远处一声悠长的呜咽般的低鸣。
    function voiceMythRiver(layer) {
        const band = makeFilter(layer, 'bandpass', 380, 0.7);
        chain(makeNoise(layer), band, makeGain(layer, 0.3), layer.out);
        makeLfo(layer, rand(0.1, 0.2), 140, band.frequency);
        chain(makeNoise(layer), makeFilter(layer, 'lowpass', 120), makeGain(layer, 0.22), layer.out);
        const lap = () => {
            noiseBurst(layer, layer.ctx.currentTime + 0.05, rand(0.4, 0.9), { type: 'bandpass', frequency: rand(500, 900), q: 1.1, peak: rand(0.02, 0.04), attack: 0.25, pan: rand(-0.7, 0.7) });
            layerLater(layer, lap, rand(2500, 6500));
        };
        layerLater(layer, lap, rand(800, 3000));
        const moan = () => {
            const at = layer.ctx.currentTime + 0.05;
            const base = rand(110, 160);
            blip(layer, at, 4.2, (osc, amp) => {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(base, at);
                osc.frequency.linearRampToValueAtTime(base * 0.8, at + 4.2);
                amp.gain.setValueAtTime(FLOOR, at);
                amp.gain.exponentialRampToValueAtTime(rand(0.02, 0.035), at + 1.6);
                amp.gain.exponentialRampToValueAtTime(FLOOR, at + 4.2);
            }, rand(-0.5, 0.5));
            layerLater(layer, moan, rand(18000, 40000));
        };
        layerLater(layer, moan, rand(9000, 20000));
    }

    // 洞穴：空洞的底噪和一滴一滴带回响的水声。
    function voiceMythDrip(layer) {
        chain(makeNoise(layer), makeFilter(layer, 'lowpass', 130), makeGain(layer, 0.14), layer.out);
        const hall = makeGain(layer, 0.012);
        chain(makeNoise(layer), makeFilter(layer, 'bandpass', 900, 0.5), hall, layer.out);
        makeLfo(layer, rand(0.05, 0.1), 0.006, hall.gain);
        const plink = (at, freq, peak, pan) => blip(layer, at, 0.3, (osc, amp) => {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, at);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.8, at + 0.05);
            amp.gain.setValueAtTime(FLOOR, at);
            amp.gain.exponentialRampToValueAtTime(peak, at + 0.003);
            amp.gain.exponentialRampToValueAtTime(FLOOR, at + 0.3);
        }, pan);
        const drop = () => {
            const at = layer.ctx.currentTime + 0.03;
            const freq = rand(600, 1400);
            const peak = rand(0.04, 0.08);
            const pan = rand(-0.8, 0.8);
            plink(at, freq, peak, pan);
            plink(at + rand(0.18, 0.28), freq * 0.96, peak * 0.4, pan);
            plink(at + rand(0.4, 0.55), freq * 0.92, peak * 0.18, pan);
            layerLater(layer, drop, rand(1400, 4200));
        };
        layerLater(layer, drop, rand(300, 1500));
    }

    return { mythwind: voiceMythWind, mythbazaar: voiceMythBazaar, mythriver: voiceMythRiver, mythdrip: voiceMythDrip };
}
