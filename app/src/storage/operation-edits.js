// 将原操作实际修改的字段应用到最新存储；没有改动的字段使用最新值。
// 作用域由调用方固定，合并本身不选择角色卡或聊天。
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const copy = value => value === undefined ? undefined : structuredClone(value);

export function applyOperationEdits(before, current, edited) {
    if (equal(before, edited)) return copy(current);
    if (!object(edited) || (!object(before) && before !== undefined)) return copy(edited);
    // 原快照没有该分组时，仍逐字段合并；不能让新建一项抹掉最新快照中新建的同组条目。
    before ||= {};
    const result = { ...(object(current) ? current : {}) };
    for (const key of new Set([...Object.keys(before), ...Object.keys(edited)])) {
        if (['__proto__', 'constructor', 'prototype'].includes(key)) continue;
        if (!Object.hasOwn(edited, key)) { delete result[key]; continue; }
        const value = applyOperationEdits(before[key], current?.[key], edited[key]);
        if (value === undefined) delete result[key];
        else result[key] = value;
    }
    return result;
}
