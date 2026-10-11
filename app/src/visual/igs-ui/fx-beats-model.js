// 戏剧节拍的标签解析：字段写错按最宽松的合法形式处理，缺必填字段整条忽略。
// 纯函数，不碰 DOM、不引入音频模块（题材包清单不能间接引入 scene-audio）。
// parse 返回字符串数组 [kind, ...字段]，of 把它还原成演出项。
const text = (value) => String(value == null ? '' : value).trim();
const lookup = (map, key) => (Object.hasOwn(map, String(key || '').toLowerCase()) ? map[String(key).toLowerCase()] : '');

export const BEATS_KINDS = Object.freeze(['reveal', 'panel', 'count', 'evidence', 'link', 'crowd', 'reunion', 'order', 'os']);

export const BEATS_LABELS = Object.freeze({
    reveal: '揭晓定格',
    panel: '系统公告面板',
    count: '数字滚动卡',
    evidence: '证物甩出卡',
    link: '红线与视线',
    crowd: '众人反应',
    reunion: '慢动作回眸',
    order: '行动顺序条',
    os: '内心独白小字',
});

export const BEATS_TRIGGERS = Object.freeze({
    reveal: ['揭晓', '真相大白', '水落石出'],
    panel: ['系统提示', '副本公告', '任务发布'],
    count: ['到账', '竞价', '比分', '倒计时'],
    evidence: ['证物', '证据', '甩出'],
    link: ['红线', '牵连', '视线交汇'],
    crowd: ['哗然', '纷纷转头', '躬身行礼'],
    reunion: ['重逢', '回眸', '久别'],
    order: ['先攻', '行动顺序', '出手顺序'],
    os: ['心想', '暗想', '内心独白'],
});

export const PANEL_TYPES = Object.freeze({
    系统: 'system', 系统提示: 'system', system: 'system',
    公告: 'notice', 副本公告: 'notice', 副本: 'notice', 通告: 'notice', notice: 'notice',
    任务: 'quest', 任务发布: 'quest', quest: 'quest', task: 'quest',
    结算: 'result', 战利品: 'result', 奖励: 'result', result: 'result', settle: 'result',
    突破: 'breakthrough', 晋级: 'breakthrough', 升级: 'breakthrough', breakthrough: 'breakthrough',
});
export const PANEL_TYPE_LABELS = Object.freeze({ system: '系统提示', notice: '副本公告', quest: '任务', result: '结算', breakthrough: '突破' });
export const PANEL_ROW_MAX = 6;

export const LINK_STYLES = Object.freeze({
    红线: 'redline', 红: 'redline', 姻缘线: 'redline', 牵连: 'redline', redline: 'redline',
    视线: 'gaze', 目光: 'gaze', 注视: 'gaze', gaze: 'gaze',
    光丝: 'thread', 丝线: 'thread', 光: 'thread', 羁绊: 'thread', thread: 'thread',
});

// 众人反应档位：新增转头、鞠躬，其余沿用众人剪影原有的六种。
export const CROWD_REACTIONS = Object.freeze({
    转头: 'turn', 回头: 'turn', 侧目: 'turn', 注目: 'turn', turn: 'turn',
    鞠躬: 'bow', 行礼: 'bow', 躬身: 'bow', 跪拜: 'bow', bow: 'bow',
    倒吸: 'gasp', 倒吸凉气: 'gasp', 倒吸一口凉气: 'gasp', 惊呼: 'gasp', gasp: 'gasp',
    哗然: 'murmur', 议论: 'murmur', 低语: 'murmur', murmur: 'murmur',
    鼓掌: 'clap', 掌声: 'clap', clap: 'clap',
    欢呼: 'cheer', 喝彩: 'cheer', cheer: 'cheer',
    哄笑: 'laugh', laugh: 'laugh',
    肃静: 'hush', 噤声: 'hush', 寂静: 'hush', hush: 'hush',
});
export const CROWD_CAPTIONS = Object.freeze({
    turn: '众人齐齐转头', bow: '众人躬身行礼', gasp: '一片倒吸凉气', murmur: '四座哗然', clap: '掌声响起', cheer: '欢呼四起', laugh: '哄堂大笑', hush: '鸦雀无声',
});

