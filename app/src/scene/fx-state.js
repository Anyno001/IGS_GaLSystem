// 持续状态滤镜区间 [igs-fx:state|醉酒|重] … [igs-fx:state-end]：纯数据与解析，不碰 DOM。
// 区间内给舞台挂 data-igs-fx-state=<类型>，滤镜串进场景调色变量（见 visual/igs-ui/fx-state-style.js）。
// 类型写别名或标准 id 都认；认不出整条丢弃（照常从正文剥离）。题材包可在清单里登记自己的类型（别名 + 样式）。
export const FX_STATE_CORE = Object.freeze({
    drunk: Object.freeze(['醉酒', '醉', '喝醉', '微醺', '酒醉']),
    poison: Object.freeze(['中毒', '毒', '毒发']),
    hurt: Object.freeze(['受伤', '重伤', '负伤', '濒死']),
    insane: Object.freeze(['疯狂', '发疯', '失控', '理智崩坏']),
    drug: Object.freeze(['药效', '药物', '迷药', '致幻']),
    uncanny: Object.freeze(['不可名状', '诡异', '异常', '污染']),
    heat: Object.freeze(['发情期', '发情', '热潮']),
    rut: Object.freeze(['易感期', '易感']),
    fever: Object.freeze(['发烧', '高热', '体温升高']),
    chill: Object.freeze(['失温', '寒冷', '体温过低']),
});
export const FX_STATE_LEVELS = Object.freeze({ 轻: 'light', 轻微: 'light', light: 'light', 中: 'medium', medium: 'medium', 重: 'heavy', 严重: 'heavy', heavy: 'heavy' });

// extra：题材包登记的 { id: [别名...] }。返回别名到 id 的映射（id 本身也算别名）。
export function buildStateAliases(extra = {}) {
    const map = new Map();
    for (const table of [FX_STATE_CORE, extra]) {
        for (const [id, aliases] of Object.entries(table || {})) {
            map.set(id, id);
            for (const alias of aliases || []) map.set(String(alias).toLowerCase(), id);
        }
    }
    return map;
}

// 返回 [类型, 程度] 或 null；程度第二栏可省（轻 / 中 / 重），写别的按中。
export function parseStateBody(fields, aliases) {
    const type = aliases.get(String(fields && fields[0] || '').trim().toLowerCase());
    if (!type) return null;
    const level = String(fields[1] || '').trim().toLowerCase();
    return [type, Object.hasOwn(FX_STATE_LEVELS, level) ? FX_STATE_LEVELS[level] : 'medium'];
}
