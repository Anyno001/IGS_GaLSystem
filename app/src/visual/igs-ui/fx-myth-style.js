// 神话妖魔包的演出样式。落点与尺寸取舞台百分比；终态即静止态，减少动态效果时去掉全部动画即可。装饰用实色。
export const MYTH_STYLE_TEXT = `
#igs-overlay .igs-myth{animation:igs-myth-fade var(--igs-dfx-life) ease both;--myth-c:#e8c875;--myth-d:#1a1208;--myth-l:#fff3cf;}
#igs-overlay .igs-myth.is-azure,#igs-overlay .igs-myth .is-azure{--myth-c:#8cd2f0;--myth-d:#08202e;--myth-l:#e4f6ff;}
#igs-overlay .igs-myth.is-crimson{--myth-c:#f08a78;--myth-d:#2a0c08;--myth-l:#ffe2dc;}
#igs-overlay .igs-myth.is-violet{--myth-c:#bfa2f0;--myth-d:#150a2a;--myth-l:#efe6ff;}
#igs-overlay .igs-myth.is-silver{--myth-c:#dfe6ee;--myth-d:#10151c;--myth-l:#ffffff;}
#igs-overlay .igs-myth.is-jade{--myth-c:#7fd9b0;--myth-d:#06201a;--myth-l:#e2fff2;}
#igs-overlay .igs-myth.is-reduced,#igs-overlay .igs-myth.is-reduced *{animation:none!important;}
#igs-overlay .igs-myth.is-reduced .igs-myth-bolt{opacity:1;}
#igs-overlay .igs-myth.is-reduced .igs-myth-dark{opacity:.16;}
#igs-overlay .igs-myth.is-reduced :is(.igs-myth-ring,.igs-myth-spark,.igs-myth-flash,.igs-myth-ray,.igs-myth-soul,.igs-myth-pulse){display:none;}
@keyframes igs-myth-fade{0%{opacity:0}5%{opacity:1}86%{opacity:1}100%{opacity:0}}
#igs-overlay .igs-myth i,#igs-overlay .igs-myth svg,#igs-overlay .igs-myth-name{position:absolute;display:block;}
#igs-overlay .igs-myth svg{inset:0;width:100%;height:100%;overflow:visible;}

/* 共用：光环、火花、闪白、名称小字 */
#igs-overlay .igs-myth-ring{left:var(--x,50%);top:var(--y,40%);width:9%;aspect-ratio:1;border-radius:50%;border:1px solid var(--myth-c);transform:translate(-50%,-50%) scale(.7);opacity:0;animation:igs-myth-ring 1.4s ease-out .9s both;}
#igs-overlay .igs-myth-ring.is-b{animation-delay:1.2s;}
#igs-overlay .igs-myth-ring.is-hit{animation-delay:.62s;width:12%;border-color:var(--myth-l);}
#igs-overlay .igs-myth-ring.is-red{--myth-c:#f0a090;animation-delay:.32s;}
@keyframes igs-myth-ring{0%{opacity:.8;transform:translate(-50%,-50%) scale(.7)}100%{opacity:0;transform:translate(-50%,-50%) scale(3.4)}}
#igs-overlay .igs-myth-spark{left:var(--x,50%);top:var(--y,40%);width:3px;height:3px;border-radius:50%;background:var(--myth-l);box-shadow:0 0 6px 1px var(--myth-c);opacity:0;animation:igs-myth-spark 1100ms ease-out both;}
@keyframes igs-myth-spark{0%{opacity:1;transform:translate(-50%,-50%) rotate(var(--a)) translateY(0)}100%{opacity:0;transform:translate(-50%,-50%) rotate(var(--a)) translateY(calc(var(--d) * -1))}}
#igs-overlay .igs-myth-flash{inset:0;background:radial-gradient(ellipse at 50% 40%,var(--myth-l) 0,transparent 62%);opacity:0;animation:igs-myth-flash 800ms ease-out .62s both;}
#igs-overlay .igs-myth-flash.is-soft{animation-delay:.1s;}
@keyframes igs-myth-flash{0%{opacity:.5}100%{opacity:0}}
#igs-overlay .igs-myth-name{left:var(--x,50%);top:min(calc(var(--y,40%) + 9%),calc(var(--igs-fx-vis) - 6%));transform:translateX(-50%);white-space:nowrap;font-weight:500;font-size:14px;letter-spacing:.24em;color:var(--myth-l);text-shadow:0 0 6px var(--myth-d),0 0 2px var(--myth-d),0 1px 3px var(--myth-d);}
#igs-overlay .igs-myth-name span{display:inline-block;animation:igs-myth-char .5s ease both;}
#igs-overlay .igs-myth-name.is-low{left:50%;top:auto;bottom:calc(var(--igs-fx-safe) + 12px);}
#igs-overlay .igs-myth-name.is-tag{transform:translate(-50%,-50%);font-size:.95em;}
@keyframes igs-myth-char{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
#igs-overlay .igs-myth-tag{top:26%;font-weight:500;font-size:14px;letter-spacing:.18em;color:var(--myth-l);text-shadow:0 0 6px var(--myth-d),0 1px 3px var(--myth-d);animation:igs-myth-char .6s ease .1s both;}
#igs-overlay .igs-myth-tag.is-l{left:10%;}
#igs-overlay .igs-myth-tag.is-r{right:10%;}

/* 法宝：飞出、落定、光环 */
#igs-overlay .igs-myth-fly{position:absolute;inset:0;animation:igs-myth-fly 1.1s cubic-bezier(.2,.8,.25,1) both;}
@keyframes igs-myth-fly{from{opacity:0;transform:translate(var(--fdx,0),var(--fdy,0)) scale(.4)}to{opacity:1;transform:translate(0,0) scale(1)}}
#igs-overlay .igs-myth-relic-orb{left:var(--x,50%);top:var(--y,40%);width:min(9%,64px);aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,var(--myth-l) 0,var(--myth-c) 14%,transparent 66%);opacity:.9;animation:igs-myth-bob 2.4s ease-in-out 1.1s infinite alternate;}
#igs-overlay .igs-myth-relic-gem{inset:24%;border:1px solid var(--myth-l);transform:rotate(45deg);border-radius:2px;opacity:.7;}
@keyframes igs-myth-bob{from{scale:1}to{scale:1.07}}
#igs-overlay .igs-myth-clash .igs-myth-fly.is-l{animation:igs-myth-clash-l .62s cubic-bezier(.5,0,.9,.6) both;}
#igs-overlay .igs-myth-clash .igs-myth-fly.is-r{animation:igs-myth-clash-r .62s cubic-bezier(.5,0,.9,.6) both;}
#igs-overlay .igs-myth-clash .igs-myth-relic-orb{animation:none;}
#igs-overlay .igs-myth-clash .igs-myth-fly.is-l .igs-myth-relic-orb{left:44%;}
#igs-overlay .igs-myth-clash .igs-myth-fly.is-r .igs-myth-relic-orb{left:56%;}
@keyframes igs-myth-clash-l{from{transform:translate(-34%,6%) scale(.6);opacity:0}15%{opacity:1}to{transform:translate(0,0) scale(1);opacity:1}}
@keyframes igs-myth-clash-r{from{transform:translate(34%,6%) scale(.6);opacity:0}15%{opacity:1}to{transform:translate(0,0) scale(1);opacity:1}}
#igs-overlay .igs-myth-ray{left:50%;top:40%;width:1px;height:12%;background:linear-gradient(180deg,var(--myth-l),transparent);transform-origin:50% 0;transform:rotate(var(--a)) translateY(2%);opacity:0;animation:igs-myth-ray 600ms ease-out .62s both;}
@keyframes igs-myth-ray{0%{opacity:1;transform:rotate(var(--a)) translateY(2%) scaleY(.3)}100%{opacity:0;transform:rotate(var(--a)) translateY(60%) scaleY(1.3)}}

/* 封神榜：侧边细线名录，不压人物 */
#igs-overlay .igs-myth-mythroll{display:block;}
#igs-overlay .igs-myth-roll-board{position:absolute;right:max(16px,4%);top:12%;min-width:96px;padding:6px 4px 6px 16px;border-left:1px solid var(--myth-c);background:linear-gradient(90deg,rgba(14,10,6,.46),transparent);color:var(--myth-c);animation:igs-myth-unroll .8s ease-out both;}
@keyframes igs-myth-unroll{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
#igs-overlay .igs-myth-roll-title{font-weight:500;font-size:14px;letter-spacing:.5em;padding-bottom:6px;margin-bottom:4px;border-bottom:1px solid rgba(232,200,117,.4);color:var(--myth-l);}
#igs-overlay .igs-myth-roll-row{position:relative;height:28px;display:flex;align-items:center;justify-content:flex-start;}
#igs-overlay .igs-myth-roll-row b{font-weight:400;letter-spacing:.3em;font-size:14px;color:var(--myth-l);text-shadow:0 0 6px var(--myth-c),0 1px 3px var(--myth-d);animation:igs-myth-light .6s ease var(--delay) both;}
@keyframes igs-myth-light{from{color:rgba(255,243,207,.4);text-shadow:none}to{color:var(--myth-l);text-shadow:0 0 6px var(--myth-c),0 1px 3px var(--myth-d)}}
#igs-overlay .igs-myth-soul{right:0;top:50%;width:3px;height:3px;margin-top:-1px;border-radius:50%;background:var(--myth-l);box-shadow:0 0 6px 1px var(--myth-c);opacity:0;animation:igs-myth-soul 1.2s ease-in var(--delay) both;}
@keyframes igs-myth-soul{0%{opacity:0;transform:translate(0,0)}20%{opacity:.9}85%{opacity:.9}100%{opacity:0;transform:translate(-12px,calc(var(--dy) * -.5))}}

/* 阵法与结界：描边一次画出，其后缓转 */
#igs-overlay .igs-myth-ground{position:absolute;left:50%;top:62%;width:56%;aspect-ratio:1;transform:translate(-50%,-50%) rotateX(66deg);transform-style:preserve-3d;}
#igs-overlay .igs-myth-ground svg,#igs-overlay .igs-myth-dome svg{position:absolute;inset:0;}
#igs-overlay .igs-myth-spin{position:absolute;inset:0;animation:igs-myth-spin 6s ease-out both;}
@keyframes igs-myth-spin{from{transform:rotate(-40deg)}to{transform:rotate(0)}}
#igs-overlay .igs-myth-line{fill:none;stroke:var(--myth-c);stroke-width:1.2px;vector-effect:non-scaling-stroke;stroke-linejoin:round;filter:drop-shadow(0 0 3px var(--myth-c));animation:igs-myth-draw 1.5s ease-out both;}
#igs-overlay .igs-myth-line.is-thin{stroke-width:.8px;animation-delay:.3s;}
#igs-overlay .igs-myth-tick{stroke:var(--myth-c);stroke-width:1px;vector-effect:non-scaling-stroke;}
#igs-overlay .igs-myth-enter .igs-myth-line,#igs-overlay .igs-myth-enter .igs-myth-tick{stroke:#bfa2f0;}
#igs-overlay .igs-myth-barrier .igs-myth-line,#igs-overlay .igs-myth-barrier .igs-myth-tick{stroke:#a8e4f8;}
#igs-overlay .igs-myth-break .igs-myth-line{stroke:#f0a088;}
@keyframes igs-myth-draw{from{stroke-dasharray:1;stroke-dashoffset:1}to{stroke-dasharray:1;stroke-dashoffset:0}}
#igs-overlay .igs-myth-tint{inset:0;background:#2b1f6e;mix-blend-mode:multiply;opacity:.2;animation:igs-myth-tint 1.2s ease both;}
@keyframes igs-myth-tint{from{opacity:0}to{opacity:.2}}
#igs-overlay .igs-myth-shard{position:absolute;inset:0;transform:translate(calc(var(--tx) * .12),calc(var(--ty) * .12)) rotate(calc(var(--rot) * .12));animation:igs-myth-shard 1.6s cubic-bezier(.3,.6,.4,1) .35s both;}
#igs-overlay .igs-myth-shard.is-form .igs-myth-line,#igs-overlay .igs-myth-shard.is-dome .igs-myth-line{animation:none;}
@keyframes igs-myth-shard{0%{transform:translate(0,0) rotate(0);opacity:1}100%{transform:translate(var(--tx),var(--ty)) rotate(var(--rot));opacity:0}}
#igs-overlay .igs-myth-dome{position:absolute;left:50%;bottom:calc(var(--igs-fx-safe) - 6%);width:70%;height:min(78%,calc(var(--igs-fx-vis) - 4%));transform:translateX(-50%);}
#igs-overlay .igs-myth-grow{position:absolute;inset:0;transform-origin:50% 100%;animation:igs-myth-grow 1.1s cubic-bezier(.2,.8,.3,1) both;}
@keyframes igs-myth-grow{from{transform:scale(.55);opacity:0}to{transform:scale(1);opacity:1}}
#igs-overlay .igs-myth-pulse{left:50%;bottom:calc(var(--igs-fx-safe) - 8%);width:70%;height:6%;border-radius:50%;border:1px solid #a8e4f8;transform:translateX(-50%);animation:igs-myth-pulse 1.3s ease-out both;}
@keyframes igs-myth-pulse{from{opacity:.8;transform:translateX(-50%) scale(.3)}to{opacity:0;transform:translateX(-50%) scale(1.15)}}
#igs-overlay .igs-myth-barrier.is-break .igs-myth-pulse{display:none;}

/* 三昧真火：柔光火舌 */
#igs-overlay .igs-myth-glow{left:var(--x);top:50%;width:46%;height:70%;transform:translate(-50%,-50%);background:radial-gradient(ellipse,rgba(255,150,70,.5) 0,transparent 70%);opacity:.3;animation:igs-myth-glow 2s ease-in-out infinite alternate;}
@keyframes igs-myth-glow{from{opacity:.2}to{opacity:.38}}
#igs-overlay .igs-myth-fire{position:absolute;inset:0;}
#igs-overlay .igs-myth-tongue{left:calc(var(--x) + var(--dx));bottom:calc(100% - var(--base));width:var(--w);height:calc(var(--h) * .8);transform:translateX(-50%);transform-origin:50% 100%;border-radius:50% 50% 50% 50% / 70% 70% 30% 30%;background:linear-gradient(0deg,rgba(255,226,150,.55) 0%,rgba(255,150,60,.34) 45%,rgba(255,100,40,0) 100%);animation:igs-myth-lick 1.6s ease-in-out infinite alternate,igs-myth-ignite .9s ease-out both;}
#igs-overlay .igs-myth-tongue:nth-child(2n){animation-duration:1.3s,.9s;}
@keyframes igs-myth-lick{from{scale:1 .9}to{scale:1.06 1.05}}
@keyframes igs-myth-ignite{from{opacity:0;transform:translateX(-50%) scaleY(.1)}to{opacity:1;transform:translateX(-50%) scaleY(1)}}
#igs-overlay .igs-myth-ember{left:calc(var(--x) + var(--dx));bottom:calc(100% - var(--base) + 8%);width:3px;height:3px;border-radius:50%;background:#ffe0a0;box-shadow:0 0 5px 1px rgba(255,170,80,.8);opacity:0;animation:igs-myth-ember 2.2s ease-out infinite;}
@keyframes igs-myth-ember{0%{opacity:0;transform:translateY(0)}20%{opacity:.9}100%{opacity:0;transform:translateY(calc(var(--rise) * -6px))}}
#igs-overlay .igs-myth-flame.is-reduced .igs-myth-ember{display:none;}

/* 天雷：细闪电 */
#igs-overlay .igs-myth-dark{inset:0;background:#080818;opacity:.3;animation:igs-myth-dark 1.9s ease both;}
@keyframes igs-myth-dark{0%{opacity:0}8%{opacity:.34}60%{opacity:.28}100%{opacity:0}}
#igs-overlay .igs-myth-cloud{left:0;right:0;top:0;height:20%;background:linear-gradient(180deg,rgba(20,20,46,.7) 0%,transparent 100%);animation:igs-myth-dark 1.9s ease both;}
#igs-overlay .igs-myth-bolt{fill:none;stroke:#f4f0ff;stroke-width:1.5px;stroke-linejoin:round;vector-effect:non-scaling-stroke;opacity:0;animation:igs-myth-bolt 700ms steps(1,end) .14s both;}
#igs-overlay .igs-myth-bolt.is-glow{stroke:#b9a6ff;stroke-width:5px;opacity:.5;}
#igs-overlay .igs-myth-bolt.is-fork{stroke-width:1px;}
@keyframes igs-myth-bolt{0%{opacity:1}25%{opacity:0}40%{opacity:1}60%{opacity:.7}100%{opacity:0}}
#igs-overlay .igs-myth-thunder .igs-myth-flash{animation-delay:.14s;opacity:0;}
#igs-overlay .igs-myth-thunder .igs-myth-ring.is-hit{animation-delay:.14s;width:10%;}
#igs-overlay .igs-myth-scorch{left:var(--x);top:var(--y);width:12%;height:4%;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(ellipse,rgba(26,18,38,.5),transparent 70%);opacity:0;animation:igs-myth-scorch 1.8s ease-out .2s both;}
@keyframes igs-myth-scorch{0%{opacity:.7;scale:.4}100%{opacity:0;scale:1.4}}

/* 妖气、魅惑：雾与细丝，不画眼 */
#igs-overlay .igs-myth-wisp{width:1.6%;height:26%;top:var(--top);transform:translate(-50%,-100%);border-radius:50% 50% 0 0;background:linear-gradient(0deg,var(--wisp,#8a5cc0),transparent);opacity:0;animation:igs-myth-wisp 3s ease-out infinite;}
#igs-overlay .igs-myth-aura.is-mo{--wisp:#c0384a;}
#igs-overlay .igs-myth-aura.is-xian{--wisp:#e4f6ff;}
@keyframes igs-myth-wisp{0%{opacity:0;transform:translate(-50%,-70%)}30%{opacity:.5}100%{opacity:0;transform:translate(-50%,-150%)}}
#igs-overlay .igs-myth-aura .igs-myth-name{color:#e4d2ff;}
#igs-overlay .igs-myth-aura.is-xian .igs-myth-name{color:#ffffff;}
#igs-overlay .igs-myth-swirl{aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;border:1px solid rgba(255,150,196,.7);border-top-color:transparent;border-left-color:transparent;animation:igs-myth-swirl 4s linear infinite;}
#igs-overlay .igs-myth-swirl.is-b{width:75%!important;border-color:rgba(255,190,214,.6);border-bottom-color:transparent;border-right-color:transparent;animation-direction:reverse;}
@keyframes igs-myth-swirl{to{transform:translate(-50%,-50%) rotate(360deg)}}

/* 吸取精气 */
#igs-overlay .igs-myth-drain .igs-link.is-line{stroke-dasharray:.05 .07;animation:igs-myth-flow 1.4s linear infinite;stroke-width:1px;opacity:.7;}
@keyframes igs-myth-flow{from{stroke-dashoffset:0}to{stroke-dashoffset:-.12}}
#igs-overlay .igs-myth-mote{position:absolute;inset:0;opacity:0;animation:igs-myth-mote 1.8s ease-in infinite;}
#igs-overlay .igs-myth-mote i{width:4px;height:4px;border-radius:50%;background:#e4f6ff;box-shadow:0 0 6px 1px #8cd2f0;transform:translate(-50%,-50%);}
@keyframes igs-myth-mote{0%{opacity:0;transform:translate(0,0)}15%{opacity:.9}85%{opacity:.9}100%{opacity:0;transform:translate(var(--dx),var(--dy))}}
#igs-overlay .igs-myth-gain{aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;border:1px solid #bfe6ff;opacity:0;animation:igs-myth-gain 1.6s ease-out 1.2s infinite;}
@keyframes igs-myth-gain{0%{opacity:.7;scale:.6}100%{opacity:0;scale:1.6}}

/* 降妖：细线符文、光轮、光涡、光链；落在头侧，不压脸 */
#igs-overlay .igs-myth-slip{position:absolute;left:var(--sx);top:var(--y);width:max(36px,4.2%);aspect-ratio:1/2.6;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;justify-content:space-evenly;border:1px solid var(--myth-c);border-radius:2px;background:rgba(14,10,6,.4);color:var(--myth-l);font-weight:400;font-size:14px;text-shadow:0 0 6px var(--myth-c);animation:igs-myth-slap .6s ease-out both;}
#igs-overlay .igs-myth-slip b{font-weight:400;}
@keyframes igs-myth-slap{from{opacity:0;transform:translate(-50%,-70%)}to{opacity:1;transform:translate(-50%,-50%)}}
#igs-overlay .igs-myth-bowl{position:absolute;left:var(--x);top:var(--by);width:30%;aspect-ratio:3;transform:translate(-50%,-50%);border-radius:50%;border:1px solid var(--myth-c);background:radial-gradient(ellipse,rgba(232,200,117,.2),transparent 70%);box-shadow:0 0 12px 1px rgba(232,200,117,.5);animation:igs-myth-bowl 1s ease-out both;}
#igs-overlay .igs-myth-bowl-rim{left:10%;right:10%;top:20%;bottom:20%;border-radius:50%;border:1px solid rgba(255,243,207,.6);}
@keyframes igs-myth-bowl{from{transform:translate(-50%,-160%);opacity:0}to{transform:translate(-50%,-50%);opacity:1}}
#igs-overlay .igs-myth-subdue .igs-myth-ring.is-b{--myth-c:#fff3cf;animation-delay:.9s;left:var(--x);top:var(--y);}
#igs-overlay .igs-myth-gourd-orb{top:20%;width:min(5%,36px);aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,var(--myth-l) 0,var(--myth-c) 18%,transparent 68%);animation:igs-myth-char .6s ease both;}
#igs-overlay .igs-myth-vortex{top:20%;aspect-ratio:1;width:16%;transform:translate(-50%,-50%);border-radius:50%;border:1px solid var(--myth-c);opacity:0;animation:igs-myth-vortex 1.4s ease-in .3s infinite;}
#igs-overlay .igs-myth-vortex.is-b{animation-delay:1s;}
@keyframes igs-myth-vortex{0%{opacity:0;transform:translate(-50%,-50%) scale(2)}30%{opacity:.8}100%{opacity:0;transform:translate(-50%,-50%) scale(.2)}}
#igs-overlay .igs-myth-chain{fill:none;stroke:var(--myth-l);stroke-width:1.2px;stroke-linecap:round;stroke-dasharray:.03 .012;vector-effect:non-scaling-stroke;filter:drop-shadow(0 0 3px var(--myth-c));animation:igs-myth-draw .9s ease-out both;}
#igs-overlay .igs-myth-chain.is-under{stroke:var(--myth-c);stroke-width:1px;stroke-dasharray:.045 0;opacity:.5;filter:none;}
#igs-overlay .igs-myth-lock{width:2.4%;aspect-ratio:1;transform:translate(-50%,-50%) rotate(45deg);border:1px solid var(--myth-l);box-shadow:0 0 6px var(--myth-c);animation:igs-myth-char .4s ease .9s both;}
#igs-overlay .igs-myth-subdue.is-chain .igs-myth-flash{animation-delay:.9s;}

/* 妖丹：一点柔光 */
#igs-overlay .igs-myth-core{position:absolute;left:50%;top:38%;width:0;height:0;}
#igs-overlay .igs-myth-core-body{left:-5vmin;top:-5vmin;width:10vmin;height:10vmin;border-radius:50%;background:radial-gradient(circle,var(--myth-l) 0,var(--myth-c) 16%,transparent 66%);animation:igs-myth-beat 1.6s ease-in-out infinite;}
@keyframes igs-myth-beat{0%,100%{scale:1}30%{scale:1.08}60%{scale:1}}
#igs-overlay .igs-myth-core-ring{left:-5vmin;top:-5vmin;width:10vmin;height:10vmin;border-radius:50%;border:1px solid var(--myth-c);opacity:0;animation:igs-myth-core-ring 2.6s ease-out infinite;}
#igs-overlay .igs-myth-core-ring.is-b{animation-delay:1.3s;}
@keyframes igs-myth-core-ring{0%{opacity:.7;scale:.9}100%{opacity:0;scale:2.6}}
#igs-overlay .igs-myth-mote-up{left:var(--dx);top:0;width:3px;height:3px;border-radius:50%;background:var(--myth-l);box-shadow:0 0 5px 1px var(--myth-c);opacity:0;animation:igs-myth-up 2.4s ease-out infinite;}
@keyframes igs-myth-up{0%{opacity:0;transform:translateY(0)}20%{opacity:.9}100%{opacity:0;transform:translateY(-12vmin)}}
#igs-overlay .igs-myth-core-label{position:absolute;left:50%;top:9vmin;transform:translateX(-50%);text-align:center;color:var(--myth-l);text-shadow:0 0 6px var(--myth-d),0 1px 3px var(--myth-d);}
#igs-overlay .igs-myth-core-label span{display:block;font-size:12px;letter-spacing:.5em;opacity:.85;}
#igs-overlay .igs-myth-core-label b{display:block;font-weight:500;font-size:14px;letter-spacing:.25em;}
#igs-overlay .igs-myth-core-label b span{display:inline-block;font-size:14px;letter-spacing:.25em;opacity:1;animation:igs-myth-char .5s ease both;}

/* 血契：细线契印 */
#igs-overlay .igs-myth svg.igs-myth-seal{inset:auto;height:auto;aspect-ratio:1;transform:translate(-50%,-50%);fill:none;stroke:#f08a78;stroke-width:1.2px;filter:drop-shadow(0 0 3px rgba(240,138,120,.7));animation:igs-myth-stamp .6s ease-out .3s both;}
#igs-overlay .igs-myth-seal.is-b{animation-delay:.55s;}
#igs-overlay .igs-myth-seal .is-thin{stroke-width:.8px;}
#igs-overlay .igs-myth-seal .is-fill{fill:#f08a78;stroke:none;}
@keyframes igs-myth-stamp{from{opacity:0;scale:1.4}to{opacity:1;scale:1}}
#igs-overlay .igs-myth-pact .igs-myth-name{color:#ffd0c8;}
#igs-overlay .igs-myth-pact .igs-link.is-line{stroke-width:1px;animation-delay:.8s;}

/* 常驻地点层 */
#igs-overlay .igs-myth-amb-sky{inset:0;background:linear-gradient(180deg,rgba(255,226,150,.2),rgba(255,236,190,.06) 40%,transparent 70%);}
#igs-overlay .igs-myth-amb-cloud{left:-20%;bottom:-6%;width:70%;height:30%;border-radius:50%;background:radial-gradient(ellipse,rgba(255,255,255,.34),transparent 70%);animation:igs-myth-drift 70s ease-in-out infinite alternate;}
#igs-overlay .igs-myth-amb-cloud.is-b{left:auto;right:-20%;bottom:-2%;width:60%;height:24%;animation-duration:90s;animation-direction:alternate-reverse;}
@keyframes igs-myth-drift{from{transform:translateX(0)}to{transform:translateX(30%)}}
#igs-overlay .igs-myth-amb-pillar{top:0;bottom:0;width:5%;background:linear-gradient(90deg,rgba(214,168,60,.32),rgba(255,226,150,.12));}
#igs-overlay .igs-myth-amb-pillar.is-l{left:0;}
#igs-overlay .igs-myth-amb-pillar.is-r{right:0;transform:scaleX(-1);}
#igs-overlay .igs-myth-amb-lantern{top:-1%;width:3.2%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,var(--lamp,#3fe0b0) 0,transparent 68%);opacity:.5;animation:igs-myth-flick 5s ease-in-out infinite alternate;}
@keyframes igs-myth-flick{from{opacity:.4}to{opacity:.7}}
#igs-overlay .igs-myth-amb-lowmist{left:0;right:0;bottom:0;height:34%;background:linear-gradient(0deg,rgba(60,40,90,.4),transparent);}
#igs-overlay .igs-myth-amb-veil{inset:0;background:radial-gradient(ellipse at 50% 55%,transparent 38%,rgba(12,4,24,.62) 100%);}
#igs-overlay .igs-dfx-amb svg.igs-myth-amb-lilies{position:absolute;left:0;bottom:0;width:100%;height:16%;}
#igs-overlay .igs-myth-amb-lilies path{fill:none;stroke:#c1121f;stroke-width:1.1px;stroke-linecap:round;vector-effect:non-scaling-stroke;}
#igs-overlay .igs-myth-amb-lilies .stem{stroke:#2c5a3a;stroke-width:1.4px;}
#igs-overlay .igs-myth-amb-redmist{left:-10%;bottom:-8%;width:120%;height:30%;background:radial-gradient(ellipse,rgba(190,20,40,.22),transparent 70%);animation:igs-myth-drift 80s ease-in-out infinite alternate;}
#igs-overlay .igs-myth-amb-dark{inset:0;background:radial-gradient(ellipse at 50% 60%,transparent 30%,rgba(6,8,10,.7) 100%);}
#igs-overlay .igs-myth-amb-stalac{left:0;right:0;top:0;height:16%;background:linear-gradient(180deg,rgba(12,14,18,.85),transparent);}
#igs-overlay .igs-myth-amb-eyes{right:14%;bottom:calc(var(--igs-fx-safe) + var(--igs-fx-vis) * .3);width:9%;height:4%;background:radial-gradient(ellipse,rgba(255,226,170,.5),transparent 70%);opacity:.4;animation:igs-myth-blink 12s ease-in-out infinite;}
@keyframes igs-myth-blink{0%,70%,100%{opacity:0}74%,86%{opacity:.6}}
#igs-overlay .igs-myth-amb-glint{left:30%;top:16%;width:3px;height:3px;border-radius:50%;background:#bfe6ff;opacity:0;animation:igs-myth-drip 4.4s ease-in infinite;}
@keyframes igs-myth-drip{0%{opacity:0;transform:translateY(0)}10%{opacity:.8}40%{opacity:.8;transform:translateY(170px)}45%,100%{opacity:0;transform:translateY(190px)}}
#igs-overlay[data-igs-quality="low"] .igs-myth-amb-cloud,#igs-overlay[data-igs-quality="low"] .igs-myth-amb-redmist,#igs-overlay[data-igs-quality="low"] .igs-myth-amb-lantern,#igs-overlay[data-igs-quality="low"] .igs-myth-amb-eyes,#igs-overlay[data-igs-quality="low"] .igs-myth-amb-glint{animation:none;}
#igs-overlay[data-igs-quality="low"] .igs-myth-glow,#igs-overlay[data-igs-quality="low"] .igs-myth-tongue,#igs-overlay[data-igs-quality="low"] .igs-myth-ember,#igs-overlay[data-igs-quality="low"] .igs-myth-core-body,#igs-overlay[data-igs-quality="low"] .igs-myth-core-ring,#igs-overlay[data-igs-quality="low"] .igs-myth-swirl{animation-iteration-count:1;}
#igs-overlay[data-igs-quality="low"] .igs-myth-relic-orb,#igs-overlay[data-igs-quality="low"] .igs-myth-wisp,#igs-overlay[data-igs-quality="low"] .igs-myth-mote,#igs-overlay[data-igs-quality="low"] .igs-myth-mote-up,#igs-overlay[data-igs-quality="low"] .igs-myth-gain,#igs-overlay[data-igs-quality="low"] .igs-myth-vortex,#igs-overlay[data-igs-quality="low"] .igs-myth-drain .igs-link.is-line{animation-iteration-count:1;}
`;
