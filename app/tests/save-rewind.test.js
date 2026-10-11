import test from 'node:test';
import assert from 'node:assert/strict';
import { bootstrapIGS, createMemoryStorage } from '../src/index.js';
import { createIllustrationMessageHost } from '../src/host/illustration-message-host.js';
import { createReadingProgress, normalizeReadingData, truncateReadingData, textHash } from '../src/visual/igs-ui/reading-progress.js';
import { createRewindController, REWIND_PENDING_KEY } from '../src/visual/igs-ui/rewind.js';

// 存档重来：存档位字段迁移、截断进度、走酒馆 /branch-create、失败不改动、新分支里定位存档页。
function memoryStorage(initial = {}) {
    const map = new Map(Object.entries(initial));
    return {
        getItem: (key) => (map.has(key) ? map.get(key) : null),
        setItem: (key, value) => map.set(key, String(value)),
        removeItem: (key) => map.delete(key),
        map,
    };
}

function makeEnv({ run, chat, chatId = 'main-chat' } = {}) {
    const store = memoryStorage();
    const env = { chatId, calls: [] };
    const ctx = {
        chat: chat || [{ swipe_id: 0 }, { swipe_id: 0 }, { swipe_id: 1, swipes: ['a', 'b'] }, { swipe_id: 0 }],
        executeSlashCommandsWithOptions: run || (async (command) => { env.calls.push(command); env.chatId = 'main-chat - Branch #1'; return { pipe: 'main-chat - Branch #1' }; }),
    };
    const progress = createReadingProgress({ getChatId: () => env.chatId, storage: () => store });
    const controller = createRewindController({ getContext: () => ctx, getChatId: () => env.chatId, storage: () => store, progress });
    return { env, store, ctx, progress, controller };
}

test('存档位迁移：旧存档没有 swipe 也能读，新字段保留并过滤非法值', () => {
    const data = normalizeReadingData({
        slots: [
            { key: 'old', id: 3, page: 1, at: 5, name: '旧档', thumb: '/a.png', place: '教室' },
            { key: 'new', id: 6, page: 0, at: 9, swipe: 2, hash: 'h', thumb: 'user/images/x.png' },
            { key: 'bad', id: 7, page: 0, at: 9, swipe: -1 },
        ],
    });
    const by = Object.fromEntries(data.slots.map((slot) => [slot.key, slot]));
    assert.equal(by.old.swipe, null);
    assert.equal(by.old.place, '教室');
    assert.equal(by.new.swipe, 2);
    assert.equal(by.new.thumb, 'user/images/x.png');
    assert.equal(by.bad.swipe, null);
});

test('存档位记录楼层、版本、哈希、地点和缩略图', () => {
    const { progress } = makeEnv();
    const result = progress.saveSlot({ id: 2, page: 1, head: '头', hash: textHash('正文'), thumb: 'https://x/bg.png', place: '天台', swipe: 1 });
    assert.equal(result.ok, true);
    const slot = progress.listSlots()[0];
    assert.deepEqual([slot.id, slot.swipe, slot.hash, slot.place, slot.thumb], [2, 1, textHash('正文'), '天台', 'https://x/bg.png']);
});

test('截断进度：只留存档楼及之前，最近位置落在存档页', () => {
    const raw = {
        last: { id: 9, page: 0, at: 1 }, far: { id: 9, page: 0, at: 1 }, read: '0-9', partial: { 4: 1, 8: 2 },
        chapters: { 0: '教室', 6: '天台' },
        slots: [{ key: 'a', id: 2, page: 0, at: 1 }, { key: 'b', id: 8, page: 0, at: 1 }],
        quick: { id: 8, page: 0, at: 1 },
    };
    const cut = truncateReadingData(raw, 4, { id: 4, page: 1, head: 'h', hash: 'x' });
    assert.equal(cut.read, '0-4');
    assert.deepEqual(Object.keys(cut.partial), ['4']);
    assert.deepEqual(Object.keys(cut.chapters), ['0']);
    assert.deepEqual(cut.slots.map((slot) => slot.key), ['a']);
    assert.equal(cut.quick, null);
    assert.deepEqual([cut.last.id, cut.last.page, cut.far.id], [4, 1, 4]);
    assert.equal(raw.read, '0-9', '入参不被改');
});

