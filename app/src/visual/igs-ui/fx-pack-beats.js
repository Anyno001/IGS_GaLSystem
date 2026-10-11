// 题材包清单：戏剧节拍。字段说明见 docs/FX_PACK_CONTRACT.md；本文件只导出 PACK，由 scene/fx-packs.js 汇总。
// 揭晓定格、系统公告面板、数字滚动卡、证物甩出卡、红线与视线、众人反应、慢动作回眸、行动顺序条、内心独白小字。
import { BEATS_KINDS, BEATS_LABELS, BEATS_TRIGGERS, beatsFxOf, parseBeatsFx } from './fx-beats-model.js';
import { BEATS_BUILDERS } from './fx-beats-build.js';
import { BEATS_SFX_DEFS } from './fx-beats-sfx.js';
import { BEATS_STYLE_TEXT } from './fx-beats-style.js';

export const PACK = {
    id: 'beats',
    label: '戏剧节拍',
    when: '正文出现揭晓、系统公告、证物、重逢、众人集体反应等戏剧节拍时',
    era: null,
    defaultOn: true,
    kinds: [...BEATS_KINDS],
    labels: BEATS_LABELS,
    triggers: BEATS_TRIGGERS,
    promptLines: {
        reveal: '[igs-fx:reveal|大字|副字]：真相、身份或结果当众揭晓的一瞬，大字写揭晓的核心词（八字内），副字可省略',
        panel: '[igs-fx:panel|类型|标题|行1;行2]：系统提示、副本公告、任务发布、结算或突破时弹出面板；类型只写 系统／公告／任务／结算／突破 之一，每行可写「项目：内容」，最多六行',
        count: '[igs-fx:count|标签|起始值|终值|单位]：金额到账、竞价加码、比分、倒计时或积分变化时，数字从起始值滚到终值，数值照正文写，起始值可省略',
        evidence: '[igs-fx:evidence|名称|描述]：把证物、证据或关键道具甩到面前的一刻，描述写一句话，可省略',
        link: '[igs-fx:link|角色甲|角色乙|样式]：两人之间有牵连、被注视或命运相连时，在两人之间拉一条线；样式写 红线／视线／光丝 之一，默认红线',
        crowd: '[igs-fx:crowd|反应|字样]：在场众人集体反应的一刻；反应写 转头／鞠躬／倒吸／哗然／鼓掌／欢呼／哄笑／肃静 之一，字样可省略',
        reunion: '[igs-fx:reunion|角色名]：久别重逢、回眸相见的一瞬，角色名写回眸的人，可省略',
        order: '[igs-fx:order|甲;乙;丙]：战斗或比拼开始前宣布行动顺序，名字按先后用分号隔开，至少两人',
        os: '[igs-fx:os|心声]：角色或主角没有说出口的内心想法，四十字内，在屏幕一角以小字呈现',
    },
    parse: parseBeatsFx,
    of: beatsFxOf,
    builders: BEATS_BUILDERS,
    sfx: BEATS_SFX_DEFS,
    cssText: BEATS_STYLE_TEXT,
};
