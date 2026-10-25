// Approved A cloud-shoulder panels: warm paper, brown hairlines and dark brush text.
// Ancient surfaces deliberately keep this palette across skins; modern frames are unchanged.
import { ANCIENT_PAPER_TEXTURE } from './fx-ancient-paper-assets.js';

const SURFACES = ['.igs-bt.is-ancient .igs-panel', '.igs-bt.is-ancient .igs-bt-count-card', '.igs-pl.is-ancient .igs-pl-q-paper'];
const INK = '#352014';
const RED = '#b22620';
const svgUrl = (body) => `url("data:image/svg+xml,${encodeURIComponent(body)}")`;
// All curled paths stay within the 50px corner slice. Only straight lines cross
// the 50..150 centre strips, so widening a card can never stretch a cloud curl.
const CORNER = '<path d="M50 4H35C28 4 25 8 24 14C17 12 12 17 13 23C7 24 4 29 4 36V50"/><path d="M50 8H35C31 8 29 10 29 14C29 20 21 22 20 17C20 14 24 13 25 16M23 24C23 30 15 32 14 27C13 24 17 22 19 25M8 50V36C8 31 10 28 14 28"/>';
const FRAME = svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path fill="#f6efe0" d="M35 1H165Q176 1 179 12Q190 11 190 22Q199 24 199 36V164Q199 176 190 178Q190 189 179 188Q176 199 165 199H35Q24 199 21 188Q10 189 10 178Q1 176 1 164V36Q1 24 10 22Q10 11 21 12Q24 1 35 1Z"/><g fill="none" stroke="#7c5a3c" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round">${CORNER}<g transform="translate(200 0) scale(-1 1)">${CORNER}</g><g transform="translate(0 200) scale(1 -1)">${CORNER}</g><g transform="translate(200 200) scale(-1 -1)">${CORNER}</g><path d="M50 4H150M50 8H150M4 50V150M8 50V150M196 50V150M192 50V150M50 196H150M50 192H150"/></g></svg>`);
const DIVIDER = svgUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 12"><path d="M5 6H107M133 6H235M120 1l5 5-5 5-5-5Z" fill="none" stroke="#a68b65" stroke-width=".8"/><path d="m120 4 2 2-2 2-2-2Z" fill="#a68b65"/></svg>');
// Image data lives once on the overlay; per-skin CSS only references the variables.
export const ANCIENT_PANEL_TEXTURE_STYLE_TEXT = `#igs-overlay{--igs-ancient-panel-paper:url("${ANCIENT_PAPER_TEXTURE}");--igs-ancient-panel-frame:${FRAME};--igs-ancient-panel-divider:${DIVIDER};}`;

