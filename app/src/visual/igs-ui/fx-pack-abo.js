// 题材包清单：ABO。字段说明见 docs/FX_PACK_CONTRACT.md；本文件只导出 PACK，由 scene/fx-packs.js 汇总。
// 不限时代，用独立开关 aboFx.enabled；古风换淡墨雾，西幻换魔力雾（builder 内按 env.ancient / .is-magic）。
import { ABO_KINDS, ABO_LABELS, ABO_PROMPT_LINES, ABO_TRIGGERS, aboFxOf, parseAboFxBody } from './fx-abo-model.js';
import { ABO_BUILDERS } from './fx-abo-build.js';
import { ABO_SFX_DEFS } from './fx-abo-sfx.js';
import { ABO_STYLE_TEXT } from './fx-abo-style.js';

export const PACK = {
    id: 'abo',
    label: 'ABO',
    when: '出现信息素、标记、发情期、易感期等设定的场面才用',
    era: null,
    packSwitch: 'aboFx.enabled',
    kinds: [...ABO_KINDS],
    labels: ABO_LABELS,
    triggers: ABO_TRIGGERS,
    promptLines: ABO_PROMPT_LINES,
    parse: parseAboFxBody,
    of: aboFxOf,
    builders: ABO_BUILDERS,
    sfx: ABO_SFX_DEFS,
    cssText: ABO_STYLE_TEXT,
    states: {
        heat: { aliases: ['发情期', '发情', '热潮'], filter: 'saturate(1.3) brightness(1.04) sepia(.18) hue-rotate(-8deg)', edge: '#ff6f91' },
        rut: { aliases: ['易感期', '易感'], filter: 'saturate(1.2) brightness(.93) contrast(1.06)', edge: '#a3202a' },
    },
};
