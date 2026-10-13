// 物品与出示证据共用的小弹窗结构；不负责播放、背包或世界观换皮。
import { RECORD_ICONS, inventoryIconKey } from './record-icons.js';

const SAFE_IMAGE_RE = /^(?:data:image\/(?:png|jpeg|webp|gif);base64,|blob:)/i;
export const PLACEHOLDER_SVG = '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="7" width="16" height="13" rx="2"/><path d="M9 7V5a3 3 0 0 1 6 0v2M12 11v5M9.5 13.5h5"/></svg>';

export function safeItemImageUrl(url) {
    const value = String(url || '');
    return SAFE_IMAGE_RE.test(value) ? value : '';
}

// 没有生成图时按物品名配背包同款图标（钥匙、信、药水……）。
export function itemPlaceholderSvg(name) {
    return RECORD_ICONS[inventoryIconKey(name)] || PLACEHOLDER_SVG;
}

export function buildItemCardIcon(doc, card) {
    const icon = doc.createElement('div');
    icon.className = 'igs-fx-item-icon';
    icon.setAttribute('data-igs-item-name', card.name);
    const url = safeItemImageUrl(card.imageUrl);
    if (url) {
        const image = doc.createElement('img');
        image.setAttribute('src', url);
        image.setAttribute('alt', card.name);
        image.setAttribute('decoding', 'async');
        icon.appendChild(image);
    } else {
        icon.innerHTML = itemPlaceholderSvg(card.name);
        icon.setAttribute('data-igs-item-placeholder', '1');
    }
    return icon;
}

export function buildItemCard(doc, card, { iconFactory = buildItemCardIcon, sealFactory = null } = {}) {
    const node = doc.createElement('div');
    node.className = 'igs-fx-item-card';
    node.setAttribute('data-igs-item-action', card.action);
    node.setAttribute('data-igs-item-name', card.name);
    if (card.rare) node.setAttribute('data-igs-item-rare', '1');
    if (card.expanded) node.setAttribute('data-igs-item-expanded', '1');
    const body = doc.createElement('div');
    body.className = 'igs-fx-item-text';
    const action = doc.createElement('span');
    action.className = 'igs-fx-item-action';
    action.textContent = card.actionLabel;
    body.appendChild(action);
    const name = doc.createElement('span');
    name.className = 'igs-fx-item-name';
    name.textContent = card.name;
    body.appendChild(name);
    if (card.description) {
        const desc = doc.createElement('span');
        desc.className = 'igs-fx-item-desc';
        desc.textContent = card.description;
        body.appendChild(desc);
        node.setAttribute('title', card.description);
    }
    node.appendChild(iconFactory(doc, card));
    node.appendChild(body);
    if (sealFactory) node.appendChild(sealFactory(doc, card));
    return node;
}
