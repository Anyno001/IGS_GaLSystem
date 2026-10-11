// 持续状态滤镜：#igs-stage-motion[data-igs-fx-state=<类型>] 时，背景与立绘的 filter 在原有场景调色变量后面串上状态滤镜，
// 而不是覆盖它们。边缘脉动是背景上的实色径向渐变伪元素，只动 opacity；低画质与减少动态效果时静态。
// 题材包新增类型：在清单 states 里给 { filter, edge }，由 stateRuleText 生成同样的规则。
export const STATE_FILTERS = Object.freeze({
    drunk: Object.freeze({ filter: 'hue-rotate(8deg) saturate(1.2) blur(.6px)', edge: '#ffb26b' }),
    poison: Object.freeze({ filter: 'hue-rotate(60deg) saturate(1.3) brightness(.92)', edge: '#4fa338' }),
    hurt: Object.freeze({ filter: 'saturate(.75) contrast(1.1)', edge: '#b81d1d' }),
    insane: Object.freeze({ filter: 'contrast(1.25) saturate(1.4) hue-rotate(-12deg)', edge: '#6a1b9a' }),
    drug: Object.freeze({ filter: 'hue-rotate(40deg) saturate(1.6)', edge: '#e04bd6' }),
    uncanny: Object.freeze({ filter: 'grayscale(.45) contrast(1.2) brightness(.9)', edge: '#1b2a1b' }),
    heat: Object.freeze({ filter: 'saturate(1.25) brightness(1.03) sepia(.2)', edge: '#ff6f91' }),
    rut: Object.freeze({ filter: 'saturate(1.2) brightness(.96)', edge: '#b3262e' }),
    fever: Object.freeze({ filter: 'sepia(.25) saturate(1.2) brightness(1.04)', edge: '#ff8a3d' }),
    chill: Object.freeze({ filter: 'saturate(.7) brightness(.97) hue-rotate(-14deg)', edge: '#7fb8ff' }),
});

const SAFE = /^[a-z]+$/;
const SAFE_FILTER = /^[a-z0-9(). %,-]+$/i;
const SAFE_COLOR = /^#[0-9a-f]{3,8}$/i;

// 单个类型的规则：背景 / 立绘 / 同屏陪衬三处 filter 串入调色变量，边缘伪元素脉动。参数不合规返回空串。
export function stateRuleText(id, { filter, edge }) {
    if (!SAFE.test(id) || !SAFE_FILTER.test(String(filter || '')) || !SAFE_COLOR.test(String(edge || ''))) return '';
    const at = `#igs-overlay #igs-stage-motion[data-igs-fx-state="${id}"]`;
    return [
        `${at} #igs-bg{filter:brightness(var(--igs-bg-brightness,1)) var(--igs-grade-bg,) ${filter};-webkit-filter:brightness(var(--igs-bg-brightness,1)) var(--igs-grade-bg,) ${filter};}`,
        `${at} #igs-sprite:not(.igs-sprite-editing){filter:var(--igs-sprite-dim,) var(--igs-grade-sprite,) var(--igs-sprite-enhance,) ${filter};-webkit-filter:var(--igs-sprite-dim,) var(--igs-grade-sprite,) var(--igs-sprite-enhance,) ${filter};}`,
        `${at} #igs-cast{filter:var(--igs-grade-sprite,) ${filter};-webkit-filter:var(--igs-grade-sprite,) ${filter};}`,
        `${at} #igs-bg::after{--igs-state-edge:${edge};}`,
    ].join('\n');
}

export const FX_STATE_BASE_STYLE_TEXT = `
#igs-overlay #igs-stage-motion[data-igs-fx-state] #igs-bg::after{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 50%,transparent 52%,var(--igs-state-edge,#000) 130%);opacity:calc(.3 * var(--igs-state-k,1));animation:igs-state-pulse 3.6s ease-in-out infinite;}
#igs-overlay #igs-stage-motion[data-igs-fx-state-level="light"]{--igs-state-k:.6;}
#igs-overlay #igs-stage-motion[data-igs-fx-state-level="medium"]{--igs-state-k:1;}
#igs-overlay #igs-stage-motion[data-igs-fx-state-level="heavy"]{--igs-state-k:1.5;}
#igs-overlay[data-igs-quality="low"] #igs-stage-motion[data-igs-fx-state] #igs-bg::after{animation:none;}
@keyframes igs-state-pulse{0%,100%{opacity:calc(.2 * var(--igs-state-k,1));}50%{opacity:calc(.42 * var(--igs-state-k,1));}}
@media (prefers-reduced-motion: reduce){#igs-overlay #igs-stage-motion[data-igs-fx-state] #igs-bg::after{animation:none!important;}}
`;

export function fxStateStyleText(extra = {}) {
    const rules = Object.entries({ ...STATE_FILTERS, ...extra }).map(([id, spec]) => stateRuleText(id, spec)).filter(Boolean);
    return `${FX_STATE_BASE_STYLE_TEXT}\n${rules.join('\n')}`;
}
