'use strict';
// ---------- Darstellung ----------
const R = {
  cv: null, ctx: null, W: 0, H: 0, dpr: 1, light: null, lctx: null, ambient: [],

  init() {
    this.cv = document.getElementById('game'); this.ctx = this.cv.getContext('2d');
    this.light = mkCanvas(10, 10); this.lctx = this.light.getContext('2d');
    this.resize(); window.addEventListener('resize', () => this.resize());
  },
  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = window.innerWidth; this.H = window.innerHeight;
    this.cv.width = this.W * this.dpr; this.cv.height = this.H * this.dpr;
    this.cv.style.width = this.W + 'px'; this.cv.style.height = this.H + 'px';
    this.light.width = Math.ceil(this.W / 2); this.light.height = Math.ceil(this.H / 2);
  },

  // Welt -> Bildschirm
  sx(x) { return (x - G.cam.x) * G.zoom + this.W / 2; },
  sy(y) { return (y - G.cam.y) * G.zoom + this.H / 2; },
  wx(sx) { return (sx - this.W / 2) / G.zoom + G.cam.x; },
  wy(sy) { return (sy - this.H / 2) / G.zoom + G.cam.y; },

  frame(dt, now) {
    const ctx = this.ctx, p = G.player, z = G.zoom;
    const v = Game.riding(), lift = v && v.type === 'balloon' ? 70 : 0;
    G.cam.x += (p.x - G.cam.x) * Math.min(1, dt * 6);
    G.cam.y += (p.y - lift - G.cam.y) * Math.min(1, dt * 6);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = TCOL[0]; ctx.fillRect(0, 0, this.W, this.H);
    const vw = this.W / z, vh = this.H / z;
    const x0 = G.cam.x - vw / 2, y0 = G.cam.y - vh / 2;
    ctx.save();
    ctx.scale(z, z);
    ctx.translate(Math.round(-x0 * z) / z, Math.round(-y0 * z) / z);
    // Terrain
    const CP = CH * TILE;
    const c0x = Math.floor(x0 / CP), c1x = Math.floor((x0 + vw) / CP), c0y = Math.floor(y0 / CP), c1y = Math.floor((y0 + vh) / CP);
    for (let cy = c0y; cy <= c1y; cy++) for (let cx = c0x; cx <= c1x; cx++) {
      if (cx < 0 || cy < 0 || cx >= NCH || cy >= NCH) continue;
      ctx.drawImage(World.chunkImage(cx, cy), cx * CP, cy * CP, CP + 0.5, CP + 0.5);
    }
    // Wasser-Glitzern
    const tx0 = Math.floor(x0 / TILE), ty0 = Math.floor(y0 / TILE), tx1 = Math.ceil((x0 + vw) / TILE), ty1 = Math.ceil((y0 + vh) / TILE);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const t = World.tile(tx, ty); if (t > T.SHALLOW) continue;
      const h = U.hash(tx, ty, 77); if (h > 0.07) continue;
      const a = Math.sin(now * 1.5 + h * 300) * 0.5 + 0.5;
      ctx.globalAlpha = a * 0.6;
      const px = tx * TILE + 10 + Math.sin(now * 0.7 + h * 50) * 4, py = ty * TILE + 16;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + 6, py - 4, px + 12, py); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Boden-Bauteile
    const dl = [];
    for (let ty = ty0 - 2; ty <= ty1 + 6; ty++) for (let tx = tx0 - 4; tx <= tx1 + 1; tx++) {
      const b = Game.buildAt(tx, ty); if (!b) continue;
      if (b.type === 'part') continue;
      const BB = BUILD_BY_ID[b.type];
      if (BB.floor) Art.drawFloor(ctx, b, tx * TILE, ty * TILE, G.time);
      else dl.push({ y: (ty + (BB.size ? BB.size[1] : 1)) * TILE - 4, k: 'build', b });
    }
    // Lager der Überlebenden
    for (const c of World.camps) {
      if (c.x < x0 - 100 || c.x > x0 + vw + 100 || c.y < y0 - 100 || c.y > y0 + vh + 150) continue;
      const s = G.survivors.find(s => s.i === c.i);
      dl.push({ y: c.y, k: 'camp', c });
      if (s && s.state === 'camp') dl.push({ y: c.y - 22, k: 'tent', c });
    }
    // Objekte
    for (let cy = Math.floor((y0 - 100) / CP); cy <= Math.floor((y0 + vh + 120) / CP); cy++)
      for (let cx = Math.floor((x0 - 60) / CP); cx <= Math.floor((x0 + vw + 60) / CP); cx++)
        for (const o of World.objects(cx, cy)) {
          if (o.x < x0 - 60 || o.x > x0 + vw + 60 || o.y < y0 - 20 || o.y > y0 + vh + 120) continue;
          dl.push({ y: o.y, k: 'obj', o });
        }
    for (const l of World.landmarks) {
      const lx = l.tx * TILE, ly = l.ty * TILE, L = LANDMARKS[l.type];
      if (lx + L.sw < x0 - 80 || lx - 80 > x0 + vw || ly - L.sh > y0 + vh || ly + l.h * TILE + 40 < y0) continue;
      dl.push({ y: (l.ty + l.h) * TILE - 4, k: 'lm', l });
    }
    for (const s of G.survivors) dl.push({ y: s.y, k: 'person', s });
    for (const a of G.animals) dl.push({ y: a.y, k: 'animal', a });
    for (const a of G.pets) dl.push({ y: a.y, k: 'animal', a });
    for (const vv of G.vehicles) if (vv.id !== p.riding) dl.push({ y: vv.y, k: 'veh', v: vv });
    dl.push({ y: p.y + (lift ? 60 : 0), k: 'player' });
    dl.sort((a, b) => a.y - b.y);
    for (const d of dl) this.drawItem(ctx, d, now);
    // Partikel
    for (const pt of G.particles) this.drawParticle(ctx, pt);
    this.ambientUpdate(ctx, dt, now, x0, y0, vw, vh);
    for (const f of G.floaters) {
      const a = 1 - f.t / 1.4; ctx.globalAlpha = a;
      ctx.font = '700 15px Fredoka, Nunito, sans-serif'; ctx.textAlign = 'center';
      ctx.lineWidth = 4; ctx.strokeStyle = '#3a2a22'; ctx.strokeText(f.text, f.x, f.y - f.t * 30); ctx.fillStyle = '#fff6c4'; ctx.fillText(f.text, f.x, f.y - f.t * 30);
      ctx.globalAlpha = 1;
    }
    // Bau-Vorschau
    if (G.buildMode) this.drawGhost(ctx);
    ctx.restore();
    this.drawLight(ctx, now);
    if (G.focus && !UI.panelOpen) this.drawPrompt(ctx, G.focus);
    this.drawObjective(ctx);
  },

  drawItem(ctx, d, now) {
    switch (d.k) {
      case 'obj': {
        const o = d.o, D = OBJ[o.type];
        if (o.regrowAt > G.time) {
          if (D.tree) Art.draw(ctx, 'stump', o.x, o.y);
          else if (o.type === 'bush') Art.draw(ctx, 'bush_e', o.x, o.y);
          else if (o.type === 'rock' || o.type === 'ore') { ctx.fillStyle = 'rgba(120,110,100,.35)'; ell(ctx, o.x, o.y - 2, 10, 4); ctx.fill(); }
          return;
        }
        let name = o.type + (o.type === 'bush' ? o.v : o.v || 0);
        if (!Art.sprites[name]) name = o.type + '0';
        if (o.shake > 0) { ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(Math.sin(o.shake * 60) * 0.06); Art.draw(ctx, name, 0, 0); ctx.restore(); }
        else if (D.tree) { ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(Math.sin(now * 1.2 + o.x * 0.01) * 0.012); Art.draw(ctx, name, 0, 0); ctx.restore(); }
        else Art.draw(ctx, name, o.x, o.y);
        return;
      }
      case 'build': {
        const b = d.b, x = b.tx * TILE + 16, y = b.ty * TILE + 28;
        if (b.type === 'home' || b.type === 'bighome') {
          const [w, h] = BUILD_BY_ID[b.type].size, sp = Art.landmark(b.type === 'home' ? 'house' : 'cabin', false, (b.tx + b.ty) % 3);
          const cx = (b.tx + w / 2) * TILE, by = (b.ty + h) * TILE;
          ctx.drawImage(sp.c, cx - sp.w / 2, by - (sp.h - 6), sp.w, sp.h);
          return;
        }
        if (b.type === 'fence' || b.type === 'wall') {
          const spr = b.type;
          for (const [dx, dy] of [[1, 0], [0, 1]]) {
            const nb = Game.buildAt(b.tx + dx, b.ty + dy);
            if (nb && nb.type === b.type) {
              if (b.type === 'fence') { ctx.lineWidth = 6; ctx.strokeStyle = OL; for (const yy of [-20, -10]) { ctx.beginPath(); ctx.moveTo(x, y + yy); ctx.lineTo(x + dx * 32, y + yy + dy * 32); ctx.stroke(); } ctx.lineWidth = 3; ctx.strokeStyle = '#c68c52'; for (const yy of [-20, -10]) { ctx.beginPath(); ctx.moveTo(x, y + yy); ctx.lineTo(x + dx * 32, y + yy + dy * 32); ctx.stroke(); } }
            }
          }
          Art.draw(ctx, spr, x, y);
        } else if (b.type === 'campfire') { Art.draw(ctx, 'campfire_base', x, y); Art.drawFlame(ctx, x, y - 6, now); }
        else if (b.type === 'sapling') {
          const g = U.clamp((G.time - b.t) / 150, 0, 1);
          if (g >= 1) Art.draw(ctx, 'oak0', x, y);
          else { ctx.save(); ctx.translate(x, y); ctx.scale(0.25 + g * 0.6, 0.25 + g * 0.6); Art.draw(ctx, 'oak0', 0, 0); ctx.restore(); }
        } else Art.draw(ctx, b.type, x, y);
        return;
      }
      case 'camp': { Art.draw(ctx, 'campfire_base', d.c.x, d.c.y); Art.drawFlame(ctx, d.c.x, d.c.y - 6, now + d.c.i); return; }
      case 'tent': { Art.draw(ctx, 'tent', d.c.x - 34, d.c.y - 22); return; }
      case 'lm': return this.drawLandmark(ctx, d.l, now);
      case 'person': {
        const s = d.s;
        Art.person(ctx, s.x, s.y, s.look, s.dir, s.phase, s.moving, false, now);
        if (s.state === 'camp') {
          const bob = Math.sin(now * 3 + s.i) * 3;
          ctx.font = '700 20px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = OL;
          ctx.strokeText('!', s.x, s.y - 58 + bob); ctx.fillStyle = '#ffd34a'; ctx.fillText('!', s.x, s.y - 58 + bob);
        }
        return;
      }
      case 'animal': {
        const a = d.a; Art.animal(ctx, a, now);
        if (a.tame) { ctx.fillStyle = '#ff6f91'; this.heart(ctx, a.x, a.y - (a.type === 'deer' ? 56 : 34), 4); }
        else if (a.hearts) for (let i = 0; i < a.hearts; i++) { ctx.fillStyle = '#ff6f91'; this.heart(ctx, a.x - 10 + i * 10, a.y - 36, 3.2); }
        return;
      }
      case 'veh': return Art.vehicle(ctx, d.v, d.v.x, d.v.y, now, false);
      case 'player': {
        const p = G.player, v = Game.riding();
        if (v) Art.vehicle(ctx, v, p.x, p.y, now, true, PLAYER_LOOK, p.dir, p.moving);
        else Art.person(ctx, p.x, p.y, PLAYER_LOOK, p.dir, p.phase, p.moving, p.act === 'hand' ? null : p.act, now);
        return;
      }
    }
  },

  heart(ctx, x, y, s) {
    ctx.beginPath(); ctx.moveTo(x, y + s);
    ctx.bezierCurveTo(x - s * 2, y - s * 0.5, x - s, y - s * 2, x, y - s * 0.8);
    ctx.bezierCurveTo(x + s, y - s * 2, x + s * 2, y - s * 0.5, x, y + s);
    ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = OL; ctx.stroke();
  },

  drawLandmark(ctx, l, now) {
    const L = LANDMARKS[l.type], st = G.lmStage[l.id] || 0, n = L.stages.length, prog = st / n;
    const cx = (l.tx + l.w / 2) * TILE, by = (l.ty + l.h) * TILE;
    const dx = cx - L.sw / 2, dy = by - (L.sh - 6);
    const ruined = Art.landmark(l.type, true, l.v), fixed = Art.landmark(l.type, false, l.v);
    if (prog >= 1) ctx.drawImage(fixed.c, dx, dy, L.sw, L.sh);
    else {
      ctx.drawImage(ruined.c, dx, dy, L.sw, L.sh);
      if (prog > 0) {
        const cut = L.sh * (1 - prog);
        ctx.save(); ctx.beginPath(); ctx.rect(dx - 10, dy + cut, L.sw + 20, L.sh); ctx.clip(); ctx.drawImage(fixed.c, dx, dy, L.sw, L.sh); ctx.restore();
        // Gerüst
        ctx.lineWidth = 5; ctx.strokeStyle = OL;
        const poles = [dx + 12, dx + L.sw / 2, dx + L.sw - 12];
        for (const pxl of poles) { ctx.beginPath(); ctx.moveTo(pxl, by); ctx.lineTo(pxl, dy + cut - 14); ctx.stroke(); }
        ctx.lineWidth = 3; ctx.strokeStyle = '#d9a35e';
        for (const pxl of poles) { ctx.beginPath(); ctx.moveTo(pxl, by); ctx.lineTo(pxl, dy + cut - 14); ctx.stroke(); }
        rrect(ctx, dx + 4, dy + cut - 6, L.sw - 8, 7, 2); fillOl(ctx, '#c8935e', 2);
      }
    }
    if (l.type === 'windmill' && prog >= 1) {
      const hx = cx, hy = dy + 62;
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(now * 0.8);
      for (let i = 0; i < 4; i++) {
        ctx.rotate(TAU / 4);
        rrect(ctx, -3, -78, 6, 72, 2); fillOl(ctx, '#8d5a32', 2);
        rrect(ctx, 3, -76, 16, 56, 2); fillOl(ctx, '#f8f1e2', 2);
        ctx.strokeStyle = '#c9b48f'; ctx.lineWidth = 1.5; for (let k = -70; k < -24; k += 11) { ctx.beginPath(); ctx.moveTo(3, k); ctx.lineTo(19, k); ctx.stroke(); }
      }
      ctx.restore(); circ(ctx, hx, hy, 7); fillOl(ctx, '#6e4224', 2);
    }
    // Beschriftung, wenn nicht fertig & nah
    if (prog < 1 && U.dist(G.player.x, G.player.y, cx, by) < 360) {
      ctx.font = '700 13px Fredoka, sans-serif'; ctx.textAlign = 'center';
      const txt = L.name + ' ' + st + '/' + n; const w = ctx.measureText(txt).width + 16;
      rrect(ctx, cx - w / 2, dy - 6, w, 20, 10); ctx.fillStyle = 'rgba(255,248,231,.92)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OL; ctx.stroke();
      ctx.fillStyle = OL; ctx.fillText(txt, cx, dy + 9);
    }
  },

  drawParticle(ctx, pt) {
    const a = 1 - pt.t / pt.life;
    ctx.globalAlpha = Math.max(0, a);
    switch (pt.kind) {
      case 'dust': ctx.fillStyle = 'rgba(230,215,180,.8)'; circ(ctx, pt.x, pt.y, 3 + pt.t * 6); ctx.fill(); break;
      case 'leaf': ctx.fillStyle = pt.col; ell(ctx, pt.x, pt.y, 4, 2.5); ctx.fill(); break;
      case 'chip': ctx.fillStyle = pt.col; ctx.fillRect(pt.x - 2, pt.y - 2, 4, 4); break;
      case 'heart': ctx.fillStyle = '#ff6f91'; this.heart(ctx, pt.x, pt.y, 5); break;
      case 'star': ctx.fillStyle = '#ffe066'; ctx.save(); ctx.translate(pt.x, pt.y); ctx.rotate(pt.t * 4); poly(ctx, [0, -6, 2, -2, 6, 0, 2, 2, 0, 6, -2, 2, -6, 0, -2, -2]); ctx.fill(); ctx.restore(); break;
      case 'smoke': ctx.globalAlpha = a * 0.5; ctx.fillStyle = '#e8e8ec'; circ(ctx, pt.x, pt.y, 5 + pt.t * 5); ctx.fill(); break;
    }
    ctx.globalAlpha = 1;
  },

  ambientUpdate(ctx, dt, now, x0, y0, vw, vh) {
    const want = 14;
    const night = G.night > 0.5;
    while (this.ambient.length < want) this.ambient.push({ x: x0 + Math.random() * vw, y: y0 + Math.random() * vh, ph: Math.random() * 10, col: U.pick(['#ffd166', '#ff9ab8', '#a0d8ff', '#ffffff'], Math.random()), night });
    for (const b of this.ambient) {
      b.ph += dt;
      b.x += Math.cos(b.ph * 0.7) * 25 * dt + 8 * dt; b.y += Math.sin(b.ph * 1.1) * 20 * dt;
      if (b.x < x0 - 50 || b.x > x0 + vw + 50 || b.y < y0 - 50 || b.y > y0 + vh + 50 || b.night !== night) { b.x = x0 + Math.random() * vw; b.y = y0 + Math.random() * vh; b.night = night; }
      if (World.tileAt(b.x, b.y) <= T.SAND && !night) continue;
      if (night) {
        ctx.globalAlpha = 0.5 + Math.sin(now * 3 + b.ph * 5) * 0.5;
        ctx.fillStyle = '#eaff8a'; circ(ctx, b.x, b.y, 2.2); ctx.fill();
        ctx.globalAlpha *= 0.3; circ(ctx, b.x, b.y, 6); ctx.fill(); ctx.globalAlpha = 1;
      } else if (G.night < 0.2) {
        const f = Math.abs(Math.sin(now * 14 + b.ph * 3));
        ctx.fillStyle = b.col; ctx.strokeStyle = OL; ctx.lineWidth = 1;
        ell(ctx, b.x - 3 * f, b.y, 3.5 * f + 0.5, 3); ctx.fill(); ctx.stroke();
        ell(ctx, b.x + 3 * f, b.y, 3.5 * f + 0.5, 3); ctx.fill(); ctx.stroke();
      }
    }
  },

  drawGhost(ctx) {
    const tx = Math.floor(this.wx(Input.mx) / TILE), ty = Math.floor(this.wy(Input.my) / TILE);
    if (!Input.mouseInside && !Input.touchMode) return;
    let ok;
    if (G.buildMode === 'remove') ok = !!Game.buildAt(tx, ty);
    else ok = !Game.canPlace(G.buildMode, tx, ty);
    const BS = BUILD_BY_ID[G.buildMode];
    if (BS && BS.size) {
      const fp = Game.footprint(G.buildMode, tx, ty);
      ctx.fillStyle = ok ? 'rgba(120,255,140,.35)' : 'rgba(255,90,90,.35)';
      for (const [x, y] of fp.tiles) { rrect(ctx, x * TILE + 1, y * TILE + 1, TILE - 2, TILE - 2, 6); ctx.fill(); }
      if (ok) {
        const sp = Art.landmark(BS.id === 'home' ? 'house' : 'cabin', false, 0);
        ctx.globalAlpha = 0.55; ctx.drawImage(sp.c, (fp.ox + fp.w / 2) * TILE - sp.w / 2, (fp.oy + fp.h) * TILE - (sp.h - 6), sp.w, sp.h); ctx.globalAlpha = 1;
      }
      return;
    }
    ctx.fillStyle = ok ? 'rgba(120,255,140,.35)' : 'rgba(255,90,90,.35)';
    rrect(ctx, tx * TILE + 1, ty * TILE + 1, TILE - 2, TILE - 2, 6); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = ok ? '#2e8b57' : '#c0392b'; ctx.stroke();
    if (G.buildMode !== 'remove' && ok) {
      ctx.globalAlpha = 0.6;
      const B = BUILD_BY_ID[G.buildMode];
      if (B.floor) Art.drawFloor(ctx, { type: B.id, tx, ty, t: G.time - 999 }, tx * TILE, ty * TILE, G.time);
      else if (B.id === 'campfire') Art.draw(ctx, 'campfire_base', tx * TILE + 16, ty * TILE + 28);
      else if (B.id === 'sapling') { ctx.save(); ctx.translate(tx * TILE + 16, ty * TILE + 28); ctx.scale(0.3, 0.3); Art.draw(ctx, 'oak0', 0, 0); ctx.restore(); }
      else Art.draw(ctx, B.id, tx * TILE + 16, ty * TILE + 28);
      ctx.globalAlpha = 1;
    }
  },

  lights(now) {
    const L = [], p = G.player, v = Game.riding();
    L.push({ x: p.x, y: p.y - 20 - (v && v.type === 'balloon' ? 80 : 0), r: G.upgrades.lamp ? 220 : 120, warm: G.upgrades.lamp });
    const tx0 = Math.floor(this.wx(-200) / TILE), tx1 = Math.floor(this.wx(this.W + 200) / TILE), ty0 = Math.floor(this.wy(-200) / TILE), ty1 = Math.floor(this.wy(this.H + 200) / TILE);
    for (const k in G.builds) {
      const b = G.builds[k]; if (b.tx < tx0 || b.tx > tx1 || b.ty < ty0 || b.ty > ty1) continue;
      const B = BUILD_BY_ID[b.type]; if (B.size) { L.push({ x: (b.tx + B.size[0] / 2) * TILE, y: (b.ty + B.size[1]) * TILE - 30, r: B.light, warm: true }); continue; }
      if (B.light) L.push({ x: b.tx * TILE + 16, y: b.ty * TILE + (b.type === 'lantern' ? -10 : 14), r: B.light * (0.95 + Math.sin(now * 8 + b.tx) * 0.04), warm: b.type !== 'statue' });
    }
    for (const c of World.camps) if (Math.abs(c.x - p.x) < 1400 && Math.abs(c.y - p.y) < 1000) L.push({ x: c.x, y: c.y - 8, r: 140 * (0.95 + Math.sin(now * 7 + c.i) * 0.05), warm: true });
    for (const l of World.landmarks) {
      if (!Game.lmDone(l)) continue;
      const cx = (l.tx + l.w / 2) * TILE, by = (l.ty + l.h) * TILE;
      if (Math.abs(cx - p.x) > 1500 || Math.abs(by - p.y) > 1100) continue;
      if (l.type === 'lighthouse') L.push({ x: cx, y: by - LANDMARKS.lighthouse.sh + 60, r: 260, warm: true });
      else L.push({ x: cx, y: by - 30, r: 150, warm: true });
    }
    return L;
  },

  drawLight(ctx, now) {
    if (G.twilight > 0.01) { ctx.fillStyle = `rgba(255,140,70,${0.13 * G.twilight})`; ctx.fillRect(0, 0, this.W, this.H); }
    if (G.night < 0.01) return;
    const lc = this.lctx, w = this.light.width, h = this.light.height, z = G.zoom / 2;
    lc.globalCompositeOperation = 'source-over'; lc.clearRect(0, 0, w, h);
    lc.fillStyle = `rgba(16,22,58,${0.72 * G.night})`; lc.fillRect(0, 0, w, h);
    lc.globalCompositeOperation = 'destination-out';
    const ls = this.lights(now);
    for (const l of ls) {
      const x = this.sx(l.x) / 2, y = this.sy(l.y) / 2, r = l.r * z;
      const g = lc.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.5, 'rgba(0,0,0,.7)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = g; lc.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.drawImage(this.light, 0, 0, this.W, this.H);
    ctx.globalCompositeOperation = 'lighter';
    for (const l of ls) {
      if (!l.warm) continue;
      const x = this.sx(l.x), y = this.sy(l.y), r = l.r * G.zoom * 0.7;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,170,80,${0.22 * G.night})`); g.addColorStop(1, 'rgba(255,170,80,0)');
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    // Leuchtturm-Strahl
    for (const l of World.landmarks) {
      if (l.type !== 'lighthouse' || !Game.lmDone(l)) continue;
      const cx = this.sx((l.tx + l.w / 2) * TILE), cy = this.sy((l.ty + l.h) * TILE - LANDMARKS.lighthouse.sh + 60);
      if (cx < -1500 || cx > this.W + 1500 || cy < -1500 || cy > this.H + 1500) continue;
      const a = now * 0.8;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
      const g = ctx.createLinearGradient(0, 0, 900, 0); g.addColorStop(0, `rgba(255,240,170,${0.45 * G.night})`); g.addColorStop(1, 'rgba(255,240,170,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(900, -90); ctx.lineTo(900, 90); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  },

  drawPrompt(ctx, f) {
    const x = this.sx(f.x), y = this.sy(f.y) - 44 * G.zoom;
    const key = Input.touchMode ? '✋' : 'E';
    ctx.font = '700 15px Fredoka, Nunito, sans-serif';
    const tw = ctx.measureText(f.label).width, w = tw + 46, h = 30;
    ctx.save(); ctx.translate(Math.round(x - w / 2), Math.round(y - h));
    rrect(ctx, 0, 0, w, h, 15); ctx.fillStyle = 'rgba(255,248,231,.96)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OL; ctx.stroke();
    poly(ctx, [w / 2 - 6, h, w / 2 + 6, h, w / 2, h + 7]); ctx.fillStyle = 'rgba(255,248,231,.96)'; ctx.fill(); ctx.stroke();
    rrect(ctx, 5, 4, 24, 22, 7); ctx.fillStyle = '#ffd34a'; ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = OL; ctx.textAlign = 'center'; ctx.fillText(key, 17, 20);
    ctx.textAlign = 'left'; ctx.fillText(f.label, 36, 20);
    ctx.restore();
  },

  drawObjective(ctx) {
    const tgt = UI.goalTarget; if (!tgt) return;
    const sx = this.sx(tgt.x), sy = this.sy(tgt.y);
    const m = 60;
    if (sx > m && sx < this.W - m && sy > m && sy < this.H - m) {
      const bob = Math.sin(performance.now() / 250) * 5;
      ctx.save(); ctx.translate(sx, sy - 30 + bob);
      poly(ctx, [-11, -18, 11, -18, 0, 0]); ctx.fillStyle = '#ffd34a'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OL; ctx.stroke();
      ctx.restore(); return;
    }
    const cx = this.W / 2, cy = this.H / 2, ang = Math.atan2(sy - cy, sx - cx);
    const ex = U.clamp(cx + Math.cos(ang) * 2000, m, this.W - m), ey = U.clamp(cy + Math.sin(ang) * 2000, m + 40, this.H - m - 50);
    const dist = Math.round(U.dist(G.player.x, G.player.y, tgt.x, tgt.y) / TILE);
    ctx.save(); ctx.translate(ex, ey);
    circ(ctx, 0, 0, 22); ctx.fillStyle = 'rgba(255,248,231,.95)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OL; ctx.stroke();
    ctx.rotate(ang); poly(ctx, [16, 0, 2, -9, 2, 9]); ctx.fillStyle = '#ffb72b'; ctx.fill(); ctx.lineWidth = 2; ctx.stroke(); ctx.rotate(-ang);
    ctx.font = '700 11px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = OL; ctx.fillText(dist + 'm', -Math.cos(ang) * 4, 30 + 6);
    ctx.restore();
  },
};

// ---------- Minikarte & große Karte ----------
const MiniMap = {
  fog: null, fctx: null, dirty: true,
  init() { this.fog = mkCanvas(EXW, EXW); this.fctx = this.fog.getContext('2d'); },
  updateFog() {
    const img = this.fctx.createImageData(EXW, EXW);
    for (let i = 0; i < EXW * EXW; i++) { const e = G.revealAll || G.explored[i]; img.data[i * 4] = 40; img.data[i * 4 + 1] = 52; img.data[i * 4 + 2] = 70; img.data[i * 4 + 3] = e ? 0 : 255; }
    this.fctx.putImageData(img, 0, 0); this.dirty = false;
  },
  draw(cv, full) {
    if (this.dirty) this.updateFog();
    const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, p = G.player;
    ctx.imageSmoothingEnabled = !full;
    let sc, ox, oy;
    if (full) { sc = Math.min(W, H) / WS; ox = (W - WS * sc) / 2; oy = (H - WS * sc) / 2; }
    else { sc = 1.6; ox = W / 2 - p.x / TILE * sc; oy = H / 2 - p.y / TILE * sc; }
    ctx.fillStyle = '#28344a'; ctx.fillRect(0, 0, W, H);
    ctx.drawImage(World.mapCanvas, ox, oy, WS * sc, WS * sc);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.fog, ox, oy, WS * sc, WS * sc);
    const icon = (x, y, col, r, txt) => {
      const X = ox + x / TILE * sc, Y = oy + y / TILE * sc; if (X < -10 || Y < -10 || X > W + 10 || Y > H + 10) return;
      circ(ctx, X, Y, r); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#3a2a22'; ctx.stroke();
      if (txt && full) { ctx.font = '600 12px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.strokeText(txt, X, Y - r - 4); ctx.fillStyle = '#3a2a22'; ctx.fillText(txt, X, Y - r - 4); }
    };
    const vis = (x, y) => G.revealAll || G.explored[Math.floor(y / TILE / EXP) * EXW + Math.floor(x / TILE / EXP)];
    for (const l of World.landmarks) {
      const x = (l.tx + l.w / 2) * TILE, y = (l.ty + l.h / 2) * TILE;
      if (!G.discovered[l.id] && !vis(x, y)) continue;
      icon(x, y, Game.lmDone(l) ? '#06d6a0' : '#ffb72b', full ? 7 : 4, LANDMARKS[l.type].name);
    }
    for (const s of G.survivors) if (s.state === 'camp' && (vis(s.x, s.y) || G.upgrades.compass)) icon(s.x, s.y, '#ff6f91', full ? 5 : 3, full ? SURVIVORS[s.i].name : '');
    for (const v of G.vehicles) if (v.id !== p.riding) icon(v.x, v.y, '#4ea8de', full ? 5 : 3, full ? { bike: 'Fahrrad', scooter: 'Roller', boat: 'Boot', balloon: 'Ballon' }[v.type] : '');
    if (UI.goalTarget) { const X = ox + UI.goalTarget.x / TILE * sc, Y = oy + UI.goalTarget.y / TILE * sc; ctx.strokeStyle = '#ffd34a'; ctx.lineWidth = 3; circ(ctx, X, Y, full ? 12 : 7); ctx.stroke(); }
    const X = ox + p.x / TILE * sc, Y = oy + p.y / TILE * sc;
    circ(ctx, X, Y, full ? 7 : 5); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#e8414f'; ctx.stroke();
  },
};
