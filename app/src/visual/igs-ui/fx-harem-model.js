// 后宫妃子包：位份阶梯与各标签字段的解析。纯函数，不碰 DOM。
export const HAREM_RANKS = Object.freeze(['皇后', '皇贵妃', '贵妃', '妃', '嫔', '贵人', '常在', '答应']);

const text = (value) => String(value == null ? '' : value).trim();
const RANK_PROBE = [...HAREM_RANKS].sort((a, b) => b.length - a.length);

// 位份在阶梯里的序号（0 为皇后，7 为答应）；认不出返回 -1。先匹配长名，避免「皇贵妃」被当成「贵妃」或「妃」。
export function rankIndexOf(value) {
    const raw = text(value);
    const hit = RANK_PROBE.find((name) => raw.includes(name));
    return hit ? HAREM_RANKS.indexOf(hit) : -1;
}

export function rankEdictOf(who, from, to) {
    const a = rankIndexOf(from);
    const b = rankIndexOf(to);
    const down = a >= 0 && b >= 0 && b > a;
    const name = text(who) || '该氏';
    const dest = text(to);
    return down
        ? `奉天承运，皇帝诏曰：${name}行止失度，有违宫训，着降为${dest}，闭门思过。钦此。`
        : `奉天承运，皇帝诏曰：${name}温婉淑慎，克娴内则，著晋封为${dest}。钦此。`;
}

const NUM_RE = /-?\d+(?:\.\d+)?/;

export function favorValueOf(value) {
    const m = text(value).match(NUM_RE);
    if (!m) return null;
    return Math.max(0, Math.min(100, Math.round(Number(m[0]))));
}

// 「名:位份」列表，最多八行；位份认不出时原样保留。
export function parseRoster(raw) {
    return text(raw).split(/[;；、\n]/).map((part) => {
        const [name = '', rank = ''] = part.split(/[:：]/).map(text);
        return name ? { name: name.slice(0, 6), rank: rank.slice(0, 6) } : null;
    }).filter(Boolean).slice(0, 8);
}

export function sortRoster(rows) {
    return rows.map((row, i) => ({ ...row, i, idx: rankIndexOf(row.rank) }))
        .sort((x, y) => (x.idx < 0 ? 99 : x.idx) - (y.idx < 0 ? 99 : y.idx) || x.i - y.i);
}

const list = (raw, max, len = 6) => text(raw).split(/[;；、]/).map(text).filter(Boolean).map((s) => s.slice(0, len)).slice(0, max);

export function dianxuanModeOf(value) {
    const raw = text(value);
    if (/撂|落选|不中|淘汰/.test(raw)) return 'drop';
    if (/赐花|赏花/.test(raw)) return 'flower';
    if (/留/.test(raw)) return 'keep';
    return '';
}

export function recordKeepOf(value) {
    const raw = text(value);
    if (!raw) return null;
    if (/不留|不用|免|撤|驳/.test(raw)) return false;
    if (/留|记|召|侍寝|承幸/.test(raw)) return true;
    return null;
}

export function probeModeOf(value) {
    const raw = text(value);
    if (/银针|验毒|针/.test(raw)) return 'needle';
    if (/滴血|验亲|血/.test(raw)) return 'blood';
    if (/人偶|巫蛊|厌胜|偶/.test(raw)) return 'doll';
    return '';
}

const GOOD_RE = /无毒|无恙|无事|银亮|清白|相融|融合|合|亲|真|无碍|干净/;
const NOT_RE = /不融|不合|不亲|有毒|发黑|变黑|黑|假|异|凶/;

// 结果词：明确写了吉象才算吉；没写时银针与人偶按「验出了东西」处理，滴血按「相融」处理。
export function probeGoodOf(mode, value) {
    const raw = text(value);
    if (NOT_RE.test(raw)) return false;
    if (GOOD_RE.test(raw)) return true;
    return mode === 'blood';
}

export function punishModeOf(value) {
    const raw = text(value);
    if (/掌嘴|掌掴|巴掌|打脸/.test(raw)) return 'slap';
    if (/禁足|软禁|闭门|落锁/.test(raw)) return 'lock';
    if (/冷宫|打入|废/.test(raw)) return 'cold';
    return '';
}

export function trayModeOf(value) {
    const raw = text(value);
    if (/白绫|绫|绳/.test(raw)) return 'silk';
    if (/毒酒|酒|鸩|毒/.test(raw)) return 'wine';
    if (/匕首|刀|剑/.test(raw)) return 'dagger';
    return '';
}

