// 存档重来：以存档楼为终点，用酒馆原生「分支」建新聊天并切过去，原聊天原样保留，不删任何消息。
// 酒馆前端上下文没有直接导出分支函数：默认走斜杠命令 /branch-create <楼号>（建分支并自动打开，按该楼当前版本复制）；
// 存档时的版本与现在不同，则尝试动态载入酒馆 bookmarks.js 的 branchChat(楼号, { swipeId })，新版才有该参数，没有就让用户改用当前版本。
// 切换前先把「截到存档楼的阅读进度 + 目标位置」写进 localStorage 待办；新聊天里阅读器打开时取走待办，导入进度并定位到存档页。
// 数据库插件的表格数据存在每楼消息里（TavernDB_ACU_IsolatedData），随分支快照自然回退，这里不处理。
import { truncateReadingData } from './reading-progress.js';

export const REWIND_PENDING_KEY = 'igs-rewind-pending';
export const REWIND_PENDING_TTL_MS = 10 * 60 * 1000;
export const REWIND_NOTICE = '已从此处开始新分支，原剧情保留在原聊天';

export const REWIND_FAIL_TEXT = {
    'no-context': '读不到酒馆环境，没有做任何修改',
    'no-chat': '当前没有打开聊天，没有做任何修改',
    'branch-unsupported': '当前酒馆版本不支持分支，没有做任何修改',
    'floor-missing': '这一楼已不存在，没有做任何修改',
    'swipe-changed': '存档之后这一楼换过版本，酒馆无法按旧版本建分支。可以改用现在的版本重来，没有做任何修改',
    'branch-failed': '分支没有建成，没有做任何修改',
};

export function createRewindController(options = {}) {
    const getContext = () => { try { return options.getContext?.() || null; } catch (_) { return null; } };
    const getChatId = () => { try { return String(options.getChatId?.() || ''); } catch (_) { return ''; } };
    const storage = () => { try { return options.storage?.() || null; } catch (_) { return null; } };
    const now = () => (typeof options.now === 'function' ? options.now() : Date.now());
    const progress = options.progress;
    // 酒馆的分支模块（bookmarks.js）：能按指定版本建分支的新版才有 swipeId 参数，读不到就走斜杠命令。
    const loadBranchApi = async () => { try { return (await options.loadBranchApi?.()) || null; } catch (_) { return null; } };
    const sameChat = (a, b) => String(a || '').replace(/\.jsonl$/i, '') === String(b || '').replace(/\.jsonl$/i, '');

    function clearPending() {
        try { storage()?.removeItem(REWIND_PENDING_KEY); } catch (_) { /* 没有存储时无待办可清 */ }
    }

    // pos：{ id, page, head, hash, swipe? }。失败一律不改动：先全部检查，再写待办，再建分支。
    async function rewind(pos) {
        const fail = (reason) => ({ ok: false, reason, text: REWIND_FAIL_TEXT[reason] || REWIND_FAIL_TEXT['branch-failed'] });
        const ctx = getContext();
        if (!ctx || !Array.isArray(ctx.chat)) return fail('no-context');
        const run = typeof ctx.executeSlashCommandsWithOptions === 'function' ? ctx.executeSlashCommandsWithOptions
            : typeof ctx.executeSlashCommands === 'function' ? ctx.executeSlashCommands : null;
        if (!run) return fail('branch-unsupported');
        const chatId = getChatId();
        const store = storage();
        if (!chatId || !store) return fail('no-chat');
        const id = Number(pos && pos.id);
        const message = Number.isInteger(id) && id >= 0 ? ctx.chat[id] : null;
        if (!message) return fail('floor-missing');
        const wantSwipe = pos.swipe != null && pos.swipe !== '' ? Number(pos.swipe) : null;
        const haveSwipe = Number.isInteger(Number(message.swipe_id)) && message.swipe_id != null ? Number(message.swipe_id) : null;
        const swipeDiffers = wantSwipe != null && haveSwipe != null && wantSwipe !== haveSwipe;
        // 存档时的版本和现在不同：优先让酒馆按旧版本建分支（不动原聊天当前显示）；做不到再让用户选「用现在的版本」。
        let branchApi = null;
        let usedCurrent = false;
        if (swipeDiffers) {
            if (pos.useCurrentSwipe === true) {
                usedCurrent = true;
            } else {
                const api = await loadBranchApi();
                const supported = api && typeof api.branchChat === 'function' && String(api.branchChat).includes('swipeId');
                const exists = Array.isArray(message.swipes) && wantSwipe >= 0 && wantSwipe < message.swipes.length;
                if (!supported || !exists) return { ...fail('swipe-changed'), canUseCurrent: true };
                branchApi = api;
            }
        }

        // 用现在的版本重来时，存档页的文字对不上，只按楼定位到第一页。
        const target = usedCurrent
            ? { id, page: 0, head: '', hash: '', at: now() }
            : { id, page: Math.max(0, Number(pos.page) || 0), head: pos.head || '', hash: pos.hash || '', at: now() };
        try {
            const seed = truncateReadingData(progress.exportData(), id, target);
            store.setItem(REWIND_PENDING_KEY, JSON.stringify({ from: chatId, pos: target, seed, at: now() }));
        } catch (_) {
            clearPending();
            return fail('no-chat');
        }
        let result = null;
        try {
            if (branchApi) {
                const name = await branchApi.branchChat(id, { swipeId: wantSwipe });
                result = { pipe: name == null ? '' : name };
            } else {
                result = await run.call(ctx, `/branch-create ${id}`, { showOutput: false });
            }
        } catch (_) {
            result = null;
        }
        const branch = result && !result.isError && !result.isAborted ? String(result.pipe ?? '').trim() : '';
        if (!branch) {
            clearPending();
            return fail('branch-failed');
        }
        // 记下分支名：新聊天打开时只在名字对得上的聊天里取走待办。
        try {
            const saved = JSON.parse(store.getItem(REWIND_PENDING_KEY) || 'null');
            if (saved && typeof saved === 'object') store.setItem(REWIND_PENDING_KEY, JSON.stringify({ ...saved, branch }));
        } catch (_) { /* 记不上分支名时退回只比较聊天是否已换 */ }
        return { ok: true, branch, id };
    }

    // 新聊天里阅读器打开时调用：有待办且聊天已换，就导入进度并返回要定位的位置；否则返回 null。
    function consumePending() {
        const store = storage();
        if (!store) return null;
        let pending = null;
        try { pending = JSON.parse(store.getItem(REWIND_PENDING_KEY) || 'null'); } catch (_) { pending = null; }
        if (!pending || typeof pending !== 'object') return null;
        if (now() - (Number(pending.at) || 0) > REWIND_PENDING_TTL_MS) { clearPending(); return null; }
        const chatId = getChatId();
        if (!chatId || sameChat(chatId, pending.from)) return null;
        // 已知分支名就只认那个聊天；用户在切换途中又进了别的聊天，不误取，等超时作废。
        if (pending.branch && !sameChat(chatId, pending.branch)) return null;
        clearPending();
        // 酒馆会把原聊天的元数据整份带进分支（含存档楼之后的阅读进度），所以用截断后的进度整体替换，而不是合并。
        try { progress.replaceData(pending.seed); } catch (_) { /* 进度导不进也要定位 */ }
        return pending.pos || null;
    }

    return { rewind, consumePending };
}
