// 向写词方说明资料的用途；成品格式与关键词替换继续由当前来源负责。
const text = value => typeof value === 'string' ? value.trim() : '';
const FRAMES = { full_body: '全身', half_body: '半身', portrait: '头像', partial: '局部' };
const DATA_RULES = [
    '按角色名逐一对应使用本人的外貌、排除项、性格和当前衣装，将所列设定逐项落实为该角色的绘图提示词；缺省细节结合当前来源的角色设定补齐。',
    '按本图取景将所给外貌中的可见特征写入本人正向词；已有英文标签和权重逐字保留，中文设定转成准确的英文绘图标签。',
    '排除标签写入本人负向词；使用整图负向格式的来源将其统一写入整图负向。',
    '每张图的固定外貌和当前衣装在表情、眼神与动作变化中保持一致，穿着按本次衣装的名称和说明描写；性格结合指定情绪，分别表现为眼神、嘴型、手势和身体姿态。',
    '交付内容为可直接用于出图的完整提示词，按当前来源约定的字段与格式直接输出。',
];

function characterLines(character, options) {
    const dna = character?.dna || {};
    const cg = options.imagePromptTask === 'cg' || options.promptTask?.purpose === 'cg';
    const requested = cg ? 'full_body' : character?.framing || options.writingRequirements?.framing || options.framing
        || (options.imagePromptTask === 'avatar' ? 'portrait'
            : ['sprite', 'expression', 'outfit'].includes(options.imagePromptTask) || options.imageKind === 'sprite' ? 'half_body' : '');
    const framing = Object.hasOwn(FRAMES, requested) ? requested : '';
    const available = Object.keys(FRAMES).filter(key => text(dna.views?.[key]?.subject));
    const fallback = framing === 'portrait' ? ['half_body', 'full_body', 'partial'] : ['full_body', 'half_body', 'portrait', 'partial'];
    const selected = [framing && available.includes(framing) ? framing : fallback.find(key => available.includes(key))].filter(Boolean);
    const modern = dna.version === 2 || available.length > 0;
    const lines = [];
    if (modern) {
        for (const key of selected) {
            const view = dna.views[key];
            lines.push(`${cg ? '外貌' : `${FRAMES[key]}外貌${framing && key !== framing ? `（本次${FRAMES[framing]}只取可见特征）` : ''}`}：\n${text(view.subject)}`);
            if (text(view.negative)) lines.push(`${cg ? '' : FRAMES[key]}身份排除项：\n${text(view.negative)}`);
        }
    } else {
        for (const [key, label] of [['identity', '外貌'], ['defaultAppearance', '补充设定'],
            ['triggerWords', '角色触发词（写入本人正向，关键词替换沿用当前来源设置）'], ['negative', '身份排除项']]) {
            if (text(dna[key])) lines.push(`${label}：\n${text(dna[key])}`);
        }
    }
    if (!cg && modern && framing && !selected.includes(framing) && text(dna.views?.[framing]?.negative))
        lines.push(`${FRAMES[framing]}身份排除项：\n${text(dna.views[framing].negative)}`);
    if (text(dna.personality)) lines.push(`性格：\n${text(dna.personality)}`);
    const outfit = character?.outfit;
    if (text(outfit?.name) || text(outfit?.description)) {
        lines.push(`当前衣装${text(outfit.name) ? `「${text(outfit.name)}」` : ''}：\n${text(outfit.description) || '按本套衣装名称与本次要求补足穿着细节。'}`);
    }
    return lines.length ? [`角色「${text(character.characterKey)}」`, ...lines].join('\n') : '';
}

export function externalCaptionFailure(caption) {
    const fields = [caption?.v4_prompt?.caption, caption?.v4_negative_prompt?.caption]
        .flatMap(side => [side?.base_caption, ...(Array.isArray(side?.char_captions) ? side.char_captions.map(row => row?.char_caption) : [])]);
    return fields.some(value => typeof value === 'string' && /<<\s*(?:dna(?:_uc)?|outfit):/i.test(value))
        ? { ok: false, reason: 'source-prompt-mismatch', stopGeneration: true,
            error: '这份记录仍含内置占位符，请使用当前来源重新写词；未发送绘图请求' } : null;
}

export function externalPromptDescription(description, context = [], options = {}) {
    const body = text(description);
    if (!body) return '';
    const characters = (Array.isArray(context) ? context : []).map(character => characterLines(character, options)).filter(Boolean);
    return characters.length ? [body, `【角色设定】\n${DATA_RULES.join('\n')}`, ...characters].join('\n\n') : body;
}
