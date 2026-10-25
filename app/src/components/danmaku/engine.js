import { DANMAKU_DEFAULTS, resolveRoleColor } from './constants.js';

export function createDanmakuRenderer(options = {}) {
  const doc = options.document || (typeof document !== 'undefined' ? document : null);
  const root = options.root || (doc ? (doc.getElementById('mjvn-root') || doc.body) : null);
  const settings = Object.assign({}, DANMAKU_DEFAULTS, options.settings || {});

  if (!doc || !root) {
    return {
      burst() {},
      spawn() { return false; },
      feed() {},
      clear() {},
      pause() {},
      resume() {},
      softReset() {},
      rebuild() {},
      pump() {},
      loading() {},
      setTracks() {},
      setEnabled() {},
      dispose() {},
      get running() { return false; },
      get count() { return 0; },
      get pending() { return 0; },
      get laneCount() { return 0; },
    };
  }

  const layer = doc.createElement('div');
  layer.className = 'igs-danmaku-layer';
  layer.setAttribute('aria-hidden', 'true');
  root.appendChild(layer);

  const tip = doc.createElement('div');
  tip.className = 'igs-dm-loading';
  tip.innerHTML = '<span class="igs-dm-tx">弹幕生成中…</span><span class="igs-dm-bar"><i></i></span>';
  root.appendChild(tip);
  const tipTx = tip.querySelector('.igs-dm-tx');
  const tipBar = tip.querySelector('.igs-dm-bar > i');

  const TRACK_MAX = 8;
  let lanes = [];
  let disposed = false;
  let running = false;
  let queue = [];
  let all = [];
  let pumpTimer = 0;
  let roRef = null;
  let syncTimer = 0;

  function syncLayers() {
    try {
      const vh = root.clientHeight || (doc.defaultView && doc.defaultView.innerHeight) || 640;
      let topH = 0;
      const tools = root.querySelector('.vn-tools') || root.querySelector('.igs-tools');
      if (tools && tools.offsetParent !== null) {
        const r = tools.getBoundingClientRect();
        const rr = root.getBoundingClientRect();
        if (r.height > 0) topH = Math.ceil(r.bottom - rr.top) + 8;
      }
      if (topH < 52) topH = 52;
      topH = Math.min(topH, Math.round(vh * 0.3));

      const box = root.querySelector('.mjvn-box') || root.querySelector('.igs-box');
      let boxH = 0;
      if (box && box.offsetParent !== null) {
        const r = box.getBoundingClientRect();
        const rr = root.getBoundingClientRect();
        if (r.height > 0) boxH = Math.ceil(rr.bottom - r.top);
      }
      if (!boxH) boxH = Math.round(vh * 0.44);
      const reserve = Math.min(Math.round(vh * 0.7), boxH + 8);
      root.style.setProperty('--vn-topui-h', topH + 'px');
      root.style.setProperty('--vn-box-reserve', reserve + 'px');
    } catch (e) {}
  }
  syncLayers();

  const queueSync = () => {
    if (syncTimer) return;
    syncTimer = setTimeout(() => {
      syncTimer = 0;
      syncLayers();
      rebuild(settings.danmakuAreas || DANMAKU_DEFAULTS.danmakuAreas, true);
    }, 120);
  };

  try {
    if (typeof ResizeObserver === 'function') {
      const ro = new ResizeObserver(queueSync);
      const tEl = root.querySelector('.vn-tools') || root.querySelector('.igs-tools');
      if (tEl) ro.observe(tEl);
      const bEl = root.querySelector('.mjvn-box') || root.querySelector('.igs-box');
      if (bEl) ro.observe(bEl);
      roRef = ro;
    }
  } catch (e) {}
  try { if (doc.defaultView) doc.defaultView.addEventListener('resize', queueSync); } catch (e) {}

  function zoneH() {
    let h = 0;
    try { h = layer.clientHeight || 0; } catch (e) {}
    if (!h) {
      const vh = root.clientHeight || (doc.defaultView && doc.defaultView.innerHeight) || 640;
      const pct = Math.max(0.1, Math.min(0.8, Number(settings.danmakuZonePct) || 0.46));
      h = Math.round(vh * pct);
    }
    return Math.max(60, Math.round(h));
  }

  function rebuild(n, force) {
    n = Math.max(1, Math.min(TRACK_MAX, (n | 0) || 4));
    if (!force && lanes.length === n) return;
    const zh = zoneH();
    const fs = Math.max(11, Math.min(28, Number(settings.danmakuFontSize) || 15));
    const avSize = (settings.danmakuShowAv !== false) ? Math.max(0, Number(settings.danmakuAvSize) || 20) : 0;
    const contentH = Math.max(fs * 1.28, avSize);
    const needH = Math.ceil(contentH + 6 + 14);
    let laneH = Math.max(needH, Math.floor(zh / n));
    laneH = Math.min(laneH, Math.max(needH, 68));
    const usable = Math.max(1, Math.min(n, Math.floor(zh / laneH)));
    lanes = Array.from({ length: usable }, (_, i) => ({
      i,
      top: i * laneH,
      h: laneH,
      activeCount: 0,
      lastStart: 0,
      lastW: 0,
      lastDur: 0,
      lastDist: 0,
      freeAt: 0,
    }));
  }
  rebuild(settings.danmakuAreas || DANMAKU_DEFAULTS.danmakuAreas);

  function acquireLane(now, w2, desiredDur, vw) {
    if (!lanes.length) return null;
    const dist2 = vw + w2;
    const S_GAP = 48;
    const candidates = [];

    for (const L of lanes) {
      if (L.activeCount <= 0 || now >= (L.lastStart + L.lastDur * 1000 + 300)) {
        candidates.push({ lane: L, dur: desiredDur, score: 0 });
        continue;
      }
      const v1 = L.lastDist / L.lastDur;
      const dt = (now - L.lastStart) / 1000;
      const d1 = v1 * dt;
      if (d1 < (L.lastW + S_GAP)) continue;

      let dur2 = desiredDur;
      let v2 = dist2 / dur2;
      if (v2 > v1) {
        const tArrive2 = dt + (vw / v2);
        const tLeave1 = (L.lastDist + S_GAP) / v1;
        if (tArrive2 < tLeave1) {
          v2 = v1;
          dur2 = dist2 / v2;
        }
      }
      candidates.push({ lane: L, dur: dur2, score: L.activeCount * 1000 + (now - L.lastStart) });
    }

    if (!candidates.length) return null;
    candidates.sort((a, b) => a.lane.activeCount - b.lane.activeCount || (a.lane.lastStart - b.lane.lastStart));
    return candidates[0];
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function spawn(text, opt) {
    if (disposed || !text) return false;
    const o = opt || {};
    const el = doc.createElement('div');
    el.className = 'igs-dm';
    if (o.cls) el.classList.add(o.cls);

    try {
      const roleKey = String(o.r || '').replace(/^r-/, '');
      if (roleKey) {
        const c = resolveRoleColor(roleKey, settings.danmakuRolesMeta);
        if (c && c.toLowerCase() !== '#ffffff') el.style.color = c;
      }
    } catch (e) {}

    if (o.name) {
      el.style.background = 'rgba(58,44,18,' + String(settings.danmakuChipBg === undefined ? 0.78 : settings.danmakuChipBg) + ')';
      el.style.boxShadow = '0 1px 4px rgba(0,0,0,.6), inset 0 0 0 1px rgba(255,214,132,.5)';
    }

    if (o.name && settings.danmakuShowAv !== false) {
      const av = doc.createElement('span');
      av.className = 'igs-dm-av';
      if (o.avatar) {
        av.style.backgroundImage = 'url("' + String(o.avatar).replace(/"/g, '%22') + '")';
      } else {
        av.textContent = String(o.name).slice(0, 1);
      }
      el.appendChild(av);
      const nm = doc.createElement('span');
      nm.className = 'igs-dm-avtxt';
      nm.textContent = o.name;
      el.appendChild(nm);
    }

    const tx = doc.createElement('span');
    tx.className = 'igs-dm-tx';
    tx.textContent = text;
    el.appendChild(tx);

    el.style.visibility = 'hidden';
    layer.appendChild(el);
    const w = el.offsetWidth || 220;
    const vw = root.clientWidth || (doc.defaultView && doc.defaultView.innerWidth) || 360;
    const dist = vw + w;
    const base = Math.max(3.0, Number(settings.danmakuSpeed) || 12);
    const vr = Math.max(0, Math.min(0.6, Number(settings.danmakuSpeedVar) || 0.35));
    const jitter = 1 + (Math.random() * 2 - 1) * vr * 0.35;
    const desiredDur = Math.max(2.5, base * (0.6 + 0.4 * (dist / Math.max(1, vw))) * jitter);

    const now = Date.now();
    const match = acquireLane(now, w, desiredDur, vw);
    if (!match) {
      try { el.remove(); } catch (e) {}
      return false;
    }

    const L = match.lane;
    const dur = match.dur;

    el.style.visibility = '';
    try {
      const autoOn = settings.danmakuAutoStyle !== false;
      const styleNow = String(settings.danmakuStyle || 'shadow');
      if (autoOn && (styleNow === 'auto' || styleNow === 'shadow')) {
        const POOL2 = ['bubble', 'card', 'plain', 'neon', 'note', 'underline', ''];
        el.setAttribute('data-style', POOL2[Math.floor(Math.random() * POOL2.length)]);
      } else {
        el.removeAttribute('data-style');
      }
    } catch (e) {}

    el.style.top = L.top + 'px';
    el.style.setProperty('--dm-dist', dist + 'px');
    el.style.animationDuration = dur.toFixed(2) + 's';
    el.style.animationPlayState = 'running';

    L.activeCount++;
    L.lastStart = now;
    L.lastW = w;
    L.lastDur = dur;
    L.lastDist = dist;
    const tailIn = (w / Math.max(1, dist)) * dur * 1000;
    L.freeAt = now + tailIn + 240;

    setTimeout(() => {
      try { el.remove(); } catch (e) {}
      L.activeCount = Math.max(0, L.activeCount - 1);
    }, dur * 1000 + 300);

    return true;
  }

  function emit(it) {
    const ok = spawn(typeof it === 'string' ? it : it.t, typeof it === 'object' ? it : {});
    if (!ok) {
      queue.unshift(it);
      return false;
    }
    return true;
  }

  function pump() {
    if (disposed || !running) return;
    clearTimeout(pumpTimer);
    if (!queue.length) {
      if (settings.danmakuLoop && all.length) {
        queue = shuffle(all);
        pumpTimer = setTimeout(pump, 1200);
      } else {
        running = false;
      }
      return;
    }

    let totalActive = 0;
    for (const L of lanes) totalActive += L.activeCount;
    const MAX_ACTIVE = Math.max(3, Math.min(8, (lanes.length || 4) * 2));
    if (totalActive >= MAX_ACTIVE) {
      pumpTimer = setTimeout(pump, 360 + Math.random() * 180);
      return;
    }

    const item = queue.shift();
    const ok = emit(item);
    const dens = Math.max(1, Math.min(8, Number(settings.danmakuDensity) || 3));
    const baseGap = Math.max(260, Math.round(2000 / dens));
    const gap = ok ? (baseGap * (0.8 + Math.random() * 0.4)) : 180;
    pumpTimer = setTimeout(pump, gap);
  }

  const POOL_MAX = 300;

  return {
    burst(list) {
      if (disposed || !list || !list.length) return;
      all = list.slice();
      queue = list.slice();
      running = true;
      pump();
    },
    spawn,
    clear() {
      clearTimeout(pumpTimer);
      pumpTimer = 0;
      running = false;
      queue = []; all = [];
      try { layer.innerHTML = ''; } catch (e) {}
      for (const L of lanes) { L.freeAt = 0; L.activeCount = 0; }
    },
    feed(list, keepQueue) {
      if (disposed) return;
      if (!list || !list.length) {
        if (!keepQueue) { all = []; queue = []; running = false; clearTimeout(pumpTimer); }
        return;
      }
      const seenAll = new Set(all.map(x => (typeof x === 'string' ? x : x.t)));
      for (const it of list) {
        const k = typeof it === 'string' ? it : it.t;
        if (seenAll.has(k)) continue;
        seenAll.add(k);
        all.push(it);
      }
      if (all.length > POOL_MAX) all = all.slice(all.length - POOL_MAX);

      const have = new Set(queue.map(x => (typeof x === 'string' ? x : x.t)));
      for (const it of shuffle(list)) {
        const k = typeof it === 'string' ? it : it.t;
        if (have.has(k)) continue;
        have.add(k);
        queue.push(it);
      }

      if (!running) { running = true; pump(); }
    },
    pause() {
      clearTimeout(pumpTimer);
      pumpTimer = 0;
      running = false;
      try { layer.innerHTML = ''; } catch (e) {}
      queue = [];
      for (const L of lanes) { L.freeAt = 0; L.activeCount = 0; }
    },
    resume() {
      if (!running && (queue.length || all.length)) {
        running = true;
        pump();
      }
    },
    softReset() {
      for (const L of lanes) { L.freeAt = 0; }
      if (!running && queue.length) { running = true; pump(); }
    },
    rebuild(n) { rebuild(n, true); },
    pump,
    loading(on, text, pct, isErr) {
      try {
        const silent = settings.danmakuSilent !== false;
        if (silent && !isErr) { tip.classList.remove('on'); return; }
        if (text) tipTx.textContent = text;
        tip.classList.toggle('on', !!on);
        tipBar.style.width = (typeof pct === 'number' ? Math.max(0, Math.min(100, pct)) : 0) + '%';
        if (isErr) {
          clearTimeout(tip._t);
          tip._t = setTimeout(() => { try { tip.classList.remove('on'); } catch (e) {} }, 4200);
        }
      } catch (e) {}
    },
    setTracks(n, force) { rebuild(n, force); },
    setEnabled(on) { layer.classList.toggle('on', !!on); if (!on) this.pause(); },
    dispose() {
      disposed = true;
      this.clear();
      try { if (roRef) { roRef.disconnect(); roRef = null; } } catch (e) {}
      try { if (doc.defaultView) doc.defaultView.removeEventListener('resize', queueSync); } catch (e) {}
      try { if (syncTimer) { clearTimeout(syncTimer); syncTimer = 0; } } catch (e) {}
      try { layer.remove(); } catch (e) {}
      try { tip.remove(); } catch (e) {}
    },
    get running() { return running; },
    get count() { return all.length; },
    get pending() { return queue.length; },
    get laneCount() { return lanes.length; },
  };
}
