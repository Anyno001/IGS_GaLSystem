// 恋综包的标签解析与数据：纯函数，不碰 DOM。字段写错按最宽松的合法形式处理，缺必填字段则整条忽略。
export const VARIETY_KINDS = Object.freeze(['guest', 'caption', 'interview', 'observe', 'rec', 'vote', 'rank', 'pulse', 'relmap', 'pair', 'exit', 'finale', 'replay']);

export const VARIETY_LABELS = Object.freeze({
    guest: '嘉宾入场卡', caption: '综艺花字', interview: '采访间独白', observe: '观察室', rec: '机位角标与切镜', vote: '心动短信 / 投票',
    rank: '心动值排行榜', pulse: '心率手环', relmap: '关系箭头图', pair: '约会抽卡配对', exit: '嘉宾离场', finale: '告白之夜', replay: '心动瞬间回放',
});

// 触发词仅作测试门禁；真正的触发由正文驱动，提示词是世界书式的开放描述。
export const VARIETY_TRIGGERS = Object.freeze({
    guest: ['新嘉宾', '入住小屋', '自我介绍'],
    caption: ['综艺花字', '名场面', '然而他不知道'],
    interview: ['采访间', '单独采访', '内心独白'],
    observe: ['观察室', '观察员', '场外嘉宾'],
    rec: ['机位', '摄像机', '切镜'],
    vote: ['心动短信', '匿名投票', '投票'],
    rank: ['心动值', '排行榜', '心动榜'],
    pulse: ['心率手环', '心率', '手环'],
    relmap: ['关系图', '单向暗恋', '三角关系'],
    pair: ['抽卡', '配对', '约会抽签'],
    exit: ['离开小屋', '淘汰', '退出节目'],
    finale: ['告白之夜', '最终选择', '牵手成功'],
    replay: ['心动瞬间', '回放', '名场面回放'],
});

export const VARIETY_PROMPT_LINES = Object.freeze({
    guest: '[igs-fx:guest|姓名|年龄|职业|标签1;标签2]：恋综里新嘉宾入住、首次亮相的介绍卡；姓名必填，年龄、职业可省，标签最多3个，用分号隔开',
    caption: '[igs-fx:caption|样式|文字]：综艺后期花字，样式四选一：粉字（粉色大字）、贴纸、盖章（名场面盖章）、黑底（黑底字幕，文字省略时是“然而他不知道的是……”）；文字不超过24字',
    interview: '[igs-fx:interview|角色|独白]：嘉宾被单独叫到采访间，对着镜头说心里话的那一刻；独白必填，不超过60字，角色可省',
    observe: '[igs-fx:observe|角色|评论1;评论2]：观察室里嘉宾们盯着屏幕看某人、边看边点评；角色是被看的人，评论最多4条，可省（省了由系统补）',
    rec: '[igs-fx:rec|机位名]：镜头记录的视角，画面角落亮起 REC 机位角标并切一次镜；机位名可省，如“机位2”“厨房机位”',
    vote: '[igs-fx:vote|名字:票数;名字:票数|标题]：匿名投票的信封揭晓，票数为整数；心动短信写成 [igs-fx:vote|短信|短信内容|标题]，标题可省',
    rank: '[igs-fx:rank|名字:数值;名字:数值|标题]：心动值排行榜，数值是整数，至少2人最多6人，名次会动态重排；标题可省',
    pulse: '[igs-fx:pulse|心率数值|角色]：心动或紧张到心率飙升时，手环上显示心率；数值为30至220的整数，角色可省',
    relmap: '[igs-fx:relmap|A>B;B>C]：嘉宾之间的关系箭头图，A>B 表示A对B有好感，A=B 表示互有好感，可在末尾加 :关系 作标注；最多6条',
    pair: '[igs-fx:pair|A+B;C+D|标题]：约会抽卡、抽签配对揭晓，每组两人用加号连接，最多4组；标题可省',
    exit: '[igs-fx:exit|角色|原因]：嘉宾拖着行李离开小屋、被淘汰或主动退出；角色可省，原因不超过12字，可省',
    finale: '[igs-fx:finale|选择|角色]：告白之夜，嘉宾走向心动的人、灯牌点亮；选择是亮在灯牌上的短句，不超过10字，角色可省',
    replay: '[igs-fx:replay|标题|角色]：把心动瞬间同一帧连放三次、逐次推近并盖上 REPLAY 角标；标题不超过8字，可省',
});

