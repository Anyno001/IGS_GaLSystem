// ABO 包的纯数据：标签解析、触发词、提示词。不碰 DOM；渲染见 fx-abo-build.js。
// 气味名、颜色、数值全部取自标签字段，本地不建气味词库；没写颜色时按角色名在一小组柔和色里确定性取一个。
export const ABO_KINDS = Object.freeze(['scent', 'scentlink', 'suppress', 'soothe', 'inhibitor', 'bond', 'gendertest', 'match', 'nest', 'detector', 'phase']);

export const ABO_LABELS = Object.freeze({
    scent: '信息素气雾', scentlink: '信息素交缠', suppress: '信息素压制', soothe: '信息素安抚', inhibitor: '抑制剂与阻隔贴',
    bond: '标记印记', gendertest: '分化检测报告', match: '信息素匹配度', nest: '筑巢', detector: '信息素检测仪', phase: '发情期与易感期状态条',
});

export const ABO_TRIGGERS = Object.freeze({
    scent: ['信息素', '气味', '味道'],
    scentlink: ['信息素交缠', '气味交融', '气息交缠'],
    suppress: ['威压', '信息素压制', '压制'],
    soothe: ['安抚', '安抚信息素', '平复'],
    inhibitor: ['抑制剂', '阻隔贴', '阻隔剂'],
    bond: ['标记', '咬痕', '终身标记'],
    gendertest: ['分化', '检测报告', '第二性别'],
    match: ['匹配度', '契合度', '适配度'],
    nest: ['筑巢', '巢穴', '做窝'],
    detector: ['检测仪', '信息素浓度', '警报'],
    phase: ['发情期', '易感期', '热潮'],
});

export const ABO_PROMPT_LINES = Object.freeze({
    scent: '[igs-fx:scent|角色|气味名|颜色]：某角色的信息素在场面里明显散开时写，气味名取正文写到的那一种，颜色可省，省略时取该角色的代表色。',
    scentlink: '[igs-fx:scentlink|A|B]：两人的信息素在空气里缠在一起时写，A、B 是两位角色名。',
    suppress: '[igs-fx:suppress|施压者|范围]：高位者释放信息素威压、压得旁人抬不起头时写；范围写全场或近身，可省，省略按近身。',
    soothe: '[igs-fx:soothe|角色]：信息素用来安抚、平复对方情绪时写，角色可省。',
    inhibitor: '[igs-fx:inhibitor|注射/阻隔贴/失效|药名]：使用抑制剂、贴上阻隔贴，或抑制失效、阻隔被突破时写，药名可省。',
    bond: '[igs-fx:bond|角色|临时/终身]：后颈被标记的那一刻写，角色是被标记的人；需要后颈特写时可配合 [igs-fx:zoom|角色|颈]。',
    gendertest: '[igs-fx:gendertest|角色|结果]：第二性别分化、体检出报告时写，结果取正文给出的性别与信息素类型。',
    match: '[igs-fx:match|A|B|百分比]：测出两人信息素匹配度时写，百分比取 0 到 100 的数字。',
    nest: '[igs-fx:nest|角色]：处于特殊时期的角色收集衣物、布置巢穴时写，角色可省。',
    detector: '[igs-fx:detector|浓度|场所]：信息素检测仪读数、公共场所浓度超标报警时写，浓度取 0 到 100 的数字，场所可省。',
    phase: '[igs-fx:phase|发情期/易感期|剩余|角色]：与 [igs-fx:state|发情期] 或 [igs-fx:state|易感期] 区间同用，给出剩余时间；剩余可写 3/7 这样的比例或 60% 这样的百分比，也可只写文字。',
});

const text = (value) => String(value == null ? '' : value).trim();
const HEX = /^#[0-9a-f]{3,8}$/i;
const PALETTE = Object.freeze(['#e58fb0', '#8fb8e5', '#9bd0a0', '#e5b46f', '#b49be5', '#e58f8f', '#7fd1cf', '#d9c36b']);

export function scentColorOf(who, color) {
    const c = text(color);
    if (HEX.test(c)) return c;
    let h = 0;
    for (const ch of text(who)) h = (h * 31 + ch.codePointAt(0)) >>> 0;
    return PALETTE[h % PALETTE.length];
}

