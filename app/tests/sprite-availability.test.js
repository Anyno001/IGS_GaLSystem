import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalImageCache } from '../src/media/tavern-image-cache.js';
import { resolveSpriteAsset } from '../src/scene/asset-match.js';

test('gate:sprite-availability:byte-pressure-evicts-prefetch-before-current-page', async () => {
    const cache = createLocalImageCache({}, { maxCount: 5, memoryBytes: 180 });
    const release = cache.pin('current');
    try {
        cache.remember('current', 'x'.repeat(50));
        cache.remember('prefetch', 'y'.repeat(50));
        assert.equal(cache.peek('current'), 'x'.repeat(50));
        assert.equal(cache.peek('prefetch'), '');
        assert.ok((await cache.stats()).memoryBytes <= 180);
    } finally { release(); await cache.destroy(); }
});

test('gate:sprite-availability:original-and-library-keep-a-same-character-image-without-default', () => {
    const sceneAssets = {
        characters: { 白墨: { 平和: 'calm.png', 喜悦: 'joy.png' }, 小林: { 喜悦: 'lin.png' } },
        characterAliases: { 白墨: ['阿墨'] },
    };
    const calm = resolveSpriteAsset('阿墨', '迟疑', { sceneAssets });
    assert.equal(calm.url, 'calm.png');
    assert.equal(calm.slot, '平和');
    assert.equal(calm.character, '白墨');
    assert.equal(resolveSpriteAsset('小林', '愤怒', { sceneAssets }).url, 'lin.png');
    assert.equal(resolveSpriteAsset('白墨', '喜悦', { sceneAssets }).url, 'joy.png');
    assert.equal(resolveSpriteAsset('白墨', '愤怒', { sceneAssets: { characters: { 白墨: { 默认: 'base.png', 平和: 'calm.png' } } } }).url, 'base.png');
    const library = { characters: { 白墨: { 喜悦: 'igs-gen:joy' } } };
    assert.equal(resolveSpriteAsset('白墨', '迟疑', { generatedAssets: library }).url, 'igs-gen:joy');
    assert.equal(resolveSpriteAsset('陌生人', '迟疑', { sceneAssets }).url, '');
});

test('gate:sprite-availability:last-resort-skips-lost-images-and-keeps-outfit', () => {
    const isMissingImage = url => url === 'igs-gen:lost';
    const sceneAssets = { characters: { 白墨: { 默认: 'igs-gen:lost', 喜悦: 'joy.png' } } };
    const hit = resolveSpriteAsset('白墨', '迟疑', { sceneAssets, isMissingImage });
    assert.equal(hit.url, 'joy.png');
    assert.equal(hit.needsGeneration, true);
    sceneAssets.characterOutfits = { 白墨: { 裸体: { wardrobe: '裸体', base: 'igs-gen:lost', moods: { 平和: 'nude-calm.png' } } } };
    const nude = resolveSpriteAsset('白墨', '愤怒', { sceneAssets, isMissingImage }, '裸体');
    assert.equal(nude.url, 'nude-calm.png');
    assert.equal(nude.outfit, '裸体');
    const gone = resolveSpriteAsset('白墨', '迟疑', { sceneAssets: { characters: { 白墨: { 默认: 'igs-gen:lost' } } }, isMissingImage });
    assert.equal(gone.url, '');
    assert.equal(gone.needsGeneration, true);
});
