import { ANCIENT_PAPER_TEXTURE } from './fx-ancient-paper-assets.js';

// Approved paper/ink layout, scoped to ancient documents. The modern skins are untouched.
export const ANCIENT_PAPER_STYLE_TEXT = `
#igs-overlay .igs-dfx.igs-dfx-document.is-ancient{inset:0 0 var(--igs-fx-safe,160px);height:var(--igs-fx-vis,calc(100% - 160px));box-sizing:border-box;display:flex;align-items:center;justify-content:center;padding:12px 16px;perspective:900px;animation:none;--igs-document-font:clamp(22px,3vmin,27px);--igs-document-pad-x:20px;--igs-document-pad-y:20px;--igs-document-title-h:0px;--igs-document-max-h:340px;}
#igs-overlay .igs-dfx-document.is-ancient .igs-dfx-document-paper{position:relative;box-sizing:border-box;width:min(82%,calc(var(--igs-document-columns,3) * var(--igs-document-font) * 1.8 + var(--igs-document-pad-x) * 2 + 6px));height:min(100%,var(--igs-document-max-h),calc((var(--igs-document-rows,7) + 1) * var(--igs-document-font) * 1.055 + var(--igs-document-pad-y) * 2 + var(--igs-document-title-h) + 6px));max-width:82%;max-height:100%;min-width:0;min-height:0;padding:var(--igs-document-pad-y) var(--igs-document-pad-x);color:#392e26;background:#eee5d1;transform-origin:right center;animation:igs-dfx-document-unroll var(--igs-dfx-life) cubic-bezier(.3,.7,.2,1) both;filter:drop-shadow(0 6px 8px #0002);clip-path:polygon(.5% .5%,19% .1%,41% .4%,63% .1%,82% .5%,99.5% .1%,99.8% 22%,99.5% 44%,100% 64%,99.5% 84%,99.7% 99.5%,80% 99.9%,58% 99.5%,38% 100%,19% 99.6%,.3% 99.8%,.5% 78%,.1% 60%,.5% 41%,.1% 21%);}
#igs-overlay .igs-dfx-document.is-ancient .igs-dfx-document-paper::before{content:'';position:absolute;inset:0;z-index:0;background-image:url('${ANCIENT_PAPER_TEXTURE}');background-size:220% 220%;background-position:60% 50%;opacity:.68;pointer-events:none;}
#igs-overlay .igs-dfx-document.is-ancient .igs-dfx-document-scroll{position:relative;z-index:1;height:calc(100% - var(--igs-document-title-h));padding:3px;box-sizing:border-box;overflow-x:auto;overflow-y:hidden;direction:rtl;scrollbar-width:none;-ms-overflow-style:none;overscroll-behavior:contain;touch-action:pan-x;scroll-behavior:auto;cursor:grab;user-select:none;-webkit-user-select:none;pointer-events:auto;}
#igs-overlay .igs-dfx-document.is-ancient .igs-dfx-document-scroll::-webkit-scrollbar{display:none;width:0;height:0;}
#igs-overlay .igs-dfx-document.is-ancient .igs-dfx-document-scroll:focus-visible{outline:1px solid #9b7951;outline-offset:2px;}
#igs-overlay .igs-dfx-document.is-ancient .igs-dfx-document-text{direction:ltr;writing-mode:vertical-rl;text-orientation:mixed;text-align:start;height:100%;min-width:100%;font:400 var(--igs-document-font)/1.8 'IGS-MaShanZheng','LXGW WenKai','KaiTi','STKaiti',serif;font-synthesis:none;letter-spacing:.055em;white-space:pre-wrap;overflow-wrap:anywhere;}
#igs-overlay .igs-dfx-document.is-ancient .igs-dfx-document-ink{opacity:0;animation:igs-dfx-document-ink .26s ease-out both;}
#igs-overlay .igs-dfx-document.is-ancient .igs-dfx-document-sign-column{display:inline-flex;writing-mode:vertical-rl;flex-direction:row;flex-wrap:nowrap;align-items:center;justify-content:flex-end;height:100%;vertical-align:top;break-inside:avoid;page-break-inside:avoid;}
#igs-overlay .igs-dfx-document.is-ancient .igs-dfx-document-tail{display:inline-flex;writing-mode:vertical-rl;flex-direction:row;flex-wrap:nowrap;align-items:center;gap:6px;flex:0 1 auto;max-height:75%;min-height:0;white-space:normal;break-inside:avoid;}
#igs-overlay .igs-dfx-document.is-ancient .igs-dfx-document-sign{font:400 20px/1.3 'IGS-MaShanZheng','LXGW WenKai','KaiTi','STKaiti',serif;color:#785c45;writing-mode:vertical-rl;flex:0 1 auto;min-height:0;white-space:normal;overflow-wrap:anywhere;}
#igs-overlay .igs-dfx-document.is-ancient .igs-dfx-document-lower-inset{display:block;flex:0 0 25%;width:1px;pointer-events:none;}
#igs-overlay .igs-dfx-document.is-ancient .igs-dfx-document-seal{display:block;flex:none;position:relative;overflow:hidden;width:18px;height:18px;writing-mode:horizontal-tb;pointer-events:none;}
#igs-overlay .igs-dfx-document.is-ancient .igs-dfx-document-seal img{position:absolute;display:block;width:27.87px;height:27.87px;left:-4.94px;top:-5.23px;max-width:none;max-height:none;object-fit:contain;pointer-events:none;}
#igs-overlay .igs-dfx-document.is-ancient .igs-dfx-document-seal[data-shape="rect"]{width:17px;height:30px;}
#igs-overlay .igs-dfx-document.is-ancient .igs-dfx-document-seal[data-shape="rect"] img{width:32px;height:48px;left:-7.75px;top:-9px;}
#igs-overlay .igs-dfx-document.is-ancient .igs-dfx-document-heading{color:#8a2a1c;font-size:.85em;letter-spacing:.16em;}
#igs-overlay .igs-dfx-document.igs-dfx-note.is-ancient{--igs-document-pad-x:14px;--igs-document-pad-y:14px;--igs-document-max-h:230px;}
#igs-overlay .igs-dfx-document.igs-dfx-note.is-ancient .igs-dfx-document-paper{max-width:68%;}
#igs-overlay .igs-dfx-document.igs-dfx-edict.is-ancient:not(.is-notice) .igs-dfx-document-paper{background:#d6ad4f;color:#3c2915;width:min(96%,calc(var(--igs-document-columns,3) * var(--igs-document-font) * 1.8 + var(--igs-document-pad-x) * 2 + 6px));max-width:96%;}
#igs-overlay .igs-dfx-document.igs-dfx-edict.is-ancient:not(.is-notice) .igs-dfx-document-paper::before{mix-blend-mode:multiply;opacity:.52;}
#igs-overlay .igs-dfx-document.is-ancient.is-notice{--igs-document-title-h:56px;--igs-document-pad-x:24px;--igs-document-pad-y:20px;}
#igs-overlay .igs-dfx-document.is-ancient.is-notice .igs-dfx-document-paper::after{content:'';position:absolute;inset:9px;border:1px solid #66543c;outline:1px solid #66543c;outline-offset:3px;pointer-events:none;z-index:2;}
#igs-overlay .igs-dfx-document.is-ancient .igs-dfx-document-notice-title{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;height:var(--igs-document-title-h);box-sizing:border-box;padding-bottom:8px;writing-mode:horizontal-tb;text-align:center;font:400 clamp(32px,4vmin,40px)/1.1 'IGS-MaShanZheng','LXGW WenKai','KaiTi','STKaiti',serif;letter-spacing:.24em;text-indent:.24em;color:#392e26;}
#igs-overlay .igs-dfx-document.is-ancient .igs-dfx-document-rod{top:0;bottom:0;width:4px;animation:none;}
#igs-overlay .igs-dfx-omikuji.is-ancient .igs-dfx-slip{background-color:#eee5d1;background-image:url('${ANCIENT_PAPER_TEXTURE}');background-size:220% 220%;background-position:60% 50%;color:#392e26;border:1px solid #c5b492;font-family:'IGS-MaShanZheng','LXGW WenKai','KaiTi','STKaiti',serif;}
@keyframes igs-dfx-document-unroll{0%{opacity:0;transform:scaleX(.15)}10%{opacity:1;transform:scaleX(1)}92%{opacity:1;transform:none}100%{opacity:0;transform:translateY(-12px)}}
@keyframes igs-dfx-document-ink{from{opacity:0}to{opacity:1}}
#igs-overlay .igs-dfx-document.is-ancient.is-reduced .igs-dfx-document-paper,#igs-overlay .igs-dfx-document.is-ancient.is-reduced .igs-dfx-document-ink{animation:none;opacity:1;transform:none;}
@media(max-width:600px){#igs-overlay .igs-dfx.igs-dfx-document.is-ancient{padding:10px 12px;}}
@media(prefers-reduced-motion:reduce){#igs-overlay .igs-dfx-document.is-ancient .igs-dfx-document-paper,#igs-overlay .igs-dfx-document.is-ancient .igs-dfx-document-ink{animation:none;opacity:1;transform:none;}}
`;
