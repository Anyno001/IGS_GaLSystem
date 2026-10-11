// COC与推理包的样式总装：设计语言“阴冷、透明、无机质”，细则见 fx-pack-coc-css-*.js。装饰一律单层半透明或实色；常驻层只用静态或慢 CSS，低画质与减少动态效果时静态。
import { COC_CSS_A } from './fx-pack-coc-css-a.js';
import { COC_CSS_B } from './fx-pack-coc-css-b.js';
import { COC_CSS_BASE } from './fx-pack-coc-css-base.js';
import { COC_CSS_C } from './fx-pack-coc-css-c.js';

export const COC_STATE_FILTER = 'grayscale(.35) contrast(1.15) brightness(.88) blur(.4px)';

export const COC_STYLE_TEXT = [COC_CSS_BASE, COC_CSS_A, COC_CSS_B, COC_CSS_C].join('');
