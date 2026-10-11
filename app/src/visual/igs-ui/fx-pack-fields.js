// 演出页「题材专属」里的「题材包」一节：数据驱动，读 scene/fx-packs.js 的元数据；每个有 kind 的包一行总开关，点 › 展开各 kind 勾选。
// 总开关关着时下面的勾选保留但不生效；包没有 kind（空壳）时整块不出现。
import { checkbox, rangeInput } from './settings-fields.js';
import { normalizeCameraSettings } from './fx-camera-model.js';
import { perfItem } from './fx-settings-fields.js';
import { DAILY_FX_LABELS, normalizeDailyFxSettings } from './fx-daily-model.js';
import { FX_PACKS_ACTIVE, packRequiresMet, packSwitchOn, packSwitchPath } from '../../scene/fx-packs.js';

const P = 'readerSettings';
const grid = (body) => `<div class="igs-source-filter-grid">${body}</div>`;

// 镜头空间、立绘变形、直白亲密、戏剧节拍、地点与场景属于通用演出，不按题材分：分别放进画面、立绘、亲密、剧情、舞台小节；其余包留在「题材包」小节。
export const GENERAL_PACK_IDS = Object.freeze(['camera', 'transform', 'nsfw', 'beats', 'places']);

// 题材包行的适用世界观标注：按清单的 era / eraKinds / worldviewOff 汇总，纯展示，不影响过滤（过滤仍由 fx-era 链执行）。
function packScopeNote(pack) {
    const eras = new Set();
    for (const kind of pack.kinds) eras.add(Object.hasOwn(pack.eraKinds, kind) ? pack.eraKinds[kind] : pack.era);
    const off = Object.keys(pack.worldviewOff).length ? `；${Object.keys(pack.worldviewOff).join('、')}部分不可用` : '';
    if ([...eras].every((era) => era === 'modern')) return `仅现代${off}`;
    if ([...eras].every((era) => era === 'ancient')) return `仅古代${off}`;
    if (eras.has('modern') || eras.has('ancient')) return `部分演出按时代过滤${off}`;
    return off ? `不限时代${off}` : '';
}

function packRow(pack, src, daily, more) {
    const on = packSwitchOn(pack, src);
    const blocked = pack.requires && !packRequiresMet(pack, src);
    const kinds = grid(pack.kinds.map((kind) => checkbox(`${P}.dailyFx.${kind}`, daily[kind], DAILY_FX_LABELS[kind])).join(''));
    const gate = blocked ? '需先开启亲密演出' : (daily.enabled ? '' : '需先开启日常演出');
    const scope = GENERAL_PACK_IDS.includes(pack.id) ? '' : packScopeNote(pack);
    const note = [gate, scope].filter(Boolean).join('；');
    return perfItem(more, `pack-${pack.id}`, checkbox(`${P}.${packSwitchPath(pack)}`, on, pack.label), { on, hint: note, detail: kinds });
}

// ids 给定时只出这些包的行（按 ids 顺序，未登记的跳过）；不给时出题材包，不含 GENERAL_PACK_IDS。
export function renderPackFields(reader, more, { ids = null } = {}) {
    if (!FX_PACKS_ACTIVE.length) return '';
    const src = reader && typeof reader === 'object' ? reader : {};
    const daily = normalizeDailyFxSettings(src.dailyFx);
    const packs = ids ? ids.map((id) => FX_PACKS_ACTIVE.find((pack) => pack.id === id)).filter(Boolean)
        : FX_PACKS_ACTIVE.filter((pack) => !GENERAL_PACK_IDS.includes(pack.id));
    return packs.map((pack) => packRow(pack, src, daily, more)).join('');
}

// 镜头空间包的脚步与心跳声，放在「声音」页。
export function renderPackSoundField(reader, more) {
    if (!FX_PACKS_ACTIVE.some((pack) => pack.id === 'camera')) return '';
    const camera = normalizeCameraSettings(reader && reader.cameraPackFx);
    return perfItem(more, 'pack-camera-sound', checkbox(`${P}.cameraPackFx.sound`, camera.sound, '脚步与心跳声'), { on: camera.sound, hint: '默认关，音量比环境音低', detail: rangeInput(`${P}.cameraPackFx.volume`, camera.volume, '脚步声音量') });
}

// 公告、榜单等演出面板是否跟随对话框皮肤，放在「画面」页。
export function renderPanelSkinField(reader, more) {
    if (!FX_PACKS_ACTIVE.length) return '';
    const daily = normalizeDailyFxSettings(reader && reader.dailyFx);
    return perfItem(more, 'pack-panel-skin', checkbox(`${P}.dailyFx.panelSkin`, daily.panelSkin, '面板卡片跟随对话框皮肤'), { hint: '公告、榜单等面板，默认按世界观换皮' });
}
