// COC与推理包的纯数据：标签字段解析、别名表、提示词与触发词。不碰 DOM。
export const COC_KINDS = Object.freeze(['san', 'symptom', 'clue', 'casebook', 'kp', 'ending', 'dungeon', 'portal', 'rating', 'alive', 'rules', 'board', 'magnify', 'accuse', 'stats']);

export const COC_LABELS = Object.freeze({
    san: '理智与生命条',
    symptom: '症状卡',
    clue: '线索卡',
    casebook: '线索簿',
    kp: '守秘人旁白框',
    ending: '结局卡',
    dungeon: '副本公告',
    portal: '传送转场',
    rating: '结算评级',
    alive: '存活人数',
    rules: '规则怪谈',
    board: '推理线索板',
    magnify: '搜证放大镜',
    accuse: '指认定格',
    stats: '属性雷达卡',
});

// 触发词每类 2-4 个，仅作测试门禁与按需展开的默认关键词。
export const COC_TRIGGERS = Object.freeze({
    san: ['理智值', '理智检定', 'SAN值', 'san值'],
    symptom: ['疯狂症状', '临时疯狂', '恐惧症'],
    clue: ['线索', '证物', '物证'],
    casebook: ['线索簿', '案件笔记', '调查笔记'],
    kp: ['KP', '守秘人', '主持人'],
    ending: ['团灭', '全灭', '撕卡'],
    dungeon: ['副本公告', '新副本', '任务发布'],
    portal: ['传送', '传送门', '空间转移'],
    rating: ['副本结算', '评级', '通关评价'],
    alive: ['存活', '幸存者', '存活人数'],
    rules: ['规则怪谈', '守则', '须知'],
    board: ['线索板', '推理板', '软木板'],
    magnify: ['放大镜', '搜证', '勘查'],
    accuse: ['指认', '指证', '真凶'],
    stats: ['属性面板', '人物卡', '八维', '六维'],
});

export const COC_PROMPT_LINES = Object.freeze({
    san: '[igs-fx:san|当前值|变化|名称|上限]：角色理智或生命值变动时写。当前值是变动后的数，变化带正负号（-8、+3），名称默认 SAN，上限默认 99。',
    symptom: '[igs-fx:symptom|症状名|描述|程度]：角色出现疯狂、中毒、醉酒等持续异常时写，程度 轻、中、重；画面持续异常另用 [igs-fx:state|疯狂|重] 到 [igs-fx:state-end]。',
    clue: '[igs-fx:clue|名称|描述]：调查中发现新线索或证物时写，名称要短，描述一句话。',
    casebook: '[igs-fx:casebook|线索1;线索2|新增:2|标题]：翻看线索簿时写，分号隔开，新增写末尾几条是新得的。',
    kp: '[igs-fx:kp|旁白|身份]：守秘人或主持人描述场景、宣布判定时写，身份省略按 KP，也可写 DM。',
    ending: '[igs-fx:ending|团灭或撕卡|角色名|原因]：全员覆没写“团灭”，单个调查员死亡或永久疯狂写“撕卡”并给名与因。',
    dungeon: '[igs-fx:dungeon|标题|条目1;条目2|页脚]：无限流里主神或系统发布副本、任务时写，条目用分号隔开。',
    portal: '[igs-fx:portal|目的地|副标题]：角色被传送进副本、回到主神空间或换位面时写。',
    rating: '[igs-fx:rating|评级|项目:值;项目:值|标题]：副本结束结算时写，评级如 S、A、B、C、D，项目值用冒号。',
    alive: '[igs-fx:alive|剩余人数|总人数|标题]：存活人数发生变化或需要清点幸存者时写。',
    rules: '[igs-fx:rules|规则1;规则2|篡改:2|违规:3]：规则怪谈给出须知时写，分号隔开，篡改是被血迹涂掉的条号，违规是被触犯的条号，可省。',
    board: '[igs-fx:board|线索1;线索2|连线:1-2|标题]：侦探在线索板拉红线时写，线索最多六条，连线写条号对。',
    magnify: '[igs-fx:magnify|角色|部位|说明]：搜证或细看某人某处细节时写，部位如 脸、手、嘴、脖子，说明写看到了什么。',
    accuse: '[igs-fx:accuse|角色|台词]：推理收束、侦探当面指认某人时写，台词省略按“就是你！”。',
    stats: '[igs-fx:stats|角色|STR:60;CON:55;…|对比:STR:50|条:HP:12/14;SAN:55]：COC 八维、DND 六维亮出或升级时写，3 到 10 项；DND 如 [igs-fx:stats|艾琳|力量 16(+3);敏捷 14|条:HP:24/30]；对比只写变化的轴；|规则:coc/dnd 可强制规则集。',
});

