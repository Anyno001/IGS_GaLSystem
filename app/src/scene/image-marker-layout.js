const MARKER_RE = /\[igs-img:\s*(\d+)\s*\]|<IMG>\s*(\d+)\s*<\/IMG>/gi;
const VOID_HTML = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

function structureRanges(source) {
    const ranges = [];
    const opaque = [];
    for (const match of source.matchAll(/```[\s\S]*?(?:```|$)|<!--[\s\S]*?(?:-->|$)/g)) {
        const closed = match[0].startsWith('```') ? match[0].length >= 6 && match[0].endsWith('```') : match[0].endsWith('-->');
        const range = { start: match.index, end: closed ? match.index + match[0].length : null };
        opaque.push(range); ranges.push(range);
    }
    const hidden = at => opaque.some(range => range.start <= at && (range.end == null || at < range.end));
    const brackets = [], closes = { '[': ']', '【': '】', '［': '］' };
    for (let i = 0; i < source.length; i++) {
        if (hidden(i)) continue;
        const ch = source[i];
        if (closes[ch]) brackets.push({ start: i, close: closes[ch], kind: 'bracket' });
        else if (brackets.length && brackets.at(-1).close === ch) ranges.push({ ...brackets.pop(), end: i + 1 });
    }
    for (const range of brackets) ranges.push({ ...range, end: null });
    const html = [];
    for (const match of source.matchAll(/<\/?([\p{L}_][\p{L}\p{N}_.:-]*)(?=[\s/>])(?:"[^"]*"|'[^']*'|[^'">])*>/gu)) {
        if (hidden(match.index)) continue;
        const name = match[1].toLowerCase();
        ranges.push({ start: match.index, end: match.index + match[0].length });
        if (match[0].startsWith('</')) {
            const at = html.findLastIndex(range => range.name === name);
            if (at < 0) continue;
            for (const unfinished of html.slice(at + 1)) ranges.push({ ...unfinished, end: null });
            ranges.push({ ...html[at], closeStart: match.index, end: match.index + match[0].length });
            html.length = at;
        } else if (!VOID_HTML.has(name) && !/\/\s*>$/.test(match[0])) {
            html.push({ name, start: match.index, openEnd: match.index + match[0].length, container: name === 'content' });
        }
    }
    for (const range of html) ranges.push({ ...range, end: null });
    return ranges;
}

export function imageMarkerBoundary(raw, index) {
    const source = String(raw || '');
    const start = Math.max(0, Math.min(source.length, Number(index) || 0));
    const ranges = structureRanges(source);
    let limit = source.length;
    for (const range of ranges) {
        if (range.container && start >= range.openEnd && (range.end == null || start <= range.end)) limit = Math.min(limit, range.closeStart ?? source.length);
    }
    let at = Math.min(start, limit);
    while (true) {
        let next = at;
        for (const range of ranges) {
            if (range.container || next <= range.start || (range.end != null && next >= range.end)) continue;
            if (range.end == null) return -1;
            next = Math.max(next, range.end);
        }
        if (next > limit) return -1;
        const lineStart = source.lastIndexOf('\n', next - 1) + 1;
        if (source.slice(lineStart, next).trim()) {
            const newline = source.indexOf('\n', next);
            let end = newline < 0 ? source.length : newline;
            if (end > next && source[end - 1] === '\r') end--;
            next = Math.min(end, limit);
        }
        if (next === at) return next;
        at = next;
    }
}

export function insertImageMarkerOnLine(raw, index, token) {
    const source = String(raw || '');
    const at = imageMarkerBoundary(source, index);
    if (at < 0) return source;
    const before = source.slice(0, at), after = source.slice(at);
    const newline = source.includes('\r\n') ? '\r\n' : '\n';
    const lead = !before || /\r?\n$/.test(before) ? '' : newline;
    const trail = !after || /^\r?\n/.test(after) ? '' : newline;
    return before + lead + token + trail + after;
}

// 旧插件把标记插进标签时，只在阅读副本中移出；原消息、槽号与图片绑定保持原样。
export function normalizeImageMarkerLayout(raw) {
    let source = String(raw || '');
    const markers = [...source.matchAll(MARKER_RE)];
    for (const marker of markers.reverse()) {
        const from = marker.index, to = from + marker[0].length;
        const ranges = structureRanges(source);
        const enclosing = ranges.filter(range => !range.container && range.start < from && (range.end == null || range.end > to));
        const lineStart = source.lastIndexOf('\n', from - 1) + 1;
        const lineEnd = source.indexOf('\n', to);
        const ownLine = !source.slice(lineStart, from).trim() && !source.slice(to, lineEnd < 0 ? source.length : lineEnd).trim();
        const token = marker[1] ? `[igs-img:${marker[1]}]` : `<IMG>${marker[2]}</IMG>`;
        if (ownLine && !enclosing.length) {
            // 旧楼插入独占行 CG 标记时，可能在标记前后留下一行没有配对的闭括号。
            // 只清理紧贴标记、且不闭合任何括号的孤立闭符，保留原消息及其他位置的括号文本。
            const paired = at => ranges.some(range => range.kind === 'bracket' && range.end === at + 1);
            let preceding = source.slice(0, from), following = source.slice(to);
            const orphanAfter = following.match(/^(?:[ \t]*\r?\n)+[ \t]*[\]】］][ \t]*(?=\r?\n|$)/);
            if (orphanAfter && !paired(to + orphanAfter[0].search(/[\]】］]/))) following = following.slice(orphanAfter[0].length);
            const orphanBefore = preceding.match(/(?:^|\r?\n)[ \t]*([\]】］])[ \t]*(?:\r?\n[ \t]*)+$/);
            if (orphanBefore && !paired(orphanBefore.index + orphanBefore[0].indexOf(orphanBefore[1]))) preceding = preceding.slice(0, orphanBefore.index) + (orphanBefore.index ? preceding.slice(orphanBefore.index).match(/^\r?\n/)[0] : '');
            source = preceding + token + following;
            continue;
        }
        let before = source.slice(0, from), after = source.slice(to);
        if (enclosing.some(range => range.kind === 'bracket')) {
            before = before.replace(/[ \t]*(?:\r?\n[ \t]*)+$/, '');
            after = after.replace(/^(?:[ \t]*\r?\n)+[ \t]*/, '');
        }
        const clean = before + after;
        if (imageMarkerBoundary(clean, before.length) >= 0) source = insertImageMarkerOnLine(clean, before.length, token);
    }
    return source;
}
