import { createMediaLeaseScope } from '../../media/media-lease-scope.js';
import { localImageCacheFor } from '../../media/tavern-image-cache.js';
import { hashString } from './seed-random.js';
import { classifyMapPlace, detectMapTheme, resolveMapScale } from './place-semantics.js';
import { generateCitySteps } from './city.js';
import { renderCitySteps, renderLightSteps } from './render-canvas.js';
import { MAP_DEFAULT_VARIANT } from './themes.js';

// 升级生成算法或画风时加一，旧缓存与旧种子序列随之失效。
export const MAP_GEN_VERSION = 3;
export const MAP_GEN_WORLD = Object.freeze({ width: 1600, height: 900 });

const round4 = value => Math.round(Number(value) * 10000) / 10000;

// 生成输入只取已排好位置的指针；缓存键覆盖种子、地点签名、世界观与尺度。
export function buildMapGenInput(options = {}) {
    const width = options.width || MAP_GEN_WORLD.width;
    const height = options.height || MAP_GEN_WORLD.height;
    const points = (options.points || []).map((point, index) => ({
        id: String(point.id ?? index),
        name: String(point.name ?? ''),
        description: String(point.description ?? ''),
        x: round4(point.x),
        y: round4(point.y),
        category: classifyMapPlace(point.name, point.description),
    }));
    const palette = options.palette || MAP_DEFAULT_VARIANT;
    const scale = resolveMapScale(options.parentName, points.map(point => point.name));
    const theme = options.theme || detectMapTheme(options.themeTexts || points.flatMap(point => [point.name, point.description]));
    const seed = hashString([MAP_GEN_VERSION, options.chatId, options.tableUid, options.parentId, options.salt || 0].map(part => String(part ?? '')).join('\u0001'));
    const signature = hashString(points.map(point => [point.id, point.name, point.category, point.x, point.y].join('|')).join(';'));
    return {
        kind: 'city', key: `city:${seed}:${signature}:${theme}:${palette}:${scale}:${width}x${height}`,
        seed, scale, theme, palette, width, height, points,
    };
}

// 无生成数据的外部底图只按指针位置点灯，避免夜里整张图死黑。
export function buildMarkerLightsInput(points, width, height) {
    const lights = (points || []).map(point => ({ x: Math.round(point.x * width), y: Math.round(point.y * height), r: 70, a: 0.75 }));
    return { kind: 'lights', key: `lights:${hashString(lights.map(l => `${l.x},${l.y}`).join(';'))}:${width}x${height}`, width, height, lights };
}

