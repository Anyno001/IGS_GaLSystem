// 戳一下镜头：舞台做一次「推近 - 回弹」，参数与 camera-impact 的冲击推近一致。
// 单独成文件是为了不经过音频模块：题材包清单与它的辅助文件不能（间接）引入 scene-audio，否则会和 fx-packs 成环。
import { FX_RHYTHM } from './fx-rhythm.js';

const PEAK = 1.045;
const PEAK_OFFSET = 0.18;
const running = new WeakMap();

export function isLowQuality(root) {
    return Boolean(root) && typeof root.getAttribute === 'function' && root.getAttribute('data-igs-quality') === 'low';
}

// 返回是否起播；减少动态效果、低画质、舞台不支持 WAAPI 时不播。播放期间重复调用只保留最新一次。
export function punchStage(stage, { reduced = false, low = false, scale = PEAK } = {}) {
    if (!stage || typeof stage.animate !== 'function' || reduced || low) return false;
    const previous = running.get(stage);
    if (previous) {
        try { previous.cancel(); } catch { /* 已结束 */ }
        running.delete(stage);
    }
    let anim = null;
    try {
        anim = stage.animate(
            [{ scale: '1' }, { scale: String(scale), offset: PEAK_OFFSET }, { scale: '1' }],
            { duration: FX_RHYTHM.impact.duration, easing: FX_RHYTHM.impact.easing },
        );
    } catch {
        return false;
    }
    running.set(stage, anim);
    anim.onfinish = () => { if (running.get(stage) === anim) running.delete(stage); };
    return true;
}