export const VARIETY_GRAMMAR_LINES = Object.freeze({
    guest: 'guest|姓名|年龄|职业|标签1;标签2：恋综嘉宾入场介绍卡',
    caption: 'caption|粉字/贴纸/盖章/黑底|文字：综艺花字，不超过24字',
    interview: 'interview|角色|独白：采访间内心独白，不超过60字',
    observe: 'observe|角色|评论1;评论2：观察室画中画与评论',
    rec: 'rec|机位名：REC 机位角标与切镜',
    vote: 'vote|名字:票数;名字:票数|标题：匿名投票揭晓；短信写 vote|短信|内容',
    rank: 'rank|名字:数值;名字:数值|标题：心动值排行榜',
    pulse: 'pulse|心率数值|角色：手环心率',
    relmap: 'relmap|A>B;B>C：关系箭头图，A=B 为互有好感',
    pair: 'pair|A+B;C+D|标题：约会抽卡配对',
    exit: 'exit|角色|原因：嘉宾离场',
    finale: 'finale|选择|角色：告白之夜灯牌',
    replay: 'replay|标题|角色：心动瞬间三连回放',
});

export const CAPTION_STYLES = Object.freeze({
    粉字: 'pink', 粉色: 'pink', 大字: 'pink', 花字: 'pink', pink: 'pink',
    贴纸: 'sticker', sticker: 'sticker',
    盖章: 'stamp', 名场面: 'stamp', 章: 'stamp', stamp: 'stamp',
    黑底: 'dark', 字幕: 'dark', 然而: 'dark', dark: 'dark',
});
export const CAPTION_DARK_DEFAULT = '然而他不知道的是……';

const text = (value) => String(value == null ? '' : value).trim();
const cut = (value, max) => Array.from(text(value)).slice(0, max).join('');
const listOf = (value) => text(value).split(/[;；]/).map((s) => s.trim()).filter(Boolean);

function captionStyleOf(value) {
    const key = text(value).toLowerCase();
    return Object.hasOwn(CAPTION_STYLES, key) ? CAPTION_STYLES[key] : '';
}

// 名字:数值 列表，数值取整数；返回 [{ name, value }]。
export function parseScores(value, limit) {
    return listOf(value).map((entry) => {
        const m = entry.match(/^(.+?)\s*[:：=]\s*(-?\d+(?:\.\d+)?)/);
        return m ? { name: cut(m[1], 6), value: Math.round(Number(m[2])) } : null;
    }).filter((row) => row && row.name).slice(0, limit);
}

const EDGE_RE = /^(.+?)\s*([>＞→=＝])\s*(.+?)(?:\s*[:：]\s*(.+))?$/;

// A>B / A=B 可带 :标注；返回 [{ from, to, mutual, label }]。
export function parseEdges(value, limit = 6) {
    return listOf(value).map((entry) => {
        const m = entry.match(EDGE_RE);
        if (!m) return null;
        const from = cut(m[1], 6);
        const to = cut(m[3], 6);
        if (!from || !to || from === to) return null;
        return { from, to, mutual: m[2] === '=' || m[2] === '＝', label: cut(m[4], 6) };
    }).filter(Boolean).slice(0, limit);
}

export function parsePairs(value, limit = 4) {
    return listOf(value).map((entry) => {
        const parts = entry.split(/\s*[+＋&×]\s*/).map((s) => cut(s, 6)).filter(Boolean);
        return parts.length >= 2 ? [parts[0], parts[1]] : null;
    }).filter(Boolean).slice(0, limit);
}

export function edgesString(edges) {
    return edges.map((e) => `${e.from}${e.mutual ? '=' : '>'}${e.to}${e.label ? `:${e.label}` : ''}`).join(';');
}

export function scoresString(rows) {
    return rows.map((row) => `${row.name}:${row.value}`).join(';');
}

