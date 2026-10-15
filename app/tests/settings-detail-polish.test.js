import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMoodReviewList } from '../src/visual/igs-ui/settings-fields.js';

test('gate:settings-polish:mood-ai-classify-entry-visible-when-empty-and-busy', () => {
    const empty = renderMoodReviewList([], []);
    assert.match(empty, /data-action="mood-review-ai-classify" disabled[^>]*>AI分类<\/button>/);
    assert.match(empty, /暂无待分类情绪词/);
    const pending = renderMoodReviewList([{ word: '迟疑' }], [{ label: '思考', words: [] }]);
    assert.match(pending, /data-action="mood-review-ai-classify">AI分类<\/button>/);
    assert.doesNotMatch(pending, /data-action="mood-review-ai-classify" disabled/);
    const busy = renderMoodReviewList([{ word: '迟疑' }], [{ label: '思考', words: [] }], { busy: true });
    assert.match(busy, /data-action="mood-review-ai-classify" disabled aria-busy="true">分类中…<\/button>/);
    const emptyBusy = renderMoodReviewList([], [], { busy: true });
    assert.match(emptyBusy, /data-action="mood-review-ai-classify" disabled aria-busy="true" title="暂无待分类情绪词">分类中…<\/button>/);
});

test('gate:assets:review-rename-draft-survives-refresh-and-commit-uses-edited-name', async () => {
    const { renderAssetReviewPanel } = await import('../src/visual/igs-ui/asset-review-panel.js');
    const doc = { createElement(tag) {
        return {
            tagName: tag.toUpperCase(), ownerDocument: doc, children: [], attrs: {}, listeners: {}, value: '',
            setAttribute(key, value) { this.attrs[key] = String(value); },
            getAttribute(key) { return this.attrs[key] || null; },
            removeAttribute(key) { delete this.attrs[key]; },
            addEventListener(type, handler) { this.listeners[type] = handler; },
            appendChild(child) { this.children.push(child); return child; },
            append(...children) { this.children.push(...children); },
            removeChild(child) { this.children.splice(this.children.indexOf(child), 1); },
            get firstChild() { return this.children[0] || null; },
            querySelectorAll(tag) {
                const out = [];
                const visit = (node) => {
                    for (const child of node.children) {
                        if (child.tagName === tag.toUpperCase()) out.push(child);
                        visit(child);
                    }
                };
                visit(this);
                return out;
            },
        };
    } };
    const container = doc.createElement('div');
    const record = { key: 'chat:floor:sprite', type: 'sprite', name: '原名', previewUrl: '' };
    const saved = [];
    const render = (items) => renderAssetReviewPanel(container, items, { onResolve: (_, status, name) => saved.push([status, name]) });
    render([record]);
    container.querySelectorAll('input')[0].value = '新名字';
    render([record]);
    assert.equal(container.querySelectorAll('input')[0].value, '新名字');
    container.querySelectorAll('button')[0].listeners.click({ stopPropagation() {} });
    assert.deepEqual(saved, [['library', '新名字']]);
    render([]);
    assert.equal(container.querySelectorAll('input').length, 0);
    assert.ok(Object.hasOwn(container.attrs, 'hidden'), 'empty review is hidden');
});
