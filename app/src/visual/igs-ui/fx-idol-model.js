// 偶像包的标签解析与数据：纯函数，不碰 DOM。字段写错按最宽松的合法形式处理，缺必填字段则整条忽略。
// 打歌舞台的 kind 叫 onstage：stage 已被站位指令 [igs-fx:stage|...] 占用。
export const IDOL_KINDS = Object.freeze(['onstage', 'fancam', 'lightsea', 'debut', 'award', 'fansign', 'paparazzi', 'practice', 'backstage', 'banner']);

export const IDOL_LABELS = Object.freeze({
    onstage: '打歌舞台登场', fancam: '直拍框', lightsea: '应援色灯海', debut: '选秀排名与出道位', award: '一位颁奖',
    fansign: '签售会', paparazzi: '狗仔偷拍', practice: '练习室', backstage: '后台候场', banner: '应援手幅',
});

export const IDOL_TRIGGERS = Object.freeze({
    onstage: ['打歌', '舞台登场', '升降台', '安可'],
    fancam: ['直拍', '饭拍', '竖屏'],
    lightsea: ['应援色', '灯海', '应援棒'],
    debut: ['出道位', '选秀', '出道夜', '排名公布'],
    award: ['打歌一位', '拿到一位', '颁奖', '奖杯'],
    fansign: ['签售', '握手会', '签名板', '见面会'],
    paparazzi: ['偷拍', '长焦', '蹲守', '狗仔'],
    practice: ['练习室', '练舞', '镜墙', '节拍器'],
    backstage: ['后台', '候场', '化妆镜', '耳返'],
    banner: ['手幅', '灯牌', '应援牌', '接机'],
});

export const IDOL_PROMPT_LINES = Object.freeze({
    onstage: '[igs-fx:onstage|歌名|角色|安可]：打歌舞台上角色登场的一刻，升降台升起、舞台灯扫过、立绘由剪影转亮；歌名与角色可省，第三栏写“安可”时是返场版（台下先喊安可）',
    fancam: '[igs-fx:fancam|角色|标题]：粉丝拍的竖屏直拍，取景框里是该角色并带 REC 轻晃；标题可省，默认“角色名 直拍”，不超过12字',
    lightsea: '[igs-fx:lightsea|应援色|应援名]：台下观众席整片亮成应援色并随节奏呼吸；应援色写正文里的颜色（十六进制或颜色名均可，省略则取粉色），应援名可省；演唱会高潮可与 concert 同页叠用',
    debut: '[igs-fx:debut|名字:名次;名字:名次|标题]：选秀名次逐个揭晓、金字塔出道位依次亮起，名次从低到高写成整数，最多6人；标题可省（数字滚动、揭晓定格另有 count、reveal）',
    award: '[igs-fx:award|大字|获奖者|开信封]：打歌节目拿到一位或颁奖的瞬间，奖杯升起、彩带落下、大字砸出；大字省略为“一位”，不超过6字，获奖者可省，第三栏写“开信封”会先有开信封的悬念',
    fansign: '[igs-fx:fansign|签名|留言1;留言2]：签售会上角色在签名板上逐笔写下名字，粉丝的便利贴留言飘出；留言最多3条，每条不超过14字，可省',
    paparazzi: '[igs-fx:paparazzi|角色|连拍数]：被狗仔躲在暗处长焦偷拍，对焦框锁住角色后快门连拍，前景有模糊遮挡；连拍数 3–8，可省（记者围拍的闪光灯另有 flashes）',
    practice: '[igs-fx:practice|角色|BPM]：练习室里对着镜墙反复练舞，多重镜像随节拍器同步，汗水与毛巾；BPM 为 60–180 的整数，可省（默认100）',
    backstage: '[igs-fx:backstage|角色|秒数]：后台化妆镜前候场，灯泡镜框亮着，耳返里倒数“3、2、1”后上台；秒数 3–5，可省（默认3）',
    banner: '[igs-fx:banner|文字1;文字2|颜色]：应援手幅或灯牌从画面下方升起，文字最多3条每条不超过8字，颜色可省（沿用应援色）',
});

export const IDOL_GRAMMAR_LINES = Object.freeze({
    onstage: 'onstage|歌名|角色|安可：打歌舞台升降台登场',
    fancam: 'fancam|角色|标题：竖屏直拍框',
    lightsea: 'lightsea|应援色|应援名：观众席整片应援色',
    debut: 'debut|名字:名次;名字:名次|标题：出道位揭晓',
    award: 'award|大字|获奖者|开信封：一位颁奖',
    fansign: 'fansign|签名|留言1;留言2：签售逐笔签名',
    paparazzi: 'paparazzi|角色|连拍数：长焦偷拍',
    practice: 'practice|角色|BPM：练习室镜墙',
    backstage: 'backstage|角色|秒数：后台候场倒计时',
    banner: 'banner|文字1;文字2|颜色：应援手幅升起',
});

const text = (value) => String(value == null ? '' : value).trim();
const cut = (value, max) => Array.from(text(value)).slice(0, max).join('');
const listOf = (value) => text(value).split(/[;；]/).map((s) => s.trim()).filter(Boolean);
const ENCORE_RE = /^(安可|返场|encore)$/i;
const ENVELOPE_RE = /^(开信封|信封|悬念|envelope)$/i;

