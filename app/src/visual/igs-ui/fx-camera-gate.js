import { enabledPackIds, normalizeDailyFxSettings } from './fx-daily-model.js';

const PACK_ID = 'camera';
// 圈入圈出、百叶窗是老式幻灯片转场：标签仍认，回落到更克制的淡入与黑场。
const RETIRED_CUTS = Object.freeze({ iris: 'fade', blinds: 'black' });

export function cameraPackOn(readerSettings) {
    return enabledPackIds(readerSettings).includes(PACK_ID);
}

function itemsOf(fx, readerSettings, types) {
    if (!fx || !Array.isArray(fx.daily) || !cameraPackOn(readerSettings)) return [];
    const daily = normalizeDailyFxSettings(readerSettings && readerSettings.dailyFx);
    return fx.daily.filter((item) => item && types.includes(item.type) && daily[item.type] === true);
}

export function cutStyleOf(fx, readerSettings) {
    const hit = itemsOf(fx, readerSettings, ['cut'])[0];
    const style = hit && hit.style ? hit.style : '';
    return RETIRED_CUTS[style] || style;
}

const IMPLIED = Object.freeze({
    establish: () => ({ shot: 'empty', target: '' }),
    walk: (item) => (item.mode === 'side' ? { shot: 'track', target: 'right', mod: 'slow' } : { shot: 'track', target: 'right', mod: 'hand' }),
    chase: (item) => (item.result === 'caught' ? { shot: 'vertigo', target: 'near' } : { shot: 'track', target: 'right', mod: 'hand' }),
    sneak: () => ({ shot: 'focus', target: 'front' }),
    seeoff: () => ({ shot: 'vertigo', target: 'far' }),
    enterroom: () => ({ shot: 'focus', target: 'front', mod: 'hand' }),
});

export function impliedCam(fx, readerSettings) {
    const hit = itemsOf(fx, readerSettings, Object.keys(IMPLIED))[0];
    return hit ? IMPLIED[hit.type](hit) : null;
}

export function audioCuesOf(fx, readerSettings) {
    const items = itemsOf(fx, readerSettings, ['jcut', 'lcut']);
    const lead = items.find((item) => item.type === 'jcut' && item.place);
    return { leadLocation: lead ? lead.place : '', lcut: items.some((item) => item.type === 'lcut') };
}
