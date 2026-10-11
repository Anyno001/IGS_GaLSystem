// 题材包清单：直白亲密。字段说明见 docs/FX_PACK_CONTRACT.md；本文件只导出 PACK，由 scene/fx-packs.js 汇总。
// 前置开关是亲密演出总开关（romanceFx.enabled）；全部 kind 默认关，NSFW 场景里也允许播放。
// 不含非标签演出（运镜节奏、换图切镜、喘息打字、贴耳语音、升温分档、衣物散落、事后余韵层）：它们是 romanceFx 下的默认关子项。
import { NSFW_BUILDERS } from './fx-nsfw-build.js';
import { NSFW_ERA_KINDS, NSFW_KINDS, NSFW_LABELS, NSFW_PROMPT_LINES, NSFW_TRIGGERS, NSFW_WORLDVIEW_OFF, nsfwFxOf, parseNsfwBody } from './fx-nsfw-model.js';
import { NSFW_SFX_DEFS } from './fx-nsfw-sfx.js';
import { NSFW_STYLE_TEXT } from './fx-nsfw-style.js';

export const PACK = {
    id: 'nsfw',
    label: '直白亲密',
    when: '亲密场面推进到对应时刻才用',
    era: null,
    eraKinds: NSFW_ERA_KINDS,
    worldviewOff: NSFW_WORLDVIEW_OFF,
    requires: 'romanceFx',
    allowNsfw: true,
    kinds: [...NSFW_KINDS],
    labels: NSFW_LABELS,
    triggers: NSFW_TRIGGERS,
    promptLines: NSFW_PROMPT_LINES,
    parse: parseNsfwBody,
    of: nsfwFxOf,
    builders: NSFW_BUILDERS,
    sfx: NSFW_SFX_DEFS,
    cssText: NSFW_STYLE_TEXT,
};
