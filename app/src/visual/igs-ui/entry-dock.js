// 前层入口坞：观众弹幕、社区回看、通知三个浮钮共用同一个定位容器，容器里 flex 纵向排列、间距固定，互相不会盖住。
// 容器只有一个锚点（左边距由 --igs-entry-left 给、顶边由 --igs-dock-top 给），入口自己不再各算各的 left / top。
// 顶边只在变化时写一次（随状态栏高度），没有轮询也没有逐帧计算。
const DOCK_CLASS = 'igs-entry-dock';
const tops = new WeakMap();

export function ensureEntryDock(front) {
    let dock = front.querySelector(`:scope > .${DOCK_CLASS}`);
    if (!dock) {
        dock = front.ownerDocument.createElement('div');
        dock.className = DOCK_CLASS;
        front.insertBefore(dock, front.firstChild);
    }
    return dock;
}

// 入口挂进坞里（已经在坞里就不动）。
export function mountEntry(front, entry) {
    const dock = ensureEntryDock(front);
    if (entry.parentNode !== dock) dock.appendChild(entry);
}

// 摘掉入口；坞里空了就一起拆掉，不留空节点。
export function unmountEntry(front, entry) {
    entry.remove();
    const dock = front && front.querySelector ? front.querySelector(`:scope > .${DOCK_CLASS}`) : null;
    if (dock && !dock.firstChild) dock.remove();
}

// 坞顶边（舞台像素）；没变化不写。
export function placeEntryDock(front, top) {
    const value = `${Math.round(top)}px`;
    if (tops.get(front) === value) return;
    tops.set(front, value);
    front.style.setProperty('--igs-dock-top', value);
}

// 左上原位：坞宽固定 38px（与状态栏折叠按钮同宽），入口按中线居中，小/大档入口也与折叠按钮同一条竖线。
// 全屏直播挪到名次卡上方时按右缘对齐计算 left，坞改回随内容宽、左对齐。
export const ENTRY_DOCK_CSS = `.${DOCK_CLASS}{position:absolute;z-index:1;left:var(--igs-entry-left,14px);top:var(--igs-dock-top,14px);width:38px;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;}
[data-entry-full]>.${DOCK_CLASS}{width:auto;align-items:flex-start;}
.${DOCK_CLASS}>*{position:relative;flex:none;}`;