export const ORDER_MAX = 6;

// 取数字：去掉千分位逗号与空格，只认第一个数；认不出返回 null。
export function numberOf(value) {
    const m = text(value).replace(/[,，\s]/g, '').match(/-?\d+(?:\.\d+)?/);
    return m ? Number(m[0]) : null;
}

export function splitRows(parts) {
    return parts.join(';').split(/[;；]/).map(text).filter(Boolean).slice(0, PANEL_ROW_MAX).map((row) => row.slice(0, 30));
}

export function splitNames(value) {
    return text(value).split(/[;；、,，>＞→/／]/).map(text).filter(Boolean).slice(0, ORDER_MAX).map((name) => name.slice(0, 8));
}

export function parseBeatsFx(type, fields) {
    const f = (fields || []).map(text);
    switch (type) {
    // 揭晓定格：大字必填（最多 8 字），副字可省。
    case 'reveal': return f[0] ? ['reveal', f[0].slice(0, 8), (f[1] || '').slice(0, 20)] : null;
    // 公告面板：类型认不出时当作标题、按系统提示处理；标题与行都空则忽略。
    case 'panel': {
        const kind = lookup(PANEL_TYPES, f[0]);
        const rest = kind ? f.slice(1) : f;
        const rows = splitRows(rest.slice(1));
        const title = (rest[0] || '').slice(0, 20);
        return title || rows.length ? ['panel', kind || 'system', title, rows.join(';')] : null;
    }
    // 数字滚动：只给一个数时当作终值、起值为 0；标签、单位可省。
    case 'count': {
        const first = numberOf(f[1]);
        const second = numberOf(f[2]);
        const to = second !== null ? second : first;
        const from = second !== null ? first : 0;
        if (to === null || from === null) return null;
        return ['count', (f[0] || '').slice(0, 10), String(from), String(to), (f[3] || (second === null ? f[2] : '') || '').slice(0, 4)];
    }
    case 'evidence': return f[0] ? ['evidence', f[0].slice(0, 12), (f[1] || '').slice(0, 40)] : null;
    // 牵连线：两端角色名必填且不同；样式认不出按红线。
    case 'link': return f[0] && f[1] && f[0] !== f[1] ? ['link', f[0].slice(0, 8), f[1].slice(0, 8), lookup(LINK_STYLES, f[2]) || 'redline'] : null;
    // 众人反应：档位必须认得；说明字样可省。
    case 'crowd': {
        const reaction = lookup(CROWD_REACTIONS, f[0]);
        return reaction ? ['crowd', reaction, (f[1] || '').slice(0, 12)] : null;
    }
    case 'reunion': return ['reunion', (f[0] || '').slice(0, 8)];
    case 'order': {
        const names = splitNames(f.join(';'));
        return names.length >= 2 ? ['order', names.join(';')] : null;
    }
    case 'os': return f[0] ? ['os', f[0].slice(0, 40)] : null;
    default: return null;
    }
}

export function beatsFxOf(args) {
    const [type, a = '', b = '', c = '', d = ''] = args || [];
    switch (type) {
    case 'reveal': return { type, text: a, sub: b };
    case 'panel': return { type, kind: a, title: b, rows: c ? c.split(';') : [] };
    case 'count': return { type, label: a, from: Number(b), to: Number(c), unit: d };
    case 'evidence': return { type, name: a, desc: b };
    case 'link': return { type, from: a, to: b, style: c };
    case 'crowd': return { type, reaction: a, text: b };
    case 'reunion': return { type, who: a };
    case 'order': return { type, names: a ? a.split(';') : [] };
    case 'os': return { type, text: a };
    default: return null;
    }
}
