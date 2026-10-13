export function writeCheckedStorage(storage, key, value) {
    let previous, attempted = false;
    try {
        previous = storage.getItem(key);
        attempted = true;
        if (value === null) storage.removeItem(key); else storage.setItem(key, value);
        if (storage.getItem(key) !== value) throw new Error('store-write-not-persisted');
        return { ok: true };
    } catch (saveError) {
        let rollbackFailed = false;
        if (attempted) try {
            if (previous === null) storage.removeItem(key); else storage.setItem(key, previous);
            rollbackFailed = storage.getItem(key) !== previous;
        } catch { rollbackFailed = true; }
        return { ok: false, reason: 'store-write-failed', saveError, rollbackFailed };
    }
}
