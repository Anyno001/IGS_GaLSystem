// 陪衬反应换表情：[igs-fx:react|角色|情绪] 写了情绪词时，这个角色的立绘换成对应表情，
// 一直保持到他下次开口（char / thought 指令）或下一条写给他的 react。「全员」对所有角色生效。
// 纯函数，只按原文偏移比较；两组指令必须来自同一段原文。
export const REACT_MOOD_ALL = '全员';

// reacts：fx 指令（取 kind === 'react'，args = [角色, 情绪]）；speech：场景指令（取 type 为 char / thought）。
// 返回 (name) => 情绪词，没有生效的反应时返回 ''。
export function createReactMoodLookup({ reacts = [], speech = [], offset = -1, keyOf = (name) => name } = {}) {
    const at = Number(offset);
    if (!Number.isFinite(at) || at < 0) return () => '';
    const key = (name) => {
        const raw = String(name || '').trim();
        return raw ? String(keyOf(raw) || raw) : '';
    };
    const lastReact = new Map();
    let lastAll = null;
    for (const d of Array.isArray(reacts) ? reacts : []) {
        if (!d || d.kind !== 'react' || !(Number(d.offset) <= at)) continue;
        const args = Array.isArray(d.args) ? d.args : [];
        const emotion = String(args[1] || '').trim();
        const target = String(args[0] || '').trim();
        if (!target) continue;
        const entry = { offset: Number(d.offset), emotion };
        if (target === REACT_MOOD_ALL) lastAll = entry;
        else lastReact.set(key(target), entry);
    }
    if (!lastReact.size && !lastAll) return () => '';
    const lastSpeech = new Map();
    for (const d of Array.isArray(speech) ? speech : []) {
        if (!d || (d.type !== 'char' && d.type !== 'thought') || !d.character || !(Number(d.offset) <= at)) continue;
        lastSpeech.set(key(d.character), Number(d.offset));
    }
    return (name) => {
        const k = key(name);
        if (!k) return '';
        const own = lastReact.get(k);
        const pick = own && lastAll ? (own.offset >= lastAll.offset ? own : lastAll) : own || lastAll;
        if (!pick || !pick.emotion) return '';
        const spoke = lastSpeech.has(k) ? lastSpeech.get(k) : -1;
        return pick.offset > spoke ? pick.emotion : '';
    };
}

// 换表情只认真正命中的图：精确槽位 / 情绪组 / 同方向另一档；落到「默认」或「平和」兜底就不换。
export function isReactMoodHit(hit) {
    if (!hit || !hit.url) return false;
    if (hit.slot === '默认' || hit.slot === '平和') return false;
    return hit.quality === 'exact' || hit.quality === 'group' || hit.quality === 'tier-fallback';
}
