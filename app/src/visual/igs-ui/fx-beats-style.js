// 戏剧节拍的样式：寿命由 --igs-dfx-life 驱动。去拟物：细线框、极淡半透明底、舒展字距的排版，光效只用柔光；
// is-reduced 时静态展示（动画全关、动效装饰隐藏），低画质只收掉粒子、光环与扫光。
export const BEATS_STYLE_TEXT = `
#igs-overlay .igs-bt{animation:igs-bt-life var(--igs-dfx-life) ease both;}
@keyframes igs-bt-life{0%{opacity:0}7%{opacity:1}90%{opacity:1}100%{opacity:0}}
@keyframes igs-bt-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}

#igs-overlay .igs-bt-reveal{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:calc(var(--igs-fx-safe) + 6%);box-sizing:border-box;}
#igs-overlay .igs-bt-reveal-veil{position:absolute;inset:0;background:rgba(10,5,2,1);opacity:.55;animation:igs-bt-veil var(--igs-dfx-life) ease both;}
#igs-overlay .igs-bt-reveal-beam{position:absolute;top:0;bottom:0;width:26%;transform:translateX(-50%);background:linear-gradient(90deg,transparent,rgba(255,220,140,.18) 50%,transparent);opacity:.7;animation:igs-bt-beam 2200ms ease both;}
#igs-overlay .igs-bt-reveal-scan{position:absolute;left:0;right:0;top:0;height:1px;background:#ffffffb3;box-shadow:0 0 12px 1px #ffffff66;opacity:0;animation:igs-bt-scan 900ms ease-in-out 200ms both;}
#igs-overlay .igs-bt-reveal-big{position:relative;display:flex;font-size:clamp(28px,7vmin,64px);font-weight:500;letter-spacing:.32em;text-indent:.32em;color:#fbf7ee;font-family:"Huiwen Mincho","Source Han Serif CN","Noto Serif SC",serif;text-shadow:0 1px 16px #000000b3;}
#igs-overlay .igs-bt-reveal-big span{display:inline-block;animation:igs-bt-slam 520ms cubic-bezier(.2,.8,.3,1) both;}
#igs-overlay .igs-bt-reveal-sub{position:relative;margin-top:12px;padding-top:10px;border-top:1px solid #f1e7d099;color:#f1e7d0;letter-spacing:.38em;text-indent:.38em;font-size:clamp(14px,2.4vmin,20px);text-shadow:0 1px 10px #000000b3;animation:igs-bt-rise 600ms ease 900ms both;}
#igs-overlay .igs-bt-reveal.is-ancient .igs-bt-reveal-big{color:#f4ead0;}
#igs-overlay .igs-bt-reveal.is-horror .igs-bt-reveal-big{color:#d85a5a;text-shadow:0 1px 18px #1a0000;}
#igs-overlay .igs-bt-reveal.is-magic .igs-bt-reveal-big{color:#ffe9a8;text-shadow:0 0 18px #8a6ad0aa;}
@keyframes igs-bt-veil{0%{opacity:0}12%{opacity:.62}85%{opacity:.62}100%{opacity:0}}
@keyframes igs-bt-beam{0%{opacity:0}15%{opacity:1}70%{opacity:.8}100%{opacity:0}}
@keyframes igs-bt-scan{0%{top:0;opacity:0}10%{opacity:1}100%{top:100%;opacity:0}}
@keyframes igs-bt-slam{0%{opacity:0;transform:scale(1.18);filter:blur(6px)}100%{opacity:1;transform:scale(1);filter:none}}

#igs-overlay .igs-bt-panel{position:absolute;inset:0;display:flex;align-items:center;justify-content:flex-start;padding:0 max(48px,12%) var(--igs-fx-safe) max(16px,4%);box-sizing:border-box;}
#igs-overlay .igs-bt-panel-wrap{position:relative;display:flex;flex-direction:column;align-items:flex-start;max-width:min(34%,320px);animation:igs-bt-panel-in 480ms cubic-bezier(.2,.9,.3,1) both;}
#igs-overlay .igs-bt-panel-chip{margin-bottom:6px;padding:0;background:none;color:#cfe8ff;font-weight:500;font-size:.78em;letter-spacing:.34em;opacity:.85;position:relative;z-index:1;}
#igs-overlay .igs-bt-panel-wrap.is-notice .igs-bt-panel-chip{color:#ffb4b4;}
#igs-overlay .igs-bt-panel-wrap.is-quest .igs-bt-panel-chip{color:#f0cf8a;}
#igs-overlay .igs-bt-panel-wrap.is-result .igs-bt-panel-chip{color:#a6e6bf;}
#igs-overlay .igs-bt-panel-wrap.is-breakthrough .igs-bt-panel-chip{color:#ffe29a;}
#igs-overlay .igs-bt-panel-wrap .igs-panel{max-width:100%;min-width:min(200px,100%);padding:10px 16px 8px;border-radius:2px;background:rgba(22,14,8,.82);border:1px solid rgba(255,220,160,.32);box-shadow:0 2px 18px rgba(0,0,0,.45);}
#igs-overlay .igs-bt-panel-wrap .igs-panel-title{border-bottom-width:1px;border-bottom-color:#ffffff40;font-weight:500;letter-spacing:.2em;}
#igs-overlay .igs-bt-panel-wrap .igs-panel-row{font-size:max(12px,.92em);}
#igs-overlay .igs-bt-panel-wrap.is-breakthrough .igs-panel{border-color:#ffe29a99;box-shadow:0 0 22px #ffd66b33;}
#igs-overlay .igs-bt-panel .igs-panel-row{animation:igs-bt-row 350ms ease both;}
#igs-overlay .igs-bt-panel .igs-panel-row:nth-child(1){animation-delay:300ms}
#igs-overlay .igs-bt-panel .igs-panel-row:nth-child(2){animation-delay:480ms}
#igs-overlay .igs-bt-panel .igs-panel-row:nth-child(3){animation-delay:660ms}
#igs-overlay .igs-bt-panel .igs-panel-row:nth-child(4){animation-delay:840ms}
#igs-overlay .igs-bt-panel .igs-panel-row:nth-child(5){animation-delay:1020ms}
#igs-overlay .igs-bt-panel .igs-panel-row:nth-child(6){animation-delay:1200ms}
#igs-overlay .igs-bt-panel-wrap.is-tone-tech .igs-panel{overflow:hidden;}
#igs-overlay .igs-bt-panel-wrap.is-tone-tech .igs-panel::after{content:"";position:absolute;left:0;right:0;top:0;height:1px;background:#7fc4ffb3;box-shadow:0 0 8px 1px #7fc4ff66;animation:igs-bt-scan 1000ms ease-out 200ms both;}
#igs-overlay .igs-bt-panel-motes{position:absolute;left:0;right:0;top:-30px;bottom:0;pointer-events:none;}
#igs-overlay .igs-bt-panel-motes i{position:absolute;bottom:10%;width:4px;height:4px;border-radius:50%;background:#ffe29acc;box-shadow:0 0 6px 1px #ffd66b88;animation:igs-bt-mote 2000ms ease-out 2;}
@keyframes igs-bt-panel-in{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:none}}
@keyframes igs-bt-row{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:none}}
@keyframes igs-bt-mote{0%{opacity:0;transform:translateY(0)}25%{opacity:1}100%{opacity:0;transform:translateY(-90px)}}

#igs-overlay .igs-bt-count{display:flex;align-items:center;justify-content:flex-start;padding:0 0 var(--igs-fx-safe) max(16px,4%);box-sizing:border-box;}
#igs-overlay .igs-bt-count-card{min-width:min(180px,34%);padding:10px 22px 8px;border-radius:2px;background:rgba(22,12,6,.82);color:#f4f4f4;border:1px solid rgba(255,210,140,.32);text-align:left;box-shadow:0 2px 16px rgba(0,0,0,.4);animation:igs-bt-panel-in 420ms cubic-bezier(.2,.9,.3,1) both;}
#igs-overlay .igs-bt-count-label{font-size:max(12px,.82em);letter-spacing:.3em;opacity:.78;margin-bottom:4px;}
#igs-overlay .igs-bt-count-row{display:flex;align-items:baseline;justify-content:flex-start;gap:6px;}
#igs-overlay .igs-bt-count-num{font-size:clamp(28px,6.4vmin,50px);font-weight:600;letter-spacing:.02em;font-variant-numeric:tabular-nums;line-height:1.1;animation:igs-bt-pop 320ms ease 950ms both;}
#igs-overlay .igs-bt-count-unit{font-size:.9em;opacity:.75;}
#igs-overlay .igs-bt-count-delta{margin-top:2px;font-size:max(12px,.8em);font-variant-numeric:tabular-nums;opacity:.9;}
#igs-overlay .igs-bt-count-card.is-up{border-color:#7ee2a166;}
#igs-overlay .igs-bt-count-card.is-up :is(.igs-bt-count-num,.igs-bt-count-delta){color:#9ee8b8;}
#igs-overlay .igs-bt-count-card.is-down{border-color:#ff8f8f66;}
#igs-overlay .igs-bt-count-card.is-down :is(.igs-bt-count-num,.igs-bt-count-delta){color:#ffa3a3;}
@keyframes igs-bt-pop{0%{transform:scale(1)}45%{transform:scale(1.06)}100%{transform:scale(1)}}

#igs-overlay .igs-bt-evidence{display:flex;align-items:center;justify-content:flex-start;padding:0 0 var(--igs-fx-safe) max(16px,4%);box-sizing:border-box;}
#igs-overlay .igs-bt-ev-card{position:relative;width:min(280px,34%);min-width:200px;box-sizing:border-box;padding:14px 18px;background:rgba(14,10,6,.72);color:#f1ede2;border:1px solid rgba(232,200,138,.45);border-radius:2px;animation:igs-bt-ev-in 560ms cubic-bezier(.2,.9,.3,1) both;}
#igs-overlay .igs-bt-ev-tag{display:block;margin-bottom:8px;color:#e8c88a;font-size:max(12px,.72em);letter-spacing:.4em;}
#igs-overlay .igs-bt-ev-name{font-size:1.25em;font-weight:500;line-height:1.35;letter-spacing:.06em;font-family:"Huiwen Mincho","Source Han Serif CN","Noto Serif SC",serif;}
#igs-overlay .igs-bt-ev-desc{margin-top:6px;font-size:max(12px,.88em);line-height:1.6;color:#d6d0c2;}
#igs-overlay .igs-bt-ev-tape,#igs-overlay .igs-bt-ev-stamp{display:none;}
@keyframes igs-bt-ev-in{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:none}}

#igs-overlay .igs-bt-link-redline .igs-link.is-line{filter:drop-shadow(0 0 3px #d23b3b88);}

#igs-overlay .igs-bt-crowd{position:absolute;top:max(16px,6%);left:0;right:0;display:flex;justify-content:center;align-items:flex-start;pointer-events:none;}
#igs-overlay .igs-bt-crowd-chip{padding:5px 26px;background:rgba(14,8,4,.88);color:#f2ead8;border-top:1px solid rgba(232,200,138,.55);border-bottom:1px solid rgba(232,200,138,.55);letter-spacing:.34em;text-indent:.34em;font-size:clamp(14px,2.4vmin,20px);animation:igs-bt-rise 500ms ease both;}
#igs-overlay .igs-bt-crowd.is-hush .igs-bt-crowd-chip{border-color:#9aa0b499;color:#c9ccd8;}
#igs-overlay .igs-bt-crowd.is-bow .igs-bt-crowd-chip{border-color:#d9776b99;}

#igs-overlay .igs-bt-reunion-vig{position:absolute;inset:0;background:radial-gradient(ellipse at center,#00000000 55%,#00000099 100%);}
#igs-overlay .igs-bt-reunion-halo{position:absolute;left:var(--igs-bt-x,50%);top:calc(var(--igs-fx-vis) * .45);width:min(72vmin,540px);aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,#fff3d0d9 0,#ffd98a59 38%,#ffd98a00 68%);animation:igs-bt-halo 3000ms ease-out both;}
#igs-overlay .igs-bt-reunion-ring{position:absolute;left:var(--igs-bt-x,50%);top:calc(var(--igs-fx-vis) * .45);width:min(46vmin,340px);aspect-ratio:1;box-sizing:border-box;border:1px solid #fff3d0b3;border-radius:50%;transform:translate(-50%,-50%) scale(.3);opacity:0;animation:igs-bt-ring 1800ms ease-out 300ms both;}
#igs-overlay .igs-bt-reunion-ring.is-b{animation-delay:1100ms;}
#igs-overlay .igs-bt-reunion-ghost{position:absolute;inset:0;transform-origin:var(--igs-bt-x,50%) 100%;opacity:0;animation:igs-bt-ghost 2400ms ease-out both;}
#igs-overlay .igs-bt-reunion-motes{position:absolute;inset:0;}
#igs-overlay .igs-bt-reunion-motes i{position:absolute;bottom:calc(var(--igs-fx-safe) + var(--igs-fx-vis) * .26);width:4px;height:4px;border-radius:50%;background:#fff3d0;box-shadow:0 0 6px 1px #ffe6a888;opacity:0;animation:igs-bt-mote 2800ms ease-out 2;}
@keyframes igs-bt-halo{0%{opacity:0;transform:translate(-50%,-50%) scale(.5)}35%{opacity:1}100%{opacity:.7;transform:translate(-50%,-50%) scale(1.08)}}
@keyframes igs-bt-ring{0%{opacity:.85;transform:translate(-50%,-50%) scale(.3)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.5)}}
@keyframes igs-bt-ghost{0%{opacity:0;transform:scale(1)}25%{opacity:.45}100%{opacity:0;transform:scale(1.045)}}

#igs-overlay .igs-bt-order{display:flex;justify-content:flex-start;align-items:flex-start;padding:max(16px,4%) 0 0 max(16px,4%);box-sizing:border-box;}
#igs-overlay .igs-bt-order-bar{display:flex;flex-wrap:wrap;justify-content:flex-start;align-items:center;gap:6px 12px;max-width:min(46%,420px);padding:6px 14px;border-radius:2px;background:rgba(20,10,4,.84);border:1px solid rgba(232,200,138,.36);box-shadow:0 2px 16px rgba(0,0,0,.4);animation:igs-bt-rise 450ms ease both;}
#igs-overlay .igs-bt-order-label{font-size:max(12px,.76em);font-weight:500;letter-spacing:.3em;color:#e8c88a;}
#igs-overlay .igs-bt-order-chip{display:flex;align-items:center;gap:6px;padding:2px 10px 2px 3px;border-radius:20px;background:none;border:1px solid #ffffff2e;color:#e8e8f0;font-size:max(12px,.82em);animation:igs-bt-chip 400ms ease both;animation-delay:calc(250ms + var(--igs-bt-i,0) * 140ms);}
#igs-overlay .igs-bt-order-chip.is-first{border-color:#e8c88acc;color:#fff4d8;}
#igs-overlay .igs-bt-order-no{flex:none;min-width:1.5em;height:1.5em;line-height:1.5em;text-align:center;color:#ffffffa6;font-size:max(10px,.8em);font-weight:400;}
#igs-overlay .igs-bt-order-chip.is-first .igs-bt-order-no{color:#e8c88a;}
#igs-overlay .igs-bt-order-ava{position:relative;flex:none;width:28px;height:28px;border-radius:50%;overflow:hidden;background:#3a3a4c;}
#igs-overlay .igs-bt-order-ava.is-initial{display:flex;align-items:center;justify-content:center;color:#ffffff;font-weight:500;}
#igs-overlay .igs-bt-order-name{font-weight:500;letter-spacing:.06em;}
@keyframes igs-bt-chip{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:none}}

#igs-overlay .igs-bt-os-text{position:absolute;top:20%;max-width:44%;box-sizing:border-box;padding:7px 16px;border-radius:2px;background:rgba(18,10,4,.88);border:1px solid rgba(255,220,160,.22);color:#ecebf4;font-style:italic;font-size:clamp(13px,2.3vmin,18px);line-height:1.6;letter-spacing:.08em;}
#igs-overlay .igs-bt-os-text::before{content:"（";opacity:.65;}
#igs-overlay .igs-bt-os-text::after{content:"）";opacity:.65;}
#igs-overlay .igs-bt-os.is-left .igs-bt-os-text{left:max(16px,4%);}
#igs-overlay .igs-bt-os.is-right .igs-bt-os-text{right:max(16px,4%);}
#igs-overlay .igs-bt-os-text span{animation:igs-bt-os-char 500ms ease both;}
@keyframes igs-bt-os-char{from{opacity:0}to{opacity:1}}

#igs-overlay .igs-bt.is-reduced,#igs-overlay .igs-bt.is-reduced *{animation:none!important;}
#igs-overlay .igs-bt.is-reduced :is(.igs-bt-reveal-scan,.igs-bt-reunion-ring,.igs-bt-reunion-ghost,.igs-bt-reunion-motes,.igs-bt-panel-motes){display:none;}
#igs-overlay[data-igs-quality="low"] .igs-bt :is(.igs-bt-reveal-scan,.igs-bt-reunion-ring,.igs-bt-reunion-ghost,.igs-bt-reunion-motes,.igs-bt-panel-motes){display:none;}
#igs-overlay[data-igs-quality="low"] .igs-bt-link-redline .igs-link.is-line{filter:none;}
@media (prefers-reduced-motion: reduce){#igs-overlay .igs-bt,#igs-overlay .igs-bt *{animation:none!important;}}
`;