const text = (v) => String(v == null ? '' : v).trim();
const num = (v) => {
    const m = text(v).replace(/[，,]/g, '').match(/-?\d+(?:\.\d+)?/);
    return m ? Number(m[0]) : null;
};
const splitList = (v, limit = 10, width = 60) => text(v).split(/[;；\n]/).map(text).filter(Boolean).slice(0, limit).map((s) => Array.from(s).slice(0, width).join(''));

export const COC_ENDING_MODES = Object.freeze({ 团灭: 'wipe', 全灭: 'wipe', 覆没: 'wipe', wipe: 'wipe', 撕卡: 'tear', 死亡: 'tear', 阵亡: 'tear', tear: 'tear' });
export const COC_LEVELS = Object.freeze({ 轻: 'light', 轻微: 'light', light: 'light', 中: 'medium', medium: 'medium', 重: 'heavy', 严重: 'heavy', heavy: 'heavy' });
export const COC_REGIONS = Object.freeze({ 脸: 'face', 面部: 'face', 脸部: 'face', face: 'face', 眼: 'eye', 眼睛: 'eye', eye: 'eye', 嘴: 'lip', 嘴唇: 'lip', 唇: 'lip', lip: 'lip', 脖子: 'neck', 颈: 'neck', 脖颈: 'neck', neck: 'neck', 手: 'hand', 手部: 'hand', 手指: 'hand', hand: 'hand', 腰: 'waist', 腰部: 'waist', waist: 'waist' });
export const COC_RATINGS = Object.freeze({ S: 's', A: 'a', B: 'b', C: 'c', D: 'd', E: 'd', F: 'd', SS: 's', SSS: 's', 优: 'a', 良: 'b', 中: 'c', 差: 'd' });

const flag = (fields, names) => {
    for (const field of fields) {
        const m = text(field).match(/^([^:：]+)[:：]\s*(.*)$/);
        if (m && names.includes(m[1].trim().toLowerCase())) return text(m[2]);
    }
    return null;
};
const indexList = (value, count) => (value ? [...new Set((value.match(/\d+/g) || []).map(Number).filter((i) => i >= 1 && i <= count))] : []);

// 解析连线 "1-2,2-3"，返回 0 起的下标对；写不出合法的对时返回空数组，由调用方退回依次相连。
export function parseBoardLinks(value, count) {
    const out = [];
    for (const m of text(value).matchAll(/(\d+)\s*[-–—→>]+\s*(\d+)/g)) {
        const a = Number(m[1]);
        const b = Number(m[2]);
        if (a >= 1 && b >= 1 && a <= count && b <= count && a !== b) out.push([a - 1, b - 1]);
    }
    return out.slice(0, 8);
}

