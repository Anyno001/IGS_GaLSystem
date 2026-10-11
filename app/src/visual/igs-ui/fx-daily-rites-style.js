// 古风礼仪雅事演出的样式（并入 DAILY_FX_STYLE_TEXT）：抚琴、对弈、圣旨、敬茶、行礼。全部实色，动画只用 transform 与 opacity；减少动态效果下静态且完整可见。
export const RITES_FX_STYLE_TEXT = `
#igs-overlay .igs-dfx-guqin,#igs-overlay .igs-dfx-go,#igs-overlay .igs-dfx-edict,#igs-overlay .igs-dfx-tea,#igs-overlay .igs-dfx-bow{animation:igs-dfx-fade var(--igs-dfx-life) ease both;}
#igs-overlay .igs-dfx-guqin-qin{position:absolute;width:min(46%,420px);aspect-ratio:5/1;transform:translate(-50%,-50%);animation:igs-dfx-rt-rise calc(var(--igs-dfx-life) * .2) cubic-bezier(.2,.8,.3,1) both;}
#igs-overlay .igs-dfx-guqin-body{position:absolute;inset:0;border-radius:10px 40px 40px 10px / 50%;background:#3c2614;border:1px solid rgba(82,52,28,.55);}
#igs-overlay .igs-dfx-guqin-yue{position:absolute;left:0;top:0;bottom:0;width:5%;background:#2e1b12;border-radius:10px 0 0 10px;}
#igs-overlay .igs-dfx-guqin-badges{position:absolute;left:10%;right:10%;top:12%;display:flex;justify-content:space-between;}
#igs-overlay .igs-dfx-guqin-badges u{width:4px;height:4px;border-radius:50%;background:#e8dcc0;}
#igs-overlay .igs-dfx-guqin-strings{position:absolute;left:5%;right:6%;top:24%;bottom:24%;display:flex;flex-direction:column;justify-content:space-between;}
#igs-overlay .igs-dfx-guqin-strings i{height:1px;background:rgba(238,228,200,.65);}
#igs-overlay .igs-dfx-guqin-strings i.is-p{animation:igs-dfx-rt-string .5s ease-out both;}
#igs-overlay .igs-dfx-guqin-tail{position:absolute;right:3%;top:30%;bottom:30%;width:3%;border-radius:2px;background:#2e1b12;}
#igs-overlay .igs-dfx-guqin-qin b{position:absolute;width:44px;height:14px;margin:-7px 0 0 -22px;border-radius:50%;border:1px solid rgba(96,116,112,.45);opacity:0;animation:igs-dfx-rt-ripple 1.3s ease-out both;}
@keyframes igs-dfx-rt-rise{0%{opacity:0;transform:translate(-50%,-30%)}100%{opacity:1;transform:translate(-50%,-50%)}}
@keyframes igs-dfx-rt-string{0%{transform:scaleY(1)}12%{transform:translateY(-2px) scaleY(3)}30%{transform:translateY(2px) scaleY(2)}60%{transform:scaleY(1.4)}100%{transform:scaleY(1)}}
@keyframes igs-dfx-rt-ripple{0%{opacity:.8;transform:scale(.3)}100%{opacity:0;transform:scale(2.6)}}
#igs-overlay .igs-dfx.igs-dfx-go{bottom:var(--igs-fx-safe);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;}
#igs-overlay .igs-dfx-go-board{position:relative;width:198px;height:198px;border-radius:4px;background-color:#d9b36c;background-image:linear-gradient(#6b4a1c 1px,transparent 1px),linear-gradient(90deg,#6b4a1c 1px,transparent 1px);background-size:22px 22px;background-position:22px 22px;border:1px solid #b89650;box-shadow:0 2px 10px rgba(42,42,42,.38);animation:igs-dfx-rt-rise2 .5s ease-out both;}
#igs-overlay .igs-dfx-go-stones{position:absolute;inset:0;}
#igs-overlay .igs-dfx-go-stones i{position:absolute;width:18px;height:18px;border-radius:50%;}
#igs-overlay .igs-dfx-go-stones i.is-b{background:radial-gradient(circle at 35% 30%,#484848,#1a1a1a);}
#igs-overlay .igs-dfx-go-stones i.is-w{background:radial-gradient(circle at 35% 30%,#f6f4ee,#d2cdb8);}
#igs-overlay .igs-dfx-go-stones i.is-new{opacity:0;animation:igs-dfx-rt-stone .28s ease-in both;}
#igs-overlay .igs-dfx-go-stones em{position:absolute;inset:-4px;border-radius:50%;border:1px solid rgba(192,57,43,.7);}
#igs-overlay .igs-dfx-go-verdict{padding:2px 14px;border:1px solid #c0392b;border-radius:2px;color:#c0392b;background:#f3ead3;font-weight:600;font-size:1.1em;opacity:0;animation:igs-dfx-rt-stamp .3s ease-out calc(var(--igs-dfx-life) * .72) both;}
@keyframes igs-dfx-rt-rise2{0%{opacity:0;transform:translateY(14px)}100%{opacity:1;transform:none}}
@keyframes igs-dfx-rt-stone{0%{opacity:0;transform:translateY(-14px) scale(1.5)}70%{opacity:1;transform:scale(.94)}100%{opacity:1;transform:none}}
@keyframes igs-dfx-rt-stamp{0%{opacity:0;transform:scale(1.8)}100%{opacity:1;transform:none}}
#igs-overlay .igs-dfx.igs-dfx-edict{bottom:var(--igs-fx-safe);display:flex;align-items:center;justify-content:center;}
#igs-overlay .igs-dfx-edict-roll{position:relative;display:flex;align-items:stretch;justify-content:center;max-width:86%;}
#igs-overlay .igs-dfx-edict-sheet{position:relative;overflow:hidden;min-width:120px;max-width:min(60vw,520px);padding:22px 30px 54px;background:#ede3bc;border-top:1px solid #c4a040;border-bottom:1px solid #c4a040;color:#3a2410;transform-origin:50% 50%;animation:igs-dfx-rt-unroll .9s cubic-bezier(.3,.7,.3,1) .1s both;}
#igs-overlay .igs-dfx-edict-head{margin-bottom:12px;text-align:center;font-weight:500;font-size:.88em;letter-spacing:.28em;color:#8a2a1c;}
#igs-overlay .igs-dfx-edict-body{writing-mode:vertical-rl;max-height:min(50vh,360px);margin:0 auto;font-weight:400;letter-spacing:.18em;line-height:1.7;}
#igs-overlay .igs-dfx-edict.is-notice .igs-dfx-edict-sheet{background:#f3eedf;border-color:#c6b692;}
#igs-overlay .igs-dfx-edict-rod{position:absolute;top:-4px;bottom:-4px;width:8px;border-radius:4px;background:#7a4a1c;}
#igs-overlay .igs-dfx-edict-rod.is-left{left:0;animation:igs-dfx-rt-rod-l .9s cubic-bezier(.3,.7,.3,1) .1s both;}
#igs-overlay .igs-dfx-edict-rod.is-right{right:0;animation:igs-dfx-rt-rod-r .9s cubic-bezier(.3,.7,.3,1) .1s both;}
#igs-overlay .igs-dfx-edict-seal{position:absolute;right:18px;bottom:12px;display:flex;flex-direction:column;width:30px;height:30px;border:1px solid #b8281c;background:#f3ead3;color:#b8281c;font-weight:600;font-size:.72em;line-height:1.1;text-align:center;justify-content:center;opacity:0;animation:igs-dfx-rt-stamp .25s ease-out 2.6s both;}
#igs-overlay .igs-dfx-edict-seal.is-small{width:22px;height:22px;font-size:.65em;}
#igs-overlay .igs-dfx-edict-seal u{text-decoration:none;}
@keyframes igs-dfx-rt-unroll{0%{transform:scaleX(.04)}100%{transform:none}}
@keyframes igs-dfx-rt-rod-l{0%{transform:translateX(50%)}100%{transform:none}}
@keyframes igs-dfx-rt-rod-r{0%{transform:translateX(-50%)}100%{transform:none}}
#igs-overlay .igs-dfx-tea-set{position:absolute;width:14%;height:7%;animation:igs-dfx-rt-pass calc(var(--igs-dfx-life) * .5) cubic-bezier(.4,0,.3,1) both;}
#igs-overlay .igs-dfx-tea-saucer{position:absolute;left:14%;right:14%;bottom:0;height:22%;border-radius:50%;background:#e4dcc6;box-shadow:0 1px 0 rgba(185,174,146,.5);}
#igs-overlay .igs-dfx-tea-bowl{position:absolute;left:24%;right:24%;bottom:14%;height:70%;border-radius:0 0 50% 50%;background:#f5f1e6;box-shadow:inset 0 -2px 0 rgba(204,195,173,.55);}
#igs-overlay .igs-dfx-tea-liquid{position:absolute;left:28%;right:28%;bottom:62%;height:8%;border-radius:50%;background:#8a9a4a;}
#igs-overlay .igs-dfx-tea-cuff{position:absolute;bottom:4%;width:18%;height:48%;background:#3f5b5a;border-radius:6px;}
#igs-overlay .igs-dfx-tea-cuff.is-l{left:-6%;}
#igs-overlay .igs-dfx-tea-cuff.is-r{right:-6%;}
#igs-overlay .igs-dfx-tea-steam{position:absolute;inset:0;opacity:0;animation:igs-dfx-rt-steam var(--igs-dfx-life) ease-in-out both;}
@keyframes igs-dfx-rt-pass{0%{opacity:0;transform:translate(0,8px)}20%{opacity:1;transform:none}70%,100%{opacity:1;transform:translateX(calc(var(--igs-k) * 100%))}}
@keyframes igs-dfx-rt-steam{0%,55%{opacity:0}70%,90%{opacity:1}100%{opacity:0}}
#igs-overlay .igs-dfx-bow-ink{position:absolute;width:20%;aspect-ratio:4/1;margin:-2.5% 0 0 -10%;border-radius:50%;background:#2b2b2b;opacity:0;animation:igs-dfx-rt-ink calc(var(--igs-dfx-life) * .9) ease-out both;}
#igs-overlay .igs-dfx-bow-seal{position:absolute;width:26px;height:26px;margin:-13px 0 0 -13px;border:1px solid #b8281c;border-radius:2px;background:#f3ead3;color:#b8281c;font-weight:600;line-height:24px;text-align:center;opacity:0;animation:igs-dfx-rt-stamp .25s ease-out calc(var(--igs-dfx-life) * .4) both;}
@keyframes igs-dfx-rt-ink{0%{opacity:0;transform:scale(.3)}40%{opacity:.35}100%{opacity:0;transform:scale(1.5)}}
#igs-overlay .igs-dfx.is-reduced .igs-dfx-go-board,#igs-overlay .igs-dfx.is-reduced .igs-dfx-edict-sheet,#igs-overlay .igs-dfx.is-reduced .igs-dfx-edict-rod,#igs-overlay .igs-dfx.is-reduced .igs-dfx-tea-set{animation:none;opacity:1;transform:none;}
#igs-overlay .igs-dfx.is-reduced .igs-dfx-guqin-qin{animation:none;opacity:1;transform:translate(-50%,-50%);}
#igs-overlay .igs-dfx.is-reduced .igs-dfx-guqin-qin b,#igs-overlay .igs-dfx.is-reduced .igs-dfx-bow-ink{display:none;}
#igs-overlay .igs-dfx.is-reduced .igs-dfx-guqin-strings i.is-p{animation:none;}
#igs-overlay .igs-dfx.is-reduced .igs-dfx-go-stones i.is-new,#igs-overlay .igs-dfx.is-reduced .igs-dfx-go-verdict,#igs-overlay .igs-dfx.is-reduced .igs-dfx-edict-seal,#igs-overlay .igs-dfx.is-reduced .igs-dfx-bow-seal,#igs-overlay .igs-dfx.is-reduced .igs-dfx-tea-steam{animation:none;opacity:1;transform:none;}
#igs-overlay[data-igs-quality="low"] .igs-dfx-guqin-qin b{display:none;}
`;
