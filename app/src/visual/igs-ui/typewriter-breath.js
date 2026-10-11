// 喘息式打字节奏（附加层，默认关）：亲密 / 情事页让逗号、省略号、破折号后的停顿更长，像断断续续的呼吸。
// 只给出选项与停顿时长，不改基础打字机的输出：调用方把 plan 合并进 applyTypewriterEffect 的选项（speed / punctuationPause），
// 停顿时长经 breathPauseAfter 叠加在 speech-prosody 的 punctuationPauseAfter 之上。
import { punctuationPauseAfter } from './speech-prosody.js';

const SLOWER = Object.freeze({ fast: 'medium', medium: 'slow', slow: 'slow' });
// 停顿倍数（相对字距）：只补基础表没有或偏短的几类。
const BREATH_EXTRA = Object.freeze([
    [/^[，、,]$/u, 4],
    [/^[…⋯]$/u, 7],
    [/^[—－-]$/u, 5],
    [/^[～~]$/u, 4],
    [/^[。！？!?]$/u, 9],
]);
const PHASE_SCALE = Object.freeze({ rise: 0.8, steady: 1, climax: 1.35, after: 1.15 });

export function breathPauseAfter(text, speed, scale = 1) {
    const base = punctuationPauseAfter(text, speed);
    const k = Number(scale) > 0 ? Number(scale) : 1;
    for (const [re, factor] of BREATH_EXTRA) if (re.test(text)) return Math.max(base, speed * factor * k);
    return base;
}

// 返回 null 表示不启用；否则 { speed, punctuationPause: true, pauseScale }。减少动态效果与暧昧档（1）不启用。
export function planBreathTypewriter({ enabled = false, level = 0, phase = '', reduced = false, speed = 'medium' } = {}) {
    if (enabled !== true || reduced || !(level >= 2)) return null;
    const base = Object.hasOwn(SLOWER, speed) ? speed : 'medium';
    const slow = phase === 'after' || phase === 'rise';
    return {
        speed: slow ? SLOWER[base] : base,
        punctuationPause: true,
        pauseScale: PHASE_SCALE[phase] || 1,
    };
}
