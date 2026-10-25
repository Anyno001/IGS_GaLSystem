import { guqinSvg, teaSvg } from './fx-selected-svg.js';
// 古风礼仪雅事演出：抚琴、对弈、圣旨、敬茶、行礼。
// 由 fx-daily.js 并入 BUILDERS；样式见 fx-daily-rites-style.js，音效见 fx-daily-r3-sfx.js。
import { esc } from './reader-value-utils.js';
import { make } from './fx-daily-kit.js';
import { makeAncientPaper } from './fx-ancient-paper.js';
import { spawnMist } from './fx-mist.js';
import { spriteElOf } from './stage-snapshot.js';
import { bodyAnchor, castFigures, clamp, lifeOf, play, round1, safeAnimate, seeded, spec, visibleSprite } from './fx-daily-r3-kit.js';

const GO_CELL = 22;
const GO_SIZE = 8;
const GO_VERDICT = Object.freeze({ win: '胜', lose: '败', draw: '和' });
const NOTICE_RE = /^[【\[(（]?(告示|榜文|公告|布告)/;
const BOW_SPEC = spec(1200, ['translate(0,0) rotate(0deg)', 'translate(0,3.8%) rotate(2.2deg)', 'translate(0,3.8%) rotate(2.2deg)', 'translate(0,0) rotate(0deg)'], 'cubic-bezier(.4,0,.3,1)');

function goStones(seed, lastBlack) {
    const rnd = seeded(seed);
    const spots = [];
    for (let gx = 1; gx < GO_SIZE; gx++) for (let gy = 1; gy < GO_SIZE; gy++) spots.push([gx, gy]);
    for (let i = spots.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [spots[i], spots[j]] = [spots[j], spots[i]];
    }
    const total = 12;
    return spots.slice(0, total).map(([gx, gy], i) => {
        const fresh = i >= total - 4;
        const nth = i - (total - 4);
        const black = fresh ? (nth % 2 === 3 % 2) === lastBlack : i % 2 === 0;
        return { gx, gy, black, fresh, nth };
    });
}

export const RITES_BUILDERS = {
    // 抚琴：一张古琴自下缓缓入画，琴面七弦、十三徽俱全；每拨一弦那根弦轻颤，琴面上荡开淡墨水纹，背后一团空山雾气，抚琴人微微低头。
    guqin(item, env) {
        const life = lifeOf('guqin', env);
        const b = bodyAnchor(env, '');
        const qx = round1(clamp(b.x, 32, 68));
        const qy = round1(clamp(b.waist, 48, 66));
        const qin = make(env.doc, 'igs-dfx-guqin-qin', guqinSvg());
        qin.setAttribute('style', `left:${qx}%;top:${qy}%`);
        const node = make(env.doc, 'igs-dfx igs-dfx-guqin');
        spawnMist(node, { x: qx, y: qy + 3, size: 70, color: '#e6efeb', drift: 4 }, { reduced: env.reduced });
        node.appendChild(qin);
        if (!env.reduced) {
            safeAnimate(env.root.querySelector('#igs-sprite'), [
                { transform: 'translate(0,0) rotate(0deg)', offset: 0 }, { transform: 'translate(0,1.2%) rotate(1deg)', offset: 0.18 },
                { transform: 'translate(0,1.2%) rotate(1deg)', offset: 0.8 }, { transform: 'translate(0,0) rotate(0deg)', offset: 1 },
            ], { duration: life, easing: 'ease-in-out', composite: 'add' });
        }
        return { layer: 'stage', life, sounds: ['guqin'], node };
    },

    // 对弈：木纹棋盘上一局中盘，几手旧子已在，新子「嗒」地逐颗落下，最后一手带一圈朱砂标记，终了盖一枚小印。
    go(item, env) {
        const lastBlack = item.result !== 'lose';
        const stones = goStones(item.result === 'win' ? 71 : item.result === 'lose' ? 83 : 97, lastBlack);
        const html = stones.map((s) => {
            const style = `left:${s.gx * GO_CELL - 9}px;top:${s.gy * GO_CELL - 9}px${s.fresh ? `;animation-delay:${900 + s.nth * 650}ms` : ''}`;
            const mark = s.fresh && s.nth === 3 ? '<em></em>' : '';
            return `<i class="${s.black ? 'is-b' : 'is-w'}${s.fresh ? ' is-new' : ''}" style="${style}">${mark}</i>`;
        }).join('');
        const verdict = GO_VERDICT[item.result] || '';
        const node = make(env.doc, 'igs-dfx igs-dfx-go', `<div class="igs-dfx-go-board"><div class="igs-dfx-go-stones">${html}</div></div>${verdict ? `<div class="igs-dfx-go-verdict">${verdict}</div>` : ''}`);
        return { layer: 'front', life: lifeOf('go', env), sounds: ['go-play'], node };
    },

    // 圣旨：玉轴自中间向两侧分开，织锦黄绢徐徐展开，「奉天承运 皇帝诏曰」抬头，末尾落一枚大方玺。告示则是白纸黑字、无抬头。
    edict(item, env) {
        const text = String(item.text || '');
        const notice = NOTICE_RE.test(text);
        if (env.ancient) return {
            layer: 'front', life: lifeOf('edict', env), sounds: ['edict-open'],
            node: makeAncientPaper(item, env, { kind: notice ? 'notice' : 'edict', stepMs: 0, startMs: 0 }),
        };
        const head = notice ? '' : '<div class="igs-dfx-edict-head">奉天承运　皇帝诏曰</div>';
        const seal = notice ? '<i class="igs-dfx-edict-seal is-small">官</i>' : '<i class="igs-dfx-edict-seal"><u>皇帝</u><u>之宝</u></i>';
        const node = make(env.doc, `igs-dfx igs-dfx-edict${notice ? ' is-notice' : ''}`,
            `<div class="igs-dfx-edict-roll"><div class="igs-dfx-edict-sheet">${head}<div class="igs-dfx-edict-body">${esc(text)}</div>${seal}</div><i class="igs-dfx-edict-rod is-left"></i><i class="igs-dfx-edict-rod is-right"></i></div>`);
        return { layer: 'front', life: lifeOf('edict', env), sounds: ['edict-open'], node };
    },

    // 敬茶：一只茶盏带托，被一双衣袖捧着从敬茶人一侧稳稳递向对面，递到时盏沿热气轻轻升起；敬茶人欠身，接茶的人微微点头。
    tea(item, env) {
        const life = lifeOf('tea', env);
        const b = bodyAnchor(env, '');
        const cast = castFigures(env);
        const fromX = round1(clamp(b.x, 14, 86));
        const toX = round1(cast.length ? clamp(cast[0].x, 14, 86) : fromX < 50 ? fromX + 18 : fromX - 18);
        const y = round1(clamp(b.chest + 6, 46, 64));
        const k = round1((toX - fromX) / 14);
        const set = make(env.doc, 'igs-dfx-tea-set', teaSvg());
        set.setAttribute('style', `left:${fromX - 7}%;top:${y}%;--igs-k:${k}`);
        const node = make(env.doc, 'igs-dfx igs-dfx-tea');
        node.appendChild(set);
        if (!env.reduced) {
            safeAnimate(env.root.querySelector('#igs-sprite'), [
                { transform: 'translate(0,0) rotate(0deg)', offset: 0 }, { transform: 'translate(0,1.4%) rotate(1.2deg)', offset: 0.14 },
                { transform: 'translate(0,1.4%) rotate(1.2deg)', offset: 0.34 }, { transform: 'translate(0,0) rotate(0deg)', offset: 0.5 }, { transform: 'translate(0,0) rotate(0deg)', offset: 1 },
            ], { duration: life, easing: 'ease-in-out', composite: 'add' });
            if (cast.length) {
                safeAnimate(cast[0].el, [
                    { transform: 'translate(0,0)', offset: 0 }, { transform: 'translate(0,0)', offset: 0.36 }, { transform: 'translate(0,1%)', offset: 0.46 },
                    { transform: 'translate(0,1%)', offset: 0.58 }, { transform: 'translate(0,0)', offset: 0.7 }, { transform: 'translate(0,0)', offset: 1 },
                ], { duration: life, easing: 'ease-in-out', composite: 'add' });
            }
        }
        return { layer: 'stage', life, sounds: ['tea-pour'], node };
    },

    // 行礼：立绘躬身下沉并微微前倾，礼毕缓缓直起；脚边荡开一圈淡墨，一枚朱砂「礼」字小印在躬到最低时浮现。
    bow(item, env) {
        const el = spriteElOf(env, item.who);
        if (!visibleSprite(el) || env.reduced) return null;
        if (!play(env, el, BOW_SPEC)) return null;
        const b = bodyAnchor(env, item.who);
        const side = b.x > 60 ? -1 : 1;
        const node = make(env.doc, 'igs-dfx igs-dfx-bow', `<i class="igs-dfx-bow-ink" style="left:${b.x}%;top:${clamp(b.waist, 40, 66)}%"></i><i class="igs-dfx-bow-seal" style="left:${round1(clamp(b.x + side * (b.d * 1.5 + 6), 8, 92))}%;top:${clamp(b.head, 14, 56)}%">礼</i>`);
        return { layer: 'stage', life: lifeOf('bow', env), sounds: ['bow-sleeve'], node };
    },
};
