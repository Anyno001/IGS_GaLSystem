import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

// 动作先更新目标页码，画面可能稍后合并渲染；同时适用于 host 和 bootstrap API。
export async function waitForReaderPage(reader) {
    const current = () => {
        const state = reader.getState();
        return (state.igsUi || state).activeReader;
    };
    const expected = current()?.index;
    assert.ok(Number.isInteger(expected), '等待翻页前阅读器必须处于打开状态');
    const deadline = performance.now() + 2000;
    let rendered;
    do {
        rendered = current()?.snapshot?.content?.currentIndex;
        if (rendered === expected) return;
        await delay(10);
    } while (performance.now() < deadline);
    assert.equal(rendered, expected, '阅读器应在有界时间内完成目标页渲染');
}
