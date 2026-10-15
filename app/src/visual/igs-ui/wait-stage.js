// 等待过场：五种阅读器模式共用一层黑屏 + 一句短台词。台词把「最近几楼的台词回放」和「通用兜底」混在一池轮换。
export const WAIT_STAGE_DEFAULTS = Object.freeze({
    enabled: true,
    games: true,
    voice: true,
    lineSeconds: 6,
});

export function normalizeWaitStageSettings(value) {
    const src = value && typeof value === 'object' ? value : {};
    const seconds = Number(src.lineSeconds);
    return {
        enabled: src.enabled !== false,
        games: src.games !== false,
        voice: src.voice !== false,
        lineSeconds: Number.isFinite(seconds) ? Math.min(16, Math.max(3, Math.round(seconds))) : WAIT_STAGE_DEFAULTS.lineSeconds,
    };
}

export const WAIT_STAGE_FALLBACK_LINES = Object.freeze([
    '还在努力写作…',
    '正在斟酌下一句…',
    '笔尖停了一下，马上就好…',
    '故事还在路上…',
    '正在把这一幕写完…',
    '再等一下，就快写到了…',
    '情节正往前挪…',
    '正写得入神，别急…',
]);

export const WAIT_STAGE_FAILURES = Object.freeze({
    empty: { title: '这次没有写出正文', text: '请求已经结束，但没有收到可阅读的回复。请返回酒馆重新生成。' },
    failed: { title: '这次回复失败了', text: '没有收到完整回复。请返回酒馆检查连接或模型报错，再重新生成。' },
    stopped: { title: '回复已停止', text: '这次生成被中止了，尚未切换到下一楼。' },
    read: { title: '回复没能打开', text: '读取或显示回复时出错了。当前楼仍保留，请稍后重新打开最新一楼。' },
    send: { title: '消息没有发出去', text: '发送失败了，输入内容已保留。请返回当前楼后重试。' },
});

export const WAIT_STAGE_GAME_LINES = Object.freeze({
    win: ['……这局算你的。', '运气不错嘛。', '好吧，你赢了。', '再来，我不信了。'],
    lose: ['承让了。', '还是我比较稳。', '再来一局？', '下次可别怪我不客气。'],
    draw: ['想到一块去了。', '平手，再来。', '这么巧？'],
    right: ['答对了。', '没错，是我说的。', '记得挺清楚嘛。'],
    wrong: ['……不是这句。', '再想想？', '记岔了吧。'],
    start: ['闲着也是闲着，来一局？', '要不要玩点什么？', '等着的工夫，来一把？'],
});

export function waitStageGameLine(kind, random = Math.random) {
    const pool = WAIT_STAGE_GAME_LINES[kind] || WAIT_STAGE_GAME_LINES.start;
    return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}

function shuffle(list, random) {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        const swap = out[i];
        out[i] = out[j];
        out[j] = swap;
    }
    return out;
}

// 一条角色台词接一条通用口吻，不让回放连着刷屏；回放不够时全靠兜底。
export function weaveWaitStageLines(replay = [], fallback = WAIT_STAGE_FALLBACK_LINES, options = {}) {
    const random = typeof options.random === 'function' ? options.random : Math.random;
    const limit = Number.isFinite(options.limit) ? Math.max(1, Math.round(options.limit)) : 14;
    const quoted = shuffle(replay.filter((line) => line && String(line.text || '').trim()), random);
    const plain = shuffle(fallback.slice(), random);
    const out = [];
    let qi = 0;
    let pi = 0;
    while (out.length < limit && (qi < quoted.length || pi < plain.length)) {
        if (qi < quoted.length) out.push(quoted[qi++]);
        if (out.length < limit && pi < plain.length) out.push({ who: '', text: plain[pi++] });
    }
    return out;
}

export const WAIT_STAGE_GAMES = Object.freeze(['rps', 'whosaid', 'memory', 'mood']);

export const WAIT_STAGE_GAME_LABELS = Object.freeze({
    rps: '猜拳',
    whosaid: '这句是谁说的',
    memory: '翻牌配对',
    mood: '心情猜猜',
});

