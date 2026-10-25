// Only the ancient performance card's own text regions scroll. Events must not
// reach reader page-turn handlers; all listeners live on the disposable node.
export function prepareAncientPanel(node) {
    if (!node || typeof node.querySelectorAll !== 'function') return node;
    for (const row of node.querySelectorAll('.igs-panel-row')) {
        const value = row.querySelector?.('.igs-panel-v');
        if (Array.from(value?.textContent || '').length > 32) {
            if (row.classList) row.classList.add('is-long-content');
            else row.className = `${row.className || ''} is-long-content`.trim();
        }
    }
    for (const region of node.querySelectorAll('.igs-panel-title,.igs-panel-rows,.igs-bt-count-label,.igs-pl-q-title,.igs-pl-q-reward')) {
        if (region.classList) region.classList.add('igs-ancient-panel-scroll');
        else region.className = `${region.className || ''} igs-ancient-panel-scroll`.trim();
        region.setAttribute('tabindex', '0');
        region.setAttribute('role', 'region');
        region.setAttribute('aria-label', '面板内容，可滚动阅读');
        for (const type of ['click', 'pointerdown', 'wheel']) region.addEventListener?.(type, (event) => event.stopPropagation());
        region.addEventListener?.('keydown', (event) => {
            if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) return;
            event.preventDefault(); event.stopPropagation();
            const step = Math.max(36, (region.clientHeight || 100) * .75);
            if (event.key === 'Home') region.scrollTop = 0;
            else if (event.key === 'End') region.scrollTop = region.scrollHeight;
            else region.scrollTop += ['ArrowUp', 'ArrowLeft', 'PageUp'].includes(event.key) ? -step : step;
        });
    }
    return node;
}
