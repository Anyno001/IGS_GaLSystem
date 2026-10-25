export function createDanmakuPool(options = {}) {
  let buckets = {};
  let windowSize = Math.max(1, Number(options.windowSize) || 6);
  let floorNow = -1;

  return {
    get windowSize() { return windowSize; },
    set windowSize(v) { windowSize = Math.max(1, Number(v) || 6); },
    get floorNow() { return floorNow; },
    set floorNow(v) { floorNow = v; },

    clearFloor() {
      buckets = {};
      floorNow = -1;
    },

    put(sayIdx, list, replace = false) {
      const k = String(sayIdx);
      const old = replace ? [] : (buckets[k] || []);
      const seen = new Set(old.map(x => x.t));
      const add = [];
      for (const it of list) {
        if (!it || !it.t) continue;
        if (seen.has(it.t)) continue;
        seen.add(it.t);
        add.push(it);
      }
      buckets[k] = old.concat(add).slice(0, 120);
    },

    active(sayIdx) {
      const out = [];
      const idx = Number(sayIdx) || 0;
      const from = Math.max(0, idx - (windowSize - 1));
      for (let i = from; i <= idx; i++) {
        const b = buckets[String(i)];
        if (b && b.length) out.push(...b);
      }
      return out;
    },

    total() {
      let n = 0;
      for (const k of Object.keys(buckets)) n += (buckets[k] || []).length;
      return n;
    },

    missing(sayIdx, span) {
      const out = [];
      const idx = Number(sayIdx) || 0;
      const from = Math.max(0, idx - (Math.max(1, Number(span) || 1) - 1));
      for (let i = from; i <= idx; i++) {
        if (!(buckets[String(i)] || []).length) out.push(i);
      }
      return out;
    },

    serialize() {
      return { ...buckets };
    },

    restore(obj) {
      buckets = (obj && typeof obj === 'object') ? { ...obj } : {};
    },
  };
}
