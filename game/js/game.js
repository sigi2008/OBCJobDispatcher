'use strict';
// ---------- Spielzustand & Logik ----------
const DAY = 480; // Sekunden pro Tag
const SAVE_KEY = 'neuland_save_v1';
const EXP = 4, EXW = WS / EXP; // Erkundungsraster

const PLAYER_LOOK = { skin: '#f6d2b5', hair: '#7a4528', shirt: '#4ea8de', pants: '#3d5a80', style: 2 };
const SKINS = ['#f6d2b5', '#e8b48f', '#c68a5e', '#8d5a3b', '#f1c9a5', '#d9a07a'];
const HAIRS = ['#2b1d16', '#7a4528', '#e2b34a', '#c4502c', '#d8d8d8', '#4a2f22', '#1d1d2b'];
const SHIRTS = ['#e8414f', '#06d6a0', '#ffd166', '#b388ff', '#ff9a4a', '#6fc3ff', '#f78fb3', '#8bc34a'];
function lookFor(i) {
  const r = U.rng(i * 97 + 13);
  return { skin: U.pick(SKINS, r()), hair: U.pick(HAIRS, r()), shirt: U.pick(SHIRTS, r()), pants: U.pick(['#3d5a80', '#5a4636', '#2f4f4f', '#6b5b95'], r()), style: Math.floor(r() * 4), hat: U.pick(['#e05a4f', '#ffd166', '#4ea8de'], r()) };
}

const G = {
  started: false, time: 0, seed: 1, inv: {}, tools: { axe: 0, pick: 0 }, upgrades: {},
  harvested: {}, builds: {}, lmStage: {}, discovered: {}, survivors: [], pets: [], vehicles: [], storage: {},
  explored: null, revealAll: false, player: null, animals: [], particles: [], floaters: [],
  night: 0, twilight: 0, zoom: 1, buildMode: null, prodTimer: 0, focus: null, nextVid: 1, lastSave: 0, cam: { x: 0, y: 0 },
};

