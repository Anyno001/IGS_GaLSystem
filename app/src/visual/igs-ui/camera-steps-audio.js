import { busInput } from './audio-bus.js';
import { createIntimateVoice } from './romance-intimate-audio.js';

const FLOOR = 0.0001;
const PAIR_OFFSET_S = 0.022;
const PAIR_SPREAD = 0.3;

export const STEP_RECIPES = Object.freeze({
    wood: Object.freeze({ tempo: 0.5, thump: [120, 62, 0.1, 0.5], noise: ['lowpass', 1100, 500, 0.8, 0.08, 0.2], tick: [2400, 2, 0.012, 0.07] }),
    stone: Object.freeze({ tempo: 0.48, thump: [150, 90, 0.07, 0.32], noise: ['bandpass', 2200, 1200, 1.2, 0.06, 0.24], tick: [3200, 1, 0.01, 0.1] }),
    grass: Object.freeze({ tempo: 0.55, thump: [90, 60, 0.12, 0.2], noise: ['bandpass', 1800, 900, 0.7, 0.17, 0.22], tick: null }),
    snow: Object.freeze({ tempo: 0.6, thump: [70, 50, 0.14, 0.16], noise: ['bandpass', 3200, 1800, 1.5, 0.2, 0.24], tick: [4200, 3, 0.03, 0.08] }),
    puddle: Object.freeze({ tempo: 0.55, thump: [100, 70, 0.08, 0.3], noise: ['lowpass', 1400, 700, 0.8, 0.1, 0.2], tick: [2800, 3, 0.14, 0.12] }),
    hall: Object.freeze({ tempo: 0.52, thump: [150, 90, 0.07, 0.32], noise: ['bandpass', 2000, 1100, 1.1, 0.06, 0.22], tick: [3000, 1, 0.01, 0.1], echo: [0.19, 0.38, 0.45] }),
});

const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
const lerp = (a, b, k) => a + (b - a) * k;

export function panPath(dir, count, side = 0) {
    const n = Math.max(1, count | 0);
    const at = (i) => (n === 1 ? 0.5 : i / (n - 1));
    const sign = side < 0 ? -1 : side > 0 ? 1 : 0;
    return Array.from({ length: n }, (_, i) => {
        if (dir === 'lr') return clamp(lerp(-0.85, 0.85, at(i)), -1, 1);
        if (dir === 'rl') return clamp(lerp(0.85, -0.85, at(i)), -1, 1);
        if (sign && dir === 'far') return clamp(sign * lerp(0.15, 0.85, at(i)), -1, 1);
        if (sign && dir === 'near') return clamp(sign * lerp(0.85, 0.15, at(i)), -1, 1);
        return (i % 2 ? 1 : -1) * 0.06;
    });
}

function distanceAt(dir, k) {
    if (dir === 'near') return { gain: lerp(0.3, 1, k), cutoff: lerp(1200, 9000, k) };
    if (dir === 'far') return { gain: lerp(1, 0.2, k), cutoff: lerp(9000, 900, k) };
    const arc = 1 - Math.abs(k - 0.5) * 1.1;
    return { gain: lerp(0.45, 1, arc), cutoff: lerp(2600, 9000, arc) };
}

export function buildStepPlan({ material = 'wood', dir = 'lr', count = 6, pair = false, side = 0 } = {}) {
    const recipe = STEP_RECIPES[material] || STEP_RECIPES.wood;
    const n = clamp(Math.round(Number(count) || 6), 1, 16);
    const pans = panPath(dir, n, side);
    const walker = (offset, panShift) => ({
        offset,
        steps: pans.map((pan, i) => {
            const k = n === 1 ? 0.5 : i / (n - 1);
            const d = distanceAt(dir, k);
            return { t: offset + i * recipe.tempo, pan: clamp(pan + panShift, -1, 1), gain: d.gain, cutoff: d.cutoff, foot: i % 2 ? 'r' : 'l' };
        }),
    });
    const walkers = pair ? [walker(0, -PAIR_SPREAD), walker(PAIR_OFFSET_S, PAIR_SPREAD)] : [walker(0, 0)];
    return { material: STEP_RECIPES[material] ? material : 'wood', dir, count: n, pair: Boolean(pair), tempo: recipe.tempo, walkers, duration: (n - 1) * recipe.tempo + 0.6 };
}

const noiseCache = new WeakMap();

function noiseBuffer(ctx) {
    const hit = noiseCache.get(ctx);
    if (hit) return hit;
    const rate = ctx.sampleRate || 44100;
    const buffer = ctx.createBuffer(1, rate, rate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noiseCache.set(ctx, buffer);
    return buffer;
}

function burst(ctx, dest, nodes, t, [type, from, to, q, dur, gain], level) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx);
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(from, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + dur);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(gain * level, t + Math.min(0.012, dur * 0.3));
    env.gain.exponentialRampToValueAtTime(FLOOR, t + dur);
    src.connect(filter);
    filter.connect(env);
    env.connect(dest);
    nodes.push(src, filter, env);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.03);
}

