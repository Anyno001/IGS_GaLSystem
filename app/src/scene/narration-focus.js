import { namesOf, QUOTE_RE, ABSENT_RE, MEDIA_RE, MEDIA_AFTER_RE } from './narration-sprite.js';

// 旁白页立绘给谁（每楼一个，按页序调用）：
// - 感知句「你听见小雪在哭」「严尚义盯着白墨看」给被感知的人（宾语）；「白墨被严尚义看到」给被字前的主语；
// - 否则看开头三个字内（标点不算）的名字；
// - 否则开头的她 / 他：先归话题主语（topic，最近一句旁白的施事者），性别冲突再归画面上的人或上一句宾语，都对不上不猜。
// 名字含别名与三四字名的后两字；同一位置取最长的（尚义嬷嬷 先于 尚义），都换回主名。
// read 返回主名，'' 表示这一页不点名（沿用照旧）。allow(key) 决定能不能上立绘（主角须有素材、其他人须近期露面）。

const PERCEIVE_RE = /看见|看到|望见|瞧见|瞥见|看向|望向|注视着?|盯着|听见|听到|闻到|注意到|发现|察觉到?|感觉到|撞见|遇见|碰见/g;
const PERCEIVE_NEGATE_RE = /(?:没|没有|未|未曾|不曾|并未|从未|从没|没能)$/;
const GENERIC_RE = /^(?:自己|大家|众人|人群|所有人|别人|他人|人们|旁人|一群人|一行人|她们|他们|它们)/;
const PRONOUN_HEAD_RE = /^[她他](?!们)/;
// 你身后的小雪、你的手：「你」只是修饰，不是宾语。
const YOU_MODIFIER_RE = /^你(?:的|们|身|面前|背后|旁边|对面)/;
const SENTENCE_RE = /[。！？!?…\n]/;
// 宾语前可跳过的修饰（不远处的、站在门口的）最多几个字。
const OBJECT_REACH = 8;
const LEAD_REACH = 3;

const probeOf = (name) => String(name || '').replace(/[\s\p{P}\p{S}]/gu, '');