// 只有素材够玩时才列出对应的游戏；都不够就只剩猜拳（不需要任何素材）。
export function availableWaitStageGames(art = {}, lines = [], extraNames = []) {
    // 翻牌按去重后的图算：同一张图重复只算一对，否则列出来也翻不出几手。
    const pictures = new Set((Array.isArray(art.pictures) ? art.pictures : [])
        .map((item) => String(item && item.url || '').trim())
        .filter(Boolean));
    const sprites = Array.isArray(art.sprites) ? art.sprites.filter((item) => item && item.url) : [];
    const names = new Set();
    for (const line of lines) {
        const who = String((line && line.who) || '').trim();
        if (who) names.add(who);
    }
    for (const name of Array.isArray(extraNames) ? extraNames : []) {
        if (String(name || '').trim()) names.add(String(name).trim());
    }
    const moods = new Set(sprites.map((item) => String(item.mood || '').trim()).filter(Boolean));
    const quotedCount = lines.filter((line) => line && String(line.text || '').trim() && String(line.who || '').trim()).length;
    return WAIT_STAGE_GAMES.filter((id) => {
        if (id === 'rps') return true;
        if (id === 'whosaid') return quotedCount >= 1 && names.size >= 2;
        if (id === 'memory') return pictures.size >= 3;
        return sprites.length >= 2 && moods.size >= 2;
    });
}