export function greetPartOf(value) {
    return /昏|晚|夕|黄昏/.test(text(value)) ? 'dusk' : 'dawn';
}

export function parseGlare(fields) {
    const raw = (fields || []).map(text);
    let sources;
    let target;
    const joined = raw[0] || '';
    if (/[>＞→]/.test(joined)) {
        const [left, ...rest] = joined.split(/[>＞→]/);
        sources = list(left, 3);
        target = text(rest.join('')).slice(0, 6);
    } else {
        sources = list(joined, 3);
        target = text(raw[1]).slice(0, 6);
    }
    return sources.length && target ? { sources, target } : null;
}

// 返回 fx-directives 统一的参数数组；必填项缺失返回 null。
export function parseHaremFx(type, fields) {
    const [a = '', b = '', c = ''] = (fields || []).map(text);
    switch (type) {
    case 'hmrank': return a && (b || c) ? ['hmrank', a.slice(0, 8), c ? b.slice(0, 8) : '', (c || b).slice(0, 8)] : null;
    case 'hmfavor': {
        const value = favorValueOf(b);
        return a && value != null ? ['hmfavor', a.slice(0, 8), value, favorValueOf(c)] : null;
    }
    case 'hmboard': return parseRoster(a).length ? ['hmboard', a] : null;
    case 'hmflip': return a ? ['hmflip', a.slice(0, 6), list(b, 4).join(';')] : null;
    case 'hmselect': {
        const mode = dianxuanModeOf(a);
        return mode ? ['hmselect', mode, b.slice(0, 8), c.slice(0, 8)] : null;
    }
    case 'hmrecord': return ['hmrecord', recordKeepOf(a) === false ? 'no' : 'keep', b.slice(0, 8)];
    case 'hmannounce': return ['hmannounce', (a || '皇上驾到').slice(0, 10)];
    case 'hmgreet': {
        const timed = /晨|早|昏|晚|夕/.test(a) && a.length <= 4 && !/[:：;；]/.test(a);
        const roster = timed ? b : a;
        return ['hmgreet', greetPartOf(timed ? a : ''), roster];
    }
    case 'hmreward': return list(a, 6, 10).length ? ['hmreward', list(a, 6, 10).join(';'), b.slice(0, 8)] : null;
    case 'hmprobe': {
        const mode = probeModeOf(a);
        return mode ? ['hmprobe', mode, probeGoodOf(mode, b) ? 'good' : 'bad', b.slice(0, 10)] : null;
    }
    case 'hmpunish': {
        const mode = punishModeOf(a);
        return mode ? ['hmpunish', mode, b.slice(0, 8)] : null;
    }
    case 'hmtray': {
        const mode = trayModeOf(a);
        return mode ? ['hmtray', mode, b.slice(0, 8)] : null;
    }
    case 'hmthread': return ['hmthread', a.slice(0, 8), b.slice(0, 10)];
    case 'hmcongrats': return ['hmcongrats', a.slice(0, 8), (b || '').slice(0, 10)];
    case 'hmglare': {
        const glare = parseGlare(fields);
        return glare ? ['hmglare', glare.sources.join(';'), glare.target] : null;
    }
    default: return null;
    }
}

export function haremItemOf(args) {
    const [type, a, b, c, d] = args;
    switch (type) {
    case 'hmrank': return { type, who: a, from: b, to: c };
    case 'hmfavor': return { type, who: a, value: b, from: c };
    case 'hmboard': return { type, rows: a };
    case 'hmflip': return { type, who: a, others: b };
    case 'hmselect': return { type, mode: a, who: b, gift: c };
    case 'hmrecord': return { type, keep: a === 'keep', who: b };
    case 'hmannounce': return { type, text: a };
    case 'hmgreet': return { type, part: a, roster: b };
    case 'hmreward': return { type, items: a, who: b };
    case 'hmprobe': return { type, mode: a, result: b, note: c };
    case 'hmpunish': return { type, mode: a, who: b };
    case 'hmtray': return { type, mode: a, who: b };
    case 'hmthread': return { type, who: a, pulse: b };
    case 'hmcongrats': return { type, who: a, text: b };
    case 'hmglare': return { type, sources: a, target: b };
    default: return { type, fields: args.slice(1), extra: d };
    }
}