const Game = {
  // ---------- Neues Spiel / Laden ----------
  newGame(seed) {
    G.seed = seed || (Math.random() * 1e9) | 0;
    G.time = 0; G.inv = {}; G.tools = { axe: 0, pick: 0 }; G.upgrades = {}; G.harvested = {}; G.builds = {};
    G.lmStage = {}; G.discovered = {}; G.pets = []; G.vehicles = []; G.storage = {}; G.revealAll = false; G.animals = [];
    G.explored = new Uint8Array(EXW * EXW); G.nextVid = 1; G.prodTimer = 0;
    World.generate(G.seed);
    G.survivors = World.camps.map(c => ({ i: c.i, state: 'camp', helped: false, x: c.x + 26, y: c.y + 6, hx: c.x + 26, hy: c.y + 6, dir: 0, phase: 0, moving: false, tx: 0, ty: 0, wait: 0, look: lookFor(c.i) }));
    G.player = { x: World.spawn.x, y: World.spawn.y, dir: 0, phase: 0, moving: false, riding: null, act: null, actT: 0, face: 1 };
    G.cam.x = G.player.x; G.cam.y = G.player.y;
    G.inv = { wood: 0, stone: 0 };
    G.started = true;
    UI.toast('Willkommen in Neuland! Sammle Äste, Kiesel und Fasern.', 'wood');
  },

  save() {
    if (!G.started) return;
    let bin = ''; const ex = G.explored; for (let i = 0; i < ex.length; i++) bin += String.fromCharCode(ex[i]);
    const data = {
      v: 1, seed: G.seed, time: G.time, inv: G.inv, tools: G.tools, upgrades: G.upgrades, harvested: G.harvested,
      builds: G.builds, lmStage: G.lmStage, discovered: G.discovered, storage: G.storage, revealAll: G.revealAll,
      survivors: G.survivors.map(s => ({ i: s.i, state: s.state, helped: s.helped })),
      pets: G.pets.map(p => ({ type: p.type, var: p.var, name: p.name, x: p.x, y: p.y, stay: p.stay, hx: p.hx, hy: p.hy })),
      vehicles: G.vehicles.map(v => ({ id: v.id, type: v.type, x: v.x, y: v.y })), nextVid: G.nextVid,
      player: { x: G.player.x, y: G.player.y, riding: G.player.riding }, explored: btoa(bin), zoom: G.zoom,
      music: Sound.musicOn, sfx: Sound.sfxOn,
    };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); G.lastSave = G.time; return true; } catch (e) { return false; }
  },

  hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } },

  load() {
    let d; try { d = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return false; }
    if (!d) return false;
    G.seed = d.seed; G.harvested = d.harvested || {};
    World.generate(G.seed);
    Object.assign(G, { time: d.time, inv: d.inv, tools: d.tools, upgrades: d.upgrades || {}, builds: d.builds || {}, lmStage: d.lmStage || {}, discovered: d.discovered || {}, storage: d.storage || {}, revealAll: !!d.revealAll, nextVid: d.nextVid || 1, zoom: d.zoom || 1 });
    G.explored = new Uint8Array(EXW * EXW);
    try { const bin = atob(d.explored); for (let i = 0; i < bin.length && i < G.explored.length; i++) G.explored[i] = bin.charCodeAt(i); } catch (e) { }
    const base = this.basePos();
    G.survivors = World.camps.map(c => {
      const sd = (d.survivors || []).find(s => s.i === c.i) || { state: 'camp', helped: false };
      const s = { i: c.i, state: sd.state, helped: sd.helped, x: c.x + 26, y: c.y + 6, hx: c.x + 26, hy: c.y + 6, dir: 0, phase: 0, moving: false, tx: 0, ty: 0, wait: 0, look: lookFor(c.i) };
      if (s.state === 'base' && base) { s.hx = base.x + (Math.random() - 0.5) * 120; s.hy = base.y + 30 + Math.random() * 60; s.x = s.hx; s.y = s.hy; }
      return s;
    });
    G.pets = (d.pets || []).map(p => this.mkAnimal(p.type, p.x, p.y, { var: p.var, tame: true, name: p.name, stay: p.stay, hx: p.hx, hy: p.hy }));
    G.vehicles = (d.vehicles || []).map(v => ({ id: v.id, type: v.type, x: v.x, y: v.y, face: 1 }));
    G.player = { x: d.player.x, y: d.player.y, dir: 0, phase: 0, moving: false, riding: d.player.riding || null, act: null, actT: 0, face: 1 };
    if (G.player.riding && !G.vehicles.find(v => v.id === G.player.riding)) G.player.riding = null;
    G.cam.x = G.player.x; G.cam.y = G.player.y;
    if (d.music === false) Sound.musicOn = false;
    if (d.sfx === false) Sound.sfxOn = false;
    G.animals = []; G.started = true;
    UI.toast('Willkommen zurück!', 'flower');
    return true;
  },

  // ---------- Inventar ----------
  has(need) { return Object.entries(need).every(([k, v]) => (G.inv[k] || 0) >= v); },
  take(need) { for (const [k, v] of Object.entries(need)) G.inv[k] = (G.inv[k] || 0) - v; UI.dirty = true; },
  give(items, x, y) {
    let i = 0;
    for (const [k, v] of Object.entries(items)) {
      G.inv[k] = (G.inv[k] || 0) + v;
      if (x !== undefined) G.floaters.push({ x, y: y - 30 - i * 16, text: '+' + v + ' ' + ITEMS[k].name, icon: k, t: 0 });
      i++;
    }
    UI.dirty = true;
  },

  // ---------- Fortschritt ----------
  lmDone(lm) { return (G.lmStage[lm.id] || 0) >= LANDMARKS[lm.type].stages.length; },
  isRestored(type) { return World.landmarks.some(l => l.type === type && this.lmDone(l)); },
  cabin() { return World.landmarks[0]; },
  basePos() { const c = this.cabin(); return c && this.lmDone(c) ? { x: (c.tx + c.w / 2) * TILE, y: (c.ty + c.h) * TILE } : null; },
  capacity() { return World.landmarks.filter(l => (l.type === 'cabin' || l.type === 'house') && this.lmDone(l)).length * 2; },
  residents() { return G.survivors.filter(s => s.state === 'base').length; },

  // ---------- Bewegung & Kollision ----------
  buildAt(tx, ty) { return G.builds[tx + ',' + ty]; },
  walkableTile(tx, ty) {
    const t = World.tile(tx, ty); if (t >= T.SAND) return true;
    const b = this.buildAt(tx, ty); return !!(b && b.type === 'bridge');
  },
  solidHit(x, y, r = 7) {
    for (const o of World.objectsNear(x, y, 40)) {
      const d = OBJ[o.type]; if (!d.solid || o.regrowAt > G.time) continue;
      if ((o.x - x) ** 2 + ((o.y - y) * 1.4) ** 2 < (d.solid + r) ** 2) return true;
    }
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    for (let j = ty - 1; j <= ty + 1; j++) for (let i = tx - 1; i <= tx + 1; i++) {
      const b = this.buildAt(i, j); if (!b || !BUILD_BY_ID[b.type].solid) continue;
      const m = b.type === 'fence' ? 10 : 4;
      if (x > i * TILE + m - r && x < (i + 1) * TILE - m + r && y > j * TILE + 10 - r && y < (j + 1) * TILE - 2 + r) return true;
    }
    for (const l of World.landmarks) {
      const lx = l.tx * TILE, ly = l.ty * TILE;
      if (x > lx + 4 - r && x < lx + l.w * TILE - 4 + r && y > ly + 6 - r && y < ly + l.h * TILE - 2 + r) return true;
    }
    for (const c of World.camps) if ((x - c.x) ** 2 + ((y - c.y) * 1.4) ** 2 < 18 ** 2) return true;
    return false;
  },
  canStand(x, y, mode) {
    if (x < TILE || y < TILE || x > (WS - 1) * TILE || y > (WS - 1) * TILE) return false;
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (mode === 'air') return true;
    if (mode === 'water') { const t = World.tile(tx, ty); return t <= T.SHALLOW && !this.solidHit(x, y, 4); }
    if (!this.walkableTile(tx, ty)) return false;
    return !this.solidHit(x, y);
  },

  vehicleMode(type) { return type === 'boat' ? 'water' : type === 'balloon' ? 'air' : 'land'; },
  riding() { return G.player.riding ? G.vehicles.find(v => v.id === G.player.riding) : null; },

  playerSpeed() {
    const v = this.riding();
    if (v) return { bike: 300, scooter: 440, boat: 320, balloon: 400 }[v.type];
    let s = 150 * (G.upgrades.shoes ? 1.2 : 1);
    const b = this.buildAt(Math.floor(G.player.x / TILE), Math.floor(G.player.y / TILE));
    if (b && (b.type === 'path' || b.type === 'shellpath' || b.type === 'bridge')) s *= 1.3;
    return s;
  },

  updatePlayer(dt) {
    const p = G.player, inp = Input.move();
    const v = this.riding(), mode = v ? this.vehicleMode(v.type) : 'foot';
    let dx = inp.x, dy = inp.y;
    if (UI.panelOpen) dx = dy = 0;
    p.moving = !!(dx || dy);
    if (p.moving) {
      p.act = null;
      const sp = this.playerSpeed() * dt;
      const nx = p.x + dx * sp, ny = p.y + dy * sp;
      if (this.canStand(nx, p.y, mode)) p.x = nx;
      if (this.canStand(p.x, ny, mode)) p.y = ny;
      if (Math.abs(dx) > Math.abs(dy)) p.dir = dx < 0 ? 2 : 3; else p.dir = dy < 0 ? 1 : 0;
      if (dx) p.face = dx < 0 ? -1 : 1;
      p.phase += dt * (v ? 8 : 11);
      if (v) { v.x = p.x; v.y = p.y; v.face = p.face; }
      if (!v && Math.random() < dt * 6) G.particles.push({ kind: 'dust', x: p.x + (Math.random() - 0.5) * 8, y: p.y, vx: -dx * 20, vy: -10, life: 0.5, t: 0 });
    }
    // Erkunden
    const rad = v && v.type === 'balloon' ? 9 : 6;
    const ex = Math.floor(p.x / TILE / EXP), ey = Math.floor(p.y / TILE / EXP);
    for (let j = ey - rad; j <= ey + rad; j++) for (let i = ex - rad; i <= ex + rad; i++) {
      if (i < 0 || j < 0 || i >= EXW || j >= EXW) continue;
      if ((i - ex) ** 2 + (j - ey) ** 2 <= rad * rad && !G.explored[j * EXW + i]) { G.explored[j * EXW + i] = 1; MiniMap.dirty = true; }
    }
    // Entdeckungen
    for (const l of World.landmarks) {
      if (G.discovered[l.id]) continue;
      if (U.dist(p.x, p.y, (l.tx + l.w / 2) * TILE, (l.ty + l.h / 2) * TILE) < 300) {
        G.discovered[l.id] = true; UI.toast('Entdeckt: ' + LANDMARKS[l.type].name, 'planks'); Sound.play('friend');
      }
    }
  },

  // ---------- Interaktion ----------
  findFocus() {
    const p = G.player, v = this.riding();
    if (v) return { kind: 'dismount', label: v.type === 'balloon' ? 'Landen' : 'Absteigen', x: p.x, y: p.y };
    const fx = [0, 0, -1, 1][p.dir], fy = [1, -1, 0, 0][p.dir];
    const cx = p.x + fx * 10, cy = p.y - 8 + fy * 10;
    let best = null, bs = 1e9;
    const consider = (f, d, range, bonus = 0) => { if (d > range) return; const s = d - bonus; if (s < bs) { bs = s; best = f; } };
    for (const vv of G.vehicles) consider({ kind: 'mount', v: vv, label: { bike: 'Fahrrad fahren', scooter: 'Roller fahren', boat: 'Boot fahren', balloon: 'Ballon fliegen' }[vv.type], x: vv.x, y: vv.y }, U.dist(p.x, p.y, vv.x, vv.y), 46, 10);
    for (const s of G.survivors) consider({ kind: 'talk', s, label: 'Mit ' + SURVIVORS[s.i].name + ' reden', x: s.x, y: s.y }, U.dist(cx, cy, s.x, s.y - 10), 52, 12);
    for (const a of G.animals.concat(G.pets)) consider({ kind: 'animal', a, label: a.tame ? (a.stay ? a.name + ': Folge mir!' : a.name + ': Bleib hier!') : ANIMALS[a.type].name + ' füttern (Beere)', x: a.x, y: a.y }, U.dist(cx, cy, a.x, a.y - 8), 46, 8);
    for (const l of World.landmarks) {
      const d = U.rectDist(p.x, p.y, l.tx * TILE, l.ty * TILE, l.w * TILE, l.h * TILE);
      consider({ kind: 'landmark', l, label: this.lmDone(l) ? LANDMARKS[l.type].name + ' öffnen' : LANDMARKS[l.type].name + ' reparieren', x: (l.tx + l.w / 2) * TILE, y: l.ty * TILE }, d, 26, 5);
    }
    const ptx = Math.floor(cx / TILE), pty = Math.floor(cy / TILE);
    for (let j = pty - 1; j <= pty + 1; j++) for (let i = ptx - 1; i <= ptx + 1; i++) {
      const b = this.buildAt(i, j); if (!b) continue;
      const bx = i * TILE + 16, by = j * TILE + 20, d = U.dist(cx, cy, bx, by);
      if (b.type === 'garden') consider({ kind: 'build', b, label: G.time - b.t >= 90 ? 'Beeren ernten' : 'Wächst noch…', x: bx, y: by }, d, 40);
      if (b.type === 'sapling' && G.time - b.t >= 150) consider({ kind: 'build', b, label: 'Baum fällen', x: bx, y: by - 40 }, d, 40);
      if (b.type === 'bench') consider({ kind: 'build', b, label: 'Ausruhen', x: bx, y: by }, d, 36);
    }
    for (const o of World.objectsNear(cx, cy, 48)) {
      if (o.regrowAt > G.time) continue;
      consider({ kind: 'gather', o, label: OBJ[o.type].name + (OBJ[o.type].tool ? ' abbauen' : ' sammeln'), x: o.x, y: o.y - 20 }, U.dist(cx, cy, o.x, o.y - 6), 40);
    }
    return best;
  },

  interact() {
    const f = G.focus; if (!f) return;
    const p = G.player;
    switch (f.kind) {
      case 'dismount': return this.dismount();
      case 'mount': p.riding = f.v.id; p.x = f.v.x; p.y = f.v.y; Sound.play('mount'); UI.toast(f.label + '! [E] zum Absteigen'); return;
      case 'talk': return UI.openSurvivor(f.s);
      case 'animal': return this.animalInteract(f.a);
      case 'landmark': return UI.openLandmark(f.l);
      case 'build': return this.buildInteract(f.b);
    }
  },

  dismount() {
    const p = G.player, v = this.riding(); if (!v) return;
    const m = this.vehicleMode(v.type);
    if (m === 'land') { p.riding = null; p.x += 18 * p.face; if (!this.canStand(p.x, p.y, 'foot')) p.x -= 18 * p.face; Sound.play('mount'); return; }
    if (m === 'air') {
      if (this.canStand(p.x, p.y, 'foot')) { p.riding = null; p.y += 20; if (!this.canStand(p.x, p.y, 'foot')) p.y -= 20; Sound.play('mount'); }
      else UI.toast('Hier kann der Ballon nicht landen – flieg über festen Boden.');
      return;
    }
    // Boot: Ufer suchen
    for (let r = 20; r <= 60; r += 10) for (let a = 0; a < 16; a++) {
      const ang = a / 16 * TAU, x = p.x + Math.cos(ang) * r, y = p.y + Math.sin(ang) * r;
      if (this.canStand(x, y, 'foot')) { p.riding = null; p.x = x; p.y = y; Sound.play('mount'); return; }
    }
    UI.toast('Fahre näher ans Ufer, um auszusteigen.');
  },

  gather(dt) {
    const f = G.focus, p = G.player;
    if (!f || f.kind !== 'gather') { p.act = null; return; }
    const o = f.o, d = OBJ[o.type];
    if (d.tool) {
      const tier = G.tools[d.tool] || 0;
      if (tier < d.tier) {
        if (!this._warn || G.time - this._warn > 2) {
          this._warn = G.time; Sound.play('nope');
          UI.toast(d.tier === 2 ? 'Dafür brauchst du eine Eisenspitzhacke.' : d.tool === 'axe' ? 'Du brauchst eine Axt! Öffne Herstellen [C].' : 'Du brauchst eine Spitzhacke! Öffne Herstellen [C].', d.tool);
        }
        p.act = null; return;
      }
    }
    p.act = d.tool || 'hand';
    if (o.x < p.x - 4) { p.dir = 2; p.face = -1; } else if (o.x > p.x + 4) { p.dir = 3; p.face = 1; }
    p.actT += dt;
    const hitTime = d.tool ? 0.42 : 0.3;
    if (p.actT >= hitTime) {
      p.actT = 0;
      const dmg = d.tool ? G.tools[d.tool] : 1;
      o.hp -= dmg; o.shake = 0.25;
      Sound.play(d.tool === 'axe' ? 'chop' : d.tool === 'pick' ? 'mine' : 'pick');
      for (let i = 0; i < 4; i++) G.particles.push({ kind: d.tree ? 'leaf' : d.tool === 'pick' ? 'chip' : 'leaf', x: o.x + (Math.random() - 0.5) * 20, y: o.y - (d.tree ? 40 : 10), vx: (Math.random() - 0.5) * 80, vy: -40 - Math.random() * 60, life: 0.9, t: 0, col: d.tree ? '#6cc75a' : '#bbb' });
      if (o.hp <= 0) {
        o.hp = d.hp; o.regrowAt = G.time + d.regrow * (0.8 + Math.random() * 0.4);
        G.harvested[o.id] = o.regrowAt;
        this.give(d.drops, o.x, o.y);
        p.act = null;
      }
    }
  },

  animalInteract(a) {
    if (a.tame) {
      a.stay = !a.stay;
      if (a.stay) { a.hx = a.x; a.hy = a.y; UI.toast(a.name + ' bleibt jetzt hier.'); }
      else UI.toast(a.name + ' folgt dir wieder!');
      Sound.play('click'); return;
    }
    if ((G.inv.berries || 0) < 1) { UI.toast('Tiere lieben Beeren! Sammle welche an Sträuchern.', 'berries'); Sound.play('nope'); return; }
    G.inv.berries--; UI.dirty = true;
    a.hearts = (a.hearts || 0) + 1; a.wait = 1.5; a.moving = false;
    G.particles.push({ kind: 'heart', x: a.x, y: a.y - 30, vx: 0, vy: -30, life: 1.2, t: 0 });
    Sound.play('pick');
    if (a.hearts >= 3) {
      a.tame = true; a.name = U.pick(ANIMALS[a.type].names, Math.random());
      G.animals.splice(G.animals.indexOf(a), 1); G.pets.push(a);
      for (let i = 0; i < 6; i++) G.particles.push({ kind: 'heart', x: a.x + (Math.random() - 0.5) * 30, y: a.y - 30, vx: (Math.random() - 0.5) * 40, vy: -40 - Math.random() * 30, life: 1.5, t: 0 });
      UI.toast(a.name + ' (' + ANIMALS[a.type].name + ') ist jetzt dein Freund!', 'flower'); Sound.play('friend');
    } else UI.toast(ANIMALS[a.type].name + ' mag dich! (' + a.hearts + '/3)');
  },

  buildInteract(b) {
    if (b.type === 'garden') {
      if (G.time - b.t >= 90) { b.t = G.time; this.give({ berries: 3 }, b.tx * TILE + 16, b.ty * TILE); Sound.play('pick'); }
      else UI.toast('Die Beeren brauchen noch ' + Math.ceil(90 - (G.time - b.t)) + ' Sekunden.');
    } else if (b.type === 'sapling') {
      if (G.tools.axe < 1) { UI.toast('Du brauchst eine Axt.', 'axe'); return; }
      b.t = G.time; this.give({ wood: 4 }, b.tx * TILE + 16, b.ty * TILE); Sound.play('chop');
    } else if (b.type === 'bench') {
      UI.toast('Du genießt die Aussicht… herrlich ruhig hier. ☀️'); G.particles.push({ kind: 'heart', x: G.player.x, y: G.player.y - 50, vx: 0, vy: -25, life: 1.4, t: 0 });
    }
  },

  // ---------- Ruinen reparieren ----------
  repair(lm) {
    const L = LANDMARKS[lm.type], st = G.lmStage[lm.id] || 0;
    if (st >= L.stages.length) return false;
    const need = L.stages[st];
    if (!this.has(need)) { Sound.play('nope'); return false; }
    this.take(need);
    G.lmStage[lm.id] = st + 1;
    const cx = (lm.tx + lm.w / 2) * TILE, cy = (lm.ty + lm.h) * TILE;
    for (let i = 0; i < 24; i++) G.particles.push({ kind: 'star', x: cx + (Math.random() - 0.5) * lm.w * TILE, y: cy - Math.random() * 100, vx: (Math.random() - 0.5) * 60, vy: -30 - Math.random() * 60, life: 1.4, t: 0 });
    if (st + 1 >= L.stages.length) { Sound.play('success'); this.onRestored(lm); }
    else { Sound.play('build'); UI.toast(L.name + ': Bauabschnitt ' + (st + 1) + '/' + L.stages.length + ' fertig!', 'planks'); }
    this.save();
    return true;
  },

  onRestored(lm) {
    const L = LANDMARKS[lm.type];
    UI.toast('✨ ' + L.name + ' wiederaufgebaut! ' + L.reward, 'crystal', 6);
    const cx = (lm.tx + lm.w / 2) * TILE, by = (lm.ty + lm.h) * TILE;
    const spawnV = (type, mode) => {
      for (let r = 0; r < 900; r += 16) for (let a = 0; a < 24; a++) {
        const ang = TAU / 4 + (a % 2 ? 1 : -1) * Math.ceil(a / 2) / 24 * TAU, x = cx + Math.cos(ang) * r, y = by + 36 + Math.sin(ang) * r;
        if (this.canStand(x, y, mode) && (mode !== 'water' || World.isOcean(Math.floor(x / TILE), Math.floor(y / TILE)))) { G.vehicles.push({ id: G.nextVid++, type, x, y, face: 1 }); return; }
      }
      G.vehicles.push({ id: G.nextVid++, type, x: G.player.x + 30, y: G.player.y, face: 1 });
    };
    if (lm.type === 'ship') spawnV('boat', 'water');
    if (lm.type === 'garage') spawnV('scooter', 'foot');
    if (lm.type === 'hangar') spawnV('balloon', 'foot');
    if (lm.type === 'lighthouse') { G.revealAll = true; MiniMap.dirty = true; }
    if (lm.type === 'cabin' || lm.type === 'house') this.moveInHelped();
  },

  moveInHelped() {
    for (const s of G.survivors) if (s.state === 'camp' && s.helped && this.residents() < this.capacity()) this.recruit(s, true);
  },

  recruit(s, quiet) {
    const base = this.basePos(); if (!base) return;
    s.state = 'base'; s.hx = base.x + (Math.random() - 0.5) * 140; s.hy = base.y + 30 + Math.random() * 70; s.x = s.hx; s.y = s.hy;
    const S = SURVIVORS[s.i];
    UI.toast(S.name + ' wohnt jetzt in deiner Basis! (' + JOBS[S.job].name + ')', 'flower');
    if (!quiet) Sound.play('friend');
  },

  // ---------- Bauen ----------
  canPlace(id, tx, ty) {
    const B = BUILD_BY_ID[id], p = G.player;
    if (U.dist(p.x, p.y, tx * TILE + 16, ty * TILE + 16) > 7 * TILE) return 'Zu weit weg';
    if (this.buildAt(tx, ty)) return 'Belegt';
    const t = World.tile(tx, ty);
    if (B.water) { if (t !== T.SHALLOW) return 'Nur auf Flachwasser'; }
    else if (t < T.SAND) return 'Nicht auf Wasser';
    for (const l of World.landmarks) if (tx >= l.tx && tx < l.tx + l.w && ty >= l.ty && ty < l.ty + l.h) return 'Belegt';
    for (const c of World.camps) if (Math.abs(tx - c.tx - 1) <= 1 && Math.abs(ty - c.ty - 1) <= 1) return 'Belegt';
    for (const o of World.objectsNear(tx * TILE + 16, ty * TILE + 16, 40)) if (o.regrowAt <= G.time && Math.floor(o.x / TILE) === tx && Math.floor((o.y - 4) / TILE) === ty) return 'Hier wächst etwas';
    if (!B.floor && Math.floor(p.x / TILE) === tx && Math.floor(p.y / TILE) === ty) return 'Du stehst im Weg';
    if (!this.has(B.need)) return 'Zu wenig Material';
    return null;
  },

  place(id, tx, ty) {
    const err = this.canPlace(id, tx, ty);
    if (err) { Sound.play('nope'); if (err === 'Zu wenig Material') UI.toast('Dir fehlt: ' + U.fmtNeed(BUILD_BY_ID[id].need)); return; }
    this.take(BUILD_BY_ID[id].need);
    G.builds[tx + ',' + ty] = { type: id, tx, ty, t: G.time };
    Sound.play('build');
    for (let i = 0; i < 6; i++) G.particles.push({ kind: 'dust', x: tx * TILE + Math.random() * 32, y: ty * TILE + 28, vx: (Math.random() - 0.5) * 50, vy: -20, life: 0.6, t: 0 });
  },

  demolish(tx, ty) {
    const b = this.buildAt(tx, ty); if (!b) return;
    if (b.type === 'bridge' && Math.floor(G.player.x / TILE) === tx && Math.floor(G.player.y / TILE) === ty) { Sound.play('nope'); return; }
    delete G.builds[tx + ',' + ty];
    this.give(BUILD_BY_ID[b.type].need);
    Sound.play('click');
  },

  craft(r) {
    if (r.req && !this.isRestored(r.req)) return;
    if (!this.has(r.need)) { Sound.play('nope'); return; }
    if (r.tool && G.tools[r.tool[0]] >= r.tool[1]) return;
    if (r.upgrade && G.upgrades[r.upgrade]) return;
    this.take(r.need);
    if (r.give) this.give(r.give);
    if (r.tool) G.tools[r.tool[0]] = r.tool[1];
    if (r.upgrade) G.upgrades[r.upgrade] = true;
    if (r.vehicle) { G.vehicles.push({ id: G.nextVid++, type: r.vehicle, x: G.player.x + 30, y: G.player.y + 10, face: 1 }); UI.toast('Dein ' + r.name + ' steht bereit! Geh hin und drück [E].', 'iron'); }
    Sound.play('craft');
    if (r.tool || r.upgrade) UI.toast(r.name + ' hergestellt!', r.tool ? r.tool[0] : 'fiber');
  },

  // ---------- Tiere ----------
  mkAnimal(type, x, y, o = {}) {
    return Object.assign({ type, x, y, var: Math.random() < 0.3 ? 1 : 0, face: 1, phase: 0, moving: false, tx: x, ty: y, wait: Math.random() * 3, hearts: 0, tame: false, stay: false, swim: false }, o);
  },

  animalOK(a, x, y) {
    const t = World.tileAt(x, y);
    if (a.type === 'duck') return t <= T.SAND;
    return this.walkableTile(Math.floor(x / TILE), Math.floor(y / TILE)) && !this.solidHit(x, y, 4);
  },

  spawnAnimals() {
    const p = G.player;
    G.animals = G.animals.filter(a => U.dist(a.x, a.y, p.x, p.y) < 1500);
    const near = G.animals.filter(a => U.dist(a.x, a.y, p.x, p.y) < 1000).length;
    if (near >= 14) return;
    const ang = Math.random() * TAU, d = 550 + Math.random() * 400;
    const x = p.x + Math.cos(ang) * d, y = p.y + Math.sin(ang) * d;
    const t = World.tileAt(x, y);
    let type = null;
    const r = Math.random();
    if (t === T.FOREST) type = r < 0.35 ? 'deer' : r < 0.6 ? 'fox' : r < 0.8 ? 'hedgehog' : 'rabbit';
    else if (t === T.GRASS || t === T.MEADOW) type = r < 0.4 ? 'rabbit' : r < 0.7 ? 'sheep' : r < 0.85 ? 'deer' : 'hedgehog';
    else if (t === T.SHALLOW || t === T.SAND) type = 'duck';
    else if (t === T.SNOW) type = r < 0.5 ? 'fox' : 'rabbit';
    else if (t === T.ROCK) type = r < 0.5 ? 'sheep' : null;
    if (!type) return;
    const a = this.mkAnimal(type, x, y);
    if (type === 'fox' && t === T.SNOW) a.var = 1;
    if (this.animalOK(a, x, y)) G.animals.push(a);
  },

  updateAnimal(a, dt) {
    const p = G.player;
    let speed = ANIMALS[a.type].speed;
    if (a.tame && !a.stay) {
      const d = U.dist(a.x, a.y, p.x, p.y);
      const onLand = World.tileAt(p.x, p.y) >= T.SAND && !this.riding();
      if (d > 600 && (onLand || a.type === 'duck')) { a.x = p.x - p.face * 30 + (Math.random() - 0.5) * 20; a.y = p.y + 10; }
      if (d > 55) { a.tx = p.x - p.face * 26; a.ty = p.y + 6; a.wait = 0; speed = Math.max(speed * 2.2, this.playerSpeed() * 0.95); }
      else { a.moving = false; a.wait = 0.3; }
    } else if (a.wait > 0) { a.wait -= dt; a.moving = false; }
    else if (U.dist(a.x, a.y, a.tx, a.ty) < 4) {
      a.wait = 1 + Math.random() * 4;
      const hx = a.stay ? a.hx : a.x, hy = a.stay ? a.hy : a.y;
      a.tx = hx + (Math.random() - 0.5) * 160; a.ty = hy + (Math.random() - 0.5) * 160;
      if (!this.animalOK(a, a.tx, a.ty)) { a.tx = a.x; a.ty = a.y; }
    }
    if (a.wait <= 0 && U.dist(a.x, a.y, a.tx, a.ty) >= 4) {
      const dx = a.tx - a.x, dy = a.ty - a.y, l = Math.hypot(dx, dy), st = Math.min(l, speed * dt);
      const nx = a.x + dx / l * st, ny = a.y + dy / l * st;
      if (this.animalOK(a, nx, ny) || (a.tame && !a.stay)) { a.x = nx; a.y = ny; a.moving = true; a.phase += dt * 12; if (Math.abs(dx) > 1) a.face = dx < 0 ? -1 : 1; }
      else { a.tx = a.x; a.ty = a.y; a.moving = false; }
    }
    a.swim = a.type === 'duck' && World.tileAt(a.x, a.y) <= T.SHALLOW;
  },

  updateSurvivor(s, dt) {
    if (s.wait > 0) { s.wait -= dt; s.moving = false; return; }
    if (s.state === 'camp') { s.moving = false; return; }
    if (!s.tx || U.dist(s.x, s.y, s.tx, s.ty) < 4) {
      s.wait = 2 + Math.random() * 6;
      s.tx = s.hx + (Math.random() - 0.5) * 180; s.ty = s.hy + (Math.random() - 0.5) * 100;
      if (!this.canStand(s.tx, s.ty, 'foot')) { s.tx = s.x; s.ty = s.y; }
      return;
    }
    const dx = s.tx - s.x, dy = s.ty - s.y, l = Math.hypot(dx, dy), st = Math.min(l, 55 * dt);
    const nx = s.x + dx / l * st, ny = s.y + dy / l * st;
    if (this.canStand(nx, ny, 'foot')) { s.x = nx; s.y = ny; s.moving = true; s.phase += dt * 9; s.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0); }
    else { s.tx = s.x; s.ty = s.y; }
  },

  // ---------- Produktion ----------
  produce() {
    const add = (items) => { for (const [k, v] of Object.entries(items)) G.storage[k] = (G.storage[k] || 0) + v; };
    for (const s of G.survivors) {
      if (s.state !== 'base') continue;
      const J = JOBS[SURVIVORS[s.i].job];
      if (J.req && !this.isRestored(J.req)) continue;
      add(J.yields);
    }
    if (this.isRestored('windmill')) add({ bread: 1 });
    if (this.isRestored('greenhouse')) add({ berries: 2, flower: 1 });
  },
  storageCount() { return Object.values(G.storage).reduce((a, b) => a + b, 0); },
  collectStorage() {
    const n = this.storageCount(); if (!n) return;
    const base = this.basePos();
    this.give(G.storage, base ? base.x : G.player.x, base ? base.y - 60 : G.player.y);
    G.storage = {}; Sound.play('success');
  },

  // ---------- Zeit ----------
  dayTime() { return (G.time / DAY + 0.3) % 1; },
  dayNum() { return Math.floor(G.time / DAY + 0.3) + 1; },
  sleep() {
    const t = this.dayTime(); const add = ((1.3 - t) % 1) * DAY;
    G.time += add;
    for (let i = 0; i < Math.floor(add / 60); i++) this.produce();
    UI.toast('Gut geschlafen! Ein neuer Morgen beginnt. ☀️', 'bread'); Sound.play('success');
  },

  update(dt) {
    G.time += dt;
    const sun = Math.cos((this.dayTime() - 0.5) * TAU);
    G.night = U.clamp((0.1 - sun) / 0.55, 0, 1);
    G.twilight = U.clamp(1 - Math.abs(sun - 0.12) / 0.3, 0, 1);
    this.updatePlayer(dt);
    G.focus = UI.panelOpen || G.buildMode ? null : this.findFocus();
    if (Input.pressed && G.focus && G.focus.kind !== 'gather') this.interact();
    if (Input.held && !G.buildMode && !UI.panelOpen) this.gather(dt); else G.player.act = null;
    for (const o of World.objectsNear(G.player.x, G.player.y, 80)) if (o.shake > 0) o.shake -= dt;
    for (const a of G.animals) this.updateAnimal(a, dt);
    for (const a of G.pets) this.updateAnimal(a, dt);
    for (const s of G.survivors) this.updateSurvivor(s, dt);
    if (Math.random() < dt * 2) this.spawnAnimals();
    // Regrow-Einträge aufräumen
    G.prodTimer += dt;
    if (G.prodTimer >= 60) {
      G.prodTimer = 0; this.produce();
      for (const k in G.harvested) if (G.harvested[k] < G.time) delete G.harvested[k];
    }
    // Partikel
    for (const pt of G.particles) { pt.t += dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; if (pt.kind !== 'heart' && pt.kind !== 'smoke') pt.vy += 160 * dt; }
    G.particles = G.particles.filter(pt => pt.t < pt.life);
    for (const f of G.floaters) f.t += dt;
    G.floaters = G.floaters.filter(f => f.t < 1.4);
    // Rauch aus Schornsteinen
    if (Math.random() < dt * 3) for (const l of World.landmarks) {
      if ((l.type === 'cabin' || l.type === 'workshop') && this.lmDone(l) && U.dist(G.player.x, G.player.y, l.tx * TILE, l.ty * TILE) < 900) {
        const L = LANDMARKS[l.type], ox = l.type === 'cabin' ? L.sw - 43 : 39, sx = (l.tx + l.w / 2) * TILE - L.sw / 2 + ox, sy = (l.ty + l.h) * TILE - (L.sh - 6) + (l.type === 'cabin' ? 22 : 18);
        G.particles.push({ kind: 'smoke', x: sx, y: sy, vx: 8 + Math.random() * 6, vy: -18, life: 3, t: 0 });
      }
    }
    // Autospeichern
    if (G.time - G.lastSave > 30) this.save();
  },
};
