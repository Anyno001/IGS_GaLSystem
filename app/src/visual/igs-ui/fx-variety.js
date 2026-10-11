// 恋综包的构建器：嘉宾入场卡、综艺花字、采访间、观察室、机位角标、心动短信与投票、心动值榜、心率手环、关系箭头图、
// 约会抽卡配对、离场、告白之夜、心动瞬间回放。样式见 fx-variety-style.js，音效见 fx-variety-sfx.js，解析见 fx-variety-model.js。
// 每个构建器返回 { node, life, layer, sounds }；env.reduced 时只出静态终态（动画由 .is-reduced 统一关掉），life 乘 env.hold。
// 读立绘只经 stage-snapshot（读当前 DOM，跟随服装与表情），不读像素，也不用遮罩贴图。
import { esc } from './reader-value-utils.js';
import { heartGlyph, sparkGlyph } from './fx-glyphs.js';
import { charSpans, make } from './fx-daily-kit.js';
import { buildPanel } from './fx-panel-kit.js';
import { rollNumber } from './fx-ticker.js';
import { cloneSpriteLayer, layerStyle, readStageBackground, resolveHeadAnchor, spriteElOf } from './stage-snapshot.js';
import { playSpriteSpec } from './sprite-actions.js';
import { VARIETY_OBSERVER_LINES, VARIETY_OBSERVER_NAMES } from './danmaku-pools.js';

export const VARIETY_LIFE_MS = Object.freeze({
    guest: 4200, caption: 3200, interview: 5200, observe: 5200, rec: 3400, vote: 5200, rank: 5200, pulse: 3800,
    relmap: 5200, pair: 5000, exit: 4200, finale: 5600, replay: 5000,
});

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const num = (n) => Math.round(n * 10) / 10;

function el(doc, className, html = '', tag = 'div') {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (html) node.innerHTML = html;
    return node;
}

function shell(env, kind, extra = '') {
    return make(env.doc, ['igs-dfx', 'igs-vy', `igs-vy-${kind}`, extra, env.reduced ? 'is-reduced' : ''].filter(Boolean).join(' '));
}

const lifeOf = (kind, env, extra = 0) => Math.round((VARIETY_LIFE_MS[kind] + extra) * (env.hold || 1));

