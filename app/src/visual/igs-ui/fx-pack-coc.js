// 题材包清单：COC、DND与推理。字段说明见 docs/FX_PACK_CONTRACT.md；本文件只导出 PACK，由 scene/fx-packs.js 汇总。
import { COC_AMBIENCE_HTML, COC_STILL_KINDS } from './fx-pack-coc-ambience.js';
import { COC_BUILDERS } from './fx-pack-coc-build.js';
import { COC_KINDS, COC_LABELS, COC_PROMPT_LINES, COC_TRIGGERS, cocItemOf, parseCocBody, resolveCocAmbience } from './fx-pack-coc-model.js';
import { COC_SFX_DEFS } from './fx-pack-coc-sfx.js';
import { COC_STATE_FILTER, COC_STYLE_TEXT } from './fx-pack-coc-style.js';

export const PACK = {
    id: 'coc',
    label: 'COC、DND与推理',
    when: '跑团（COC、DND）、无限流副本、规则怪谈或推理侦探场面出现时才用',
    era: null,
    kinds: COC_KINDS,
    labels: COC_LABELS,
    triggers: COC_TRIGGERS,
    promptLines: COC_PROMPT_LINES,
    parse: parseCocBody,
    of: cocItemOf,
    builders: COC_BUILDERS,
    sfx: COC_SFX_DEFS,
    cssText: COC_STYLE_TEXT,
    states: { haze: { aliases: ['雾障', '视野收窄', '幻视'], filter: COC_STATE_FILTER, edge: '#1b2a24' } },
    ambience: {
        html: COC_AMBIENCE_HTML,
        still: COC_STILL_KINDS,
        resolve: (location, ctx) => resolveCocAmbience(location, ctx && ctx.worldview),
    },
};
