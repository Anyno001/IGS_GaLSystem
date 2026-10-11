// 题材包清单：后宫妃子。字段说明见 docs/FX_PACK_CONTRACT.md；本文件只导出 PACK，由 scene/fx-packs.js 汇总。
import { HAREM_BUILDERS } from './fx-harem.js';
import { HAREM_STYLE_TEXT } from './fx-harem-style.js';
import { HAREM_SFX_DEFS } from './fx-harem-sfx.js';
import {
    HAREM_AMBIENCE_HTML, HAREM_AMBIENT_KINDS, HAREM_AMBIENT_LABELS, HAREM_STILL_KINDS, createHaremVoices, planHaremAmbient, resolveHaremAmbience,
} from './fx-harem-ambience.js';
import { haremItemOf, parseHaremFx } from './fx-harem-model.js';

const KINDS = Object.freeze(['hmrank', 'hmfavor', 'hmboard', 'hmflip', 'hmselect', 'hmrecord', 'hmannounce', 'hmgreet', 'hmreward', 'hmprobe', 'hmpunish', 'hmtray', 'hmthread', 'hmcongrats', 'hmglare']);

export const PACK = {
    id: 'harem',
    label: '宫廷',
    when: '宫廷后宫里发生晋封、侍寝、请安、赏罚、验毒等场面时才用；宫宴献艺不另立标签，直接用 dance / guqin',
    era: 'ancient',
    kinds: KINDS,
    labels: {
        hmrank: '位份晋降', hmfavor: '恩宠值', hmboard: '六宫位份榜', hmflip: '翻绿头牌', hmselect: '殿选', hmrecord: '敬事房记档',
        hmannounce: '太监通传', hmgreet: '晨昏定省', hmreward: '赏赐清单', hmprobe: '验毒验亲', hmpunish: '宫中惩处',
        hmtray: '赐死托盘', hmthread: '悬丝诊脉', hmcongrats: '恭喜娘娘', hmglare: '众妃嫉妒',
    },
    triggers: {
        hmrank: ['晋封', '册封', '位份', '降位'],
        hmfavor: ['恩宠', '圣眷', '盛宠'],
        hmboard: ['六宫', '位份榜'],
        hmflip: ['绿头牌', '翻牌子'],
        hmselect: ['殿选', '选秀', '留牌子'],
        hmrecord: ['敬事房', '记档', '侍寝'],
        hmannounce: ['皇上驾到', '圣驾', '通传'],
        hmgreet: ['请安', '定省', '晨省'],
        hmreward: ['赏赐', '赐下', '恩赏'],
        hmprobe: ['验毒', '滴血验亲', '巫蛊', '银针'],
        hmpunish: ['掌嘴', '禁足', '冷宫'],
        hmtray: ['赐死', '白绫', '毒酒'],
        hmthread: ['悬丝诊脉', '诊脉', '太医'],
        hmcongrats: ['有喜', '喜脉', '恭喜娘娘'],
        hmglare: ['嫉妒', '眼红', '妒恨'],
    },
    promptLines: {
        hmrank: '[igs-fx:hmrank|角色|旧位份|新位份]：妃嫔晋封或降位时用，位份取答应、常在、贵人、嫔、妃、贵妃、皇贵妃、皇后；旧位份可省，演出为位份阶梯加册封（或降位）圣旨',
        hmfavor: '[igs-fx:hmfavor|角色|恩宠值|旧恩宠值]：写出某位妃嫔在皇上心中的恩宠变化，数值 0-100，旧值可省',
        hmboard: '[igs-fx:hmboard|甲:位份;乙:位份;丙:位份]：公示六宫位份时用，最多八人，按位份高低自动排序',
        hmflip: '[igs-fx:hmflip|被翻牌的人|其余牌子A;其余牌子B]：皇上翻绿头牌时用，其余牌子可省',
        hmselect: '[igs-fx:hmselect|留牌子/赐花/撂牌子|角色|赐花时的花名]：选秀殿选的结果，留牌子、赐花、撂牌子三选一',
        hmrecord: '[igs-fx:hmrecord|留/不留|角色]：敬事房记档，写“留”表示皇上召幸，之后可接亲密场面；写“不留”只出记档卡',
        hmannounce: '[igs-fx:hmannounce|通传词]：太监高声通传时用，默认“皇上驾到”，在场众人同时伏身行礼',
        hmgreet: '[igs-fx:hmgreet|晨/昏|甲:位份;乙:位份]：晨昏定省，众妃嫔按位份高低排班请安，晨昏可省',
        hmreward: '[igs-fx:hmreward|赏赐物1;物2;物3|受赏人]：帝后赏赐妃嫔时列出清单，最多六件，受赏人可省',
        hmprobe: '[igs-fx:hmprobe|银针/滴血/人偶|结果|一句说明]：验毒、滴血验亲、搜出巫蛊人偶；结果写“无毒/相融”或“有毒/不融”，可省',
        hmpunish: '[igs-fx:hmpunish|掌嘴/禁足/冷宫|受罚者]：宫中惩处，掌嘴时受罚者需是台上的角色',
        hmtray: '[igs-fx:hmtray|白绫/毒酒/匕首|受赐者]：赐死时端上托盘，受赐者可省',
        hmthread: '[igs-fx:hmthread|被诊脉的人|脉象]：太医悬丝诊脉，脉象如滑脉、弦脉，可省',
        hmcongrats: '[igs-fx:hmcongrats|角色|一句贺词]：妃嫔有喜或晋封后众人道贺，贺词可省',
        hmglare: '[igs-fx:hmglare|妃甲;妃乙;妃丙>被嫉妒的人]：几位妃嫔把目光投向同一人，最多三位',
    },
    parse: parseHaremFx,
    of: haremItemOf,
    builders: HAREM_BUILDERS,
    sfx: HAREM_SFX_DEFS,
    cssText: HAREM_STYLE_TEXT,
    ambience: {
        html: HAREM_AMBIENCE_HTML,
        still: HAREM_STILL_KINDS,
        resolve: resolveHaremAmbience,
    },
    ambient: {
        kinds: HAREM_AMBIENT_KINDS,
        labels: HAREM_AMBIENT_LABELS,
        voices: createHaremVoices,
        plan: planHaremAmbient,
    },
};
