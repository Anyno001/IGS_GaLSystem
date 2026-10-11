// COC与推理包样式（四）：magnify 细圆环取景、accuse 暗角收拢与细字、stats 细线雷达读数。
export const COC_CSS_C = `
#igs-overlay .igs-coc-lens{position:absolute;top:calc(var(--igs-fx-vis) * .44);box-sizing:border-box;width:min(46vmin,300px);aspect-ratio:1/1;transform:translate(-50%,-50%);animation:igs-coc-lens-in .6s ease-out both;}
@keyframes igs-coc-lens-in{from{opacity:0;transform:translate(-50%,-50%) scale(.9);}to{opacity:1;transform:translate(-50%,-50%);}}
#igs-overlay .igs-coc-lens-view{position:absolute;inset:4%;border-radius:50%;overflow:hidden;background:#0a1114;background-size:cover;background-position:50% 50%;}
#igs-overlay .igs-coc-lens-view.is-empty{background-image:linear-gradient(rgba(176,201,205,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(176,201,205,.12) 1px,transparent 1px);background-size:20px 20px;}
#igs-overlay .igs-coc-lens-rim{position:absolute;inset:0;border-radius:50%;border:1px solid var(--coc-line);}
#igs-overlay .igs-coc-lens-rim::before{content:"";position:absolute;inset:3.2%;border-radius:50%;border:1px solid var(--coc-soft);}
#igs-overlay .igs-coc-lens-ticks{position:absolute;inset:-4%;pointer-events:none;background:linear-gradient(var(--coc-line),var(--coc-line)) 50% 0/1px 9px no-repeat,linear-gradient(var(--coc-line),var(--coc-line)) 50% 100%/1px 9px no-repeat,linear-gradient(var(--coc-line),var(--coc-line)) 0 50%/9px 1px no-repeat,linear-gradient(var(--coc-line),var(--coc-line)) 100% 50%/9px 1px no-repeat;}
#igs-overlay .igs-coc-lens-cap{position:absolute;top:calc(100% + 16px);left:50%;transform:translateX(-50%);padding:3px 12px;background:var(--coc-bg);color:var(--coc-tx);font-size:14px;white-space:nowrap;border:1px solid var(--coc-soft);}
#igs-overlay .igs-coc-accuse-dim{position:absolute;inset:0;background:radial-gradient(circle at var(--fx,50%) var(--fy,30%),transparent 0 18%,rgba(2,6,8,.82) 78%);animation:igs-coc-veil .5s ease both;}
#igs-overlay .igs-coc-accuse-rays{position:absolute;inset:0;background:repeating-conic-gradient(from 0deg at var(--fx,50%) var(--fy,30%),rgba(190,212,216,.55) 0 .3deg,transparent .3deg 5deg);-webkit-mask-image:radial-gradient(circle at var(--fx,50%) var(--fy,30%),transparent 0 56%,#000 96%);mask-image:radial-gradient(circle at var(--fx,50%) var(--fy,30%),transparent 0 56%,#000 96%);opacity:.3;animation:igs-coc-veil .6s ease both;}
#igs-overlay .igs-coc-accuse-line{position:absolute;left:0;right:0;bottom:calc(var(--igs-fx-safe) + 14px);display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;}
#igs-overlay .igs-coc-accuse-name{font-size:12px;letter-spacing:.26em;color:var(--coc-dim);animation:igs-coc-veil .5s ease .35s both;}
#igs-overlay .igs-coc-accuse-text{padding:0 .1em;font-size:clamp(34px,6.2vw,54px);font-weight:300;letter-spacing:.14em;color:#eef5f5;text-shadow:0 0 14px #000,0 0 3px #000;animation:igs-coc-accuse-in .7s ease-out .3s both;}
@keyframes igs-coc-accuse-in{0%{opacity:0;transform:translateX(-4px);}35%{opacity:.7;transform:translateX(4px);}50%{opacity:1;transform:none;}100%{opacity:1;}}
#igs-overlay .igs-coc-accuse-under{display:block;width:min(240px,50%);height:2px;background:var(--coc-acc);transform-origin:0 50%;animation:igs-coc-grow-x .5s ease-out .9s both;}
#igs-overlay .igs-coc-stats{flex-direction:column;gap:8px;box-sizing:border-box;padding-bottom:var(--igs-fx-safe);}
#igs-overlay .igs-coc-stats.is-far-r{justify-content:center;align-items:flex-end;}
#igs-overlay .igs-coc-stats.is-far-l{justify-content:center;align-items:flex-start;}
#igs-overlay .igs-coc-st-title{animation:igs-coc-veil .4s ease both;}
#igs-overlay .igs-coc-st-card{--coc-st-line:var(--coc-acc);position:relative;display:flex;flex-direction:column;align-items:stretch;gap:10px;width:min(330px,40%);padding:14px 16px 12px;}
#igs-overlay .igs-coc-st-card.is-dnd{--coc-st-line:#d9c48a;--coc-line:rgba(217,196,138,.5);--coc-soft:rgba(217,196,138,.22);--coc-acc:#d9c48a;}
#igs-overlay .igs-coc-st-side{position:relative;display:flex;align-items:center;gap:12px;}
#igs-overlay .igs-coc-st-portrait{position:relative;box-sizing:border-box;flex:none;width:52px;height:52px;overflow:hidden;border:1px solid var(--coc-line);border-radius:50%;background:var(--coc-void);display:flex;align-items:center;justify-content:center;font-size:20px;color:var(--coc-dim);}
#igs-overlay .igs-coc-st-who{min-width:0;}
#igs-overlay .igs-coc-st-name{font-size:18px;letter-spacing:.1em;line-height:1.3;}
#igs-overlay .igs-coc-st-sub{font-size:13px;color:var(--coc-dim);letter-spacing:.08em;}
#igs-overlay .igs-coc-st-seal{margin-left:auto;font-style:normal;font-size:12px;letter-spacing:.14em;color:var(--coc-acc);border:1px solid var(--coc-acc);padding:1px 6px;}
#igs-overlay .igs-coc-st-chart{min-width:0;width:100%;}
#igs-overlay .igs-coc-st-svg{display:block;width:100%;height:auto;overflow:visible;}
#igs-overlay .igs-coc-st-ring{fill:none;stroke:var(--coc-soft);stroke-width:.6;}
#igs-overlay .igs-coc-st-axis{stroke:var(--coc-soft);stroke-width:.5;}
#igs-overlay .igs-coc-st-fill{fill:var(--coc-acc);fill-opacity:.14;animation:igs-coc-st-fade .6s ease 1s both;}
#igs-overlay .igs-coc-st-line{fill:none;stroke:var(--coc-acc);stroke-width:1;stroke-linejoin:round;stroke-dasharray:1;animation:igs-coc-draw 1s ease .5s both;}
#igs-overlay .igs-coc-st-spoke{stroke:var(--coc-acc);stroke-width:.8;stroke-opacity:.7;stroke-dasharray:1;animation:igs-coc-draw .5s ease calc(.25s + var(--i) * .08s) both;}
#igs-overlay .igs-coc-st-old{fill:none;stroke:var(--coc-dim);stroke-width:.8;stroke-dasharray:3 2;}
#igs-overlay .igs-coc-st-dot{fill:var(--coc-acc);animation:igs-coc-st-fade .3s ease calc(.7s + var(--i) * .08s) both;}
#igs-overlay .igs-coc-st-dot.is-up{fill:var(--coc-tx);}
#igs-overlay .igs-coc-st-label text{font-size:12px;fill:currentColor;animation:igs-coc-st-fade .4s ease calc(.4s + var(--i) * .08s) both;}
#igs-overlay .igs-coc-st-k{fill:var(--coc-dim);letter-spacing:.04em;}
#igs-overlay .igs-coc-st-v{font-variant-numeric:tabular-nums;}
#igs-overlay .igs-coc-st-m{opacity:.7;font-size:.85em;}
#igs-overlay .igs-coc-st-d.is-up{fill:var(--coc-tx);}
#igs-overlay .igs-coc-st-d.is-down{fill:var(--coc-acc);}
#igs-overlay .igs-coc-st-vit{display:flex;flex-direction:column;gap:6px;padding-top:10px;border-top:1px solid var(--coc-soft);}
#igs-overlay .igs-coc-st-bars{display:flex;flex-direction:column;gap:7px;}
#igs-overlay .igs-coc-st-vbar{display:flex;align-items:center;gap:10px;font-size:13px;animation:igs-coc-st-fade .4s ease calc(.6s + var(--i) * .1s) both;}
#igs-overlay .igs-coc-st-vbar span{flex:none;width:3.2em;color:var(--coc-dim);letter-spacing:.06em;}
#igs-overlay .igs-coc-st-vtrack{position:relative;flex:1;height:1px;background:var(--coc-soft);}
#igs-overlay .igs-coc-st-vtrack i{position:absolute;left:0;top:-1px;height:3px;background:var(--coc-acc);transform-origin:0 50%;animation:igs-coc-grow-x .7s ease .9s both;}
#igs-overlay .igs-coc-st-vbar b{flex:none;min-width:3.6em;text-align:right;font-weight:400;font-variant-numeric:tabular-nums;}
#igs-overlay .igs-coc-st-chips{display:flex;flex-wrap:wrap;gap:6px;}
#igs-overlay .igs-coc-st-chip{padding:1px 8px;border:1px solid var(--coc-soft);font-size:13px;font-variant-numeric:tabular-nums;animation:igs-coc-st-fade .4s ease calc(.7s + var(--i) * .1s) both;}
#igs-overlay .igs-coc-st-chip em{margin-right:6px;font-style:normal;color:var(--coc-dim);}
#igs-overlay .igs-coc.is-reduced .igs-coc-st-line,#igs-overlay .igs-coc.is-reduced .igs-coc-st-spoke{stroke-dasharray:none;}
@media (max-width:640px){#igs-overlay .igs-coc-lens{width:min(46vmin,200px);}#igs-overlay .igs-coc-st-card{width:min(300px,64%);}}
`;
