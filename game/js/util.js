'use strict';
// ---------- Hilfsfunktionen: Zufall, Rauschen, Mathe ----------
const U = {};

U.hash = (x, y, s) => {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 982451653)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
};

U.rng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

U.noise = (x, y, s) => {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = U.hash(xi, yi, s), b = U.hash(xi + 1, yi, s);
  const c = U.hash(xi, yi + 1, s), d = U.hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};

U.fbm = (x, y, s, oct) => {
  let t = 0, amp = 1, f = 1, n = 0;
  for (let i = 0; i < oct; i++) {
    t += amp * U.noise(x * f, y * f, s + i * 131);
    n += amp; amp *= 0.5; f *= 2;
  }
  return t / n;
};

U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
U.lerp = (a, b, t) => a + (b - a) * t;
U.dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
U.smooth = (a, b, x) => { const t = U.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
U.pick = (arr, r) => arr[Math.floor(r * arr.length) % arr.length];

U.shade = (hex, amt) => {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (amt >= 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  return '#' + ((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1);
};

U.rectDist = (px, py, x, y, w, h) => {
  const dx = Math.max(x - px, 0, px - (x + w));
  const dy = Math.max(y - py, 0, py - (y + h));
  return Math.hypot(dx, dy);
};

U.fmtNeed = (need) => Object.entries(need).map(([k, v]) => `${v} ${ITEMS[k].name}`).join(', ');
