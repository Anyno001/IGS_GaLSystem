import test from 'node:test';
import assert from 'node:assert/strict';
import {
    WAIT_STAGE_DEFAULTS,
    WAIT_STAGE_FALLBACK_LINES,
    WAIT_STAGE_GAME_LINES,
    WAIT_STAGE_GAMES,
    availableWaitStageGames,
    normalizeWaitStageSettings,
    waitStageGameLine,
    weaveWaitStageLines,
} from '../src/visual/igs-ui/wait-stage.js';
import {
    buildMemoryDeck,
    buildMoodRound,
    buildWaitStageModel,
    buildWhoSaidRound,
    collectWaitStageArt,
    collectWaitStageLines,
    createWaitStageRuntime,
    rpsLineKey,
    rpsOutcome,
} from '../src/visual/igs-ui/wait-stage-runtime.js';
import { FakeEl, makeTimers } from './helpers/fake-dom.js';

function runtimeHarness(settings = {}) {
    const timers = makeTimers();
    const doc = { createElement(tag) {
        const node = new FakeEl(doc, tag);
        node.classList = {
            add(value) { node.className += ` ${value}`; },
            remove(value) { node.className = node.className.split(' ').filter((item) => item !== value).join(' '); },
        };
        return node;
    } };
    const host = doc.createElement('div');
    let ready = 0;
    let dismissed = 0;
    const runtime = createWaitStageRuntime({
        doc, random: () => 0,
        timers: { setTimeout: timers.schedule, clearTimeout: timers.clear },
        onExitReady: () => { ready += 1; },
        onDismiss: () => { dismissed += 1; runtime.close(); },
    });
    const root = runtime.open(host, { settings, model: buildWaitStageModel({ settings, random: () => 0 }) });
    return { runtime, root, timers, ready: () => ready, dismissed: () => dismissed };
}

test('gate:wait-stage:empty-reply-interrupts-game-and-remains-until-dismissed', () => {
    const h = runtimeHarness();
    h.root.querySelector('.igs-ws-games').querySelector('button').fire('click');
    h.runtime.showFailure('empty');
    assert.equal(h.root.getAttribute('role'), 'alert');
    assert.equal(h.root.getAttribute('data-igs-waitstage-phase'), 'error');
    assert.equal(h.root.querySelector('.igs-ws-games').hidden, true);
    assert.equal(h.root.querySelector('.igs-ws-board').hidden, true);
    assert.match(h.root.querySelector('.igs-ws-error-title').textContent, /没有写出正文/);
    assert.equal(h.timers.size(), 0);
    h.runtime.update(buildWaitStageModel({ fallback: ['迟到的台词'] }));
    assert.match(h.root.querySelector('.igs-ws-error-title').textContent, /没有写出正文/);
    h.root.querySelector('.igs-ws-actions').querySelector('button').fire('click');
    assert.equal(h.dismissed(), 1);
    assert.equal(h.runtime.isOpen(), false);
});

test('gate:wait-stage:disabled-cameo-still-displays-failures', () => {
    const h = runtimeHarness({ enabled: false });
    assert.equal(h.root.querySelector('.igs-ws-line').hidden, true);
    h.runtime.showFailure('failed');
    assert.equal(h.root.querySelector('.igs-ws-line').hidden, false);
    assert.match(h.root.querySelector('.igs-ws-state').textContent, /检查连接/);
    assert.equal(h.root.querySelector('.igs-ws-actions').hidden, false);
    h.runtime.close();
});

test('gate:wait-stage:finished-game-keeps-the-layer-during-reply-mount', () => {
    const h = runtimeHarness();
    h.root.querySelector('.igs-ws-games').querySelector('button').fire('click');
    assert.equal(h.runtime.replyArrived(), false);
    h.root.querySelector('.igs-ws-hands').querySelector('button').fire('click');
    h.timers.advance(850);
    assert.equal(h.ready(), 1);
    assert.equal(h.runtime.isOpen(), true, '切楼成功前仍保留等待层');
    assert.match(h.root.querySelector('.igs-ws-state').textContent, /正在打开/);
    h.runtime.close();
    assert.equal(h.timers.size(), 0);
});

test('gate:wait-stage:failure-cancels-a-pending-game-exit', () => {
    const h = runtimeHarness();
    h.root.querySelector('.igs-ws-games').querySelector('button').fire('click');
    h.root.querySelector('.igs-ws-hands').querySelector('button').fire('click');
    h.runtime.replyArrived();
    h.runtime.showFailure('read');
    h.timers.advance(10000);
    assert.equal(h.ready(), 0);
    assert.equal(h.runtime.isOpen(), true);
    assert.match(h.root.querySelector('.igs-ws-error-title').textContent, /没能打开/);
    h.runtime.close();
});

