// 题材包清单：普通明星偶像。字段说明见 docs/FX_PACK_CONTRACT.md；本文件只导出 PACK，由 scene/fx-packs.js 汇总。
import { IDOL_BUILDERS } from './fx-idol.js';
import { IDOL_SFX_DEFS } from './fx-idol-sfx.js';
import { IDOL_STYLE_TEXT } from './fx-idol-style.js';
import { IDOL_AMBIENCE_HTML, IDOL_AMBIENT_LABELS, createIdolVoices, planIdolAmbient, resolveIdolAmbience } from './fx-idol-ambience.js';
import { IDOL_GRAMMAR_LINES, IDOL_KINDS, IDOL_LABELS, IDOL_PROMPT_LINES, IDOL_TRIGGERS, idolFxOf, parseIdolFxBody } from './fx-idol-model.js';

export const PACK = {
    id: 'idol',
    label: '偶像舞台',
    when: '普通明星偶像的打歌舞台、直拍、应援、选秀出道、颁奖、签售、狗仔、练习室、后台场面出现时才用（演唱会聚光灯与记者闪光灯见地点包，揭晓定格与数字滚动见戏剧节拍包，恋综见恋综包）',
    era: 'modern',
    kinds: IDOL_KINDS,
    labels: IDOL_LABELS,
    triggers: IDOL_TRIGGERS,
    promptLines: IDOL_PROMPT_LINES,
    grammarLines: IDOL_GRAMMAR_LINES,
    parse: parseIdolFxBody,
    of: idolFxOf,
    builders: IDOL_BUILDERS,
    sfx: IDOL_SFX_DEFS,
    cssText: IDOL_STYLE_TEXT,
    ambience: { html: IDOL_AMBIENCE_HTML, still: [], resolve: resolveIdolAmbience },
    ambient: { kinds: ['idol'], labels: IDOL_AMBIENT_LABELS, voices: createIdolVoices, plan: planIdolAmbient },
};
