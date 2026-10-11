// 修仙武侠演出：御剑、轻功、点穴、闭关、运功。立绘一律通过 stage-snapshot 复刻当前 DOM，跟随服装与表情。
// 由 fx-daily.js 并入 BUILDERS；样式见 fx-daily-xianxia-style.js，音效见 fx-daily-r3-sfx.js。
import { esc } from './reader-value-utils.js';
import { make } from './fx-daily-kit.js';
import { spawnMist } from './fx-mist.js';
import { cloneSpriteLayer, readStageBackground, spritePosX } from './stage-snapshot.js';
import { bodyAnchor, clamp, lifeOf, play, round1, safeAnimate, seeded, spec } from './fx-daily-r3-kit.js';

const SWORD_SVG = '<svg viewBox="0 0 220 36" aria-hidden="true"><path class="igs-dfx-yj-blade" d="M70 15.4 212 17.4 218 18 212 18.6 70 20.6Z"/><path class="igs-dfx-yj-guard" d="M64 9Q60 18 64 27"/><path class="igs-dfx-yj-grip" d="M26 18H64"/><circle class="igs-dfx-yj-pommel" cx="22" cy="18" r="3"/><path class="igs-dfx-yj-tassel" d="M19 19Q12 24 10 31"/></svg>';
const GHOST_FILTER = 'sepia(.35) hue-rotate(120deg) saturate(.8) brightness(1.12)';
const FROZEN_FILTER = 'grayscale(.75) sepia(.25) hue-rotate(165deg) brightness(.92) contrast(1.05)';
const WARM_FILTER = 'brightness(1.28) sepia(.45) saturate(1.25)';
const QG_SPEC = spec(880, ['translate(0,0) scale(1)', 'translate(7%,-2.6%) scale(.97)', 'translate(7%,-2.6%) scale(.97)', 'translate(0,0) scale(1)'], 'cubic-bezier(.2,.8,.3,1)');
const LEAF_COLORS = Object.freeze(['#e8efe6', '#dfe9e2', '#efe6c8']);

const dot = (cx, cy, cls) => `<i class="${cls}" style="left:${cx}%;top:${cy}%"></i>`;

