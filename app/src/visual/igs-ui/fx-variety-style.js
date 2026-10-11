// 恋综包样式：综艺粉（#ff5c9a）配奶黄与深紫，装饰一律实色；动画终态即基础样式，所以 .is-reduced 关掉动画后仍是完整静态画面。
// 常驻层只有静态与极慢的呼吸 / 漂移，低画质与减少动态效果下全部静止。
const RAW = `
@@.igs-vy{overflow:hidden;font-weight:700;animation:igs-vy-fade var(--igs-dfx-life) ease both;}
@@.igs-vy i{display:block;}
@@.igs-vy svg{display:block;}
@@.igs-vy-rec-dot{position:relative;flex:none;width:11px;height:11px;border-radius:50%;background:#ff2f3d;animation:igs-vy-blink 1.1s steps(1) infinite;}

/* 嘉宾入场卡 */
@@.igs-vy-guest-card{position:absolute;left:max(24px,4%);top:max(16px,6%);min-width:220px;max-width:64%;box-sizing:border-box;padding:12px 22px;border:1px solid rgba(255,160,196,.36);border-radius:2px;background:rgba(18,14,26,.62);color:#ffffff;transform-origin:0 50%;animation:igs-vy-guest-in .55s ease-out both;}
@@.igs-vy-guest-slash{display:none;}
@@.igs-vy-guest-new{display:block;margin-bottom:3px;color:#ffc2d9;font-size:.72em;font-weight:500;letter-spacing:.42em;}
@@.igs-vy-guest-heart{display:none;}
@@.igs-vy-guest-heart svg,@@.igs-vy-vt-hearts svg,@@.igs-vy-card-face i svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linejoin:round;}
@@.igs-vy-guest-name{font-size:1.75em;font-weight:600;letter-spacing:.14em;line-height:1.25;text-shadow:0 1px 8px rgba(0,0,0,.45);}
@@.igs-vy-guest-name span,@@.igs-vy-cap.is-pink p span{display:inline-block;animation:igs-vy-drop .5s ease-out both;}
@@.igs-vy-guest-sub{margin-top:2px;font-size:.92em;font-weight:400;letter-spacing:.08em;color:rgba(255,255,255,.88);}
@@.igs-vy-guest-sub i{display:inline-block;width:3px;height:3px;margin:0 10px;border-radius:50%;background:#ffc2d9;vertical-align:middle;}
@@.igs-vy-guest-tags{margin-top:8px;}
@@.igs-vy-tag{display:inline-block;margin:0 6px 4px 0;padding:0 11px;border:1px solid rgba(255,194,217,.6);border-radius:10px;color:#ffe0ec;font-size:.8em;font-weight:400;letter-spacing:.1em;animation:igs-vy-sticker .4s ease-out both;}

/* 综艺花字：细描加柔光，不用粗描边与硬投影 */
@@.igs-vy-cap{position:absolute;}
@@.igs-vy-cap.is-pink{left:0;right:0;top:max(12px,5%);text-align:center;}
@@.igs-vy-cap.is-pink p{margin:0;padding:0 6%;font-size:clamp(1.9em,6vw,3.1em);font-weight:600;letter-spacing:.14em;line-height:1.3;color:#ffffff;text-shadow:0 0 18px rgba(255,120,170,.75),0 1px 6px rgba(0,0,0,.55);}
@@.igs-vy-spark{position:absolute;color:#ffe2a8;font-size:1.3em;font-style:normal;animation:igs-vy-twinkle 2.4s ease-in-out infinite;}
@@.igs-vy-spark.s1{left:16%;top:-6px;}
@@.igs-vy-spark.s2{right:17%;bottom:-6px;animation-delay:-.9s;}
@@.igs-vy-spark.s3{display:none;}
@@.igs-vy-cap.is-sticker{left:50%;top:max(14px,6%);max-width:80%;box-sizing:border-box;padding:8px 30px;border:1px solid rgba(255,255,255,.4);border-radius:2px;background:rgba(18,14,26,.5);color:#ffffff;font-size:1.55em;font-weight:500;letter-spacing:.16em;text-align:center;transform:translateX(-50%);animation:igs-vy-slap .5s ease-out both;}
@@.igs-vy-tape,@@.igs-vy-cap-heart{display:none;}
@@.igs-vy-cap.is-stamp{left:50%;top:max(14px,6%);transform:translateX(-50%);}
@@.igs-vy-stamp{padding:8px 30px 10px;border:1px solid rgba(255,194,217,.7);border-radius:2px;color:#ffe0ec;text-align:center;background:rgba(18,14,26,.5);animation:igs-vy-stamp .5s ease-out .1s both;}
@@.igs-vy-stamp small{display:block;font-size:.72em;font-weight:400;letter-spacing:.5em;margin-right:-.5em;color:#ffb5d0;}
@@.igs-vy-stamp b{display:block;font-size:2.1em;font-weight:600;letter-spacing:.12em;line-height:1.2;}
@@.igs-vy-stamp.is-long b{font-size:1.6em;}
@@.igs-vy-dark-scrim{position:absolute;inset:0;background:#000000;opacity:.7;animation:igs-vy-scrim-in .6s ease both;}
@@.igs-vy-cap.is-dark{left:0;right:0;top:42%;text-align:center;color:#ffffff;font-size:1.7em;font-weight:700;letter-spacing:.18em;}
@@.igs-vy-cap.is-dark p{margin:0;padding:0 8%;}
@@.igs-vy-cap.is-dark p span,@@.igs-vy-iv-os p span{animation:igs-vy-type .3s ease-out both;}

/* 采访间 */
@@.igs-vy-iv-wall{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 22%,#8d86a2,#4e4862 55%,#262230);animation:igs-vy-scrim-in .5s ease both;}
@@.igs-vy-iv-bar{position:absolute;left:0;right:0;height:5%;background:#0f0f13;}
@@.igs-vy-iv-bar.is-top{top:0;animation:igs-vy-bar-top .5s ease-out both;}
@@.igs-vy-iv-bar.is-bottom{bottom:0;animation:igs-vy-bar-bottom .5s ease-out both;}
@@.igs-vy-iv-tag{position:absolute;left:5%;top:8%;display:flex;align-items:center;gap:8px;padding:2px 0;color:#ffffff;font-size:.78em;font-weight:500;letter-spacing:.26em;}
@@.igs-vy-iv-tag span{margin-left:6px;padding-left:10px;border-left:1px solid rgba(255,255,255,.5);letter-spacing:.12em;}
@@.igs-vy-iv-person{position:absolute;left:15%;right:15%;top:6%;bottom:calc(var(--igs-fx-safe) + var(--igs-fx-vis) * .2);animation:igs-vy-person-in .7s ease-out .15s both;}
@@.igs-vy-iv-os{position:absolute;left:8%;right:8%;bottom:calc(var(--igs-fx-safe) + 14px);box-sizing:border-box;padding:7px 18px 9px;border-left:2px solid #ff9cc0;border-radius:2px;background:rgba(16,14,22,.82);color:#ffffff;font-size:1.05em;animation:igs-vy-line-in .45s ease-out .35s both;}
@@.igs-vy-iv-os small{display:inline-block;margin-bottom:4px;color:#ffb5d0;font-size:.7em;font-weight:400;letter-spacing:.3em;}
@@.igs-vy-iv-os p{margin:0;line-height:1.5;}

/* 观察室 */
@@.igs-vy-ob-col{position:absolute;right:max(16px,4%);top:max(16px,5%);width:36%;max-width:340px;display:flex;flex-direction:column;align-items:flex-end;gap:9px;}
@@.igs-vy-ob-pip{width:100%;border:1px solid rgba(255,255,255,.34);border-radius:4px;background:#16141d;overflow:hidden;transform-origin:100% 0;animation:igs-vy-pip-in .5s ease-out both;}
@@.igs-vy-ob-head{display:flex;align-items:center;gap:7px;padding:3px 10px;background:rgba(255,255,255,.08);color:#ffffff;font-size:.76em;font-weight:400;letter-spacing:.24em;}
@@.igs-vy-ob-head span{margin-left:auto;color:#ff9cc0;letter-spacing:.16em;}
@@.igs-vy-ob-screen{position:relative;aspect-ratio:16/9;overflow:hidden;background:#2a2733;}
@@.igs-vy-ob-zoom,@@.igs-vy-rp-zoom{position:absolute;inset:0;}
@@.igs-vy-ob-zoom{transform:scale(2.1);}
@@.igs-vy-ob-grid,@@.igs-vy-rp-scan{position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.14) 0 1px,transparent 1px 3px);}
@@.igs-vy-ob-feed{display:flex;flex-direction:column;align-items:flex-end;gap:6px;width:100%;}
@@.igs-vy-ob-line{display:flex;align-items:baseline;gap:7px;max-width:100%;box-sizing:border-box;padding:3px 12px 4px;border-radius:2px;border-left:2px solid rgba(255,156,192,.7);background:rgba(16,14,22,.72);color:#f0e8ee;font-size:.84em;font-weight:400;animation:igs-vy-line-in .4s ease-out both;}
@@.igs-vy-ob-line b{flex:none;color:#ffb5d0;font-weight:500;font-size:.92em;}

/* 机位角标与切镜 */
@@.igs-vy-vf{position:absolute;width:26px;height:26px;border:0 solid rgba(255,255,255,.72);}
@@.igs-vy-vf.is-tl{left:4%;top:5%;border-left-width:1px;border-top-width:1px;}
@@.igs-vy-vf.is-tr{right:4%;top:5%;border-right-width:1px;border-top-width:1px;}
@@.igs-vy-vf.is-bl{left:4%;bottom:5%;border-left-width:1px;border-bottom-width:1px;}
@@.igs-vy-vf.is-br{right:4%;bottom:5%;border-right-width:1px;border-bottom-width:1px;}
@@.igs-vy-rec-badge{position:absolute;left:7%;top:8%;display:flex;align-items:center;gap:8px;color:#ffffff;font-size:.95em;font-weight:500;letter-spacing:.22em;text-shadow:0 1px 6px rgba(0,0,0,.6);animation:igs-vy-line-in .4s ease-out .45s both;}
@@.igs-vy-rec-badge span{padding:0 8px;border:1px solid rgba(255,255,255,.6);border-radius:2px;font-size:.8em;letter-spacing:.1em;}
@@.igs-vy-rec-time{position:absolute;left:7%;top:calc(8% + 32px);color:rgba(255,255,255,.88);font-family:Consolas,monospace;font-size:.86em;text-shadow:0 1px 6px rgba(0,0,0,.6);}
@@.igs-vy-rec-batt{position:absolute;right:7%;top:8%;display:flex;gap:3px;padding:3px;border:1px solid rgba(255,255,255,.6);border-radius:2px;}
@@.igs-vy-rec-batt i{width:6px;height:11px;background:#ffffff;}
@@.igs-vy-rec-cut{position:absolute;left:0;right:0;height:50%;background:#000000;}
@@.igs-vy-rec-cut.is-top{top:0;animation:igs-vy-cut-top .55s ease-in-out both;}
@@.igs-vy-rec-cut.is-bottom{bottom:0;animation:igs-vy-cut-bottom .55s ease-in-out both;}
@@.igs-vy-rec-flash{position:absolute;inset:0;background:#ffffff;opacity:0;animation:igs-vy-flash .3s ease-out .4s forwards;}
@@.igs-vy.is-reduced .igs-vy-rec-cut,@@.igs-vy.is-reduced .igs-vy-env{display:none;}

/* 心动短信与匿名投票 */
@@.igs-vy-vote,@@.igs-vy-rank,@@.igs-vy-pair,@@.igs-vy-relmap{display:flex;align-items:flex-start;justify-content:flex-start;box-sizing:border-box;padding:max(16px,5%) 0 var(--igs-fx-safe) max(24px,4%);}
@@.igs-vy-env{display:none;}
@@.igs-vy-sms{position:absolute;left:max(24px,4%);top:max(16px,6%);width:min(34%,340px);box-sizing:border-box;padding:12px 18px 14px;border:1px solid rgba(255,160,196,.4);border-radius:2px;background:rgba(26,14,32,.68);color:#ffffff;animation:igs-vy-sms-in .55s ease-out .3s both;}
@@.igs-vy-sms small{display:block;margin-bottom:4px;color:#ffb5d0;font-size:.74em;font-weight:400;letter-spacing:.36em;}
@@.igs-vy-sms p{margin:0;font-size:1.05em;font-weight:400;letter-spacing:.04em;line-height:1.6;}
@@.igs-vy-board.igs-panel{min-width:min(280px,34%);max-width:36%;box-sizing:border-box;padding:12px 18px 12px;border:1px solid rgba(255,160,196,.4);border-radius:2px;background:rgba(26,14,32,.68);color:#ffffff;box-shadow:none;animation:igs-vy-board-in .5s ease-out .3s both;}
@@.igs-vy-board .igs-panel-title{border-bottom:1px solid rgba(255,255,255,.22);color:#ffd2e3;font-size:.86em;font-weight:500;letter-spacing:.3em;}
@@.igs-vy-vt-row{display:flex;align-items:center;gap:10px;margin:2px 0;padding:3px 8px;border-radius:2px;animation:igs-vy-row-in .35s ease-out var(--igs-vy-d,.6s) both;}
@@.igs-vy-vt-name{flex:none;min-width:3.2em;font-weight:500;letter-spacing:.06em;}
@@.igs-vy-vt-hearts{flex:1;display:flex;flex-wrap:wrap;gap:2px;color:#ff9cc0;}
@@.igs-vy-vt-hearts i{width:12px;height:12px;}
@@.igs-vy-vt-count{flex:none;min-width:1.6em;text-align:right;font-variant-numeric:tabular-nums;}
@@.igs-vy-vt-row.is-win{background:rgba(255,214,150,.16);box-shadow:inset 0 0 0 1px rgba(255,214,150,.5);color:#ffe9c4;}
@@.igs-vy-vt-row.is-win .igs-vy-vt-name::after{content:'最高票';margin-left:6px;color:#ffd596;font-size:.68em;font-weight:400;letter-spacing:.12em;vertical-align:middle;}

/* 心动值排行榜 */
@@.igs-vy-rk-list{position:relative;width:min(300px,28vw);min-width:200px;}
@@.igs-vy-rk-row{position:absolute;left:0;right:0;top:0;height:30px;display:flex;align-items:center;gap:9px;transform:translateY(var(--igs-vy-to,0px));animation:igs-vy-rk-move 1s cubic-bezier(.3,.8,.3,1) .6s both;}
@@.igs-vy-rk-no{flex:none;width:22px;height:22px;box-sizing:border-box;border:1px solid rgba(255,255,255,.4);border-radius:50%;color:#ffffff;font-size:.78em;font-weight:400;line-height:20px;text-align:center;}
@@.igs-vy-rk-row.is-r1 .igs-vy-rk-no{border-color:#ffd596;color:#ffd596;}
@@.igs-vy-rk-name{flex:none;min-width:3.4em;font-weight:500;}
@@.igs-vy-rk-track{flex:1;height:3px;border-radius:2px;background:rgba(255,255,255,.18);overflow:hidden;}
@@.igs-vy-rk-track i{width:var(--igs-vy-pct,100%);height:100%;border-radius:2px;background:#ff9cc0;transform-origin:0 50%;animation:igs-vy-rk-bar 1s cubic-bezier(.3,.8,.3,1) .6s both;}
@@.igs-vy-rk-row.is-r1 .igs-vy-rk-track i{background:#ffd596;}
@@.igs-vy-rk-val{flex:none;min-width:2.5em;text-align:right;font-variant-numeric:tabular-nums;}

/* 心率手环：细线深色小卡，贴在头侧 */
@@.igs-vy-pulse-band{position:absolute;min-width:140px;box-sizing:border-box;padding:7px 14px 5px;border:1px solid rgba(255,255,255,.28);border-radius:2px;background:rgba(14,12,20,.66);color:#ffffff;animation:igs-vy-pip-in .45s ease-out both;}
@@.igs-vy-pulse-head{display:flex;align-items:center;gap:6px;color:#ffc2d9;font-size:.74em;font-weight:400;letter-spacing:.3em;}
@@.igs-vy-pulse-heart{width:13px;height:13px;color:#ff9cc0;animation:igs-vy-beat var(--igs-vy-beat,.8s) ease-in-out infinite;}
@@.igs-vy-pulse-heart svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linejoin:round;}
@@.igs-vy-pulse-num{display:flex;align-items:baseline;gap:6px;}
@@.igs-vy-pulse-v{min-width:2.2em;font-size:2.1em;font-weight:300;line-height:1.15;color:#a8f0cb;font-variant-numeric:tabular-nums;}
@@.igs-vy-pulse.is-warm .igs-vy-pulse-v{color:#ffd596;}
@@.igs-vy-pulse.is-hot .igs-vy-pulse-v{color:#ff9cac;}
@@.igs-vy-pulse-num small{color:#b7b2c4;font-size:.7em;letter-spacing:.2em;}
@@.igs-vy-pulse-ecg{height:22px;margin-top:2px;color:#a8f0cb;}
@@.igs-vy-pulse.is-warm .igs-vy-pulse-ecg{color:#ffd596;}
@@.igs-vy-pulse.is-hot .igs-vy-pulse-ecg{color:#ff9cac;}
@@.igs-vy-pulse-ecg svg{width:100%;height:100%;}
@@.igs-vy-pulse-ecg path{fill:none;stroke:currentColor;stroke-width:1.2;stroke-linejoin:round;stroke-dasharray:1;animation:igs-vy-ecg calc(var(--igs-vy-beat,.8s) * 2) linear infinite;}

/* 关系图与约会抽卡 */
@@.igs-vy-board.igs-panel.is-map{width:min(40%,400px);max-width:none;}
@@.igs-vy-map svg{width:100%;height:auto;}
@@.igs-vy-edge{fill:none;stroke-linecap:round;stroke-dasharray:1;animation:igs-vy-draw .8s ease-out .6s both;}
@@.igs-vy-edge.is-one{stroke:#ff9cc0;stroke-width:.9;}
@@.igs-vy-edge.is-mutual{stroke:#ffd596;stroke-width:1.1;}
@@.igs-vy-face{animation:igs-vy-face-in .4s ease-out both;}
@@.igs-vy-face-name{fill:#f4e8ee;font-size:clamp(10px,2.8vmin,13px);font-weight:400;letter-spacing:.04em;}
@@.igs-vy-edge-tag{animation:igs-vy-face-in .4s ease-out both;}
@@.igs-vy-edge-tag rect{fill:rgba(18,14,26,.8);stroke:rgba(255,156,192,.7);stroke-width:.5;}
@@.igs-vy-edge-tag text{fill:#ffd2e3;font-size:5.4px;font-weight:400;}
@@.igs-vy-edge-heart{fill:none;stroke:#ffd596;stroke-width:1.6;font-size:9px;animation:igs-vy-face-in .4s ease-out both;}
@@.igs-vy-deck{display:flex;flex-wrap:wrap;justify-content:flex-start;gap:10px;perspective:700px;}
@@.igs-vy-card{position:relative;width:86px;height:116px;transform-style:preserve-3d;animation:igs-vy-flip .7s ease-out both;}
@@.igs-vy-card-face{position:absolute;inset:0;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;border-radius:2px;-webkit-backface-visibility:hidden;backface-visibility:hidden;}
@@.igs-vy-card-face.is-front{border:1px solid rgba(255,194,217,.6);background:rgba(18,14,26,.78);color:#ffffff;}
@@.igs-vy-card-face.is-front b{font-size:1em;font-weight:500;letter-spacing:.06em;}
@@.igs-vy-card-face.is-front i{width:18px;height:18px;color:#ff9cc0;}
@@.igs-vy-card-face.is-back{border:1px solid rgba(255,255,255,.34);background:rgba(18,14,26,.82);color:#ffc2d9;transform:rotateY(180deg);}
@@.igs-vy-card-face.is-back span{font-size:2.2em;font-weight:300;}

/* 离场：画面略暗，一道细光线从中央向外淡出，字幕写明谁离开 */
@@.igs-vy-ex-scrim{position:absolute;inset:0;background:#000000;opacity:.35;animation:igs-vy-scrim-in .5s ease both;}
@@.igs-vy-ex-case{position:absolute;left:50%;bottom:calc(var(--igs-fx-safe) + var(--igs-fx-vis) * .34);width:70px;height:96px;margin-left:-35px;display:none;}
@@.igs-vy-ex-card{position:absolute;left:50%;bottom:calc(var(--igs-fx-safe) + var(--igs-fx-vis) * .12);box-sizing:border-box;max-width:84%;padding:8px 34px 10px;border-top:1px solid rgba(255,255,255,.4);border-bottom:1px solid rgba(255,255,255,.4);background:linear-gradient(90deg,rgba(14,12,20,0),rgba(14,12,20,.68) 22%,rgba(14,12,20,.68) 78%,rgba(14,12,20,0));color:#ffffff;text-align:center;transform:translateX(-50%);animation:igs-vy-line-in .45s ease-out .3s both;}
@@.igs-vy-ex-card small{display:block;color:#ffb5d0;font-size:.72em;font-weight:400;letter-spacing:.5em;margin-right:-.5em;}
@@.igs-vy-ex-card b{display:block;font-size:1.2em;font-weight:500;letter-spacing:.1em;}
@@.igs-vy-ex-card span{display:block;margin-top:2px;font-size:.88em;font-weight:400;color:rgba(255,255,255,.85);}

/* 告白之夜：夜幕与两束柔和追光，中央一行细字缓缓亮起，金色光粒点缀 */
@@.igs-vy-fn-scrim{position:absolute;inset:0;background:#0a0720;opacity:.62;animation:igs-vy-scrim-in .7s ease both;}
@@.igs-vy-fn-beam{position:absolute;top:-8%;width:34%;height:118%;background:linear-gradient(180deg,rgba(255,236,190,.34),rgba(255,236,190,0));clip-path:polygon(40% 0,60% 0,100% 100%,0 100%);animation:igs-vy-scrim-in 1s ease .3s both;}
@@.igs-vy-fn-beam.is-l{left:-4%;}
@@.igs-vy-fn-beam.is-r{right:-4%;}
@@.igs-vy-fn-sign{position:absolute;left:50%;top:max(14px,6%);box-sizing:border-box;max-width:92%;padding:8px 30px;border-top:1px solid rgba(255,214,150,.55);border-bottom:1px solid rgba(255,214,150,.55);background:linear-gradient(90deg,rgba(10,7,32,0),rgba(10,7,32,.6) 20%,rgba(10,7,32,.6) 80%,rgba(10,7,32,0));transform:translateX(-50%);animation:igs-vy-pip-in .6s ease-out .2s both;}
@@.igs-vy-fn-text{display:flex;justify-content:center;gap:.18em;}
@@.igs-vy-fn-bulb{display:inline-block;font-size:2.3em;font-weight:500;line-height:1.3;color:#fff6e0;text-shadow:0 0 16px rgba(255,200,130,.7);animation:igs-vy-light .6s ease-out both;}
@@.igs-vy-fn-dots{display:flex;justify-content:space-between;gap:4px;margin:2px 0;}
@@.igs-vy-fn-dots i{width:2px;height:2px;border-radius:50%;background:#ffe2a8;}
@@.igs-vy-fn-dots i.is-a{animation:igs-vy-dot 2.4s ease-in-out infinite;}
@@.igs-vy-fn-dots i.is-b{animation:igs-vy-dot 2.4s ease-in-out -1.2s infinite;}
@@.igs-vy-fn-who{position:absolute;left:0;right:0;top:calc(max(14px,6%) + 112px);color:rgba(255,246,224,.9);font-size:.92em;font-weight:400;letter-spacing:.36em;text-align:center;animation:igs-vy-line-in .5s ease-out 2.2s both;}

/* 心动瞬间回放 */
@@.igs-vy-rp-dim{position:absolute;inset:0;background:#000000;opacity:.55;animation:igs-vy-scrim-in .4s ease both;}
@@.igs-vy-rp-frame{position:absolute;left:12%;right:12%;top:10%;bottom:calc(var(--igs-fx-safe) + var(--igs-fx-vis) * .26);border:1px solid rgba(255,255,255,.5);border-radius:2px;background:#222222;overflow:hidden;animation:igs-vy-frame-in .45s ease-out both;}
@@.igs-vy-rp-zoom{transform:scale(1.4);animation:igs-vy-push 1.05s ease-in 1s 3 both;}
@@.igs-vy-rp-flash{position:absolute;inset:0;background:#ffffff;opacity:0;animation:igs-vy-rp-flash 1.05s ease-out 1s 3 forwards;}
@@.igs-vy-rp-badge{position:absolute;left:12%;top:10%;margin:10px 0 0 10px;display:flex;align-items:center;gap:8px;}
@@.igs-vy-rp-badge b{padding:0;color:#ffffff;font-size:.82em;font-weight:500;letter-spacing:.3em;text-shadow:0 1px 6px rgba(0,0,0,.7);}
@@.igs-vy-rp-n{position:absolute;left:100%;margin-left:8px;opacity:0;color:#ffffff;font-size:.9em;font-weight:400;white-space:nowrap;text-shadow:0 1px 6px rgba(0,0,0,.7);animation:igs-vy-rp-n 1.05s steps(1,end) forwards;}
@@.igs-vy-rp-n.is-1{animation-delay:1s;}
@@.igs-vy-rp-n.is-2{animation-delay:2.05s;}
@@.igs-vy-rp-n.is-3{animation-name:igs-vy-rp-n3;animation-delay:3.1s;}
@@.igs-vy.is-reduced .igs-vy-rp-n.is-3{opacity:1;}
@@.igs-vy-rp-title{position:absolute;left:0;right:0;bottom:calc(var(--igs-fx-safe) + var(--igs-fx-vis) * .15);color:#ffffff;font-size:1.1em;font-weight:400;letter-spacing:.36em;text-align:center;text-shadow:0 1px 8px rgba(0,0,0,.7);animation:igs-vy-line-in .5s ease-out .6s both;}

/* 恋爱小屋常驻层 */
@@.igs-dfx-amb .igs-vy-amb-shade{inset:0;background:linear-gradient(180deg,rgba(60,28,20,.22),transparent 20%,transparent 78%,rgba(60,28,20,.3));}
@@.igs-dfx-amb .igs-vy-amb-shade.is-blue{background:linear-gradient(180deg,rgba(20,60,110,.18),transparent 30%,rgba(30,120,170,.3) 100%);}
@@.igs-dfx-amb .igs-vy-amb-shade.is-dusk{background:linear-gradient(180deg,rgba(40,20,70,.45),rgba(90,40,90,.12) 35%,transparent 60%,rgba(10,10,30,.35));}
@@.igs-dfx-amb .igs-vy-amb-lamp{top:-8%;width:34%;height:62%;background:radial-gradient(ellipse at 50% 0%,rgba(255,214,150,.4),rgba(255,214,150,0) 68%);animation:igs-vy-breathe 9s ease-in-out infinite;}
@@.igs-dfx-amb .igs-vy-amb-lamp.is-l{left:2%;}
@@.igs-dfx-amb .igs-vy-amb-lamp.is-r{right:2%;animation-delay:-4.5s;}
@@.igs-dfx-amb.is-night .igs-vy-amb-lamp{background:radial-gradient(ellipse at 50% 0%,rgba(255,190,120,.55),rgba(255,190,120,0) 68%);}
@@.igs-dfx-amb .igs-vy-amb-rug{left:0;right:0;bottom:0;height:16%;background:linear-gradient(0deg,rgba(255,170,120,.16),transparent);}
@@.igs-dfx-amb .igs-vy-amb-pendant{top:-6%;left:28%;width:44%;height:52%;background:radial-gradient(ellipse at 50% 0%,rgba(255,246,214,.4),rgba(255,246,214,0) 70%);animation:igs-vy-breathe 11s ease-in-out infinite;}
@@.igs-dfx-amb .igs-vy-amb-window{right:0;top:10%;width:18%;height:40%;background:linear-gradient(90deg,rgba(214,236,255,0),rgba(214,236,255,.2));}
@@.igs-dfx-amb.is-night .igs-vy-amb-window{background:linear-gradient(90deg,rgba(60,80,140,0),rgba(60,80,140,.24));}
@@.igs-dfx-amb .igs-vy-amb-water{left:-20%;bottom:0;width:140%;height:34%;background:repeating-radial-gradient(ellipse at 30% 120%,rgba(170,230,255,.18) 0 6px,transparent 6px 18px);animation:igs-vy-drift 16s ease-in-out infinite alternate;}
@@.igs-dfx-amb .igs-vy-amb-glint{left:0;right:0;bottom:6%;height:26%;background:radial-gradient(circle at 18% 40%,rgba(255,255,255,.4) 0 2px,transparent 3px),radial-gradient(circle at 46% 70%,rgba(255,255,255,.34) 0 2px,transparent 3px),radial-gradient(circle at 74% 30%,rgba(255,255,255,.4) 0 2px,transparent 3px),radial-gradient(circle at 90% 62%,rgba(255,255,255,.3) 0 2px,transparent 3px);}
@@.igs-dfx-amb .igs-vy-amb-bokeh{left:0;right:0;bottom:0;height:38%;background:radial-gradient(circle at 12% 70%,rgba(255,196,110,.34) 0 14px,transparent 16px),radial-gradient(circle at 30% 50%,rgba(255,120,150,.3) 0 10px,transparent 12px),radial-gradient(circle at 52% 76%,rgba(255,226,150,.32) 0 16px,transparent 18px),radial-gradient(circle at 70% 56%,rgba(150,200,255,.28) 0 12px,transparent 14px),radial-gradient(circle at 88% 72%,rgba(255,170,120,.32) 0 14px,transparent 16px);}
@@.igs-dfx-amb .igs-vy-amb-bulbs{top:5%;left:4%;right:4%;height:10px;background:radial-gradient(circle,#ffe7a8 0 3px,transparent 4px) 0 50%/36px 10px repeat-x;animation:igs-vy-twinkle 3.2s ease-in-out infinite;}
@@.igs-dfx-amb .igs-vy-amb-bulbs.is-b{top:calc(5% + 3px);background-position:18px 50%;animation-delay:-1.6s;}
#igs-overlay[data-igs-quality="low"] .igs-dfx-amb:is(.is-vlounge,.is-vkitchen,.is-vpool,.is-vterrace) *{animation:none!important;}
#igs-overlay .igs-dfx-amb:is(.is-vlounge,.is-vkitchen,.is-vpool,.is-vterrace).is-reduced *{animation:none!important;}

/* 低画质：循环动画停住，终态保留 */
#igs-overlay[data-igs-quality="low"] .igs-vy .igs-vy-rec-dot,#igs-overlay[data-igs-quality="low"] .igs-vy .igs-vy-spark,#igs-overlay[data-igs-quality="low"] .igs-vy .igs-vy-pulse-heart,#igs-overlay[data-igs-quality="low"] .igs-vy .igs-vy-pulse-ecg path,#igs-overlay[data-igs-quality="low"] .igs-vy .igs-vy-fn-dots i{animation:none;}

@keyframes igs-vy-fade{0%{opacity:0}7%{opacity:1}90%{opacity:1}100%{opacity:0}}
@keyframes igs-vy-blink{0%{opacity:1}50%{opacity:.15}100%{opacity:1}}
@keyframes igs-vy-guest-in{from{opacity:0;transform:translateX(-40px) skewX(-8deg)}}
@keyframes igs-vy-drop{from{opacity:0;transform:translateY(-22px) scale(1.5)}}
@keyframes igs-vy-sticker{from{opacity:0;transform:scale(1.8) rotate(-12deg)}}
@keyframes igs-vy-twinkle{0%{opacity:1}50%{opacity:.35}100%{opacity:1}}
@keyframes igs-vy-slap{from{opacity:0;transform:translateX(-50%) rotate(-5deg) scale(2.2)}}
@keyframes igs-vy-stamp{from{opacity:0;transform:scale(2.6)}60%{opacity:1;transform:scale(.94)}}
@keyframes igs-vy-scrim-in{from{opacity:0}}
@keyframes igs-vy-type{from{opacity:0;transform:translateY(4px)}}
@keyframes igs-vy-bar-top{from{transform:translateY(-100%)}}
@keyframes igs-vy-bar-bottom{from{transform:translateY(100%)}}
@keyframes igs-vy-person-in{from{opacity:0;transform:translateY(18px)}}
@keyframes igs-vy-line-in{from{opacity:0;transform:translateY(10px)}}
@keyframes igs-vy-pip-in{from{opacity:0;transform:scale(.7)}}
@keyframes igs-vy-frame-in{from{opacity:0;transform:scale(.88)}}
@keyframes igs-vy-cut-top{0%,25%{transform:translateY(0)}100%{transform:translateY(-100%)}}
@keyframes igs-vy-cut-bottom{0%,25%{transform:translateY(0)}100%{transform:translateY(100%)}}
@keyframes igs-vy-flash{from{opacity:.7}to{opacity:0}}
@keyframes igs-vy-flap{from{transform:rotateX(0deg)}}
@keyframes igs-vy-card-up{from{transform:translateY(0)}to{transform:translateY(-22px)}}
@keyframes igs-vy-env-out{to{opacity:0;transform:scale(.7) translateY(-30px)}}
@keyframes igs-vy-sms-in{from{opacity:0;transform:translateY(-8px) scale(.96)}}
@keyframes igs-vy-board-in{from{opacity:0;transform:translateY(22px)}}
@keyframes igs-vy-row-in{from{opacity:0;transform:translateX(-14px)}}
@keyframes igs-vy-rk-move{from{transform:translateY(var(--igs-vy-from,0px))}to{transform:translateY(var(--igs-vy-to,0px))}}
@keyframes igs-vy-rk-bar{from{transform:scaleX(var(--igs-vy-k0,1))}to{transform:scaleX(1)}}
@keyframes igs-vy-beat{0%{transform:scale(1)}18%{transform:scale(1.4)}36%{transform:scale(1)}54%{transform:scale(1.22)}72%{transform:scale(1)}}
@keyframes igs-vy-ecg{from{stroke-dashoffset:1}to{stroke-dashoffset:-1}}
@keyframes igs-vy-draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
@keyframes igs-vy-face-in{from{opacity:0}}
@keyframes igs-vy-flip{from{transform:rotateY(180deg)}to{transform:rotateY(0deg)}}
@keyframes igs-vy-case-roll{0%{transform:translateX(0)}25%{transform:translateX(0)}100%{transform:translateX(70vw)}}
@keyframes igs-vy-light{from{color:#5a2a45;text-shadow:none}}
@keyframes igs-vy-dot{0%{background:#ffd23f}50%{background:#7a5a10}}
@keyframes igs-vy-push{from{transform:scale(1)}to{transform:scale(1.55)}}
@keyframes igs-vy-rp-flash{0%{opacity:.85}22%{opacity:0}100%{opacity:0}}
@keyframes igs-vy-rp-n{0%{opacity:1}100%{opacity:0}}
@keyframes igs-vy-rp-n3{from{opacity:1}to{opacity:1}}
@keyframes igs-vy-breathe{0%{opacity:.7}50%{opacity:1}100%{opacity:.7}}
@keyframes igs-vy-drift{from{transform:translateX(0)}to{transform:translateX(12%)}}
`;

export const VARIETY_STYLE_TEXT = RAW.replace(/^@@/gm, '#igs-overlay ').replace(/,@@/g, ',#igs-overlay ');
