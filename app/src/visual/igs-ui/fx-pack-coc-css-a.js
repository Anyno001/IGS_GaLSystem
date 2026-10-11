// COC与推理包样式（二）：san 侧边刻度、symptom 边缘失真与诊断读数、clue 与 casebook 细线条目、kp 顶部字幕、ending 黑场与撕卡。
export const COC_CSS_A = `
#igs-overlay .igs-coc-san-card{width:92px;height:100%;min-height:200px;max-height:360px;display:flex;flex-direction:column;gap:6px;padding:10px 10px 12px 12px;}
#igs-overlay .igs-coc-san-val{display:flex;align-items:baseline;gap:4px;}
#igs-overlay .igs-coc-san-num{font-size:30px;font-weight:400;line-height:1;font-variant-numeric:tabular-nums;}
#igs-overlay .igs-coc-san-val i{font-style:normal;font-size:12px;color:var(--coc-dim);}
#igs-overlay .igs-coc-san-delta{font-size:15px;font-variant-numeric:tabular-nums;animation:igs-coc-in .5s ease-out .5s both;}
#igs-overlay .igs-coc-san-delta.is-loss{color:var(--coc-acc);}
#igs-overlay .igs-coc-san.is-drop .igs-coc-san-num{animation:igs-coc-jit .5s steps(5,end) .9s 2 both;}
#igs-overlay .igs-coc-san-scale{position:relative;flex:1;min-height:90px;margin:6px 0 4px 0;}
#igs-overlay .igs-coc-san-scale::before{content:"";position:absolute;left:6px;top:0;bottom:0;width:12px;border:1px solid var(--coc-line);border-right:0;}
#igs-overlay .igs-coc-san-scale::after{content:"";position:absolute;left:7px;top:0;bottom:0;width:6px;background:repeating-linear-gradient(180deg,var(--coc-soft) 0 1px,transparent 1px 10%);}
#igs-overlay .igs-coc-san-max,#igs-overlay .igs-coc-san-min{position:absolute;left:24px;font-size:12px;color:var(--coc-dim);line-height:1;}
#igs-overlay .igs-coc-san-max{top:-1px;}
#igs-overlay .igs-coc-san-min{bottom:-1px;}
#igs-overlay .igs-coc-san-trail{position:absolute;left:5px;width:1px;background:var(--coc-acc);opacity:.6;animation:igs-coc-veil .5s ease .9s both;}
#igs-overlay .igs-coc-san-pt{position:absolute;left:0;right:0;top:0;height:100%;transform:translateY(calc(var(--to,0) * 100%));animation:igs-coc-san-slide .8s ease-out .5s both;pointer-events:none;}
@keyframes igs-coc-san-slide{from{transform:translateY(calc(var(--from,0) * 100%));}to{transform:translateY(calc(var(--to,0) * 100%));}}
#igs-overlay .igs-coc-san-pt::before{content:"";position:absolute;left:2px;top:-4px;width:9px;height:9px;border-radius:50%;background:var(--coc-acc);}
#igs-overlay .igs-coc-san-pt::after{content:"";position:absolute;left:13px;top:0;width:22px;height:1px;background:var(--coc-acc);}
#igs-overlay .igs-coc-symptom{position:relative;padding-bottom:var(--igs-fx-safe);}
#igs-overlay .igs-coc-sym-card{position:relative;width:min(340px,42%);padding:12px 16px 13px;}
#igs-overlay .igs-coc-sym-head{display:flex;align-items:center;gap:8px;}
#igs-overlay .igs-coc-sym-head em{font-style:normal;color:var(--coc-acc);letter-spacing:.1em;}
#igs-overlay .igs-coc-sym-head em::before{content:"[ ";}
#igs-overlay .igs-coc-sym-head em::after{content:" ]";}
#igs-overlay .igs-coc-sym-pips{margin-left:auto;display:flex;gap:4px;}
#igs-overlay .igs-coc-sym-pips i{width:14px;height:0;border-top:1px solid var(--coc-line);margin-top:1px;}
#igs-overlay .igs-coc-sym-pips i.is-on{border-top:2px solid var(--coc-acc);margin-top:0;}
#igs-overlay .igs-coc-sym-name{margin-top:8px;font-size:21px;line-height:1.3;}
#igs-overlay .igs-coc-sym-desc{margin-top:8px;padding-top:8px;border-top:1px solid var(--coc-soft);font-size:15px;line-height:1.6;color:var(--coc-dim);}
#igs-overlay .igs-coc-sym-edge{position:absolute;pointer-events:none;}
#igs-overlay .igs-coc-sym-edge.is-v{inset:0;background:radial-gradient(ellipse at 50% 46%,transparent 50%,rgba(3,8,10,.8) 112%);animation:igs-coc-veil 1.2s ease both;}
#igs-overlay .igs-coc-sym-edge.is-l,#igs-overlay .igs-coc-sym-edge.is-r{top:0;bottom:0;width:1px;background:var(--coc-acc);opacity:.5;animation:igs-coc-tear-line 1.6s steps(1,end) .6s 2 both;}
#igs-overlay .igs-coc-sym-edge.is-l{left:2.4%;}
#igs-overlay .igs-coc-sym-edge.is-r{right:2.4%;}
@keyframes igs-coc-tear-line{0%{transform:translateX(0);}20%{transform:translateX(-3px);}30%{transform:translateX(5px);}45%{transform:translateX(-1px);}60%{transform:translateX(0);}}
#igs-overlay .igs-coc-symptom.is-light .igs-coc-sym-edge.is-v{opacity:.5;}
#igs-overlay .igs-coc-symptom.is-medium .igs-coc-sym-edge.is-v{opacity:.75;}
#igs-overlay .igs-coc-symptom.is-light .igs-coc-sym-edge.is-l,#igs-overlay .igs-coc-symptom.is-light .igs-coc-sym-edge.is-r{display:none;}
#igs-overlay .igs-coc-symptom.is-heavy .igs-coc-sym-card{animation:igs-coc-in .45s ease-out both,igs-coc-jit .4s steps(4,end) .6s 3;}
#igs-overlay .igs-coc-clue-card{display:flex;align-items:flex-start;gap:14px;width:min(380px,44%);padding:14px 16px 15px;}
#igs-overlay .igs-coc-clue-found{position:relative;flex:none;width:56px;height:56px;overflow:hidden;border:1px solid var(--coc-line);border-radius:50%;background:var(--coc-void);animation:igs-coc-veil .5s ease .3s both;}
#igs-overlay .igs-coc-clue-found.is-empty{display:none;}
#igs-overlay .igs-coc-clue-who{position:absolute;inset:0;}
#igs-overlay .igs-coc-clue-body{min-width:0;flex:1;}
#igs-overlay .igs-coc-clue-tag{color:var(--coc-acc);}
#igs-overlay .igs-coc-clue-name{margin-top:6px;padding-bottom:7px;border-bottom:1px solid var(--coc-soft);font-size:20px;line-height:1.3;}
#igs-overlay .igs-coc-clue-desc{margin-top:8px;font-size:15px;line-height:1.6;color:var(--coc-dim);}
#igs-overlay .igs-coc-cb{width:min(380px,44%);padding:12px 16px 8px;}
#igs-overlay .igs-coc-cb-tab{display:flex;justify-content:space-between;align-items:baseline;padding-bottom:8px;border-bottom:1px solid var(--coc-line);}
#igs-overlay .igs-coc-cb-tab em{font-style:normal;color:var(--coc-acc);font-variant-numeric:tabular-nums;}
#igs-overlay .igs-coc-cb ol{margin:0;padding:0;list-style:none;}
#igs-overlay .igs-coc-cb li{display:flex;align-items:baseline;gap:12px;padding:7px 0;border-bottom:1px solid var(--coc-soft);font-size:15px;line-height:1.5;animation:igs-coc-in .35s ease-out calc(.3s + var(--i,0) * .16s) both;}
#igs-overlay .igs-coc-cb li:last-child{border-bottom:0;}
#igs-overlay .igs-coc-cb li b{flex:none;width:1.6em;font-size:12px;font-weight:400;color:var(--coc-dim);font-variant-numeric:tabular-nums;}
#igs-overlay .igs-coc-cb li span{flex:1;min-width:0;color:var(--coc-dim);}
#igs-overlay .igs-coc-cb li.is-new span{color:var(--coc-tx);}
#igs-overlay .igs-coc-cb li u{flex:none;padding:0 5px;border:1px solid var(--coc-acc);color:var(--coc-acc);font-size:12px;text-decoration:none;}
#igs-overlay .igs-coc-kp{padding-top:max(14px,4%);}
#igs-overlay .igs-coc-kp-dim{position:absolute;left:0;right:0;top:0;height:30%;background:linear-gradient(180deg,rgba(2,6,8,.62),transparent);pointer-events:none;animation:igs-dfx-fade var(--igs-dfx-life) ease both;}
#igs-overlay .igs-coc-kp-box{position:relative;box-sizing:border-box;max-width:min(520px,52%);padding:10px 18px 12px;background:var(--coc-bg);border:1px solid var(--coc-line);border-left:2px solid var(--coc-acc);backdrop-filter:blur(3px);animation:igs-coc-kp-slide .45s ease-out both;}
@keyframes igs-coc-kp-slide{from{opacity:0;transform:translateY(-40px);}to{opacity:1;transform:none;}}
#igs-overlay .igs-coc-kp-box.is-left{margin-right:auto;margin-left:3%;}
#igs-overlay .igs-coc-kp-box.is-right{margin-left:auto;margin-right:3%;}
#igs-overlay .igs-coc-kp-role{display:flex;align-items:center;gap:10px;margin-bottom:4px;font-size:12px;letter-spacing:.24em;color:var(--coc-acc);}
#igs-overlay .igs-coc-kp-role::after{content:"";flex:1;height:1px;background:var(--coc-soft);}
#igs-overlay .igs-coc-kp-text{font-size:17px;line-height:1.8;}
#igs-overlay .igs-coc-kp-text span{opacity:0;animation:igs-coc-char .01s linear forwards;}
#igs-overlay .igs-coc-wipe{box-sizing:border-box;padding-bottom:var(--igs-fx-safe);}
#igs-overlay .igs-coc-wipe-veil{position:absolute;inset:0;background:var(--coc-void);animation:igs-coc-veil .9s ease both;}
#igs-overlay .igs-coc-wipe-body{position:relative;display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center;}
#igs-overlay .igs-coc-wipe-title{font-size:clamp(34px,6vw,56px);font-weight:300;letter-spacing:.7em;padding-left:.7em;color:var(--coc-tx);animation:igs-coc-wipe-in 1s ease-out .9s both;}
@keyframes igs-coc-wipe-in{0%{opacity:0;transform:translateX(-4px);}30%{opacity:.6;transform:translateX(5px);}42%{opacity:.9;transform:translateX(-2px);}60%,100%{opacity:1;transform:none;}}
#igs-overlay .igs-coc-wipe-sub{padding-top:12px;border-top:1px solid var(--coc-line);color:var(--coc-dim);font-size:15px;letter-spacing:.16em;animation:igs-coc-veil .8s ease 1.9s both;}
#igs-overlay .igs-coc-wipe-sub i{display:inline-block;width:1.2em;}
#igs-overlay .igs-coc-wipe-read{display:flex;align-items:baseline;gap:10px;font-size:13px;letter-spacing:.2em;color:var(--coc-dim);animation:igs-coc-veil .8s ease 2.2s both;}
#igs-overlay .igs-coc-wipe-read b{font-size:22px;font-weight:400;color:var(--coc-acc);}
#igs-overlay .igs-coc-tear-veil{position:absolute;inset:0;background:rgba(3,7,9,.66);animation:igs-coc-veil .5s ease both;}
#igs-overlay .igs-coc-tear{position:absolute;left:50%;top:calc(var(--igs-fx-vis) * .5);width:min(300px,40%);aspect-ratio:3/4;transform:translate(-50%,-50%);}
#igs-overlay .igs-coc.is-far-r .igs-coc-tear{left:73%;}
#igs-overlay .igs-coc.is-far-l .igs-coc-tear{left:27%;}
#igs-overlay .igs-coc-tear-half{position:absolute;inset:0;}
#igs-overlay .igs-coc-tear-half.is-l{clip-path:inset(0 50% 0 0);animation:igs-coc-in .5s ease-out both,igs-coc-tear-l 1.2s ease-in 1.3s forwards;}
#igs-overlay .igs-coc-tear-half.is-r{clip-path:inset(0 0 0 50%);animation:igs-coc-in .5s ease-out both,igs-coc-tear-r 1.2s ease-in 1.3s forwards;}
@keyframes igs-coc-tear-l{to{transform:translate(-8%,5%);opacity:0;}}
@keyframes igs-coc-tear-r{to{transform:translate(8%,8%);opacity:0;}}
#igs-overlay .igs-coc-sheet{position:absolute;inset:0;box-sizing:border-box;display:flex;flex-direction:column;padding:20px 20px;background:rgba(7,13,15,.86);color:var(--coc-tx);border:1px solid var(--coc-line);}
#igs-overlay .igs-coc-sheet-head{font-size:12px;letter-spacing:.3em;color:var(--coc-dim);}
#igs-overlay .igs-coc-sheet-name{margin-top:16px;font-size:26px;line-height:1.3;}
#igs-overlay .igs-coc-sheet-rule{display:block;height:1px;margin:12px 0;background:var(--coc-line);}
#igs-overlay .igs-coc-sheet-reason{font-size:15px;line-height:1.7;color:var(--coc-dim);}
#igs-overlay .igs-coc-sheet-stamp{position:absolute;left:20px;bottom:20px;padding:4px 12px;border:1px solid var(--coc-acc);color:var(--coc-acc);font-size:17px;letter-spacing:.3em;}
#igs-overlay .igs-coc-sheet-stamp::before{content:"DECEASED";display:block;font-size:11px;letter-spacing:.24em;opacity:.8;}
#igs-overlay .igs-coc.is-reduced .igs-coc-tear-half.is-l{transform:translate(-3%,2%);}
#igs-overlay .igs-coc.is-reduced .igs-coc-tear-half.is-r{transform:translate(3%,3%);}
@media (max-width:640px){#igs-overlay .igs-coc-sym-card,#igs-overlay .igs-coc-clue-card,#igs-overlay .igs-coc-cb{width:min(340px,76%);}#igs-overlay .igs-coc-kp-box{max-width:88%;}#igs-overlay .igs-coc-tear{left:50%!important;width:min(300px,78%);}#igs-overlay .igs-coc-san-card{width:84px;}}
`;
