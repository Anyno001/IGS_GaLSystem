import { resolveAmbientPlan } from './scene-audio.js';
import { resolveWeatherFxKind, resolveWeatherFxScene } from './weather-fx-runtime.js';

export function groundHintsOf(content, readerSettings) {
    const src = content || {};
    return () => {
        let ambientKinds = [];
        try {
            ambientKinds = resolveAmbientPlan({ location: src.sceneLocation, time: src.sceneTime, weather: src.sceneWeather, worldview: readerSettings && readerSettings._worldview }, { enabled: true }, readerSettings && readerSettings.weatherFx).map((layer) => layer.kind);
        } catch { /* 环境音推断失败时按室内外二分 */ }
        return {
            weatherKind: resolveWeatherFxKind(src.sceneWeather),
            ambientKinds,
            indoor: resolveWeatherFxScene(src.sceneLocation, readerSettings && readerSettings.weatherFx) === 'indoor',
        };
    };
}