export const XIANXIA_BUILDERS = {
    // 御剑：剑先「铮」地立起，人复刻成小剪影站在剑上，连人带剑沿斜线飞向右上，云气一路被抛在身后，末了回到原处落下一圈气浪。
    yujian(item, env) {
        const life = lifeOf('yujian', env);
        const x = Math.round(spritePosX(readStageBackground(env.root).sprite));
        const rider = env.reduced ? null : cloneSpriteLayer(env.root, '', { speaker: env.speaker });
        const clouds = [0.26, 0.5, 0.74].map((t, i) => {
            const left = Math.round(x + (88 - x) * t);
            const top = Math.round(94 - 62 * t);
            return `<i class="igs-dfx-yujian-cloud${i === 1 ? ' is-b' : ''}" style="left:${left}%;top:${top}%;--igs-k:${(0.14 + t * 0.52).toFixed(2)}"></i>`;
        }).join('');
        const node = make(env.doc, 'igs-dfx igs-dfx-yujian', `${clouds}<i class="igs-dfx-yujian-flash"></i><i class="igs-dfx-yujian-ring"></i>`);
        node.style.setProperty('--igs-x', String(x));
        const ride = make(env.doc, 'igs-dfx-yujian-ride');
        if (rider) ride.appendChild(rider);
        ride.appendChild(make(env.doc, 'igs-dfx-yujian-sword', SWORD_SVG));
        node.appendChild(ride);
        if (rider) {
            safeAnimate(env.root.querySelector('#igs-sprite'), [
                { opacity: 1, offset: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 0, offset: 0.16 }, { opacity: 0, offset: 0.86 }, { opacity: 1, offset: 1 },
            ], { duration: life, easing: 'linear' });
        }
        return { layer: 'stage', life, sounds: ['sword-ring', 'soar'], node };
    },

    // 轻功：身形一掠，身后依次留下三道渐隐的真残影，落叶被风卷着掠过，几道细风线贴着身侧。
    qinggong(item, env) {
        const sprite = env.root.querySelector('#igs-sprite');
        play(env, sprite, QG_SPEC);
        const b = bodyAnchor(env, '');
        const ghosts = [0, 1, 2].map((i) => {
            const clone = cloneSpriteLayer(env.root, '', { speaker: env.speaker, filter: GHOST_FILTER });
            if (!clone) return null;
            const wrap = make(env.doc, `igs-dfx-qinggong-ghost is-${i}`);
            wrap.setAttribute('style', `--dx:${(1.8 + i * 2).toFixed(1)}%;--o:${(0.5 - i * 0.1).toFixed(2)};animation-delay:${70 + i * 80}ms`);
            wrap.appendChild(clone);
            return wrap;
        }).filter(Boolean);
        const rnd = seeded(7731);
        const leaves = Array.from({ length: 12 }, (_, i) => {
            const size = 3 + Math.round(rnd() * 3);
            const style = [
                `left:${Math.round(clamp(b.x - 10 + rnd() * 14, 2, 94))}%`, `top:${Math.round(18 + rnd() * 66)}%`,
                `width:${size}px`, `height:${size}px`, `background:${LEAF_COLORS[i % 3]}`,
                `--dx:${Math.round(22 + rnd() * 26)}vw`, `--dy:${Math.round(-36 + rnd() * 70)}px`, `--rot:${Math.round((rnd() > 0.5 ? 1 : -1) * (360 + rnd() * 360))}deg`,
                `animation-delay:${Math.round(80 + rnd() * 820)}ms`, `animation-duration:${Math.round(1100 + rnd() * 700)}ms`,
            ].join(';');
            return `<i style="${style}"></i>`;
        }).join('');
        const streaks = [-7, 0, 7].map((dy, i) => `<i style="left:${Math.round(clamp(b.x - 22, 0, 70))}%;top:${Math.round(b.chest + dy)}%;animation-delay:${i * 60}ms"></i>`).join('');
        const node = make(env.doc, 'igs-dfx igs-dfx-qinggong', `<div class="igs-dfx-qinggong-streaks">${streaks}</div><div class="igs-dfx-qinggong-leaves">${leaves}</div>`);
        for (const wrap of ghosts) node.insertBefore(wrap, node.firstChild);
        return { layer: 'stage', life: lifeOf('qinggong', env), sounds: ['soar', 'light-step'], node };
    },

    // 点穴：一道指光自画面边缘射向胸前穴位，点中处红点炸开，经络几处穴位依次一闪，立绘随即被一层灰蓝色定住直到演出结束。
    dianxue(item, env) {
        const life = lifeOf('dianxue', env);
        const b = bodyAnchor(env, '');
        const sx = b.x < 50 ? 102 : -2;
        const sy = clamp(b.chest - 16, 6, 70);
        const pts = [
            [b.x, b.chest], [b.x + b.d * 0.85, b.chest - b.h * 0.3], [b.x, b.head + b.h * 0.95], [b.x - b.d * 0.85, b.chest - b.h * 0.3],
        ].map(([px, py]) => [round1(px), round1(py)]);
        const meridian = `M${pts[0].join(' ')}L${pts[1].join(' ')}M${pts[0].join(' ')}L${pts[2].join(' ')}M${pts[0].join(' ')}L${pts[3].join(' ')}`;
        const svg = `<svg class="igs-dfx-dianxue-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path class="igs-dfx-dianxue-meridian" d="${meridian}"/><path class="igs-dfx-dianxue-beam" pathLength="1" d="M${sx} ${sy}L${pts[0].join(' ')}"/></svg>`;
        const nodes = pts.slice(1).map(([px, py], i) => dot(px, py, `igs-dfx-dianxue-node is-${i}`)).join('');
        const node = make(env.doc, 'igs-dfx igs-dfx-dianxue', `${svg}${nodes}<div class="igs-dfx-dianxue-stage" style="left:${pts[0][0]}%;top:${pts[0][1]}%"><i class="igs-dfx-dianxue-dot"></i><i class="igs-dfx-dianxue-ring"></i><i class="igs-dfx-dianxue-ring is-2"></i></div>`);
        const frozen = env.reduced ? null : cloneSpriteLayer(env.root, '', { speaker: env.speaker, filter: FROZEN_FILTER });
        if (frozen) {
            const wrap = make(env.doc, 'igs-dfx-dianxue-frozen');
            wrap.appendChild(frozen);
            node.insertBefore(wrap, node.firstChild);
        }
        if (!env.reduced) {
            safeAnimate(env.root.querySelector('#igs-sprite'), [
                { transform: 'translate(0,0)', offset: 0 }, { transform: 'translate(0,0)', offset: 0.14 }, { transform: 'translate(.5%,0)', offset: 0.2 },
                { transform: 'translate(-.4%,0)', offset: 0.26 }, { transform: 'translate(.2%,0)', offset: 0.32 }, { transform: 'translate(0,0)', offset: 0.4 },
            ], { duration: life, easing: 'ease-out', composite: 'add' });
        }
        return { layer: 'stage', life, sounds: ['freeze-point'], node };
    },

    // 闭关：四周压暗，灵气自四面八方螺旋聚向胸前，一息一息地呼吸；写了境界时在呼吸末尾金光一闪，字落下。立绘微沉、略暗，像是盘坐。
    biguan(item, env) {
        const life = lifeOf('biguan', env);
        const b = bodyAnchor(env, '');
        const motes = Array.from({ length: 14 }, (_, i) => `<b style="--a:${Math.round(i * (360 / 14) + (i % 3) * 9)}deg;--r:${150 + (i % 4) * 34}px;animation-delay:${i * 210}ms"></b>`).join('');
        const text = item.text ? `<i class="igs-dfx-biguan-flash"></i><div class="igs-dfx-biguan-text">${esc(item.text)}</div>` : '';
        const node = make(env.doc, 'igs-dfx igs-dfx-biguan', `<i class="igs-dfx-biguan-veil"></i><div class="igs-dfx-biguan-qi" style="left:${b.x}%;top:${b.chest}%"><i class="igs-dfx-biguan-core"></i>${motes}</div>${text}`);
        if (!env.reduced) {
            safeAnimate(env.root.querySelector('#igs-sprite'), [
                { transform: 'translate(0,0) scale(1)', filter: 'brightness(1)', offset: 0 },
                { transform: 'translate(0,1.8%) scale(.95)', filter: 'brightness(.84)', offset: 0.14 },
                { transform: 'translate(0,1.8%) scale(.95)', filter: 'brightness(.84)', offset: 0.86 },
                { transform: 'translate(0,0) scale(1)', filter: 'brightness(1)', offset: 1 },
            ], { duration: life, easing: 'ease-in-out', composite: 'add' });
        }
        return { layer: 'front', life, sounds: item.text ? ['qi', 'qi-chime'] : ['qi'], node };
    },

    // 运功疗伤：两只掌心的光点自两侧向胸前汇聚，经络光线自胸口向上游走；成功时全身泛一层暖光，失败时光点碎成灰色的碎屑。
    yungong(item, env) {
        const life = lifeOf('yungong', env);
        const fail = item.result === 'lose';
        const b = bodyAnchor(env, '');
        const reach = clamp(b.d * 1.5 + 6, 9, 20);
        const palm = (side) => `<i class="igs-dfx-yungong-palm is-${side > 0 ? 'r' : 'l'}" style="left:${round1(b.x + side * reach)}%;top:${b.chest}%;--igs-k:${round1((-side * (reach - 1.2)) / 5)}"></i>`;
        const top = clamp(b.head - b.h * 0.2, 4, 80);
        const lines = [-0.5, 0, 0.5].map((off, i) => `<i style="left:${round1(b.x + off * b.d)}%;top:${round1(top)}%;height:${round1(Math.max(8, b.chest - top))}%;animation-delay:${1100 + i * 220}ms"></i>`).join('');
        const rnd = seeded(913);
        const shards = fail
            ? Array.from({ length: 7 }, (_, i) => `<s style="--sx:${Math.round((rnd() - 0.5) * 120)}px;--sy:${Math.round(-20 - rnd() * 70)}px;--sr:${Math.round(rnd() * 240 - 120)}deg;animation-delay:${1000 + i * 16}ms"></s>`).join('')
            : '';
        const node = make(env.doc, `igs-dfx igs-dfx-yungong${fail ? ' is-fail' : ''}`, `<div class="igs-dfx-yungong-lines">${lines}</div>${palm(-1)}${palm(1)}<i class="igs-dfx-yungong-pulse" style="left:${b.x}%;top:${b.chest}%"></i><div class="igs-dfx-yungong-shards" style="left:${b.x}%;top:${b.chest}%">${shards}</div>`);
        if (!fail && !env.reduced) {
            const aura = cloneSpriteLayer(env.root, '', { speaker: env.speaker, filter: WARM_FILTER });
            if (aura) {
                const wrap = make(env.doc, 'igs-dfx-yungong-aura');
                wrap.appendChild(aura);
                node.insertBefore(wrap, node.firstChild);
            }
        }
        const flow = make(env.doc, 'igs-dfx-yungong-flow');
        spawnMist(flow, { x: b.x, y: b.chest, size: 26, color: fail ? '#b8bdbd' : '#9fe3d3', drift: 4 }, { reduced: env.reduced });
        node.appendChild(flow);
        return { layer: 'stage', life, sounds: fail ? ['qi', 'qi-break'] : ['qi', 'qi-chime'], node };
    },
};
