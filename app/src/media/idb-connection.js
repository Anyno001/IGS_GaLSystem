import { recoverOperation, linkRecoverySignals } from '../storage/automatic-recovery.js';
// IndexedDB 自己报告完成或错误；计时和被其它连接占用不丢开原请求。
// 失效连接真正重开后继续原事务，关闭所有者则取消所属打开/事务等待。
export const IDB_OPEN_TIMEOUT_MS = 8000;
export const IDB_TX_TIMEOUT_MS = 20000;

export function createIdbConnection(idb, name, version, upgrade, options = {}) {
    const openTimeout = Number(options.openTimeoutMs) > 0 ? Number(options.openTimeoutMs) : IDB_OPEN_TIMEOUT_MS;
    let current = null, epoch = 0, recoveryController = new AbortController();
    const reset = (attempt) => { if (!attempt || current === attempt) current = null; };

    function open() {
        if (current) return current;
        const ownerSignal = recoveryController.signal;
        const attempt = new Promise((resolve, reject) => {
            let settled = false;
            let timer = null;
            const finish = (ok, value) => {
                if (settled) return;
                settled = true;
                if (timer) clearTimeout(timer);
                ownerSignal.removeEventListener('abort', abort);
                (ok ? resolve : reject)(value);
            };
            const abort = () => finish(false, Object.assign(new Error('media-stopped'), { name: 'AbortError' }));
            ownerSignal.addEventListener('abort', abort, { once: true });
            if (ownerSignal.aborted) { abort(); return; }
            timer = setTimeout(() => { try { options.onSlow?.({ database: name, phase: 'open' }); } catch {} }, openTimeout);
            let versionError = null;
            const failed = error => {
                // 仅调用方确认可兼容的库重开现有版本；不降级、不删库，也不重跑升级迁移。
                if (!versionError && error?.name === 'VersionError' && typeof options.acceptNewerVersion === 'function') {
                    versionError = error;
                    requestOpen();
                } else finish(false, error);
            };
            const requestOpen = () => {
                if (settled) return;
                let req;
                try { req = versionError ? idb.open(name) : idb.open(name, version); }
                catch (error) { failed(error); return; }
                req.onupgradeneeded = event => { if (typeof upgrade === 'function') upgrade(req.result, req.transaction, event?.oldVersion || 0); };
                req.onblocked = () => { try { options.onSlow?.({ database: name, phase: 'blocked' }); } catch {} };
                req.onerror = () => failed(req.error || new Error(`${name} 打开失败`));
                req.onsuccess = () => {
                    const db = req.result;
                    if (settled) { try { db.close(); } catch {} return; }
                    if (versionError) {
                        let compatible = false;
                        try { compatible = options.acceptNewerVersion(db) === true; } catch {}
                        if (!compatible) { try { db.close(); } catch {} finish(false, versionError); return; }
                    }
                    db.onversionchange = () => { try { db.close(); } catch { /* 已关闭 */ } reset(attempt); };
                    db.onclose = () => reset(attempt);
                    finish(true, db);
                };
            };
            requestOpen();
        });
        current = attempt;
        attempt.catch(() => reset(attempt));
        return attempt;
    }

    // fn(tx) 返回 IDBRequest（取其 result）或无参函数（事务完成时求值）。
    async function transactOnce(storeNames, mode, fn, txOptions = {}) {
        const timeout = Number(txOptions.timeoutMs) > 0 ? Number(txOptions.timeoutMs) : IDB_TX_TIMEOUT_MS;
        const attempt = open();
        const db = await attempt;
        if (txOptions.signal?.aborted) throw Object.assign(new Error('media-stopped'), { name: 'AbortError' });
        return new Promise((resolve, reject) => {
            let tx;
            try { tx = db.transaction(storeNames, mode); } catch (error) {
                reset(attempt); try { db.close(); } catch {} reject(error); return;
            }
            let out;
            try { out = fn(tx); } catch (error) { try { tx.abort(); } catch { /* 已结束 */ } reject(error); return; }
            const abort = () => { try { tx.abort(); } catch {} };
            const cleanup = () => { clearTimeout(timer); txOptions.signal?.removeEventListener('abort', abort); };
            const timer = setTimeout(() => { try { options.onSlow?.({ database: name, phase: 'transaction' }); } catch {} }, timeout);
            txOptions.signal?.addEventListener('abort', abort, { once: true });
            tx.oncomplete = () => {
                cleanup();
                try { resolve(typeof out === 'function' ? out() : (out ? out.result : undefined)); } catch (error) { reject(error); }
            };
            tx.onerror = () => { cleanup(); reject(tx.error || new Error(`${name} 读写失败`)); };
            tx.onabort = () => { cleanup(); reject(tx.error || new Error(`${name} 读写被中止`)); };
            if (txOptions.signal?.aborted) abort();
        });
    }

    async function transact(storeNames, mode, fn, txOptions = {}) {
        const generation = epoch;
        const linked = linkRecoverySignals([recoveryController.signal, txOptions.signal]);
        let value;
        try { value = await recoverOperation(() => transactOnce(storeNames, mode, fn, { ...txOptions, signal: linked.signal }), {
            signal: linked.signal,
            isActive: () => epoch === generation,
            shouldRecover: (_result, error) => Boolean(error && (/InvalidState|TransactionInactive|AbortError|UnknownError|Timeout/i.test(error.name || '')
                || /超时|打开失败|读写失败|被中止|被其他页面占用|database.*closed|transaction.*inactive/i.test(error.message || ''))),
            repair: async () => {
                const attempt = current; reset(attempt);
                try { (await attempt)?.close(); } catch {}
                if (linked.signal?.aborted || epoch !== generation) return false;
                await open();
                return { changed: true };
            },
        }); } finally { linked.release(); }
        if (epoch !== generation || linked.signal?.aborted) throw new Error('media-stopped');
        return value;
    }

    return { open, transact, reset: () => reset(), async close() { epoch++; recoveryController.abort(); recoveryController = new AbortController(); const attempt = current; current = null; try { (await attempt)?.close(); } catch { /* 失败的连接已经结束 */ } } };
}

// 给任意 Promise 加期限；到期按 fallback 落地，原任务继续在后台走完。
export function withDeadline(promise, ms, reason = 'timeout') {
    let timer = null;
    return Promise.race([
        Promise.resolve(promise).finally(() => { if (timer) clearTimeout(timer); }),
        new Promise((_, reject) => { timer = setTimeout(() => reject(Object.assign(new Error(reason), { code: reason })), ms); }),
    ]);
}
