// 题材包清单：恋综。字段说明见 docs/FX_PACK_CONTRACT.md；本文件只导出 PACK，由 scene/fx-packs.js 汇总。
import { VARIETY_BUILDERS } from './fx-variety.js';
import { VARIETY_SFX_DEFS } from './fx-variety-sfx.js';
import { VARIETY_STYLE_TEXT } from './fx-variety-style.js';
import { VARIETY_AMBIENCE_HTML, VARIETY_AMBIENT_LABELS, createVarietyVoices, planVarietyAmbient, resolveVarietyAmbience } from './fx-variety-ambience.js';
import { VARIETY_GRAMMAR_LINES, VARIETY_KINDS, VARIETY_LABELS, VARIETY_PROMPT_LINES, VARIETY_TRIGGERS, parseVarietyFxBody, varietyFxOf } from './fx-variety-model.js';

export const PACK = {
    id: 'variety',
    label: '恋爱综艺',
    when: '恋爱综艺的录制场面（小屋、观察室、采访间、告白之夜）出现时才用',
    era: 'modern',
    kinds: VARIETY_KINDS,
    labels: VARIETY_LABELS,
    triggers: VARIETY_TRIGGERS,
    promptLines: VARIETY_PROMPT_LINES,
    grammarLines: VARIETY_GRAMMAR_LINES,
    parse: parseVarietyFxBody,
    of: varietyFxOf,
    builders: VARIETY_BUILDERS,
    sfx: VARIETY_SFX_DEFS,
    cssText: VARIETY_STYLE_TEXT,
    ambience: { html: VARIETY_AMBIENCE_HTML, still: [], resolve: resolveVarietyAmbience },
    ambient: { kinds: ['cabin'], labels: VARIETY_AMBIENT_LABELS, voices: createVarietyVoices, plan: planVarietyAmbient },
};