const INHIBITOR_MODES = Object.freeze({ 注射: 'inject', 抑制剂: 'inject', inject: 'inject', 阻隔贴: 'patch', 贴: 'patch', patch: 'patch', 失效: 'fail', 警示: 'fail', 失败: 'fail', fail: 'fail' });
const BOND_MODES = Object.freeze({ 临时: 'temp', 临时标记: 'temp', temp: 'temp', 终身: 'life', 终身标记: 'life', 永久: 'life', life: 'life' });
const PHASE_TYPES = Object.freeze({ 发情期: 'heat', 发情: 'heat', 热潮: 'heat', heat: 'heat', 易感期: 'rut', 易感: 'rut', rut: 'rut' });

const pick = (table, value, fallback) => (Object.hasOwn(table, text(value).toLowerCase()) ? table[text(value).toLowerCase()] : fallback);
const num = (value) => {
    const m = text(value).match(/\d+(?:\.\d+)?/);
    return m ? Math.max(0, Math.min(100, Math.round(Number(m[0])))) : null;
};

// 剩余时间折成百分比：认 60% 与 3/7 两种写法，其余返回 -1（只显示文字不画条）。
export function phaseRatioOf(value) {
    const raw = text(value);
    const pct = raw.match(/(\d+(?:\.\d+)?)\s*%/);
    if (pct) return Math.max(0, Math.min(100, Math.round(Number(pct[1]))));
    const ratio = raw.match(/(\d+(?:\.\d+)?)\s*[/／]\s*(\d+(?:\.\d+)?)/);
    if (ratio && Number(ratio[2]) > 0) return Math.max(0, Math.min(100, Math.round(Number(ratio[1]) / Number(ratio[2]) * 100)));
    return -1;
}

export function parseAboFxBody(type, fields) {
    const [a = '', b = '', c = ''] = (fields || []).map(text);
    switch (type) {
    case 'scent': return a ? ['scent', a.slice(0, 12), b.slice(0, 8), HEX.test(c) ? c : ''] : null;
    case 'scentlink': return a && b ? ['scentlink', a.slice(0, 12), b.slice(0, 12)] : null;
    case 'suppress': return a ? ['suppress', a.slice(0, 12), /全|所有|整/.test(b) ? 'all' : 'near'] : null;
    case 'soothe': return ['soothe', a.slice(0, 12)];
    case 'inhibitor': return ['inhibitor', pick(INHIBITOR_MODES, a, 'inject'), b.slice(0, 12)];
    case 'bond': return a ? ['bond', a.slice(0, 12), pick(BOND_MODES, b, 'temp')] : null;
    case 'gendertest': return a && b ? ['gendertest', a.slice(0, 12), b.slice(0, 14)] : null;
    case 'match': {
        const pct = num(c);
        return a && b && pct != null ? ['match', a.slice(0, 12), b.slice(0, 12), String(pct)] : null;
    }
    case 'nest': return ['nest', a.slice(0, 12)];
    case 'detector': {
        const level = num(a);
        return level != null ? ['detector', String(level), b.slice(0, 10)] : null;
    }
    case 'phase': {
        const kind = pick(PHASE_TYPES, a, '');
        return kind ? ['phase', kind, b.slice(0, 10), c.slice(0, 12)] : null;
    }
    default: return null;
    }
}

export function aboFxOf(args) {
    const [type, a = '', b = '', c = ''] = args || [];
    switch (type) {
    case 'scent': return { type, who: a, name: b, color: c };
    case 'scentlink': return { type, a, b };
    case 'suppress': return { type, who: a, range: b };
    case 'soothe': return { type, who: a };
    case 'inhibitor': return { type, mode: a, name: b };
    case 'bond': return { type, who: a, mode: b };
    case 'gendertest': return { type, who: a, result: b };
    case 'match': return { type, a, b, percent: Number(c) || 0 };
    case 'nest': return { type, who: a };
    case 'detector': return { type, level: Number(a) || 0, place: b };
    case 'phase': return { type, phase: a, remain: b, who: c, ratio: phaseRatioOf(b) };
    default: return null;
    }
}
