export function getRootDocument(globalObject) {
    const root = globalObject || globalThis.window || globalThis;
    try {
        if (root && root.document) return root.document;
    } catch (error) {
        return null;
    }
    return null;
}

export function getOwnerWindow(node) {
    if (node && node.ownerDocument && node.ownerDocument.defaultView) {
        return node.ownerDocument.defaultView;
    }
    const doc = getRootDocument(globalThis.window || globalThis);
    return doc && doc.defaultView ? doc.defaultView : null;
}

export function clearChildren(node) {
    if (!node) return;
    if (typeof node.replaceChildren === 'function') {
        node.replaceChildren();
    } else if (Array.isArray(node.children)) {
        for (const child of [...node.children]) {
            if (child && typeof child.remove === 'function') child.remove();
        }
        node.children = [];
    }
    if (Object.prototype.hasOwnProperty.call(node, 'innerHTML') || typeof node.innerHTML === 'string') {
        node.innerHTML = '';
    }
}

export function ensureStyleTag(doc, id, text) {
    if (!doc || !doc.head) return;
    let style = doc.getElementById(id);
    if (!style) {
        style = doc.createElement('style');
        style.id = id;
        doc.head.appendChild(style);
    }
    if (style.textContent !== text) style.textContent = text;
}

export function unmountNode(node) {
    if (node && node.remove) {
        node.remove();
    }
}

export function readElementWidth(element, fallback = 0) {
    return normalizeBoxMeasure(
        element && (element.clientWidth || element.offsetWidth || readNumericPixels(element.style && element.style.width)),
        fallback,
    );
}

export function readElementHeight(element, fallback = 0) {
    return normalizeBoxMeasure(
        element && (element.clientHeight || element.offsetHeight || readNumericPixels(element.style && element.style.height)),
        fallback,
    );
}

export function normalizeBoxMeasure(value, fallback = 0) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
    return Number(fallback) > 0 ? Number(fallback) : 0;
}

export function readNumericPixels(value) {
    if (value == null || value === '') return 0;
    const match = String(value).match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : 0;
}

export function ensureImageLoadingSpinner(container) {
    if (!container) return;
    if (container.querySelector('.igs-image-loading')) return;
    const wrapper = container.ownerDocument
        ? container.ownerDocument.createElement('div')
        : document.createElement('div');
    wrapper.className = 'igs-image-loading';
    wrapper.setAttribute('aria-label', '图片加载中');
    wrapper.innerHTML = '<span class="igs-spinner igs-image-spinner"></span>';
    container.appendChild(wrapper);
}

export function removeImageLoadingSpinner(container) {
    if (!container) return;
    const existing = container.querySelector('.igs-image-loading');
    if (existing) existing.remove();
}

export function ensureImageEmptyPlaceholder(container, text = '图片未生成', retry = null) {
    if (!container) return;
    removeImageLoadingSpinner(container);
    let wrapper = container.querySelector('.igs-image-empty');
    if (!wrapper) {
        wrapper = container.ownerDocument
            ? container.ownerDocument.createElement('div')
            : document.createElement('div');
        wrapper.className = 'igs-image-empty';
        container.appendChild(wrapper);
    }
    if (!retry) {
        wrapper.removeAttribute('data-retry');
        wrapper.removeAttribute('data-busy');
        wrapper.setAttribute('aria-label', text);
        wrapper.textContent = text;
        return;
    }
    const busy = retry.busy === true;
    const label = busy ? '正在重画…' : '点一下重画';
    const reason = busy ? '' : String(retry.reason || '').trim();
    const signature = `${label}|${reason}`;
    wrapper.setAttribute('data-retry', '1');
    if (busy) wrapper.setAttribute('data-busy', '1');
    else wrapper.removeAttribute('data-busy');
    wrapper.setAttribute('aria-label', busy ? label : `${text}，${label}`);
    if (wrapper.getAttribute('data-sig') === signature) return;
    wrapper.setAttribute('data-sig', signature);
    wrapper.textContent = '';
    const doc = wrapper.ownerDocument || document;
    const pill = doc.createElement('span');
    pill.className = 'igs-image-retry';
    pill.textContent = label;
    wrapper.appendChild(pill);
    if (reason) {
        const note = doc.createElement('span');
        note.className = 'igs-image-retry-reason';
        note.textContent = reason;
        wrapper.appendChild(note);
    }
}

