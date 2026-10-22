import { subscribeRecoveries } from '../../storage/automatic-recovery.js';
import { getSettingsThemePalette } from './settings-theme.js';

// 常驻小提示沿用设置配色；有可操作的条件等待才显示设置入口。
export function createRecoveryNotice({ global = globalThis, getDocument = () => global.document,
    getTheme = () => '', openSettings } = {}) {
    const sources = [...new Set([global, globalThis])];
    const states = new Map();
    let root, style;
    const detach = () => {
        root?.parentNode?.removeChild(root);
        root = null;
    };
    function render() {
        const entries = [...states.values()].flat();
        if (!entries.length) { detach(); return; }
        const doc = getDocument();
        const parent = doc?.fullscreenElement || doc?.webkitFullscreenElement || doc?.body || doc?.documentElement;
        if (!parent || !doc.createElement) return;
        if (!style) {
            style = doc.createElement('style');
            style.textContent = `.igs-recovery-notice{position:fixed;z-index:2147483500;right:max(16px,env(safe-area-inset-right));bottom:calc(16px + env(safe-area-inset-bottom));width:min(360px,calc(100vw - 32px));max-height:35vh;overflow:auto;box-sizing:border-box;border-radius:10px;padding:10px 12px;font:13px/1.5 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;box-shadow:0 4px 18px #0003;pointer-events:auto}.igs-recovery-row+.igs-recovery-row{border-top:1px solid #8884;margin-top:8px;padding-top:8px}.igs-recovery-message{white-space:pre-line;overflow-wrap:anywhere}.igs-recovery-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}.igs-recovery-actions button{font:inherit;color:inherit;border:1px solid #8886;border-radius:6px;background:transparent;padding:4px 10px;cursor:pointer;min-height:30px}`;
            (doc.head || parent).appendChild(style);
        }
        if (!root) {
            root = doc.createElement('div');
            root.className = 'igs-recovery-notice';
            root.setAttribute('role', 'status');
            root.setAttribute('aria-live', 'polite');
        }
        const { tokens } = getSettingsThemePalette(getTheme());
        if (root.style) { root.style.background = tokens.panel; root.style.color = tokens.ink; }
        root.textContent = '';
        for (const entry of entries) {
            const row = doc.createElement('div');
            row.className = 'igs-recovery-row';
            const text = doc.createElement('div');
            text.className = 'igs-recovery-message';
            text.textContent = `${entry.phase === 'failed' ? '操作未完成：' : ''}${entry.message}`;
            row.appendChild(text);
            const actions = doc.createElement('div');
            actions.className = 'igs-recovery-actions';
            const button = (label, run) => {
                const el = doc.createElement('button');
                el.type = 'button'; el.textContent = label;
                el.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); run(); });
                actions.appendChild(el);
            };
            if (entry.page) button(entry.actionLabel || '打开设置', () => openSettings?.({ page: entry.page }));
            if (entry.phase === 'failed') button('收起', entry.dismiss);
            if (actions.children.length) row.appendChild(actions);
            root.appendChild(row);
        }
        if (root.parentNode !== parent) parent.appendChild(root);
    }
    const offs = sources.map(source => subscribeRecoveries(source, entries => { states.set(source, entries); render(); }));
    const fullscreen = () => render();
    const doc = getDocument();
    doc?.addEventListener?.('fullscreenchange', fullscreen);
    return {
        remount: render,
        dispose() {
            offs.forEach(off => off()); detach();
            style?.parentNode?.removeChild(style);
            doc?.removeEventListener?.('fullscreenchange', fullscreen);
        },
    };
}