function seeded(seed) {
    let s = (Number(seed) || 7) >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

function hueOf(name) {
    let h = 17;
    for (const ch of String(name)) h = (h * 31 + ch.codePointAt(0)) >>> 0;
    return h % 360;
}

function headAt(env, who) {
    try {
        const a = resolveHeadAnchor(env, who);
        return { x: clamp(Number(a.x) || 50, 6, 94), y: clamp(Number(a.y) || 26, 8, 70) };
    } catch {
        return { x: 50, y: 26 };
    }
}

// 当前舞台的缩影：背景加指名角色立绘（读 DOM，跟随服装表情），外层 transform-origin 对准头部，由样式放大成特写。
function stageMiniature(env, who, className) {
    const zoom = el(env.doc, className);
    const snap = readStageBackground(env.root);
    if (snap.bg && snap.bg.visible) {
        const bg = el(env.doc, 'igs-vy-mini-bg');
        bg.setAttribute('style', `${layerStyle(snap.bg)};position:absolute;inset:0;background-repeat:no-repeat`);
        zoom.appendChild(bg);
    }
    const sprite = cloneSpriteLayer(env.root, who, { speaker: env.speaker });
    if (sprite) zoom.appendChild(sprite);
    const head = headAt(env, who);
    zoom.setAttribute('style', `transform-origin:${num(head.x)}% ${num(head.y)}%`);
    return { zoom, head, hasSprite: Boolean(sprite) };
}

const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.3 4.6 13a4.7 4.7 0 0 1 6.6-6.7l.8.8.8-.8A4.7 4.7 0 0 1 19.4 13Z"/></svg>';

function ageText(age) {
    return /^\d+$/.test(age) ? `${age}岁` : age;
}

function dipSprite(env, who, life) {
    const target = spriteElOf(env, who);
    if (!target || typeof target.animate !== 'function' || env.reduced) return;
    try {
        target.animate([{ opacity: 1 }, { opacity: 0.2, offset: 0.3 }, { opacity: 0.2, offset: 0.82 }, { opacity: 1 }], { duration: life, easing: 'ease-in-out' });
    } catch { /* 元素不支持 WAAPI */ }
}

function timecode(env) {
    const t = Number(env.messageId) || 0;
    const two = (v) => String(v % 60).padStart(2, '0');
    return `00:${two(t * 7 + 12)}:${two(t * 13 + 34)}:${two(t * 5 + 8)}`;
}

export const VARIETY_BUILDERS = {
    // 嘉宾入场卡：粉底斜条的综艺字幕，姓名大字砸入，年龄职业一行，标签像贴纸一张张拍上去。
    guest(item, env) {
        const tags = item.tags.map((tag, i) => `<b class="igs-vy-tag" style="animation-delay:${900 + i * 220}ms">${esc(tag)}</b>`).join('');
        const sub = [ageText(item.age), item.job].filter(Boolean).map(esc).join('<i></i>');
        const card = el(env.doc, 'igs-vy-guest-card',
            `<span class="igs-vy-guest-new">NEW GUEST</span>`
            + `<div class="igs-vy-guest-name">${charSpans(item.name, 60, 260)}</div>${sub ? `<div class="igs-vy-guest-sub">${sub}</div>` : ''}${tags ? `<div class="igs-vy-guest-tags">${tags}</div>` : ''}`);
        const node = shell(env, 'guest');
        node.appendChild(card);
        return { layer: 'front', life: lifeOf('guest', env), sounds: ['vy-guest'], node };
    },

    // 综艺花字：粉字弹入、贴纸斜贴、名场面盖章、黑底字幕逐字浮现。
    caption(item, env) {
        const style = item.style;
        const text = item.text;
        let inner;
        let sound = 'vy-pop';
        let extra = 0;
        if (style === 'sticker') {
            inner = `<div class="igs-vy-cap is-sticker"><span>${esc(text)}</span></div>`;
        } else if (style === 'stamp') {
            const small = Array.from(text).length > 6 ? ' is-long' : '';
            inner = `<div class="igs-vy-cap is-stamp"><div class="igs-vy-stamp${small}"><small>名场面</small><b>${esc(text)}</b></div></div>`;
            sound = 'vy-stamp';
        } else if (style === 'dark') {
            inner = `<i class="igs-vy-dark-scrim"></i><div class="igs-vy-cap is-dark"><p>${charSpans(text, 140, 500)}</p></div>`;
            sound = 'vy-sting';
            extra = Array.from(text).length * 120;
        } else {
            inner = `<div class="igs-vy-cap is-pink"><p>${charSpans(text, 70, 80)}</p><i class="igs-vy-spark s1">${sparkGlyph()}</i><i class="igs-vy-spark s2">${sparkGlyph()}</i></div>`;
        }
        const node = shell(env, 'caption', `is-${style}`);
        node.innerHTML = inner;
        return { layer: 'front', life: lifeOf('caption', env, extra), sounds: [sound], node };
    },

    // 采访间：纯色墙面、上下黑边，嘉宾居中看向镜头，下方一条“内心OS”字幕逐字打出。
    interview(item, env) {
        const node = shell(env, 'interview');
        node.innerHTML = '<i class="igs-vy-iv-wall"></i><i class="igs-vy-iv-bar is-top"></i><i class="igs-vy-iv-bar is-bottom"></i>'
            + `<div class="igs-vy-iv-tag"><i class="igs-vy-rec-dot"></i>INTERVIEW${item.who ? `<span>${esc(item.who)}</span>` : ''}</div>`;
        const person = el(env.doc, 'igs-vy-iv-person');
        const clone = cloneSpriteLayer(env.root, item.who, { speaker: env.speaker });
        if (clone) {
            if (clone.style) {
                clone.style.backgroundPosition = '50% 100%';
                clone.style.transformOrigin = '50% 100%';
            }
            person.appendChild(clone);
        }
        node.appendChild(person);
        node.appendChild(el(env.doc, 'igs-vy-iv-os', `<small>内心OS</small><p>${charSpans(item.text, 55, 700)}</p>`));
        return { layer: 'front', life: lifeOf('interview', env, Array.from(item.text).length * 40), sounds: ['vy-interview'], node };
    },

    // 观察室：右上角弹出画中画（对准被看的人，放大成特写），角标 LIVE，下方观察员的评论条一条条冒出来。
    observe(item, env) {
        const rnd = seeded((Number(env.messageId) || 3) * 7 + Array.from(item.who || '').length);
        const lines = item.comments.length ? item.comments : [0, 1, 2].map(() => VARIETY_OBSERVER_LINES[Math.floor(rnd() * VARIETY_OBSERVER_LINES.length)]);
        const node = shell(env, 'observe');
        const pip = el(env.doc, 'igs-vy-ob-pip');
        pip.appendChild(el(env.doc, 'igs-vy-ob-head', '<i class="igs-vy-rec-dot"></i>观察室<span>LIVE</span>'));
        const screen = el(env.doc, 'igs-vy-ob-screen');
        screen.appendChild(stageMiniature(env, item.who, 'igs-vy-ob-zoom').zoom);
        screen.appendChild(el(env.doc, 'igs-vy-ob-grid'));
        pip.appendChild(screen);
        const col = el(env.doc, 'igs-vy-ob-col');
        col.appendChild(pip);
        const feed = el(env.doc, 'igs-vy-ob-feed', lines.map((line, i) => {
            const name = VARIETY_OBSERVER_NAMES[(i + Math.floor(rnd() * VARIETY_OBSERVER_NAMES.length)) % VARIETY_OBSERVER_NAMES.length];
            return `<div class="igs-vy-ob-line" style="animation-delay:${900 + i * 1000}ms"><b>${esc(name)}</b><span>${esc(line)}</span></div>`;
        }).join(''));
        col.appendChild(feed);
        node.appendChild(col);
        return { layer: 'front', life: lifeOf('observe', env), sounds: ['vy-observe'], node };
    },

    // 机位角标：取景框四角，左上角 REC 红点与机位名、时间码，开场两道黑边一合一开像切了一次镜。
    rec(item, env) {
        const node = shell(env, 'rec');
        node.innerHTML = '<i class="igs-vy-rec-cut is-top"></i><i class="igs-vy-rec-cut is-bottom"></i><i class="igs-vy-rec-flash"></i>'
            + '<i class="igs-vy-vf is-tl"></i><i class="igs-vy-vf is-tr"></i><i class="igs-vy-vf is-bl"></i><i class="igs-vy-vf is-br"></i>'
            + `<div class="igs-vy-rec-badge"><i class="igs-vy-rec-dot"></i><b>REC</b><span>${esc(item.cam || '机位2')}</span></div>`
            + `<div class="igs-vy-rec-time">${timecode(env)}</div><div class="igs-vy-rec-batt"><i></i><i></i><i></i></div>`;
        return { layer: 'front', life: lifeOf('rec', env), sounds: ['vy-rec'], node };
    },

    // 匿名投票：信封翻盖，票数卡升起，名字后一排心形与滚动的票数，最高票亮起；心动短信则是信封里抽出一条短信。
    vote(item, env) {
        const node = shell(env, 'vote');
                if (item.mode === 'sms') {
            node.appendChild(el(env.doc, 'igs-vy-sms', `<small>${esc(item.title || '心动短信')}</small><p>${esc(item.text)}</p>`));
            return { layer: 'front', life: lifeOf('vote', env), sounds: ['vy-vote'], node };
        }
        const top = item.rows.reduce((m, row) => Math.max(m, row.value), 0);
        const board = buildPanel(env.doc, { title: item.title || '匿名投票', rows: [], tone: 'variety', skin: env.panelSkin, className: 'igs-vy-board' });
        item.rows.forEach((row, i) => {
            const line = el(env.doc, `igs-vy-vt-row${row.value === top && top > 0 ? ' is-win' : ''}`);
            line.style.setProperty('--igs-vy-d', `${1500 + i * 360}ms`);
            line.appendChild(el(env.doc, 'igs-vy-vt-name', esc(row.name), 'span'));
            line.appendChild(el(env.doc, 'igs-vy-vt-hearts', Array.from({ length: clamp(row.value, 0, 9) }, () => `<i>${HEART}</i>`).join(''), 'span'));
            const count = el(env.doc, 'igs-vy-vt-count', '', 'b');
            rollNumber(count, 0, row.value, 800, { reduced: env.reduced });
            line.appendChild(count);
            board.appendChild(line);
        });
        node.appendChild(board);
        return { layer: 'front', life: lifeOf('vote', env), sounds: ['vy-vote'], node };
    },

    // 心动值排行榜：榜单先按旧名次排好，随后名次互换、条形与数字一起滚到终值（位移走 transform，不触发布局）。
    rank(item, env) {
        const rows = item.rows.slice().sort((a, b) => b.value - a.value);
        const count = rows.length;
        const peak = Math.max(1, rows[0].value);
        const initial = rows.map((row, r) => peak * (0.35 + 0.55 * (count > 1 ? r / (count - 1) : 0)));
        const order = initial.map((v, i) => ({ i, v })).sort((a, b) => b.v - a.v).map((entry) => entry.i);
        const fromSlot = (i) => order.indexOf(i);
        const board = buildPanel(env.doc, { title: item.title || '心动值排行榜', rows: [], tone: 'variety', skin: env.panelSkin, className: 'igs-vy-board' });
        const ROW_H = 36;
        const list = el(env.doc, 'igs-vy-rk-list');
        list.setAttribute('style', `height:${count * ROW_H}px`);
        rows.forEach((row, r) => {
            const line = el(env.doc, `igs-vy-rk-row is-r${r + 1}`);
            const k0 = clamp(initial[r] / Math.max(1, row.value), 0.04, 3);
            line.setAttribute('style', `--igs-vy-from:${fromSlot(r) * ROW_H}px;--igs-vy-to:${r * ROW_H}px;--igs-vy-k0:${num(k0)};--igs-vy-pct:${clamp(Math.round(row.value / peak * 100), 4, 100)}%`);
            line.appendChild(el(env.doc, 'igs-vy-rk-no', String(r + 1), 'b'));
            line.appendChild(el(env.doc, 'igs-vy-rk-name', esc(row.name), 'span'));
            line.appendChild(el(env.doc, 'igs-vy-rk-track', '<i></i>', 'span'));
            const value = el(env.doc, 'igs-vy-rk-val', '', 'b');
            rollNumber(value, initial[r], row.value, 1900, { reduced: env.reduced });
            line.appendChild(value);
            list.appendChild(line);
        });
        board.appendChild(list);
        const node = shell(env, 'rank');
        node.appendChild(board);
        return { layer: 'front', life: lifeOf('rank', env), sounds: ['vy-rank'], node };
    },

    // 心率手环：贴在人物头侧的一条智能手环，心形随心率跳，数字从静息值滚到当前心率，ECG 线缓缓走过。
    pulse(item, env) {
        const bpm = item.bpm;
        const head = headAt(env, item.who);
        const left = clamp(head.x + 10, 8, 74);
        const top = clamp(head.y - 4, 8, 52);
        const tone = bpm >= 130 ? 'hot' : bpm >= 100 ? 'warm' : 'calm';
        const node = shell(env, 'pulse', `is-${tone}`);
        const band = el(env.doc, 'igs-vy-pulse-band');
        band.setAttribute('style', `left:${num(left)}%;top:${num(top)}%;--igs-vy-beat:${(60 / bpm).toFixed(2)}s`);
        band.appendChild(el(env.doc, 'igs-vy-pulse-head', `<span class="igs-vy-pulse-heart">${HEART}</span>心率`));
        const numBox = el(env.doc, 'igs-vy-pulse-num');
        const value = el(env.doc, 'igs-vy-pulse-v', '', 'b');
        rollNumber(value, 72, bpm, 1500, { reduced: env.reduced });
        numBox.appendChild(value);
        numBox.appendChild(el(env.doc, '', 'BPM', 'small'));
        band.appendChild(numBox);
        band.appendChild(el(env.doc, 'igs-vy-pulse-ecg', '<svg viewBox="0 0 120 30" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M0 16H28L34 16 38 4 44 27 50 12 54 16H82L88 16 92 6 98 25 103 14 106 16H120"/></svg>'));
        node.appendChild(band);
        return { layer: 'front', life: lifeOf('pulse', env), sounds: ['vy-pulse'], node };
    },

    // 关系箭头图：Q 版头像围成一圈，箭头一条条描出来；互有好感的是金色双向箭头，中间一颗心，可带关系标注。
    relmap(item, env) {
        const names = [];
        for (const e of item.edges) for (const name of [e.from, e.to]) if (!names.includes(name) && names.length < 6) names.push(name);
        const edges = item.edges.filter((e) => names.includes(e.from) && names.includes(e.to));
        const W = 200;
        const H = 122;
        const pos = new Map(names.map((name, i) => {
            const a = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(1, names.length);
            return [name, { x: W / 2 + Math.cos(a) * 70, y: H / 2 + Math.sin(a) * 40 }];
        }));
        const R = 11;
        const uid = `igs-vy-ah-${Number(env.messageId) || 0}`;
        let paths = '';
        let labels = '';
        edges.forEach((e, i) => {
            const a = pos.get(e.from);
            const b = pos.get(e.to);
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len;
            const uy = dy / len;
            const gap = R + 3;
            const p1 = { x: a.x + ux * gap, y: a.y + uy * gap };
            const p2 = { x: b.x - ux * gap, y: b.y - uy * gap };
            const bend = e.mutual ? 0 : 9;
            const cx = (p1.x + p2.x) / 2 - uy * bend;
            const cy = (p1.y + p2.y) / 2 + ux * bend;
            const cls = e.mutual ? 'is-mutual' : 'is-one';
            const marker = e.mutual ? ` marker-start="url(#${uid}m)" marker-end="url(#${uid}m)"` : ` marker-end="url(#${uid})"`;
            paths += `<path class="igs-vy-edge ${cls}" pathLength="1" style="animation-delay:${900 + i * 420}ms" d="M${num(p1.x)} ${num(p1.y)}Q${num(cx)} ${num(cy)} ${num(p2.x)} ${num(p2.y)}"${marker}/>`;
            const mx = (p1.x + 2 * cx + p2.x) / 4;
            const my = (p1.y + 2 * cy + p2.y) / 4;
            if (e.label) labels += `<g class="igs-vy-edge-tag" style="animation-delay:${1200 + i * 420}ms"><rect x="${num(mx - 2.6 * Array.from(e.label).length - 3)}" y="${num(my - 5)}" width="${num(5.2 * Array.from(e.label).length + 6)}" height="10" rx="5"/><text x="${num(mx)}" y="${num(my + 2.6)}" text-anchor="middle">${esc(e.label)}</text></g>`;
            else if (e.mutual) labels += `<g transform="translate(${num(mx - 4.5)} ${num(my - 4.5)}) scale(.375)"><path class="igs-vy-edge-heart" style="animation-delay:${1200 + i * 420}ms" d="M12 20C5.5 15.4 3.2 11.8 3.2 8.6A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8.8 1.6C20.8 11.8 18.5 15.4 12 20Z"/></g>`;
        });
        const faces = names.map((name, i) => {
            const p = pos.get(name);
            const hue = hueOf(name);
            return `<g class="igs-vy-face" style="animation-delay:${i * 130}ms" transform="translate(${num(p.x)} ${num(p.y)})">`
                + `<circle r="${R}" fill="hsl(${hue} 44% 22% / .68)" stroke="hsl(${hue} 62% 78% / .9)" stroke-width=".7"/>`
                + `<text y="${R + 8}" text-anchor="middle" class="igs-vy-face-name">${esc(name)}</text></g>`;
        }).join('');
        const defs = `<defs><marker id="${uid}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#ff2f7d"/></marker>`
            + `<marker id="${uid}m" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#e8a400"/></marker></defs>`;
        const board = buildPanel(env.doc, { title: '关系图', rows: [], tone: 'variety', skin: env.panelSkin, className: 'igs-vy-board is-map' });
        board.appendChild(el(env.doc, 'igs-vy-map', `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${defs}${paths}${faces}${labels}</svg>`));
        const node = shell(env, 'relmap');
        node.appendChild(board);
        return { layer: 'front', life: lifeOf('relmap', env), sounds: ['vy-relmap'], node };
    },

    // 约会抽卡配对：几张背面朝上的牌依次翻开，正面是两个名字夹一颗心。
    pair(item, env) {
        const board = buildPanel(env.doc, { title: item.title || '约会抽卡', rows: [], tone: 'variety', skin: env.panelSkin, className: 'igs-vy-board' });
        const deck = el(env.doc, 'igs-vy-deck', item.pairs.map((pair, i) => `<div class="igs-vy-card" style="animation-delay:${700 + i * 400}ms">`
            + `<div class="igs-vy-card-face is-front"><b>${esc(pair[0])}</b><i>${HEART}</i><b>${esc(pair[1])}</b></div><div class="igs-vy-card-face is-back"><span>?</span></div></div>`).join(''));
        board.appendChild(deck);
        const node = shell(env, 'pair');
        node.appendChild(board);
        return { layer: 'front', life: lifeOf('pair', env), sounds: ['vy-pair'], node };
    },

    // 离场：画面略暗，一只拉杆箱从中央滚出画外，下方字幕写明谁离开了小屋；人物立绘同时淡下去，字幕收后恢复。
    exit(item, env) {
        const who = item.who || env.speaker || '嘉宾';
        const life = lifeOf('exit', env);
        dipSprite(env, item.who, life);
        const node = shell(env, 'exit');
        node.innerHTML = '<i class="igs-vy-ex-scrim"></i>'
            + ''
            + `<div class="igs-vy-ex-card"><small>嘉宾离场</small><b>${esc(who)} 离开了小屋</b>${item.reason ? `<span>${esc(item.reason)}</span>` : ''}</div>`;
        return { layer: 'front', life, sounds: ['vy-exit'], node };
    },

    // 告白之夜：夜幕与两束追光，灯牌上的字一盏盏点亮，边缘走马灯；立绘朝画面中央迈出一步再退回。
    finale(item, env) {
        const text = item.choice || '告白之夜';
        const life = lifeOf('finale', env);
        if (!env.reduced) {
            const target = spriteElOf(env, item.who);
            if (target) {
                const x = target.style ? parseFloat(String(target.style.backgroundPosition || '').split(/\s+/)[0]) : NaN;
                const dir = (Number.isFinite(x) ? x : 50) < 50 ? 1 : -1;
                playSpriteSpec(target, { duration: 2200, easing: 'ease-in-out', frames: ['translate(0,0)', `translate(${dir * 6}%,0)`, `translate(${dir * 6}%,0)`, 'translate(0,0)'] });
            }
        }
        const bulbs = Array.from(text).map((ch, i) => `<span class="igs-vy-fn-bulb" style="animation-delay:${900 + i * 280}ms">${esc(ch)}</span>`).join('');
        const dots = Array.from({ length: 14 }, (_, i) => `<i class="${i % 2 ? 'is-b' : 'is-a'}"></i>`).join('');
        const node = shell(env, 'finale');
        node.innerHTML = '<i class="igs-vy-fn-scrim"></i><i class="igs-vy-fn-beam is-l"></i><i class="igs-vy-fn-beam is-r"></i>'
            + `<div class="igs-vy-fn-sign"><div class="igs-vy-fn-dots is-top">${dots}</div><div class="igs-vy-fn-text">${bulbs}</div><div class="igs-vy-fn-dots is-bottom">${dots}</div></div>`
            + `${item.who ? `<div class="igs-vy-fn-who">${esc(item.who)} 的选择</div>` : ''}`;
        return { layer: 'front', life, sounds: ['vy-finale'], node };
    },

    // 心动瞬间回放：取景框里把同一帧连放三次，一次比一次推得近，每次之间一闪；角标 REPLAY 与次数。
    replay(item, env) {
        const node = shell(env, 'replay');
        const frame = el(env.doc, 'igs-vy-rp-frame');
        const mini = stageMiniature(env, item.who, 'igs-vy-rp-zoom');
        frame.appendChild(mini.zoom);
        frame.appendChild(el(env.doc, 'igs-vy-rp-flash'));
        frame.appendChild(el(env.doc, 'igs-vy-rp-scan'));
        node.appendChild(el(env.doc, 'igs-vy-rp-dim'));
        node.appendChild(frame);
        node.appendChild(el(env.doc, 'igs-vy-rp-badge',
            '<b>▶▶ REPLAY</b><span class="igs-vy-rp-n is-1">×1</span><span class="igs-vy-rp-n is-2">×2</span><span class="igs-vy-rp-n is-3">×3</span>'));
        node.appendChild(el(env.doc, 'igs-vy-rp-title', esc(item.title || '心动瞬间')));
        return { layer: 'front', life: lifeOf('replay', env), sounds: ['vy-replay'], node };
    },
};
