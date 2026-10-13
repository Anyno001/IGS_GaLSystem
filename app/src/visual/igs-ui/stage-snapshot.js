// 读取当前舞台上的立绘与背景（只读 DOM，跟随服装与表情），并复刻、裁切、异化。
// 外部图床不允许 canvas 读像素，也不能用 mask-image:url：一律复刻元素自身的 background 样式。
import { FALLBACK_HEAD, HEAD_ASPECT, headToMarker, measureStage, peekSpriteHead, spriteDrawRect } from './fx-anchor.js';
import { playSpriteSpec } from './sprite-actions.js';

export function readStageBackground(root) {
    const pick = (el) => {
        if (!el || !el.style) return null;
        return {
            image: el.style.backgroundImage || '',
            size: el.style.backgroundSize || '',
            position: el.style.backgroundPosition || '',
            visible: el.style.display !== 'none' && Boolean(el.style.backgroundImage),
            // 站位「背对」：陪衬带 data-igs-cast-flip、说话人带 data-igs-sprite-flip，合成图同样水平镜像。
            flip: typeof el.hasAttribute === 'function' && (el.hasAttribute('data-igs-cast-flip') || el.hasAttribute('data-igs-sprite-flip')),
        };
    };
    const rect = typeof root.getBoundingClientRect === 'function' ? root.getBoundingClientRect() : null;
    const aspect = rect && rect.width > 0 && rect.height > 0 ? rect.width / rect.height : 16 / 9;
    const castLayer = root.querySelector('#igs-cast');
    const cast = castLayer
        ? Array.from(castLayer.children || []).filter((el) => !el.hasAttribute('data-igs-cast-leaving')).map(pick).filter((layer) => layer && layer.visible)
        : [];
    return { bg: pick(root.querySelector('#igs-bg')), sprite: pick(root.querySelector('#igs-sprite')), cast, aspect };
}

export function layerStyle(layer) {
    if (!layer || !layer.image) return '';
    const parts = [`background-image:${layer.image.replace(/"/g, '&quot;')}`];
    if (layer.size) parts.push(`background-size:${layer.size}`);
    if (layer.position) parts.push(`background-position:${layer.position}`);
    if (layer.flip) {
        // 与舞台一致：绕图的中心水平镜像（原点 = posX + scale × (50 - posX) / 100），否则合成图会整体平移。
        const posX = parseFloat(String(layer.position || '').split(/\s+/)[0]);
        const size = parseFloat(String(layer.size || ''));
        const origin = Number.isFinite(posX) && Number.isFinite(size) ? Math.round((posX + size * (50 - posX) / 100) * 100) / 100 : 50;
        parts.push(`transform:scaleX(-1)`, `transform-origin:${origin}% 100%`);
    }
    return parts.join(';');
}

// 找到指名角色的立绘节点：省略或就是说话人时是 #igs-sprite，否则在同屏陪衬里按角色名找；找不到退回说话人。
export function spriteElOf(env, who) {
    const name = String(who || '').trim();
    if (name && name !== env.speaker) {
        const hit = Array.from(env.root.querySelectorAll('.igs-cast-sprite')).find((el) => el.getAttribute('data-igs-cast-char') === name);
        if (hit) return hit;
    }
    return env.root.querySelector('#igs-sprite');
}

// 立绘 background-position 横向百分比；读不到时居中，并收在 10–90 之间避免贴边。
export function spritePosX(layer) {
    const m = layer && layer.visible ? String(layer.position || '').match(/(-?\d+(?:\.\d+)?)%/) : null;
    const x = m ? Number(m[1]) : 50;
    return Math.max(10, Math.min(90, Number.isFinite(x) ? x : 50));
}

function pickLayer(el) {
    if (!el || !el.style) return null;
    const image = el.style.backgroundImage || '';
    if (!image || el.style.display === 'none') return null;
    const flip = typeof el.hasAttribute === 'function' && (el.hasAttribute('data-igs-cast-flip') || el.hasAttribute('data-igs-sprite-flip'));
    return { image, size: el.style.backgroundSize || '', position: el.style.backgroundPosition || '', visible: true, flip };
}

const cssValue = (value) => String(value).replace(/[;{}<>]/g, '');

