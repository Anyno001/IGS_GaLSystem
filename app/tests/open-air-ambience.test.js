import test from 'node:test';
import assert from 'node:assert/strict';
import { isOpenAirPlace, resolvePlaceAmbience } from '../src/scene/place-ambience.js';
import { resolveDateAmbience } from '../src/scene/date-ambience.js';
import { resolveCameraAmbience } from '../src/visual/igs-ui/fx-camera-model.js';

test('gate:open-air-ambience parasols and outdoor seats get no indoor window light or bokeh', () => {
    for (const place of ['咖啡店外的太阳伞下', '露天咖啡座', '冷饮店门口的遮阳伞', '餐厅外摆区']) {
        assert.ok(isOpenAirPlace(place), place);
        assert.equal(resolveDateAmbience(place), null, place);
        assert.equal(resolveCameraAmbience(place), null, place);
        assert.equal(resolvePlaceAmbience(place), null, place);
    }
    assert.equal(resolveDateAmbience('沙滩太阳伞下').kind, 'beach');
    assert.equal(resolveDateAmbience('咖啡厅').kind, 'cafe');
    assert.equal(resolveCameraAmbience('卧室').kind, 'cmroom');
});
