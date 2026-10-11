// 地点与场景包的纯数据：地点词表、地点识别、各演出标签的字段解析。不碰 DOM 与音频。
const has = (text, words) => words.some((word) => text.includes(word));
const text = (value) => String(value == null ? '' : value).trim();

export const PLACE_WORDS = Object.freeze({
    police: ['警戒线', '案发现场', '警察局', '警局', '派出所', '现场勘查', '犯罪现场'],
    hospital: ['医院', '病房', '诊所', '急诊', '手术室', '医务室', '重症监护', 'icu'],
    konbini: ['便利店', '便利超市', '小卖部', '24小时店'],
    kitchen: ['厨房', '灶房', '灶台', '后厨', '料理室'],
    shrine: ['祭典', '神社', '夏祭', '祭礼', '庙会'],
    gym: ['体育馆', '健身房', '篮球馆', '排球馆', '羽毛球馆', '球馆', '体育场馆'],
    neonrain: ['霓虹', '赛博', '雨夜', '不夜城'],
    mansion: ['洋馆', '洋楼', '古堡', '庄园', '宅邸', '公馆'],
    dungeon: ['地下城', '迷宫', '地牢', '地宫', '墓穴', '古墓', '遗迹', '副本'],
});

// 地点层的 kind 带 pl 前缀，避免和其他包、既有地点层重名。
const MODERN_ONLY = Object.freeze(['police', 'hospital', 'konbini', 'gym', 'neonrain', 'mansion']);
export const PLACE_KINDS = Object.freeze(Object.keys(PLACE_WORDS));
export const PLACE_STILL = Object.freeze(['plhospital', 'plkonbini', 'plkitchen', 'plshrine', 'plgym', 'plmansion', 'pldungeon', 'plneonrain']);

// 返回 { kind, variant } 或 null；古代世界观下现代地点不出（厨房、祭典、地下城换古风变体），魔法 / 西幻换魔法变体。
export function resolvePlaceKind(location, worldview = '') {
    const raw = text(location).toLowerCase();
    if (!raw) return null;
    const ancient = worldview === 'ancient';
    for (const kind of PLACE_KINDS) {
        if (!has(raw, PLACE_WORDS[kind])) continue;
        if (ancient && MODERN_ONLY.includes(kind)) continue;
        return { kind: `pl${kind}`, variant: ancient ? 'ancient' : (worldview === 'magic' || worldview === 'fantasy' ? 'magic' : '') };
    }
    return null;
}

export const ELEVATOR_MAX_STEPS = 7;

// 楼层滚动序列：目标是数字时从相邻楼层往上数到它；地下层 B3 之类从 B1 往下数；其他文字原样只有一帧。
export function floorFrames(target) {
    const goal = text(target).slice(0, 6) || '1';
    const m = goal.match(/^(B|-)?(\d{1,3})$/i);
    if (!m) return [goal];
    const n = Number(m[2]);
    if (m[1]) return Array.from({ length: Math.min(ELEVATOR_MAX_STEPS, Math.max(1, n)) }, (_, i) => `B${i + 1}`);
    const from = Math.max(1, n - ELEVATOR_MAX_STEPS + 1);
    return Array.from({ length: n - from + 1 }, (_, i) => String(from + i));
}

export const RACE_PHASES = Object.freeze({ 起跑: 'start', 预备: 'start', 开始: 'start', 冲线: 'finish', 终点: 'finish', 到达: 'finish', 记分: 'score', 比分: 'score', 计分: 'score' });
export const CHEST_GRADES = Object.freeze({ 普通: 'common', 稀有: 'rare', 史诗: 'epic', 传说: 'legend' });
export const QUEST_STATES = Object.freeze({ 接取: 'take', 接受: 'take', 进行中: 'take', 完成: 'done', 失败: 'fail' });

const pick = (table, value) => table[text(value)] || '';

export function scoreParts(value) {
    const m = text(value).match(/(\d{1,3})\s*[:：\-－比]\s*(\d{1,3})/);
    return m ? [Number(m[1]), Number(m[2])] : null;
}

export function routeStops(fields) {
    const flat = (fields || []).flatMap((f) => text(f).split(/[>＞→]/)).map(text).filter(Boolean);
    return flat.slice(0, 6).map((s) => s.slice(0, 8));
}

export function parsePlacesFx(type, fields) {
    const [a = '', b = '', c = ''] = (fields || []).map(text);
    switch (type) {
    case 'elevator': return ['elevator', a.slice(0, 6)];
    case 'eavesdrop': return ['eavesdrop', a.slice(0, 24)];
    case 'concert': return ['concert', a.slice(0, 16)];
    case 'flashes': {
        const count = Number.parseInt(a, 10);
        return ['flashes', String(count >= 3 && count <= 9 ? count : 6)];
    }
    case 'race': {
        const phase = pick(RACE_PHASES, a);
        return phase ? ['race', phase, b.slice(0, 16), c.slice(0, 16)] : null;
    }
    case 'chest': return ['chest', a.slice(0, 14), pick(CHEST_GRADES, b) || 'common'];
    case 'levelup': {
        const level = Number.parseInt(a, 10);
        return level >= 1 && level <= 999 ? ['levelup', String(level), b.slice(0, 28)] : null;
    }
    case 'quest': return a ? ['quest', a.slice(0, 16), b.slice(0, 16), pick(QUEST_STATES, c) || 'take'] : null;
    case 'route': {
        const stops = routeStops(fields);
        return stops.length >= 2 ? ['route', ...stops] : null;
    }
    case 'gust': return ['gust'];
    default: return null;
    }
}

export function placesFxOf(args) {
    const [type, a = '', b = '', c = ''] = args || [];
    switch (type) {
    case 'elevator': return { type, floor: a };
    case 'eavesdrop': return { type, heard: a };
    case 'concert': return { type, song: a };
    case 'flashes': return { type, count: Number(a) || 6 };
    case 'race': return { type, phase: a, a: b, b: c };
    case 'chest': return { type, item: a, grade: b };
    case 'levelup': return { type, level: Number(a) || 1, reward: b };
    case 'quest': return { type, title: a, reward: b, state: c };
    case 'route': return { type, stops: (args || []).slice(1) };
    case 'gust': return { type };
    default: return null;
    }
}
