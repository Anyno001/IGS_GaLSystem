import { applyPhoneLook } from './my-phone.js';
import { LIVE_ICONS, buildPhoneStatus, setPhoneStatus } from './danmaku-icons.js';
import { grownCount } from './phone-sense.js';
import { formatPopularity, phoneGeometry, setPhoneSink } from './danmaku-live.js';
import { feedPlatformById, feedStableCount, isOwnPhone, FEED_REPLY_MAX, FEED_VIEW_MAX } from '../../scene/feed-platforms.js';
import { applyPeekWall, buildPeekOverlay, buildPeekPin, PEEK_BUILDERS, PEEK_DOT_STEP_MS, PEEK_LOCK_MS, peekLookOf } from './peek-phone.js';

// 手机社区舞台：phone 皮肤复用直播手机的外壳（掏出手机刷平台信息流），paper 皮肤画一张纸面 / 布告。
// 每个平台有自己的页面结构（顶栏、卡片、互动区各不相同），按 data-platform 分支构建；样式在 feed-style.js。
// 同一个平台区间跨页保留同一个根节点，只增删帖子；平台变了或 feed 为 null 时收起。
// 文字一律 textContent，图标只用静态 SVG；每页最多 3 条帖子 × 3 条回复；数字由 feedStableCount 按内容生成，
// 再随首见楼层之后经过的楼数增长（首见楼层记在调用方给的 Map 里，只存内存）。
// 手机另有：状态栏跟剧情、夜间深色、首次抬起的锁屏（约 900ms 后上滑解锁）、熟人头像与小标。
const LEAVE_MS = 420;
const LOCK_MS = 900;
const UNLOCK_MS = 460;
const LOCK_NOTE_CHARS = 20;
const COUNT_CAP = 99999;
const SEEN_CAP = 240;
const REVIEW_MAX = 9;
const AVATAR_COLORS = Object.freeze(['#f2a65a', '#6fb7a8', '#8aa4e0', '#e08aa4', '#a58ae0', '#7fb069', '#d9a441', '#6c9bbf']);
const LIST_STOP_EVENTS = Object.freeze(['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'click', 'dblclick', 'wheel', 'contextmenu']);
const PHONE_MODELS = Object.freeze(['full', 'notch', 'fold', 'tablet']);
const RICH_RE = /(#[^#\n]{1,24}#|@[^\s@:：,，]{1,16})/;
const CONFESS_TAG_RE = /^[#＃]?(捞人|表白|吐槽|树洞|求助|寻物|告白)/;

const feeds = new WeakMap();
// 本次同步里认得的角色（作者名 → 头像地址），构建节点时读取；同步是同步代码，用完即清。
let know = null;

function svg(body) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

const FEED_ICONS = Object.freeze({
    like: svg('<path d="M12 20.2s-7.4-4.5-7.4-10.1A4.2 4.2 0 0 1 12 7.4a4.2 4.2 0 0 1 7.4 2.7c0 5.6-7.4 10.1-7.4 10.1z"/>'),
    comment: svg('<path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8.6a1.5 1.5 0 0 1-1.5 1.5h-7.2L8 20.3v-3.2H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5z"/>'),
    repost: svg('<path d="M5 10V8.5A1.5 1.5 0 0 1 6.5 7H18M15 4l3 3-3 3M19 14v1.5a1.5 1.5 0 0 1-1.5 1.5H6M9 20l-3-3 3-3"/>'),
    back: svg('<path d="M14.5 5.5 8 12l6.5 6.5"/>'),
    more: svg('<circle cx="6" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.2" fill="currentColor" stroke="none"/>'),
    anon: svg('<circle cx="12" cy="9" r="3.6" fill="currentColor" stroke="none"/><path d="M5.2 20c.7-3.7 3.4-5.6 6.8-5.6s6.1 1.9 6.8 5.6z" fill="currentColor" stroke="none"/>'),
    star: svg('<path d="m12 3.8 2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.8 6.9 19.5l1-5.7-4.1-4 5.7-.8z" fill="currentColor" stroke="none"/>'),
    search: svg('<circle cx="11" cy="11" r="6"/><path d="m20 20-4.2-4.2"/>'),
    flame: svg('<path d="M12 21.4c3.5 0 5.9-2.3 5.9-5.7 0-2.6-1.5-4.5-2.9-6.1-.4 1.5-1.2 2.5-2.3 2.9.5-2.9-.6-6-3.1-8.3-.2 3.1-1.8 4.9-3.1 6.5-1.2 1.4-2.3 3-2.3 5 0 3.4 2.4 5.7 5.8 5.7z" fill="currentColor" stroke="none"/>'),
    bag: svg('<path d="M6 8.5h12l-.9 10.2a1.5 1.5 0 0 1-1.5 1.3H8.4a1.5 1.5 0 0 1-1.5-1.3z"/><path d="M9 10.5V7.8a3 3 0 0 1 6 0v2.7"/>'),
    up: svg('<path d="M12 5 5.5 14h4v5h5v-5h4z" fill="currentColor" stroke="none"/>'),
    forward: svg('<path d="M15 4.5 20 9.5l-5 5"/><path d="M20 9.5H9.5A5.5 5.5 0 0 0 4 15v4.5"/>'),
    thumb: svg('<path d="M7 10.5v10"/><path d="M15 5.9 14 10.5h5.8a2 2 0 0 1 1.9 2.5l-2.2 7a2 2 0 0 1-1.9 1.5H4.5a1.5 1.5 0 0 1-1.5-1.5v-7.5a1.5 1.5 0 0 1 1.5-1.5h2.3a2 2 0 0 0 1.8-1.1L12 3a3 3 0 0 1 3 2.9z"/>'),
    chevron: svg('<path d="M6 9.5l6 6 6-6"/>'),
});

function el(doc, tag, className, text) {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
}

function icon(doc, name, className = 'igs-feed-icon') {
    const node = el(doc, 'span', className);
    node.innerHTML = FEED_ICONS[name] || '';
    return node;
}

// #话题# 与 @某人 拆成带 class 的片段，其余文字原样；全部 textContent。
function richText(doc, parent, text) {
    for (const part of String(text).split(RICH_RE)) {
        if (!part) continue;
        if (RICH_RE.test(part)) parent.appendChild(el(doc, 'span', part[0] === '@' ? 'igs-feed-hl is-at' : 'igs-feed-hl', part));
        else parent.appendChild(doc.createTextNode ? doc.createTextNode(part) : el(doc, 'span', '', part));
    }
}

function clearChildren(node) {
    for (const child of Array.from(node.children)) child.remove();
}

function postKey(post) {
    return `${post.author}\n${post.text}\n${post.extra || ''}`;
}

// 星级：「4星」「4分」或 ★★★★；没有返回 0。
export function starsOf(extra) {
    const text = String(extra || '');
    const n = text.match(/([1-5])\s*(?:星|分)/);
    if (n) return Number(n[1]);
    const bar = text.match(/★+/);
    return bar ? Math.min(5, bar[0].length) : 0;
}

// 附加里的作品名：《某书》4星 → 某书；没有书名号就去掉星级部分。
export function workOf(extra) {
    const text = String(extra || '');
    const m = text.match(/《([^》]+)》/);
    if (m) return m[1];
    return text.replace(/[1-5]\s*(?:星|分)|★+/g, '').trim();
}

// 知乎答主「名字，身份介绍」。
export function splitAuthor(author) {
    const text = String(author || '');
    const i = text.search(/[，,]/);
    return i < 0 ? [text.trim(), ''] : [text.slice(0, i).trim() || text.trim(), text.slice(i + 1).trim()];
}

function titleOf(text) {
    const first = String(text).split(/[。！？!?\n]/)[0].trim() || String(text).trim();
    return Array.from(first).slice(0, 22).join('');
}

function seedOf(post, tag) {
    return `${post.author}${post.text}#${tag}`;
}

function minutesAgo(post) {
    return feedStableCount(seedOf(post, 'min'), 2, 58);
}

function isAnon(platformId, author) {
    return platformId === 'confess' && /匿名|墙/.test(author);
}

function put(parent, ...nodes) {
    for (const node of nodes) if (node) parent.appendChild(node);
}

// 熟人：名字能对上卡内角色（拿得到头像）。朋友圈叫好友，其余平台叫已关注。
function friendTag(doc, platformId, author) {
    if (!know || isAnon(platformId, author) || !know(author)) return null;
    return el(doc, 'span', 'igs-feed-friend', platformId === 'moments' ? '好友' : '已关注');
}

function avatarFor(doc, platformId, author) {
    const anon = isAnon(platformId, author);
    const avatar = el(doc, 'div', 'igs-feed-avatar');
    const face = !anon && know ? know(author) : '';
    if (anon) {
        avatar.setAttribute('data-anon', '1');
        avatar.appendChild(icon(doc, 'anon'));
    } else if (face) {
        avatar.setAttribute('data-friend', '1');
        const img = el(doc, 'img', 'igs-feed-avatar-img');
        img.src = face;
        img.alt = '';
        avatar.appendChild(img);
    } else {
        avatar.textContent = Array.from(author)[0] || '?';
        avatar.style.setProperty('--fp-av', AVATAR_COLORS[feedStableCount(`${author}#av`, 0, AVATAR_COLORS.length - 1)]);
    }
    return avatar;
}

function starRow(doc, n, className = 'igs-feed-stars') {
    const row = el(doc, 'span', className);
    for (let i = 0; i < 5; i += 1) row.appendChild(icon(doc, 'star', i < n ? 'igs-feed-star is-on' : 'igs-feed-star'));
    return row;
}

// 会涨的数字：先放一个空节点登记基数，updatePost 按楼层差写入文字。
function counterSpan(doc, counters, base, fmt = String, replies = false) {
    const node = el(doc, 'span', '', '');
    counters.push({ node, base, fmt, replies });
    return node;
}

function statCounter(doc, counters, iconName, base, fmt) {
    const node = el(doc, 'span', 'igs-feed-stat');
    node.append(icon(doc, iconName), counterSpan(doc, counters, base, fmt));
    return node;
}

function likeBase(post) {
    return feedStableCount(seedOf(post, 'like'), 3, 2400);
}

function commentStat(doc, counters, post, fmt) {
    const node = el(doc, 'span', 'igs-feed-stat');
    node.append(icon(doc, 'comment'), counterSpan(doc, counters, feedStableCount(seedOf(post, 'cmt'), 0, 40), fmt, true));
    return node;
}

function textBlock(doc, post, className = 'igs-feed-text') {
    const node = el(doc, 'div', className);
    richText(doc, node, post.text);
    return node;
}

function nameOf(platformId, author) {
    return platformId === 'zhihu' ? splitAuthor(author)[0] : author;
}

// 回复：缩进的浅底块；虎扑带「亮了 N」且最亮的一条标「亮评」。
function fillReplies(doc, platformId, post, box) {
    clearChildren(box);
    const list = (post.replies || []).slice(0, FEED_REPLY_MAX);
    const lights = list.map((r) => feedStableCount(`${r.author}${r.text}`, 2, 480));
    const top = platformId === 'hupu' && list.length ? lights.indexOf(Math.max(...lights)) : -1;
    list.forEach((reply, index) => {
        const row = el(doc, 'div', 'igs-feed-reply');
        if (index === top) {
            row.setAttribute('data-top', '1');
            row.appendChild(el(doc, 'span', 'igs-feed-badge', '亮评'));
        }
        put(row, friendTag(doc, platformId, reply.author));
        row.appendChild(el(doc, 'span', 'igs-feed-rname', reply.author));
        const body = el(doc, 'span', 'igs-feed-rtext');
        richText(doc, body, reply.text);
        row.appendChild(body);
        if (platformId === 'hupu') row.appendChild(el(doc, 'span', 'igs-feed-hot', `亮了 ${lights[index]}`));
        box.appendChild(row);
    });
}

// 各平台的帖子卡片。返回 { node, replies, commentCount?, floor? }。
const POST_BUILDERS = {
    news(doc, id, post) {
        const node = el(doc, 'article', 'igs-feed-post');
        const col = el(doc, 'div', 'igs-feed-body');
        col.appendChild(textBlock(doc, post));
        const parts = [post.author, post.extra].filter(Boolean);
        const by = el(doc, 'div', 'igs-feed-byline');
        const counters = [];
        const count = counterSpan(doc, counters, feedStableCount(seedOf(post, 'cmt'), 0, 40), (n) => ` · ${n}评`, true);
        by.append(el(doc, 'span', '', parts.join(' · ')), count);
        col.appendChild(by);
        const top = el(doc, 'div', 'igs-feed-news-row');
        top.append(col, el(doc, 'div', 'igs-feed-thumb'));
        const replies = el(doc, 'div', 'igs-feed-replies');
        node.append(top, replies);
        return { node, replies, counters };
    },
    zhihu(doc, id, post) {
        const node = el(doc, 'article', 'igs-feed-post');
        if (post.extra) node.appendChild(el(doc, 'div', 'igs-feed-question', post.extra));
        const [name, identity] = splitAuthor(post.author);
        const who = el(doc, 'div', 'igs-feed-who');
        const info = el(doc, 'div', 'igs-feed-info');
        info.appendChild(el(doc, 'span', 'igs-feed-name', name));
        if (identity) info.appendChild(el(doc, 'span', 'igs-feed-identity', identity));
        put(who, avatarFor(doc, id, name), info, friendTag(doc, id, name));
        const meta = el(doc, 'div', 'igs-feed-meta');
        const counters = [];
        const agree = el(doc, 'span', 'igs-feed-agree');
        agree.append(icon(doc, 'up'), counterSpan(doc, counters, likeBase(post), (n) => `赞同 ${n}`));
        meta.append(agree, commentStat(doc, counters, post, String));
        const replies = el(doc, 'div', 'igs-feed-replies');
        node.append(who, textBlock(doc, post), meta, replies);
        return { node, replies, counters };
    },
    review(doc, id, post) {
        const node = el(doc, 'article', 'igs-feed-post');
        const who = el(doc, 'div', 'igs-feed-who');
        const info = el(doc, 'div', 'igs-feed-info');
        info.appendChild(el(doc, 'span', 'igs-feed-name', post.author));
        const stars = starsOf(post.extra);
        if (stars) info.appendChild(starRow(doc, stars));
        put(who, avatarFor(doc, id, post.author), info, friendTag(doc, id, post.author));
        const meta = el(doc, 'div', 'igs-feed-meta');
        const counters = [];
        meta.append(statCounter(doc, counters, 'like', likeBase(post)), commentStat(doc, counters, post, String));
        const replies = el(doc, 'div', 'igs-feed-replies');
        node.append(who, textBlock(doc, post), meta, replies);
        return { node, replies, counters };
    },
    xhs(doc, id, post) {
        const node = el(doc, 'article', 'igs-feed-post');
        const cover = el(doc, 'div', 'igs-feed-cover-block');
        cover.appendChild(el(doc, 'span', 'igs-feed-cover-title', post.extra || titleOf(post.text)));
        const title = textBlock(doc, post, 'igs-feed-text');
        const foot = el(doc, 'div', 'igs-feed-foot');
        const small = avatarFor(doc, id, post.author);
        small.classList.add('is-small');
        const counters = [];
        put(foot, small, el(doc, 'span', 'igs-feed-name', post.author), friendTag(doc, id, post.author), statCounter(doc, counters, 'like', likeBase(post)));
        const replies = el(doc, 'div', 'igs-feed-replies');
        node.append(cover, title, foot, replies);
        return { node, replies, counters };
    },
    // 贴吧：头像在左；右列依次是「名字 + 楼主 + 楼层号」、正文、「时间 + 回复」、楼中楼（灰蓝底，末行「共 N 条回复」）。
    tieba(doc, id, post) {
        const node = el(doc, 'article', 'igs-feed-post');
        const body = el(doc, 'div', 'igs-feed-body');
        const head = el(doc, 'div', 'igs-feed-floorbar');
        const floor = el(doc, 'span', 'igs-feed-floor', '1楼');
        const owner = el(doc, 'span', 'igs-feed-owner', '楼主');
        put(head, el(doc, 'span', 'igs-feed-name', post.author), friendTag(doc, id, post.author), owner, floor);
        const foot = el(doc, 'div', 'igs-feed-tb-foot');
        const counters = [];
        const reply = el(doc, 'span', 'igs-feed-stat');
        reply.append(icon(doc, 'comment'), counterSpan(doc, counters, feedStableCount(seedOf(post, 'cmt'), 0, 40), (n) => (n === '0' ? '回复' : n), true));
        foot.append(el(doc, 'span', 'igs-feed-time', `${minutesAgo(post)}分钟前`), reply);
        const replies = el(doc, 'div', 'igs-feed-replies');
        body.append(head, textBlock(doc, post), foot, replies);
        node.append(avatarFor(doc, id, post.author), body);
        return { node, replies, counters, floor, owner, fill: fillTieba };
    },
    // 购物：商品图占位（购物袋）、两行标题、红色价格、销量与店铺。
    shop(doc, id, post) {
        const node = el(doc, 'article', 'igs-feed-post');
        const img = el(doc, 'div', 'igs-feed-shop-img');
        img.appendChild(icon(doc, 'bag', 'igs-feed-icon igs-feed-shop-bag'));
        const extra = String(post.extra || '');
        const price = (extra.match(/[¥￥]\s*[\d.,]+/) || [''])[0];
        const sales = extra.replace(price, '').trim();
        const row = el(doc, 'div', 'igs-feed-shop-row');
        if (price) row.appendChild(el(doc, 'span', 'igs-feed-price', price));
        if (sales) row.appendChild(el(doc, 'span', 'igs-feed-sales', sales));
        const replies = el(doc, 'div', 'igs-feed-replies');
        node.append(img, textBlock(doc, post, 'igs-feed-text igs-feed-shop-title'), row, el(doc, 'div', 'igs-feed-shop-name', post.author), replies);
        return { node, replies, counters: [] };
    },
    search: (doc, id, post) => PEEK_BUILDERS.search(doc, id, post, PEEK_KIT),
    memo: (doc, id, post) => PEEK_BUILDERS.memo(doc, id, post, PEEK_KIT),
    album: (doc, id, post) => PEEK_BUILDERS.album(doc, id, post, PEEK_KIT),
    chats: (doc, id, post) => PEEK_BUILDERS.chats(doc, id, post, PEEK_KIT),
    douban(doc, id, post) {
        const node = el(doc, 'article', 'igs-feed-post');
        const counters = [];
        const commentCount = counterSpan(doc, counters, feedStableCount(seedOf(post, 'cmt'), 0, 40), (n) => ` · ${n}回应`, true);
        const by = el(doc, 'div', 'igs-feed-byline');
        const small = avatarFor(doc, id, post.author);
        small.classList.add('is-small');
        put(by, small, el(doc, 'span', 'igs-feed-name', post.author), friendTag(doc, id, post.author), el(doc, 'span', 'igs-feed-time', `${minutesAgo(post)}分钟前`), commentCount);
        const body = textBlock(doc, post);
        const replies = el(doc, 'div', 'igs-feed-replies');
        node.append(el(doc, 'div', 'igs-feed-title', titleOf(post.text)), by, body, replies);
        return { node, replies, counters };
    },
};

// 微博：照手机 App 信息流——通栏白卡，帖头（头像 + 昵称 + 时间来源 + 下拉箭头）、通栏正文、配图、转评赞三格、热评两条。
const WB_DEVICES = Object.freeze(['iPhone 15 Pro', 'Xiaomi 14', 'HUAWEI Mate 60', 'OPPO Find X7']);
const WB_PLACES = Object.freeze(['北京', '上海', '广东', '浙江', '四川', '江苏']);
const WB_VERIFY_RE = /官方|老师|教授|导师|博主|主播|编辑|记者|医生|校长|学生会|学院|协会|大V|新闻|频道/;
const WB_FULL_AT = 120;
const WB_FULL_KEEP = 108;
const WB_HOT_MAX = 2;

function wbCount(label) {
    return (text) => (text === '0' ? label : text);
}

function wbSubLine(post) {
    const when = `${minutesAgo(post)}分钟前`;
    return feedStableCount(seedOf(post, 'wbs'), 0, 1) === 0
        ? `${when} 来自 ${WB_DEVICES[feedStableCount(seedOf(post, 'wbd'), 0, WB_DEVICES.length - 1)]}`
        : `${when} · 发布于 ${WB_PLACES[feedStableCount(seedOf(post, 'wbp'), 0, WB_PLACES.length - 1)]}`;
}

function wbText(doc, post) {
    const node = el(doc, 'div', 'igs-feed-text');
    const chars = Array.from(String(post.text));
    if (chars.length <= WB_FULL_AT) {
        richText(doc, node, post.text);
        return node;
    }
    richText(doc, node, `${chars.slice(0, WB_FULL_KEEP).join('')}...`);
    node.appendChild(el(doc, 'span', 'igs-feed-hl igs-feed-full', '全文'));
    return node;
}

// 配图：全平台最多一张。post.pics 可以是地址数组（AI 写多张只取第一张）；目前只有微博版面会画它，生图与 CG 库尚未接入。
export function feedPicOf(post) {
    const list = Array.isArray(post && post.pics) ? post.pics : [];
    return list.find((u) => typeof u === 'string' && u) || '';
}

function wbPics(doc, post) {
    const url = feedPicOf(post);
    if (!url) return null;
    const box = el(doc, 'div', 'igs-feed-pics');
    const img = el(doc, 'img', 'igs-feed-pic');
    img.src = url;
    img.alt = '';
    box.appendChild(img);
    return box;
}

function fillWbReplies(doc, id, post, box) {
    const rows = box.children[0];
    clearChildren(rows);
    for (const reply of (post.replies || []).slice(0, WB_HOT_MAX)) {
        const row = el(doc, 'div', 'igs-feed-reply');
        row.appendChild(el(doc, 'span', 'igs-feed-rname', reply.author));
        const body = el(doc, 'span', 'igs-feed-rtext');
        richText(doc, body, reply.text);
        row.appendChild(body);
        rows.appendChild(row);
    }
}

POST_BUILDERS.weibo = (doc, id, post) => {
    const node = el(doc, 'article', 'igs-feed-post');
    const counters = [];
    const face = el(doc, 'div', 'igs-feed-wb-face');
    face.appendChild(avatarFor(doc, id, post.author));
    if (WB_VERIFY_RE.test(post.author)) {
        const badge = el(doc, 'span', 'igs-feed-vbadge');
        badge.innerHTML = '<svg viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="7" fill="#ffc000"/><path d="M4 5.3 7 10l3-4.7" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        face.appendChild(badge);
    }
    const who = el(doc, 'div', 'igs-feed-wb-who');
    const nameRow = el(doc, 'div', 'igs-feed-wb-name');
    put(nameRow, el(doc, 'span', 'igs-feed-name', post.author), friendTag(doc, id, post.author));
    who.append(nameRow, el(doc, 'div', 'igs-feed-sub-line', wbSubLine(post)));
    const head = el(doc, 'div', 'igs-feed-wb-head');
    head.append(face, who, icon(doc, 'chevron', 'igs-feed-icon igs-feed-wb-more'));
    const meta = el(doc, 'div', 'igs-feed-meta');
    const cmt = el(doc, 'span', 'igs-feed-stat');
    cmt.append(icon(doc, 'comment'), counterSpan(doc, counters, feedStableCount(seedOf(post, 'cmt'), 0, 40), wbCount('评论'), true));
    meta.append(
        statCounter(doc, counters, 'forward', feedStableCount(seedOf(post, 'rp'), 0, 600), wbCount('转发')),
        cmt,
        statCounter(doc, counters, 'thumb', likeBase(post), wbCount('赞')),
    );
    const replies = el(doc, 'div', 'igs-feed-replies');
    const more = el(doc, 'div', 'igs-feed-wb-more-line');
    // 总数与评论格同基数同增长，数字一致。
    counters.push({ node: more, base: feedStableCount(seedOf(post, 'cmt'), 0, 40), fmt: (t) => `共${t}条评论 >`, replies: true });
    replies.append(el(doc, 'div', 'igs-feed-wb-rows'), more);
    put(node, head, wbText(doc, post), wbPics(doc, post));
    if (post.extra) {
        const extra = el(doc, 'div', 'igs-feed-extra');
        extra.appendChild(el(doc, 'span', 'igs-feed-extra-text', post.extra));
        node.appendChild(extra);
    }
    put(node, meta, replies);
    return { node, replies, counters, fill: fillWbReplies };
};

// 朋友圈：头像在左，右列是 蓝色昵称、正文（长文折叠加「全文」）、定位、「时间 + 菜单」、灰底评论框（顶上小三角，先点赞行再评论）。
const MM_FULL_AT = 110;

function fillMoments(doc, id, post, box) {
    clearChildren(box);
    const list = (post.replies || []).slice(0, FEED_REPLY_MAX);
    if (!list.length) return;
    const names = Array.from(new Set(list.map((r) => String(r.author || '').trim()).filter(Boolean)));
    if (names.length) {
        const likes = el(doc, 'div', 'igs-feed-mm-likes');
        likes.append(icon(doc, 'like'), el(doc, 'span', '', names.join('，')));
        box.appendChild(likes);
    }
    for (const reply of list) {
        const row = el(doc, 'div', 'igs-feed-reply');
        put(row, friendTag(doc, id, reply.author));
        row.appendChild(el(doc, 'span', 'igs-feed-rname', reply.author));
        const text = el(doc, 'span', 'igs-feed-rtext');
        richText(doc, text, reply.text);
        row.appendChild(text);
        box.appendChild(row);
    }
}

function fillTieba(doc, id, post, box) {
    fillReplies(doc, id, post, box);
    const n = (post.replies || []).slice(0, FEED_REPLY_MAX).length;
    if (n) box.appendChild(el(doc, 'div', 'igs-feed-tb-more', `共${n}条回复 >`));
}

POST_BUILDERS.moments = (doc, id, post) => {
    const node = el(doc, 'article', 'igs-feed-post');
    const body = el(doc, 'div', 'igs-feed-body');
    const who = el(doc, 'div', 'igs-feed-who');
    put(who, el(doc, 'span', 'igs-feed-name', post.author), friendTag(doc, id, post.author));
    body.append(who, textBlock(doc, post));
    if (Array.from(String(post.text)).length > MM_FULL_AT) body.appendChild(el(doc, 'span', 'igs-feed-mm-full', '全文'));
    if (post.extra) body.appendChild(el(doc, 'div', 'igs-feed-mm-place', post.extra));
    const foot = el(doc, 'div', 'igs-feed-mm-foot');
    const menu = el(doc, 'span', 'igs-feed-mm-menu');
    menu.appendChild(icon(doc, 'more'));
    foot.append(el(doc, 'span', 'igs-feed-time', `${minutesAgo(post)}分钟前`), menu);
    const replies = el(doc, 'div', 'igs-feed-replies');
    body.append(foot, replies);
    node.append(avatarFor(doc, id, post.author), body);
    return { node, replies, counters: [], fill: fillMoments };
};

const PEEK_KIT = { avatarFor, seedOf, minutesAgo };

// 通用卡片：头像 + 名字 + 正文 + 互动；朋友圈 / 微博 / 虎扑 / 表白墙 / 星网 / 纸面共用，差异在 data-platform 样式与少量附加节点。
function buildStandardPost(doc, id, post) {
    const node = el(doc, 'article', 'igs-feed-post');
    const body = el(doc, 'div', 'igs-feed-body');
    const who = el(doc, 'div', 'igs-feed-who');
    put(who, el(doc, 'span', 'igs-feed-name', post.author), friendTag(doc, id, post.author));
    body.appendChild(who);
    if (id === 'starnet') {
        const d = feedStableCount(seedOf(post, 'd'), 1, 28);
        const m = feedStableCount(seedOf(post, 'm'), 1, 12);
        const hh = feedStableCount(seedOf(post, 'h'), 0, 23);
        const mm = feedStableCount(seedOf(post, 'mm'), 0, 59);
        const pad = (n) => String(n).padStart(2, '0');
        body.appendChild(el(doc, 'div', 'igs-feed-stamp', `${2300 + feedStableCount(seedOf(post, 'y'), 0, 180)}.${pad(m)}.${pad(d)} ${pad(hh)}:${pad(mm)}`));
    }
    const tag = id === 'confess' ? (post.text.match(CONFESS_TAG_RE) || [])[1] : '';
    if (tag) body.appendChild(el(doc, 'span', 'igs-feed-notetag', `#${tag}#`));
    body.appendChild(textBlock(doc, post));
    // 附加：朋友圈是定位 + 时间，其余平台是标签；虎扑的板块已在顶栏。
    if (post.extra && id !== 'hupu') {
        const extra = el(doc, 'div', 'igs-feed-extra');
        extra.appendChild(el(doc, 'span', 'igs-feed-extra-text', post.extra));
        if (id === 'moments') extra.appendChild(el(doc, 'span', 'igs-feed-time', `${minutesAgo(post)}分钟前`));
        body.appendChild(extra);
    }
    const meta = el(doc, 'div', 'igs-feed-meta');
    const counters = [];
    meta.append(commentStat(doc, counters, post, String), statCounter(doc, counters, 'like', likeBase(post)));
    body.appendChild(meta);
    const replies = el(doc, 'div', 'igs-feed-replies');
    body.appendChild(replies);
    // 纸面皮肤没有头像与互动数，由样式隐藏；节点结构共用一套。
    node.append(avatarFor(doc, id, post.author), body);
    return { node, replies, counters };
}

function buildPost(doc, id, post, review) {
    const rec = (POST_BUILDERS[id] || buildStandardPost)(doc, id, post);
    rec.node.setAttribute('data-kind', id);
    if (post.fresh && !review) rec.node.setAttribute('data-fresh', '1');
    rec.n = -1;
    rec.floorKey = null;
    return rec;
}

// first = 首见楼层，floor = 当前楼层：数字 = 基数 + 随相隔楼数增长；评论数另加当前回复条数。
function updatePost(doc, id, rec, post, index, first, floor) {
    const n = (post.replies || []).length;
    const floorKey = `${first}>${floor}`;
    if (rec.n !== n || rec.floorKey !== floorKey) {
        if (rec.n !== n) {
            rec.n = n;
            if (!rec.noReplies) {
                (rec.fill || fillReplies)(doc, id, post, rec.replies);
                rec.replies.hidden = n === 0;
            }
        }
        rec.floorKey = floorKey;
        const seed = seedOf(post, 'grow');
        for (const c of rec.counters) {
            const total = grownCount(`${seed}${c.base}`, c.base, first, floor, COUNT_CAP) + (c.replies ? n : 0);
            const text = c.fmt(formatPopularity(total));
            if (c.node.textContent !== text) c.node.textContent = text;
        }
    }
    // 贴吧楼层按当前位置编号，第一楼标楼主。
    if (rec.floor && rec.floorAt !== index) {
        rec.floorAt = index;
        rec.floor.textContent = `${index + 1}楼`;
        rec.owner.hidden = index !== 0;
    }
}

// 搜索框一条（知乎、购物、搜索记录共用）：图标 + 空白胶囊。
function searchBar(doc) {
    const node = el(doc, 'div', 'igs-feed-search');
    node.append(icon(doc, 'search'), el(doc, 'span', 'igs-feed-search-pill', ''));
    return { node, update() {} };
}

// 顶栏下面的平台专属区（热搜条、栏目条、封面、作品条……）：返回 { node, update(posts, ctx) }。
const SUB_BUILDERS = {
    news(doc) {
        const node = el(doc, 'div', 'igs-feed-strip');
        let last = '';
        return {
            node,
            update(posts) {
                const cols = Array.from(new Set(posts.map((p) => p.extra).filter(Boolean))).slice(0, 3);
                const key = cols.join('|');
                if (key === last) return;
                last = key;
                clearChildren(node);
                cols.forEach((c, i) => node.appendChild(el(doc, 'span', i === 0 ? 'igs-feed-chip is-on' : 'igs-feed-chip', c)));
                node.hidden = cols.length === 0;
            },
        };
    },
    weibo(doc) {
        const node = el(doc, 'div', 'igs-feed-hotbar');
        const text = el(doc, 'span', '', '');
        node.append(icon(doc, 'flame'), el(doc, 'b', '', '热搜'), text);
        return {
            node,
            update(posts) {
                const topic = (posts.find((p) => p.extra) || {}).extra || '';
                if (text.textContent !== topic) text.textContent = topic;
                node.hidden = !topic;
            },
        };
    },
    zhihu: searchBar,
    shop: searchBar,
    search: searchBar,
    review(doc) {
        const node = el(doc, 'div', 'igs-feed-work');
        const title = el(doc, 'span', 'igs-feed-work-title', '');
        const stars = el(doc, 'span', 'igs-feed-work-stars');
        node.append(title, stars);
        let last = '';
        return {
            node,
            update(posts) {
                const src = posts.find((p) => /《/.test(p.extra || '')) || posts.find((p) => starsOf(p.extra)) || posts.find((p) => p.extra);
                const name = src ? workOf(src.extra) : '';
                const n = src ? starsOf(src.extra) : 0;
                const key = `${name}|${n}`;
                if (key === last) return;
                last = key;
                title.textContent = name;
                clearChildren(stars);
                if (n) stars.appendChild(starRow(doc, n, 'igs-feed-stars is-big'));
                node.hidden = !name && !n;
            },
        };
    },
    moments(doc) {
        const node = el(doc, 'div', 'igs-feed-cover');
        const who = el(doc, 'div', 'igs-feed-cover-who');
        const name = el(doc, 'span', 'igs-feed-name', '');
        node.appendChild(who);
        let last = '';
        let cover = null;
        return {
            node,
            update(posts, ctx) {
                const url = ctx.coverUrl || '';
                if (url !== cover) {
                    cover = url;
                    node.style.backgroundImage = url ? `url("${String(url).replace(/"/g, '%22')}")` : '';
                    node.setAttribute('data-img', url ? '1' : '0');
                }
                const author = posts[0] ? posts[0].author : '';
                if (author === last) return;
                last = author;
                clearChildren(who);
                name.textContent = author;
                who.append(name, avatarFor(doc, 'moments', author));
            },
        };
    },
};

const TITLE_FROM_EXTRA = Object.freeze(['douban', 'hupu', 'tieba']);

function cssUrl(url) {
    return `url("${String(url).replace(/"/g, '%22')}")`;
}

// 锁屏：壁纸 + 大号时间日期 + 一张通知卡（平台色点、平台名、第一条帖子作者与正文前几个字）；约 900ms 后整屏上滑解锁。
function buildLock(doc, platform, first, ctx, peek) {
    const lock = el(doc, 'div', 'igs-feed-lock');
    const wall = el(doc, 'div', 'igs-feed-lock-wall');
    const shade = peek ? applyPeekWall(doc, wall, peek.avatar) : null;
    if (!peek && ctx.wallpaperUrl) wall.style.backgroundImage = cssUrl(ctx.wallpaperUrl);
    const d = new Date((ctx.now || Date.now)());
    const clock = el(doc, 'div', 'igs-feed-lock-clock');
    if (peek) clock.appendChild(el(doc, 'div', 'igs-feed-lock-owner', `${peek.owner}的手机`));
    clock.append(
        el(doc, 'div', 'igs-feed-lock-time', ctx.status ? ctx.status.time : `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`),
        el(doc, 'div', 'igs-feed-lock-date', `${d.getMonth() + 1}月${d.getDate()}日 星期${'日一二三四五六'[d.getDay()]}`),
    );
    const note = el(doc, 'div', 'igs-feed-lock-note');
    const head = el(doc, 'div', 'igs-feed-lock-app');
    head.append(el(doc, 'i', 'igs-feed-lock-dot'), el(doc, 'span', '', platform.name));
    note.appendChild(head);
    if (first) {
        const chars = Array.from(String(first.text || '').replace(/\s+/g, ' ').trim());
        const brief = chars.slice(0, LOCK_NOTE_CHARS).join('') + (chars.length > LOCK_NOTE_CHARS ? '…' : '');
        note.appendChild(el(doc, 'div', 'igs-feed-lock-body', `${nameOf(platform.id, first.author)}：${brief}`));
    }
    lock.append(wall);
    if (shade) lock.appendChild(shade);
    lock.appendChild(clock);
    const pin = peek ? buildPeekPin(doc) : null;
    if (pin) lock.appendChild(pin.node);
    lock.appendChild(note);
    return { lock, dots: pin ? pin.dots : [] };
}

function hasClass(node, name) {
    return !!node && typeof node.className === 'string' && node.className.split(/\s+/).includes(name);
}

function findIn(node, name) {
    if (hasClass(node, name)) return node;
    for (const child of Array.from(node.children || [])) {
        const hit = findIn(child, name);
        if (hit) return hit;
    }
    return null;
}

// 聊天列表点开：整页对话（顶栏 返回 + 备注名，气泡左对方右自己，底部一条静态输入栏）。内容取自该行已生成的节点，不另存数据。
function buildChatPage(doc, list) {
    const page = el(doc, 'div', 'igs-feed-chatpage');
    page.hidden = true;
    const bar = el(doc, 'div', 'igs-feed-chatbar');
    const back = el(doc, 'button', 'igs-feed-chatback');
    back.type = 'button';
    back.setAttribute('aria-label', '返回');
    back.appendChild(icon(doc, 'back'));
    const title = el(doc, 'span', 'igs-feed-chattitle', '');
    bar.append(back, title, icon(doc, 'more'));
    const body = el(doc, 'div', 'igs-feed-chatbody');
    const input = el(doc, 'div', 'igs-feed-chatinput');
    input.appendChild(el(doc, 'span', 'igs-feed-chatfield', ''));
    page.append(bar, body, input);
    for (const name of LIST_STOP_EVENTS) page.addEventListener(name, (event) => event.stopPropagation());
    back.addEventListener('click', () => { page.hidden = true; });
    const open = (node) => {
        const name = findIn(node, 'igs-feed-name');
        const last = findIn(node, 'igs-feed-chat-last');
        const time = findIn(node, 'igs-feed-chat-time');
        const face = findIn(node, 'igs-feed-avatar');
        const box = findIn(node, 'igs-feed-bubbles');
        title.textContent = name ? name.textContent : '';
        clearChildren(body);
        if (time && time.textContent) body.appendChild(el(doc, 'div', 'igs-feed-chatstamp', time.textContent));
        const add = (side, text) => {
            const row = el(doc, 'div', 'igs-feed-msg');
            row.setAttribute('data-side', side);
            let av;
            if (side === 'peer' && face && typeof face.cloneNode === 'function') av = face.cloneNode(true);
            else if (side === 'peer') av = avatarFor(doc, 'chats', title.textContent);
            else {
                av = el(doc, 'div', 'igs-feed-avatar', '我');
                av.style.setProperty('--fp-av', '#8aa4e0');
            }
            const bubble = el(doc, 'div', 'igs-feed-bubble', text);
            bubble.setAttribute('data-side', side);
            row.append(av, bubble);
            body.appendChild(row);
        };
        if (last && last.textContent) add('peer', last.textContent);
        for (const b of Array.from(box ? box.children : [])) add(b.getAttribute('data-side') === 'self' ? 'self' : 'peer', b.textContent);
        page.hidden = false;
        body.scrollTop = 0;
    };
    list.addEventListener('click', (event) => {
        let n = event.target;
        while (n && n !== list && !hasClass(n, 'igs-feed-chat-row')) n = n.parentNode;
        if (n && n !== list && n.parentNode) open(n.parentNode);
    });
    return page;
}

function buildRoot(doc, platform, ctx, model, first, peek) {
    const now = ctx.now || Date.now;
    const paper = platform.skin === 'paper';
    const root = el(doc, 'div', paper ? 'igs-feed-stage' : 'igs-live-stage igs-feed-stage');
    root.setAttribute('data-platform', platform.id);
    root.setAttribute('data-skin', platform.skin);
    root.style.setProperty('--fp-accent', platform.accent);
    root.appendChild(el(doc, 'div', 'igs-live-dim'));
    const list = el(doc, 'div', 'igs-feed-list');
    // 舞台里的手机挂在 pointer-events:none 的弹幕层下，列表要自己开回 auto 才滑得动；事件不再冒泡，手指在手机上滑不会触到阅读器。
    if (!paper) for (const name of LIST_STOP_EVENTS) list.addEventListener(name, (event) => event.stopPropagation());
    if (paper) {
        const card = el(doc, 'div', 'igs-feed-paper');
        const head = el(doc, 'div', 'igs-feed-paper-head');
        head.appendChild(el(doc, 'span', 'igs-feed-paper-title', platform.name));
        head.appendChild(el(doc, 'span', 'igs-feed-seal', Array.from(platform.name)[0] || ''));
        card.append(head, list);
        root.appendChild(card);
        return { root, list, phone: null, update() {} };
    }
    root.setAttribute('data-layout', 'phone');
    applyPhoneLook(root, { ...(peek ? peek.look : ctx.look || {}), model });
    if (peek) root.setAttribute('data-peek', '1');
    const phone = el(doc, 'div', 'igs-live-phone');
    const screen = el(doc, 'div', 'igs-feed-screen');
    const head = el(doc, 'div', 'igs-feed-head');
    const app = el(doc, 'span', 'igs-feed-app', platform.name);
    if (platform.id === 'weibo') {
        // 微博顶栏：推荐 / 关注两个页签 + 右侧放大镜；平台名留在隐藏节点里。
        const tabs = el(doc, 'div', 'igs-feed-wb-tabs');
        tabs.append(el(doc, 'span', 'igs-feed-wb-tab is-on', '推荐'), el(doc, 'span', 'igs-feed-wb-tab', '关注'));
        head.append(app, tabs, icon(doc, 'search'));
    } else {
        head.append(icon(doc, 'back'), app);
        if (platform.id === 'tieba') head.appendChild(el(doc, 'span', 'igs-feed-follow', '关注'));
        else head.appendChild(icon(doc, 'more'));
    }
    // 与直播右上角同款的收起按钮（回看里已有自己的关闭，不再放）。
    let close = null;
    if (ctx.review !== true) {
        close = el(doc, 'button', 'igs-feed-close');
        close.type = 'button';
        close.setAttribute('aria-label', '收起');
        close.title = '收起';
        close.innerHTML = LIVE_ICONS.close;
        head.appendChild(close);
    }
    screen.appendChild(head);
    const subBuild = SUB_BUILDERS[platform.id];
    const sub = subBuild ? subBuild(doc) : null;
    if (sub) screen.appendChild(sub.node);
    screen.appendChild(list);
    const chatPage = platform.id === 'chats' ? buildChatPage(doc, list) : null;
    if (chatPage) screen.appendChild(chatPage);
    let chatKey = '';
    const statusBar = buildPhoneStatus(doc, now, ctx.status || null);
    phone.append(screen);
    // 每个平台区间第一次抬起先过一遍锁屏（减少动态效果、回看都跳过）；同区间跨页保留根节点，不再重放。
    if (ctx.review !== true && !ctx.reduced && typeof ctx.schedule === 'function') {
        const { lock, dots } = buildLock(doc, platform, first, ctx, peek);
        phone.appendChild(lock);
        root.setAttribute('data-locked', '1');
        // 偷看：先依次点亮四位密码再解锁。
        dots.forEach((dot, i) => ctx.schedule(() => dot.setAttribute('data-on', '1'), PEEK_DOT_STEP_MS * (i + 1)));
        ctx.schedule(() => {
            root.removeAttribute('data-locked');
            lock.setAttribute('data-unlock', '1');
            ctx.schedule(() => lock.remove(), UNLOCK_MS);
        }, peek ? PEEK_LOCK_MS : LOCK_MS);
    }
    if (peek) phone.append(...buildPeekOverlay(doc));
    phone.appendChild(statusBar);
    root.appendChild(phone);
    const fromExtra = TITLE_FROM_EXTRA.includes(platform.id);
    return {
        root, list, phone, close,
        update(posts, ctx) {
            if (ctx.status) {
                setPhoneStatus(statusBar, ctx.status);
                if (ctx.status.night) root.setAttribute('data-night', '1');
                else root.removeAttribute('data-night');
            }
            if (fromExtra) {
                const name = (posts.find((p) => p.extra) || {}).extra || platform.name;
                if (app.textContent !== name) app.textContent = name;
            }
            if (sub) sub.update(posts, ctx);
            // 翻页换了会话就收起已打开的对话，免得停在上一页的聊天里。
            if (chatPage) {
                const key = posts.map(postKey).join('|');
                if (key !== chatKey) {
                    chatKey = key;
                    chatPage.hidden = true;
                }
            }
        },
    };
}

function retire(state, schedule) {
    const { root } = state.els;
    if (typeof schedule !== 'function' || root.hidden) {
        root.remove();
        return;
    }
    root.setAttribute('data-leaving', '1');
    schedule(() => root.remove(), LEAVE_MS);
}

// feed 为 null（或平台认不出）时收起；同一平台跨页保留同一个根节点，只增删帖子。
export function syncFeedPhone(host, feed, ctx) {
    let state = feeds.get(host);
    const platform = feed ? feedPlatformById(feed.platform) : null;
    // 偷看别人的手机：主人是角色名（不是玩家自己）且平台是手机皮肤；换主人当作换了一台手机。
    const owner = platform && platform.skin === 'phone' && feed && !isOwnPhone(feed.owner, ctx && ctx.userName) ? String(feed.owner).trim() : '';
    const key = platform ? `${platform.id}|${owner}` : '';
    if (state && state.key !== key) {
        retire(state, ctx && !ctx.reduced ? ctx.schedule : null);
        feeds.delete(host);
        state = null;
    }
    if (!platform) return null;
    const doc = ctx.doc;
    const userLook = ctx.look || { model: ctx.model, size: ctx.size };
    const look = owner ? peekLookOf(owner, userLook) : userLook;
    const model = PHONE_MODELS.includes(look.model) ? look.model : 'full';
    if (!state) {
        const peek = owner ? { owner, look, avatar: typeof ctx.avatarOf === 'function' ? ctx.avatarOf(owner) || '' : '' } : null;
        const els = buildRoot(doc, platform, ctx, model, (feed.posts || []).filter(Boolean)[0], peek);
        state = { key, platform, owner, els, posts: new Map(), model, size: 'large', fit: null, max: -1, doc };
        host.appendChild(els.root);
        feeds.set(host, state);
        // 收起：本平台区间的手机先退回回看入口，换平台（或换主人）再弹出；同一区间重绘不会重新弹出。
        if (els.close) {
            const own = state;
            els.close.addEventListener('click', (event) => {
                event.stopPropagation();
                own.dismissed = true;
                own.els.root.hidden = true;
                if (typeof own.onDismiss === 'function') own.onDismiss();
            });
        }
    }
    state.onDismiss = typeof ctx.onDismiss === 'function' ? ctx.onDismiss : null;
    state.size = look.size === 'fit' ? 'fit' : 'large';
    state.model = model;
    if (state.els.phone) applyPhoneLook(state.els.root, { ...look, model });
    const review = ctx.review === true;
    const wanted = (feed.posts || []).filter(Boolean).slice(review ? -REVIEW_MAX : -FEED_VIEW_MAX);
    const seen = new Set();
    const floors = ctx.firstSeen instanceof Map ? ctx.firstSeen : (state.localSeen = state.localSeen || new Map());
    const cache = new Map();
    know = typeof ctx.avatarOf === 'function'
        ? (name) => {
            if (!cache.has(name)) cache.set(name, ctx.avatarOf(name) || '');
            return cache.get(name);
        }
        : null;
    try {
        wanted.forEach((post, index) => {
            const id = postKey(post);
            seen.add(id);
            let rec = state.posts.get(id);
            if (!rec) {
                rec = buildPost(doc, platform.id, post, review);
                state.posts.set(id, rec);
            }
            // 首见楼层：键 = 平台 + 作者 + 内容，只存内存；回看时只读不写。
            const seenKey = `${platform.id}\n${postKey(post)}`;
            let first = floors.get(seenKey);
            if (first === undefined) {
                first = ctx.messageId;
                if (!review) {
                    floors.set(seenKey, first);
                    if (floors.size > SEEN_CAP) floors.delete(floors.keys().next().value);
                }
            }
            updatePost(doc, platform.id, rec, post, index, first, ctx.messageId);
            // 顺序对就不动，避免重新插入时动画重播。
            const at = state.els.list.children[index] || null;
            if (at !== rec.node) state.els.list.insertBefore(rec.node, at);
        });
        for (const [id, rec] of Array.from(state.posts)) {
            if (seen.has(id)) continue;
            rec.node.remove();
            state.posts.delete(id);
        }
        state.els.list.setAttribute('data-n', String(wanted.length));
        state.els.update(wanted, ctx);
    } finally {
        know = null;
    }
    return state.dismissed ? null : state;
}

// 由调用方在每页唯一一次几何读取后传入；手机宽高沿用直播手机，纸面只限制最大高度（停在对话框上方）。
export function fitFeedPhone(host, stage) {
    const state = feeds.get(host);
    if (!state || !stage) return null;
    if (!state.els.phone) {
        const floor = Math.min(stage.dialogTop, stage.stageH) - 10;
        const max = Math.max(160, Math.round(floor - stage.stageH * 0.05));
        if (Math.abs(state.max - max) >= 4) {
            state.max = max;
            state.els.root.style.setProperty('--igs-feed-max', `${max}px`);
        }
        return { layout: 'paper', max };
    }
    const geo = phoneGeometry(stage, state.model, state.size);
    const fit = { layout: 'phone', ...geo };
    const prev = state.fit;
    if (prev && Math.abs(prev.height - geo.height) < 4 && Math.abs(prev.width - geo.width) < 4 && Math.abs(prev.under - geo.under) < 4) return prev;
    state.fit = fit;
    const { phone } = state.els;
    phone.style.setProperty('--igs-live-h', `${geo.height}px`);
    phone.style.setProperty('--igs-live-top', `${geo.top}px`);
    phone.style.setProperty('--igs-live-w', `${geo.width}px`);
    setPhoneSink(phone, geo.under);
    return fit;
}

export function stopFeedPhone(host) {
    const state = host && feeds.get(host);
    if (!state) return false;
    retire(state, null);
    feeds.delete(host);
    return true;
}
