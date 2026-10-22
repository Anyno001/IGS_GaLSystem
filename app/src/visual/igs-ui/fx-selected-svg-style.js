// Approved SVG shells follow the existing stage anchors, durations and lifecycle.
// Artwork-specific selectors never affect candle-incense, ordinary flames or cards.
export const SELECTED_SVG_STYLE_TEXT = `
#igs-overlay .igs-dfx-timeskip .new-incense{position:relative;width:90px;height:150px;overflow:visible;}
#igs-overlay .igs-dfx-candle.is-lamp{animation:igs-dfx-fade var(--igs-dfx-life) ease both;}
#igs-overlay .igs-dfx-candle.is-lamp .new-lantern{position:absolute;left:50%;bottom:0;width:72px;height:108px;overflow:visible;transform:translateX(-50%);}
#igs-overlay .igs-dfx-guqin .q32-clean-art{position:absolute;left:50%;top:50%;display:block;width:105.08664058%;height:auto;overflow:visible;transform:translate(-50%,-50%);}
#igs-overlay .igs-dfx-guqin .q32-clean-s1,#igs-overlay .igs-dfx-guqin .q32-clean-s2,#igs-overlay .igs-dfx-guqin .q32-clean-s4,#igs-overlay .igs-dfx-guqin .q32-clean-s5{transform-box:fill-box;transform-origin:center;animation:igs-dfx-rt-string .5s ease-out both;}
#igs-overlay .igs-dfx-guqin .q32-clean-s1{animation-delay:1350ms;}
#igs-overlay .igs-dfx-guqin .q32-clean-s2{animation-delay:670ms;}
#igs-overlay .igs-dfx-guqin .q32-clean-s4{animation-delay:350ms;}
#igs-overlay .igs-dfx-guqin .q32-clean-s5{animation-delay:970ms;}
#igs-overlay .igs-dfx-guqin .q32-clean-ripples{opacity:1;}
#igs-overlay .igs-dfx-guqin .q32-clean-ripple{transform-box:fill-box;transform-origin:center;animation:igs-dfx-rt-ripple 1.3s ease-out both;}
#igs-overlay .igs-dfx-guqin .q32-clean-r1{animation-delay:350ms;}
#igs-overlay .igs-dfx-guqin .q32-clean-r2{animation-delay:670ms;}
#igs-overlay .igs-dfx-guqin .q32-clean-r3{animation-delay:970ms;}
#igs-overlay .igs-dfx-guqin .q32-clean-r4{animation-delay:1350ms;}
/* Keep the original 14%-wide pass container and its cast-dependent displacement.
   The 160-unit SVG is 11.4196078431% of the stage, with a 7.28%-wide bowl.
   Its bowl center remains at fromX / (y + 3.07%), as in the approved preview. */
#igs-overlay .igs-dfx-tea-set .t34-clean-art{position:absolute;left:50%;top:43.8571428571%;display:block;width:81.5686274507%;height:auto;overflow:visible;transform:translate(-50%,-64.1025641026%);}
#igs-overlay .igs-dfx-tea .t34-clean-steam{animation:igs-dfx-rt-steam var(--igs-dfx-life) ease-in-out both;}
#igs-overlay .igs-dfx-tea .t34-clean-vapor{animation:igs-svg-tea-wisp calc(var(--igs-dfx-life) * .45) ease-in-out calc(var(--igs-dfx-life) * .55) both;}
@keyframes igs-svg-tea-wisp{0%{transform:translateY(4px)}100%{transform:translateY(-6px)}}
#igs-overlay .igs-dfx.is-reduced .q32-clean-string,#igs-overlay .igs-dfx.is-reduced .q32-clean-ripple,#igs-overlay .igs-dfx.is-reduced .t34-clean-steam,#igs-overlay .igs-dfx.is-reduced .t34-clean-vapor{animation:none;}
#igs-overlay .igs-dfx.is-reduced .q32-clean-ripples,#igs-overlay[data-igs-quality="low"] .q32-clean-ripples{display:none;}
#igs-overlay .igs-dfx.is-reduced .t34-clean-steam{opacity:.6;}
@media(prefers-reduced-motion:reduce){
#igs-overlay .igs-dfx-guqin .q32-clean-string,#igs-overlay .igs-dfx-guqin .q32-clean-ripple,#igs-overlay .igs-dfx-tea .t34-clean-steam,#igs-overlay .igs-dfx-tea .t34-clean-vapor{animation:none;}
#igs-overlay .igs-dfx-guqin .q32-clean-ripples{display:none;}
}
`;
