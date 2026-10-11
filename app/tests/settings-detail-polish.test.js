import test from 'node:test';
import assert from 'node:assert/strict';
import { getPageTemplate } from '../src/visual/igs-ui/settings-tabs.js';
import { SETTINGS_PAGES, pagesOfCategory, resolveSettingsPage } from '../src/visual/igs-ui/settings-pages.js';
import { renderMoodReviewList } from '../src/visual/igs-ui/settings-fields.js';
import { renderStageDirectionFields } from '../src/visual/igs-ui/stage-direction-fields.js';

test('gate:settings-polish:image-tab-has-cg-gallery-pane', () => {
    assert.deepEqual(pagesOfCategory('ai').map(([id]) => id), ['source', 'kinds', 'llm', 'rules', 'parse']);
    assert.ok(pagesOfCategory('scenes').some(([id]) => id === 'cglib'));
    const cg = getPageTemplate('cglib');
    assert.match(cg, /data-image-pane="cg"/);
    assert.match(cg, /\{\{imageCgList\}\}/);
    assert.match(cg, /data-action="image-cg-refresh"/);
    assert.match(cg, /data-action="image-cg-delete-selected"/);
    assert.match(cg, /data-action="image-cg-delete-all"/);
    assert.match(cg, /data-action="image-cache-clear"/);
    // 本地缓存张数与清缓存挪到「数据 › 备份」。
    assert.doesNotMatch(cg, /imageCacheCountField|purge-asset-cache/);
    assert.match(getPageTemplate('data'), /\{\{imageCacheCountField\}\}/);
    assert.match(getPageTemplate('data'), /data-action="purge-asset-cache"/);
    // 「分类」页把提示词并了进来：开关与模型由 slots 注入，模板只留说明和分区画师串面板。
    const auto = getPageTemplate('kinds');
    assert.match(auto, /data-image-pane="auto"/);
    assert.match(auto, /\{\{promptKindsPanel\}\}/);
    assert.doesNotMatch(auto, /open-cg-gallery/);
    // 旧的「提示词」「生图内容」「分类」子页都落到「画师与模型」。
    for (const sub of ['prompts', 'content', 'auto']) assert.equal(resolveSettingsPage({ tab: 'image', imageSubTab: sub }), 'kinds');
});

test('gate:settings-polish:mood-review-actions-sit-outside-chip', () => {
    const html = renderMoodReviewList([{ word: '嘲弄', character: '爱丽丝' }]);
    const chip = html.match(/<span class="igs-mood-review-chip">[\s\S]*?<\/span>/)[0];
    assert.doesNotMatch(chip, /<button/);
    assert.doesNotMatch(html, /爱丽丝/, '标签不带所属角色');
    assert.match(html, /<\/b><\/span><span class="igs-review-actions"><select class="igs-asset-move igs-review-select" data-mood-review-word="/);
    assert.match(html, /data-action="mood-review-dismiss:[^"]+"[^>]*>忽略<\/button>/);
    assert.doesNotMatch(html, /建为情绪组|mood-review-assign/);
    assert.doesNotMatch(html, />×</);
});

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

test('gate:settings-polish:daily-petals-share-the-kind-grid', () => {
    const reader = { dailyFx: { enabled: true, petals: true, photoAlbum: true } };
    const { daily } = renderStageDirectionFields(reader, (key, label, body) => body);
    const grid = daily.match(/<div class="igs-source-filter-grid">([\s\S]*?)<\/div>/)[1];
    assert.match(grid, /樱花、落叶飘落/);
    assert.match(grid, /拍照存入CG库/);
});


test('gate:settings-polish:asset-review-buttons-are-grouped-and-aligned', async () => {
    const { renderAssetReviewPanel, ASSET_REVIEW_STYLE_TEXT } = await import('../src/visual/igs-ui/asset-review-panel.js');
    const mk = () => ({
        children: [], attrs: {}, className: '', textContent: '',
        setAttribute(k, v) { this.attrs[k] = String(v); },
        getAttribute(k) { return this.attrs[k]; },
        removeAttribute(k) { delete this.attrs[k]; },
        addEventListener() {},
        appendChild(c) { this.children.push(c); return c; },
        append(...cs) { this.children.push(...cs); },
        removeChild(c) { this.children = this.children.filter((x) => x !== c); },
        get firstChild() { return this.children[0] || null; },
    });
    const container = mk();
    container.ownerDocument = { createElement: mk };
    renderAssetReviewPanel(container, [{ key: 'a', type: 'sprite', name: '爱丽丝', previewUrl: '' }]);
    const buttons = [];
    const walk = (el) => { if (el.attrs && el.attrs['data-asset-review-act']) buttons.push(el); (el.children || []).forEach(walk); };
    walk(container);
    assert.deepEqual(buttons.map((b) => b.attrs['data-asset-review-act']), ['library', 'library-dna', 'chat', 'discarded']);
    assert.deepEqual(buttons.map((b) => b.className), ['is-primary', 'is-primary', '', '']);
    assert.ok(ASSET_REVIEW_STYLE_TEXT.includes('.igs-asset-review-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))'));
    assert.ok(ASSET_REVIEW_STYLE_TEXT.includes('.igs-asset-review-actions button.is-primary{grid-column:1/-1'));
    // 仍保持无描边（v0.32.13），但有底色与键盘焦点外框。
    assert.ok(/\.igs-asset-review-actions button\{[^}]*border:0;[^}]*min-height:28px|\.igs-asset-review-actions button\{[^}]*min-height:28px[^}]*border:0;/.test(ASSET_REVIEW_STYLE_TEXT));
    assert.ok(ASSET_REVIEW_STYLE_TEXT.includes('.igs-asset-review-actions button:focus-visible{'));
});

