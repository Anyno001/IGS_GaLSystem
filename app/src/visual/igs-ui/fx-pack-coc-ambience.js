// COC与推理包的常驻氛围层：主神空间（冷白方格）、雾港小镇（慢雾）、警戒线（冷色双侧慢脉冲与灰白警戒带）。只放静态或慢 CSS，低画质静态。
export const COC_AMBIENCE_HTML = Object.freeze({
    zonehub: '<i class="igs-coc-amb-white"></i><i class="igs-coc-amb-grid"></i><i class="igs-coc-amb-core"></i>',
    fogport: '<i class="igs-coc-amb-haze"></i><i class="igs-coc-amb-fog is-a"></i><i class="igs-coc-amb-fog is-b"></i><i class="igs-coc-amb-lamp"></i>',
    cordon: '<i class="igs-coc-amb-pulse-a"></i><i class="igs-coc-amb-pulse-b"></i><i class="igs-coc-amb-tape"></i>',
});

// 主神空间是纯静态，NSFW 页也保留；雾与警灯会动，NSFW 页不挂。
export const COC_STILL_KINDS = Object.freeze(['zonehub']);