export function createNarrationNamer({ characters = {}, aliases = {}, userKey = '', userNames = [], allow = () => true, genderOf = () => '' } = {}) {
    const aliasMap = aliases && typeof aliases === 'object' ? aliases : {};
    const keys = Object.keys(characters && typeof characters === 'object' ? characters : {});
    if (userKey && !keys.includes(userKey)) keys.push(userKey);
    const explicit = new Map(), derived = new Map();
    for (const key of keys) {
        const own = [key, ...(Array.isArray(aliasMap[key]) ? aliasMap[key] : []), ...(key === userKey ? userNames : [])]
            .map((n) => String(n || '').trim()).filter(Boolean);
        for (const n of own) if (!explicit.has(n)) explicit.set(n, key);
        // 两个人简称相同（王小雪 / 李小雪 → 小雪）时谁都不认。
        for (const n of namesOf(key, aliasMap[key])) {
            if (own.includes(n)) continue;
            derived.set(n, derived.has(n) && derived.get(n) !== key ? null : key);
        }
    }
    for (const [n, key] of derived) if (key && !explicit.has(n)) explicit.set(n, key);
    const entries = [...explicit].map(([name, key]) => ({ name, probe: probeOf(name), key }))
        .filter(({ probe }) => Array.from(probe).length >= 2)
        .sort((a, b) => b.probe.length - a.probe.length);
    // 「路人」不认领「路人A」：名字后面紧跟编号说明是另一个人。
    const numbered = (probe, tail) => /[一-鿿]$/.test(probe) && /^[A-Za-z0-9０-９Ａ-Ｚａ-ｚ甲乙丙丁]/.test(tail);

    function tokenAt(text, pos) {
        const rest = text.slice(pos);
        const generic = rest.match(GENERIC_RE);
        if (generic) return { kind: 'generic', start: pos, end: pos + generic[0].length };
        for (const e of entries) {
            if (rest.startsWith(e.name) && !numbered(e.probe, rest.slice(e.name.length))) return { kind: 'name', key: e.key, start: pos, end: pos + e.name.length };
        }
        if (PRONOUN_HEAD_RE.test(rest)) return { kind: 'pronoun', word: rest[0], start: pos, end: pos + 1 };
        if (rest[0] === '你' && !YOU_MODIFIER_RE.test(rest)) return { kind: 'you', key: userKey, start: pos, end: pos + 1 };
        return null;
    }
    function lastToken(text) {
        let last = null;
        for (let pos = 0; pos < text.length;) {
            const t = tokenAt(text, pos);
            if (t) { last = t; pos = t.end; } else pos += 1;
        }
        return last;
    }

    // 一句里第一个有效感知：seen 被感知者，by 感知者，passive 被动句；不在场 / 否定 / 媒介 / 找不到宾语的跳过。
    function perceive(sentence) {
        for (const m of sentence.matchAll(PERCEIVE_RE)) {
            const before = sentence.slice(0, m.index);
            const clause = before.split(/[，,；;]/).pop();
            if (ABSENT_RE.test(clause) || PERCEIVE_NEGATE_RE.test(before) || MEDIA_RE.test(sentence)) continue;
            const passive = clause.match(/被([^被]{1,10})$/);
            if (passive) {
                const seen = lastToken(clause.slice(0, passive.index));
                if (seen) return { seen, by: lastToken(passive[1]), passive: true };
                continue;
            }
            const after = sentence.slice(m.index + m[0].length).split(/[，,；;：:]/)[0];
            let seen = null;
            for (let k = 0; k <= Math.min(OBJECT_REACH, after.length - 1) && !seen; k++) seen = tokenAt(after, k);
            if (!seen) continue;
            if (seen.kind === 'name' && MEDIA_AFTER_RE.test(after.slice(seen.end))) continue;
            return { seen, by: lastToken(clause), passive: false };
        }
        return null;
    }

    let topic = '', object = '';
    const genderWord = (word) => (word === '她' ? 'female' : 'male');
    const fits = (key, word) => { const g = genderOf(key); return !g || g === genderWord(word); };
    function resolvePronoun(word, focus) {
        if (topic && fits(topic, word)) return topic;
        for (const key of [focus, object]) {
            if (!key || key === topic) continue;
            if (topic ? genderOf(key) === genderWord(word) : fits(key, word)) return key;
        }
        return '';
    }
    const keyOf = (token, focus) => !token ? ''
        : token.kind === 'name' ? token.key
            : token.kind === 'pronoun' ? resolvePronoun(token.word, focus) : '';

    function read(text, { focus = '' } = {}) {
        const body = String(text || '').replace(QUOTE_RE, '');
        const sentences = body.split(SENTENCE_RE).filter((s) => s.trim());
        let pick = null;
        for (const s of sentences) {
            const p = perceive(s);
            if (!p) continue;
            // 宾语是代词、泛指或反身时不猜，这一页不点名。
            pick = p.seen.kind === 'name' || p.seen.kind === 'you' ? p.seen.key || '' : '';
            break;
        }
        if (pick === null) {
            const plain = probeOf(body);
            let bestAt = LEAD_REACH;
            for (const e of entries) {
                const at = plain.indexOf(e.probe);
                if (at < 0 || at >= bestAt || numbered(e.probe, plain.slice(at + e.probe.length))) continue;
                pick = e.key; bestAt = at;
            }
        }
        if (pick === null) {
            const head = (sentences[0] || '').trimStart().match(PRONOUN_HEAD_RE);
            if (head) pick = resolvePronoun(head[0], focus);
        }
        // 话题主语按句推进：感知句记感知者与宾语（被动句的主语是被感知者），其余记句首的人；「你」打头不改话题。
        for (const s of sentences) {
            const p = perceive(s);
            if (p) {
                const [doer, done] = p.passive ? [p.seen, p.by] : [p.by, p.seen];
                const doerKey = doer && doer.kind !== 'you' ? keyOf(doer, focus) : '';
                if (doerKey) topic = doerKey;
                object = done && done.kind !== 'you' ? keyOf(done, focus) : '';
                continue;
            }
            const lead = s.trimStart();
            let t = null;
            for (let k = 0; k < Math.min(LEAD_REACH, lead.length) && !t; k++) t = tokenAt(lead, k);
            const key = t && t.kind !== 'you' ? keyOf(t, focus) : '';
            if (key) { topic = key; object = ''; }
        }
        return pick && allow(pick) ? pick : '';
    }
    return {
        read,
        // 台词 / 心里话页：说话人成为话题主语。
        note(key) { if (key) { topic = key; object = ''; } },
        // 跨过场景标签：没跟过来的人不再作为指代对象。
        cross(keeps) {
            if (topic && !keeps(topic)) topic = '';
            if (object && !keeps(object)) object = '';
        },
        get topic() { return topic; },
    };
}