test('重来：调用 /branch-create 且楼号正确，成功后留下待办', async () => {
    const { env, store, controller, progress } = makeEnv();
    progress.notePage({ id: 3, page: 0, total: 1, text: '正文', floorText: '正文' });
    const result = await controller.rewind({ id: 3, page: 0, head: 'h', hash: 'x', swipe: 0 });
    assert.equal(result.ok, true);
    assert.deepEqual(env.calls, ['/branch-create 3']);
    const pending = JSON.parse(store.getItem(REWIND_PENDING_KEY));
    assert.equal(pending.from, 'main-chat');
    assert.equal(pending.pos.id, 3);
});

test('重来带 swipe：该楼当前版本一致才建分支，不一致不改动', async () => {
    const same = makeEnv();
    assert.equal((await same.controller.rewind({ id: 2, page: 0, swipe: 1 })).ok, true);
    assert.deepEqual(same.env.calls, ['/branch-create 2']);

    const diff = makeEnv();
    const result = await diff.controller.rewind({ id: 2, page: 0, swipe: 0 });
    assert.deepEqual([result.ok, result.reason], [false, 'swipe-changed']);
    assert.deepEqual(diff.env.calls, []);
    assert.equal(diff.store.getItem(REWIND_PENDING_KEY), null);
});

test('失败不改动：接口缺失、楼不存在、分支没建成都不留待办', async () => {
    const noApi = makeEnv();
    delete noApi.ctx.executeSlashCommandsWithOptions;
    assert.equal((await noApi.controller.rewind({ id: 1, page: 0 })).reason, 'branch-unsupported');
    assert.equal(noApi.store.getItem(REWIND_PENDING_KEY), null);

    const missing = makeEnv();
    assert.equal((await missing.controller.rewind({ id: 99, page: 0 })).reason, 'floor-missing');
    assert.deepEqual(missing.env.calls, []);

    const empty = makeEnv({ run: async () => ({ pipe: '' }) });
    const failed = await empty.controller.rewind({ id: 1, page: 0 });
    assert.deepEqual([failed.ok, failed.reason], [false, 'branch-failed']);
    assert.equal(empty.store.getItem(REWIND_PENDING_KEY), null);

    const thrown = makeEnv({ run: async () => { throw new Error('boom'); } });
    assert.equal((await thrown.controller.rewind({ id: 1, page: 0 })).reason, 'branch-failed');
    assert.equal(thrown.store.getItem(REWIND_PENDING_KEY), null);
    assert.equal(thrown.env.chatId, 'main-chat');
});

test('待办只在聊天换了之后取走，并导入截断进度', async () => {
    const { env, controller, progress, store } = makeEnv({ run: async () => ({ pipe: 'b' }) });
    for (const id of [0, 1, 2, 3]) progress.notePage({ id, page: 0, total: 1, text: `t${id}`, floorText: `t${id}` });
    await controller.rewind({ id: 1, page: 0, head: 't1', hash: textHash('t1') });
    assert.equal(controller.consumePending(), null, '聊天还没换不取');
    assert.ok(store.getItem(REWIND_PENDING_KEY));
    env.chatId = 'b';
    const target = controller.consumePending();
    assert.equal(target.id, 1);
    assert.equal(store.getItem(REWIND_PENDING_KEY), null);
    assert.equal(progress.load().read, '0-1');
});

