import { resolveWeatherFxScene } from './weather-fx-runtime.js';

const text = (value) => String(value == null ? '' : value).trim();
const pick = (table, value, fallback = '') => {
    const key = text(value).toLowerCase();
    return Object.hasOwn(table, key) ? table[key] : fallback;
};

export const CAMERA_KINDS = Object.freeze([
    'fg', 'peek', 'flare', 'streak', 'bob', 'backdrop', 'jcut', 'lcut', 'establish', 'cut', 'montage', 'timelapse', 'split', 'linger',
    'step', 'walk', 'chase', 'sneak', 'seeoff', 'enterroom',
]);

export const CAMERA_LABELS = Object.freeze({
    fg: '前景掠过物', peek: '前景遮挡', flare: '镜头光晕', streak: '速度流线', bob: '上半身颠簸', backdrop: '情绪背景',
    jcut: '声音提前进入', lcut: '声音延后退出', establish: '定场镜头', cut: '指定转场', montage: '蒙太奇', timelapse: '延时',
    split: '同时分屏', linger: '时间流光', step: '脚步声', walk: '散步与穿行', chase: '追逐', sneak: '潜行躲藏',
    seeoff: '目送', enterroom: '走进陌生房间',
});

export const CAMERA_TRIGGERS = Object.freeze({
    fg: ['擦肩', '栏杆', '树影', '掠过'],
    peek: ['偷看', '窥视', '躲在后面'],
    flare: ['光晕', '逆光', '阳光刺眼'],
    streak: ['疾驰', '狂奔', '冲刺', '飞奔'],
    bob: ['奔跑', '小跑', '颠簸'],
    backdrop: ['雷声', '闪电', '花瓣纷飞'],
    jcut: ['远处传来', '隐约传来', '渐渐听到'],
    lcut: ['余音', '仍回荡', '耳边还响'],
    establish: ['抵达', '远眺', '入城', '全景'],
    cut: ['画面一转', '镜头一转', '场景切换'],
    montage: ['一路上', '几天后', '辗转', '奔波'],
    timelapse: ['日落', '天色渐暗', '时光飞逝'],
    split: ['与此同时', '另一边', '同一时间'],
    linger: ['窗帘', '窗外', '余晖', '车灯'],
    step: ['脚步声', '脚步', '踩着', '走廊里'],
    walk: ['散步', '并肩走', '穿过树林', '林间'],
    chase: ['追赶', '追逐', '逃跑', '追上'],
    sneak: ['潜行', '屏住呼吸', '躲藏', '蹑手蹑脚'],
    seeoff: ['目送', '背影', '远去', '消失在'],
    enterroom: ['推门而入', '走进房间', '陌生的房间'],
});

export const CAMERA_GRAMMAR_LINES = Object.freeze({
    fg: 'fg|树叶/栏杆/电线杆/路人|左/右：路过时前景虚化掠过',
    peek: 'peek|窗框/树叶/门缝|角：偷看或躲藏时一角被遮挡',
    flare: 'flare|左/右：强光扫过镜头的光晕',
    streak: 'streak|左/右|色：疾驰时整屏速度流线',
    bob: 'bob：奔跑时上半身颠簸，不带字段',
    backdrop: 'backdrop|纯色/花/闪光/雷/暗|色：情绪背景，色可省',
    jcut: 'jcut|地点：下一场景的环境音提前进入',
    lcut: 'lcut：上一场景的环境音延后退出，不带字段',
    establish: 'establish|地点：抵达新地点的定场空镜加地点卡',
    cut: 'cut|划变/黑场/淡入：本页换背景的转场',
    montage: 'montage|2-4：赶路或辗转的多格蒙太奇',
    timelapse: 'timelapse|日落/入夜/日出：光线快速流转',
    split: 'split|地点|角色：同一时间另一边的分屏，角色可省',
    linger: 'linger|窗光/夕影/车灯/窗帘：待着时缓慢的光影',
    step: 'step|材质|方向|数量|并肩：脚步声，材质 木/石/草/雪/水/走廊 可省，方向 左右/右左/逼近/远去',
    walk: 'walk|树林/并肩：散步穿行',
    chase: 'chase|逃脱/被抓/获救：追逐，结局可省',
    sneak: 'sneak：潜行躲藏，屏息与心跳，不带字段',
    seeoff: 'seeoff|左/右：目送离开，步声渐远',
    enterroom: 'enterroom|房间：走进陌生房间',
});