export function createMapBasemapGenerator(options = {}) {
    const doc = options.doc || null;
    const view = doc?.defaultView || globalThis;
    const budget = options.budgetMs ?? 10;
    const timeout = options.timeoutMs ?? 8000;
    const now = options.now || (() => (view.performance || globalThis.performance || Date).now());
    const schedule = options.schedule || (fn => (view.setTimeout || setTimeout)(fn, 0));
    const createCanvas = options.createCanvas || ((w, h) => {
        if (!doc?.createElement) return null;
        const canvas = doc.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        return canvas;
    });
    const renderScale = options.scale ?? ((view.devicePixelRatio || 1) >= 1.5 ? 2 : 1.5);
    const media = options.mediaCache || localImageCacheFor(view);
    const leases = createMediaLeaseScope(media);
    let activeKey = '';
    let generation = 0;
    let disposed = false;

    const revoke = entry => {
        if (entry?.key === activeKey) { leases.releaseAll(); activeKey = ''; }
        if (!entry) return;
        entry.cancelled = true;
        for (const key of entry.resourceKeys || []) media.forget(key);
    };
    const cache = media.auxiliary.createMap('maps', {
        maxEntries: options.cacheSize,
        onRemove: revoke,
        onClear: () => { generation += 1; leases.releaseAll(); activeKey = ''; },
        onDestroy: () => { disposed = true; },
    });
    const remember = (key, entry) => {
        cache.set(key, entry);
    };

    // 按时间预算推进生成器：每片不超过 budget 毫秒，其余交回宿主事件循环。
    const drive = (iterator, cancelled) => new Promise((resolve, reject) => {
        const started = now();
        const tick = () => {
            if (disposed || cancelled()) { reject(new Error('disposed')); return; }
            try {
                const t0 = now();
                let step = iterator.next();
                while (!step.done && now() - t0 < budget) step = iterator.next();
                if (step.done) resolve(step.value);
                else if (now() - started > timeout) reject(new Error('timeout'));
                else schedule(tick);
            } catch (error) { reject(error); }
        };
        schedule(tick);
    });

    const toUrl = async (canvas, key, stamp) => {
        if (media.token(key) !== stamp || disposed) return '';
        await media.load(key, () => new Promise(resolve => {
            if (typeof canvas.toBlob === 'function' && view.URL?.createObjectURL) canvas.toBlob(blob => resolve(blob || canvas.toDataURL('image/png')), 'image/webp', 0.9);
            else resolve(canvas.toDataURL('image/png'));
        }), { persist: false, timeoutMs: timeout });
        return media.token(key) === stamp && !disposed ? media.peek(key) : '';
    };

    function* cityJob(input) {
        const scene = yield* generateCitySteps(input);
        const canvas = createCanvas(Math.round(input.width * renderScale), Math.round(input.height * renderScale));
        const ctx = canvas?.getContext?.('2d');
        if (!ctx) throw new Error('canvas-unavailable');
        yield* renderCitySteps(ctx, scene, { scale: renderScale, seed: input.seed, palette: input.palette, createCanvas });
        const lights = createCanvas(input.width, input.height);
        const lctx = lights?.getContext?.('2d');
        if (lctx) renderLightSteps(lctx, scene.lights, input.width, input.height, { createCanvas });
        return { canvas, lights: lctx ? lights : null };
    }

    function* lightsJob(input) {
        const lights = createCanvas(input.width, input.height);
        const lctx = lights?.getContext?.('2d');
        if (!lctx) throw new Error('canvas-unavailable');
        yield 'lights';
        renderLightSteps(lctx, input.lights, input.width, input.height, { createCanvas });
        return { canvas: null, lights };
    }

    function peek(key) {
        const entry = cache.get(key);
        if (!entry) return null;
        if (entry.status === 'ready') {
            const current = new Map(entry.resourceKeys.map(resourceKey => [resourceKey, media.peek(resourceKey)]));
            if ([...current.values()].some(url => !url)) { cache.delete(key); return null; }
            entry.result = { ...entry.result, url: current.get(`map:${key}:base`) || '', lightsUrl: current.get(`map:${key}:lights`) || '' };
        }
        return entry;
    }

    function request(input) {
        if (disposed) return { key: input.key, status: 'failed', error: 'disposed', result: null };
        const existing = peek(input.key);
        if (input.key !== activeKey) { leases.releaseAll(); activeKey = input.key; }
        leases.begin();
        leases.use(`map:${input.key}:base`); leases.use(`map:${input.key}:lights`); leases.end();
        if (existing) return existing;
        const entry = { key: input.key, status: 'pending', result: null, error: '', cancelled: false, resourceKeys: [] };
        const currentGeneration = generation;
        const imageKey = `map:${input.key}:base`, lightsKey = `map:${input.key}:lights`;
        const imageStamp = media.token(imageKey), lightsStamp = media.token(lightsKey);
        entry.promise = drive(input.kind === 'lights' ? lightsJob(input) : cityJob(input), () => entry.cancelled || currentGeneration !== generation)
            .then(async ({ canvas, lights }) => {
                if (entry.cancelled || currentGeneration !== generation) throw new Error('disposed');
                entry.resourceKeys = [canvas && imageKey, lights && lightsKey].filter(Boolean);
                const url = canvas ? await toUrl(canvas, imageKey, imageStamp) : '';
                if (disposed || entry.cancelled || currentGeneration !== generation) throw new Error('disposed');
                const lightsUrl = lights ? await toUrl(lights, lightsKey, lightsStamp) : '';
                if (disposed || entry.cancelled || currentGeneration !== generation) throw new Error('disposed');
                entry.result = { url, lightsUrl, width: input.width, height: input.height };
                entry.status = 'ready';
                if (cache.get(input.key) === entry) remember(input.key, entry);
                return entry;
            })
            .catch(error => {
                if (cache.get(input.key) === entry) revoke(entry);
                entry.status = 'failed';
                entry.error = String(error?.message || error);
                if (cache.get(input.key) === entry) cache.set(input.key, entry);
                return entry;
            });
        remember(input.key, entry);
        return entry;
    }

    function dispose() {
        cache.destroy();
    }

    return { request, peek, dispose, releaseActive() { leases.releaseAll(); activeKey = ''; } };
}
