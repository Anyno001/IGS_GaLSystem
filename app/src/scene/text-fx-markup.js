export const TEXT_FX_KINDS = Object.freeze({
    抖: 'shake',
    波: 'wave',
    大: 'big',
    小: 'small',
    淡: 'whisper',
    强: 'strong',
    吼: 'roar',
    渐大: 'grow',
    渐小: 'fade',
});

export const TEXT_FX_MARKUP_SOURCE = `\\{(${Object.keys(TEXT_FX_KINDS).join('|')})[:：]([^{}\\n\\r]+)\\}`;

const MARKUP_AT_RE = new RegExp(TEXT_FX_MARKUP_SOURCE, 'y');

export function matchTextFxMarkupAt(text, offset) {
    MARKUP_AT_RE.lastIndex = offset;
    return MARKUP_AT_RE.exec(text);
}