// 返回 [type, ...] 或 null；字段写错按最宽松的合法形式，缺必填整条丢弃。
export function parseCocBody(type, fields) {
    const f = (fields || []).map(text);
    const [a = '', b = '', c = '', d = ''] = f;
    switch (type) {
    case 'san': {
        const value = num(a);
        return value == null ? null : ['san', value, num(b), c, num(d)];
    }
    case 'symptom': return a ? ['symptom', a, b, Object.hasOwn(COC_LEVELS, c.toLowerCase()) ? COC_LEVELS[c.toLowerCase()] : 'medium'] : null;
    case 'clue': return a ? ['clue', a, b] : null;
    case 'casebook': {
        const items = splitList(a, 12);
        if (!items.length) return null;
        const fresh = num(flag(f.slice(1), ['新增', 'new']));
        const title = flag(f.slice(1), ['标题', 'title']);
        const loose = f.slice(1).find((s) => s && !/^[^:：]+[:：]/.test(s)) || '';
        return ['casebook', items, Math.max(0, Math.min(items.length, fresh == null ? 0 : fresh)), title || loose];
    }
    case 'kp': return a ? ['kp', a, /^dm$/i.test(b) ? 'DM' : (b || 'KP').slice(0, 6)] : null;
    case 'ending': {
        const mode = COC_ENDING_MODES[a.toLowerCase()] || COC_ENDING_MODES[a];
        return mode ? ['ending', mode, b, c] : ['ending', 'tear', a, b];
    }
    case 'dungeon': {
        const rows = splitList(b, 8);
        return a || rows.length ? ['dungeon', a, rows, c] : null;
    }
    case 'portal': return a ? ['portal', a, b] : null;
    case 'rating': {
        const rate = COC_RATINGS[a.toUpperCase()] || COC_RATINGS[a];
        if (!a) return null;
        const rows = splitList(b, 6).map((s) => {
            const m = s.match(/^(.+?)[:：](.+)$/);
            return m ? { label: text(m[1]), value: text(m[2]) } : { label: '', value: s };
        });
        return ['rating', a.slice(0, 3).toUpperCase(), rate || 'c', rows, c];
    }
    case 'alive': {
        const left = num(a);
        if (left == null || left < 0) return null;
        const total = num(b);
        return ['alive', Math.round(left), total != null && total >= left ? Math.round(total) : null, c];
    }
    case 'rules': {
        const items = splitList(a, 10);
        if (!items.length) return null;
        const rest = f.slice(1);
        return ['rules', items, indexList(flag(rest, ['篡改', '涂抹', 'tamper']), items.length), indexList(flag(rest, ['违规', '触犯', 'violate']), items.length), flag(rest, ['标题', 'title']) || ''];
    }
    case 'board': {
        const items = splitList(a, 6, 22);
        if (!items.length) return null;
        const rest = f.slice(1);
        const linkText = flag(rest, ['连线', 'link']) ?? rest.find((s) => /^[\d\s,，、\-–—→>]+$/.test(s) && /\d/.test(s)) ?? '';
        const title = flag(rest, ['标题', 'title']) || rest.find((s) => s && !/^[^:：]+[:：]/.test(s) && s !== linkText) || '';
        return ['board', items, parseBoardLinks(linkText, items.length), title];
    }
    case 'magnify': return ['magnify', a, COC_REGIONS[b.toLowerCase()] || COC_REGIONS[b] || 'face', c];
    case 'accuse': return ['accuse', a, b || '就是你！'];
    case 'stats': return parseStats(f);
    default: return null;
    }
}

const STAT_ALIAS = Object.freeze({
    力量: 'STR', 体质: 'CON', 体型: 'SIZ', 敏捷: 'DEX', 外貌: 'APP', 智力: 'INT', 意志: 'POW', 教育: 'EDU', 感知: 'WIS', 魅力: 'CHA', 幸运: 'LUCK', 运气: 'LUCK',
    理智: 'SAN', 生命: 'HP', 体力: 'HP', 魔法: 'MP', 魔力: 'MP', 护甲: 'AC', 护甲等级: 'AC', 等级: 'LV', LEVEL: 'LV',
});
const STAT_ENTRY = /^([A-Za-z一-龥]{1,6})\s*[:：=\s]?\s*(-?\d+(?:\.\d+)?)\s*(?:[(（]\s*([+\-−]?\d+)\s*[)）])?$/;
const VITAL_ENTRY = /^([A-Za-z一-龥]{1,6})\s*[:：=\s]\s*(-?\d+)(?:\s*[/／]\s*(\d+))?$/;
const COC_ONLY = new Set(['SIZ', 'APP', 'EDU', 'POW']);
const DND_ONLY = new Set(['WIS', 'CHA']);
const statKey = (raw) => {
    const k = text(raw);
    return STAT_ALIAS[k] || STAT_ALIAS[k.toUpperCase()] || k.slice(0, 5).toUpperCase();
};

export function parseStatList(value, limit = 10) {
    const out = [];
    for (const part of text(value).split(/[;；,，、\n]+/)) {
        const m = text(part).match(STAT_ENTRY);
        if (!m) continue;
        const key = statKey(m[1]);
        if (out.some((r) => r.key === key)) continue;
        out.push({ key, value: Number(m[2]), mod: m[3] == null ? null : Number(m[3].replace('−', '-')) });
        if (out.length >= limit) break;
    }
    return out;
}