export const CAMERA_PROMPT_LINES = Object.freeze({
    fg: '[igs-fx:fg|树叶/栏杆/电线杆/路人|左/右]：人物行进、擦肩而过时写，一个虚化的前景物从画面前掠过；方向可省，默认向右',
    peek: '[igs-fx:peek|窗框/树叶/门缝|左上/右上/左下/右下]：偷看、躲藏、窥视时写，画面一角被物件遮住一部分；物件与角落可省',
    flare: '[igs-fx:flare|左/右]：逆光、阳光或车灯扫过镜头时写，一道光晕横扫并伴有散景；方向可省',
    streak: '[igs-fx:streak|左/右|暖/冷/白/红/金]：疾驰、冲刺、乘车飞驰时写，整屏同色速度流线；方向与颜色可省',
    bob: '[igs-fx:bob]：人物奔跑或颠簸前行时写，上半身随步伐上下轻晃，不带字段',
    backdrop: '[igs-fx:backdrop|纯色/花/闪光/雷/暗|色]：用情绪背景烘托这一页，纯色为渐变底，雷为冷白闪光；颜色可省',
    jcut: '[igs-fx:jcut|地点]：场景即将切换，下一个地点的环境声提前淡入；地点必填',
    lcut: '[igs-fx:lcut]：场景已切换但上一个地点的声音还没散，环境声延后退出，不带字段',
    establish: '[igs-fx:establish|地点]：抵达新地点时写，本页是不见人物的定场空镜，浮出地点名卡；地点可省，默认取当前地点',
    cut: '[igs-fx:cut|划变/黑场/淡入]：本页背景要换时指定转场样式，只影响这一页',
    montage: '[igs-fx:montage|格数]：赶路、辗转多地时写，画面分成 2-4 格依次切入后淡出；格数 2-4，默认 3',
    timelapse: '[igs-fx:timelapse|日落/入夜/日出]：时间快速流逝时写，云影掠过、天色在两秒内走到目标时段',
    split: '[igs-fx:split|地点|角色]：同一时间另一边发生什么时写，画面斜切分屏，另一半是另一处景与对方；角色可省',
    linger: '[igs-fx:linger|窗光/夕影/车灯/窗帘]：独自待着、时间缓慢流过时写，窗格光斑、拉长的影子、掠过的车灯或飘动的窗帘',
    step: '[igs-fx:step|木/石/草/雪/水/走廊|左右/右左/逼近/远去|步数|并肩]：需要听见脚步时写，材质可省按环境推断，方向决定声像移动，写并肩则两人同频',
    walk: '[igs-fx:walk|树林/并肩]：散步、穿过树林、并肩而行时写，镜头跟拍、前景掠过、脚步同行',
    chase: '[igs-fx:chase|逃脱/被抓/获救]：追逐场面写，速度流线、颠簸、身后脚步逼近与心跳；结局可省，表示追逐仍在继续',
    sneak: '[igs-fx:sneak]：潜行、躲藏、屏住呼吸时写，一角遮挡、暗角收紧、远处脚步与心跳，不带字段',
    seeoff: '[igs-fx:seeoff|左/右]：目送某人离开时写，镜头缓缓拉远、脚步声渐远；方向可省',
    enterroom: '[igs-fx:enterroom|房间]：走进陌生房间时写，镜头手持晃动后对焦，门缝光亮展开，脚步带回声；房间名可省',
});

export const CAMERA_EXTRA_SHOT_LINE = 'cam 另可写：跟拍（左/右）／甩镜（左/右）／下沉（坐下躺下）／升起（起身）／仰望／变焦（远/近）／主观（隐藏人物）／空镜（只剩背景）／慢；第4段写 手持 或 慢 可叠加，如[igs-fx:cam|摇镜|右|手持]';

