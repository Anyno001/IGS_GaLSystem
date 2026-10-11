// 修仙武侠演出的样式（并入 DAILY_FX_STYLE_TEXT）：御剑、轻功、点穴、闭关、运功。
// 全部实色；单次演出的进出场跟随 --igs-dfx-life 伸缩；只有闭关的呼吸与灵气是循环，低画质下静态或隐藏；减少动态效果下的静态兜底都是完整可见的画面。
export const XIANXIA_FX_STYLE_TEXT = `
/* ── 御剑：剑立起、人站在剑上飞走，云气留在身后，落点一圈气浪 ── */
#igs-overlay .igs-dfx-yujian{animation:igs-dfx-fade var(--igs-dfx-life) ease both;}
#igs-overlay .igs-dfx-yujian-ride{position:absolute;inset:0;transform-origin:calc(var(--igs-x) * 1%) calc(var(--igs-fx-vis) - 2%);animation:igs-dfx-yj-ride calc(var(--igs-dfx-life) * .72) cubic-bezier(.55,0,.35,1) both;}
#igs-overlay .igs-dfx-yujian-sword{position:absolute;left:calc(var(--igs-x) * 1% - 15%);top:92%;width:30%;margin-top:-2.5%;top:calc(var(--igs-fx-vis) - 2%);animation:igs-dfx-yj-sword calc(var(--igs-dfx-life) * .16) cubic-bezier(.2,.9,.3,1) both;}
#igs-overlay .igs-dfx-yujian-sword svg{display:block;width:100%;height:auto;transform:rotate(-6deg);overflow:visible;}
#igs-overlay .igs-dfx-yj-blade{fill:rgba(230,243,244,.12);stroke:#d0ebee;stroke-width:.6;filter:drop-shadow(0 0 4px rgba(190,230,240,.7));}
#igs-overlay .igs-dfx-yj-guard{fill:none;stroke:#d4bb72;stroke-width:.7;stroke-linecap:round;}
#igs-overlay .igs-dfx-yj-pommel{fill:none;stroke:#d4bb72;stroke-width:.7;}
#igs-overlay .igs-dfx-yj-grip{fill:none;stroke:#8a9e9a;stroke-width:.6;}
#igs-overlay .igs-dfx-yj-tassel{fill:none;stroke:#c4785a;stroke-width:1;stroke-linecap:round;}
#igs-overlay .igs-dfx-yujian-flash{position:absolute;left:calc(var(--igs-x) * 1% - 14%);top:92%;width:28%;aspect-ratio:3/1;margin-top:-4.5%;top:calc(var(--igs-fx-vis) - 2%);background:radial-gradient(closest-side,#fff,rgba(190,236,244,0));opacity:0;animation:igs-dfx-yj-flash calc(var(--igs-dfx-life) * .14) ease-out both;}
#igs-overlay .igs-dfx-yujian-cloud{position:absolute;width:11%;aspect-ratio:2.2/1;opacity:0;transform:translate(-50%,-50%);background:radial-gradient(closest-side,rgba(240,247,246,.4),rgba(240,247,246,.1) 70%,transparent);animation:igs-dfx-yj-cloud calc(var(--igs-dfx-life) * .34) ease-out calc(var(--igs-dfx-life) * var(--igs-k)) both;}
#igs-overlay .igs-dfx-yujian-cloud.is-b{width:14%;}
#igs-overlay .igs-dfx-yujian-ring{position:absolute;left:calc(var(--igs-x) * 1% - 9%);top:calc(var(--igs-fx-vis) - 4%);width:18%;aspect-ratio:3/1;border:1px solid rgba(195,228,236,.6);border-radius:50%;opacity:0;animation:igs-dfx-yj-ring calc(var(--igs-dfx-life) * .22) ease-out calc(var(--igs-dfx-life) * .78) both;}
@keyframes igs-dfx-yj-ride{0%{transform:translate3d(0,0,0) scale(1);opacity:1}18%{transform:translate3d(0,-3%,0) scale(.98)}82%{opacity:1}100%{transform:translate3d(calc((88 - var(--igs-x)) * 1%),-62%,0) scale(.26);opacity:0}}
@keyframes igs-dfx-yj-sword{0%{opacity:0;transform:translate3d(-10%,22%,0) scale(.5)}60%{opacity:1;transform:scale(1.06)}100%{opacity:1;transform:none}}
@keyframes igs-dfx-yj-flash{0%{opacity:0;transform:scale(.4)}35%{opacity:1;transform:scale(1.1)}100%{opacity:0;transform:scale(1.5)}}
@keyframes igs-dfx-yj-cloud{0%{opacity:0;transform:translate(-50%,-50%) scale(.6)}35%{opacity:.92}100%{opacity:0;transform:translate(-90%,-30%) scale(1.25)}}
@keyframes igs-dfx-yj-ring{0%{opacity:.9;transform:scale(.3)}100%{opacity:0;transform:scale(1.4)}}
#igs-overlay .igs-dfx.is-reduced .igs-dfx-yujian-sword{top:46%;}
#igs-overlay .igs-dfx.is-reduced .igs-dfx-yujian-cloud{opacity:.85;}
#igs-overlay .igs-dfx.is-reduced .igs-dfx-yujian-flash,#igs-overlay .igs-dfx.is-reduced .igs-dfx-yujian-ring{display:none;}
/* ── 轻功：真残影一道道留下，落叶卷过，风线贴身 ── */
#igs-overlay .igs-dfx-qinggong{animation:igs-dfx-fade var(--igs-dfx-life) ease both;}
#igs-overlay .igs-dfx-qinggong-ghost{position:absolute;inset:0;opacity:var(--o);transform:translateX(var(--dx));animation:igs-dfx-qg-ghost 760ms ease-out both;}
#igs-overlay .igs-dfx-qinggong-streaks i{position:absolute;width:20%;height:1px;background:linear-gradient(90deg,transparent,rgba(230,244,240,.75));opacity:0;animation:igs-dfx-qg-streak 520ms ease-out both;}
#igs-overlay .igs-dfx-qinggong-leaves i{position:absolute;border-radius:50%;opacity:0;animation:igs-dfx-qg-leaf 1.4s ease-out both;}
@keyframes igs-dfx-qg-ghost{0%{opacity:0;transform:translateX(var(--dx))}18%{opacity:var(--o)}100%{opacity:0;transform:translateX(calc(var(--dx) - 1.5%))}}
@keyframes igs-dfx-qg-streak{0%{opacity:0;transform:translateX(30%)}25%{opacity:.85}100%{opacity:0;transform:translateX(-35%)}}
@keyframes igs-dfx-qg-leaf{0%{opacity:0;transform:translate3d(0,0,0) rotate(0)}20%{opacity:.92}100%{opacity:0;transform:translate3d(var(--dx),var(--dy),0) rotate(var(--rot))}}
#igs-overlay .igs-dfx.is-reduced .igs-dfx-qinggong-leaves,#igs-overlay .igs-dfx.is-reduced .igs-dfx-qinggong-streaks{display:none;}
/* ── 点穴：指光射入穴位，红点炸开，经络一闪，立绘被灰蓝定住 ── */
#igs-overlay .igs-dfx-dianxue{animation:igs-dfx-fade var(--igs-dfx-life) ease both;}
#igs-overlay .igs-dfx-dianxue-svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;}
#igs-overlay .igs-dfx-dianxue-beam{fill:none;stroke:#f4fbff;stroke-width:1.2;stroke-linecap:round;vector-effect:non-scaling-stroke;stroke-dasharray:1 1;stroke-dashoffset:1;filter:drop-shadow(0 0 4px #9fe0ff);animation:igs-dfx-dx-beam .7s ease-out .1s both;}
#igs-overlay .igs-dfx-dianxue-meridian{fill:none;stroke:rgba(185,215,228,.5);stroke-width:.8;stroke-dasharray:2 3;vector-effect:non-scaling-stroke;opacity:0;animation:igs-dfx-dx-node 1.1s ease-out .4s both;}
#igs-overlay .igs-dfx-dianxue-node{position:absolute;width:5px;height:5px;margin:-2.5px 0 0 -2.5px;border-radius:50%;background:#c9e6ee;box-shadow:0 0 4px 1px rgba(150,210,230,.4);opacity:0;animation:igs-dfx-dx-node 1s ease-out .45s both;}
#igs-overlay .igs-dfx-dianxue-node.is-1{animation-delay:.6s;}
#igs-overlay .igs-dfx-dianxue-node.is-2{animation-delay:.75s;}
#igs-overlay .igs-dfx-dianxue-stage{position:absolute;width:0;height:0;}
#igs-overlay .igs-dfx-dianxue-dot{position:absolute;left:-3px;top:-3px;width:6px;height:6px;border-radius:50%;background:#c44030;box-shadow:0 0 7px 2px rgba(196,64,48,.38);animation:igs-dfx-dianxue-dot .5s ease-out .28s both;}
#igs-overlay .igs-dfx-dianxue-ring{position:absolute;left:-40px;top:-40px;width:80px;height:80px;border-radius:50%;border:1px solid rgba(196,64,48,.55);opacity:0;animation:igs-dfx-dianxue-ring 1.4s ease-out .5s both;}
#igs-overlay .igs-dfx-dianxue-ring.is-2{border-color:rgba(118,154,162,.5);animation-delay:.85s;}
#igs-overlay .igs-dfx-dianxue-frozen{position:absolute;inset:0;opacity:0;animation:igs-dfx-dx-frozen var(--igs-dfx-life) ease-in-out both;}
@keyframes igs-dfx-dx-beam{0%{stroke-dashoffset:1;opacity:1}30%{stroke-dashoffset:0;opacity:1}70%{stroke-dashoffset:0;opacity:0}100%{opacity:0}}
@keyframes igs-dfx-dx-node{0%{opacity:0}25%{opacity:.95}100%{opacity:0}}
@keyframes igs-dfx-dx-frozen{0%,16%{opacity:0}26%,84%{opacity:.78}100%{opacity:0}}
#igs-overlay .igs-dfx.is-reduced .igs-dfx-dianxue-beam,#igs-overlay .igs-dfx.is-reduced .igs-dfx-dianxue-ring{display:none;}
/* ── 闭关：灵气螺旋聚向胸前，一息一息地呼吸；境界出现时金光一闪 ── */
#igs-overlay .igs-dfx-biguan{animation:igs-dfx-fade var(--igs-dfx-life) ease both;}
#igs-overlay .igs-dfx-biguan-veil{position:absolute;inset:0;background:radial-gradient(ellipse 60% 56% at 50% 54%,rgba(31,37,35,0),rgba(31,37,35,.46) 100%);}
#igs-overlay .igs-dfx-biguan-qi{position:absolute;width:0;height:0;}
#igs-overlay .igs-dfx-biguan-core{position:absolute;left:-90px;top:-90px;width:180px;height:180px;border-radius:50%;background:radial-gradient(closest-side,rgba(190,236,236,.24),rgba(190,236,236,.06) 60%,transparent);animation:igs-dfx-bg-breath 4s ease-in-out infinite;}
#igs-overlay .igs-dfx-biguan-qi b{position:absolute;left:-1.5px;top:-1.5px;width:3px;height:3px;border-radius:50%;background:#d8eeec;opacity:0;animation:igs-dfx-bg-gather 2.8s ease-in infinite;}
#igs-overlay .igs-dfx-biguan-flash{position:absolute;inset:0;background:radial-gradient(circle at 50% 54%,rgba(252,226,148,.25),transparent 56%);opacity:0;animation:igs-dfx-bg-flash 1.2s ease-out 2.4s both;}
#igs-overlay .igs-dfx-biguan-text{position:absolute;left:50%;bottom:calc(var(--igs-fx-safe) + var(--igs-fx-vis) * .2);transform:translateX(-50%);color:#f4e7b6;font:400 clamp(14px,2.6vmin,20px)/1.3 "Source Han Serif CN","Songti SC",serif;letter-spacing:.5em;text-shadow:0 2px 10px rgba(0,0,0,.6);animation:igs-dfx-bg-text 1.2s ease-out 2.3s both;}
@keyframes igs-dfx-bg-breath{0%,100%{opacity:.5;transform:scale(.85)}50%{opacity:1;transform:scale(1.08)}}
@keyframes igs-dfx-bg-gather{0%{opacity:0;transform:rotate(var(--a)) translateX(var(--r)) scale(1)}20%{opacity:.9}100%{opacity:0;transform:rotate(calc(var(--a) + 80deg)) translateX(0) scale(.3)}}
@keyframes igs-dfx-bg-flash{0%{opacity:0}30%{opacity:1}100%{opacity:0}}
@keyframes igs-dfx-bg-text{0%{opacity:0;letter-spacing:.8em}100%{opacity:1;letter-spacing:.4em}}
#igs-overlay[data-igs-quality="low"] .igs-dfx-biguan-core{animation:none;}
#igs-overlay[data-igs-quality="low"] .igs-dfx-biguan-qi b,#igs-overlay .igs-dfx.is-reduced .igs-dfx-biguan-qi b,#igs-overlay .igs-dfx.is-reduced .igs-dfx-biguan-flash{display:none;}
/* ── 运功疗伤：双掌光点汇聚，经络光线上行；成功泛暖光，失败碎成灰屑 ── */
#igs-overlay .igs-dfx-yungong{animation:igs-dfx-fade var(--igs-dfx-life) ease both;}
#igs-overlay .igs-dfx-yungong-palm{position:absolute;width:5%;aspect-ratio:1;margin:-2.5% 0 0 -2.5%;border-radius:50%;background:radial-gradient(closest-side,rgba(255,255,255,.88) 0 18%,rgba(155,225,210,.4) 42%,transparent 100%);animation:igs-dfx-yg-palm 1.4s cubic-bezier(.3,.7,.3,1) both;}
#igs-overlay .igs-dfx-yungong-pulse{position:absolute;width:12%;aspect-ratio:1;margin:-6% 0 0 -6%;border-radius:50%;border:1px solid rgba(150,220,205,.6);opacity:0;animation:igs-dfx-yg-pulse 1.1s ease-out 1s both;}
#igs-overlay .igs-dfx-yungong-lines i{position:absolute;width:1px;margin-left:-.5px;background:linear-gradient(0deg,transparent,#a6e2d2 40%,transparent);transform-origin:50% 100%;opacity:0;animation:igs-dfx-yg-line 1.5s ease-in-out both;}
#igs-overlay .igs-dfx-yungong-aura{position:absolute;inset:0;opacity:0;animation:igs-dfx-yg-aura var(--igs-dfx-life) ease-in-out both;}
#igs-overlay .igs-dfx-yungong-flow{position:absolute;inset:0;opacity:0;animation:igs-dfx-yg-flow var(--igs-dfx-life) ease-in-out both;}
#igs-overlay .igs-dfx-yungong-shards{position:absolute;width:0;height:0;}
#igs-overlay .igs-dfx-yungong-shards s{position:absolute;left:-1.5px;top:-1.5px;width:3px;height:3px;border-radius:50%;background:#b0b6b6;opacity:0;animation:igs-dfx-yg-shard .8s ease-out both;}
#igs-overlay .igs-dfx-yungong.is-fail .igs-dfx-yungong-palm{background:radial-gradient(closest-side,#f2f2f2 0 28%,rgba(170,176,176,.4) 42%,transparent 74%);}
#igs-overlay .igs-dfx-yungong.is-fail .igs-dfx-yungong-pulse{border-color:rgba(168,174,174,.6);}
#igs-overlay .igs-dfx-yungong.is-fail .igs-dfx-yungong-lines i{background:linear-gradient(0deg,transparent,#a8aeae 40%,transparent);animation-timing-function:steps(5,end);}
@keyframes igs-dfx-yg-palm{0%{opacity:0;transform:translateX(0) scale(.5)}30%{opacity:1;transform:translateX(0) scale(1)}70%{opacity:1;transform:translateX(calc(var(--igs-k) * 100%)) scale(.9)}100%{opacity:0;transform:translateX(calc(var(--igs-k) * 100%)) scale(.3)}}
@keyframes igs-dfx-yg-pulse{0%{opacity:.95;transform:scale(.2)}100%{opacity:0;transform:scale(1.6)}}
@keyframes igs-dfx-yg-line{0%{opacity:0;transform:scaleY(.1)}30%{opacity:.95}100%{opacity:0;transform:scaleY(1)}}
@keyframes igs-dfx-yg-aura{0%,35%{opacity:0}55%{opacity:.55}85%{opacity:.5}100%{opacity:0}}
@keyframes igs-dfx-yg-flow{0%,20%{opacity:0}45%{opacity:1}85%{opacity:.8}100%{opacity:0}}
@keyframes igs-dfx-yg-shard{0%{opacity:0;transform:none}15%{opacity:1}100%{opacity:0;transform:translate(var(--sx),var(--sy)) rotate(var(--sr))}}
#igs-overlay .igs-dfx.is-reduced .igs-dfx-yungong-flow{opacity:.6;}
#igs-overlay .igs-dfx.is-reduced .igs-dfx-yungong-pulse,#igs-overlay .igs-dfx.is-reduced .igs-dfx-yungong-lines,#igs-overlay .igs-dfx.is-reduced .igs-dfx-yungong-shards{display:none;}
`;
