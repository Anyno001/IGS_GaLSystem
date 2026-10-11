// 题材包清单：镜头与空间。字段说明见 docs/FX_PACK_CONTRACT.md；本文件只导出 PACK，由 scene/fx-packs.js 汇总。
// 不限时代；独立开关 cameraPackFx.enabled，脚步与心跳声另有 cameraPackFx.sound（默认关）。镜头本身走 cam 标签，见 camera-shots.js。
import { CAMERA_AMBIENCE_HTML, CAMERA_GRAMMAR_LINES, CAMERA_KINDS, CAMERA_LABELS, CAMERA_PROMPT_LINES, CAMERA_TRIGGERS, cameraFxOf, normalizeCameraSettings, parseCameraFx, resolveCameraAmbience } from './fx-camera-model.js';
import { CAMERA_BUILDERS } from './fx-camera.js';
import { CAMERA_SFX_DEFS } from './fx-camera-sfx.js';
import { CAMERA_STYLE_TEXT } from './fx-camera-style.js';

export const PACK = {
    id: 'camera',
    label: '镜头与空间',
    when: '场景里有移动、追逐、潜行、抵达、目送、赶路、分屏等需要镜头与空间感的场面时才用（坐下、躺下、起身用 cam 的下沉／升起）',
    era: null,
    defaultOn: true,
    packSwitch: 'cameraPackFx.enabled',
    settings: normalizeCameraSettings,
    kinds: [...CAMERA_KINDS],
    labels: CAMERA_LABELS,
    triggers: CAMERA_TRIGGERS,
    promptLines: CAMERA_PROMPT_LINES,
    grammarLines: CAMERA_GRAMMAR_LINES,
    parse: parseCameraFx,
    of: cameraFxOf,
    builders: CAMERA_BUILDERS,
    sfx: CAMERA_SFX_DEFS,
    cssText: CAMERA_STYLE_TEXT,
    ambience: {
        html: CAMERA_AMBIENCE_HTML,
        still: [],
        resolve: (location) => resolveCameraAmbience(location),
    },
};
