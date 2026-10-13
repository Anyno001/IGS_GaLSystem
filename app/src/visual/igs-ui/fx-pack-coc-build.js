// COC与推理包的构建器：每个 kind 返回 { layer, life, sounds, node }。reduced 时给静态节点，life 乘 env.hold。
// 读立绘一律经 stage-snapshot（跟随服装与表情），不画像素、不用遮罩图片。
import { esc } from './reader-value-utils.js';
import { chars, charSpans, make } from './fx-daily-kit.js';
import { rollNumber } from './fx-ticker.js';
import { linkPath } from './fx-links.js';
import { cloneSpriteLayer, playWarp, readStageBackground, resolveHeadAnchor, resolveRegionCrop, spriteElOf, spritePosX } from './stage-snapshot.js';

export const COC_LIFE_MS = Object.freeze({
    san: 3400, symptom: 3800, clue: 3800, casebook: 4600, kpBase: 1300, kpPerChar: 60, kpHold: 2400, wipe: 4800, tear: 4600, dungeon: 4800,
    portal: 3400, rating: 5600, alive: 3800, rules: 6200, board: 6400, magnify: 4000, accuse: 3400, stats: 6200,
});

const SKINS = Object.freeze(['horror', 'magic', 'fantasy', 'scifi', 'apocalypse', 'taisho']);
const LEVEL_LABEL = Object.freeze({ light: '轻', medium: '中', heavy: '重' });
const BOARD_SPOTS = Object.freeze([[19, 28], [50, 22], [81, 30], [24, 68], [55, 72], [84, 66]]);

const life = (ms, env) => Math.round(ms * Math.max(1, env.hold || 1));

function skinOf(env) {
    if (env.ancient) return 'ancient';
    return SKINS.includes(env.worldview) ? env.worldview : 'modern';
}

// 卡片放在人物远离的一侧：立绘偏右（>50）卡片靠左，否则靠右；人物始终是主角。
function farSide(env) {
    return spritePosX(readStageBackground(env.root).sprite) > 50 ? 'is-far-l' : 'is-far-r';
}

function shell(env, kind, html = '', extra = '') {
    return make(env.doc, ['igs-dfx', 'igs-coc', `igs-coc-${kind}`, `is-${skinOf(env)}`, extra].filter(Boolean).join(' '), html);
}

function after(ms, fn, node) {
    const timer = setTimeout(() => {
        if (node && node.isConnected === false) return;
        fn();
    }, ms);
    if (timer && typeof timer.unref === 'function') timer.unref();
}

const sign = (n) => (n < 0 ? '−' : '+') + Math.abs(n);