test('gate:wait-stage:settings-default-on-and-clamp-seconds', () => {
    const fallback = normalizeWaitStageSettings(null);
    assert.deepEqual(fallback, WAIT_STAGE_DEFAULTS);
    assert.equal(normalizeWaitStageSettings({ enabled: false }).enabled, false);
    assert.equal(normalizeWaitStageSettings({ games: false }).games, false);
    assert.equal(normalizeWaitStageSettings({ voice: false }).voice, false);
    assert.equal(normalizeWaitStageSettings({ lineSeconds: 1 }).lineSeconds, 3);
    assert.equal(normalizeWaitStageSettings({ lineSeconds: 99 }).lineSeconds, 16);
    assert.equal(normalizeWaitStageSettings({ lineSeconds: '8' }).lineSeconds, 8);
    assert.equal(normalizeWaitStageSettings({ lineSeconds: 'abc' }).lineSeconds, 6);
});

test('gate:wait-stage:weave-mixes-replay-and-fallback-without-double-quote', () => {
    const replay = [
        { who: '艾莉', text: '第一句。' },
        { who: '露娜', text: '第二句。' },
    ];
    let seed = 7;
    const random = () => {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed / 2147483648;
    };
    const out = weaveWaitStageLines(replay, WAIT_STAGE_FALLBACK_LINES, { random, limit: 8 });
    assert.equal(out.length, 8);
    for (let i = 1; i < out.length; i += 1) {
        assert.equal(Boolean(out[i].who) && Boolean(out[i - 1].who), false);
    }
    assert.equal(out.filter((line) => line.who).length, 2);
    assert.equal(out.filter((line) => !line.who).length, 6);
});

test('gate:wait-stage:weave-falls-back-when-no-replay', () => {
    const out = weaveWaitStageLines([], WAIT_STAGE_FALLBACK_LINES, { random: () => 0, limit: 4 });
    assert.equal(out.length, 4);
    assert.equal(out.every((line) => !line.who && line.text), true);
    assert.equal(out.every((line) => WAIT_STAGE_FALLBACK_LINES.includes(line.text)), true);
});

test('gate:wait-stage:collects-short-character-lines-and-drops-narration', () => {
    const turns = [
        { raw: '艾莉：[igs-char:艾莉|平和|要不要一起走？]' },
        { raw: '露娜：[igs-char:露娜|喜悦|好。]' },
        { raw: '她低下头，看着鞋尖，很久没有说话，风把她额前的头发吹到一边去了。' },
        { raw: '艾莉：[igs-char:艾莉|平和|要不要一起走？]' },
    ];
    const lines = collectWaitStageLines(turns, { random: () => 0 });
    assert.equal(lines.length, 2);
    assert.equal(lines.every((line) => line.who && line.text), true);
    assert.equal(new Set(lines.map((line) => line.text)).size, 2);
});

test('gate:wait-stage:normalized-host-turns-with-object-raw-keep-character-lines', () => {
    const lines = collectWaitStageLines([
        { id: 2, raw: { mes: '[igs-char:艾莉|喜悦|快来。]' }, text: '[igs-char:艾莉|喜悦|快来。]' },
        { id: 3, raw: { mes: '[igs-char:露娜|悲伤|等我。]' }, text: '[igs-char:露娜|悲伤|等我。]' },
    ]);
    assert.deepEqual(new Set(lines.map((line) => line.who)), new Set(['艾莉', '露娜']));
    assert.equal(availableWaitStageGames({}, lines).includes('whosaid'), true);
});

test('gate:wait-stage:collects-scene-directive-dialogue', () => {
    const lines = collectWaitStageLines([
        { raw: '[igs-scene:教室|白天|放学后]\n艾莉：[igs-char:艾莉|喜悦|你回来啦。]' },
    ], { random: () => 0 });
    assert.equal(lines.length, 1);
    assert.equal(lines[0].who, '艾莉');
    assert.equal(lines[0].mood, '喜悦');
    assert.equal(lines[0].text.includes('[igs'), false);
});

