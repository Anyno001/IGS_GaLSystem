import { createAssetGenerationService, createMemoryAssetThumbStore } from './helpers/media-fixtures.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalImageCache } from '../src/media/tavern-image-cache.js';



function setup() {
    const records = new Map([['a', { id: 'a', type: 'sprite', dataUrl: 'data:image/png;base64,QUJDREVGR0g=', revision: 1 }]]);
    const store = {
        reads: 0,
        async getImage(id) { this.reads += 1; return records.get(id) || null; },
        async putImage(record) { records.set(record.id, record); },
        async deleteImage(id) { records.delete(id); },
    };
    const made = [];
    let blobs = 0;
    const mediaCache = createLocalImageCache({ URL: { createObjectURL: () => `blob:thumb-${++blobs}`, revokeObjectURL() {} }, Blob, atob, btoa });
    const thumbStore = createMemoryAssetThumbStore({ mediaCache });
    const events = { list: [], emit(type, detail) { this.list.push(detail); } };
    const service = createAssetGenerationService({
        messageHost: { getChatId: () => '' },
        store,
        events,
        thumbStore,
        mediaCache,
        makeThumb: async (src) => { made.push(src); return 'data:image/webp;base64,U01BTEw='; },
    });
    return { service, store, thumbStore, made, events };
}
const settle = () => new Promise((r) => setTimeout(r, 0));

test('asset-thumbs: 设置页缩略图是生成一次的小图，存起来，原图只读一次', async () => {
    const { service, store, thumbStore, made, events } = setup();
    assert.equal(service.resolveThumbUrl('igs-gen:a'), '', '第一次还没准备好');
    await settle(); await settle();
    const url = service.resolveThumbUrl('igs-gen:a');
    assert.equal(url, 'blob:thumb-1');
    assert.equal(made.length, 1);
    assert.equal(await thumbStore.get('a'), 'data:image/webp;base64,U01BTEw=', '小图存进小图库');
    assert.ok(events.list.some((e) => e.imageId === 'a' && e.reason === 'image-loaded'));
    assert.equal(service.thumbSourceId(url), 'a', '点小图看大图时能找回原图编号');
    assert.equal(store.reads, 1);

    // 新开一个服务（相当于刷新页面）：小图库里有，就不再读原图。
    const again = setup();
    await again.thumbStore.put('a', 'data:image/webp;base64,U01BTEw=');
    again.service.resolveThumbUrl('igs-gen:a');
    await settle(); await settle();
    assert.ok(again.service.resolveThumbUrl('igs-gen:a').startsWith('blob:'));
    assert.equal(again.store.reads, 0, '没读原图');
    assert.equal(again.made.length, 0);
});

test('asset-thumbs: 图被覆盖或删掉时旧小图作废', async () => {
    const { service, thumbStore } = setup();
    service.resolveThumbUrl('igs-gen:a');
    await settle(); await settle();
    await service.writeStoredImage({ id: 'a', type: 'sprite', dataUrl: 'data:image/png;base64,TkVX' });
    await settle();
    assert.equal(await thumbStore.get('a'), '', '导入覆盖后小图删掉，下次重新生成');
    assert.equal(service.resolveThumbUrl('igs-gen:a'), '', '内存里的旧小图也不用了');
    await settle(); await settle();
    await service.deleteImages(['a']);
    await settle();
    assert.equal(await thumbStore.get('a'), '');
});

test('gate: 图本体读空只读一次、只通知一次，舞台改落平和兜底', async () => {
    const { service, store, events } = setup();
    const { resolveSpriteAsset } = await import('../src/scene/asset-match.js');
    assert.equal(service.hasMissingImages(), false);
    assert.equal(service.resolveUrl('igs-gen:gone'), '');
    await settle(); await settle();
    assert.equal(events.list.filter((e) => e.imageId === 'gone' && e.reason === 'image-lost').length, 1);
    assert.equal(service.isMissingImage('igs-gen:gone'), true);
    assert.equal(service.isMissingImage('igs-gen:a'), false);
    const reads = store.reads;
    service.resolveUrl('igs-gen:gone');
    await settle(); await settle();
    assert.equal(store.reads, reads, '已知丢失不再重读');
    assert.equal(events.list.filter((e) => e.reason === 'image-lost').length, 1, '不再重复通知');
    const sceneAssets = { characters: { 小雪: { 开心: 'igs-gen:gone', 平和: 'igs-gen:a' } } };
    assert.equal(resolveSpriteAsset('小雪', '开心', { sceneAssets, isMissingImage: service.isMissingImage }).url, 'igs-gen:a');
    await service.writeStoredImage({ id: 'gone', type: 'sprite', dataUrl: 'data:image/png;base64,TkVX' });
    assert.equal(service.isMissingImage('igs-gen:gone'), false, '重新写入后解除丢失');
});

test('gate: 没有丢图时换衣服照常命中衣服槽', async () => {
    const { resolveSpriteAsset } = await import('../src/scene/asset-match.js');
    const moods = { 开心: 'igs-gen:a' };
    const sceneAssets = { characters: { 小雪: { 默认: 'igs-gen:b' } }, characterOutfits: { 小雪: { 校服: { moods } } } };
    const hit = resolveSpriteAsset('小雪', '开心', { sceneAssets, isMissingImage: () => false }, '校服');
    assert.equal(hit.url, 'igs-gen:a');
    assert.equal(hit.source, 'user-outfit');
});
