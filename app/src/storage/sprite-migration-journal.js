import { LEGACY_READER_MODE_KEYS } from '../schemas/reader-mode.js';

export const SPRITE_MIGRATION_JOURNAL = 'igs:sprite-migration:pending';
const keys = new Set(['igs_bridge_config', 'igs-display-mode',
    ...LEGACY_READER_MODE_KEYS.map(mode => `igs-reader-settings-v9-${mode}`)]);

export function clearSpriteMigration(storage) {
    storage.removeItem(SPRITE_MIGRATION_JOURNAL);
    if (storage.getItem(SPRITE_MIGRATION_JOURNAL) != null) throw new Error('Migration journal was not cleared');
}

export function prepareSpriteMigration(storage, changes) {
    const record = JSON.stringify({ version: 1, entries: changes.map(({ key, previous }) => ({ key, previous })) });
    storage.setItem(SPRITE_MIGRATION_JOURNAL, record);
    if (storage.getItem(SPRITE_MIGRATION_JOURNAL) !== record) throw new Error('Migration journal was not retained');
}

// 设置与标定跨多个 localStorage 键；重启先回退未完成的迁移，再由同一入口重试。
export function recoverSpriteMigration(storage) {
    try {
        const raw = storage.getItem(SPRITE_MIGRATION_JOURNAL);
        if (raw == null) return { ok: true, recovered: false };
        const record = JSON.parse(raw), seen = new Set();
        if (record?.version !== 1 || !Array.isArray(record.entries)
            || !record.entries.length || record.entries.length > keys.size)
            return { ok: false, reason: 'sprite-migration-journal-invalid' };
        for (const row of record.entries) {
            if (!row || !keys.has(row.key) || seen.has(row.key)
                || (row.previous !== null && typeof row.previous !== 'string'))
                return { ok: false, reason: 'sprite-migration-journal-invalid' };
            seen.add(row.key);
        }
        for (const { key, previous } of record.entries) {
            if (previous == null) storage.removeItem(key);
            else storage.setItem(key, previous);
            if (storage.getItem(key) !== previous) throw new Error('Migration rollback was not retained');
        }
        clearSpriteMigration(storage);
        return { ok: true, recovered: true };
    } catch { return { ok: false, reason: 'sprite-migration-recovery-failed' }; }
}