test('gate:wait-stage:long-line-is-truncated', () => {
    const long = '这是一句非常非常长的台词'.repeat(8);
    const lines = collectWaitStageLines([{ raw: `艾莉：[igs-char:艾莉|平和|${long}]` }]);
    assert.equal(lines.length, 1);
    assert.equal(Array.from(lines[0].text).length, 34);
    assert.equal(lines[0].text.endsWith('…'), true);
});

test('gate:wait-stage:whosaid-borrows-card-names', () => {
    const model = buildWaitStageModel({
        turns: [{ raw: '[igs-char:艾莉|平和|今天也辛苦了。]' }],
        sceneAssets: { characters: { 艾莉: {}, 莉娜: {} } },
        random: () => 0,
    });
    assert.equal(model.games.includes('whosaid'), true);
    const round = buildWhoSaidRound(model.replay, () => 0, model.names);
    assert.equal(round.answer, '艾莉');
    assert.equal(round.options.includes('莉娜'), true);
});

test('gate:wait-stage:image-refresh-keeps-line-rotation', (t) => {
    const h = runtimeHarness();
    t.after(() => h.runtime.close());
    let seed = 7;
    const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    const make = () => buildWaitStageModel({ turns: [{ raw: '[igs-char:艾莉|平和|第一句。][igs-char:莉娜|平和|第二句。]' }], random });
    const lineText = () => h.root.querySelector('.igs-ws-line').children.map((node) => node.textContent).join('|');
    h.runtime.update(make());
    const first = lineText();
    h.timers.advance(3000);
    // 图片读回反复补模型：不重洗台词、不重置计时。
    for (let i = 0; i < 5; i += 1) h.runtime.update(make());
    assert.equal(lineText(), first);
    h.timers.advance(2999);
    assert.equal(lineText(), first);
    h.timers.advance(1);
    assert.notEqual(lineText(), first);
});

test('gate:wait-stage:games-open-only-when-assets-allow', () => {
    const bare = availableWaitStageGames({}, []);
    assert.deepEqual(bare, ['rps']);
    const withPictures = availableWaitStageGames({ pictures: [{ url: 'a' }, { url: 'b' }, { url: 'c' }] }, []);
    assert.equal(withPictures.includes('memory'), true);
    const withSprites = availableWaitStageGames({
        sprites: [{ url: 'a', mood: '喜悦' }, { url: 'b', mood: '悲伤' }],
    }, []);
    assert.equal(withSprites.includes('mood'), true);
    const withLines = availableWaitStageGames({}, [
        { who: '艾莉', text: '一' },
        { who: '露娜', text: '二' },
    ]);
    assert.equal(withLines.includes('whosaid'), true);
    assert.equal(WAIT_STAGE_GAMES.every((id) => typeof id === 'string'), true);
});

test('gate:wait-stage:whosaid-needs-two-speakers', () => {
    assert.equal(buildWhoSaidRound([{ who: '艾莉', text: '一' }]), null);
    const round = buildWhoSaidRound([
        { who: '艾莉', text: '一' },
        { who: '露娜', text: '二' },
    ], () => 0);
    assert.ok(round);
    assert.equal(round.options.includes(round.answer), true);
    assert.equal(new Set(round.options).size, round.options.length);
});

test('gate:wait-stage:picks-memory-pairs-uniquely', () => {
    const deck = buildMemoryDeck([
        { url: 'a' }, { url: 'b' }, { url: 'a' }, { url: 'c' }, { url: 'd' },
    ], 3, () => 0);
    assert.equal(deck.length, 6);
    assert.equal(new Set(deck.map((card) => card.id)).size, 6);
    const counts = {};
    for (const card of deck) counts[card.url] = (counts[card.url] || 0) + 1;
    assert.deepEqual(Object.values(counts), [2, 2, 2]);
});

test('gate:wait-stage:mood-round-answer-is-in-options', () => {
    const sprites = [
        { url: 'a', mood: '喜悦' },
        { url: 'b', mood: '悲伤' },
        { url: 'c', mood: '愤怒' },
    ];
    const round = buildMoodRound(sprites, { random: () => 0 });
    assert.ok(round);
    assert.equal(round.options.includes(round.answer), true);
    assert.equal(round.sprite.mood, round.answer);
});

test('gate:wait-stage:rps-outcome-table', () => {
    assert.equal(rpsOutcome('rock', 'rock'), 0);
    assert.equal(rpsOutcome('rock', 'scissors'), 1);
    assert.equal(rpsOutcome('rock', 'paper'), 2);
    assert.equal(rpsOutcome('scissors', 'paper'), 1);
    assert.equal(rpsOutcome('paper', 'rock'), 1);
    assert.equal(rpsLineKey(0), 'draw');
    assert.equal(rpsLineKey(1), 'win');
    assert.equal(rpsLineKey(2), 'lose');
});

