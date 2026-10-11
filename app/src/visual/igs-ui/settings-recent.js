// 「最近改过」：用户在设置器里改了某一项时才记一笔（path / 标签 / 所在页面），存 localStorage，最多 5 条。
// 只在事件发生时读写，没有常驻开销；存储不可用时静默跳过。
export const SETTINGS_RECENT_KEY = 'igs:settings-recent:v1';
export const SETTINGS_RECENT_MAX = 5;

function cleanEntry(item) {
    if (!item || typeof item !== 'object') return null;
    const path = typeof item.path === 'string' ? item.path.trim() : '';
    const label = typeof item.label === 'string' ? item.label.trim().slice(0, 40) : '';
    const page = typeof item.page === 'string' ? item.page.trim() : '';
    return path && label && page ? { path, label, page } : null;
}

export function loadSettingsRecent(storage) {
    try {
        const raw = storage && typeof storage.getItem === 'function' ? storage.getItem(SETTINGS_RECENT_KEY) : null;
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list.map(cleanEntry).filter(Boolean).slice(0, SETTINGS_RECENT_MAX) : [];
    } catch {
        return [];
    }
}

// 按 path 去重，最新在前。返回新列表；没有变化（最新一条本来就是它）时不写存储。
export function recordSettingsRecent(storage, entry) {
    const next = cleanEntry(entry);
    if (!next) return null;
    const list = loadSettingsRecent(storage);
    if (list[0] && list[0].path === next.path && list[0].label === next.label && list[0].page === next.page) return list;
    const merged = [next].concat(list.filter((item) => item.path !== next.path)).slice(0, SETTINGS_RECENT_MAX);
    try {
        if (storage && typeof storage.setItem === 'function') storage.setItem(SETTINGS_RECENT_KEY, JSON.stringify(merged));
    } catch { /* 存储满或被禁用时不影响设置本身 */ }
    return merged;
}

const text = (node) => String((node && node.textContent) || '').replace(/\s+/g, ' ').trim();

// 从触发元素就近取标签：字段的 span、开关自己的主文字、分段控件所在字段的标题。
export function settingsRecentLabel(target) {
    if (!target) return '';
    const cls = (node) => String((node && node.className) || '');
    let label = '';
    if (/\bigs-switch\b/.test(cls(target))) {
        const span = typeof target.querySelector === 'function' ? target.querySelector('span') : null;
        const small = span && typeof span.querySelector === 'function' ? span.querySelector('small') : null;
        label = text(span).replace(text(small), '').trim();
    }
    if (!label && typeof target.closest === 'function') {
        const field = target.closest('.igs-settings-field');
        const span = field && typeof field.querySelector === 'function' ? field.querySelector('span') : null;
        label = text(span);
    }
    return label.slice(0, 24);
}