test('阅读器切到新分支后定位存档页', async () => {
    const messages = [0, 2, 4, 6].map((id) => ({ id, text: `[角色: 艾莉]\n艾莉: 第${id}楼第一句。\n第${id}楼第二句。\n第${id}楼第三句。` }));
    const storage = createMemoryStorage({});
    const global = { localStorage: storage };
    const progress = createReadingProgress({ getChatId: () => 'old-chat', storage: () => storage });
    for (const id of [0, 2, 4, 6]) progress.notePage({ id, page: 2, total: 3, text: 'x', floorText: 'x' });
    const ctx = { chat: messages.map(() => ({ swipe_id: 0 })), executeSlashCommandsWithOptions: async () => ({ pipe: 'new-chat' }) };
    const controller = createRewindController({ getContext: () => ctx, getChatId: () => 'old-chat', storage: () => storage, progress });
    // chat[2] 对应楼号 2 的存档；这里直接模拟切换前写下的待办。
    assert.equal((await controller.rewind({ id: 2, page: 1, head: '', hash: '' })).ok, true);

    const vn = bootstrapIGS({
        global,
        autoAttachMagicWand: false,
        illustrationMessageHost: { ...createIllustrationMessageHost(global), getChatId: () => 'new-chat' },
        hostAdapter: {
            getCurrentMessage: async () => messages[messages.length - 1],
            getMessageById: async (messageId) => messages.find((message) => message.id === Number(messageId)) || null,
            getAdjacentMessage: async (messageId, delta) => {
                const index = messages.findIndex((message) => message.id === Number(messageId));
                return index < 0 ? null : messages[index + (delta < 0 ? -1 : 1)] || null;
            },
            listTurns: async () => messages,
            typeAndSend: async () => ({ ok: true }),
        },
    });
    await vn.openLatestAvailable('pc');
    await new Promise((resolve) => setTimeout(resolve, 900));
    const active = vn.getState().igsUi.activeReader;
    assert.equal(active.snapshot.messageId, 2);
    assert.equal(active.snapshot.content.currentIndex, 1);
    assert.equal(storage.getItem(REWIND_PENDING_KEY), null);
    const stored = JSON.parse(storage.getItem('igs-reading:new-chat'));
    assert.ok(!String(stored.read).includes('6'), '新分支进度不含存档楼之后');
    vn.destroy();
});

function withBranchApi(env, api) {
    const store = memoryStorage();
    const ctx = {
        chat: [{ swipe_id: 0 }, { swipe_id: 1, swipes: ['a', 'b', 'c'] }],
        executeSlashCommandsWithOptions: async (command) => { env.calls.push(command); env.chatId = 'main-chat - Branch #1'; return { pipe: 'main-chat - Branch #1' }; },
    };
    const progress = createReadingProgress({ getChatId: () => env.chatId, storage: () => store });
    const controller = createRewindController({ getContext: () => ctx, getChatId: () => env.chatId, storage: () => store, progress, loadBranchApi: api });
    return { store, progress, controller };
}

test('版本不同：新版酒馆能按旧版本建分支就不用斜杠命令，原聊天不动', async () => {
    const env = { chatId: 'main-chat', calls: [] };
    const branchCalls = [];
    const api = {
        async branchChat(mesId, { swipeId = null } = {}) { branchCalls.push([mesId, swipeId]); env.chatId = 'main-chat - Branch #1'; return 'main-chat - Branch #1'; },
    };
    const { controller, store } = withBranchApi(env, async () => api);
    const result = await controller.rewind({ id: 1, page: 2, head: 'h', hash: 'x', swipe: 0 });
    assert.equal(result.ok, true);
    assert.deepEqual(branchCalls, [[1, 0]]);
    assert.deepEqual(env.calls, []);
    const pending = JSON.parse(store.getItem(REWIND_PENDING_KEY));
    assert.equal(pending.branch, 'main-chat - Branch #1');
    assert.equal(pending.pos.page, 2, '旧版本建分支，页码和文字特征保留');
});

