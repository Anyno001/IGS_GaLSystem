// 人生大事与节日的构建器：每个返回 { node, life, layer, sounds }；减少动态时 CSS 直接落在终态（见 fx-festival-style.js）。
import { esc } from './reader-value-utils.js';
import { make, charSpans } from './fx-daily-kit.js';
import { cloneSpriteLayer, readStageBackground } from './stage-snapshot.js';
import { HEAD_ASPECT } from './fx-anchor.js';
import { at, atFilter, headPoint, pushStage, reactSprite, roundTo } from './fx-sprite-react.js';
import { measureStage, peekSpriteHead, spriteDrawRect, headToMarker } from './fx-anchor.js';
import { startFireworks, startPetals, startLanterns } from './fx-daily-particles.js';

const MS = Object.freeze({ birthday: 5800, countdownTail: 3400, xmas: 5600, redpacket: 5000, ring: 4800, wedding: 5400, test: 4200, riverlamp: 6400 });
const COUNT_STEP_MS = 700;

const life = (ms, env) => Math.round(ms * Math.max(1, env.hold || 1));
const int = (value) => Math.round(Number(value) || 0);

// 粒子画布不能在节点挂上之前启动（量不到尺寸）：下一帧、且节点还在文档里再启动；节点撤走后粒子自己退出。
function afterMount(env, host, delay, run) {
    if (env.reduced) return;
    const view = env.doc && env.doc.defaultView;
    if (!view || typeof view.requestAnimationFrame !== 'function') return;
    const go = () => {
        if (host.parentNode) {
            try { run(); } catch { /* 无画布环境 */ }
        }
    };
    if (delay > 0 && typeof view.setTimeout === 'function') view.setTimeout(() => view.requestAnimationFrame(go), delay);
    else view.requestAnimationFrame(go);
}

function headSpot(env) {
    try {
        const sprite = env.sprite;
        if (!sprite || !sprite.head || !sprite.url) return null;
        const geo = measureStage(env.root.querySelector('#igs-stage-motion'));
        const probed = peekSpriteHead(sprite.url, env.root.ownerDocument);
        if (!geo || !probed) return null;
        const rect = spriteDrawRect(geo.stageW, geo.stageH, { posX: sprite.posX, posY: sprite.posY, scale: sprite.scale, naturalW: probed.naturalW, naturalH: probed.naturalH });
        if (!rect) return null;
        const marker = headToMarker(sprite.head, rect);
        return { x: marker.cx / geo.stageW * 100, y: marker.cy / geo.stageH * 100, w: marker.d / geo.stageW * 100 };
    } catch {
        return null;
    }
}

function rollFrames(amountText) {
    const m = String(amountText).match(/\d[\d,]*(?:\.\d+)?/);
    const value = m ? Number(m[0].replace(/,/g, '')) : 0;
    const decimals = m && m[0].includes('.') ? m[0].split('.')[1].length : 0;
    const fmt = (v) => (decimals ? v.toFixed(decimals) : String(Math.round(v)));
    const steps = 8;
    const frames = [];
    for (let i = 0; i < steps - 1; i += 1) frames.push(fmt(value * (0.08 + 0.84 * ((i * 37 % 7) / 7 + i / steps) / 2)));
    frames.push(m ? m[0] : String(amountText));
    return frames;
}

function roll(frames, delayMs, durationMs) {
    const n = frames.length;
    const style = `--fest-shift:${(-(n - 1) * 1.2).toFixed(1)}em;animation-delay:${delayMs}ms;animation-duration:${durationMs}ms;animation-timing-function:steps(${Math.max(1, n - 1)},end)`;
    return `<span class="igs-dfx-fest-roll"><span class="igs-dfx-fest-strip" style="${style}">${frames.map((v) => `<span>${esc(v)}</span>`).join('')}</span></span>`;
}

