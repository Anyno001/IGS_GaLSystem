// 语音局部滤镜：只作用于语气音与接口 TTS 的声链（BGM 与环境声不动，不碰总线路由）。
// ear 贴耳：声像拉近、音量放轻、高频柔化；muffled 隔墙闷声：局部低通。系统语音不过总线，只能按 voiceFilterGain 调音量。
// 各调用方用 owner 区分自己设的滤镜，互不覆盖；同时存在时 muffled 优先于 ear。
export const VOICE_FILTER_MODES = Object.freeze(['none', 'ear', 'muffled']);
export const VOICE_FILTER_PARAMS = Object.freeze({
    ear: Object.freeze({ gain: 0.78, lowShelf: 4, lowpass: 7200, pan: 0.32, dry: true }),
    muffled: Object.freeze({ gain: 0.6, lowShelf: 0, lowpass: 650, pan: 0, dry: false }),
});

const owners = new Map();

function modeOf(mode) {
    return VOICE_FILTER_MODES.includes(mode) ? mode : 'none';
}

export function getVoiceFilter() {
    let ear = false;
    for (const mode of owners.values()) {
        if (mode === 'muffled') return 'muffled';
        if (mode === 'ear') ear = true;
    }
    return ear ? 'ear' : 'none';
}

// mode 为 'none' 时清掉这个 owner 的设置。
export function setVoiceFilter(mode, owner = 'ext') {
    const next = modeOf(mode);
    const key = String(owner || 'ext');
    if (next === 'none') owners.delete(key);
    else owners.set(key, next);
    return getVoiceFilter();
}

export function voiceFilterParams(mode = getVoiceFilter()) {
    return Object.hasOwn(VOICE_FILTER_PARAMS, mode) ? VOICE_FILTER_PARAMS[mode] : null;
}

export function voiceFilterGain(mode = getVoiceFilter()) {
    const params = voiceFilterParams(mode);
    return params ? params.gain : 1;
}

// 贴耳走 dry（不进房间混响）。
export function voiceFilterUsesDry(mode = getVoiceFilter()) {
    const params = voiceFilterParams(mode);
    return Boolean(params && params.dry);
}

// 在声链尾部插入滤镜节点：link 由调用方提供（接到当前尾并把节点记入回收表），返回是否插入。
export function insertVoiceFilter(context, link, mode = getVoiceFilter()) {
    const params = voiceFilterParams(mode);
    if (!params || typeof context.createBiquadFilter !== 'function') return false;
    if (params.lowShelf) {
        const shelf = context.createBiquadFilter();
        shelf.type = 'lowshelf';
        shelf.frequency.value = 220;
        shelf.gain.value = params.lowShelf;
        link(shelf);
    }
    const low = context.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = params.lowpass;
    low.Q.value = 0.7;
    link(low);
    return true;
}

export function resetVoiceFilterForTest() {
    owners.clear();
}
