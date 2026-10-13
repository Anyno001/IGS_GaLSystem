import { extractSceneDirectives } from '../../scene/scene-directives.js';
import { getMessagePrimaryText } from '../../scene/message-source.js';
import { outfitsOfCharacter } from '../../scene/character-outfits.js';
import {
    WAIT_STAGE_FALLBACK_LINES,
    WAIT_STAGE_FAILURES,
    WAIT_STAGE_GAME_LABELS,
    availableWaitStageGames,
    normalizeWaitStageSettings,
    waitStageGameLine,
    weaveWaitStageLines,
} from './wait-stage.js';

const QUOTE_MAX = 34;
const TURN_LOOKBACK = 6;

// 回放池：最近几楼的 AI 正文里角色说过的话（去标签、截断、去重）。
export function collectWaitStageLines(turns, options = {}) {
    const random = typeof options.random === 'function' ? options.random : Math.random;
    const list = Array.isArray(turns) ? turns : [];
    const out = [];
    const seen = new Set();
    for (const turn of list.slice(-Math.max(1, Math.round(options.turns || TURN_LOOKBACK)))) {
        const raw = getMessagePrimaryText(turn && (turn.raw || turn)) || getMessagePrimaryText(turn);
        if (!raw) continue;
        let directives = [];
        try {
            directives = extractSceneDirectives(raw, {}).directives || [];
        } catch (error) {
            directives = [];
        }
        for (const item of directives) {
            if (!item || item.type !== 'char') continue;
            const who = String(item.character || '').trim();
            const text = String(item.dialogue || '').replace(/\s+/g, ' ').trim();
            if (!who || !text || text.length > QUOTE_MAX) continue;
            const key = `${who}\u0000${text}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({ who, text, mood: String(item.mood || '').trim() });
        }
    }
    // 越靠后的楼越贴近当下语境，打散后也不会整轮都是老台词。
    const pool = (out.slice(-14).length ? out.slice(-14) : out).slice();
    for (let i = pool.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        const swap = pool[i];
        pool[i] = pool[j];
        pool[j] = swap;
    }
    return pool;
}

// 牌面素材：本卡的立绘差分（带情绪标签）、服装底图与场景图。素材不够的游戏会被 availableWaitStageGames 摘掉。
export function collectWaitStageArt(sceneAssets, options = {}) {
    const assets = sceneAssets && typeof sceneAssets === 'object' ? sceneAssets : {};
    const resolveUrl = typeof options.resolveUrl === 'function' ? options.resolveUrl : (url) => String(url || '');
    const sprites = [];
    const pictures = [];
    const addSprite = (character, outfit, mood, url) => {
        const resolved = url ? String(resolveUrl(url) || '') : '';
        if (!resolved) return;
        if (mood && mood !== '默认') sprites.push({ character, outfit, mood, url: resolved });
        pictures.push({ character, label: mood, url: resolved });
    };
    for (const [character, moods] of Object.entries(assets.characters || {})) {
        for (const [mood, url] of Object.entries(moods || {})) addSprite(character, '', mood, url);
    }
    for (const character of Object.keys(assets.characterOutfits || {})) {
        const { outfits } = outfitsOfCharacter(assets.characterOutfits, assets.characterAliases, character);
        for (const [outfitName, outfit] of Object.entries(outfits || {})) {
            for (const [mood, url] of Object.entries((outfit && outfit.moods) || {})) {
                addSprite(character, outfitName, String(mood || '').trim(), url);
            }
            const base = outfit && outfit.base ? String(resolveUrl(outfit.base) || '') : '';
            if (base) pictures.push({ character, label: outfitName, url: base });
        }
    }
    const addPicture = (url) => {
        const resolved = url ? String(resolveUrl(url) || '') : '';
        if (resolved) pictures.push({ character: '', label: '', url: resolved });
    };
    for (const scene of Object.values(assets.scenes || {})) {
        if (typeof scene === 'string') { addPicture(scene); continue; }
        if (!scene || typeof scene !== 'object') continue;
        addPicture(scene.url);
        for (const time of Object.values(scene.times || {})) {
            if (typeof time === 'string') { addPicture(time); continue; }
            if (!time || typeof time !== 'object') continue;
            addPicture(time.url);
            for (const weather of Object.values(time.weathers || {})) addPicture(typeof weather === 'string' ? weather : weather && weather.url);
        }
    }
    for (const entry of Array.isArray(options.pictures) ? options.pictures : []) {
        if (entry && entry.url) pictures.push(entry);
    }
    return { sprites, pictures };
}

export function buildWaitStageModel(options = {}) {
    const settings = normalizeWaitStageSettings(options.settings);
    const lines = collectWaitStageLines(options.turns, options);
    const art = collectWaitStageArt(options.sceneAssets, options);
    const fallback = Array.isArray(options.fallback) && options.fallback.length ? options.fallback : WAIT_STAGE_FALLBACK_LINES;
    const playlist = weaveWaitStageLines(lines, fallback, { limit: 14, random: options.random });
    return {
        settings,
        playlist: playlist.length ? playlist : [{ who: '', text: fallback[0] }],
        replay: lines,
        art,
        games: availableWaitStageGames(art, lines),
    };
}

export const RPS_HANDS = Object.freeze([
    { id: 'rock', label: '石头' },
    { id: 'scissors', label: '剪刀' },
    { id: 'paper', label: '布' },
]);

// 0 平、1 玩家赢、2 角色赢。
export function rpsOutcome(player, foe) {
    if (player === foe) return 0;
    const beats = { rock: 'scissors', scissors: 'paper', paper: 'rock' };
    return beats[player] === foe ? 1 : 2;
}

export function rpsLineKey(outcome) {
    return outcome === 1 ? 'win' : (outcome === 2 ? 'lose' : 'draw');
}

// 翻牌：取若干张不同的图，每种两张，打乱成牌堆。
export function buildMemoryDeck(pictures, pairCount = 6, random = Math.random) {
    const unique = [];
    const seen = new Set();
    for (const item of Array.isArray(pictures) ? pictures : []) {
        const url = item && item.url ? String(item.url) : '';
        if (!url || seen.has(url)) continue;
        seen.add(url);
        unique.push(item);
        if (unique.length >= pairCount) break;
    }
    const deck = [];
    for (const item of unique) {
        deck.push({ ...item, id: `${item.url}#a` });
        deck.push({ ...item, id: `${item.url}#b` });
    }
    for (let i = deck.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        const swap = deck[i];
        deck[i] = deck[j];
        deck[j] = swap;
    }
    return deck;
}

function pickOptions(answerValue, candidates, size, random) {
    const pool = candidates.slice();
    const out = [answerValue];
    while (out.length < size && pool.length) {
        out.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
    }
    for (let i = out.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        const swap = out[i];
        out[i] = out[j];
        out[j] = swap;
    }
    return out;
}

// 心情猜猜：抽一张差分当谜面，再从本卡全部情绪里挑干扰项。
export function buildMoodRound(sprites, options = {}) {
    const random = typeof options.random === 'function' ? options.random : Math.random;
    const pool = (Array.isArray(sprites) ? sprites : []).filter((item) => item && item.url && item.mood);
    if (pool.length < 2) return null;
    const answer = pool[Math.floor(random() * pool.length)];
    const others = Array.from(new Set(pool.map((item) => item.mood))).filter((mood) => mood !== answer.mood);
    if (!others.length) return null;
    return { sprite: answer, answer: answer.mood, options: pickOptions(answer.mood, others, 3, random) };
}

// 这句是谁说的：从回放池里抽一句台词，混入其他角色的名字。
export function buildWhoSaidRound(lines, random = Math.random) {
    const quoted = (Array.isArray(lines) ? lines : []).filter((line) => line && line.who && line.text);
    if (quoted.length < 2) return null;
    const answer = quoted[Math.floor(random() * quoted.length)];
    const names = Array.from(new Set(quoted.map((line) => line.who)));
    if (names.length < 2) return null;
    const others = names.filter((name) => name !== answer.who);
    return { text: answer.text, answer: answer.who, options: pickOptions(answer.who, others, 3, random) };
}

function mountNode(doc, className, html) {
    const node = doc.createElement('div');
    node.className = className;
    if (html != null) node.innerHTML = html;
    return node;
}

// 等待过场本体：五种模式共用一层；回复结束由宿主直接关闭。
export function createWaitStageRuntime(options = {}) {
    // 内嵌模式的宿主文档与主文档可能不是同一份，开层时现取。
    const resolveDoc = typeof options.getDoc === 'function'
        ? options.getDoc
        : () => options.doc || (typeof document !== 'undefined' ? document : null);
    const random = typeof options.random === 'function' ? options.random : Math.random;
    const onVoice = typeof options.onVoice === 'function' ? options.onVoice : () => {};
    const onExitReady = typeof options.onExitReady === 'function' ? options.onExitReady : () => {};
    const onDismiss = typeof options.onDismiss === 'function' ? options.onDismiss : () => {};
    const timers = options.timers || globalThis;
    let doc = null;
    let root = null;
    let body = null;
    let lineBox = null;
    let noteBox = null;
    let gamesRow = null;
    let board = null;
    let actions = null;
    let timer = null;
    let phase = 'wait';
    let model = null;
    let settings = normalizeWaitStageSettings(null);
    let index = 0;
    let game = null;
    let gameState = null;
    // 关掉等待过场时退化成纯三点：等还是要有反馈，只是不轮台词、不给小游戏。
    let minimal = false;

    function clearTimer() {
        if (timer != null) timers.clearTimeout(timer);
        timer = null;
    }

    function scheduleLine() {
        clearTimer();
        if (minimal || !root || phase !== 'wait' || game) return;
        timer = timers.setTimeout(() => {
            timer = null;
            if (!root || phase !== 'wait' || game) return;
            index += 1;
            renderLine();
            scheduleLine();
        }, Math.max(2000, (settings.lineSeconds || 6) * 1000));
    }

    function renderLine() {
        if (!lineBox || !model || minimal) return;
        const line = model.playlist[index % model.playlist.length] || { who: '', text: '' };
        lineBox.innerHTML = '';
        const text = doc.createElement('div');
        text.className = line.who ? 'igs-ws-quote' : 'igs-ws-note';
        text.textContent = line.text;
        lineBox.appendChild(text);
        if (line.who) {
            const who = doc.createElement('div');
            who.className = 'igs-ws-who';
            who.textContent = line.who;
            lineBox.appendChild(who);
            if (settings.voice) {
                try {
                    onVoice(line);
                } catch (error) {
                    // 语气音失败不影响过场。
                }
            }
        }
    }

    function setNote(text) {
        if (noteBox) noteBox.textContent = text || '';
    }

    function syncGameAttr() {
        if (root) root.setAttribute('data-igs-waitstage-game', game ? game.id : '');
    }

    function closeRoot() {
        clearTimer();
        if (root && root.parentNode && typeof root.parentNode.removeChild === 'function') {
            root.parentNode.removeChild(root);
        }
        doc = null;
        root = null;
        body = null;
        lineBox = null;
        noteBox = null;
        gamesRow = null;
        board = null;
        actions = null;
        game = null;
        gameState = null;
        phase = 'wait';
    }

    function finishRound() {
        if (phase !== 'exit') return;
        clearTimer();
        game = null;
        gameState = null;
        if (board) board.hidden = true;
        syncGameAttr();
        setNote('回复已写完，正在打开…');
        onExitReady();
    }

    function settleRound() {
        if (phase !== 'exit' || !gameState || !gameState.done) return;
        clearTimer();
        timer = timers.setTimeout(() => { timer = null; finishRound(); }, 850);
    }

    function closeGame() {
        if (!board) return;
        if (phase === 'exit') { finishRound(); return; }
        board.innerHTML = '';
        board.hidden = true;
        game = null;
        gameState = null;
        syncGameAttr();
        if (gamesRow) gamesRow.hidden = false;
        scheduleLine();
    }

    function openGame(id) {
        if (!board || !model || phase !== 'wait') return;
        clearTimer();
        game = { id };
        gameState = {};
        board.hidden = false;
        if (gamesRow) gamesRow.hidden = true;
        syncGameAttr();
        if (id === 'rps') startRps();
        else if (id === 'whosaid') startWhoSaid();
        else if (id === 'memory') startMemory();
        else if (id === 'mood') startMood();
    }

    function gameShell(title) {
        board.innerHTML = '';
        const head = doc.createElement('div');
        head.className = 'igs-ws-board-head';
        const name = doc.createElement('span');
        name.textContent = title;
        const close = doc.createElement('button');
        close.type = 'button';
        close.className = 'igs-ws-close';
        close.textContent = '✕';
        close.addEventListener('click', () => closeGame());
        head.appendChild(name);
        head.appendChild(close);
        board.appendChild(head);
        const status = doc.createElement('div');
        status.className = 'igs-ws-status';
        board.appendChild(status);
        return status;
    }

    function chipRow(className, labels, onPick) {
        const row = mountNode(doc, className);
        for (const item of labels) {
            const button = doc.createElement('button');
            button.type = 'button';
            button.className = 'igs-ws-chip';
            button.textContent = item.label;
            button.addEventListener('click', () => onPick(item));
            row.appendChild(button);
        }
        board.appendChild(row);
        return row;
    }

    function say(status, text, lineKey) {
        status.textContent = text;
        if (lineKey) {
            setNote(waitStageGameLine(lineKey, random));
            if (settings.voice) {
                try {
                    onVoice(null);
                } catch (error) {
                    // 同上。
                }
            }
        }
    }

    function startRps() {
        const status = gameShell(WAIT_STAGE_GAME_LABELS.rps);
        status.textContent = '出什么？';
        setNote(waitStageGameLine('start', random));
        chipRow('igs-ws-hands', RPS_HANDS.map((hand) => ({ id: hand.id, label: hand.label })), (hand) => {
            if (phase === 'exit' && gameState.done) return;
            const foe = RPS_HANDS[Math.floor(random() * RPS_HANDS.length)];
            const outcome = rpsOutcome(hand.id, foe.id);
            say(status, `你出${hand.label}，对方出${foe.label}。`, rpsLineKey(outcome));
            gameState.done = true;
            settleRound();
        });
    }

    function startWhoSaid() {
        const round = buildWhoSaidRound(model ? model.replay : [], random);
        const status = gameShell(WAIT_STAGE_GAME_LABELS.whosaid);
        if (!round) {
            say(status, '能回放的台词还不够，多聊几句再来。');
            return;
        }
        status.textContent = `「${round.text}」`;
        chipRow('igs-ws-choices', round.options.map((name) => ({ id: name, label: name })), (item) => {
            if (gameState.done) return;
            gameState.done = true;
            const right = item.id === round.answer;
            say(status, right ? `是${round.answer}。` : `是${round.answer}说的。`, right ? 'right' : 'wrong');
            settleRound();
        });
    }

    function startMemory() {
        const deck = buildMemoryDeck(model ? model.art.pictures : [], 6, random);
        const status = gameShell(WAIT_STAGE_GAME_LABELS.memory);
        if (!deck.length) {
            say(status, '图库里还没有能用的图。');
            return;
        }
        const columns = deck.length >= 12 ? 4 : 3;
        const grid = mountNode(doc, 'igs-ws-grid');
        grid.style.setProperty('--igs-ws-cols', String(columns));
        const opened = [];
        const done = new Set();
        const nodes = [];
        const total = deck.length / 2;
        let pairs = 0;
        let moves = 0;
        status.textContent = `配对 0 / ${total}`;
        const hide = (card, node) => {
            if (done.has(card.id)) return;
            node.classList.remove('is-open');
            node.innerHTML = '';
        };
        for (const card of deck) {
            const button = doc.createElement('button');
            button.type = 'button';
            button.className = 'igs-ws-card';
            button.addEventListener('click', () => {
                if (done.has(card.id) || opened.indexOf(card) >= 0 || opened.length >= 2) return;
                opened.push(card);
                button.classList.add('is-open');
                const image = doc.createElement('img');
                image.src = card.url;
                image.alt = '';
                button.appendChild(image);
                if (opened.length < 2) return;
                const a = opened[0];
                const b = opened[1];
                const aNode = nodes[deck.indexOf(a)];
                const bNode = nodes[deck.indexOf(b)];
                moves += 1;
                if (String(a.url) === String(b.url)) {
                    done.add(a.id);
                    done.add(b.id);
                    pairs += 1;
                    if (aNode) aNode.classList.add('is-done');
                    if (bNode) bNode.classList.add('is-done');
                    opened.length = 0;
                    status.textContent = `配对 ${pairs} / ${total}`;
                    if (pairs >= total) {
                        setNote(waitStageGameLine('right', random));
                        status.textContent = `配对完成，共 ${moves} 手。`;
                        gameState.done = true;
                        settleRound();
                    }
                    return;
                }
                setNote(waitStageGameLine('wrong', random));
                timers.setTimeout(() => {
                    if (aNode) hide(a, aNode);
                    if (bNode) hide(b, bNode);
                    opened.length = 0;
                }, 620);
            });
            nodes.push(button);
            grid.appendChild(button);
        }
        board.appendChild(grid);
    }

    function startMood() {
        const round = buildMoodRound(model ? model.art.sprites : [], { random });
        const status = gameShell(WAIT_STAGE_GAME_LABELS.mood);
        if (!round) {
            say(status, '立绘差分还不够，先去补几张表情。');
            return;
        }
        const face = mountNode(doc, 'igs-ws-face');
        const image = doc.createElement('img');
        image.src = round.sprite.url;
        image.alt = '';
        face.appendChild(image);
        board.appendChild(face);
        status.textContent = '这是什么心情？';
        chipRow('igs-ws-choices', round.options.map((mood) => ({ id: mood, label: mood })), (item) => {
            if (gameState.done) return;
            gameState.done = true;
            const right = item.id === round.answer;
            say(status, right ? `是${round.answer}。` : `其实是${round.answer}。`, right ? 'right' : 'wrong');
            settleRound();
        });
    }

    function renderGames() {
        if (!gamesRow) return;
        gamesRow.innerHTML = '';
        const list = (model && model.games) || [];
        if (minimal || !settings.games || !list.length) {
            gamesRow.hidden = true;
            return;
        }
        gamesRow.hidden = Boolean(game) || phase !== 'wait';
        for (const id of list) {
            const button = doc.createElement('button');
            button.type = 'button';
            button.className = 'igs-ws-chip';
            button.textContent = WAIT_STAGE_GAME_LABELS[id] || id;
            button.addEventListener('click', () => openGame(id));
            gamesRow.appendChild(button);
        }
    }

    return {
        open(host, opts = {}) {
            if (!host || !host.appendChild) return null;
            const nextDoc = host.ownerDocument || resolveDoc();
            if (!nextDoc || typeof nextDoc.createElement !== 'function') return null;
            closeRoot();
            doc = nextDoc;
            model = opts.model || null;
            phase = 'wait';
            settings = normalizeWaitStageSettings(opts.settings || settings);
            // 关掉等待过场时内嵌也不能开天窗：退化成纯三点，等还是要有反馈。
            minimal = settings.enabled === false;
            index = 0;
            game = null;
            gameState = null;
            root = mountNode(doc, opts.embedded ? 'igs-waitstage igs-embedded-loading' : 'igs-waitstage');
            root.setAttribute('data-igs-waitstage-phase', phase);
            root.setAttribute('role', 'status');
            root.setAttribute('aria-live', 'polite');
            body = mountNode(doc, 'igs-ws-body');
            body.appendChild(mountNode(doc, 'igs-ws-dots', '<span class="igs-embedded-loading-dot"></span><span class="igs-embedded-loading-dot"></span><span class="igs-embedded-loading-dot"></span>'));
            lineBox = mountNode(doc, 'igs-ws-line');
            lineBox.hidden = minimal;
            noteBox = mountNode(doc, 'igs-ws-note igs-ws-state');
            body.appendChild(lineBox);
            body.appendChild(noteBox);
            if (!minimal) {
                gamesRow = mountNode(doc, 'igs-ws-games');
                board = mountNode(doc, 'igs-ws-board');
                board.hidden = true;
                body.appendChild(gamesRow);
                body.appendChild(board);
            }
            actions = mountNode(doc, 'igs-ws-actions');
            actions.hidden = true;
            const back = doc.createElement('button');
            back.type = 'button';
            back.className = 'igs-ws-chip';
            back.textContent = '返回当前楼';
            const openedRoot = root;
            back.addEventListener('click', () => { if (root === openedRoot) onDismiss(); });
            actions.appendChild(back);
            body.appendChild(actions);
            root.appendChild(body);
            host.appendChild(root);
            syncGameAttr();
            renderLine();
            if (minimal) setNote('正在等待回复…');
            renderGames();
            scheduleLine();
            return root;
        },
        // 楼层读完后再补一遍回放台词与牌面素材：开层时不等数据，先显示兜底句。
        update(nextModel) {
            if (!nextModel || !root) return;
            model = nextModel;
            if (!game && phase === 'wait') {
                renderLine();
                renderGames();
            }
        },
        // 回复到达后不再开新局；已结算的一局稍作展示，未结算的等玩家完成或主动关闭。
        replyArrived() {
            if (phase === 'error') return false;
            if (!root || !game) return true;
            phase = 'exit';
            root.setAttribute('data-igs-waitstage-phase', phase);
            clearTimer();
            root.classList.add('is-exit');
            setNote('回复到了，玩完这局再回去。');
            settleRound();
            return false;
        },
        showFailure(kind = 'failed') {
            if (!root) return false;
            const failure = WAIT_STAGE_FAILURES[kind] || WAIT_STAGE_FAILURES.failed;
            phase = 'error';
            clearTimer();
            game = null;
            gameState = null;
            syncGameAttr();
            root.classList.remove('is-exit');
            root.classList.add('is-error');
            root.setAttribute('data-igs-waitstage-phase', phase);
            root.setAttribute('data-igs-waitstage-error', kind);
            root.setAttribute('role', 'alert');
            if (gamesRow) gamesRow.hidden = true;
            if (board) board.hidden = true;
            lineBox.hidden = false;
            lineBox.innerHTML = '';
            const mark = mountNode(doc, 'igs-ws-error-mark');
            mark.textContent = '!';
            mark.setAttribute('aria-hidden', 'true');
            const title = mountNode(doc, 'igs-ws-error-title');
            title.textContent = failure.title;
            lineBox.appendChild(mark);
            lineBox.appendChild(title);
            setNote(failure.text);
            actions.hidden = false;
            return true;
        },
        showSlow() {
            if (!root || phase !== 'wait') return;
            setNote('等待较久，尚未确认回复写完。请求可能仍在进行，可返回酒馆检查。');
            actions.hidden = false;
        },
        // 生成期间宿主每 150ms 报一次活动：层已经挂着就别重建，否则台词永远停在第一句、点开的小游戏会被抹掉。
        isOpen(host) {
            if (!root) return false;
            if (host && root.parentNode !== host) return false;
            return true;
        },
        close: closeRoot,
    };
}
