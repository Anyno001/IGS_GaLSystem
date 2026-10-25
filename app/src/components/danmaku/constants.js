export const DANMAKU_ROLES = [
  ['passerby', '原著党/路人', '普通的读者吐槽与剧情分析'],
  ['detective', '列文虎克', '细致入微的伏笔与显微镜观察'],
  ['stan', '唯粉/意难平', '真情实感的角色应援与情感共鸣'],
  ['breaking', '剧中人破壁', '具有强烈代入感的角色跨维度互动'],
];

export const DANMAKU_ROLE_COLORS = {
  passerby: '#ffffff',
  detective: '#9fd4ff',
  stan: '#ffc0dc',
  breaking: '#ffd88a',
};

export const DANMAKU_DEFAULTS = {
  danmaku: false,
  danmakuDensity: 3,
  danmakuBatch: 40,
  danmakuSpeed: 12,
  danmakuSpeedVar: 0.35,
  danmakuStyle: 'shadow',
  danmakuOpacity: 0.82,
  danmakuFontSize: 15,
  danmakuAreas: 4,
  danmakuLoop: true,
  danmakuStore: true,
  danmakuShowAv: true,
  danmakuAvSize: 20,
  danmakuRoles: { passerby: true, detective: true, stan: true, breaking: false },
  danmakuSilent: true,
};

export function resolveRoleList(rolesMeta = {}) {
  const out = [];
  const push1 = (k, label, desc) => {
    const m = rolesMeta[k] || {};
    if (m.off === true) return;
    out.push([k, String(m.label || label), String(m.desc || desc), String(m.color || '')]);
  };
  for (const [k, label, desc] of DANMAKU_ROLES) push1(k, label, desc);
  for (const [k, m] of Object.entries(rolesMeta)) {
    if (!m || typeof m !== 'object') continue;
    if (!/^user_/.test(k)) continue;
    if (m.off === true) continue;
    const lb = String(m.label || '').trim();
    if (!lb) continue;
    out.push([k, lb, String(m.desc || '自定义身份'), String(m.color || '')]);
  }
  return out;
}

export function resolveRoleColor(roleKey, rolesMeta = {}) {
  const custom = String((rolesMeta[roleKey] || {}).color || '').trim();
  if (custom) return custom;
  return DANMAKU_ROLE_COLORS[roleKey] || '#ffffff';
}
