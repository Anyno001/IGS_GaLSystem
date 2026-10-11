// COC与推理包样式（一）：统一设计语言“阴冷、透明、无机质”——冷灰青色细线框、等宽读数、大量负空间；唯一强调色是病态青。
// 无拟物（不画纸、回形针、印章、木板），动效只淡入、细线描出、读数跳变，不弹跳。世界观只换字体族，配色全包统一。
// 本段含：色板与共用样式、关键帧、常驻氛围层、haze 状态、低画质与减少动态效果的收口。
export const COC_CSS_BASE = `
#igs-overlay .igs-coc{--coc-bg:rgba(7,13,15,.58);--coc-line:rgba(176,201,205,.5);--coc-soft:rgba(176,201,205,.22);--coc-tx:#e1eaea;--coc-dim:#97a9ac;--coc-acc:#86cdbf;--coc-void:#030709;--coc-mono:Consolas,"Cascadia Mono","Courier New","Microsoft YaHei UI","PingFang SC","Noto Sans CJK SC",monospace;display:flex;align-items:center;justify-content:center;font-family:var(--coc-mono);color:var(--coc-tx);animation:igs-dfx-fade var(--igs-dfx-life) ease both;}
#igs-overlay .igs-coc.is-ancient,#igs-overlay .igs-coc.is-taisho{--coc-mono:"Songti SC","Noto Serif CJK SC","Source Han Serif SC",SimSun,serif;}
#igs-overlay .igs-coc.is-far-r{justify-content:flex-end;padding-right:max(16px,4%);}
#igs-overlay .igs-coc.is-far-l{justify-content:flex-start;padding-left:max(16px,4%);}
@keyframes igs-coc-in{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}
@keyframes igs-coc-char{to{opacity:1;}}
@keyframes igs-coc-veil{from{opacity:0;}to{opacity:1;}}
@keyframes igs-coc-draw{from{stroke-dashoffset:1;}to{stroke-dashoffset:0;}}
@keyframes igs-coc-grow-x{from{transform:scaleX(0);}to{transform:none;}}
@keyframes igs-coc-jit{0%,100%{transform:none;}20%{transform:translateX(-2px);}40%{transform:translateX(3px);}60%{transform:translateX(-1px);}80%{transform:translateX(2px);}}
@keyframes igs-coc-st-fade{from{opacity:0;}to{opacity:1;}}
#igs-overlay :is(.igs-coc-san-card,.igs-coc-sym-card,.igs-coc-clue-card,.igs-coc-cb,.igs-coc-dg,.igs-coc-rt,.igs-coc-alive-card,.igs-coc-rules-paper,.igs-coc-st-card){box-sizing:border-box;background:var(--coc-bg);border:1px solid var(--coc-line);color:var(--coc-tx);backdrop-filter:blur(3px);animation:igs-coc-in .45s ease-out both;}
#igs-overlay :is(.igs-coc-sym-head,.igs-coc-clue-tag,.igs-coc-cb-tab,.igs-coc-dg-bar span,.igs-coc-rt-head,.igs-coc-alive-title,.igs-coc-rules-title,.igs-coc-bd-tag,.igs-coc-st-title,.igs-coc-san-lab){font-size:12px;letter-spacing:.18em;color:var(--coc-dim);}
#igs-overlay :is(.igs-coc-casebook,.igs-coc-dungeon,.igs-coc-rating,.igs-coc-alive,.igs-coc-rules,.igs-coc-board,.igs-coc-clue,.igs-coc-symptom,.igs-coc-san,.igs-coc-kp){align-items:flex-start;box-sizing:border-box;padding-top:max(16px,7%);padding-bottom:var(--igs-fx-safe);}
@media (max-width:640px){#igs-overlay .igs-coc.is-far-r{padding-right:max(10px,3%);}#igs-overlay .igs-coc.is-far-l{padding-left:max(10px,3%);}}
#igs-overlay .igs-dfx-amb i[class*="igs-coc-amb-"]{position:absolute;display:block;pointer-events:none;}
#igs-overlay .igs-coc-amb-white{inset:0;background:radial-gradient(ellipse 90% 85% at 50% 45%,transparent 50%,rgba(205,222,228,.3) 100%);}
#igs-overlay .igs-coc-amb-grid{inset:0;background-image:linear-gradient(rgba(150,180,190,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(150,180,190,.1) 1px,transparent 1px);background-size:56px 56px;}
#igs-overlay .igs-coc-amb-core{left:25%;right:25%;top:-30%;height:70%;background:radial-gradient(ellipse at 50% 0%,rgba(235,246,250,.22),transparent 70%);animation:igs-coc-breathe 9s ease-in-out infinite alternate;}
@keyframes igs-coc-breathe{from{opacity:.55;}to{opacity:1;}}
#igs-overlay .igs-coc-amb-haze{inset:0;background:linear-gradient(180deg,rgba(140,165,172,.1),rgba(110,136,146,.28) 60%,rgba(82,102,112,.4));}
#igs-overlay .igs-coc-amb-fog{left:-20%;width:140%;background:radial-gradient(ellipse 60% 50% at 30% 70%,rgba(184,204,212,.3),transparent 70%),radial-gradient(ellipse 50% 45% at 75% 60%,rgba(174,196,206,.24),transparent 70%);}
#igs-overlay .igs-coc-amb-fog.is-a{bottom:0;height:38%;animation:igs-coc-fog 38s ease-in-out infinite alternate;}
#igs-overlay .igs-coc-amb-fog.is-b{bottom:6%;height:30%;animation:igs-coc-fog 52s ease-in-out infinite alternate-reverse;}
@keyframes igs-coc-fog{from{transform:translateX(0);}to{transform:translateX(-8%);}}
#igs-overlay .igs-coc-amb-lamp{left:68%;top:12%;width:12%;aspect-ratio:1/1;background:radial-gradient(circle,rgba(150,205,196,.34),transparent 68%);animation:igs-coc-breathe 7s ease-in-out infinite alternate;}
#igs-overlay .igs-dfx-amb.is-retro .igs-coc-amb-haze{background:linear-gradient(180deg,rgba(160,148,124,.08),rgba(126,112,90,.26) 60%,rgba(88,76,60,.38));}
#igs-overlay .igs-coc-amb-pulse-a{left:0;top:0;bottom:0;width:42%;background:linear-gradient(90deg,rgba(134,205,191,.2),transparent);animation:igs-coc-pulse-a 2.4s ease-in-out infinite alternate;}
#igs-overlay .igs-coc-amb-pulse-b{right:0;top:0;bottom:0;width:42%;background:linear-gradient(270deg,rgba(118,146,196,.2),transparent);animation:igs-coc-pulse-b 2.4s ease-in-out infinite alternate;}
@keyframes igs-coc-pulse-a{from{opacity:1;}to{opacity:.1;}}
@keyframes igs-coc-pulse-b{from{opacity:.1;}to{opacity:1;}}
#igs-overlay .igs-coc-amb-tape{left:-10%;top:8%;width:120%;height:14px;background:repeating-linear-gradient(135deg,#aeb9bc 0 14px,#1b2326 14px 28px);transform:rotate(-3deg);opacity:.55;}
#igs-overlay .igs-dfx-amb.is-retro .igs-coc-amb-tape{background:repeating-linear-gradient(135deg,#b4aa90 0 14px,#262219 14px 28px);}
#igs-overlay #igs-stage-motion[data-igs-fx-state="haze"] #igs-bg::before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 50%,transparent 30%,#0a0d0b 105%),radial-gradient(circle,#ffffff 0 .6px,transparent .9px);background-size:100% 100%,7px 9px;opacity:calc(.5 * var(--igs-state-k,1));}
#igs-overlay[data-igs-quality="low"] .igs-coc :is(.igs-coc-san-card,.igs-coc-sym-card,.igs-coc-clue-card,.igs-coc-cb,.igs-coc-dg,.igs-coc-rt,.igs-coc-alive-card,.igs-coc-rules-paper,.igs-coc-st-card,.igs-coc-kp-box){backdrop-filter:none;background:rgba(7,13,15,.78);}
#igs-overlay[data-igs-quality="low"] .igs-coc-sym-edge{animation:none;}
#igs-overlay[data-igs-quality="low"] .igs-coc-amb-core,#igs-overlay[data-igs-quality="low"] .igs-coc-amb-fog,#igs-overlay[data-igs-quality="low"] .igs-coc-amb-lamp,#igs-overlay[data-igs-quality="low"] .igs-coc-amb-pulse-a,#igs-overlay[data-igs-quality="low"] .igs-coc-amb-pulse-b{animation:none;}
#igs-overlay[data-igs-quality="low"] .igs-coc-amb-pulse-b{opacity:0;}
#igs-overlay .igs-coc.is-reduced,#igs-overlay .igs-coc.is-reduced *,#igs-overlay .igs-coc.is-reduced *::after,#igs-overlay .igs-coc.is-reduced *::before{animation:none!important;}
@media (prefers-reduced-motion: reduce){#igs-overlay .igs-dfx-amb i[class*="igs-coc-amb-"]{animation:none!important;}}
`;
