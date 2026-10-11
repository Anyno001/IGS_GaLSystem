// COC与推理包样式（三）：dungeon 冷通告、portal 眼睑与光缝、rating 判定单、alive 名牌排、rules 规则条、board 细线节点图。
export const COC_CSS_B = `
#igs-overlay .igs-coc-dg{width:min(380px,46%);padding:0 0 12px;}
#igs-overlay .igs-coc-dg-bar{display:flex;align-items:baseline;gap:12px;padding:11px 16px 9px;border-bottom:1px solid var(--coc-line);}
#igs-overlay .igs-coc-dg-bar em{font-style:normal;font-size:18px;letter-spacing:.1em;}
#igs-overlay .igs-coc-dg ol{margin:0;padding:0 16px;list-style:none;}
#igs-overlay .igs-coc-dg li{display:flex;gap:12px;padding:8px 0;border-bottom:1px solid var(--coc-soft);font-size:15px;line-height:1.5;animation:igs-coc-in .35s ease-out calc(.35s + var(--i,0) * .18s) both;}
#igs-overlay .igs-coc-dg li b{flex:none;width:1.6em;font-size:12px;font-weight:400;color:var(--coc-dim);font-variant-numeric:tabular-nums;}
#igs-overlay .igs-coc-dg-foot{padding:8px 16px 0;font-size:12px;letter-spacing:.14em;color:var(--coc-dim);}
#igs-overlay .igs-coc-dg::after{content:"";display:block;width:72px;height:8px;margin:10px 16px 0;background:repeating-linear-gradient(90deg,var(--coc-dim) 0 1px,transparent 1px 3px,var(--coc-dim) 3px 6px,transparent 6px 8px);opacity:.5;}
#igs-overlay .igs-coc-portal .igs-coc-lid{position:absolute;left:-2%;right:-2%;height:52%;z-index:2;background:var(--coc-void);}
#igs-overlay .igs-coc-portal .igs-coc-lid.is-t{top:0;border-radius:0 0 50% 50%/0 0 36% 36%;transform:translateY(-102%);animation:igs-coc-lid-t .7s cubic-bezier(.6,0,.4,1) both,igs-coc-lid-off .01s linear .75s forwards;}
#igs-overlay .igs-coc-portal .igs-coc-lid.is-b{bottom:0;border-radius:50% 50% 0 0/36% 36% 0 0;transform:translateY(102%);animation:igs-coc-lid-b .7s cubic-bezier(.6,0,.4,1) both,igs-coc-lid-off .01s linear .75s forwards;}
@keyframes igs-coc-lid-off{to{opacity:0;}}
@keyframes igs-coc-lid-t{from{transform:translateY(-102%);}to{transform:translateY(0);}}
@keyframes igs-coc-lid-b{from{transform:translateY(102%);}to{transform:translateY(0);}}
#igs-overlay .igs-coc-warp-plate{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:var(--coc-void);animation:igs-coc-plate .01s linear .78s both;}
@keyframes igs-coc-plate{from{opacity:0;}to{opacity:1;}}
#igs-overlay .igs-coc-warp-slit{position:absolute;left:22%;right:22%;top:calc(var(--igs-fx-vis) * .5);height:1px;margin-top:-.5px;background:#dff3ee;box-shadow:0 0 10px 1px rgba(160,220,206,.55);transform-origin:50% 50%;animation:igs-coc-grow-x .8s cubic-bezier(.3,0,.2,1) .82s both;}
#igs-overlay .igs-coc-warp-place{position:absolute;left:0;right:0;bottom:calc(100% - var(--igs-fx-vis) * .5 + 18px);text-align:center;font-size:clamp(24px,4.4vw,38px);font-weight:300;letter-spacing:.3em;padding-left:.3em;}
#igs-overlay .igs-coc-warp-place span{opacity:0;animation:igs-coc-char .01s linear forwards;}
#igs-overlay .igs-coc-warp-sub{position:absolute;left:0;right:0;top:calc(var(--igs-fx-vis) * .5 + 18px);text-align:center;font-size:14px;letter-spacing:.3em;color:var(--coc-dim);animation:igs-coc-veil .6s ease 2s both;}
#igs-overlay .igs-coc.is-reduced .igs-coc-warp-slit{transform:none;}
#igs-overlay .igs-coc-rt{width:min(380px,46%);padding:12px 16px 14px;}
#igs-overlay .igs-coc-rt-head{padding-bottom:8px;border-bottom:1px solid var(--coc-line);}
#igs-overlay .igs-coc-rt-main{display:flex;align-items:flex-start;gap:16px;margin-top:12px;}
#igs-overlay .igs-coc-rt-grade{flex:none;box-sizing:border-box;min-width:76px;height:76px;padding:0 8px;display:flex;align-items:center;justify-content:center;border:1px solid var(--coc-acc);color:var(--coc-acc);font-size:46px;font-weight:300;line-height:1;animation:igs-coc-veil .5s ease 1.2s both;}
#igs-overlay .igs-coc-rt ul{flex:1;min-width:0;margin:0;padding:0;list-style:none;}
#igs-overlay .igs-coc-rt li{display:flex;align-items:baseline;gap:8px;padding:5px 0;font-size:15px;animation:igs-coc-in .35s ease-out calc(.35s + var(--i,0) * .16s) both;}
#igs-overlay .igs-coc-rt li span{color:var(--coc-dim);}
#igs-overlay .igs-coc-rt li i{flex:1;min-width:10px;border-bottom:1px dotted var(--coc-line);transform:translateY(-3px);}
#igs-overlay .igs-coc-rt li b{font-size:18px;font-weight:400;font-variant-numeric:tabular-nums;}
#igs-overlay .igs-coc-alive-card{width:min(340px,44%);padding:12px 16px 14px;}
#igs-overlay .igs-coc-alive-count{margin-top:6px;display:flex;align-items:baseline;gap:8px;}
#igs-overlay .igs-coc-alive-num{font-size:44px;font-weight:300;line-height:1;font-variant-numeric:tabular-nums;}
#igs-overlay .igs-coc-alive-count span{font-size:15px;color:var(--coc-dim);font-variant-numeric:tabular-nums;}
#igs-overlay .igs-coc-alive-pips{margin-top:12px;padding-top:12px;border-top:1px solid var(--coc-soft);display:flex;flex-wrap:wrap;gap:8px;}
#igs-overlay .igs-coc-alive-pips i{position:relative;display:block;width:20px;height:28px;color:var(--coc-tx);}
#igs-overlay .igs-coc-alive-pips i::before{content:"";position:absolute;left:6px;top:0;width:6px;height:6px;border:1px solid currentColor;border-radius:50%;}
#igs-overlay .igs-coc-alive-pips i::after{content:"";position:absolute;left:1px;right:1px;bottom:0;height:13px;border:1px solid currentColor;border-bottom:0;border-radius:9px 9px 0 0;}
#igs-overlay .igs-coc-alive-pips i.is-dead{color:var(--coc-dim);opacity:.45;animation:igs-coc-snuff .5s ease calc(.6s + var(--k,0) * .28s) both;}
@keyframes igs-coc-snuff{from{opacity:1;color:var(--coc-tx);}to{opacity:.45;color:var(--coc-dim);}}
#igs-overlay .igs-coc-alive-pips i u{position:absolute;inset:-2px;background:linear-gradient(to top right,transparent calc(50% - .5px),var(--coc-acc) 50%,transparent calc(50% + .5px));text-decoration:none;opacity:0;animation:igs-coc-veil .4s ease calc(.7s + var(--k,0) * .28s) both;}
#igs-overlay .igs-coc-rules-paper{position:relative;width:min(380px,46%);padding:12px 16px 12px;}
#igs-overlay .igs-coc-rules-title{padding-bottom:8px;border-bottom:1px solid var(--coc-line);}
#igs-overlay .igs-coc-rules-paper ol{margin:6px 0 0;padding:0;list-style:none;}
#igs-overlay .igs-coc-rules-paper li{position:relative;display:flex;gap:12px;margin:2px 0;padding:6px 6px 6px 8px;border-left:1px solid transparent;font-size:15px;line-height:1.55;animation:igs-coc-in .4s ease-out calc(.4s + var(--i,0) * .3s) both;}
#igs-overlay .igs-coc-rules-paper li b{flex:none;width:1.4em;font-size:12px;font-weight:400;color:var(--coc-dim);line-height:1.9;font-variant-numeric:tabular-nums;}
#igs-overlay .igs-coc-rules-paper li.is-violate{animation:igs-coc-in .4s ease-out calc(.4s + var(--i,0) * .3s) both,igs-coc-violate .5s ease calc(.4s + var(--i,0) * .3s + 1.4s) forwards;}
@keyframes igs-coc-violate{to{color:var(--coc-acc);border-left-color:var(--coc-acc);background:rgba(134,205,191,.1);}}
#igs-overlay .igs-coc-rules-paper li.is-tamper span{color:var(--coc-dim);}
#igs-overlay .igs-coc-smear{position:absolute;left:34px;right:4px;top:50%;height:4px;margin-top:-2px;border-top:1px solid var(--coc-acc);border-bottom:1px solid var(--coc-acc);transform-origin:0 50%;animation:igs-coc-grow-x .6s ease-out calc(.4s + var(--i,0) * .3s + .9s) both;}
#igs-overlay .igs-coc-rules.is-reduced li.is-violate{color:var(--coc-acc);border-left-color:var(--coc-acc);}
#igs-overlay .igs-coc-bd{position:relative;box-sizing:border-box;width:min(440px,46%);aspect-ratio:16/11;border:1px solid var(--coc-soft);background-color:rgba(7,13,15,.4);background-image:linear-gradient(rgba(176,201,205,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(176,201,205,.07) 1px,transparent 1px);background-size:22px 22px;animation:igs-coc-in .45s ease-out both;}
#igs-overlay .igs-coc-bd-tag{position:absolute;left:12px;top:8px;}
#igs-overlay .igs-coc-board-note{position:absolute;width:0;height:0;animation:igs-coc-veil .45s ease var(--d,0s) both;}
#igs-overlay .igs-coc-board-pin{position:absolute;left:-4px;top:-4px;width:7px;height:7px;border:1px solid var(--coc-acc);border-radius:50%;background:var(--coc-void);}
#igs-overlay .igs-coc-board-note span{position:absolute;top:10px;left:0;width:max-content;max-width:112px;transform:translateX(-50%);text-align:center;font-size:13px;line-height:1.4;}
#igs-overlay .igs-coc-bd svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;}
#igs-overlay .igs-coc-bd svg path{fill:none;stroke:var(--coc-acc);stroke-width:1px;stroke-linecap:round;vector-effect:non-scaling-stroke;stroke-dasharray:1;animation:igs-coc-draw .55s ease-out both;}
@media (max-width:640px){#igs-overlay .igs-coc-dg,#igs-overlay .igs-coc-rt,#igs-overlay .igs-coc-rules-paper,#igs-overlay .igs-coc-alive-card{width:min(340px,80%);}#igs-overlay .igs-coc-bd{width:min(380px,86%);}}
`;