export const COLOR_WORDS = Object.freeze([
    ['粉', '#ff6fae'], ['红', '#ff4d5e'], ['橙', '#ff9a3c'], ['黄', '#ffd83a'], ['绿', '#4fdc8a'], ['青', '#3fd8d0'],
    ['蓝', '#4f8cff'], ['紫', '#a978ff'], ['白', '#f4f4f8'], ['金', '#ffc94a'], ['银', '#cfd6e2'],
]);
export const DEFAULT_LIGHT_COLOR = '#ff6fae';

function hueOf(name) {
    let h = 17;
    for (const ch of String(name)) h = (h * 31 + ch.codePointAt(0)) >>> 0;
    return h % 360;
}

// 应援色：十六进制原样，英文颜色名交给浏览器，中文颜色名按首个命中的基础色，其余按文字取稳定色相；空串返回 fallback。
export function resolveLightColor(value, fallback = DEFAULT_LIGHT_COLOR) {
    const raw = text(value);
    if (!raw) return fallback;
    if (/^#[0-9a-f]{3}$/i.test(raw) || /^#[0-9a-f]{6}$/i.test(raw)) return raw.toLowerCase();
    if (/^[a-z]{3,20}$/i.test(raw)) return raw.toLowerCase();
    for (const [word, hex] of COLOR_WORDS) if (raw.includes(word)) return hex;
    return `hsl(${hueOf(raw)},82%,62%)`;
}

export function parseRanks(value, limit = 6) {
    return listOf(value).map((entry) => {
        const m = entry.match(/^(.+?)\s*[:：=]\s*(\d{1,3})/);
        return m ? { name: cut(m[1], 6), rank: Number(m[2]) } : null;
    }).filter((row) => row && row.name && row.rank >= 1).slice(0, limit);
}

export function ranksString(rows) {
    return rows.map((row) => `${row.name}:${row.rank}`).join(';');
}

export function clampInt(value, lo, hi, fallback) {
    const n = Number.parseInt(text(value), 10);
    return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fallback;
}

export function parseIdolFxBody(type, fields) {
    const f = (Array.isArray(fields) ? fields : []).map(text);
    const [a = '', b = '', c = ''] = f;
    switch (type) {
    case 'onstage': {
        const encore = f.some((s) => ENCORE_RE.test(s));
        const rest = f.filter((s) => !ENCORE_RE.test(s));
        return ['onstage', cut(rest[0], 16), cut(rest[1], 8), encore ? 'encore' : ''];
    }
    case 'fancam': return ['fancam', cut(a, 8), cut(b, 12)];
    case 'lightsea': return ['lightsea', cut(a, 12), cut(b, 10)];
    case 'debut': {
        const rows = parseRanks(a);
        return rows.length >= 2 ? ['debut', ranksString(rows), cut(b, 10)] : null;
    }
    case 'award': {
        const envelope = f.some((s) => ENVELOPE_RE.test(s));
        const rest = f.filter((s) => !ENVELOPE_RE.test(s));
        return ['award', cut(rest[0], 6), cut(rest[1], 10), envelope ? 'envelope' : ''];
    }
    case 'fansign': {
        if (!a) return null;
        return ['fansign', cut(a, 8), listOf(b).slice(0, 3).map((s) => cut(s, 14)).join(';')];
    }
    case 'paparazzi': return ['paparazzi', cut(a, 8), String(clampInt(b, 3, 8, 5))];
    case 'practice': return ['practice', cut(a, 8), String(clampInt(b, 60, 180, 100))];
    case 'backstage': return ['backstage', cut(a, 8), String(clampInt(b, 3, 5, 3))];
    case 'banner': {
        const lines = listOf(a).slice(0, 3).map((s) => cut(s, 8));
        return lines.length ? ['banner', lines.join(';'), cut(b, 12)] : null;
    }
    default: return null;
    }
}

export function idolFxOf(args) {
    const [type, ...v] = Array.isArray(args) ? args : [];
    switch (type) {
    case 'onstage': return { type, song: v[0] || '', who: v[1] || '', encore: v[2] === 'encore' };
    case 'fancam': return { type, who: v[0] || '', title: v[1] || '' };
    case 'lightsea': return { type, color: v[0] || '', name: v[1] || '' };
    case 'debut': return { type, rows: parseRanks(v[0]), title: v[1] || '' };
    case 'award': return { type, word: v[0] || '', who: v[1] || '', envelope: v[2] === 'envelope' };
    case 'fansign': return { type, name: v[0] || '', notes: listOf(v[1]) };
    case 'paparazzi': return { type, who: v[0] || '', shots: clampInt(v[1], 3, 8, 5) };
    case 'practice': return { type, who: v[0] || '', bpm: clampInt(v[1], 60, 180, 100) };
    case 'backstage': return { type, who: v[0] || '', count: clampInt(v[1], 3, 5, 3) };
    case 'banner': return { type, lines: listOf(v[0]).slice(0, 3), color: v[1] || '' };
    default: return null;
    }
}
