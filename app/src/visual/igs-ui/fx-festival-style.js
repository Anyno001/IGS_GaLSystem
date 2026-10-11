// 人生大事与节日的样式。写法约定：基础样式即“终态”，关键帧只写起点，减少动态（animation:none）时直接停在终态。
// 每行一条规则；开头的选择器自动加 #igs-overlay 前缀，LOW 开头的规则只在低画质下生效。
// 去拟物：不画蛋糕/礼物/戒指/红包实物，用细线（1px 金）、柔光与排版暗示；内容放在人物左右两侧（--fx-l / --fx-r 列心），不压脸。
const RULES = `
.igs-dfx-fest{--fx-l:23%;--fx-r:79%;--fx-gold:232,208,150;animation:igs-dfx-fade var(--igs-dfx-life) ease both;font-family:"LXGW WenKai","Yozai",serif;color:#f6ecd6;}
.igs-dfx-fest-veil{position:absolute;inset:0;background:linear-gradient(to right,#120d14 0,#120d14 8%,#12091220 30%,#12091220 70%,#120d14 92%,#120d14 100%);opacity:.7;}
.igs-dfx-fest-veil.is-soft{opacity:.38;}
.igs-dfx-fest-veil.is-night{background:linear-gradient(to right,#0a1220 0,#0a1220 8%,#0a122020 30%,#0a122020 70%,#0a1220 92%,#0a1220 100%);opacity:.72;}
.igs-dfx-fest-veil.is-red{background:linear-gradient(to right,#3a0c0c 0,#3a0c0c 8%,#3a0c0c22 30%,#3a0c0c22 70%,#3a0c0c 92%,#3a0c0c 100%);opacity:.65;}
.igs-dfx-fest-veil.is-white{background:linear-gradient(180deg,#fff3e833 0,#fff3e800 45%);opacity:.5;}
.igs-dfx-fest-host{position:absolute;inset:0;}
.igs-dfx-fest-roll{display:inline-block;height:1.2em;overflow:hidden;line-height:1.2em;vertical-align:bottom;}
.igs-dfx-fest-strip{display:block;transform:translateY(var(--fest-shift));animation:igs-fest-roll 1100ms steps(7,end) both;}
.igs-dfx-fest-strip>span{display:block;height:1.2em;text-align:right;}
@keyframes igs-fest-roll{from{transform:translateY(0)}}
.igs-dfx-bday-cake{position:absolute;left:var(--fx-l);top:calc(var(--igs-fx-vis) * .4);width:min(26vmin,200px);height:min(22vmin,170px);transform:translate(-50%,-50%);animation:igs-fest-rise 800ms cubic-bezier(.2,.8,.2,1) 250ms both;}
@keyframes igs-fest-rise{from{opacity:0;transform:translate(-50%,-44%)}}
.igs-dfx-bday .igs-dfx-fest-veil{background:linear-gradient(to right,#2a0814 0,#2a0814 8%,#2a081422 30%,#2a081422 70%,#2a0814 92%,#2a0814 100%);opacity:.58;}
.igs-dfx-bday-plate{position:absolute;left:-10%;right:-10%;bottom:0;height:6px;background:linear-gradient(180deg,rgba(255,230,200,.28),rgba(255,220,190,.06));border-bottom:1px solid rgba(var(--fx-gold),.55);}
.igs-dfx-bday-tier{position:absolute;display:block;border:1px solid rgba(var(--fx-gold),.6);background:linear-gradient(180deg,rgba(255,230,210,.42),rgba(245,195,185,.26));box-shadow:inset 0 2px 0 rgba(255,255,255,.2),0 2px 8px rgba(120,40,30,.15);}
.igs-dfx-bday-tier.is-bottom{left:0;right:0;bottom:6%;height:40%;border-radius:4px;}
.igs-dfx-bday-tier.is-bottom::before{content:none;}
.igs-dfx-bday-tier.is-top{left:16%;right:16%;bottom:46%;height:30%;border-radius:3px;z-index:1;background:linear-gradient(180deg,rgba(255,215,220,.48),rgba(245,185,195,.3));}
.igs-dfx-bday-tier.is-top::before{content:none;}
.igs-dfx-bday-berries{display:none;}
.igs-dfx-bday-candles{position:absolute;left:16%;right:16%;bottom:76%;height:30%;z-index:2;}
.igs-dfx-bday-candle{position:absolute;bottom:0;width:6px;height:62%;margin-left:-3px;background:linear-gradient(180deg,#fbe8d4,#e8b89a);border-radius:2px 2px 1px 1px;box-shadow:0 1px 4px rgba(180,80,30,.25);}
.igs-dfx-bday-candle.is-b{background:linear-gradient(180deg,#f8d4e8,#e8a0c0);}
.igs-dfx-bday-fw{position:absolute;left:50%;bottom:100%;width:14px;height:22px;margin-left:-7px;animation:igs-fest-snuff 260ms ease-in calc(1500ms + var(--i) * 110ms) both;}
.igs-dfx-bday-flame{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle,#fff3cf 0,#ffd98a88 22%,#ffc06a00 68%);transform-origin:50% 100%;animation:igs-fest-flicker .5s ease-in-out infinite alternate;}
@keyframes igs-fest-flicker{from{transform:scale(.9);opacity:.8}to{transform:scale(1.12);opacity:1}}
@keyframes igs-fest-snuff{0%{opacity:1;transform:scale(1)}55%{opacity:1;transform:scale(1.2,.7)}100%{opacity:0;transform:scale(.2)}}
.igs-dfx-bday-smoke{position:absolute;left:50%;bottom:100%;width:1px;height:26px;margin-left:-.5px;background:linear-gradient(0deg,#e6e0d8aa,#e6e0d800);opacity:0;transform-origin:50% 100%;animation:igs-fest-smoke 1500ms ease-out calc(1560ms + var(--i) * 110ms) both;}
@keyframes igs-fest-smoke{0%{opacity:0;transform:translateY(0)}25%{opacity:.7}100%{opacity:0;transform:translateY(-26px) scaleX(2)}}
.igs-dfx-bday-age{position:absolute;left:50%;bottom:20%;transform:translateX(-50%);min-width:1.9em;padding:.05em .55em;border-radius:999px;border:1px solid rgba(var(--fx-gold),.55);color:#f6ecd6;text-align:center;font-weight:400;letter-spacing:.06em;font-size:clamp(14px,3vmin,22px);z-index:2;}
.igs-dfx-bday-text{position:absolute;left:calc(var(--fx-l) - 20%);width:40%;top:calc(var(--igs-fx-vis) * .4 + min(11vmin,85px) + 18px);text-align:center;font-size:clamp(20px,4.6vmin,36px);font-weight:400;letter-spacing:.24em;color:#f8eed8;text-shadow:0 0 18px rgba(var(--fx-gold),.4),0 1px 6px #0007;}
.igs-dfx-bday-text span{display:inline-block;animation:igs-fest-pop 560ms cubic-bezier(.2,1,.3,1) both;}
@keyframes igs-fest-pop{from{opacity:0;transform:translateY(8px)}}
.igs-dfx-bday-motes{position:absolute;inset:0;overflow:hidden;}
.igs-dfx-bday-motes i{position:absolute;bottom:calc(var(--igs-fx-safe) + 6%);width:var(--s);height:var(--s);border-radius:50%;background:rgba(var(--fx-gold),.75);box-shadow:0 0 8px 2px rgba(var(--fx-gold),.35);opacity:0;animation:igs-fest-mote var(--d) ease-out infinite;animation-delay:var(--w);}
@keyframes igs-fest-mote{0%{opacity:0;transform:translateY(0)}25%{opacity:.9}100%{opacity:0;transform:translateY(-34vmin)}}
LOW .igs-dfx-bday-motes{display:none;}
.igs-dfx.is-reduced .igs-dfx-bday-fw{display:none;}
.igs-dfx.is-reduced .igs-dfx-bday-motes{display:none;}
.igs-dfx-cd-num{position:absolute;left:calc(var(--fx-l) - 20%);width:40%;top:calc(var(--igs-fx-vis) * .42 - .6em);height:1.2em;overflow:hidden;line-height:1.2;text-align:center;font-weight:300;font-size:clamp(64px,15vmin,120px);color:#f8eed8;text-shadow:0 0 28px rgba(var(--fx-gold),.45);animation:igs-fest-fadeout 300ms ease-in both;}
.igs-dfx-cd-strip{display:block;transform:translateY(var(--fest-shift));animation:igs-fest-count linear both;}
.igs-dfx-cd-strip>span{display:block;height:1.2em;animation:igs-fest-tick 700ms ease-out both;}
@keyframes igs-fest-count{from{transform:translateY(0)}}
@keyframes igs-fest-tick{from{opacity:.2;transform:scale(1.2)}}
@keyframes igs-fest-fadeout{to{opacity:0}}
.igs-dfx-cd-title{position:absolute;left:calc(var(--fx-l) - 20%);width:40%;top:calc(var(--igs-fx-vis) * .42 - .6em);text-align:center;font-size:clamp(28px,7vmin,56px);line-height:1.2;animation:igs-fest-title 1000ms ease-out both;}
.igs-dfx-cd-title b{color:#f8eed8;font-weight:400;letter-spacing:.3em;text-shadow:0 0 26px rgba(var(--fx-gold),.5),0 1px 6px #0007;}
.igs-dfx-cd-title::after{content:"";display:block;width:34%;margin:.5em auto 0;border-top:1px solid rgba(var(--fx-gold),.5);}
@keyframes igs-fest-title{from{opacity:0;transform:translateY(8px)}}
.igs-dfx.is-reduced .igs-dfx-cd-num{display:none;}
.igs-dfx-countdown.is-ancient .igs-dfx-fest-veil{background:radial-gradient(ellipse at 50% 42%,#2a0d0d00 30%,#2a0d0d 100%);}
.igs-dfx-countdown.is-ancient .igs-dfx-cd-num{color:#f2dca0;font-family:"STKaiti","KaiTi","LXGW WenKai",serif;}
.igs-dfx-countdown.is-ancient .igs-dfx-cd-title b{color:#f2dca0;}
.igs-dfx-cd-couplet{position:absolute;top:12%;height:calc(var(--igs-fx-vis) * .7);width:clamp(34px,6.4vmin,52px);border:1px solid rgba(var(--fx-gold),.5);background:linear-gradient(180deg,#8a161200,#8a161233);transform-origin:50% 0;animation:igs-fest-unroll 900ms cubic-bezier(.3,.8,.3,1) 150ms both;}
.igs-dfx-cd-couplet.is-left{left:5%;}
.igs-dfx-cd-couplet.is-right{right:5%;}
.igs-dfx-cd-couplet span{display:block;writing-mode:vertical-rl;margin:0 auto;padding-top:.8em;color:#f2dca0;font-size:clamp(16px,3.8vmin,28px);font-weight:400;letter-spacing:.4em;}
@keyframes igs-fest-unroll{from{opacity:0;transform:scaleY(.5)}}
.igs-dfx-cd-crackers{position:absolute;top:0;left:50%;width:1px;height:30%;}
.igs-dfx-cd-crackers i{position:absolute;left:50%;bottom:-40px;width:80px;height:80px;margin-left:-40px;border-radius:50%;background:radial-gradient(circle,rgba(var(--fx-gold),.4) 0,rgba(var(--fx-gold),0) 68%);opacity:0;animation:igs-fest-flash 1800ms ease-out both;}
@keyframes igs-fest-flash{0%{opacity:0;transform:scale(.3)}8%{opacity:.9}100%{opacity:0;transform:scale(2.4)}}
.igs-dfx-xmas-snow{position:absolute;inset:0;overflow:hidden;}
.igs-dfx-xmas-snow i{position:absolute;top:-4%;width:var(--s);height:var(--s);border-radius:50%;background:#ffffffcc;animation:igs-fest-snow var(--d) linear infinite;animation-delay:calc(var(--d) * -.6);}
@keyframes igs-fest-snow{to{transform:translate(18px,105vh)}}
.igs-dfx-xmas-garland{--bw:clamp(5px,1vmin,8px);position:absolute;left:0;right:0;top:0;height:clamp(50px,11vmin,100px);}
.igs-dfx-xmas-garland svg{position:absolute;inset:0;width:100%;height:100%;}
.igs-dfx-xmas-garland path{stroke:rgba(var(--fx-gold),.4);stroke-width:1;}
.igs-dfx-xmas-garland i{position:absolute;width:var(--bw);height:var(--bw);margin-left:calc(var(--bw) / -2);border-radius:50%;background:#fff1c8;box-shadow:0 0 10px 3px rgba(var(--fx-gold),.45);animation:igs-fest-bulb 320ms ease-out both,igs-fest-twinkle 1.8s ease-in-out infinite;}
@keyframes igs-fest-bulb{from{opacity:.12}}
@keyframes igs-fest-twinkle{0%,100%{opacity:1}50%{opacity:.6}}
.igs-dfx-xmas-text{position:absolute;left:calc(var(--fx-l) - 20%);width:40%;top:calc(var(--igs-fx-vis) * .4);text-align:center;font-size:clamp(22px,4.8vmin,40px);font-style:italic;font-weight:400;letter-spacing:.14em;color:#f8eed8;text-shadow:0 0 20px rgba(var(--fx-gold),.4),0 1px 6px #0007;animation:igs-fest-fadeup 900ms ease-out 1700ms both;}
@keyframes igs-fest-fadeup{from{opacity:0;transform:translateY(10px)}}
LOW .igs-dfx-xmas-snow{display:none;}
LOW .igs-dfx-xmas-garland i{animation:igs-fest-bulb 320ms ease-out both;}
LOW .igs-dfx-bday-flame,.igs-dfx-wd-ring-glint{animation-iteration-count:1;}
.igs-dfx.is-reduced .igs-dfx-xmas-snow{display:none;}
.igs-dfx-rp-env{position:absolute;left:var(--fx-r);top:calc(var(--igs-fx-vis) * .42);width:min(30vmin,240px);height:min(19vmin,150px);transform:translate(-50%,-50%);animation:igs-fest-fadeup 900ms ease-out both;}
.igs-dfx-rp-back{position:absolute;inset:0;border:1px solid rgba(var(--fx-gold),.6);border-radius:3px;background:linear-gradient(160deg,#7d1a1a55,#3a0c0c44);z-index:0;}
.igs-dfx-rp-back::before{content:"";position:absolute;left:0;right:0;top:0;height:46%;background:linear-gradient(to bottom right,transparent calc(50% - .5px),rgba(var(--fx-gold),.45) 50%,transparent calc(50% + .5px)) 0 0/50% 100% no-repeat,linear-gradient(to bottom left,transparent calc(50% - .5px),rgba(var(--fx-gold),.45) 50%,transparent calc(50% + .5px)) 100% 0/50% 100% no-repeat;}
.igs-dfx-rp-card{position:absolute;left:8%;right:8%;bottom:8%;top:30%;padding-top:2%;text-align:center;z-index:1;font-size:clamp(18px,4.4vmin,34px);animation:igs-fest-fadeup 800ms ease-out 900ms both;}
.igs-dfx-rp-front,.igs-dfx-rp-flap{display:none;}
.igs-dfx-rp-seal{position:absolute;left:50%;top:0;width:2.2em;height:2.2em;margin:-1.1em 0 0 -1.1em;border-radius:50%;border:1px solid rgba(var(--fx-gold),.7);background:#2a0c0ecc;color:#f2dca0;display:grid;place-items:center;font-size:clamp(12px,2.8vmin,20px);z-index:4;}
.igs-dfx-rp-amt{display:flex;justify-content:center;align-items:baseline;gap:.12em;color:#f8eed8;font-weight:400;font-size:1.4em;text-shadow:0 0 18px rgba(var(--fx-gold),.4);}
.igs-dfx-rp-cur{font-size:.6em;}
.igs-dfx-rp-wish{margin-top:.3em;font-size:.5em;letter-spacing:.2em;color:#e8d4a4;}
.igs-dfx-rp.is-ancient .igs-dfx-rp-back{background:linear-gradient(160deg,#6a140f66,#2a0d0d44);}
.igs-dfx-rp.is-ancient .igs-dfx-rp-card{font-family:"STKaiti","KaiTi","LXGW WenKai",serif;}
.igs-dfx-gift-stage{position:absolute;left:var(--fx-r);top:calc(var(--igs-fx-vis) * .42);width:min(26vmin,200px);height:min(26vmin,200px);transform:translate(-50%,-50%);animation:igs-fest-fadeup 700ms ease-out both;}
.igs-dfx-gift-box{position:absolute;left:12%;right:12%;top:0;height:56%;}
.igs-dfx-gift-body{position:absolute;left:0;right:0;bottom:0;height:72%;border:1px solid rgba(var(--fx-gold),.65);border-radius:2px;background:rgba(var(--fx-gold),.05);}
.igs-dfx-gift-ribbon{position:absolute;left:50%;bottom:0;width:0;height:72%;border-left:1px solid rgba(var(--fx-gold),.65);}
.igs-dfx-gift-lid{position:absolute;left:-4%;right:-4%;top:0;height:22%;border:1px solid rgba(var(--fx-gold),.75);border-radius:2px;background:rgba(var(--fx-gold),.08);z-index:2;transform:translate(0,-26%);animation:igs-fest-lid 700ms cubic-bezier(.3,1,.4,1) 800ms both;}
@keyframes igs-fest-lid{from{transform:translate(0,0)}}
.igs-dfx-gift-tag{position:absolute;left:50%;bottom:0;transform:translateX(-50%);max-width:150%;padding:.35em 1em;border-top:1px solid rgba(var(--fx-gold),.5);border-bottom:1px solid rgba(var(--fx-gold),.5);color:#f8eed8;text-align:center;white-space:nowrap;letter-spacing:.14em;font-size:clamp(14px,3.2vmin,22px);animation:igs-fest-fadeup 700ms ease-out 1500ms both;}
.igs-dfx-gift-tag em{display:block;font-size:.72em;font-style:normal;color:#e8d4a4;}
.igs-dfx-ring .igs-dfx-fest-veil{background:linear-gradient(to right,#1a0d22 0,#1a0d22 8%,#1a0d2222 30%,#1a0d2222 70%,#1a0d22 92%,#1a0d22 100%);opacity:.55;}
.igs-dfx-ring-spot{position:absolute;left:var(--fx-r);top:0;width:min(60vmin,420px);height:72%;transform:translateX(-50%);background:linear-gradient(180deg,#ffe8a0cc,#ffcf6033,#fff3c400);clip-path:polygon(38% 0,62% 0,100% 100%,0 100%);opacity:.22;animation:igs-fest-spot 900ms ease-out 200ms both;}
@keyframes igs-fest-spot{from{opacity:0}}
.igs-dfx-ring-stage{position:absolute;left:var(--fx-r);top:calc(var(--igs-fx-vis) * .44);width:min(26vmin,200px);height:min(20vmin,150px);transform:translate(-50%,-50%);}
.igs-dfx-ring-box{position:absolute;inset:0;animation:igs-fest-fadeup 700ms ease-out both;}
.igs-dfx-ring-base,.igs-dfx-ring-front,.igs-dfx-ring-lid{display:none;}
.igs-dfx-ring-jewel{position:absolute;left:50%;bottom:6%;width:50%;aspect-ratio:1;margin-left:-25%;z-index:2;animation:igs-fest-ringup 800ms cubic-bezier(.2,.9,.3,1) 600ms both;}
@keyframes igs-fest-ringup{from{opacity:0;transform:translateY(16px)}}
.igs-dfx-ring-band{position:absolute;left:8%;right:8%;top:20%;bottom:0;border:3px solid rgba(var(--fx-gold),.95);border-radius:50%;background:radial-gradient(ellipse at 40% 38%,rgba(var(--fx-gold),.22),rgba(var(--fx-gold),.04));box-shadow:0 0 18px rgba(var(--fx-gold),.35),inset 0 0 8px rgba(var(--fx-gold),.15);}
.igs-dfx-ring-gem{position:absolute;left:50%;top:-2%;width:26%;aspect-ratio:1;margin-left:-13%;transform:rotate(45deg);background:linear-gradient(135deg,#cdeeff 0%,#78c8f8 35%,#3a8ee8 65%,#1a5ec8 100%);border:1px solid #a0d8ff;box-shadow:0 0 18px 4px #5ab4f888,0 0 8px 1px #ffffffaa;}
.igs-dfx-ring-star{position:absolute;left:50%;top:-2%;width:110%;aspect-ratio:1;margin:-39% 0 0 -55%;background:linear-gradient(90deg,#fff0 49.5%,#ffffffcc 50%,#fff0 50.5%),linear-gradient(0deg,#fff0 49.5%,#ffffffcc 50%,#fff0 50.5%);animation:igs-fest-star 1300ms ease-out 1800ms both;}
@keyframes igs-fest-star{from{opacity:0;transform:scale(0) rotate(-45deg)}40%{opacity:1;transform:scale(1.15) rotate(0)}}
.igs-dfx-ring-rays{position:absolute;left:50%;top:10%;width:0;height:0;animation:igs-fest-rays 1300ms ease-out 1800ms both;}
.igs-dfx-ring-rays i{position:absolute;left:-.5px;bottom:0;width:1px;height:clamp(12px,2.8vmin,22px);background:#fff3c4cc;transform-origin:50% 100%;transform:rotate(var(--r)) translateY(-70%);}
@keyframes igs-fest-rays{from{opacity:0;transform:scale(.3)}40%{opacity:1}}
.igs-dfx-ring-text{position:absolute;left:50%;top:112%;transform:translateX(-50%);white-space:nowrap;color:#f8eed8;font-size:clamp(16px,3.4vmin,26px);letter-spacing:.3em;text-shadow:0 0 16px rgba(var(--fx-gold),.4),0 1px 6px #0007;animation:igs-fest-fadeup 800ms ease-out 2300ms both;}
.igs-dfx-wd-text{position:absolute;left:calc(var(--fx-l) - 20%);width:40%;top:calc(var(--igs-fx-vis) * .62);text-align:center;font-size:clamp(20px,4.6vmin,36px);font-weight:400;letter-spacing:.24em;color:#f8eed8;text-shadow:0 0 18px rgba(var(--fx-gold),.4),0 1px 6px #0007;}
.igs-dfx-wd-text span{display:inline-block;animation:igs-fest-pop 560ms cubic-bezier(.2,1,.3,1) both;}
.igs-dfx-wedding.is-west .igs-dfx-wd-text{color:#fff4e4;text-shadow:0 0 18px rgba(var(--fx-gold),.5),0 1px 8px #0009;}
.igs-dfx-wd-rings{position:absolute;left:var(--fx-l);top:calc(var(--igs-fx-vis) * .4);width:min(26vmin,200px);height:min(13vmin,100px);transform:translate(-50%,-50%);}
.igs-dfx-wd-rings i{position:absolute;top:0;width:min(13vmin,100px);height:min(13vmin,100px);border:1px solid rgba(var(--fx-gold),.9);border-radius:50%;box-shadow:0 0 14px rgba(var(--fx-gold),.2);}
.igs-dfx-wd-rings i:first-child{left:0;animation:igs-fest-ringl 1100ms cubic-bezier(.3,1,.4,1) 300ms both;}
.igs-dfx-wd-rings i:last-child{right:0;animation:igs-fest-ringr 1100ms cubic-bezier(.3,1,.4,1) 300ms both;}
@keyframes igs-fest-ringl{from{opacity:0;transform:translateX(-120%)}}
@keyframes igs-fest-ringr{from{opacity:0;transform:translateX(120%)}}
.igs-dfx-wd-bell{display:none;}
.igs-dfx-wd-band{position:absolute;left:0;right:0;height:8%;}
.igs-dfx-wd-band.is-top{top:0;background:linear-gradient(180deg,#7f141466,#7f141400);border-bottom:1px solid rgba(var(--fx-gold),.45);animation:igs-fest-bandt 700ms ease-out both;}
.igs-dfx-wd-band.is-bottom{bottom:0;background:linear-gradient(0deg,#7f141466,#7f141400);border-top:1px solid rgba(var(--fx-gold),.45);animation:igs-fest-bandb 700ms ease-out both;}
@keyframes igs-fest-bandt{from{transform:translateY(-100%)}}
@keyframes igs-fest-bandb{from{transform:translateY(100%)}}
.igs-dfx-wd-xi{position:absolute;left:var(--fx-l);top:calc(var(--igs-fx-vis) * .3);width:min(16vmin,120px);height:min(16vmin,120px);transform:translate(-50%,-50%) rotate(45deg);display:grid;place-items:center;border:1px solid rgba(var(--fx-gold),.7);background:rgba(138,22,22,.25);animation:igs-fest-xi 900ms ease-out 300ms both;}
.igs-dfx-wd-xi b{display:block;transform:rotate(-45deg);color:#f2dca0;font-weight:400;font-size:min(10vmin,76px);line-height:1;}
@keyframes igs-fest-xi{from{opacity:0;transform:translate(-50%,-50%) rotate(45deg) scale(.8)}}
.igs-dfx-wd-cups,.igs-dfx-wd-cup,.igs-dfx-wd-cord{display:none;}
.igs-dfx-wd-cloth{position:absolute;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,#a1201888 0,#a1201855 55%,#a1201800 72%);opacity:0;animation:igs-fest-cloth 3200ms ease both;}
.igs-dfx-wd-veil{position:absolute;aspect-ratio:1/1.3;transform:translate(-50%,-12%);transform-origin:50% 0;animation:igs-fest-veil 1400ms cubic-bezier(.3,.8,.3,1) 900ms both;}
.igs-dfx-wd-veil i{position:absolute;inset:0;background:linear-gradient(180deg,#fff6e61f,#fff6e600);clip-path:polygon(34% 0,66% 0,100% 100%,0 100%);}
LOW .igs-dfx-wd-veil{animation:none;}
.igs-dfx.is-reduced .igs-dfx-wd-veil{animation:none;}
@keyframes igs-fest-veil{from{opacity:0;transform:translate(-50%,-30%) scaleY(.4)}}
.igs-dfx-wd-cloth i{display:none;}
@keyframes igs-fest-cloth{0%{opacity:0;transform:translate(-50%,-50%) scale(.8)}12%{opacity:1;transform:translate(-50%,-50%) scale(1)}72%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-70%)}}
.igs-dfx-pt-stage{position:absolute;left:var(--fx-r);top:calc(var(--igs-fx-vis) * .42);transform:translate(-50%,-50%);width:min(34vmin,280px);}
.igs-dfx-pt-stick{display:flex;align-items:stretch;height:min(7vmin,52px);animation:igs-fest-stick 800ms ease-out both;}
@keyframes igs-fest-stick{from{opacity:0;transform:translateY(8px)}}
.igs-dfx-pt-cap{display:block;flex:0 0 22%;border:1px solid rgba(220,232,244,.4);border-right:0;border-radius:3px 0 0 3px;background:rgba(140,190,230,.12);}
.igs-dfx-pt-body{position:relative;flex:1;border:1px solid rgba(220,232,244,.55);border-radius:0 3px 3px 0;background:rgba(240,244,248,.08);}
.igs-dfx-pt-window{position:absolute;left:28%;right:8%;top:22%;bottom:22%;border:1px solid rgba(220,232,244,.4);border-radius:2px;}
.igs-dfx-pt-line{position:absolute;top:0;bottom:0;width:2px;background:#f0a4b8;}
.igs-dfx-pt-line.is-c{left:24%;}
.igs-dfx-pt-line.is-t{left:64%;animation:igs-fest-line 900ms ease-out 1600ms both;}
@keyframes igs-fest-line{from{opacity:0}}
.igs-dfx-pt.is-neg .igs-dfx-pt-line.is-t{opacity:0;animation:none;}
.igs-dfx-pt.is-pos .igs-dfx-pt-window{animation:igs-fest-glow 1600ms ease-in-out 2400ms 2 alternate both;}
@keyframes igs-fest-glow{to{box-shadow:0 0 14px 2px #f0a4b888}}
.igs-dfx-pt-result{margin-top:clamp(14px,3vmin,26px);text-align:center;animation:igs-fest-fadeup 800ms ease-out 2300ms both;}
.igs-dfx-pt-result b{display:block;font-size:clamp(24px,5.4vmin,42px);font-weight:400;color:#dbe6f0;letter-spacing:.3em;}
.igs-dfx-pt-result span{display:block;margin-top:.3em;font-size:clamp(12px,2.6vmin,18px);color:#a8bacb;letter-spacing:.34em;}
.igs-dfx-pt.is-pos .igs-dfx-pt-result b{color:#f8d8e2;}
.igs-dfx-pt.is-pos .igs-dfx-pt-result span{color:#dcaab9;}
.igs-dfx-riverlamp .igs-dfx-fest-host{overflow:hidden;}
.igs-dfx-rl-water{position:absolute;left:0;right:0;top:46%;height:34%;overflow:hidden;background:linear-gradient(180deg,#0f2a4400,#0f2a4488 35%,#0a1a2c88 70%,#0a1a2c00);}
.igs-dfx-rl-water i{position:absolute;left:-30%;width:40%;height:1px;background:#8fb0d0;opacity:.35;animation:igs-fest-ripple 7s linear infinite;}
.igs-dfx-rl-water i:nth-child(1){top:30%;}
.igs-dfx-rl-water i:nth-child(2){top:55%;animation-delay:-3s;width:30%;}
.igs-dfx-rl-water i:nth-child(3){top:76%;animation-delay:-5s;}
@keyframes igs-fest-ripple{to{transform:translateX(380%)}}
LOW .igs-dfx-rl-water i{animation:none;left:20%;}
.igs-dfx-rl-still{display:none;}
.igs-dfx.is-reduced .igs-dfx-rl-still{display:block;}
.igs-dfx-rl-still i{position:absolute;width:2.4em;height:2.4em;border-radius:50%;background:radial-gradient(circle,#ffe2a8cc 0,#ffb86a55 35%,#ffb86a00 70%);font-size:clamp(10px,2.4vmin,18px);}
.igs-dfx-rl-wish{position:absolute;top:12%;right:10%;padding:.6em .2em .6em .9em;border-left:1px solid rgba(var(--fx-gold),.5);color:#f2dca0;font-size:clamp(15px,3vmin,24px);text-shadow:0 0 16px rgba(var(--fx-gold),.4),0 1px 6px #0007;animation:igs-fest-fadeup 900ms ease-out 700ms both;}
.igs-dfx-rl-wish span{display:block;writing-mode:vertical-rl;letter-spacing:.4em;}
`;

const PREFIX = '#igs-overlay ';
const LOW_PREFIX = '#igs-overlay[data-igs-quality="low"] ';

export const FESTIVAL_STYLE_TEXT = RULES.split('\n').map((line) => {
    if (!line || line.startsWith('@')) return line;
    const open = line.indexOf('{');
    const head = line.slice(0, open);
    const low = head.startsWith('LOW ');
    const selectors = (low ? head.slice(4) : head).split(',').map((s) => `${low ? LOW_PREFIX : PREFIX}${s.trim()}`);
    return `${selectors.join(',')}${line.slice(open)}`;
}).join('\n');
