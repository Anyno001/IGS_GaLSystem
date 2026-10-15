import test from 'node:test';
import assert from 'node:assert/strict';
import { lookupSceneBackground } from '../src/scene/scene-directives.js';
import { resolveSceneGradePlan } from '../src/visual/igs-ui/scene-grade.js';

test('scene-timed-asset:time-variant-hit-marks-background-timed', () => {
    const assets = { scenes: { '教室': { url: 'day.png', times: { '夜晚': 'night.png' } } } };
    const night = lookupSceneBackground({ scene: '教室', time: '夜晚' }, assets);
    assert.equal(night.url, 'night.png');
    assert.equal(night.timed, true);
    const plain = lookupSceneBackground({ scene: '教室' }, assets);
    assert.equal(plain.url, 'day.png');
    assert.equal(plain.timed, false);
    // 没有时段变体的普通素材：仍要叠时段调色。
    const flat = lookupSceneBackground({ scene: '走廊', time: '夜晚' }, { scenes: { '走廊': 'hall.png' } });
    assert.equal(flat.url, 'hall.png');
    assert.equal(flat.timed, false);
    // 内置示例图按时段替换文件名，同样视为自带时段光照。
    const demo = lookupSceneBackground({ scene: '河畔', time: '夜晚' }, { scenes: { '河畔': 'a/scene-demo-clean.webp' } });
    assert.equal(demo.url, 'a/scene-demo-clean-night.webp');
    assert.equal(demo.timed, true);
    const miss = lookupSceneBackground({ scene: '不存在', time: '夜晚' }, { scenes: {} });
    assert.equal(miss.timed, false);
});

test('scene-timed-asset:timed-background-skips-time-grade', () => {
    const base = { settings: { enabled: true, strength: 'medium' }, time: 'night', location: '街道' };
    const graded = resolveSceneGradePlan(base);
    assert.ok(graded, 'night grade should apply to plain background');
    assert.equal(graded.time, 'night');
    const timed = resolveSceneGradePlan({ ...base, timedAsset: true });
    assert.ok(!timed || timed.time === '', 'time grade must be skipped for timed asset');
});