// 复刻指名角色当前的立绘：背景图、尺寸、位置、翻转都取自 DOM，所以跟随服装与表情。
// crop 是 resolveRegionCrop 的结果（{size, x, y}），给了就换成裁切后的背景尺寸与位置；flip 强制水平镜像；filter 是 CSS filter 串。
// 没有可见立绘返回 null。节点是 position:absolute 铺满父容器的 div，调用方负责挂载与回收。
export function cloneSpriteLayer(root, who, { speaker = '', crop = null, flip = null, filter = '' } = {}) {
    if (!root || typeof root.querySelector !== 'function') return null;
    const doc = root.ownerDocument;
    if (!doc || typeof doc.createElement !== 'function') return null;
    const layer = pickLayer(spriteElOf({ root, speaker }, who));
    if (!layer) return null;
    const node = doc.createElement('div');
    node.className = 'igs-clone-sprite';
    node.setAttribute('aria-hidden', 'true');
    const parts = ['position:absolute', 'inset:0', 'background-repeat:no-repeat', 'pointer-events:none'];
    if (crop && Number.isFinite(Number(crop.size))) {
        parts.push(`background-image:${layer.image.replace(/"/g, '&quot;')}`, `background-size:${Number(crop.size)}% auto`, `background-position:${Number(crop.x)}% ${Number(crop.y)}%`);
        if (flip === true || (flip === null && layer.flip)) parts.push('transform:scaleX(-1)');
    } else {
        const shown = flip === null ? layer : { ...layer, flip: flip === true };
        parts.push(layerStyle(shown));
    }
    if (filter) parts.push(`filter:${cssValue(filter)}`);
    // setAttribute 不解码实体：layerStyle 为 innerHTML 场景转义的 &quot; 要还原，否则 url(&quot;..&quot;) 会变成无效地址、复刻层不出图。
    node.setAttribute('style', parts.filter(Boolean).join(';').replace(/&quot;/g, '"'));
    return node;
}

// 局部区域相对头部标定的取景：dx 为中心相对头中心的偏移（头宽单位），dy 为中心距头顶（头高单位），span 为取景宽度（头宽单位）。
// 全部按头位与立绘比例推算，不做像素扫描；手与腰只是大致位置。
export const REGION_SPECS = Object.freeze({
    face: Object.freeze({ dx: 0, dy: 0.5, span: 2.4 }),
    eye: Object.freeze({ dx: 0, dy: 0.42, span: 1.3 }),
    lip: Object.freeze({ dx: 0, dy: 0.78, span: 1.0 }),
    neck: Object.freeze({ dx: 0, dy: 1.18, span: 1.5 }),
    hand: Object.freeze({ dx: 0.55, dy: 3.3, span: 1.7 }),
    waist: Object.freeze({ dx: 0, dy: 3.4, span: 2.8 }),
});
export const REGION_RATIO = 0.34;

// 纯函数：sprite 为 { head:{x,top,w}, aspect(原图高宽比) }，或带 url 时读已探测的头位缓存。
// 返回 { size, x, y }：background-size 占取景框宽度的 %、background-position 的 %，让指定区域落在取景框中心。
export function resolveRegionCrop(sprite, region = 'face', ratio = REGION_RATIO, doc) {
    const spec = REGION_SPECS[region] || REGION_SPECS.face;
    const probed = sprite && sprite.url ? peekSpriteHead(sprite.url, doc) : null;
    const head = (sprite && sprite.head && Number(sprite.head.w) > 0 ? sprite.head : null) || (probed && probed.head) || FALLBACK_HEAD;
    const rawAspect = sprite && Number(sprite.aspect) > 0 ? Number(sprite.aspect) : (probed && probed.naturalW > 0 ? probed.naturalH / probed.naturalW : 0);
    const a = rawAspect > 0 ? rawAspect : 1.6;
    const w = Math.max(0.02, Number(head.w));
    const k = 1 / (w * spec.span);
    const imgH = k * a;
    const cx = Number(head.x) + spec.dx * w;
    const px = Math.abs(1 - k) < 1e-6 ? 50 : ((0.5 - cx * k) / (1 - k)) * 100;
    const centerY = Number(head.top) * imgH + w * k * HEAD_ASPECT * spec.dy;
    const py = Math.abs(ratio - imgH) < 1e-6 ? 50 : ((ratio / 2 - centerY) / (ratio - imgH)) * 100;
    const round = (n) => Math.round(n * 100) / 100;
    return { size: round(k * 100), x: round(px), y: round(py) };
}

