import { createShujukuClient } from './client.js';
import { parseTables } from './table-parser.js';
import { createStatusHudRowLookup, resolveSelectedStatusHudTables } from './status-hud-model.js';
import { collectOutfitClues } from './outfit-clues.js';

// 当前楼层共用一次导出。宿主更新通知使快照失效，下一次准备按需重读；没有轮询。
export function createReaderTableData(getApi) {
    let api = null;
    let floor = null;
    let result = null;
    let tables = null;
    let rows = new WeakMap();
    let clues = new Map();
    let revision = 0;
    let failedAt = 0;

    function invalidate() {
        result = null;
        tables = null;
        rows = new WeakMap();
        clues = new Map();
        revision += 1;
        failedAt = 0;
    }

    function useFloor(key) {
        const nextApi = getApi();
        if (floor !== key || api !== nextApi || (result?.ok === false && Date.now() - failedAt >= 1500)) {
            floor = key;
            api = nextApi;
            invalidate();
        }
    }

    function read() {
        const nextApi = getApi();
        if (api !== nextApi) { api = nextApi; invalidate(); }
        if (!result) {
            result = createShujukuClient(api).readTables();
            if (result.ok === false) failedAt = Date.now();
        }
        return result;
    }

    function parsed() {
        const readResult = read();
        if (!tables) tables = readResult.ok === false ? [] : parseTables(readResult.data);
        return tables;
    }

    function rowFor(table, character, aliases) {
        let entry = rows.get(table);
        if (!entry || entry.aliases !== aliases) {
            entry = { aliases, values: new Map(), lookup: createStatusHudRowLookup(table) };
            rows.set(table, entry);
        }
        if (!entry.values.has(character)) entry.values.set(character, entry.lookup(character, aliases));
        return entry.values.get(character);
    }

    function outfitClues(names) {
        const key = JSON.stringify(names);
        if (!clues.has(key)) clues.set(key, collectOutfitClues(read(), names, parsed()));
        return clues.get(key);
    }

    function prepareCharacters(names, selectedTables, aliases) {
        const selected = resolveSelectedStatusHudTables(selectedTables, read(), parsed());
        for (const entry of selected) if (entry.table) for (const name of names) rowFor(entry.table, name, aliases);
    }

    return { useFloor, read, parsed, rowFor, outfitClues, prepareCharacters, invalidate, get revision() { return revision; } };
}
