// 演出细线字形：统一用 SVG 取代 emoji / 音符 / 星芒 / 心形等依赖字体的字符（各平台渲染不一、会变豆腐块）。
// 约定：单色线描（stroke 取 currentColor）、线宽 1.5、圆角端点、不画高光和卡通填色；大小跟 font-size（1em）。
// 直播路人弹幕里的 emoji 是例外，不走这里。

const svg = (cls, inner, vb = '0 0 24 24', size = '1em') => `<svg class="igs-gl ${cls}" viewBox="${vb}" width="${size}" height="${size}" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

const NOTES = Object.freeze([
    'M9.5 17.5a2.8 2.2 -20 1 1 -5.6 0a2.8 2.2 -20 1 1 5.6 0ZM9.5 17V4.5l7 2.6',
    'M8 18a2.6 2 -20 1 1 -5.2 0a2.6 2 -20 1 1 5.2 0ZM20 16.5a2.6 2 -20 1 1 -5.2 0a2.6 2 -20 1 1 5.2 0ZM8 17.5V6.5l12 -2.5v12M8 10l12 -2.5',
    'M13 17.5a2.8 2.2 -20 1 1 -5.6 0a2.8 2.2 -20 1 1 5.6 0ZM13 17V4',
]);
// 音符：第 i 个字形（单音符、双音符、四分音符交替）。
export function noteGlyph(i = 0) {
    return svg('igs-gl-note', `<path d="${NOTES[Math.abs(Number(i) || 0) % NOTES.length]}"/>`);
}
// 四角星芒（取代文字星芒）。
export function sparkGlyph() {
    return svg('igs-gl-spark', '<path d="M12 3Q12.8 11.2 21 12Q12.8 12.8 12 21Q11.2 12.8 3 12Q11.2 11.2 12 3Z"/>');
}
// 心形（取代文字心形）；filled 时实心。
export function heartGlyph(filled = false) {
    return `<svg class="igs-gl igs-gl-heart" viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" focusable="false" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M12 20C5.5 15.4 3.2 11.8 3.2 8.6A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8.8 1.6C20.8 11.8 18.5 15.4 12 20Z"/></svg>`;
}
// 爪印（取代 emoji 爪印）：一枚掌垫加四趾，线描。
export function pawGlyph() {
    return svg('igs-gl-paw', '<path d="M8.5 16.2C8.5 13.6 10 12 12 12s3.5 1.6 3.5 4.2c0 1.8-1.4 2.6-3.5 2.6s-3.5-.8-3.5-2.6Z"/><circle cx="6.6" cy="11" r="1.5"/><circle cx="9.8" cy="7.2" r="1.5"/><circle cx="14.2" cy="7.2" r="1.5"/><circle cx="17.4" cy="11" r="1.5"/>');
}

// 碰杯：按材质区分轮廓；viewBox 32×40，把手统一画在左侧（右杯整体水平镜像）。含 class="igs-gl-acc" 的线条是杯中液面（强调色）。
const CUPS = Object.freeze({
    glass: '<path d="M9 5h14c0 8.5-2.4 14-7 15-4.6-1-7-6.5-7-15Z"/><path class="igs-gl-acc" d="M10.2 11h11.6"/><path d="M16 20v13M10.5 35.5h11"/>',
    ceramic: '<path d="M5.5 13h19c0 9-3.2 16-9.5 16S5.5 22 5.5 13Z"/><path d="M5.8 15H4.4a3.4 3.4 0 0 0 0 6.8h2.4"/><path class="igs-gl-acc" d="M7.2 17h15.6"/><path d="M8 34h14"/>',
    plastic: '<path d="M8.5 11h15l-2 22.5a1.2 1.2 0 0 1-1.2 1.1h-8.6a1.2 1.2 0 0 1-1.2-1.1Z"/><path d="M7 11h18M17.5 11l2.6-7.5h4"/><path class="igs-gl-acc" d="M9.4 21h13.2"/>',
    can: '<path d="M9.5 7h13v26.5a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2Z"/><path d="M9.5 11h13M9.5 31h13M14 4.8h4"/><path class="igs-gl-acc" d="M9.5 21h13"/>',
    wood: '<path d="M4.5 14h23c0 8.4-4.6 13.6-11.5 13.6S4.5 22.4 4.5 14Z"/><path class="igs-gl-acc" d="M6.2 18h19.6"/><path d="M12 34h8M16 27.6V34"/>',
    metal: '<path d="M7 5h18v6.5c0 6.4-3.8 10.5-9 10.5S7 17.9 7 11.5Z"/><path class="igs-gl-acc" d="M7 9.5h18"/><path d="M16 22v6M13.5 25h5M10 35h12c0-3.8-2.6-7-6-7s-6 3.2-6 7Z"/>',
});
export const CHEERS_MATERIALS = Object.freeze(Object.keys(CUPS));
export function cupGlyph(material) {
    return svg('igs-gl-cup', CUPS[material] || CUPS.glass, '0 0 32 40', '100%');
}

// 猜拳：不画手，用三枚几何符号（岩块 / 交叉剪刃 / 折角纸页），外加文字名。viewBox 24×24。
const RPS = Object.freeze({
    rock: '<path d="M5.5 15.5 8 7.5l6.5-2.6 4.8 5-1.8 8L9.5 19Z"/><path d="M8 7.5l1.5 11.5M14.5 4.9l-1.3 9.4 4.3 3.2"/>',
    scissors: '<path d="M6 3.5l12.6 12.8M18 3.5 5.4 16.3"/><circle cx="6.5" cy="19.5" r="2.6"/><circle cx="17.5" cy="19.5" r="2.6"/>',
    paper: '<path d="M6.5 2.5h8.8l4.2 4.2v14.8h-13Z"/><path d="M15.3 2.5v4.2h4.2M9.5 12h7M9.5 15.5h7"/>',
});
export function rpsGlyph(kind) {
    return RPS[kind] ? svg('igs-gl-rps', RPS[kind]) : '';
}