// 异化：对元素叠 CSS filter 与 clip-path 错位，WAAPI 叠加，结束自动还原。
// glitch 故障、negative 负片、blackeye 压黑、shift 错位、tremble 威压颤抖。
export const WARP_SPECS = Object.freeze({
    glitch: Object.freeze({ duration: 900, easing: 'steps(6,end)', filter: ['hue-rotate(0deg)', 'hue-rotate(70deg) saturate(1.6)', 'hue-rotate(-50deg)', 'hue-rotate(0deg) contrast(1.3)', 'hue-rotate(40deg)', 'hue-rotate(0deg)'], clip: ['inset(0 0 0 0)', 'inset(12% 0 58% 0)', 'inset(0 0 0 0)', 'inset(46% 0 20% 0)', 'inset(0 0 0 0)', 'inset(0 0 0 0)'] }),
    negative: Object.freeze({ duration: 1200, easing: 'ease-in-out', filter: ['invert(0)', 'invert(1) hue-rotate(180deg)', 'invert(1) hue-rotate(180deg)', 'invert(0)'], clip: null }),
    blackeye: Object.freeze({ duration: 1400, easing: 'ease-in-out', filter: ['brightness(1)', 'brightness(.55) contrast(1.25)', 'brightness(.55) contrast(1.25)', 'brightness(1)'], clip: null }),
    shift: Object.freeze({ duration: 700, easing: 'steps(4,end)', filter: null, clip: ['inset(0 0 0 0)', 'inset(0 0 55% 0)', 'inset(45% 0 0 0)', 'inset(0 0 0 0)'], frames: ['translate(0,0)', 'translate(-1.6%,0)', 'translate(1.6%,0)', 'translate(0,0)'] }),
    tremble: Object.freeze({ duration: 520, easing: 'linear', filter: null, clip: null, frames: ['translate(0,0)', 'translate(.4%,0)', 'translate(-.4%,0)', 'translate(.4%,0)', 'translate(-.4%,0)', 'translate(0,0)'] }),
});

// 返回已开始的动画数组（可能为空）；减少动态效果、元素没有 WAAPI 或样式不认得时返回空数组。
export function playWarp(el, kind, { reduced = false } = {}) {
    const spec = Object.hasOwn(WARP_SPECS, kind) ? WARP_SPECS[kind] : null;
    if (!spec || !el || reduced || typeof el.animate !== 'function') return [];
    const out = [];
    try {
        if (spec.filter) {
            out.push(el.animate(spec.filter.map((filter) => ({ filter })), { duration: spec.duration, easing: spec.easing, composite: 'add', fill: 'none' }));
        }
        if (spec.clip) {
            out.push(el.animate(spec.clip.map((clipPath) => ({ clipPath })), { duration: spec.duration, easing: spec.easing, fill: 'none' }));
        }
    } catch {
        return out;
    }
    if (spec.frames) {
        const moved = playSpriteSpec(el, { duration: spec.duration, easing: spec.easing, frames: spec.frames });
        if (moved) out.push(moved);
    }
    return out;
}

function urlOfBackground(image) {
    const m = String(image || '').match(/url\((['"]?)(.*?)\1\)/);
    return m ? m[2].replace(/\\(["\\])/g, '$1') : '';
}

// 指名角色头部中心在舞台上的位置（百分比），d 是头宽占舞台宽的百分比。
// 有头位探测缓存时按立绘绘制矩形精确换算，否则退回横向 background-position 与默认高度。
export function resolveHeadAnchor(env, who) {
    const layer = pickLayer(spriteElOf(env, who));
    const fallback = { x: spritePosX(layer), y: 26, d: 14 };
    if (!layer) return fallback;
    const motion = env.root.querySelector('#igs-stage-motion');
    const geo = motion ? measureStage(motion) : null;
    const probed = peekSpriteHead(urlOfBackground(layer.image), env.root.ownerDocument);
    if (!geo || !probed || !(probed.naturalW > 0)) return fallback;
    const scale = parseFloat(String(layer.size || '').split(/\s+/)[1]);
    const pos = String(layer.position || '').split(/\s+/).map(parseFloat);
    const rect = spriteDrawRect(geo.stageW, geo.stageH, { naturalW: probed.naturalW, naturalH: probed.naturalH, scale: Number.isFinite(scale) ? scale : 100, posX: Number.isFinite(pos[0]) ? pos[0] : 50, posY: Number.isFinite(pos[1]) ? pos[1] : 100 });
    if (!rect) return fallback;
    const head = probed.head || FALLBACK_HEAD;
    const marker = headToMarker(layer.flip ? { ...head, x: 1 - Number(head.x) } : head, rect);
    const round = (n) => Math.round(n * 10) / 10;
    return { x: round(marker.cx / geo.stageW * 100), y: round(marker.cy / geo.stageH * 100), d: round(marker.d / geo.stageW * 100) };
}
