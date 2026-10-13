export function createImageLoadQueue(limit = 4) {
    let active = 0;
    const queue = [];
    async function acquire(signal) {
        if (signal?.aborted) return false;
        if (active < limit) { active += 1; return true; }
        return new Promise(resolve => {
            const entry = { take() { signal?.removeEventListener('abort', cancel); resolve(true); } };
            const cancel = () => { const index = queue.indexOf(entry); if (index >= 0) queue.splice(index, 1); resolve(false); };
            signal?.addEventListener('abort', cancel, { once: true });
            queue.push(entry);
        });
    }
    function release() { const next = queue.shift(); if (next) next.take(); else active -= 1; }
    return {
        async run(callback, signal) {
            if (!await acquire(signal)) return '';
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