export function pairsString(pairs) {
    return pairs.map((pair) => `${pair[0]}+${pair[1]}`).join(';');
}

export function parseVarietyFxBody(type, fields) {
    const f = (Array.isArray(fields) ? fields : []).map(text);
    const [a = '', b = '', c = '', d = ''] = f;
    switch (type) {
    case 'guest': {
        if (!a) return null;
        return ['guest', cut(a, 8), cut(b, 6), cut(c, 10), listOf(d).slice(0, 3).map((t) => cut(t, 6)).join(';')];
    }
    case 'caption': {
        const style = captionStyleOf(a);
        const body = style ? b : a;
        const picked = style || 'pink';
        if (!body) return picked === 'dark' ? ['caption', 'dark', CAPTION_DARK_DEFAULT] : null;
        return ['caption', picked, cut(body, 24)];
    }
    case 'interview': {
        if (!a) return null;
        return b ? ['interview', cut(a, 8), cut(b, 60)] : ['interview', '', cut(a, 60)];
    }
    case 'observe': {
        if (!a && !b) return ['observe', '', ''];
        if (!b && /[;；]/.test(a)) return ['observe', '', listOf(a).slice(0, 4).map((s) => cut(s, 14)).join(';')];
        if (!b) return ['observe', cut(a, 8), ''];
        return ['observe', cut(a, 8), listOf(b).slice(0, 4).map((s) => cut(s, 14)).join(';')];
    }
    case 'rec': return ['rec', cut(a, 8)];
    case 'vote': {
        if (a === '短信' || a === 'sms') return b ? ['vote', 'sms', cut(b, 40), cut(c, 8)] : null;
        const rows = parseScores(a, 5);
        return rows.length ? ['vote', 'tally', scoresString(rows), cut(b, 8)] : null;
    }
    case 'rank': {
        const rows = parseScores(a, 6);
        return rows.length >= 2 ? ['rank', scoresString(rows), cut(b, 10)] : null;
    }
    case 'pulse': {
        const n = Number.parseInt(a, 10);
        return Number.isFinite(n) ? ['pulse', String(Math.max(30, Math.min(220, n))), cut(b, 8)] : null;
    }
    case 'relmap': {
        const edges = parseEdges(a);
        return edges.length ? ['relmap', edgesString(edges)] : null;
    }
    case 'pair': {
        const pairs = parsePairs(a);
        return pairs.length ? ['pair', pairsString(pairs), cut(b, 8)] : null;
    }
    case 'exit': return ['exit', cut(a, 8), cut(b, 12)];
    case 'finale': return ['finale', cut(a, 10), cut(b, 8)];
    case 'replay': return ['replay', cut(a, 8), cut(b, 8)];
    default: return null;
    }
}

export function varietyFxOf(args) {
    const [type, ...v] = Array.isArray(args) ? args : [];
    switch (type) {
    case 'guest': return { type, name: v[0] || '', age: v[1] || '', job: v[2] || '', tags: listOf(v[3]) };
    case 'caption': return { type, style: v[0] || 'pink', text: v[1] || '' };
    case 'interview': return { type, who: v[0] || '', text: v[1] || '' };
    case 'observe': return { type, who: v[0] || '', comments: listOf(v[1]) };
    case 'rec': return { type, cam: v[0] || '' };
    case 'vote': return v[0] === 'sms'
        ? { type, mode: 'sms', text: v[1] || '', title: v[2] || '' }
        : { type, mode: 'tally', rows: parseScores(v[1], 5), title: v[2] || '' };
    case 'rank': return { type, rows: parseScores(v[0], 6), title: v[1] || '' };
    case 'pulse': return { type, bpm: Number(v[0]) || 100, who: v[1] || '' };
    case 'relmap': return { type, edges: parseEdges(v[0]) };
    case 'pair': return { type, pairs: parsePairs(v[0]), title: v[1] || '' };
    case 'exit': return { type, who: v[0] || '', reason: v[1] || '' };
    case 'finale': return { type, choice: v[0] || '', who: v[1] || '' };
    case 'replay': return { type, title: v[0] || '', who: v[1] || '' };
    default: return null;
    }
}
