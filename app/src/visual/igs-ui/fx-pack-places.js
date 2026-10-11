// 题材包清单：地点与场景。字段说明见 docs/FX_PACK_CONTRACT.md；本文件只导出 PACK，由 scene/fx-packs.js 汇总。
import { PLACES_SFX_DEFS } from './fx-places-sfx.js';
import { PLACES_AMBIENCE_HTML, PLACES_STYLE_TEXT } from './fx-places-style.js';
import { PLACES_BUILDERS } from './fx-places-render.js';
import { PLACES_AMBIENT_KINDS, PLACES_AMBIENT_LABELS, createPlacesVoices, placesAmbientPlan } from './fx-places-voices.js';
import { PLACE_STILL, parsePlacesFx, placesFxOf, resolvePlaceKind } from './fx-places-model.js';

const KINDS = Object.freeze(['elevator', 'eavesdrop', 'concert', 'flashes', 'race', 'chest', 'levelup', 'quest', 'route', 'gust']);

export const PACK = {
    id: 'places',
    label: '地点与场景',
    when: '剧情里出现电梯、门缝偷听、演唱会、竞技、冒险等场面时才用（人物摔倒或撞到人时无需本包，可在该页另写 [igs-fx:cam|倾斜] 配合正文）',
    era: null,
    defaultOn: true,
    eraKinds: { elevator: 'modern', concert: 'modern', flashes: 'modern', race: 'modern' },
    kinds: KINDS,
    labels: {
        elevator: '电梯', eavesdrop: '门缝偷听', concert: '演唱会', flashes: '记者闪光灯', race: '赛场哨声与记分',
        chest: '开宝箱', levelup: '升级弹窗', quest: '委托板', route: '地图路线', gust: '大风吹拂',
    },
    triggers: {
        elevator: ['电梯', '楼层', '电梯门'],
        eavesdrop: ['偷听', '门缝', '隔着墙', '贴着门'],
        concert: ['演唱会', '荧光棒', '聚光灯', '安可'],
        flashes: ['闪光灯', '记者', '狗仔', '镁光灯'],
        race: ['起跑', '冲线', '记分牌', '哨声'],
        chest: ['宝箱', '开宝箱', '传说装备'],
        levelup: ['升级', '升到', '等级提升'],
        quest: ['委托', '任务板', '公会任务', '悬赏'],
        route: ['地图', '路线图', '行程', '路线'],
        gust: ['大风', '天台', '风吹', '风很大'],
    },
    promptLines: {
        elevator: '[igs-fx:elevator|目标楼层]：乘电梯抵达某一层时写，楼层写数字，地下层写 B2，楼层数字滚动后门开并叮一声',
        eavesdrop: '[igs-fx:eavesdrop|听到的话]：躲在门外或隔墙偷听时写，画面收成一道门缝，环境音与语气音同时变闷；听到的话可省略，写一小句',
        concert: '[igs-fx:concert|歌名]：演唱会或舞台演出的高潮时写，聚光灯扫动、台下荧光棒摇晃；歌名可省略',
        flashes: '[igs-fx:flashes|次数]：被记者或粉丝围拍、闪光灯连闪时写，次数 3–9，可省略',
        race: '[igs-fx:race|起跑/冲线/记分|字段1|字段2]：赛场三个时点，起跑第 2 段可写项目名；冲线第 2 段写第一名、第 3 段写成绩；记分第 2、3 段各写一方的名称与分数，如 红队 3、蓝队 2',
        chest: '[igs-fx:chest|物品名|普通/稀有/史诗/传说]：打开宝箱得到物品时写，品级决定光色，品级可省略',
        levelup: '[igs-fx:levelup|等级|奖励]：角色升级或境界提升时写，等级写数字，奖励写一小句，可省略',
        quest: '[igs-fx:quest|委托内容|报酬|接取/完成/失败]：公会委托、悬赏榜上的任务接取、完成或失败时写，报酬与状态可省略',
        route: '[igs-fx:route|起点|途经|终点]：用地图展示行进路线时写，至少两个地名，最多六个，地名之间也可用 > 连接',
        gust: '[igs-fx:gust]：天台、高处、旷野风很大时写，立绘随风轻摆并掠过风线，不带字段',
    },
    parse: parsePlacesFx,
    of: placesFxOf,
    builders: PLACES_BUILDERS,
    sfx: PLACES_SFX_DEFS,
    cssText: PLACES_STYLE_TEXT,
    ambience: {
        html: PLACES_AMBIENCE_HTML,
        still: PLACE_STILL,
        resolve: (location, { worldview = '' } = {}) => resolvePlaceKind(location, worldview),
    },
    ambient: {
        kinds: PLACES_AMBIENT_KINDS,
        labels: PLACES_AMBIENT_LABELS,
        voices: createPlacesVoices,
        plan: placesAmbientPlan,
    },
};
