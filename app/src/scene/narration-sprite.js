// 旁白页沿用上一位说话人的立绘（纯函数）：
// - 旁白写到「这个人 + 离开」的那一句起，立绘清掉，之后的旁白也不再沿用（再开口或正文写回来才回来）；
//   主语须是这个人：名字、别名，或句首没有别人时的「她/他」（指代最近说话人）；「看着她离开」「她的视线离开」不算；
// - 否则紧跟台词的 2 页旁白照常沿用；再往后只有旁白里还写着这个人才留着。
// 第二人称视角的角色（玩家本人、或本楼有心里话的人）在旁白里写作「你」，也算写到。

export const NARRATION_HOLD_PAGES = 2;

const LEAVE_RE = /离开(?!了?(?:前|之前|时|以前|的时候)|了?(?:座|椅|凳|沙发|床|桌|原位|地面|地板|身边|视线|[他她它你我]的?(?:怀|身|唇|嘴|手|肩|视线)))|离去|离场|走了(?![过进入回两三几一半很好许])|走掉|走远|走出|走开|退下(?![盔甲])|退出|退向|退到|退回|告辞|告退|出门|出了门|下楼|转身离|转身走|拂袖而去|扬长而去|夺门而出|冲出(?!重围|包围)|跑开|跑走|溜走|离线|下线|消失在|不见了|身影远去/g;
const RETURN_RE = /回来|走进(?!了?[他她你我]?的?(?:心|回忆|生活|世界))|走入|踏入|进来|推门而入|推门进|闯进|折返|返回|归来|重新出现|现身|出现在(?!脑|心|记忆|梦)|赶到|回到(?:房|屋|室|厅|殿|场)/g;
const OBSERVE_RE = /看着|望着|盯着|注视|目送|看向|看见|瞥见|送|拉着|拽着|带着|扶着/;
// 主语前是使役 / 观察词（让她离开、目送她离开），或之间有意愿 / 假设词（想离开、如果离开），不算已离开。
const CAUSE_BEFORE_RE = /(?:让|叫|令|请|劝|求|目送|看着|望着|盯着|注视|看见|瞥见|看向)$/;
const INTENT_BETWEEN_RE = /想要?|打算|准备|试图|企图|欲|如果|假如|若是?|能否|可以|应该|是否|说要/;
const NEGATE_RE = /(?:不|没|未|别|莫|不曾|没有|不肯|不愿|不想)$/;
const PRONOUN_RE = /[她他它]|TA/g;
// 名字到离开动作之间最多隔多少字（同一句里）。
const LEAVE_REACH = 20;

function namesOf(name, aliases) {
    const list = [name, ...(Array.isArray(aliases) ? aliases : [])].map((s) => String(s || '').trim()).filter(Boolean);
    // 三四个字的中文名也认后两字：李哪吒 → 哪吒。
    for (const n of [...list]) if (/^[一-鿿]{3,4}$/.test(n)) list.push(n.slice(-2));
    return [...new Set(list)];
}

function spansOf(sentence, list, kind) {
    const out = [];
    for (const n of list) {
        for (let at = sentence.indexOf(n); at >= 0; at = sentence.indexOf(n, at + n.length)) out.push({ start: at, end: at + n.length, kind });
    }
    return out;
}

function markersOf(sentence, own, others) {
    const marks = spansOf(sentence, own, 'own');
    const free = (s) => !marks.some((m) => s.start < m.end && m.start < s.end);
    for (const s of spansOf(sentence, others, 'other')) if (free(s)) marks.push(s);
    for (const s of spansOf(sentence, ['你'], 'other')) if (free(s)) marks.push(s);
    for (const m of sentence.matchAll(PRONOUN_RE)) {
        const s = { start: m.index, end: m.index + m[0].length, kind: 'pronoun' };
        if (free(s)) marks.push(s);
    }
    return marks.sort((a, b) => a.start - b.start);
}