export function parseVitals(value, limit = 6) {
    const out = [];
    for (const part of text(value).split(/[;；,，、\n]+/)) {
        const m = text(part).match(VITAL_ENTRY);
        if (!m) continue;
        const key = statKey(m[1]);
        if (out.some((r) => r.key === key)) continue;
        const cur = Number(m[2]);
        const max = m[3] == null ? null : Number(m[3]);
        out.push({ key, cur, max: max != null && max > 0 ? max : null });
        if (out.length >= limit) break;
    }
    return out;
}

export function resolveStatsRule(hint, axes) {
    const h = text(hint).toLowerCase().replace(/[&\s]/g, '');
    if (/^(coc|克苏鲁|调查员|克苏鲁的呼唤)$/.test(h)) return 'coc';
    if (/^(dnd|龙与地下城|5e|dnd5e)$/.test(h)) return 'dnd';
    if (axes.some((r) => COC_ONLY.has(r.key))) return 'coc';
    if (axes.some((r) => DND_ONLY.has(r.key))) return 'dnd';
    return Math.max(...axes.map((r) => r.value)) > 30 ? 'coc' : 'dnd';
}

function parseStats(f) {
    let [who = '', list = ''] = f;
    let rest = f.slice(2);
    if (parseStatList(who).length >= 3 && parseStatList(list).length < 3) {
        rest = [list, ...rest];
        list = who;
        who = '';
    }
    const axes = parseStatList(list);
    if (axes.length < 3) return null;
    const prev = parseStatList(flag(rest, ['对比', '旧值', '上次', 'prev', 'from']) || '');
    const merged = axes.map((r) => {
        const old = prev.find((p) => p.key === r.key);
        return { ...r, prev: old ? old.value : null };
    });
    const sub = flag(rest, ['职业', '身份', 'class', 'sub']) || rest.find((s) => s && !/^[^:：]+[:：]/.test(s)) || '';
    return ['stats', who, merged, resolveStatsRule(flag(rest, ['规则', 'rule', '系统']), axes), flag(rest, ['标题', 'title']) || '', sub, parseVitals(flag(rest, ['条', '附加', '状态', 'vitals', 'extra']) || '')];
}

export function cocItemOf(args) {
    const [type, p1, p2, p3, p4, p5, p6] = args;
    switch (type) {
    case 'san': return { type, value: p1, delta: p2, label: p3 || 'SAN', max: p4 };
    case 'symptom': return { type, name: p1, desc: p2, level: p3 };
    case 'clue': return { type, name: p1, desc: p2 };
    case 'casebook': return { type, items: p1, fresh: p2, title: p3 };
    case 'kp': return { type, text: p1, role: p2 };
    case 'ending': return { type, mode: p1, name: p2, reason: p3 };
    case 'dungeon': return { type, title: p1, rows: p2, footer: p3 };
    case 'portal': return { type, place: p1, sub: p2 };
    case 'rating': return { type, grade: p1, tier: p2, rows: p3, title: p4 };
    case 'alive': return { type, left: p1, total: p2, title: p3 };
    case 'rules': return { type, items: p1, tamper: p2, violate: p3, title: p4 };
    case 'board': return { type, items: p1, links: p2, title: p3 };
    case 'magnify': return { type, who: p1, region: p2, note: p3 };
    case 'accuse': return { type, who: p1, line: p2 };
    case 'stats': return { type, who: p1, axes: p2, rule: p3, title: p4, sub: p5, vitals: p6 };
    default: return null;
    }
}

export const COC_AMBIENCE_RULES = Object.freeze([
    ['zonehub', /主神空间|主神殿|轮回空间|精神时间屋|白色空间/],
    ['fogport', /雾港|雾都|阿卡姆|印斯茅斯|敦威治/],
    ['cordon', /警戒线|案发现场|凶案现场|命案现场/],
]);

// 1920 年代只做换皮：大正世界观给雾港与警戒线加 retro 变体（暖褐色调），不新增时代档。
export function resolveCocAmbience(location, worldview = '') {
    const loc = text(location);
    if (!loc) return null;
    const hit = COC_AMBIENCE_RULES.find(([, re]) => re.test(loc));
    if (!hit) return null;
    return { kind: hit[0], variant: worldview === 'taisho' && hit[0] !== 'zonehub' ? 'retro' : '' };
}
