import { namesOf, QUOTE_RE, ABSENT_RE, MEDIA_RE, MEDIA_AFTER_RE, mentionIsAbsent } from './narration-sprite.js';

// 旁白页立绘给谁（每楼一个，按页序调用）：
// - 感知句「你听见小雪在哭」「严尚义盯着白墨看」给被感知的人（宾语）；「白墨被严尚义看到」给被字前的主语；
// - 否则看开头三个字内（标点不算）的名字；youLead 时「你」开头给主角（「你的」「你身后」等修饰不算）；
// - 开头小句没写到人（穿过门口，你……）时取逗号后的名字或「你」；
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
const CLAUSE_LEAD_RE = /^([^，,、；;]{1,10})[，,、]\s*/;
// 「接着你」「然后白墨」：句首连接词不占开头的位置。
const CONNECTIVE_RE = /^(?:紧接着|接着|然后|随后|于是|这时候?|此时|突然|忽然|同时|只见|而|但|可是?|不过)/;
// 名字是常用词的子串（下小雨了、小雨点、小雨过后）：前后文像天气 / 量词时不当人名。
const NAME_BEFORE_RE = /(?:下|场|阵|细|飘|毛毛)$/;
const NAME_AFTER_RE = /^(?:点(?![头了点着击开亮燃])|滴|天|过(?![来去头身])|后(?![退仰撤背来方面排])|季)/;

const probeOf = (name) => String(name || '').replace(/[\s\p{P}\p{S}]/gu, '');

export function createNarrationNamer({ characters = {}, aliases = {}, userKey = '', userNames = [], allow = () => true, genderOf = () => '', youLead = false } = {}) {
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

    // 句首主语：开头三个字内的第一个人。
    function leadToken(text) {
        const lead = String(text || '').trimStart();
        for (let k = 0; k < Math.min(LEAD_REACH, lead.length); k++) { const t = tokenAt(lead, k); if (t) return t; }
        return null;
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
            // 「嬷嬷立在床幔外，听见你……」：这个小句省略了主语，感知者往前取整句的主语。
            return { seen, by: lastToken(clause) || leadToken(before), passive: false };
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

    // loose：舞台上没人可沿用时（楼首页、人都走了），名字不在开头也认，取全页最早出现的那个。
    function read(text, { focus = '', loose = false } = {}) {
        // 场景标签和正文同页（「[igs-scene:…]你听着……」）时先剥掉，否则句首认不出人。
        const body = String(text || '').replace(/\[igs-[^\]\n]*\]?/g, '').replace(QUOTE_RE, '');
        const sentences = body.split(SENTENCE_RE).filter((s) => s.trim());
        let pick = null, mention = false;
        // 每句只算一次感知，选人和推进话题共用。
        const perceived = sentences.map((s) => perceive(s));
        for (const p of perceived) {
            if (!p) continue;
            // 宾语是代词、泛指或反身时不猜，这一页不点名。
            // 「嬷嬷听见你……」：第二人称里别人看 / 听你，镜头是你的眼睛，给感知者。
            if (!p.passive && p.seen.kind === 'you' && p.by?.kind === 'name') { pick = p.by.key; break; }
            pick = p.seen.kind === 'name' || p.seen.kind === 'you' ? p.seen.key || '' : '';
            break;
        }
        const plain = probeOf(body);
        const earliestName = (reach) => {
            let found = null, bestAt = reach;
            for (const e of entries) {
                const at = plain.indexOf(e.probe);
                if (at < 0 || at >= bestAt || numbered(e.probe, plain.slice(at + e.probe.length))) continue;
                if (NAME_BEFORE_RE.test(plain.slice(Math.max(0, at - 2), at)) || NAME_AFTER_RE.test(plain.slice(at + e.probe.length))) continue;
                // 「小雪的照片」「白墨还没来」「听说小雪……」：写到了，人不在眼前。
                const sentence = sentences.find((s) => s.includes(e.name)) || '';
                const written = sentence.indexOf(e.name);
                if (written >= 0 && mentionIsAbsent(sentence, written, written + e.name.length)) continue;
                found = e.key; bestAt = at;
            }
            return found;
        };
        if (pick === null) pick = earliestName(LEAD_REACH + (plain.match(CONNECTIVE_RE)?.[0].length || 0));
        if (pick === null && youLead && userKey) {
            const lead = (sentences[0] || '').replace(/^[\s\p{P}\p{S}]+/u, '').replace(CONNECTIVE_RE, '').replace(/^[\s\p{P}\p{S}]+/u, '');
            if (lead[0] === '你' && !YOU_MODIFIER_RE.test(lead)) pick = userKey;
        }
        if (pick === null) {
            // 「穿过门口，你推开门」：开头小句省略主语、本身没写到人时，取逗号后的主语。
            const first = (sentences[0] || '').trimStart();
            const m = first.match(CLAUSE_LEAD_RE);
            const t = m && !m[1].includes('我') && !lastToken(m[1]) ? tokenAt(first, m[0].length) : null;
            if (t?.kind === 'you' && youLead && userKey) pick = userKey;
            if (t?.kind === 'name' && !NAME_AFTER_RE.test(first.slice(t.end)) && !mentionIsAbsent(first, t.start, t.end)) pick = t.key;
        }
        if (pick === null) {
            const head = (sentences[0] || '').trimStart().match(PRONOUN_HEAD_RE);
            if (head) pick = resolvePronoun(head[0], focus);
        }
        if (!pick && loose) {
            // 台上没人：「你听见她……」宾语认不出时给感知者，再不行取全页最早的名字。
            const by = perceived.find(Boolean)?.by;
            const lead = (sentences[0] || '').replace(/^[\s\p{P}\p{S}]+/u, '').replace(CONNECTIVE_RE, '').replace(/^[\s\p{P}\p{S}]+/u, '');
            if (by?.kind === 'you' || (lead[0] === '你' && !YOU_MODIFIER_RE.test(lead))) pick = youLead && userKey ? userKey : pick;
            else if (by?.kind === 'name') pick = by.key;
            if (!pick) { pick = earliestName(Infinity); mention = Boolean(pick); }
        }
        // 话题主语按句推进：感知句记感知者与宾语（被动句的主语是被感知者），其余记句首的人；「你」打头不改话题。
        for (let n = 0; n < sentences.length; n++) {
            const s = sentences[n], p = perceived[n];
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
        // mention：只是句中顺口提到（不是句首主语 / 感知者 / 被看见的人），allow 可据此要求近期露过面。
        return pick && allow(pick, { mention }) ? pick : '';
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
