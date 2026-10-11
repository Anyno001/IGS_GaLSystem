const OPEN_DIRECTIVE = /\[igs-(?:scene|char|thought|img|fx)[^\]\n]*$/im;
const IMG_MARKER = /(?:\[igs-img:\s*\d+\s*\]|<IMG>\s*\d+\s*<\/IMG>)/i;

const countOf = (text, pattern) => (text.match(pattern) || []).length;

export function hasUnclosedAssetTag(text) {
    const source = String(text || '');
    if (!source) return false;
    if (OPEN_DIRECTIVE.test(source)) return true;
    if (countOf(source, /<bbi_image>/gi) > countOf(source, /<\/bbi_image>/gi)) return true;
    if (countOf(source, /<image\b[^>]*>/gi) > countOf(source, /<\/image>/gi)) return true;
    return /image###/i.test(source.replace(/image###[\s\S]*?###/gi, ''));
}

export function detectMissedAssets(input = {}) {
    const none = { missed: false, reason: '' };
    if (!input.enabled || input.busy) return none;
    const text = String(input.text || '');
    if (!text.trim()) return none;
    if (input.isLatest !== false && hasUnclosedAssetTag(text)) return { missed: true, reason: 'open-tag' };
    const expected = Number(input.expected) || 0;
    const bound = Number(input.bound) || 0;
    if (IMG_MARKER.test(text) && expected > bound) return { missed: true, reason: 'unbound-marker' };
    return none;
}

export const MISSED_HINT_TEXT = '本楼有素材没生成，点此补发';

export function createMissedHint(options = {}) {
    const handled = new Set();
    let busy = false;

    function element(create) {
        const dialog = typeof options.getDialog === 'function' ? options.getDialog() : null;
        if (!dialog || typeof dialog.querySelector !== 'function') return null;
        let el = dialog.querySelector('#igs-missed-hint');
        if (!el && create && dialog.ownerDocument) {
            el = dialog.ownerDocument.createElement('button');
            el.id = 'igs-missed-hint';
            el.setAttribute('type', 'button');
            el.textContent = MISSED_HINT_TEXT;
            el.addEventListener('click', async (event) => {
                if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
                const key = el.getAttribute('data-key') || '';
                if (busy || !key) return;
                busy = true;
                handled.add(key);
                el.setAttribute('hidden', '');
                try {
                    if (typeof options.onRetry === 'function') await options.onRetry();
                } finally {
                    busy = false;
                }
            });
            dialog.appendChild(el);
        }
        return el;
    }

    return {
        sync(detection, key) {
            const show = Boolean(detection && detection.missed) && !busy && !handled.has(key);
            const el = element(show);
            if (!el) return show;
            if (show) {
                el.setAttribute('data-key', key);
                el.removeAttribute('hidden');
            } else {
                el.setAttribute('hidden', '');
            }
            return show;
        },
        isHandled: (key) => handled.has(key),
    };
}
