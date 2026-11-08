'use strict';
// ---------- Weltgenerierung & Terrain ----------
const TILE = 32, WS = 512, CH = 16, NCH = WS / CH;
const T = { DEEP: 0, SHALLOW: 1, SAND: 2, GRASS: 3, FOREST: 4, MEADOW: 5, ROCK: 6, SNOW: 7 };
const TCOL = ['#3b8fd6', '#5cbde9', '#f3dd9e', '#82cc5c', '#5eab4b', '#9bd86a', '#aaa49b', '#f4f7fb'];
const TRANK = [0, 1, 2, 3, 3, 3, 4, 5];

const World = {
  seed: 1, tiles: null, mainland: null, landmarks: [], camps: [], spawn: { x: 0, y: 0 },
  chunkObjs: new Map(), chunkCanvas: new Map(), mapCanvas: null,

  tile(tx, ty) { return (tx < 0 || ty < 0 || tx >= WS || ty >= WS) ? T.DEEP : this.tiles[ty * WS + tx]; },
  tileAt(px, py) { return this.tile(Math.floor(px / TILE), Math.floor(py / TILE)); },
  isWater(t) { return t <= T.SHALLOW; },

  generate(seed) {
    this.seed = seed;
    this.tiles = new Uint8Array(WS * WS);
    this.chunkObjs.clear(); this.chunkCanvas.clear();
    const s = seed;
    for (let y = 0; y < WS; y++) for (let x = 0; x < WS; x++) {
      const nx = x / WS - 0.5, ny = y / WS - 0.5;
      const d = Math.sqrt(nx * nx + ny * ny) * 2;
      let h = U.fbm(x / 70, y / 70, s, 5);
      h = h + 0.16 - d * d * 0.62 - Math.max(0, d - 0.85) * 1.5;
      const m = U.fbm(x / 55 + 100, y / 55, s + 77, 4);
      const mt = U.fbm(x / 45, y / 45 + 300, s + 191, 4);
      let t;
      if (h < 0.34) t = T.DEEP;
      else if (h < 0.385) t = T.SHALLOW;
      else if (h < 0.415) t = T.SAND;
      else {
        const mount = mt + (h - 0.5) * 0.9;
        if (mount > 0.77) t = T.SNOW;
        else if (mount > 0.67) t = T.ROCK;
        else if (m > 0.56) t = T.FOREST;
        else if (m < 0.40) t = T.MEADOW;
        else t = T.GRASS;
      }
      this.tiles[y * WS + x] = t;
    }
    this.placeAll();
    this.buildMap();
  },

  floodMainland(sx, sy) {
    const m = new Uint8Array(WS * WS), q = [sy * WS + sx]; m[q[0]] = 1;
    while (q.length) {
      const i = q.pop(), x = i % WS, y = (i / WS) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= WS || ny >= WS) continue;
        const j = ny * WS + nx; if (m[j] || this.tiles[j] <= T.SHALLOW) continue; m[j] = 1; q.push(j);
      }
    }
    return m;
  },

  floodOcean() {
    const m = new Uint8Array(WS * WS), q = [0]; m[0] = 1;
    while (q.length) {
      const i = q.pop(), x = i % WS, y = (i / WS) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= WS || ny >= WS) continue;
        const j = ny * WS + nx; if (m[j] || this.tiles[j] > T.SHALLOW) continue; m[j] = 1; q.push(j);
      }
    }
    return m;
  },
  isOcean(tx, ty) { return tx < 0 || ty < 0 || tx >= WS || ty >= WS || !!this.ocean[ty * WS + tx]; },

  placeAll() {
    const r = U.rng(this.seed * 7 + 3);
    // Startpunkt: Wiese nahe der Mitte
    let best = null;
    for (let rad = 0; rad < 200 && !best; rad += 2) {
      for (let k = 0; k < 40 && !best; k++) {
        const a = r() * TAU, x = Math.round(WS / 2 + Math.cos(a) * rad), y = Math.round(WS / 2 + Math.sin(a) * rad);
        if (this.areaOk(x - 4, y - 4, 10, 8, [T.GRASS, T.MEADOW])) best = { x, y };
      }
    }
    if (!best) best = { x: WS / 2, y: WS / 2 };
    this.mainland = this.floodMainland(best.x, best.y);
    this.ocean = this.floodOcean();
    this.spawn = { x: (best.x + 2) * TILE, y: (best.y + 4) * TILE };
    this.landmarks = []; this.camps = [];
    const add = (type, tx, ty, v = 0) => { const L = LANDMARKS[type]; const lm = { id: this.landmarks.length, type, tx, ty, w: L.w, h: L.h, v }; this.landmarks.push(lm); return lm; };
    add('cabin', best.x, best.y - 1);

    const landOK = [T.SAND, T.GRASS, T.FOREST, T.MEADOW, T.ROCK];
    const find = (w, h, minD, maxD, opts = {}) => {
      for (let tries = 0; tries < 6000; tries++) {
        const a = r() * TAU, d = minD + r() * (maxD - minD);
        const x = Math.round(best.x + Math.cos(a) * d), y = Math.round(best.y + Math.sin(a) * d);
        if (x < 4 || y < 4 || x + w > WS - 4 || y + h > WS - 4) continue;
        if (!this.areaOk(x, y, w, h, opts.types || landOK)) continue;
        if (opts.mainland && !this.mainland[y * WS + x]) continue;
        if (opts.coast && !this.nearWater(x, y, w, h, opts.coast)) continue;
        if (!this.farFromAll(x, y, w, h, opts.space || 10)) continue;
        return { x, y };
      }
      return null;
    };
    const place = (type, minD, maxD, opts, v) => {
      const L = LANDMARKS[type];
      let p = find(L.w, L.h, minD, maxD, opts);
      if (!p) p = find(L.w, L.h, minD * 0.5, maxD * 1.5, Object.assign({}, opts, { types: landOK, coast: opts.coast ? 6 : 0 }));
      if (!p) p = find(L.w, L.h, 5, 240, { mainland: true });
      if (p) add(type, p.x, p.y, v);
    };
    place('workshop', 22, 50, { mainland: true, types: [T.GRASS, T.MEADOW, T.FOREST] });
    place('ship', 25, 120, { mainland: true, types: [T.SAND], coast: 2 });
    for (let i = 0; i < 5; i++) place('house', 18 + i * 25, 60 + i * 35, { types: [T.GRASS, T.MEADOW, T.FOREST] }, i);
    place('windmill', 35, 110, { types: [T.GRASS, T.MEADOW] });
    place('greenhouse', 35, 130, { types: [T.GRASS, T.MEADOW, T.FOREST] });
    place('garage', 55, 160, { mainland: true, types: [T.GRASS, T.MEADOW, T.SAND] });
    place('lighthouse', 70, 220, { types: [T.SAND, T.GRASS, T.ROCK], coast: 3 });
    place('hangar', 110, 230, { types: [T.GRASS, T.MEADOW, T.ROCK, T.SAND] });

    // Überlebende mit Lagerfeuer
    for (let i = 0; i < SURVIVORS.length; i++) {
      const minD = i === 0 ? 12 : 25 + i * 12, maxD = i === 0 ? 22 : 60 + i * 15;
      let p = find(3, 3, minD, maxD, { space: 7, mainland: i < 3 });
      if (!p) p = find(3, 3, 10, 240, { space: 5 });
      if (p) this.camps.push({ i, tx: p.x, ty: p.y, x: (p.x + 1.5) * TILE, y: (p.y + 2) * TILE });
    }
  },

  areaOk(x, y, w, h, types) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (!types.includes(this.tile(i, j))) return false;
    return true;
  },
  nearWater(x, y, w, h, d) {
    for (let j = y - d; j < y + h + d; j++) for (let i = x - d; i < x + w + d; i++) if (this.tile(i, j) <= T.SHALLOW && this.isOcean(i, j)) return true;
    return false;
  },
  farFromAll(x, y, w, h, sp) {
    for (const l of this.landmarks) if (x < l.tx + l.w + sp && x + w + sp > l.tx && y < l.ty + l.h + sp && y + h + sp > l.ty) return false;
    for (const c of this.camps) if (Math.abs(c.tx - x) < sp + 2 && Math.abs(c.ty - y) < sp + 2) return false;
    return true;
  },

  reservedAt(tx, ty) {
    for (const l of this.landmarks) if (tx >= l.tx - 2 && tx < l.tx + l.w + 2 && ty >= l.ty - 3 && ty < l.ty + l.h + 2) return true;
    for (const c of this.camps) if (Math.abs(tx - c.tx - 1) <= 2 && Math.abs(ty - c.ty - 1) <= 2) return true;
    return false;
  },
  nearLandmark(tx, ty) {
    for (const l of this.landmarks) if (tx >= l.tx - 6 && tx < l.tx + l.w + 6 && ty >= l.ty - 6 && ty < l.ty + l.h + 6) return true;
    return false;
  },

  // ---------- Objekte pro Chunk ----------
  objects(cx, cy) {
    const key = cx * 1000 + cy;
    let arr = this.chunkObjs.get(key);
    if (arr) return arr;
    arr = [];
    if (cx >= 0 && cy >= 0 && cx < NCH && cy < NCH) {
      let n = 0;
      for (let ty = cy * CH; ty < cy * CH + CH; ty++) for (let tx = cx * CH; tx < cx * CH + CH; tx++) {
        const t = this.tile(tx, ty);
        if (t <= T.SHALLOW || this.reservedAt(tx, ty)) continue;
        const r = U.hash(tx, ty, this.seed + 5), r2 = U.hash(tx, ty, this.seed + 9);
        let type = null, v = 0;
        if (this.nearLandmark(tx, ty) && r < 0.025) type = 'scrap';
        else if (tx === Math.floor(this.spawn.x / TILE) && ty === Math.floor(this.spawn.y / TILE)) type = null;
        else switch (t) {
          case T.FOREST:
            if (r < 0.26) { type = r2 < 0.5 ? 'oak' : r2 < 0.85 ? 'pine' : 'birch'; }
            else if (r < 0.29) type = 'bush'; else if (r < 0.32) type = 'stick'; else if (r < 0.335) type = 'fiber'; else if (r < 0.34) type = 'pebble';
            break;
          case T.GRASS:
            if (r < 0.045) type = r2 < 0.6 ? 'oak' : 'birch';
            else if (r < 0.06) type = 'bush'; else if (r < 0.095) type = 'fiber'; else if (r < 0.11) type = 'stick';
            else if (r < 0.12) type = 'pebble'; else if (r < 0.127) type = 'rock'; else if (r < 0.15) type = 'flowers';
            break;
          case T.MEADOW:
            if (r < 0.07) type = 'flowers'; else if (r < 0.11) type = 'fiber'; else if (r < 0.13) type = 'bush';
            else if (r < 0.14) type = 'oak'; else if (r < 0.15) type = 'stick'; else if (r < 0.157) type = 'pebble';
            break;
          case T.SAND:
            if (r < 0.025) type = 'palm'; else if (r < 0.045) type = 'shell'; else if (r < 0.055) type = 'pebble'; else if (r < 0.065) type = 'stick';
            break;
          case T.ROCK:
            if (r < 0.09) type = 'rock'; else if (r < 0.115) type = 'ore'; else if (r < 0.14) type = 'pebble'; else if (r < 0.15) type = 'pine';
            else if (r < 0.155) type = 'crystal';
            break;
          case T.SNOW:
            if (r < 0.06) type = 'snowpine'; else if (r < 0.1) { type = 'rock'; v = 1; } else if (r < 0.12) type = 'crystal'; else if (r < 0.13) type = 'ore';
            break;
        }
        if (!type) continue;
        if (type === 'oak') v = Math.floor(r2 * 97) % 3;
        if (type === 'pine' || type === 'bush' || type === 'flowers') v = Math.floor(r2 * 53) % 2;
        const jx = (U.hash(tx, ty, this.seed + 11) - 0.5) * 14, jy = (U.hash(tx, ty, this.seed + 13) - 0.5) * 10;
        const o = { id: cx + '_' + cy + '_' + (n++), type, v, x: tx * TILE + 16 + jx, y: ty * TILE + 22 + jy, hp: OBJ[type].hp, regrowAt: 0, shake: 0 };
        if (G.harvested[o.id]) o.regrowAt = G.harvested[o.id];
        arr.push(o);
      }
    }
    this.chunkObjs.set(key, arr);
    return arr;
  },

  objectsNear(x, y, rad) {
    const out = [];
    const c0x = Math.floor((x - rad) / (CH * TILE)), c1x = Math.floor((x + rad) / (CH * TILE));
    const c0y = Math.floor((y - rad) / (CH * TILE)), c1y = Math.floor((y + rad) / (CH * TILE));
    for (let cy = c0y; cy <= c1y; cy++) for (let cx = c0x; cx <= c1x; cx++) for (const o of this.objects(cx, cy)) {
      if (Math.abs(o.x - x) <= rad && Math.abs(o.y - y) <= rad) out.push(o);
    }
    return out;
  },

  // ---------- Terrain-Rendering pro Chunk ----------
  chunkImage(cx, cy) {
    const key = cx * 1000 + cy;
    let c = this.chunkCanvas.get(key);
    if (c) { this.chunkCanvas.delete(key); this.chunkCanvas.set(key, c); return c; }
    const P = CH * TILE;
    c = mkCanvas(P, P);
    const ctx = c.getContext('2d');
    const x0 = cx * CH, y0 = cy * CH;
    ctx.fillStyle = TCOL[0]; ctx.fillRect(0, 0, P, P);
    const R = TILE * 0.74;
    const layer = (rank, colFn, rad) => {
      for (let ty = y0 - 1; ty <= y0 + CH; ty++) for (let tx = x0 - 1; tx <= x0 + CH; tx++) {
        const t = this.tile(tx, ty); if (TRANK[t] < rank) continue;
        const col = colFn(t); if (!col) continue;
        ctx.fillStyle = col; circ(ctx, (tx - x0) * TILE + 16, (ty - y0) * TILE + 16, rad); ctx.fill();
      }
    };
    // Tiefwasser-Muster
    for (let ty = y0; ty < y0 + CH; ty++) for (let tx = x0; tx < x0 + CH; tx++) {
      if (this.tile(tx, ty) === T.DEEP && U.hash(tx, ty, 3) < 0.25) {
        ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2;
        const px = (tx - x0) * TILE + 8, py = (ty - y0) * TILE + 16;
        ctx.beginPath(); ctx.arc(px + 4, py, 5, Math.PI * 1.1, Math.PI * 1.9); ctx.arc(px + 13, py, 5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      }
    }
    layer(1, () => TCOL[1], R + 2);
    layer(2, () => 'rgba(255,255,255,0.75)', R + 7);
    layer(2, () => '#e3c886', R + 2);
    layer(2, () => TCOL[2], R);
    layer(3, () => '#6aaf48', R + 1);
    layer(3, t => TCOL[t], R);
    layer(4, () => '#8e887f', R + 1);
    layer(4, () => TCOL[6], R);
    layer(5, () => '#d6dde6', R + 1);
    layer(5, () => TCOL[7], R);
    // Details
    for (let ty = y0; ty < y0 + CH; ty++) for (let tx = x0; tx < x0 + CH; tx++) {
      const t = this.tile(tx, ty), h = U.hash(tx, ty, 21), px = (tx - x0) * TILE, py = (ty - y0) * TILE;
      if (t === T.GRASS || t === T.FOREST || t === T.MEADOW) {
        if (h < 0.5) {
          ctx.strokeStyle = U.shade(TCOL[t], -0.18); ctx.lineWidth = 2;
          const gx = px + 6 + h * 40 % 20, gy = py + 10 + (h * 77 % 14);
          ctx.beginPath(); ctx.moveTo(gx, gy + 5); ctx.lineTo(gx - 3, gy); ctx.moveTo(gx + 2, gy + 5); ctx.lineTo(gx + 2, gy - 1); ctx.moveTo(gx + 4, gy + 5); ctx.lineTo(gx + 7, gy + 1); ctx.stroke();
        }
        if (t === T.MEADOW && h > 0.6) {
          const cols = ['#ffffff', '#ffd84a', '#ff9ab8', '#c6a6ff'];
          for (let k = 0; k < 3; k++) { const fx = px + U.hash(tx, ty, 40 + k) * 28 + 2, fy = py + U.hash(tx, ty, 50 + k) * 28 + 2; ctx.fillStyle = cols[(k + Math.floor(h * 10)) % 4]; circ(ctx, fx, fy, 2.2); ctx.fill(); }
        }
        if (t === T.FOREST && h > 0.85) { ctx.fillStyle = 'rgba(40,90,40,.35)'; ell(ctx, px + 16, py + 18, 10, 5); ctx.fill(); }
      } else if (t === T.SAND && h < 0.3) {
        ctx.fillStyle = '#e2c27f'; circ(ctx, px + h * 90 % 28 + 2, py + h * 50 % 28 + 2, 1.5); ctx.fill(); circ(ctx, px + 20, py + h * 70 % 26 + 3, 1.2); ctx.fill();
      } else if (t === T.ROCK && h < 0.35) {
        ctx.strokeStyle = 'rgba(70,60,50,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px + 6, py + 10 + h * 20); ctx.lineTo(px + 14, py + 16); ctx.lineTo(px + 22, py + 12 + h * 10); ctx.stroke();
      } else if (t === T.SNOW && h < 0.2) {
        ctx.fillStyle = '#dfe7f0'; ell(ctx, px + 16, py + 18, 8, 3); ctx.fill();
      }
    }
    // Lagerplätze der Überlebenden: Erde
    for (const cp of this.camps) {
      const px = (cp.tx - x0) * TILE, py = (cp.ty - y0) * TILE;
      if (px > -100 && py > -100 && px < P + 100 && py < P + 100) { ctx.fillStyle = 'rgba(140,100,60,0.35)'; ell(ctx, px + 48, py + 56, 52, 30); ctx.fill(); }
    }
    this.chunkCanvas.set(key, c);
    if (this.chunkCanvas.size > 70) this.chunkCanvas.delete(this.chunkCanvas.keys().next().value);
    return c;
  },

  buildMap() {
    const c = mkCanvas(WS, WS), ctx = c.getContext('2d'), img = ctx.createImageData(WS, WS);
    const rgb = TCOL.map(h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; });
    rgb[T.FOREST] = [70, 150, 60];
    for (let i = 0; i < WS * WS; i++) { const p = rgb[this.tiles[i]]; img.data[i * 4] = p[0]; img.data[i * 4 + 1] = p[1]; img.data[i * 4 + 2] = p[2]; img.data[i * 4 + 3] = 255; }
    ctx.putImageData(img, 0, 0);
    this.mapCanvas = c;
  },
};