function thump(ctx, dest, nodes, t, [from, to, dur, gain], level) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(gain * level, t + 0.006);
    env.gain.exponentialRampToValueAtTime(FLOOR, t + dur);
    osc.connect(env);
    env.connect(dest);
    nodes.push(osc, env);
    osc.start(t);
    osc.stop(t + dur + 0.03);
}

function scheduleWalker(ctx, master, nodes, walker, recipe, base) {
    const head = ctx.createGain();
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    const first = walker.steps[0];
    const last = walker.steps[walker.steps.length - 1];
    low.frequency.setValueAtTime(first.cutoff, base + first.t);
    head.gain.setValueAtTime(first.gain, base + first.t);
    let tail = low;
    head.connect(low);
    nodes.push(head, low);
    if (typeof ctx.createStereoPanner === 'function') {
        const panner = ctx.createStereoPanner();
        panner.pan.setValueAtTime(first.pan, base + first.t);
        for (const step of walker.steps) panner.pan.linearRampToValueAtTime(step.pan, base + step.t);
        low.connect(panner);
        nodes.push(panner);
        tail = panner;
    }
    for (const step of walker.steps) {
        low.frequency.linearRampToValueAtTime(step.cutoff, base + step.t);
        head.gain.linearRampToValueAtTime(step.gain, base + step.t);
    }
    tail.connect(master);
    if (recipe.echo && typeof ctx.createDelay === 'function') {
        const delay = ctx.createDelay(1);
        const feedback = ctx.createGain();
        const wet = ctx.createGain();
        const soft = ctx.createBiquadFilter();
        delay.delayTime.value = recipe.echo[0];
        feedback.gain.value = recipe.echo[1];
        wet.gain.value = recipe.echo[2];
        soft.type = 'lowpass';
        soft.frequency.value = 2200;
        tail.connect(delay);
        delay.connect(soft);
        soft.connect(feedback);
        feedback.connect(delay);
        soft.connect(wet);
        wet.connect(master);
        nodes.push(delay, feedback, wet, soft);
    }
    for (const step of walker.steps) {
        const t = base + step.t;
        const side = step.foot === 'l' ? 1 : 0.86;
        thump(ctx, head, nodes, t, recipe.thump, side);
        burst(ctx, head, nodes, t, recipe.noise, side);
        if (recipe.tick) burst(ctx, head, nodes, t + 0.004, ['bandpass', recipe.tick[0], recipe.tick[0] * 0.8, recipe.tick[1], recipe.tick[2], recipe.tick[3]], side);
    }
    return last.t;
}

export function playSteps(plan, { volume = 0.25, output = null } = {}) {
    const out = output || busInput('sfx');
    if (!out || !out.context || !plan || !plan.walkers) return null;
    const ctx = out.context;
    const nodes = [];
    const recipe = STEP_RECIPES[plan.material] || STEP_RECIPES.wood;
    let master;
    try {
        master = ctx.createGain();
        master.gain.value = clamp(Number(volume) || 0, 0, 1);
        master.connect(out);
        nodes.push(master);
        const base = ctx.currentTime + 0.05;
        for (const walker of plan.walkers) scheduleWalker(ctx, master, nodes, walker, recipe, base);
    } catch {
        return null;
    }
    let done = false;
    const stop = () => {
        if (done) return;
        done = true;
        for (const node of nodes) {
            try { node.stop?.(); } catch { /* 已停止 */ }
            try { node.disconnect(); } catch { /* 已断开 */ }
        }
    };
    const timer = globalThis.setTimeout(stop, Math.round((plan.duration + (recipe.echo ? 2 : 0.8)) * 1000));
    return { stop: () => { globalThis.clearTimeout(timer); stop(); }, plan };
}

export function planBodySounds({ ms = 4000, bpmFrom = 84, bpmTo = 132, stopAtMs = 0, breath = true } = {}) {
    const beats = [];
    const end = stopAtMs > 0 ? Math.min(stopAtMs, ms) : ms;
    let t = 0.1;
    while (t * 1000 < end) {
        const k = clamp(t * 1000 / Math.max(1, ms), 0, 1);
        const bpm = lerp(bpmFrom, bpmTo, k);
        beats.push({ t, bpm });
        t += 60 / bpm;
    }
    const breaths = [];
    if (breath) for (let at = 0.2; at * 1000 < end; at += 0.95) breaths.push({ t: at, inhale: breaths.length % 2 === 0 });
    return { beats, breaths };
}

export function playBodySounds(options = {}) {
    const volume = clamp(Number(options.volume) || 0, 0, 1);
    if (!(volume > 0)) return null;
    const voice = createIntimateVoice(volume);
    if (!voice) return null;
    const plan = planBodySounds(options);
    const base = voice.ctx.currentTime + 0.05;
    for (const beat of plan.beats) voice.heartbeat(base + beat.t, { bpm: beat.bpm, gain: 1 });
    for (const item of plan.breaths) voice.breath(base + item.t, { inhale: item.inhale, duration: 0.8, gain: 1.2, lowpass: options.muffled ? 900 : 2400 });
    const ms = Number(options.ms) || 4000;
    const timer = globalThis.setTimeout(() => voice.dispose(0.3), ms + 600);
    return { stop: () => { globalThis.clearTimeout(timer); voice.dispose(0.15); }, plan };
}
