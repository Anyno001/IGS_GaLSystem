// 通用兽影部件：尾 / 耳 / 角 / 翼的预置 SVG 剪影，按原形名选部件与颜色。立绘变形层（现出原形、九尾、照妖镜）与人外特征贴片共用。
// 形状全是内置路径，不读立绘像素；位置按头部标定（x、y 为头中心，d 为头宽，均为舞台百分比）近似推算。

export const BEAST_PART_PATHS = Object.freeze({
    ear: 'M14 100C10 62 26 22 50 0C74 22 90 62 86 100C70 88 30 88 14 100Z',
    horn: 'M30 100C24 72 34 40 62 4C58 34 70 56 74 100C62 94 44 94 30 100Z',
    tail: 'M40 100C14 76 16 34 52 2C50 26 84 44 74 76C68 92 56 98 40 100Z',
    wing: 'M2 56C14 14 52 0 98 6C84 20 80 30 82 40C70 36 62 42 60 50C50 46 42 52 40 62C28 58 14 62 2 56Z',
});

// ar 为部件高宽比，ox / oy 为转轴（部件根部）在自身盒子里的百分比。
export const BEAST_PART_BOX = Object.freeze({
    ear: Object.freeze({ ar: 1.3, ox: 50, oy: 96 }),
    horn: Object.freeze({ ar: 1.7, ox: 50, oy: 96 }),
    tail: Object.freeze({ ar: 1.9, ox: 40, oy: 98 }),
    wing: Object.freeze({ ar: 0.85, ox: 3, oy: 56 }),
});

const part = (name, extra = {}) => Object.freeze({ part: name, size: 1, ar: BEAST_PART_BOX[name].ar, ...extra });

// 原形名只决定选哪些部件与颜色，认不出的按「耳 + 尾」处理。
const BEAST_TABLE = Object.freeze([
    [/狐|fox/i, { id: 'fox', color: '#ff9a3c', parts: [part('ear', { size: 1.05 }), part('tail', { size: 1.1 })] }],
    [/狼|犬|狗|wolf|dog/i, { id: 'wolf', color: '#9fb4d9', parts: [part('ear'), part('tail', { size: 0.9 })] }],
    [/猫|豹|虎|狮|cat|tiger|lion|panther/i, { id: 'cat', color: '#ffcf5a', parts: [part('ear', { size: 0.95 }), part('tail', { size: 0.95 })] }],
    [/龙|蛟|dragon/i, { id: 'dragon', color: '#5fe0c0', parts: [part('horn', { size: 1.2 }), part('wing', { size: 1.1 }), part('tail', { size: 1.2 })] }],
    [/凤|鸟|鹤|鹰|雀|鸦|bird|phoenix|crow|eagle/i, { id: 'bird', color: '#ff7a4a', parts: [part('wing', { size: 1.15 }), part('tail', { size: 1.1 })] }],
    [/蛇|蟒|snake/i, { id: 'snake', color: '#7fd36a', parts: [part('tail', { size: 1.7 })] }],
    [/鹿|deer/i, { id: 'deer', color: '#d9c28a', parts: [part('horn', { size: 1.6 }), part('ear')] }],
    [/兔|rabbit|hare/i, { id: 'rabbit', color: '#ffd6e6', parts: [part('ear', { size: 0.85, ar: 2.5 }), part('tail', { size: 0.35 })] }],
    [/蝶|蛾|butterfly|moth/i, { id: 'moth', color: '#b98cff', parts: [part('wing', { size: 1.2 })] }],
    [/魔|鬼|妖|恶魔|demon|devil|imp/i, { id: 'demon', color: '#c64bff', parts: [part('horn'), part('wing', { size: 1.1 }), part('tail')] }],
]);
const BEAST_DEFAULT = Object.freeze({ id: 'beast', color: '#b9a6ff', parts: Object.freeze([part('ear'), part('tail')]) });