export function getAncientPanelFrameStyleText(roots, frame) {
    if (!Array.isArray(roots) || !roots.length || !frame) return '';
    const select = (parts, suffix = '') => roots.map((root) => `${root} :is(${parts.join(',')})${suffix}`).join(',');
    const surface = (suffix = '') => select(SURFACES, suffix);
    return [
        `${surface()}{position:relative;isolation:isolate;box-sizing:border-box;background:transparent;border:0;border-radius:0;box-shadow:none;outline:0;backdrop-filter:none;-webkit-backdrop-filter:none;color:${INK};text-shadow:none;font-family:"IGS-MaShanZheng","LXGW WenKai","KaiTi",serif;font-weight:400;line-height:1.4;padding:32px 42px;min-width:0;overflow-wrap:anywhere;}`,
        `${surface('::before')}{content:"";display:block;position:absolute;transform:none;margin:0;inset:0;width:auto;height:auto;box-sizing:border-box;border:48px solid transparent;border-image:var(--igs-ancient-panel-frame) 50 fill / 48px / 0 stretch;border-radius:0;background:none;opacity:1;box-shadow:none;filter:none;-webkit-mask:none;mask:none;pointer-events:none;z-index:-2;}`,
        `${surface('::after')}{content:"";display:block;position:absolute;inset:10px 28px;transform:none;margin:0;width:auto;height:auto;border:0;border-radius:0;background:var(--igs-ancient-panel-paper) 60% 50% / 220% 220%;opacity:.19;mix-blend-mode:multiply;filter:none;box-shadow:none;-webkit-mask:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);mask:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);pointer-events:none;z-index:-1;}`,
        `${select(['.igs-bt.is-ancient .igs-bt-panel-wrap'])}{width:max-content;min-width:min(270px,100%);max-width:min(360px,100%);}`,
        `${select(['.igs-bt.is-ancient .igs-panel'])}{display:flex;flex-direction:column;width:100%;max-width:100%;max-height:calc(var(--igs-fx-vis,380px) - 58px);}`,
        `${select(['.igs-bt.is-ancient .igs-panel-rows'])}{min-height:0;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;pointer-events:auto;}`,
        `${select(['.igs-bt.is-ancient .igs-panel-title'])}{flex:0 1 auto;max-height:2.8em;overflow:auto;}`,
        `${select(['.igs-bt.is-ancient .igs-bt-panel-chip'])}{flex:none;}`,
        `${select(['.igs-bt.is-ancient .igs-ancient-panel-scroll','.igs-pl.is-ancient .igs-ancient-panel-scroll'])}{pointer-events:auto;overscroll-behavior:contain;scrollbar-width:thin;}`,
        `${select(['.igs-bt.is-ancient .igs-bt-count-label'])}{max-height:3.6em;overflow:auto;max-width:100%;}`,
        `${select(['.igs-pl.is-ancient .igs-pl-q-title'])}{max-height:4.2em;overflow:auto;}`,
        `${select(['.igs-pl.is-ancient .igs-pl-q-reward'])}{max-height:4.2em;overflow:auto;}`,

        `${select(['.igs-bt.is-ancient .igs-bt-panel-chip','.igs-pl.is-ancient .igs-pl-q-head'])}{position:relative;display:block;color:${INK};text-shadow:none;font:400 24px/1.3 "IGS-MaShanZheng","LXGW WenKai",serif;text-align:center;letter-spacing:.06em;margin:0 0 10px;padding:0;border:0;opacity:1;}`,
        `${select(['.igs-bt.is-ancient .igs-bt-panel-chip','.igs-pl.is-ancient .igs-pl-q-head'],'::after')}{content:"";display:block;width:100%;height:10px;margin-top:7px;background:var(--igs-ancient-panel-divider) center/100% 10px no-repeat;}`,
        `${select(['.igs-bt.is-ancient .igs-panel-title'])}{color:${INK};font-weight:400;font-size:19px;line-height:1.35;text-align:center;letter-spacing:.06em;border:0;text-shadow:none;padding:0;margin:0 0 10px;overflow-wrap:anywhere;}`,
        `${select(['.igs-bt.is-ancient .igs-panel-row'])}{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px 14px;align-items:start;padding:3px 0;font-size:19px;line-height:1.4;}`,
        `${select(['.igs-bt.is-ancient .igs-panel-k','.igs-bt.is-ancient .igs-panel-v'])}{min-width:0;max-width:100%;white-space:normal;overflow-wrap:anywhere;color:${INK};opacity:1;}`,
        `${select(['.igs-bt.is-ancient .igs-panel-row.is-long-content'])}{grid-template-columns:minmax(0,1fr);gap:4px;}`,
        `${select(['.igs-bt.is-ancient .igs-panel-row > .igs-panel-v:only-child'])}{grid-column:1/-1;text-align:center;}`,
        `${select(['.igs-bt.is-ancient .igs-panel-row.is-good .igs-panel-v','.igs-bt.is-ancient .igs-panel-row.is-bad .igs-panel-v','.igs-bt.is-ancient .igs-bt-count-delta'])}{color:${RED};}`,
        `${select(['.igs-bt.is-ancient .igs-bt-count-card'])}{display:flex;flex-direction:column;align-items:center;gap:3px;min-width:min(174px,100%);max-width:min(290px,100%);text-align:center;padding:28px 40px;}`,
        `${select(['.igs-bt.is-ancient .igs-bt-count-label'])}{color:${INK};font-size:21px;line-height:1.2;opacity:1;}`,
        `${select(['.igs-bt.is-ancient .igs-bt-count-num'])}{color:${INK};font:400 39px/1.1 "IGS-MaShanZheng","LXGW WenKai",serif;}`,
        `${select(['.igs-bt.is-ancient .igs-bt-count-unit'])}{color:${INK};font-size:30px;opacity:1;}`,
        `${select(['.igs-bt.is-ancient .igs-bt-count-delta'])}{font-size:23px;line-height:1.2;opacity:1;}`,
        `${select(['.igs-pl.is-ancient .igs-pl-q-paper'])}{padding-bottom:49px;}`,
        `${select(['.igs-pl.is-ancient .igs-pl-q-title','.igs-pl.is-ancient .igs-pl-q-reward','.igs-pl.is-ancient .igs-pl-stamp'])}{color:${INK};font-weight:400;overflow-wrap:anywhere;}`,
    ].join('\n');
}