test('gate:settings-polish:toast-follows-dialog-skin', async () => {
    const { getDialogSkinStyleText } = await import('../src/visual/igs-ui/dialog-skin-style.js');
    const base = { base: 'https://cdn.example/dist/skins/' };
    const pink = getDialogSkinStyleText('cute-pink', base);
    assert.ok(pink.includes('#igs-overlay[data-igs-dialog-skin="cute-pink"] #igs-toast{background:#fff;'));
    assert.ok(/#igs-toast\{[^}]*color:#6b4454;/.test(pink));
    assert.ok(getDialogSkinStyleText('gradient-veil', base).includes('#igs-overlay[data-igs-dialog-skin="gradient-veil"] #igs-toast{background:rgba(0,0,0,.62);'));
    assert.ok(getDialogSkinStyleText('elegant-european', base).includes('#igs-overlay[data-igs-dialog-skin="elegant-european"] #igs-toast{background:rgba(6,6,12,.82);'));
    // 只注入当前皮肤；无专属主题的默认皮肤仍走设置器配色兜底。
    assert.ok(!pink.includes('data-igs-dialog-skin="plant-coffee"] #igs-toast'));
    assert.ok(!getDialogSkinStyleText('default').includes('#igs-toast'));
});

// 子页标签栏随正文滚动：吸顶时半透明底会和下面的内容叠在一起（横屏矮屏尤其明显）；演出 5 个子页排一行，放不下就横向滚动。
test('gate:settings-polish:subtab-bars-scroll-with-content', async () => {
    const { getSettingsStyleText } = await import('../src/visual/igs-ui/settings-style.js');
    const css = getSettingsStyleText();
    const rule = css.match(/\.igs-page-tabs\{[^}]*\}/)[0];
    assert.doesNotMatch(rule, /position:sticky/);
    assert.match(rule, /display:grid/);
    assert.match(rule, /grid-auto-flow:column/);
    assert.match(rule, /grid-auto-columns:1fr/);
    assert.match(rule, /overflow-x:auto/);
    assert.doesNotMatch(rule, /flex-wrap:wrap|grid-template-columns/);
    assert.equal(pagesOfCategory('perf').length, 5);
    assert.ok(SETTINGS_PAGES.every(([id, label, category]) => id && label && category));
    // 仍吸顶的批量选择栏要垫不透明底色，内容滚过去时不透出来；高亮色叠在伪元素上（设置器不用渐变）。
    assert.match(css, /\.igs-asset-select-bar\{[^}]*position:sticky[^}]*background:var\(--igs-settings-panel\)/);
    assert.match(css, /\.igs-asset-select-bar::before\{[^}]*z-index:-1;[^}]*background:var\(--igs-settings-highlight\)/);
});

// 「高级」折叠区自带底色框，不能再叠上 .igs-settings-sub 的左竖线、左外边距和 flex 间距。
test('gate:settings-polish:advanced-details-drop-sub-border', async () => {
    const { getSettingsStyleText } = await import('../src/visual/igs-ui/settings-style.js');
    const css = getSettingsStyleText();
    assert.ok(css.includes('details.igs-settings-advanced{display:block;margin-top:4px;margin-left:0;padding:0;border-left:0;'));
    assert.ok(css.includes('details.igs-settings-advanced[open]>summary{margin-bottom:0}'));
    assert.match(getPageTemplate('source'), /<details class="igs-settings-sub igs-settings-advanced" data-advanced="nai"/);
});

// CG 库：「查看」行有倒序切换；翻页条和状态行在缩略图网格里独占一整行，不再被挤进一个格子竖排。
test('gate:settings-polish:cg-pane-order-toggle-and-full-width-pager', async () => {
    const { getSettingsStyleText } = await import('../src/visual/igs-ui/settings-style.js');
    const cg = getPageTemplate('cglib');
    assert.match(cg, /data-action="image-cg-order" type="button" aria-pressed="\{\{imageCgOldestFirst\}\}"[^>]*>\{\{imageCgOrderLabel\}\}<\/button>/);
    assert.ok(getSettingsStyleText().includes('.igs-image-cg-grid>:not(.igs-image-cg-tile){grid-column:1/-1}'));
});

test('gate:settings-polish:mood-review-rows-align-buttons', async () => {
    const mod = await import('../src/visual/igs-ui/settings-style.js');
    const css = Object.values(mod).filter((v) => typeof v === 'string').join('\n')
        || (typeof mod.getSettingsStyleText === 'function' ? mod.getSettingsStyleText() : '');
    assert.ok(css.includes('.igs-review-list{display:flex;flex-direction:column;'));
    assert.ok(css.includes('.igs-review-item{display:flex;flex-wrap:wrap;align-items:center;'));
    assert.ok(css.includes('.igs-review-actions{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;'));
    assert.ok(css.includes('.igs-review-actions .igs-review-link{min-width:52px;min-height:28px;'));
});
