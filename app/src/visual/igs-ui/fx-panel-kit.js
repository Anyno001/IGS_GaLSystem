// 面板组件：系统公告、榜单、介绍卡、检测报告等“一张卡 + 若干行”的演出共用。
// 默认按世界观换皮（科技蓝 / 羊皮纸 / 古籍 / 血字 / 综艺粉）；传 skin 时可选跟随对话框皮肤（取战斗演出主题的变量）。
// 装饰一律用实色，不用半透明。
import { esc } from './reader-value-utils.js';
import { getBattleTheme } from './fx-battle-themes.js';
import { rollNumber } from './fx-ticker.js';

export const PANEL_TONES = Object.freeze(['tech', 'parchment', 'ancient', 'blood', 'variety']);
const ROW_TONES = Object.freeze(['good', 'warn', 'bad']);

// 无显式 tone 时按世界观取：古代古籍、魔法羊皮纸、恐怖血字，其余科技蓝；综艺粉只能显式指定。
export function panelToneOf(env) {
    if (!env) return 'tech';
    if (env.ancient) return 'ancient';
    if (env.worldview === 'magic' || env.worldview === 'fantasy') return 'parchment';
    if (env.worldview === 'horror') return 'blood';
    return 'tech';
}

const cssSafe = (value) => String(value).replace(/[;{}<>"]/g, '');

// 皮肤变量：只取名称里的墨色、细线、强调色与字体；浅色皮肤配浅底，其余配深底。没有这套皮肤返回空串。
export function panelSkinStyle(skin) {
    const theme = skin ? getBattleTheme(String(skin)) : null;
    if (!theme) return '';
    const vars = theme.vars || {};
    const parts = [`--igs-panel-bg:${theme.light ? '#f3eee2' : '#14141b'}`, `--igs-panel-accent:${cssSafe(theme.accent || '#cccccc')}`];
    if (vars.ink) parts.push(`--igs-panel-ink:${cssSafe(vars.ink)}`);
    if (vars.rule) parts.push(`--igs-panel-rule:${cssSafe(vars.rule)}`);
    if (theme.font) parts.push(`--igs-panel-font:${cssSafe(theme.font)}`);
    return parts.join(';');
}

function rowHtml(row) {
    const item = typeof row === 'string' ? { label: '', value: row } : row || {};
    const tone = ROW_TONES.includes(item.tone) ? ` is-${item.tone}` : '';
    if (item.label === '' || item.label == null) return `<div class="igs-panel-row${tone}"><span class="igs-panel-v">${esc(item.value)}</span></div>`;
    return `<div class="igs-panel-row${tone}"><span class="igs-panel-k">${esc(item.label)}</span><span class="igs-panel-v">${esc(item.value)}</span></div>`;
}

// 返回 { className, style, html }：className 含 igs-panel is-<tone>，调用方可再追加自己的类。
export function panelHtml({ title = '', rows = [], tone = '', skin = '', footer = '' } = {}) {
    const useTone = PANEL_TONES.includes(tone) ? tone : 'tech';
    const style = panelSkinStyle(skin);
    return {
        className: `igs-panel is-${useTone}${style ? ' is-skin' : ''}`,
        style,
        html: (title ? `<div class="igs-panel-title">${esc(title)}</div>` : '')
            + `<div class="igs-panel-rows">${(Array.isArray(rows) ? rows : []).map(rowHtml).join('')}</div>`
            + (footer ? `<div class="igs-panel-foot">${esc(footer)}</div>` : ''),
    };
}

export function buildPanel(doc, options = {}) {
    const built = panelHtml({ ...options, tone: options.tone || panelToneOf(options.env) });
    const node = doc.createElement('div');
    node.className = [built.className, options.className].filter(Boolean).join(' ');
    if (built.style) node.setAttribute('style', built.style);
    node.innerHTML = built.html;
    return node;
}

// 数值条：label + 条 + 数字。条宽是 value/max 的百分比，写在 CSS 变量上。
export function gaugeHtml({ label = '', value = 0, max = 100, tone = '', text = '' } = {}) {
    const top = Number(max) > 0 ? Number(max) : 100;
    const pct = Math.max(0, Math.min(100, Math.round((Number(value) || 0) / top * 100)));
    const useTone = ROW_TONES.includes(tone) ? ` is-${tone}` : '';
    return {
        pct,
        className: `igs-gauge${useTone}`,
        style: `--igs-gauge-pct:${pct}%`,
        html: (label ? `<span class="igs-gauge-label">${esc(label)}</span>` : '')
            + '<span class="igs-gauge-track"><i class="igs-gauge-fill"></i></span>'
            + `<b class="igs-gauge-value">${esc(text || String(Math.round(Number(value) || 0)))}</b>`,
    };
}

export function gauge(doc, options = {}) {
    const built = gaugeHtml(options);
    const node = doc.createElement('div');
    node.className = built.className;
    node.setAttribute('style', built.style);
    node.innerHTML = built.html;
    return node;
}

// 值变化：条宽走 CSS 过渡，数字走 rollNumber；reduced 直接落终值。
export function setGauge(node, from, to, { max = 100, ms = 700, reduced = false, format = null } = {}) {
    const top = Number(max) > 0 ? Number(max) : 100;
    const pct = Math.max(0, Math.min(100, Math.round((Number(to) || 0) / top * 100)));
    node.style.setProperty('--igs-gauge-pct', `${pct}%`);
    const value = node.querySelector('.igs-gauge-value');
    return value ? rollNumber(value, from, to, ms, { reduced, format }) : { stop() {} };
}

export const PANEL_STYLE_TEXT = `
.igs-panel{position:relative;box-sizing:border-box;min-width:min(260px,72%);max-width:86%;padding:12px 18px 10px;border-radius:6px;font-family:var(--igs-panel-font,inherit);}
.igs-panel-title{font-weight:700;letter-spacing:.12em;text-align:center;padding-bottom:6px;margin-bottom:6px;border-bottom:2px solid currentColor;}
.igs-panel-row{display:flex;gap:12px;justify-content:space-between;padding:3px 0;font-size:.92em;}
.igs-panel-k{flex:none;opacity:.85;}
.igs-panel-v{flex:1;text-align:right;font-variant-numeric:tabular-nums;}
.igs-panel-row:only-child .igs-panel-v,.igs-panel-row > .igs-panel-v:only-child{text-align:left;}
.igs-panel-foot{margin-top:6px;padding-top:5px;border-top:1px solid currentColor;font-size:.8em;text-align:center;opacity:.85;}
.igs-panel-row.is-good .igs-panel-v{color:#2f9e5b;}
.igs-panel-row.is-warn .igs-panel-v{color:#d98a1c;}
.igs-panel-row.is-bad .igs-panel-v{color:#d23b3b;}
.igs-panel.is-tech{background:#0d2540;color:#cfe8ff;border:2px solid #3b9dff;box-shadow:0 0 0 3px #0d2540,0 8px 24px #000;}
.igs-panel.is-parchment{background:#efe1bd;color:#4a3418;border:3px double #8a6a2f;box-shadow:0 8px 22px #1b1408;}
.igs-panel.is-ancient{background:#f1ead8;color:#2b2218;border:2px solid #7a5b36;box-shadow:inset 0 0 0 4px #f1ead8,inset 0 0 0 5px #7a5b36,0 8px 22px #1b1408;}
.igs-panel.is-ancient .igs-panel-title{letter-spacing:.3em;}
.igs-panel.is-blood{background:#140a0a;color:#e9d9d4;border:2px solid #7d1313;box-shadow:0 8px 24px #000;}
.igs-panel.is-blood .igs-panel-title{color:#c42020;}
.igs-panel.is-variety{background:#ffe3ee;color:#7a2349;border:3px solid #ff6fa5;border-radius:14px;box-shadow:0 6px 0 #ff6fa5;}
.igs-panel.is-skin{background:var(--igs-panel-bg);color:var(--igs-panel-ink,inherit);border:2px solid var(--igs-panel-rule,var(--igs-panel-accent));}
.igs-panel.is-skin .igs-panel-title{color:var(--igs-panel-accent);}
.igs-panel.is-reduced,.igs-panel.is-reduced *{animation:none!important;}
.igs-gauge{display:flex;align-items:center;gap:8px;font-size:.85em;--igs-gauge-pct:0%;}
.igs-gauge-label{flex:none;min-width:2.4em;}
.igs-gauge-track{position:relative;flex:1;height:8px;border-radius:4px;background:#2a2a30;overflow:hidden;}
.igs-gauge-fill{position:absolute;left:0;top:0;bottom:0;width:var(--igs-gauge-pct);background:#4ea1ff;transition:width .6s cubic-bezier(.3,.8,.3,1);}
.igs-gauge.is-good .igs-gauge-fill{background:#2fb56a;}
.igs-gauge.is-warn .igs-gauge-fill{background:#e0a12a;}
.igs-gauge.is-bad .igs-gauge-fill{background:#d23b3b;}
.igs-gauge-value{flex:none;min-width:2.2em;text-align:right;font-variant-numeric:tabular-nums;}
#igs-overlay[data-igs-quality="low"] .igs-gauge-fill{transition:none;}
`;
