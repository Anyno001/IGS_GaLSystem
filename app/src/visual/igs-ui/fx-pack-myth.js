// 题材包清单：神话妖魔。字段说明见 docs/FX_PACK_CONTRACT.md；本文件只导出 PACK，由 scene/fx-packs.js 汇总。
import { MYTH_KINDS, MYTH_LABELS, MYTH_PROMPT_LINES, MYTH_TRIGGERS, mythFxOf, parseMythBody } from './fx-myth-model.js';
import { MYTH_BUILDERS } from './fx-myth.js';
import { MYTH_SFX_DEFS } from './fx-myth-sfx.js';
import { MYTH_STYLE_TEXT } from './fx-myth-style.js';
import { MYTH_AMBIENCE_HTML, MYTH_AMBIENT_LABELS, createMythVoices, planMythAmbient, resolveMythAmbience } from './fx-myth-ambience.js';

const CHARM_STYLE = `
#igs-overlay #igs-stage-motion[data-igs-fx-state="charm"] #igs-text{letter-spacing:.05em;}
#igs-overlay[data-igs-quality="low"] #igs-stage-motion[data-igs-fx-state="charm"] #igs-text{letter-spacing:normal;}
`;

export const PACK = {
    id: 'myth',
    label: '神话妖魔',
    when: '剧情进入封神、志怪、斗法降妖的场面时才用',
    era: 'ancient',
    kinds: [...MYTH_KINDS],
    labels: MYTH_LABELS,
    triggers: MYTH_TRIGGERS,
    promptLines: MYTH_PROMPT_LINES,
    parse: (type, fields) => parseMythBody(type, fields),
    of: (args) => mythFxOf(args),
    builders: MYTH_BUILDERS,
    sfx: MYTH_SFX_DEFS,
    cssText: MYTH_STYLE_TEXT + CHARM_STYLE,
    states: {
        charm: { aliases: ['魅惑', '迷惑', '媚术', '摄魂'], filter: 'saturate(1.18) brightness(1.04) hue-rotate(-8deg) blur(.4px)', edge: '#ff7eb6' },
    },
    ambience: {
        html: MYTH_AMBIENCE_HTML,
        still: [],
        resolve: resolveMythAmbience,
    },
    ambient: {
        kinds: ['mythwind', 'mythbazaar', 'mythriver', 'mythdrip'],
        labels: MYTH_AMBIENT_LABELS,
        voices: createMythVoices,
        plan: planMythAmbient,
    },
};