test('gate:wait-stage:game-line-falls-back-to-start-pool', () => {
    assert.equal(WAIT_STAGE_GAME_LINES.start.includes(waitStageGameLine('start', () => 0)), true);
    assert.equal(WAIT_STAGE_GAME_LINES.start.includes(waitStageGameLine('unknown-kind', () => 0)), true);
});

test('gate:wait-stage:builds-model-with-playlist-even-when-empty', () => {
    const model = buildWaitStageModel({ settings: { enabled: true }, random: () => 0 });
    assert.equal(model.playlist.length >= 1, true);
    assert.equal(model.settings.enabled, true);
    assert.equal(model.replay.length, 0);
    assert.deepEqual(model.games, ['rps']);
});

test('gate:wait-stage:original-sprites-and-scene-objects-unlock-art-games', () => {
    const model = buildWaitStageModel({
        sceneAssets: {
            characters: {
                艾莉: { 默认: 'igs-gen:base-a', 喜悦: 'igs-gen:joy' },
                露娜: { 默认: 'igs-gen:base-b', 悲伤: 'igs-gen:sad' },
            },
            scenes: { 教室: { url: 'igs-gen:room' } },
        },
        resolveUrl: (url) => `resolved:${url}`,
    });
    assert.deepEqual(model.games, ['rps', 'memory', 'mood']);
    assert.equal(model.art.pictures.some((item) => item.url === 'resolved:igs-gen:room'), true);
    assert.equal(model.art.pictures.some((item) => item.url === 'resolved:igs-gen:base-a'), true);
    assert.equal(model.art.pictures.some((item) => item.url.includes('[object Object]')), false);
    assert.deepEqual(new Set(model.art.sprites.map((item) => item.mood)), new Set(['喜悦', '悲伤']));
});

test('gate:wait-stage:collects-art-with-resolved-urls', () => {
    const art = collectWaitStageArt({
        characterOutfits: {
            艾莉: { 校服: { moods: { 喜悦: 'sprite-a' }, base: 'base-a' } },
        },
        scenes: { 教室: 'scene-a' },
    }, { resolveUrl: (url) => `resolved:${url}` });
    assert.equal(art.sprites.length, 1);
    assert.equal(art.sprites[0].url, 'resolved:sprite-a');
    assert.equal(art.sprites[0].mood, '喜悦');
    assert.equal(art.pictures.length, 3);
    assert.equal(art.pictures.every((item) => String(item.url).startsWith('resolved:')), true);
});

test('gate:wait-stage:time-and-weather-backgrounds-unlock-memory-without-base-scene-image', () => {
    const art = collectWaitStageArt({ scenes: {
        教室: { url: '', times: {
            白天: { url: 'day.png', weathers: { 雨: { url: 'rain.png' } } },
            夜晚: { url: 'night.png', weathers: {} },
        } },
    } });
    assert.deepEqual(new Set(art.pictures.map((item) => item.url)), new Set(['day.png', 'rain.png', 'night.png']));
    assert.ok(availableWaitStageGames(art, []).includes('memory'));
});

test('gate:wait-stage:settings-row-is-reachable-from-the-perf-page', async () => {
    const { renderPerformanceSettings } = await import('../src/visual/igs-ui/performance-settings-layout.js');
    const collapsed = renderPerformanceSettings({ waitStage: { enabled: true } });
    assert.match(collapsed, /data-switch="readerSettings\.waitStage\.enabled"/);
    assert.match(collapsed, /等待过场/);
    const expanded = renderPerformanceSettings(
        { waitStage: { enabled: true, games: true, voice: true, lineSeconds: 6 } },
        {},
        (key) => key === 'perf-wait-stage',
    );
    assert.match(expanded, /waitStage\.lineSeconds/);
    assert.match(expanded, /waitStage\.games/);
    assert.match(expanded, /waitStage\.voice/);
    assert.match(expanded, /每句停留/);
});

test('gate:wait-stage:memory-needs-three-unique-pictures', () => {
    const same = [{ url: 'a' }, { url: 'a' }, { url: 'a' }];
    assert.equal(availableWaitStageGames({ pictures: same }, []).includes('memory'), false);
    const distinct = [{ url: 'a' }, { url: 'b' }, { url: 'c' }];
    assert.equal(availableWaitStageGames({ pictures: distinct }, []).includes('memory'), true);
});