export const FESTIVAL_BUILDERS = {
    birthday(item, env) {
        const age = Number(item.age) || 0;
        const count = age >= 1 && age <= 7 ? age : age ? 5 : 3;
        const candles = Array.from({ length: count }, (_, i) => {
            const left = (i + 1) / (count + 1) * 100;
            return `<i class="igs-dfx-bday-candle${i % 2 ? ' is-b' : ''}" style="left:${left.toFixed(1)}%;--i:${i}"><i class="igs-dfx-bday-fw"><i class="igs-dfx-bday-flame"></i></i><i class="igs-dfx-bday-smoke"></i></i>`;
        }).join('');
        const motes = Array.from({ length: 9 }, (_, i) => `<i style="left:${(i * 11 + 4) % 44}%;--s:${2 + i % 2}px;--d:${3.4 + (i % 4) * 0.7}s;--w:${(i * 430) % 2600 + 1800}ms"></i>`).join('');
        const wish = item.name ? `祝${item.name}生日快乐` : '生日快乐';
        const badge = age ? `<div class="igs-dfx-bday-age">${esc(age)}</div>` : '';
        const node = make(env.doc, 'igs-dfx igs-dfx-fest igs-dfx-bday', `<div class="igs-dfx-fest-veil"></div><div class="igs-dfx-fest-host"></div><div class="igs-dfx-bday-cake"><div class="igs-dfx-bday-candles">${candles}</div><i class="igs-dfx-bday-tier is-top"></i><i class="igs-dfx-bday-tier is-bottom"></i><i class="igs-dfx-bday-plate"></i>${badge}</div><div class="igs-dfx-bday-motes">${motes}</div><div class="igs-dfx-bday-text">${charSpans(wish, 90, 2300)}</div>`);
        reactSprite(env, env.speaker, [at(0, 'translate(0,0) rotate(0deg)'), at(0.35, 'translate(0,-.5%) rotate(-1.8deg)'), at(0.6, 'translate(0,-.5%) rotate(-1.8deg)'), at(1, 'translate(0,0) rotate(0deg)')], { duration: 1500, delay: 1500 });
        return { layer: 'front', life: life(MS.birthday, env), sounds: ['fest-blow'], node };
    },
    countdown(item, env) {
        const n = int(item.count);
        const ancient = env.ancient;
        const label = item.label || (ancient ? '新春大吉' : '新年快乐');
        const spans = Array.from({ length: n }, (_, i) => `<span style="animation-delay:${i * COUNT_STEP_MS}ms">${n - i}</span>`).join('');
        const end = n * COUNT_STEP_MS;
        const shift = `--fest-shift:${(-n * 1.2).toFixed(1)}em;animation-duration:${end}ms;animation-timing-function:steps(${n},end)`;
        const decor = ancient
            ? `<div class="igs-dfx-cd-couplet is-left"><span>春回大地</span></div><div class="igs-dfx-cd-couplet is-right"><span>福满人间</span></div><div class="igs-dfx-cd-crackers" style="animation-delay:${end}ms"><i style="animation-delay:${end}ms"></i></div>`
            : '';
        const node = make(env.doc, `igs-dfx igs-dfx-fest igs-dfx-countdown${ancient ? ' is-ancient' : ''}`, `<div class="igs-dfx-fest-veil"></div><div class="igs-dfx-fest-host"></div>${decor}<div class="igs-dfx-cd-num" style="animation-delay:${end}ms"><div class="igs-dfx-cd-strip" style="${shift}">${spans}</div></div><div class="igs-dfx-cd-title" style="animation-delay:${end}ms"><b>${esc(label)}</b></div>`);
        const host = node.children && node.children[1];
        if (host && !ancient) {
            afterMount(env, host, end, () => startFireworks(host, {
                count: 4,
                palette: 'gold',
                onBurst: (index) => env.play(index === 0 ? 'firework' : 'firework-pop'),
            }));
        }
        if (!env.reduced) {
            for (let i = 0; i < Math.min(n, 10); i += 1) pushStage(env, { scale: 1.008 + i * 0.0012, duration: 360, delay: i * COUNT_STEP_MS, easing: 'ease-out' });
            reactSprite(env, env.speaker, [at(0, 'translate(0,0)'), at(0.3, 'translate(0,-1.6%)'), at(0.6, 'translate(0,0)'), at(0.8, 'translate(0,-.7%)'), at(1, 'translate(0,0)')], { duration: 720, delay: end });
        }
        return { layer: 'front', life: life(end + MS.countdownTail, env), sounds: [`fest-count-${n}${ancient ? '-cn' : ''}`], node };
    },
    xmas(item, env) {
        const count = 16;
        const segs = 4;
        const bulbs = Array.from({ length: count }, (_, i) => {
            const x = (i + 0.5) / count;
            const t = (x * segs) % 1;
            const y = (3 + 28 * t * (1 - t)) / 18 * 100;
            return `<i style="left:${(x * 100).toFixed(1)}%;top:${y.toFixed(1)}%;--k:${i};animation-delay:${i * 90}ms,${i * 90 + 400 + (i % 2) * 700}ms"></i>`;
        }).join('');
        let wire = 'M0,3';
        for (let s = 0; s < segs; s += 1) wire += ` Q${(s + 0.5) * 100 / segs},17 ${(s + 1) * 100 / segs},3`;
        const flakes = Array.from({ length: 14 }, (_, i) => `<i style="left:${(i * 7.3 + 3) % 98}%;--d:${7 + (i * 5) % 5}s;--s:${3 + i % 3}px"></i>`).join('');
        const text = item.text || 'Merry Christmas';
        const node = make(env.doc, 'igs-dfx igs-dfx-fest igs-dfx-xmas', `<div class="igs-dfx-fest-veil is-soft"></div><div class="igs-dfx-xmas-snow">${flakes}</div><div class="igs-dfx-xmas-garland"><svg viewBox="0 0 100 18" preserveAspectRatio="none" aria-hidden="true"><path d="${wire}" fill="none" vector-effect="non-scaling-stroke"/></svg>${bulbs}</div><div class="igs-dfx-xmas-text">${esc(text)}</div>`);
        reactSprite(env, env.speaker, [atFilter(0, 'saturate(1) brightness(1)'), atFilter(0.25, 'saturate(1.12) brightness(1.04) hue-rotate(-4deg)'), atFilter(0.8, 'saturate(1.12) brightness(1.04) hue-rotate(-4deg)'), atFilter(1, 'saturate(1) brightness(1)')], { duration: 3600 });
        reactSprite(env, env.speaker, [at(0, 'rotate(0deg)'), at(0.3, 'rotate(-.9deg)'), at(0.7, 'rotate(.9deg)'), at(1, 'rotate(0deg)')], { duration: 3000, delay: 600 });
        return { layer: 'front', life: life(MS.xmas, env), sounds: ['fest-xmas'], node };
    },
    redpacket(item, env) {
        const ancient = env.ancient;
        const kind = ancient ? 'is-ancient' : '';
        if (item.gift) {
            const node = make(env.doc, `igs-dfx igs-dfx-fest igs-dfx-gift ${kind}`, `<div class="igs-dfx-fest-veil is-soft"></div><div class="igs-dfx-gift-stage"><div class="igs-dfx-gift-box"><i class="igs-dfx-gift-lid"></i><i class="igs-dfx-gift-body"></i><i class="igs-dfx-gift-ribbon"></i></div><div class="igs-dfx-gift-tag"><span>${esc(item.gift)}</span>${item.wish ? `<em>${esc(item.wish)}</em>` : ''}</div></div>`);
            return { layer: 'front', life: life(MS.redpacket, env), sounds: ['fest-redpacket'], node };
        }
        const amount = item.amount
            ? `<div class="igs-dfx-rp-amt"><span class="igs-dfx-rp-cur">${ancient ? '' : '¥'}</span>${roll(rollFrames(item.amount), 1700, 1100)}${ancient ? '<span class="igs-dfx-rp-cur">两</span>' : ''}</div>`
            : '';
        const wish = item.wish || '恭喜发财';
        const node = make(env.doc, `igs-dfx igs-dfx-fest igs-dfx-rp ${kind}`, `<div class="igs-dfx-fest-veil is-soft"></div><div class="igs-dfx-rp-env"><i class="igs-dfx-rp-back"></i><div class="igs-dfx-rp-card">${amount}<div class="igs-dfx-rp-wish">${esc(wish)}</div></div><i class="igs-dfx-rp-front"></i><i class="igs-dfx-rp-flap"></i><b class="igs-dfx-rp-seal">${ancient ? '赏' : '福'}</b></div>`);
        return { layer: 'front', life: life(MS.redpacket, env), sounds: ['fest-redpacket'], node };
    },
    ring(item, env) {
        const rays = Array.from({ length: 8 }, (_, i) => `<i style="--r:${i * 45}deg"></i>`).join('');
        const text = item.text ? `<div class="igs-dfx-ring-text">${esc(item.text)}</div>` : '';
        const node = make(env.doc, 'igs-dfx igs-dfx-fest igs-dfx-ring', `<div class="igs-dfx-fest-veil"></div><div class="igs-dfx-ring-spot"></div><div class="igs-dfx-ring-stage"><div class="igs-dfx-ring-box"><i class="igs-dfx-ring-base"></i><div class="igs-dfx-ring-jewel"><i class="igs-dfx-ring-band"></i><i class="igs-dfx-ring-gem"></i><i class="igs-dfx-ring-star"></i><span class="igs-dfx-ring-rays">${rays}</span></div><i class="igs-dfx-ring-front"></i><i class="igs-dfx-ring-lid"></i></div>${text}</div>`);
        pushStage(env, { scale: 1.035, duration: Math.max(2600, life(MS.ring - 600, env)), delay: 300 });
        reactSprite(env, env.speaker, [at(0, 'translate(0,0) scale(1)'), at(0.4, 'translate(0,.4%) scale(1.012)'), at(1, 'translate(0,0) scale(1)')], { duration: 2200, delay: 1700 });
        return { layer: 'front', life: life(MS.ring, env), sounds: ['fest-ring'], node };
    },
    wedding(item, env) {
        const cn = item.style === 'cn' || (item.style !== 'west' && env.ancient);
        if (cn) {
            const spot = headSpot(env);
            const cloth = spot ? `<div class="igs-dfx-wd-cloth" style="left:${spot.x.toFixed(1)}%;top:${spot.y.toFixed(1)}%;width:${(spot.w * 1.7).toFixed(1)}%"><i></i></div>` : '';
            const text = item.text || '百年好合';
            const bride = cloneSpriteLayer(env.root, env.speaker, { speaker: env.speaker });
            const node = make(env.doc, 'igs-dfx igs-dfx-fest igs-dfx-wedding is-cn', `<div class="igs-dfx-fest-veil is-red"></div><div class="igs-dfx-wd-band is-top"></div><div class="igs-dfx-wd-band is-bottom"></div><div class="igs-dfx-wd-xi"><b>囍</b></div>${cloth}<div class="igs-dfx-wd-text">${charSpans(text, 110, 1900)}</div>`);
            if (bride && typeof node.insertBefore === 'function') {
                bride.className = 'igs-clone-sprite igs-dfx-wd-bride';
                node.insertBefore(bride, node.children[1] || null);
            }
            return { layer: 'front', life: life(MS.wedding, env), sounds: ['fest-wedding-cn'], node };
        }
        const text = item.text || '愿此生永不分离';
        const node = make(env.doc, 'igs-dfx igs-dfx-fest igs-dfx-wedding is-west', `<div class="igs-dfx-fest-veil is-white"></div><div class="igs-dfx-fest-host"></div><div class="igs-dfx-wd-rings"><i></i><i></i></div><div class="igs-dfx-wd-text">${charSpans(text, 110, 1700)}</div>`);
        const bride = cloneSpriteLayer(env.root, env.speaker, { speaker: env.speaker, filter: 'brightness(1.06)' });
        if (bride && typeof node.insertBefore === 'function') {
            bride.className = 'igs-clone-sprite igs-dfx-wd-bride';
            node.insertBefore(bride, node.children[1] || null);
            const head = headPoint(env, env.speaker);
            const aspect = readStageBackground(env.root).aspect || 16 / 9;
            const w = Math.max(10, head.d * 1.9);
            const veil = make(env.doc, 'igs-dfx-wd-veil', '<i></i>');
            veil.setAttribute('style', `left:${roundTo(head.x)}%;top:${roundTo(head.y - head.d * aspect * HEAD_ASPECT * 0.35)}%;width:${roundTo(w)}%`);
            node.insertBefore(veil, node.children[2] || null);
            pushStage(env, { scale: 1.025, duration: Math.max(2600, life(MS.wedding - 800, env)), delay: 400 });
        }
        const host = Array.from(node.children || []).find((c) => String(c.className).includes("igs-dfx-fest-host"));
        if (host) afterMount(env, host, 500, () => startPetals(host, { kind: 'sakura', density: 'light', wind: 'none' }));
        return { layer: 'front', life: life(MS.wedding, env), sounds: ['fest-wedding-bell'], node };
    },
    test(item, env) {
        const pos = item.result === 'pos';
        const label = pos ? '阳性' : '阴性';
        const sub = pos ? '两道杠' : '一道杠';
        const node = make(env.doc, `igs-dfx igs-dfx-fest igs-dfx-pt ${pos ? 'is-pos' : 'is-neg'}`, `<div class="igs-dfx-fest-veil"></div><div class="igs-dfx-pt-stage"><div class="igs-dfx-pt-stick"><i class="igs-dfx-pt-cap"></i><div class="igs-dfx-pt-body"><div class="igs-dfx-pt-window"><i class="igs-dfx-pt-line is-c"></i><i class="igs-dfx-pt-line is-t"></i></div></div></div><div class="igs-dfx-pt-result"><b>${label}</b><span>${sub}</span></div></div>`);
        const hush = [atFilter(0, 'saturate(1) brightness(1)'), atFilter(0.2, 'saturate(.82) brightness(.96)'), atFilter(0.85, 'saturate(.82) brightness(.96)'), atFilter(1, 'saturate(1) brightness(1)')];
        reactSprite(env, env.speaker, hush, { duration: 2600, delay: 1400 });
        if (pos) reactSprite(env, env.speaker, [at(0, 'translate(0,0) scale(1)'), at(0.25, 'translate(0,-.5%) scale(1.012)'), at(1, 'translate(0,-.5%) scale(1.012)')], { duration: 2400, delay: 1500, easing: 'ease-out' });
        else reactSprite(env, env.speaker, [at(0, 'translate(0,0)'), at(0.5, 'translate(0,.8%)'), at(1, 'translate(0,0)')], { duration: 1800, delay: 1500 });
        return { layer: 'front', life: life(MS.test, env), sounds: [pos ? 'fest-test-pos' : 'fest-test-neg'], node };
    },
    riverlamp(item, env) {
        const wish = item.text ? `<div class="igs-dfx-rl-wish"><span>${esc(item.text)}</span></div>` : '';
        const still = Array.from({ length: 4 }, (_, i) => `<i style="left:${16 + i * 21}%;top:${54 + (i % 2) * 8}%"></i>`).join('');
        const node = make(env.doc, 'igs-dfx igs-dfx-fest igs-dfx-riverlamp is-ancient', `<div class="igs-dfx-fest-veil is-night"></div><div class="igs-dfx-rl-water"><i></i><i></i><i></i></div><div class="igs-dfx-fest-host"></div><div class="igs-dfx-rl-still">${still}</div>${wish}`);
        const host = node.children && node.children[2];
        if (host) {
            afterMount(env, host, 300, () => startLanterns(host, { variant: 'river', count: 7, duration: life(MS.riverlamp - 700, env) }));
        }
        return { layer: 'stage', life: life(MS.riverlamp, env), sounds: ['fest-water'], node };
    },
};