const DIRS = Object.freeze({ 左: 'left', 向左: 'left', left: 'left', 右: 'right', 向右: 'right', right: 'right' });
const FG_ITEMS = Object.freeze({ 树叶: 'leaf', 叶子: 'leaf', 树枝: 'leaf', leaf: 'leaf', 栏杆: 'rail', 护栏: 'rail', rail: 'rail', 电线杆: 'pole', 灯柱: 'pole', pole: 'pole', 路人: 'passer', 行人: 'passer', passer: 'passer' });
const PEEK_OBJS = Object.freeze({ 窗框: 'window', 窗: 'window', window: 'window', 树叶: 'leaf', 树丛: 'leaf', 草丛: 'leaf', leaf: 'leaf', 门缝: 'door', 门: 'door', door: 'door' });
const CORNERS = Object.freeze({ 左上: 'tl', 右上: 'tr', 左下: 'bl', 右下: 'br', tl: 'tl', tr: 'tr', bl: 'bl', br: 'br' });
export const STREAK_COLORS = Object.freeze({ 暖: '#ffd29a', 冷: '#a8d4ff', 白: '#ffffff', 红: '#ff9a9a', 金: '#ffe08a', 粉: '#ffc2dc' });
const BACKDROPS = Object.freeze({ 纯色: 'solid', 渐变: 'solid', solid: 'solid', 花: 'flowers', 花瓣: 'flowers', flowers: 'flowers', 闪光: 'sparkle', 星: 'sparkle', sparkle: 'sparkle', 雷: 'thunder', 闪电: 'thunder', thunder: 'thunder', 暗: 'gloom', 阴沉: 'gloom', gloom: 'gloom' });
export const CUT_STYLES = Object.freeze({ 划变: 'wipe', wipe: 'wipe', 圈入: 'fade', 圈出: 'fade', 圈入圈出: 'fade', iris: 'fade', 黑场: 'black', black: 'black', 百叶: 'black', 百叶窗: 'black', blinds: 'black', 淡入: 'fade', fade: 'fade' });
const TIMELAPSE = Object.freeze({ 日落: 'dusk', 黄昏: 'dusk', dusk: 'dusk', 入夜: 'night', 夜晚: 'night', night: 'night', 日出: 'dawn', 清晨: 'dawn', dawn: 'dawn' });
const LINGER = Object.freeze({ 窗光: 'window', window: 'window', 夕影: 'shadow', 影子: 'shadow', shadow: 'shadow', 车灯: 'headlight', headlight: 'headlight', 窗帘: 'curtain', curtain: 'curtain' });
export const STEP_MATERIALS = Object.freeze({ 木地板: 'wood', 木: 'wood', wood: 'wood', 石板: 'stone', 石: 'stone', stone: 'stone', 草地: 'grass', 草: 'grass', 落叶: 'grass', grass: 'grass', 雪: 'snow', snow: 'snow', 水洼: 'puddle', 水: 'puddle', 积水: 'puddle', puddle: 'puddle', 走廊: 'hall', 走廊回声: 'hall', 回声: 'hall', hall: 'hall' });
const STEP_DIRS = Object.freeze({ 左右: 'lr', 左到右: 'lr', 向右: 'lr', lr: 'lr', 右左: 'rl', 右到左: 'rl', 向左: 'rl', rl: 'rl', 逼近: 'near', 靠近: 'near', 近: 'near', near: 'near', 远去: 'far', 远离: 'far', 远: 'far', far: 'far' });
const PAIR_WORDS = Object.freeze(['并肩', '同行', '两人', 'pair', '2']);
const WALKS = Object.freeze({ 树林: 'forest', 森林: 'forest', 竹林: 'forest', forest: 'forest', 并肩: 'side', 同行: 'side', side: 'side' });
const CHASES = Object.freeze({ 逃脱: 'escape', escape: 'escape', 被抓: 'caught', 抓住: 'caught', caught: 'caught', 获救: 'saved', 得救: 'saved', saved: 'saved' });

export const STEP_COUNT = Object.freeze({ min: 2, max: 12, fallback: 6 });