export function isImageRetryTap(container, x, y) {
    const pill = container && container.querySelector ? container.querySelector('.igs-image-empty[data-retry] .igs-image-retry') : null;
    if (!pill || typeof pill.getBoundingClientRect !== 'function') return false;
    const holder = pill.parentNode;
    if (holder && holder.getAttribute && holder.getAttribute('data-busy')) return false;
    const rect = pill.getBoundingClientRect();
    const pad = 8;
    return x >= rect.left - pad && x <= rect.right + pad && y >= rect.top - pad && y <= rect.bottom + pad;
}

export function removeImageEmptyPlaceholder(container) {
    if (!container) return;
    const existing = container.querySelector('.igs-image-empty');
    if (existing) existing.remove();
}

export function attachSettingsViewportEvents(domState, root) {
    if (!domState || !root) return;
    detachSettingsViewportEvents(domState);
    domState.overlay = root;
    const win = getOwnerWindow(root);
    domState.viewportWindow = win;
    const schedule = () => {
        if (!domState.overlay) return;
        if (domState.viewportRaf !== null && domState.viewportRaf !== undefined) return;
        const raf = win && typeof win.requestAnimationFrame === 'function'
            ? win.requestAnimationFrame.bind(win)
            : null;
        if (!raf) {
            syncSettingsViewportVars(domState.overlay);
            return;
        }
        domState.viewportRaf = -1;
        const nextRaf = raf(() => {
            domState.viewportRaf = null;
            if (domState.overlay) syncSettingsViewportVars(domState.overlay);
        });
        if (domState.viewportRaf === -1) domState.viewportRaf = nextRaf;
    };
    domState.viewportHandler = schedule;
    syncSettingsViewportVars(root);
    if (win && typeof win.addEventListener === 'function') {
        win.addEventListener('resize', schedule, { passive: true });
        win.addEventListener('orientationchange', schedule, { passive: true });
    }
    if (win && win.visualViewport && typeof win.visualViewport.addEventListener === 'function') {
        win.visualViewport.addEventListener('resize', schedule, { passive: true });
        win.visualViewport.addEventListener('scroll', schedule, { passive: true });
    }
}

export function detachSettingsViewportEvents(domState) {
    if (!domState) return;
    const win = domState.viewportWindow;
    const handler = domState.viewportHandler;
    if (win && handler && typeof win.removeEventListener === 'function') {
        win.removeEventListener('resize', handler);
        win.removeEventListener('orientationchange', handler);
    }
    if (win && win.visualViewport && handler && typeof win.visualViewport.removeEventListener === 'function') {
        win.visualViewport.removeEventListener('resize', handler);
        win.visualViewport.removeEventListener('scroll', handler);
    }
    if (domState.viewportRaf !== null && domState.viewportRaf !== undefined) {
        const cancel = win && typeof win.cancelAnimationFrame === 'function'
            ? win.cancelAnimationFrame.bind(win)
            : null;
        if (cancel) cancel(domState.viewportRaf);
    }
    domState.viewportHandler = null;
    domState.viewportWindow = null;
    domState.viewportRaf = null;
}

export function syncSettingsViewportVars(root) {
    if (!root || !root.style) return;
    const doc = root.ownerDocument;
    const win = doc && doc.defaultView;
    const viewport = win && win.visualViewport;
    const docEl = doc && doc.documentElement ? doc.documentElement : {};
    const left = viewport && Number.isFinite(viewport.offsetLeft) ? viewport.offsetLeft : 0;
    const top = viewport && Number.isFinite(viewport.offsetTop) ? viewport.offsetTop : 0;
    const width = viewport && Number.isFinite(viewport.width) && viewport.width > 0
        ? viewport.width
        : (win && win.innerWidth) || docEl.clientWidth || 320;
    const height = viewport && Number.isFinite(viewport.height) && viewport.height > 0
        ? viewport.height
        : (win && win.innerHeight) || docEl.clientHeight || 480;
    root.style.setProperty('--igs-settings-vleft', `${Math.round(left)}px`);
    // iOS 软键盘收放时 offsetTop / height 是小数且变化慢一拍，外壳上下各多出 4px，露不出缝；多出的部分在屏幕外。
    const bleed = 4;
    root.style.setProperty('--igs-settings-vtop', `${Math.floor(top) - bleed}px`);
    root.style.setProperty('--igs-settings-vw', `${Math.ceil(width)}px`);
    root.style.setProperty('--igs-settings-vh', `${Math.ceil(height + top - Math.floor(top)) + bleed * 2}px`);
}

export function setImageRetryState(container, retry) {
    if (!container || !container.querySelector || !container.querySelector('.igs-image-empty[data-retry]')) return false;
    ensureImageEmptyPlaceholder(container, '图片未生成', retry);
    return true;
}
