// 题材包清单：人生大事与节日。字段说明见 docs/FX_PACK_CONTRACT.md；本文件只导出 PACK，由 scene/fx-packs.js 汇总。
import { FESTIVAL_BUILDERS } from './fx-festival-build.js';
import { FESTIVAL_SFX_DEFS, FESTIVAL_COUNT_MAX, FESTIVAL_COUNT_MIN } from './fx-festival-sfx.js';
import { FESTIVAL_STYLE_TEXT } from './fx-festival-style.js';

const KINDS = Object.freeze(['birthday', 'countdown', 'xmas', 'redpacket', 'ring', 'wedding', 'test', 'riverlamp']);
const AMOUNT_RE = /^[¥￥]?\s*\d[\d,]*(?:\.\d+)?\s*(?:元|块|两|万)?$/;
const POS_RE = /阳|两道|二道|怀孕|有了|有喜|positive/i;
const NEG_RE = /阴|一道|没有|没怀|未怀|negative/i;
const CN_RE = /中式|拜堂|chinese|红盖头|合卺/i;
const WEST_RE = /西式|教堂|western|white|白纱/i;

const clip = (value, max) => String(value || '').trim().slice(0, max);

function parse(type, f) {
    const a = clip(f[0], 24);
    const b = clip(f[1], 24);
    switch (type) {
    case 'birthday': {
        const digits = (b || a).match(/^\d{1,3}/);
        const age = digits ? Number(digits[0]) : 0;
        const name = /^\d+$/.test(a) ? '' : a.slice(0, 12);
        return ['birthday', name, age >= 1 && age <= 120 ? String(age) : ''];
    }
    case 'countdown': {
        const n = Number.parseInt(a, 10);
        const count = Number.isFinite(n) ? Math.min(FESTIVAL_COUNT_MAX, Math.max(FESTIVAL_COUNT_MIN, n)) : 5;
        const label = Number.isFinite(n) ? b : a;
        return ['countdown', String(count), label.slice(0, 12)];
    }
    case 'xmas': return ['xmas', a];
    case 'redpacket': {
        if (a && AMOUNT_RE.test(a)) return ['redpacket', 'amount', a, b];
        return a ? ['redpacket', 'gift', a, b] : ['redpacket', 'amount', '', b];
    }
    case 'ring': return ['ring', a];
    case 'wedding': {
        const style = CN_RE.test(a) ? 'cn' : WEST_RE.test(a) ? 'west' : '';
        const text = style ? b : (a || b);
        return ['wedding', style, text.slice(0, 14)];
    }
    case 'test': {
        if (NEG_RE.test(a)) return ['test', 'neg'];
        return POS_RE.test(a) ? ['test', 'pos'] : null;
    }
    case 'riverlamp': return ['riverlamp', a];
    default: return null;
    }
}

function of(args) {
    const [type, x, y, z] = args;
    switch (type) {
    case 'birthday': return { type, name: x, age: y };
    case 'countdown': return { type, count: x, label: y };
    case 'xmas': return { type, text: x };
    case 'redpacket': return x === 'gift' ? { type, gift: y, wish: z } : { type, amount: y, wish: z };
    case 'ring': return { type, text: x };
    case 'wedding': return { type, style: x, text: y };
    case 'test': return { type, result: x };
    case 'riverlamp': return { type, text: x };
    default: return null;
    }
}

export const PACK = {
    id: 'festival',
    label: '人生大事与节日',
    era: null,
    eraKinds: { birthday: 'modern', xmas: 'modern', riverlamp: 'ancient' },
    kinds: KINDS,
    labels: {
        birthday: '生日蛋糕', countdown: '新年倒数', xmas: '圣诞点灯', redpacket: '红包与礼物',
        ring: '求婚戒指', wedding: '婚礼', test: '验孕棒', riverlamp: '花灯河灯',
    },
    triggers: {
        birthday: ['生日', '蛋糕', '吹蜡烛'],
        countdown: ['倒数', '跨年', '除夕'],
        xmas: ['圣诞', '平安夜'],
        redpacket: ['红包', '压岁钱', '情人节'],
        ring: ['求婚', '戒指'],
        wedding: ['婚礼', '拜堂', '新娘'],
        test: ['验孕', '怀孕'],
        riverlamp: ['河灯', '花灯', '放灯'],
    },
    promptLines: {
        birthday: '[igs-fx:birthday|名字|岁数]：有人过生日、对着蛋糕许愿吹蜡烛时写；名字与岁数都可省，岁数在 1 至 7 时按支数点蜡烛。',
        countdown: '[igs-fx:countdown|数字|标题]：跨年或除夕倒数时写，数字 3 至 10 为倒数秒数，标题可省；数到零自动放烟花，古代背景换成爆竹与春联。',
        xmas: '[igs-fx:xmas|祝词]：圣诞夜点亮彩灯、飘雪的场面写；祝词可省。',
        redpacket: '[igs-fx:redpacket|金额或礼物名|祝福]：收到红包、压岁钱或情人节礼物时写；第一栏是纯数字金额则红包里的数字滚动，是文字则按礼物盒呈现；祝福可省。',
        ring: '[igs-fx:ring|描述]：求婚、递上戒指盒的一刻写；描述可省。',
        wedding: '[igs-fx:wedding|西式或中式|誓词]：婚礼现场写；西式是花瓣与钟声，中式是红盖头与合卺酒，不写则按世界观选；誓词可省。',
        test: '[igs-fx:test|阳性或阴性]：验孕棒出结果时写，只在结果明确时用。',
        riverlamp: '[igs-fx:riverlamp|心愿]：古代背景里在河边放花灯、河灯许愿时写；心愿可省。',
    },
    parse,
    of,
    builders: FESTIVAL_BUILDERS,
    sfx: FESTIVAL_SFX_DEFS,
    cssText: FESTIVAL_STYLE_TEXT,
};