// 一句里「这个人」做主语的离开 / 回来事件（按出现顺序）。prevMixed：上一句出现了别人，句首代词指代不明。
function eventsOf(sentence, marks, prevMixed) {
    const events = [];
    const scan = (re, type) => {
        for (const m of sentence.matchAll(re)) {
            let nearest = -1;
            for (let i = 0; i < marks.length && marks[i].end <= m.index; i++) nearest = i;
            if (nearest < 0) continue;
            const mark = marks[nearest];
            if (mark.kind === 'other') continue;
            if (mark.kind === 'pronoun' && (nearest > 0 || prevMixed)) continue;
            if (m.index - mark.start > LEAVE_REACH) continue;
            const between = sentence.slice(mark.end, m.index);
            if (between.includes('的') || OBSERVE_RE.test(between)) continue;
            if (type === 'leave' && (CAUSE_BEFORE_RE.test(sentence.slice(Math.max(0, mark.start - 4), mark.start)) || INTENT_BETWEEN_RE.test(between))) continue;
            if (type === 'leave' && NEGATE_RE.test(sentence.slice(0, m.index))) continue;
            events.push({ at: m.index, type });
        }
    };
    scan(LEAVE_RE, 'leave');
    scan(RETURN_RE, 'return');
    return events.sort((a, b) => a.at - b.at);
}

// 按页序推导：最后一个事件说了算。gone=true 表示此刻已离场；back 为最近一次「回来」所在页下标（没有为 -1）。
function presenceOf(pages, names, others) {
    const own = names;
    const rest = (Array.isArray(others) ? others : []).map((s) => String(s || '').trim()).filter((s) => s.length >= 2 && !own.includes(s));
    let gone = false;
    let back = -1;
    let prevMixed = false;
    pages.forEach((text, index) => {
        for (const sentence of String(text || '').split(/[。！？!?\n]/)) {
            if (!sentence) continue;
            const marks = markersOf(sentence, own, rest);
            for (const event of eventsOf(sentence, marks, prevMixed)) {
                if (event.type === 'leave') { gone = true; back = -1; } else if (gone) { gone = false; back = index; }
            }
            // 无人称的旁白不改变最近明确提到的人；否则后一句「他走了」会被每位同屏陪衬各自认领。
            if (marks.some((m) => m.kind === 'own' || m.kind === 'other')) {
                prevMixed = marks.some((m) => m.kind === 'other');
            }
        }
    });
    return { gone, back };
}

// pages：说话页之后到本页为止的各页文字（按顺序，最后一项是本页）。others：其他角色的名字 / 别名，用来判断主语和代词指代。
export function narrationKeepsSprite({ name, aliases = [], others = [], pov = false, pages = [] } = {}) {
    const names = namesOf(name, aliases);
    if (!names.length || !pages.length) return false;
    const { gone, back } = presenceOf(pages, names, others);
    if (gone) return false;
    const held = back >= 0 ? pages.slice(back) : pages;
    if (held.length <= NARRATION_HOLD_PAGES) return true;
    const current = String(pages[pages.length - 1] || '');
    return names.some((n) => current.includes(n)) || (pov && current.includes('你'));
}

// 同屏陪衬是否已被正文写走：text 为他最后一次开口之后到本页的原文。
export function narrationCastLeft({ name, aliases = [], others = [], text = '' } = {}) {
    const names = namesOf(name, aliases);
    return names.length > 0 && presenceOf([text], names, others).gone;
}

export function otherNamesOf(characters, aliasMap, selfKey, extra = []) {
    const out = new Set();
    const aliases = aliasMap && typeof aliasMap === 'object' ? aliasMap : {};
    for (const key of Object.keys(characters && typeof characters === 'object' ? characters : {})) {
        if (key === selfKey) continue;
        for (const n of namesOf(key, aliases[key])) out.add(n);
    }
    for (const n of Array.isArray(extra) ? extra : []) if (n) out.add(String(n));
    return [...out];
}