export const WAIT_STAGE_STYLE_TEXT = `
@keyframes igs-ws-in{0%{opacity:0;}100%{opacity:1;}}
@keyframes igs-ws-out{0%{opacity:1;}100%{opacity:0;}}
@keyframes igs-ws-rise{0%{opacity:0;transform:translateY(8px);}100%{opacity:1;transform:translateY(0);}}
@keyframes igs-ws-pulse{0%,100%{opacity:.5;transform:scale(1);}50%{opacity:1;transform:scale(1.06);}}
@keyframes igs-ws-flip{0%{transform:rotateY(90deg);opacity:.2;}100%{transform:rotateY(0);opacity:1;}}
.igs-waitstage{position:relative;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px;overflow:hidden;width:100%;height:100%;background:radial-gradient(ellipse at center,color-mix(in srgb,var(--igs-empty-bg,#16181a) 78%,transparent) 0%,color-mix(in srgb,var(--igs-empty-bg,#16181a) 95%,transparent) 100%);-webkit-backdrop-filter:blur(18px) saturate(.92);backdrop-filter:blur(18px) saturate(.92);color:var(--igs-bar-ink,#e8e5df);font-family:inherit;text-align:center;pointer-events:auto;animation:igs-ws-in .42s ease-out both;transition:background .35s ease;}
#igs-overlay .igs-waitstage{position:absolute;inset:0;z-index:6;border-radius:0;}
.igs-waitstage.igs-embedded-loading{min-height:220px;border-radius:6px;}
.igs-waitstage.igs-ws-closing{animation:igs-ws-out .32s ease-in both;pointer-events:none;}
.igs-waitstage.is-exit{background:radial-gradient(ellipse at center,color-mix(in srgb,var(--igs-empty-bg,#16181a) 68%,transparent) 0%,color-mix(in srgb,var(--igs-empty-bg,#16181a) 90%,transparent) 100%);-webkit-backdrop-filter:blur(22px) saturate(1);backdrop-filter:blur(22px) saturate(1);}
.igs-waitstage.is-error .igs-ws-dots{display:none;}
.igs-waitstage.is-error{justify-content:flex-start;overflow:auto;}
.igs-waitstage.is-error .igs-ws-body{flex-shrink:0;margin:auto 0;}
.igs-ws-error-mark{display:flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:50%;background:color-mix(in srgb,#d98d83 14%,transparent);color:#e4aca3;font-size:24px;animation:igs-ws-rise .4s ease-out both;}
.igs-ws-error-title{font-size:18px;line-height:1.5;letter-spacing:.06em;}
.igs-ws-actions{display:flex;justify-content:center;margin-top:6px;}
.igs-ws-actions[hidden],.igs-ws-line[hidden]{display:none;}
.igs-ws-body{display:flex;flex-direction:column;align-items:center;gap:14px;width:100%;max-width:min(520px,92%);animation:igs-ws-rise .5s ease-out both;}
.igs-ws-dots{display:flex;align-items:center;justify-content:center;gap:6px;color:currentColor;}
.igs-ws-dots .igs-embedded-loading-dot{width:6px;height:6px;border-radius:50%;background:currentColor;opacity:.35;animation:igs-embedded-pulse 1.1s ease-in-out infinite;}
.igs-ws-dots .igs-embedded-loading-dot:nth-child(2){animation-delay:.18s;}
.igs-ws-dots .igs-embedded-loading-dot:nth-child(3){animation-delay:.36s;}
.igs-waitstage.is-exit .igs-ws-dots .igs-embedded-loading-dot{animation-duration:.7s;}
.igs-ws-line{display:flex;flex-direction:column;align-items:center;gap:6px;min-height:3.4em;justify-content:center;}
.igs-ws-quote{max-width:100%;color:var(--igs-bar-ink,#e8e5df);font-size:15px;line-height:1.7;letter-spacing:.04em;text-wrap:pretty;animation:igs-ws-rise .45s ease-out both;}
.igs-ws-quote::before{content:"「";opacity:.42;}
.igs-ws-quote::after{content:"」";opacity:.42;}
.igs-ws-who{font-size:11px;letter-spacing:.16em;opacity:.5;}
.igs-ws-note{color:color-mix(in srgb,var(--igs-bar-ink,#e8e5df) 62%,transparent);font-size:13px;line-height:1.7;letter-spacing:.14em;animation:igs-ws-rise .45s ease-out both;}
.igs-ws-games{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;margin-top:-2px;}
.igs-ws-chip{box-sizing:border-box;height:30px;padding:0 14px;border:0;border-radius:999px;background:color-mix(in srgb,var(--igs-bar-ink,#fff) 9%,transparent);color:inherit;font:inherit;font-size:12px;letter-spacing:.08em;cursor:pointer;transition:background .18s ease,opacity .18s ease;}
.igs-ws-chip:hover{background:color-mix(in srgb,var(--igs-bar-ink,#fff) 18%,transparent);}
.igs-ws-chip.is-on{background:color-mix(in srgb,var(--igs-bar-ink,#fff) 22%,transparent);font-weight:600;}
.igs-ws-chip.is-off{opacity:.4;cursor:default;}
.igs-ws-board{box-sizing:border-box;display:flex;flex-direction:column;align-items:center;gap:10px;width:100%;max-width:min(440px,94%);padding:16px;border-radius:14px;background:color-mix(in srgb,var(--igs-dialog-bg,#1f2225) 72%,transparent);box-shadow:0 10px 30px rgba(0,0,0,.28);animation:igs-ws-rise .38s ease-out both;}
.igs-ws-games[hidden],.igs-ws-board[hidden]{display:none;}
.igs-ws-board-head{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;color:color-mix(in srgb,var(--igs-bar-ink,#e8e5df) 60%,transparent);font-size:11px;letter-spacing:.14em;}
.igs-ws-close{border:0;background:transparent;color:inherit;font:inherit;font-size:14px;line-height:1;cursor:pointer;opacity:.6;}
.igs-ws-close:hover{opacity:1;}
.igs-ws-status{min-height:2.6em;display:flex;align-items:center;justify-content:center;color:var(--igs-bar-ink,#e8e5df);font-size:13px;line-height:1.6;letter-spacing:.06em;}
.igs-ws-hands,.igs-ws-choices{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;}
.igs-ws-hands .igs-ws-chip,.igs-ws-choices .igs-ws-chip{height:34px;padding:0 18px;font-size:13px;}
.igs-ws-grid{display:grid;grid-template-columns:repeat(var(--igs-ws-cols,4),1fr);gap:8px;width:100%;}
.igs-ws-card{position:relative;box-sizing:border-box;aspect-ratio:3/4;border:0;padding:0;border-radius:8px;overflow:hidden;background:color-mix(in srgb,var(--igs-bar-ink,#fff) 10%,transparent);cursor:pointer;transition:background .18s ease,opacity .3s ease;}
.igs-ws-card:hover{background:color-mix(in srgb,var(--igs-bar-ink,#fff) 18%,transparent);}
.igs-ws-card.is-open{background:color-mix(in srgb,var(--igs-dialog-bg,#1f2225) 60%,transparent);cursor:default;}
.igs-ws-card img{display:block;width:100%;height:100%;object-fit:cover;object-position:50% 12%;animation:igs-ws-flip .3s ease-out both;}
.igs-ws-card.is-done{opacity:.42;}
.igs-ws-card::after{content:"";position:absolute;inset:0;border-radius:8px;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--igs-bar-ink,#fff) 12%,transparent);pointer-events:none;}
.igs-ws-card:not(.is-open)::after{background:repeating-linear-gradient(135deg,transparent 0 6px,color-mix(in srgb,var(--igs-bar-ink,#fff) 5%,transparent) 6px 12px);}
.igs-ws-face{display:flex;align-items:center;justify-content:center;width:100%;}
.igs-ws-face img{display:block;max-height:34vh;max-width:100%;object-fit:contain;border-radius:10px;}
@media (prefers-reduced-motion: reduce){
.igs-waitstage,.igs-ws-body,.igs-ws-board,.igs-ws-note,.igs-ws-quote,.igs-ws-error-mark{animation:none!important;}
.igs-ws-dots .igs-embedded-loading-dot{animation:none!important;opacity:.6;}
}
`;