export function parseCameraFx(type, fields) {
    const [a = '', b = '', c = '', d = '', e = ''] = (fields || []).map(text);
    switch (type) {
    case 'fg': return ['fg', pick(FG_ITEMS, a, 'leaf'), pick(DIRS, b, 'right')];
    case 'peek': return ['peek', pick(PEEK_OBJS, a, 'window'), pick(CORNERS, b, 'bl')];
    case 'flare': return ['flare', pick(DIRS, a, 'right')];
    case 'streak': return ['streak', pick(DIRS, a, 'right'), Object.hasOwn(STREAK_COLORS, b) ? b : (/^#[0-9a-f]{3,8}$/i.test(b) ? b : '')];
    case 'bob': return ['bob'];
    case 'backdrop': return ['backdrop', pick(BACKDROPS, a, 'solid'), Object.hasOwn(STREAK_COLORS, b) ? b : (/^#[0-9a-f]{3,8}$/i.test(b) ? b : '')];
    case 'jcut': return a ? ['jcut', a.slice(0, 16)] : null;
    case 'lcut': return ['lcut'];
    case 'establish': return ['establish', a.slice(0, 16)];
    case 'cut': return ['cut', pick(CUT_STYLES, a, 'fade')];
    case 'montage': {
        const n = Number.parseInt(a, 10);
        return ['montage', String(n >= 2 && n <= 4 ? n : 3)];
    }
    case 'timelapse': return ['timelapse', pick(TIMELAPSE, a, 'dusk')];
    case 'split': return ['split', a.slice(0, 16), b.slice(0, 12)];
    case 'linger': return ['linger', pick(LINGER, a, 'window')];
    case 'step': {
        const n = Number.parseInt(c, 10);
        const count = n >= STEP_COUNT.min && n <= STEP_COUNT.max ? n : STEP_COUNT.fallback;
        const pair = [d, e, c].some((v) => PAIR_WORDS.includes(text(v).toLowerCase()));
        return ['step', pick(STEP_MATERIALS, a), pick(STEP_DIRS, b, 'lr'), String(count), pair ? 'pair' : ''];
    }
    case 'walk': return ['walk', pick(WALKS, a, 'forest')];
    case 'chase': return ['chase', pick(CHASES, a, 'run')];
    case 'sneak': return ['sneak'];
    case 'seeoff': return ['seeoff', pick(DIRS, a, 'right')];
    case 'enterroom': return ['enterroom', a.slice(0, 16)];
    default: return null;
    }
}

export function cameraFxOf(args) {
    const [type, a = '', b = '', c = '', d = ''] = args || [];
    switch (type) {
    case 'fg': return { type, item: a, dir: b };
    case 'peek': return { type, object: a, corner: b };
    case 'flare': return { type, dir: a };
    case 'streak': return { type, dir: a, color: b };
    case 'backdrop': return { type, style: a, color: b };
    case 'jcut': return { type, place: a };
    case 'establish': return { type, place: a };
    case 'cut': return { type, style: a };
    case 'montage': return { type, cells: Number(a) || 3 };
    case 'timelapse': return { type, target: a };
    case 'split': return { type, place: a, who: b };
    case 'linger': return { type, what: a };
    case 'step': return { type, material: a, dir: b, count: Number(c) || STEP_COUNT.fallback, pair: d === 'pair' };
    case 'walk': return { type, mode: a };
    case 'chase': return { type, result: a };
    case 'seeoff': return { type, dir: a };
    case 'enterroom': return { type, room: a };
    case 'bob': case 'lcut': case 'sneak': return { type };
    default: return null;
    }
}

export const CAMERA_SETTINGS_DEFAULTS = Object.freeze({ sound: false, volume: 0.25 });

export function normalizeCameraSettings(value) {
    const src = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const volume = Number(src.volume);
    return {
        sound: src.sound === true,
        volume: src.volume !== null && src.volume !== '' && Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : CAMERA_SETTINGS_DEFAULTS.volume,
    };
}

export function inferStepMaterial({ tag = '', weatherKind = '', ambientKinds = [], indoor = false } = {}) {
    if (tag && Object.values(STEP_MATERIALS).includes(tag)) return tag;
    const kinds = Array.isArray(ambientKinds) ? ambientKinds : [];
    if (weatherKind === 'snow' || kinds.includes('snow')) return 'snow';
    if (weatherKind === 'rain' || kinds.includes('rain') || kinds.includes('stream')) return 'puddle';
    if (!indoor && (kinds.includes('birds') || kinds.includes('insects') || kinds.includes('frogs'))) return 'grass';
    return indoor ? 'wood' : 'stone';
}

export const CAMERA_AMBIENCE_HTML = Object.freeze({
    cmroom: '<i class="igs-cm-win"><b></b><b></b><b></b><b></b></i><i class="igs-cm-shadow"></i>',
});

export function resolveCameraAmbience(location) {
    const place = text(location);
    if (!place) return null;
    return resolveWeatherFxScene(place) === 'indoor' ? { kind: 'cmroom', variant: '' } : null;
}
