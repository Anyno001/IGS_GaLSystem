export async function retryInlineMedia(records, files, save) {
    const failures = [];
    for (const [key, record] of records) {
        if (!files.hasData(record)) continue;
        try {
            const result = await save(key, record);
            if (result?.ok === false) failures.push({ key, error: result.error || result.reason || 'image-migration-failed' });
        } catch (error) { failures.push({ key, error: error.message || 'image-migration-failed' }); }
    }
    return failures;
}
