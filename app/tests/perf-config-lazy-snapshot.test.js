import test from 'node:test';
import assert from 'node:assert/strict';
import { createIgsCompatApi } from '../src/api/igs-compat.js';

test('gate:perf:compat-getConfig-uses-app-getConfig-not-getState', () => {
    let stateCalls = 0;
    const config = { a: { b: 1 } };
    const app = { getConfig: () => config, getState: () => { stateCalls += 1; return { config }; }, igsUi: null };
    const copy = createIgsCompatApi(app).getConfig();
    assert.deepEqual(copy, config);
    assert.notEqual(copy.a, config.a, 'external caller still gets an independent copy');
    assert.equal(stateCalls, 0, 'getState (deep snapshot) is not touched');
    // 没有 getConfig 的旧 app 仍走 getState。
    const legacy = { getState: () => { stateCalls += 1; return { config }; }, igsUi: null };
    assert.deepEqual(createIgsCompatApi(legacy).getConfig(), config);
    assert.equal(stateCalls, 1);
});