test('版本不同：读不到新版分支接口或不支持版本参数，拒绝并允许改用当前版本', async () => {
    for (const api of [async () => null, async () => ({ branchChat: async (mesId) => String(mesId) }), async () => { throw new Error('x'); }]) {
        const env = { chatId: 'main-chat', calls: [] };
        const { controller, store } = withBranchApi(env, api);
        const result = await controller.rewind({ id: 1, page: 2, head: 'h', hash: 'x', swipe: 0 });
        assert.deepEqual([result.ok, result.reason, result.canUseCurrent], [false, 'swipe-changed', true]);
        assert.deepEqual(env.calls, []);
        assert.equal(store.getItem(REWIND_PENDING_KEY), null);
    }
    // 存档的版本在这一楼已不存在，也不能按旧版本建。
    const env = { chatId: 'main-chat', calls: [] };
    const okApi = { async branchChat(mesId, { swipeId = null } = {}) { return `b${mesId}${swipeId}`; } };
    const { controller } = withBranchApi(env, async () => okApi);
    assert.equal((await controller.rewind({ id: 1, page: 0, swipe: 7 })).reason, 'swipe-changed');
});

test('用当前版本重来：走 /branch-create，定位只按楼不按页', async () => {
    const env = { chatId: 'main-chat', calls: [] };
    const { controller, store } = withBranchApi(env, async () => null);
    const result = await controller.rewind({ id: 1, page: 2, head: 'h', hash: 'x', swipe: 0, useCurrentSwipe: true });
    assert.equal(result.ok, true);
    assert.deepEqual(env.calls, ['/branch-create 1']);
    const pending = JSON.parse(store.getItem(REWIND_PENDING_KEY));
    assert.deepEqual([pending.pos.id, pending.pos.page, pending.pos.head, pending.pos.hash], [1, 0, '', '']);
});

test('待办消费：只认分支名、超时作废、原聊天不取，并整体替换被分支带过来的未来进度', async () => {
    const env = { chatId: 'main-chat', calls: [] };
    let clock = 1000;
    const store = memoryStorage();
    const ctx = { chat: [{ swipe_id: 0 }, { swipe_id: 0 }, { swipe_id: 0 }], executeSlashCommandsWithOptions: async () => ({ pipe: 'main-chat - Branch #1' }) };
    const progress = createReadingProgress({ getChatId: () => env.chatId, storage: () => store });
    const controller = createRewindController({ getContext: () => ctx, getChatId: () => env.chatId, storage: () => store, progress, now: () => clock });
    for (const id of [0, 1, 2]) progress.notePage({ id, page: 0, total: 1, text: `t${id}`, floorText: `t${id}` });
    assert.equal((await controller.rewind({ id: 1, page: 0 })).ok, true);

    env.chatId = 'other-card - 2026';
    assert.equal(controller.consumePending(), null, '别的聊天不误取');
    assert.ok(store.getItem(REWIND_PENDING_KEY), '没取走就还在，等超时');

    env.chatId = 'main-chat - Branch #1';
    // 酒馆把原聊天元数据整份带进分支：新聊天里先被合并了存档楼之后的已读。
    progress.importData({ read: '0-2', far: { id: 2, page: 0, at: 5 }, slots: [{ key: 'late', id: 2, page: 0, at: 5 }] });
    assert.equal(progress.load().read, '0-2');
    const target = controller.consumePending();
    assert.equal(target.id, 1);
    const data = progress.load();
    assert.equal(data.read, '0-1');
    assert.deepEqual(data.slots.map((slot) => slot.key), []);
    assert.equal(data.far.id, 1);

    // 超时作废。
    const env2 = { chatId: 'main-chat', calls: [] };
    const store2 = memoryStorage();
    const progress2 = createReadingProgress({ getChatId: () => env2.chatId, storage: () => store2 });
    const controller2 = createRewindController({ getContext: () => ctx, getChatId: () => env2.chatId, storage: () => store2, progress: progress2, now: () => clock });
    await controller2.rewind({ id: 1, page: 0 });
    clock += 11 * 60 * 1000;
    env2.chatId = 'main-chat - Branch #1';
    assert.equal(controller2.consumePending(), null);
    assert.equal(store2.getItem(REWIND_PENDING_KEY), null);
});
