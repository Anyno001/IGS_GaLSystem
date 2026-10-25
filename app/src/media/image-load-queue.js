export function createImageLoadQueue(limit = 4) {
    let active = 0;
    const queue = [];
    // 高优先级排在所有低优先级之前、其它高优先级之后；低优先级排队尾。
    const place = entry => {
        const index = entry.high ? queue.findIndex(item => !item.high) : -1;
        if (index < 0) queue.push(entry); else queue.splice(index, 0, entry);
    };
    async function acquire(signal, { high = true, handle = null } = {}) {
        if (signal?.aborted) return false;
        if (active < limit) { active += 1; return true; }
        return new Promise(resolve => {
            const entry = { high, take() { signal?.removeEventListener('abort', cancel); resolve(true); } };
            const cancel = () => { const index = queue.indexOf(entry); if (index >= 0) queue.splice(index, 1); resolve(false); };
            signal?.addEventListener('abort', cancel, { once: true });
            // 已在排队的低优先级项可被提升（当前页后来要同一张图）。
            if (handle) handle.boost = () => {
                const index = queue.indexOf(entry);
                if (entry.high || index < 0) return;
                queue.splice(index, 1); entry.high = true; place(entry);
            };
            place(entry);
        });
    }
    function release() { const next = queue.shift(); if (next) next.take(); else active -= 1; }
    return {
        async run(callback, signal, priority = {}) {
            if (!await acquire(signal, priority)) return '';
            let abort;
            try {
                if (signal?.aborted) return '';
                return await Promise.race([Promise.resolve().then(() => signal?.aborted ? '' : callback(signal)), new Promise(resolve => {
                    abort = () => resolve(''); signal?.addEventListener('abort', abort, { once: true });
                })]);
            } finally { signal?.removeEventListener('abort', abort); release(); }
        },
        stats: () => ({ active, queued: queue.length, limit }),
    };
}