function urlOfBackground(image) {
    const m = String(image || '').match(/url\((['"]?)(.*?)\1\)/);
    return m ? m[2] : '';
}

const VITAL_BARS = new Set(['HP', 'MP', 'SAN', 'LUCK']);
const VITAL_FALLBACK_MAX = Object.freeze({ SAN: 99, LUCK: 99 });
const fixed = (n) => (Math.round(n * 10) / 10).toString();

function statsMax(rule, axes) {
    const top = Math.max(...axes.map((r) => Math.max(r.value, r.prev == null ? 0 : r.prev)));
    const base = rule === 'coc' ? 100 : 20;
    return top > base ? Math.ceil(top / 10) * 10 : base;
}

function radarHtml(item, max, reduced) {
    const n = item.axes.length;
    const R = 50;
    const at = (i, r) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        return [100 + r * Math.cos(a), 100 + r * Math.sin(a), Math.cos(a), Math.sin(a)];
    };
    const ring = (k) => item.axes.map((_, i) => at(i, (R * k) / 4)).map((p) => `${fixed(p[0])},${fixed(p[1])}`).join(' ');
    const ratio = (v) => Math.max(0.04, Math.min(1, v / max));
    const pts = (pick) => item.axes.map((r, i) => at(i, R * ratio(pick(r)))).map((p) => `${fixed(p[0])},${fixed(p[1])}`).join(' ');
    const grid = [1, 2, 3, 4].map((k) => `<polygon class="igs-coc-st-ring" points="${ring(k)}"/>`).join('');
    const compare = item.axes.some((r) => r.prev != null);
    const spokes = item.axes.map((_, i) => {
        const p = at(i, R);
        return `<line class="igs-coc-st-axis" x1="100" y1="100" x2="${fixed(p[0])}" y2="${fixed(p[1])}"/>`;
    }).join('');
    const grow = item.axes.map((r, i) => {
        const p = at(i, R * ratio(r.value));
        return `<line class="igs-coc-st-spoke" pathLength="1" x1="100" y1="100" x2="${fixed(p[0])}" y2="${fixed(p[1])}" style="--i:${i}"/>`;
    }).join('');
    const dots = item.axes.map((r, i) => {
        const p = at(i, R * ratio(r.value));
        const tone = r.prev == null || r.prev === r.value ? '' : r.value > r.prev ? ' is-up' : ' is-down';
        return `<circle class="igs-coc-st-dot${tone}" cx="${fixed(p[0])}" cy="${fixed(p[1])}" r="2.4" style="--i:${i}"/>`;
    }).join('');
    const old = compare ? `<polygon class="igs-coc-st-old" points="${pts((r) => (r.prev == null ? r.value : r.prev))}"/>` : '';
    const labels = item.axes.map((r, i) => {
        const [x, y, cx, cy] = at(i, R + 17);
        const anchor = cx > 0.3 ? 'start' : cx < -0.3 ? 'end' : 'middle';
        const mod = item.rule === 'dnd' ? (r.mod != null ? r.mod : Math.floor((r.value - 10) / 2)) : null;
        const delta = r.prev == null || r.prev === r.value ? null : r.value - r.prev;
        const chars = Array.from(String(r.key));
        const keyText = chars.length > 4 ? `${chars.slice(0, 4).join('')}…` : String(r.key);
        const vals = [`<tspan class="igs-coc-st-v" data-to="${r.value}" data-from="${r.prev == null ? r.value : r.prev}">${r.value}</tspan>`];
        if (mod != null) vals.push(`<tspan class="igs-coc-st-m" dx="3">${sign(mod)}</tspan>`);
        if (delta != null) vals.push(`<tspan class="igs-coc-st-d ${delta > 0 ? 'is-up' : 'is-down'}" dx="3">${sign(delta)}</tspan>`);
        const lines = [`<tspan class="igs-coc-st-k">${esc(keyText)}</tspan>`, vals.join('')];
        const top = cy < -0.5;
        const step = 13;
        const first = top ? y - (lines.length - 1) * step : cy > 0.5 ? y + 3 : y - ((lines.length - 1) * step) / 2;
        const spans = lines.map((l, k) => `<text x="${fixed(x)}" y="${fixed(first + k * step)}" text-anchor="${anchor}" style="--i:${i}">${l}</text>`).join('');
        return `<g class="igs-coc-st-label" style="--i:${i}"><title>${esc(r.key)}</title>${spans}</g>`;
    }).join('');
    const cls = reduced ? ' is-reduced' : '';
    const trace = `style="--n:${n}"`;
    return `<svg class="igs-coc-st-svg${cls}" viewBox="0 0 200 200" aria-hidden="true">${grid}${spokes}${old}<polygon class="igs-coc-st-fill" points="${pts((r) => r.value)}" ${trace}/>${grow}<polygon class="igs-coc-st-line" pathLength="1" points="${pts((r) => r.value)}" ${trace}/>${dots}${labels}</svg>`;
}

function vitalsHtml(item) {
    const bars = [];
    const chips = [];
    item.vitals.forEach((v, i) => {
        if (VITAL_BARS.has(v.key) && (v.max || VITAL_FALLBACK_MAX[v.key])) {
            const max = v.max || VITAL_FALLBACK_MAX[v.key];
            const r = Math.max(0, Math.min(1, v.cur / max));
            bars.push(`<div class="igs-coc-st-vbar" style="--i:${i}"><span>${esc(v.key)}</span><div class="igs-coc-st-vtrack"><i style="width:${Math.round(r * 100)}%"></i></div><b>${v.cur}${v.max ? `/${v.max}` : ''}</b></div>`);
        } else {
            chips.push(`<span class="igs-coc-st-chip" style="--i:${i}"><em>${esc(v.key)}</em>${v.cur}${v.max ? `/${v.max}` : ''}</span>`);
        }
    });
    return `${bars.length ? `<div class="igs-coc-st-bars">${bars.join('')}</div>` : ''}${chips.length ? `<div class="igs-coc-st-chips">${chips.join('')}</div>` : ''}`;
}

function portraitOf(who, env, region = 'face') {
    const el = spriteElOf(env, who);
    const url = urlOfBackground(el && el.style && el.style.backgroundImage);
    const crop = url ? resolveRegionCrop({ url }, region, 1, env.root.ownerDocument) : null;
    return crop ? cloneSpriteLayer(env.root, who, { speaker: env.speaker, crop }) : null;
}

function mount(node, selector, clone) {
    const box = clone && typeof node.querySelector === 'function' ? node.querySelector(selector) : null;
    if (!box) return false;
    box.textContent = '';
    box.appendChild(clone);
    return true;
}

export const COC_BUILDERS = {
    san(item, env) {
        const delta = item.delta;
        const san = /^(san|理智)$/i.test(item.label);
        const max = item.max > 0 ? item.max : (san ? 99 : Math.max(item.value, item.value - (delta || 0), 10));
        const from = delta == null ? item.value : Math.min(max, Math.max(0, item.value - delta));
        const drop = delta != null && delta < 0;
        const unit = (n) => Math.round((1 - Math.max(0, Math.min(1, n / max))) * 1000) / 1000;
        const top = Math.min(unit(from), unit(item.value));
        const span = Math.abs(unit(from) - unit(item.value));
        const trail = delta ? `<i class="igs-coc-san-trail" style="top:${(top * 100).toFixed(1)}%;height:${(span * 100).toFixed(1)}%"></i>` : '';
        const readout = `<div class="igs-coc-san-lab">${esc(item.label)}</div><div class="igs-coc-san-val"><b class="igs-coc-san-num">${env.reduced ? item.value : from}</b><i>/${max}</i></div>${delta ? `<div class="igs-coc-san-delta ${drop ? 'is-loss' : 'is-gain'}">${esc(sign(delta))}</div>` : ''}`;
        const scale = `<div class="igs-coc-san-scale"><span class="igs-coc-san-max">${max}</span><span class="igs-coc-san-min">0</span>${trail}<i class="igs-coc-san-pt" style="--from:${unit(from)};--to:${unit(item.value)}"></i></div>`;
        const node = shell(env, 'san', `<div class="igs-coc-san-card">${readout}${scale}</div>`, `${drop ? 'is-drop ' : ''}${farSide(env)}`);
        if (!env.reduced) {
            const num = typeof node.querySelector === 'function' ? node.querySelector('.igs-coc-san-num') : null;
            if (num) after(500, () => rollNumber(num, from, item.value, 800), num);
            if (drop) after(380, () => playWarp(spriteElOf(env, ''), delta <= -10 ? 'shift' : 'glitch'), node);
        }
        return { layer: 'front', life: life(COC_LIFE_MS.san, env), sounds: [drop ? 'coc-sanloss' : 'coc-tick'], node };
    },
    symptom(item, env) {
        const level = item.level || 'medium';
        const pips = ['light', 'medium', 'heavy'].map((k, i) => `<i class="${i <= ['light', 'medium', 'heavy'].indexOf(level) ? 'is-on' : ''}"></i>`).join('');
        const edges = '<i class="igs-coc-sym-edge is-v"></i><i class="igs-coc-sym-edge is-l"></i><i class="igs-coc-sym-edge is-r"></i>';
        const card = `<div class="igs-coc-sym-card"><div class="igs-coc-sym-head"><span>${env.ancient ? '病症' : '症状'}</span><em>${LEVEL_LABEL[level] || '中'}</em><div class="igs-coc-sym-pips">${pips}</div></div><div class="igs-coc-sym-name">${esc(item.name)}</div>${item.desc ? `<div class="igs-coc-sym-desc">${esc(item.desc)}</div>` : ''}</div>`;
        const node = shell(env, 'symptom', `${edges}${card}`, `is-${level} ${farSide(env)}`);
        if (!env.reduced) playWarp(spriteElOf(env, ''), level === 'heavy' ? 'shift' : 'tremble');
        return { layer: 'front', life: life(COC_LIFE_MS.symptom, env), sounds: ['coc-whisper'], node };
    },
    clue(item, env) {
        const node = shell(env, 'clue', `<div class="igs-coc-clue-card"><div class="igs-coc-clue-found"><div class="igs-coc-clue-who"></div></div><div class="igs-coc-clue-body"><div class="igs-coc-clue-tag">${env.ancient ? '线索' : '新线索'}</div><div class="igs-coc-clue-name">${esc(item.name)}</div>${item.desc ? `<div class="igs-coc-clue-desc">${esc(item.desc)}</div>` : ''}</div></div>`, farSide(env));
        const shown = mount(node, '.igs-coc-clue-who', portraitOf('', env, 'face'));
        if (!shown &&typeof node.querySelector === 'function') {
            const found = node.querySelector('.igs-coc-clue-found');
            if (found) found.className += ' is-empty';
        }
        return { layer: 'front', life: life(COC_LIFE_MS.clue, env), sounds: ['coc-page'], node };
    },
    casebook(item, env) {
        const first = item.items.length - item.fresh;
        const rows = item.items.map((text, i) => `<li class="${i >= first ? 'is-new' : ''}" style="--i:${i}"><b>${String(i + 1).padStart(2, '0')}</b><span>${esc(text)}</span>${i >= first ? '<u>新</u>' : ''}</li>`).join('');
        const node = shell(env, 'casebook', `<div class="igs-coc-cb"><div class="igs-coc-cb-tab"><span>${esc(item.title || (env.ancient ? '案牍' : '线索簿'))}</span><em>${String(item.items.length).padStart(2, '0')}</em></div><div class="igs-coc-cb-sheet"><ol>${rows}</ol></div></div>`, farSide(env));
        return { layer: 'front', life: life(COC_LIFE_MS.casebook, env), sounds: ['coc-page'], node };
    },
    kp(item, env) {
        const n = chars(item.text).length;
        const body = env.reduced ? esc(item.text) : charSpans(item.text, COC_LIFE_MS.kpPerChar, 520);
        const sprite = readStageBackground(env.root).sprite;
        const side = spritePosX(sprite) > 50 ? 'is-left' : 'is-right';
        const node = shell(env, 'kp', `<i class="igs-coc-kp-dim"></i><div class="igs-coc-kp-box ${side}"><span class="igs-coc-kp-role">${esc(item.role)}</span><div class="igs-coc-kp-text">${body}</div></div>`);
        return { layer: 'front', life: COC_LIFE_MS.kpBase + n * COC_LIFE_MS.kpPerChar + life(COC_LIFE_MS.kpHold, env), sounds: ['coc-dice'], node };
    },
    ending(item, env) {
        if (item.mode === 'wipe') {
            const sub = [item.name, item.reason].filter(Boolean).map(esc).join('<i></i>');
            const node = shell(env, 'wipe', `<div class="igs-coc-wipe-veil"></div><div class="igs-coc-wipe-body"><div class="igs-coc-wipe-title">${env.ancient ? '全军覆没' : '团灭'}</div>${sub ? `<div class="igs-coc-wipe-sub">${sub}</div>` : ''}<div class="igs-coc-wipe-read"><span>存活</span><b>0</b></div></div>`);
            return { layer: 'front', life: life(COC_LIFE_MS.wipe, env), sounds: ['coc-toll'], node };
        }
        const sheet = `<div class="igs-coc-sheet"><div class="igs-coc-sheet-head">${env.ancient ? '名册' : '调查员档案'}</div><div class="igs-coc-sheet-name">${esc(item.name || '无名调查员')}</div><i class="igs-coc-sheet-rule"></i><div class="igs-coc-sheet-reason">${esc(item.reason)}</div><div class="igs-coc-sheet-stamp">${env.ancient ? '殁' : '已故'}</div></div>`;
        const node = shell(env, 'tear', `<i class="igs-coc-tear-veil"></i><div class="igs-coc-tear"><div class="igs-coc-tear-half is-l">${sheet}</div><div class="igs-coc-tear-half is-r">${sheet}</div></div>`, farSide(env));
        return { layer: 'front', life: life(COC_LIFE_MS.tear, env), sounds: ['coc-tear', 'coc-toll'], node };
    },
    dungeon(item, env) {
        const rows = item.rows.map((value, i) => `<li style="--i:${i}"><b>${String(i + 1).padStart(2, '0')}</b><span>${esc(value)}</span></li>`).join('');
        const node = shell(env, 'dungeon', `<div class="igs-coc-dg"><div class="igs-coc-dg-bar"><span>${env.ancient ? '榜' : '系统通告'}</span><em>${esc(item.title || (env.ancient ? '天榜' : '副本公告'))}</em></div><ol>${rows}</ol>${item.footer ? `<div class="igs-coc-dg-foot">${esc(item.footer)}</div>` : ''}</div>`, farSide(env));
        return { layer: 'front', life: life(COC_LIFE_MS.dungeon, env), sounds: ['coc-chime'], node };
    },
    portal(item, env) {
        const lids = env.reduced ? '' : '<i class="igs-coc-lid is-t"></i><i class="igs-coc-lid is-b"></i>';
        const place = env.reduced ? esc(item.place) : charSpans(item.place, 90, 1500);
        const node = shell(env, 'portal', `${lids}<div class="igs-coc-warp-plate"><i class="igs-coc-warp-slit"></i><div class="igs-coc-warp-place">${place}</div>${item.sub ? `<div class="igs-coc-warp-sub">${esc(item.sub)}</div>` : ''}</div>`);
        return { layer: 'front', life: life(COC_LIFE_MS.portal, env), sounds: ['coc-warp'], node };
    },
    rating(item, env) {
        const rows = item.rows.map((row, i) => `<li style="--i:${i}">${row.label ? `<span>${esc(row.label)}</span><i></i>` : '<i></i>'}<b class="igs-coc-rt-v">${esc(row.value)}</b></li>`).join('');
        const head = esc(item.title || (env.ancient ? '功过簿' : '副本结算'));
        const node = shell(env, 'rating', `<div class="igs-coc-rt"><div class="igs-coc-rt-head">${head}</div><div class="igs-coc-rt-main"><b class="igs-coc-rt-grade">${esc(item.grade)}</b><ul>${rows}</ul></div></div>`, `is-r-${item.tier} ${farSide(env)}`);
        const cells = typeof node.querySelectorAll === 'function' ? node.querySelectorAll('.igs-coc-rt-v') : [];
        item.rows.forEach((row, i) => {
            const cell = cells[i];
            if (!cell || !/^\d{1,7}$/.test(row.value) || env.reduced) return;
            cell.textContent = '0';
            after(520 + i * 240, () => rollNumber(cell, 0, Number(row.value), 900), cell);
        });
        return { layer: 'front', life: life(COC_LIFE_MS.rating, env), sounds: ['coc-stamp'], node };
    },
    alive(item, env) {
        const total = item.total == null ? item.left : item.total;
        const pips = total <= 16 ? Array.from({ length: total }, (_, i) => `<i class="${i >= item.left ? 'is-dead' : ''}" style="--k:${Math.max(0, i - item.left)}">${i >= item.left ? '<u></u>' : ''}</i>`).join('') : '';
        const lost = total > item.left;
        const two = (n) => String(Math.round(n)).padStart(2, '0');
        const node = shell(env, 'alive', `<div class="igs-coc-alive-card"><div class="igs-coc-alive-title">${esc(item.title || (env.ancient ? '幸存者' : '存活人数'))}</div><div class="igs-coc-alive-count"><b class="igs-coc-alive-num">${two(env.reduced || !lost ? item.left : total)}</b><span>/ ${two(total)}</span></div>${pips ? `<div class="igs-coc-alive-pips">${pips}</div>` : ''}</div>`, farSide(env));
        const num = typeof node.querySelector === 'function' ? node.querySelector('.igs-coc-alive-num') : null;
        if (num && lost && !env.reduced) after(560, () => rollNumber(num, total, item.left, 700 + (total - item.left) * 120, { format: two }), num);
        return { layer: 'front', life: life(COC_LIFE_MS.alive, env), sounds: [lost ? 'coc-toll' : 'coc-tick'], node };
    },
    rules(item, env) {
        const lis = item.items.map((text, i) => {
            const n = i + 1;
            const tamper = item.tamper.includes(n);
            const violate = item.violate.includes(n);
            return `<li class="${[tamper && 'is-tamper', violate && !tamper && 'is-violate'].filter(Boolean).join(' ')}" style="--i:${i}"><b>${n}</b><span>${esc(text)}</span>${tamper ? '<u class="igs-coc-smear"></u>' : ''}</li>`;
        }).join('');
        const title = item.title || (env.ancient ? '族规' : '规则');
        const node = shell(env, 'rules', `<div class="igs-coc-rules-paper"><div class="igs-coc-rules-title">${esc(title)}</div><ol>${lis}</ol></div>`, farSide(env));
        const sounds = ['coc-page'];
        if (item.tamper.length) sounds.push('coc-smear');
        else if (item.violate.length) sounds.push('coc-stamp');
        return { layer: 'front', life: life(COC_LIFE_MS.rules, env), sounds, node };
    },
    board(item, env) {
        const spots = BOARD_SPOTS.slice(0, item.items.length);
        const pairs = item.links.length ? item.links : item.items.slice(1).map((_, i) => [i, i + 1]);
        const notes = item.items.map((text, i) => `<div class="igs-coc-board-note" style="left:${spots[i][0]}%;top:${spots[i][1]}%;--d:${0.25 + i * 0.22}s"><i class="igs-coc-board-pin"></i><span>${esc(text)}</span></div>`).join('');
        const start = 0.25 + item.items.length * 0.22 + 0.1;
        const paths = pairs.map(([a, b], i) => `<path pathLength="1" d="${linkPath({ x: spots[a][0], y: spots[a][1] }, { x: spots[b][0], y: spots[b][1] }, { sag: 0, trim: 0 })}" style="animation-delay:${(start + i * 0.4).toFixed(2)}s"/>`).join('');
        const node = shell(env, 'board', `<div class="igs-coc-bd"><div class="igs-coc-bd-tag">${esc(item.title || (env.ancient ? '案卷' : '案情图'))}</div>${notes}<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${paths}</svg></div>`, farSide(env));
        return { layer: 'front', life: life(COC_LIFE_MS.board, env), sounds: ['coc-pin', 'coc-string'], node };
    },
    magnify(item, env) {
        const el = spriteElOf(env, item.who);
        const url = urlOfBackground(el && el.style && el.style.backgroundImage);
        const crop = url ? resolveRegionCrop({ url }, item.region, 1, env.root.ownerDocument) : null;
        const clone = crop ? cloneSpriteLayer(env.root, item.who, { speaker: env.speaker, crop }) : null;
        const sprite = readStageBackground(env.root).sprite;
        const left = spritePosX(sprite) > 50 ? 27 : 73;
        const node = shell(env, 'magnify', `<div class="igs-coc-lens" style="left:${left}%"><div class="igs-coc-lens-view"></div><i class="igs-coc-lens-rim"></i><i class="igs-coc-lens-ticks"></i>${item.note ? `<div class="igs-coc-lens-cap">${esc(item.note)}</div>` : ''}</div>`);
        const view = typeof node.querySelector === 'function' ? node.querySelector('.igs-coc-lens-view') : null;
        if (view && clone) view.appendChild(clone);
        else if (view) {
            // 没有可见立绘时镜内放背景局部兜底（取背景图中段放大），再没有背景就用冷色网格。
            const bg = readStageBackground(env.root).bg;
            if (bg && bg.visible && typeof view.setAttribute === 'function') view.setAttribute('style', `background-image:${bg.image.replace(/&quot;/g, '"')};background-size:260% auto;background-position:${bg.position || '50% 50%'}`);
            else view.className += ' is-empty';
        }
        return { layer: 'front', life: life(COC_LIFE_MS.magnify, env), sounds: ['coc-lens'], node };
    },
    accuse(item, env) {
        const focus = item.who ? resolveHeadAnchor(env, item.who) : { x: 50, y: 30 };
        const node = shell(env, 'accuse', `<i class="igs-coc-accuse-dim"></i><i class="igs-coc-accuse-rays"></i><div class="igs-coc-accuse-line">${item.who ? `<span class="igs-coc-accuse-name">${esc(item.who)}</span>` : ''}<b class="igs-coc-accuse-text">${esc(item.line)}</b><i class="igs-coc-accuse-under"></i></div>`);
        node.setAttribute('style', `--fx:${Math.round(focus.x)}%;--fy:${Math.round(focus.y)}%`);
        if (!env.reduced) {
            const el = spriteElOf(env, item.who);
            playWarp(el, 'tremble');
            // 人物轻微推近：叠加缩放，播完自动还原。
            if (el && typeof el.animate === 'function') {
                try { el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.045)' }, { transform: 'scale(1.045)' }, { transform: 'scale(1)' }], { duration: Math.round(COC_LIFE_MS.accuse * 0.85), easing: 'ease-out', composite: 'add', fill: 'none' }); } catch { /* 无 WAAPI 时跳过 */ }
            }
        }
        return { layer: 'front', life: life(COC_LIFE_MS.accuse, env), sounds: ['coc-accuse'], node };
    },
    stats(item, env) {
        const max = statsMax(item.rule, item.axes);
        const name = item.who || item.title || '';
        const head = item.who && item.title ? `<div class="igs-coc-st-title">${esc(item.title)}</div>` : '';
        const side = `<div class="igs-coc-st-side"><div class="igs-coc-st-portrait"><b>${esc(Array.from(name)[0] || '?')}</b></div><div class="igs-coc-st-who">${item.who ? `<div class="igs-coc-st-name">${esc(item.who)}</div>` : ''}${item.sub ? `<div class="igs-coc-st-sub">${esc(item.sub)}</div>` : ''}</div>${item.rule === 'dnd' ? '<i class="igs-coc-st-seal">D20</i>' : ''}</div>`;
        const vit = vitalsHtml(item);
        const node = shell(env, 'stats', `${head}<div class="igs-coc-st-card is-${item.rule}">${side}<div class="igs-coc-st-chart">${radarHtml(item, max, env.reduced)}</div>${vit ? `<div class="igs-coc-st-vit">${vit}</div>` : ''}</div>`, `${env.reduced ? 'is-reduced ' : ''}${farSide(env)}`);
        mount(node, '.igs-coc-st-portrait', portraitOf(item.who, env));
        if (!env.reduced && typeof node.querySelectorAll === 'function') {
            node.querySelectorAll('.igs-coc-st-v').forEach((cell, i) => {
                const to = Number(cell.getAttribute('data-to'));
                const from = Number(cell.getAttribute('data-from'));
                cell.textContent = String(from);
                after(900 + i * 130, () => rollNumber(cell, from, to, 800), cell);
            });
        }
        const dropped = item.axes.some((r) => r.prev != null && r.value < r.prev);
        return { layer: 'front', life: life(COC_LIFE_MS.stats, env), sounds: ['coc-page', dropped ? 'coc-tick' : 'coc-stats'], node };
    },
};