export function resolveBeast(name) {
    const text = String(name == null ? '' : name).trim();
    const hit = BEAST_TABLE.find(([re]) => re.test(text));
    return { ...(hit ? hit[1] : BEAST_DEFAULT), label: text };
}

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const round = (n) => Math.round(n * 100) / 100;
const colorOf = (value, fallback) => (/^#[0-9a-f]{3,8}$/i.test(String(value)) ? value : fallback);

// 纯函数：anchor 为 { x, y, d }，aspect 为舞台宽高比。返回每个部件的盒子（舞台百分比）、转角与转轴。
// scale 整体放大；only 限定部件名；tailCount 给九尾用（扇形展开，spread 为总张角）。
export function beastLayout(beast, anchor, aspect = 16 / 9, { scale = 1, only = null, tailCount = 0, spread = 0 } = {}) {
    const x = clamp(Number(anchor && anchor.x) || 50, 5, 95);
    const y = clamp(Number(anchor && anchor.y) || 26, 5, 90);
    const d = clamp(Number(anchor && anchor.d) || 14, 6, 40);
    const a = aspect > 0 ? aspect : 16 / 9;
    const hh = d * 1.1 * a;
    const items = [];
    const push = (spec, px, py, w, rot, flip = false, delay = 0) => {
        const box = BEAST_PART_BOX[spec.part];
        const width = round(w * scale * spec.size);
        const height = width * spec.ar * a;
        items.push({
            part: spec.part, left: round(px - width * box.ox / 100), top: round(py - height * box.oy / 100), w: width, ar: spec.ar,
            rot: round(rot), flip, ox: box.ox, oy: box.oy, delay,
        });
    };
    for (const spec of beast.parts) {
        if (only && !only.includes(spec.part)) continue;
        if (spec.part === 'ear') for (const s of [-1, 1]) push(spec, x + s * d * 0.3, y - hh * 0.4, d * 0.62, s * 22);
        else if (spec.part === 'horn') for (const s of [-1, 1]) push(spec, x + s * d * 0.22, y - hh * 0.46, d * 0.34, s * 14, s < 0);
        else if (spec.part === 'wing') for (const s of [-1, 1]) push(spec, x + s * d * 0.35, y + hh * 1.45, d * 2.3, s * -8, s < 0, 60);
        else if (spec.part === 'tail') {
            const rootY = clamp(y + hh * 3, 30, 92);
            const n = clamp(Math.round(tailCount) || 1, 1, 9);
            if (n === 1) push(spec, x + d * 0.5, rootY, d * 1.2, 28, false, 120);
            else {
                const total = spread || Math.min(150, 22 * n);
                for (let i = 0; i < n; i++) {
                    const t = i / (n - 1);
                    push(spec, x + d * 0.1, rootY, d * (1.4 - Math.abs(t - 0.5) * 0.5), -total / 2 + total * t, false, 120 + Math.abs(t - 0.5) * 2 * 160 + i * 40);
                }
            }
        }
    }
    return items;
}

// mode：silhouette 为暗色剪影加彩色描边（兽影），trait 为实色部件加深色描边（人外特征贴片）。颜色只接受十六进制字面量。
export function beastPartsHtml(items, { color = '#b9a6ff', mode = 'silhouette' } = {}) {
    const c = colorOf(color, '#b9a6ff');
    return items.map((it) => {
        const style = `left:${it.left}%;top:${it.top}%;width:${it.w}%;aspect-ratio:1/${it.ar};transform-origin:${it.ox}% ${it.oy}%;transform:rotate(var(--bp-rot)) scaleX(var(--bp-sx));--bp-rot:${it.rot}deg;--bp-sx:${it.flip ? -1 : 1};--bp-c:${c};--bp-delay:${Math.round(it.delay)}ms`;
        return `<i class="igs-bp is-${it.part}${mode === 'trait' ? ' is-trait' : ''}" style="${style}"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${BEAST_PART_PATHS[it.part]}"/></svg></i>`;
    }).join('');
}

// 兽瞳：头部位置一对细长发光的眼。
export function beastEyesHtml(anchor, aspect, color = '#ffd36a') {
    const c = colorOf(color, '#ffd36a');
    const x = clamp(Number(anchor && anchor.x) || 50, 5, 95);
    const y = clamp(Number(anchor && anchor.y) || 26, 5, 90);
    const d = clamp(Number(anchor && anchor.d) || 14, 6, 40);
    const hh = d * 1.1 * (aspect > 0 ? aspect : 16 / 9);
    return [-1, 1].map((s) => `<i class="igs-bp-eye" style="left:${round(x + s * d * 0.17)}%;top:${round(y - hh * 0.02)}%;width:${round(d * 0.14)}%;--bp-c:${c};transform:translate(-50%,-50%) rotate(${s * -14}deg)"></i>`).join('');
}

// 人外特征贴片：耳 / 角 / 尾按头部位置实色叠加，供神话与亲密包按当前形态复用。
export function beastTraitHtml(name, anchor, aspect, opts = {}) {
    const beast = resolveBeast(name);
    const items = beastLayout(beast, anchor, aspect, { scale: opts.scale || 0.9, only: opts.only || ['ear', 'horn', 'tail'] });
    return beastPartsHtml(items, { color: beast.color, mode: 'trait' });
}

export const BEAST_STYLE_TEXT = `
.igs-bp{position:absolute;display:block;pointer-events:none;}
.igs-bp svg{display:block;width:100%;height:100%;overflow:visible;}
.igs-bp path{fill:#0a0a12;stroke:var(--bp-c);stroke-width:1.6;vector-effect:non-scaling-stroke;stroke-linejoin:round;}
.igs-bp.is-trait path{fill:var(--bp-c);stroke:#2a1a14;stroke-width:1.2;}
.igs-bp-eye{position:absolute;aspect-ratio:3/1;border-radius:50%;background:var(--bp-c);box-shadow:0 0 8px var(--bp-c);pointer-events:none;}
`;
