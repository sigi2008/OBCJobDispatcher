'use strict';
// ---------- Benutzeroberfläche ----------
const $ = (id) => document.getElementById(id);
const icon = (k, cls = 'ic') => `<img class="${cls}" src="${Art.icons[k]}" alt="">`;
const needHtml = (need) => Object.entries(need).map(([k, v]) => {
  const ok = (G.inv[k] || 0) >= v;
  return `<span class="need ${ok ? 'ok' : 'miss'}">${icon(k)}${G.inv[k] || 0}/${v}</span>`;
}).join('');

const GOALS = [
  { text: 'Sammle Äste, Kiesel und hohes Gras', done: () => G.tools.axe || ((G.inv.wood || 0) >= 6 && (G.inv.stone || 0) >= 5 && (G.inv.fiber || 0) >= 4), hint: 'Lauf zu Ästen, Kieseln und Grasbüscheln und halte [E] gedrückt.' },
  { text: 'Stelle Steinaxt & Spitzhacke her', done: () => G.tools.axe >= 1 && G.tools.pick >= 1, hint: 'Öffne „Herstellen“ mit [C].' },
  { text: 'Repariere die verlassene Hütte', done: () => Game.lmDone(World.landmarks[0]), target: () => lmPos('cabin'), hint: 'Bring Material zur Hütte und drück dort [E].' },
  { text: 'Finde einen Überlebenden', done: () => G.survivors.some(s => s.state === 'base'), target: () => nearestCamp(), hint: 'Folge dem Pfeil – jemand sitzt an einem Lagerfeuer.' },
  { text: 'Freunde dich mit einem Tier an', done: () => G.pets.length > 0, hint: 'Füttere ein Tier dreimal mit Beeren.' },
  { text: 'Repariere die Alte Werkstatt', done: () => Game.isRestored('workshop'), target: () => lmPos('workshop') },
  { text: 'Baue ein Fahrrad', done: () => G.vehicles.some(v => v.type === 'bike'), hint: 'In der Werkstatt-Liste unter Herstellen [C].' },
  { text: 'Repariere das gestrandete Schiff', done: () => Game.isRestored('ship'), target: () => lmPos('ship') },
  { text: 'Bring den Leuchtturm wieder zum Leuchten', done: () => Game.isRestored('lighthouse'), target: () => lmPos('lighthouse') },
  { text: 'Baue den Ballonhangar wieder auf', done: () => Game.isRestored('hangar'), target: () => lmPos('hangar') },
  { text: 'Finde alle Überlebenden', done: () => G.survivors.every(s => s.state === 'base'), target: () => nearestCamp() },
  { text: 'Repariere alle Ruinen', done: () => World.landmarks.every(l => Game.lmDone(l)), target: () => nearestRuin() },
];
function lmPos(type) { const l = World.landmarks.find(l => l.type === type); return l ? { x: (l.tx + l.w / 2) * TILE, y: (l.ty + l.h) * TILE - 10 } : null; }
function nearestCamp() {
  let best = null, bd = 1e9;
  for (const s of G.survivors) if (s.state === 'camp') { const d = U.dist(s.x, s.y, G.player.x, G.player.y); if (d < bd) { bd = d; best = { x: s.x, y: s.y }; } }
  return best;
}
function nearestRuin() {
  let best = null, bd = 1e9;
  for (const l of World.landmarks) if (!Game.lmDone(l)) { const x = (l.tx + l.w / 2) * TILE, y = (l.ty + l.h) * TILE; const d = U.dist(x, y, G.player.x, G.player.y); if (d < bd) { bd = d; best = { x, y }; } }
  return best;
}

const UI = {
  panelOpen: null, dirty: true, goalTarget: null, goalIdx: -1, invSig: '',

  init() {
    $('btnCraft').onclick = () => this.toggle('craft');
    $('btnBuild').onclick = () => this.toggleBuild();
    $('btnMap').onclick = () => this.toggle('map');
    $('btnMenu').onclick = () => this.toggle('menu');
    $('btnMusic').onclick = () => { Sound.setMusic(!Sound.musicOn); this.syncMusic(); };
    $('panelClose').onclick = () => this.close();
    $('panelBg').onclick = (e) => { if (e.target.id === 'panelBg') this.close(); };
    this.syncMusic();
  },
  syncMusic() { $('btnMusic').classList.toggle('off', !Sound.musicOn); },

  toast(msg, ic, secs = 3.5) {
    const d = document.createElement('div'); d.className = 'toast';
    d.innerHTML = (ic && Art.icons[ic] ? icon(ic) : '') + '<span>' + msg + '</span>';
    $('toasts').appendChild(d);
    setTimeout(() => d.classList.add('out'), secs * 1000);
    setTimeout(() => d.remove(), secs * 1000 + 500);
    while ($('toasts').children.length > 3) $('toasts').firstChild.remove();
  },

  // ---------- HUD ----------
  update() {
    const sig = JSON.stringify(G.inv) + JSON.stringify(G.tools) + G.player.riding;
    if (sig !== this.invSig || this.dirty) {
      this.invSig = sig; this.dirty = false;
      let h = '';
      for (const k of ITEM_ORDER) if (G.inv[k] > 0) h += `<div class="slot" title="${ITEMS[k].name}">${icon(k)}<b>${G.inv[k]}</b><small>${ITEMS[k].name}</small></div>`;
      if (!h) h = '<div class="empty">Dein Rucksack ist leer – sammle etwas!</div>';
      let t = '';
      if (G.tools.axe) t += `<div class="slot tool t${G.tools.axe}" title="Axt">${icon('axe')}<small>${['', 'Stein', 'Eisen', 'Gold'][G.tools.axe]}axt</small></div>`;
      if (G.tools.pick) t += `<div class="slot tool t${G.tools.pick}" title="Spitzhacke">${icon('pick')}<small>${['', 'Stein', 'Eisen', 'Gold'][G.tools.pick]}hacke</small></div>`;
      $('inventory').innerHTML = t + h;
      if (this.panelOpen === 'craft') this.renderCraft();
      if (this.panelOpen === 'furnace') this.renderFurnace();
      if (this.panelOpen === 'landmark') this.renderLandmark();
      if (G.buildMode) this.renderBuildBar();
    }
    // Uhr
    const dt = Game.dayTime(), hh = Math.floor(dt * 24), mm = Math.floor((dt * 24 % 1) * 60 / 10) * 10;
    const sym = G.night > 0.5 ? '🌙' : G.twilight > 0.5 ? '🌅' : '☀️';
    $('clock').textContent = `${sym} Tag ${Game.dayNum()} · ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    // Ziel
    let gi = GOALS.findIndex(g => !g.done());
    if (gi !== this.goalIdx) {
      if (this.goalIdx >= 0 && gi > this.goalIdx) { Sound.play('success'); this.toast('Ziel erreicht! 🎉', 'crystal'); }
      this.goalIdx = gi;
      if (gi < 0) { $('goal').innerHTML = '<b>Alles geschafft!</b><span>Neuland gehört dir. Bau weiter, wie es dir gefällt. 💛</span>'; }
      else $('goal').innerHTML = `<b>Ziel ${gi + 1}/${GOALS.length}</b><span>${GOALS[gi].text}</span>${GOALS[gi].hint ? '<em>' + GOALS[gi].hint + '</em>' : ''}`;
    }
    this.goalTarget = gi >= 0 && GOALS[gi].target ? GOALS[gi].target() : null;
    const base = Game.basePos(), n = Game.storageCount();
    $('storageHint').style.display = base && n > 0 ? 'block' : 'none';
    if (n) $('storageHint').innerHTML = `📦 ${n} Sachen im Lager der Hütte`;
  },

  // ---------- Panels ----------
  open(kind, title, html) {
    this.panelOpen = kind; $('panelTitle').innerHTML = title; $('panelBody').innerHTML = html;
    $('panelBg').classList.add('show'); Sound.play('click');
  },
  close() {
    if (!this.panelOpen) return;
    this.panelOpen = null; $('panelBg').classList.remove('show'); this.curLm = null; this.curS = null;
  },
  toggle(kind) {
    if (this.panelOpen === kind) return this.close();
    if (kind === 'craft') this.openCraft();
    if (kind === 'map') this.openMap();
    if (kind === 'menu') this.openMenu();
  },

  openCraft() { this.open('craft', '🔨 Herstellen', ''); this.renderCraft(); },
  renderCraft() {
    const ws = Game.isRestored('workshop');
    let h = '<div class="grid">';
    for (const r of RECIPES) {
      const locked = r.req && !Game.isRestored(r.req);
      const owned = (r.tool && G.tools[r.tool[0]] >= r.tool[1]) || (r.upgrade && G.upgrades[r.upgrade]);
      const can = !locked && !owned && Game.has(r.need);
      const ic = r.tool ? r.tool[0] : r.give ? Object.keys(r.give)[0] : r.vehicle ? 'iron' : { shoes: 'fiber', compass: 'copper', amulet: 'gold' }[r.id] || 'crystal';
      h += `<div class="card ${can ? 'can' : ''} ${locked ? 'locked' : ''}">
        <div class="ct">${icon(ic, 'big')}<div><b>${r.name}</b><small>${r.desc}</small></div></div>
        <div class="needs">${locked ? '🔒 Benötigt: ' + LANDMARKS[r.req].name : owned ? '✅ Hast du schon' : needHtml(r.need)}</div>
        ${!locked && !owned ? `<button class="btn ${can ? '' : 'dis'}" data-r="${r.id}">Herstellen</button>` : ''}
      </div>`;
    }
    h += '</div>';
    if (!ws) h += '<p class="tip">Tipp: Repariere die <b>Alte Werkstatt</b> für Eisen und Fahrzeuge!</p>';
    $('panelBody').innerHTML = h;
    $('panelBody').querySelectorAll('button[data-r]').forEach(b => b.onclick = () => { Game.craft(RECIPES.find(r => r.id === b.dataset.r)); this.renderCraft(); });
  },

  openFurnace() { this.open('furnace', '🔥 Schmelzofen', ''); this.renderFurnace(); },
  renderFurnace() {
    let h = '<p class="intro">Schmilz Erz zu Barren. Erz findest du in Felsen in den Bergen – Kupfer leuchtet grün-orange, Gold gelb. Normale Felsen enthalten manchmal auch Erz!</p><div class="grid">';
    for (const r of SMELT) {
      const k = Object.keys(r.give)[0], can = Game.has(r.need);
      h += `<div class="card ${can ? 'can' : ''}"><div class="ct">${icon(k, 'big')}<div><b>${r.name}</b><small>Du hast: ${G.inv[k] || 0}</small></div></div>
        <div class="needs">${needHtml(r.need)}</div>
        <div style="display:flex;gap:6px"><button class="btn ${can ? '' : 'dis'}" data-s="${r.id}" data-n="1">Schmelzen</button><button class="btn ${can ? '' : 'dis'}" data-s="${r.id}" data-n="99">Alles</button></div></div>`;
    }
    $('panelBody').innerHTML = h + '</div>';
    $('panelBody').querySelectorAll('button[data-s]').forEach(b => b.onclick = () => {
      const r = SMELT.find(r => r.id === b.dataset.s); let n = 0;
      while (n < +b.dataset.n && Game.has(r.need)) { Game.take(r.need); Game.give(r.give); n++; }
      if (n) { Sound.play('craft'); this.toast(n + '× ' + r.name + ' geschmolzen!', Object.keys(r.give)[0]); } else Sound.play('nope');
      this.renderFurnace();
    });
  },

  openLandmark(l) { this.curLm = l; this.open('landmark', LANDMARKS[l.type].name, ''); this.renderLandmark(); },
  renderLandmark() {
    const l = this.curLm; if (!l) return;
    const L = LANDMARKS[l.type], st = G.lmStage[l.id] || 0;
    let h = '';
    if (st < L.stages.length) {
      h += `<p class="intro">Hier hat lange niemand mehr gewohnt. Mit etwas Arbeit wird es wieder schön!<br><b>Belohnung:</b> ${L.reward}</p>`;
      h += '<div class="stages">';
      L.stages.forEach((s, i) => {
        h += `<div class="stage ${i < st ? 'done' : i === st ? 'cur' : ''}"><b>${i < st ? '✅' : i === st ? '🔨' : '⏳'} Abschnitt ${i + 1}</b><div class="needs">${i === st ? needHtml(s) : U.fmtNeed(s)}</div></div>`;
      });
      h += '</div>';
      const can = Game.has(L.stages[st]);
      h += `<button class="btn big ${can ? '' : 'dis'}" id="repairBtn">${can ? 'Reparieren!' : 'Noch nicht genug Material'}</button>`;
    } else {
      h += `<p class="intro">✨ Wiederaufgebaut! ${L.reward}</p>`;
      if (l.type === 'cabin') {
        const n = Game.storageCount();
        h += `<div class="stage"><b>📦 Lager</b><div class="needs">${n ? Object.entries(G.storage).filter(([, v]) => v > 0).map(([k, v]) => `<span class="need ok">${icon(k)}${v}</span>`).join('') : 'Leer – Bewohner und Gebäude füllen es mit der Zeit.'}</div>${n ? '<button class="btn" id="collectBtn">Alles nehmen</button>' : ''}</div>`;
        h += `<div class="stage"><b>🏡 Bewohner (${Game.residents()}/${Game.capacity()})</b><div class="needs">${G.survivors.filter(s => s.state === 'base').map(s => `<span class="need ok">${SURVIVORS[s.i].name} – ${JOBS[SURVIVORS[s.i].job].name}</span>`).join('') || 'Noch niemand. Finde Überlebende!'}</div></div>`;
        h += `<div class="stage"><b>🛏️ Bett</b><div class="needs">${G.night > 0.3 ? 'Es ist spät. Schlaf bis zum Morgen.' : 'Schlafen geht erst am Abend.'}</div>${G.night > 0.3 ? '<button class="btn" id="sleepBtn">Schlafen</button>' : ''}</div>`;
        h += '<button class="btn" id="saveBtn">💾 Spiel speichern</button>';
      } else if (l.type === 'workshop') {
        h += '<button class="btn big" id="toCraft">🔨 Werkbank öffnen</button>';
      } else if (l.type === 'house') {
        h += `<p>Bewohner insgesamt: ${Game.residents()}/${Game.capacity()}</p>`;
      } else if (l.type === 'windmill' || l.type === 'greenhouse') {
        h += '<p>Die Erträge landen jede Minute im Lager deiner Hütte.</p>';
      } else {
        const vt = { ship: 'boat', garage: 'scooter', hangar: 'balloon' }[l.type];
        if (vt) h += `<p>Dein Fahrzeug wartet in der Nähe. Geh hin und drück [E].</p>`;
      }
    }
    $('panelBody').innerHTML = h;
    const rb = $('repairBtn'); if (rb) rb.onclick = () => { if (Game.repair(l)) this.renderLandmark(); };
    const cb = $('collectBtn'); if (cb) cb.onclick = () => { Game.collectStorage(); this.renderLandmark(); };
    const sb = $('sleepBtn'); if (sb) sb.onclick = () => { Game.sleep(); this.close(); };
    const sv = $('saveBtn'); if (sv) sv.onclick = () => { Game.save(); this.toast('Gespeichert! 💾'); };
    const tc = $('toCraft'); if (tc) tc.onclick = () => this.openCraft();
  },

  openSurvivor(s) {
    this.curS = s;
    const S = SURVIVORS[s.i], J = JOBS[S.job];
    const face = `<canvas id="faceCv" width="120" height="120"></canvas>`;
    let msg, btns = '';
    if (s.state === 'base') {
      const lines = ['Danke, dass du mich aufgenommen hast!', 'Es ist so schön hier.', 'Ich kümmere mich um meine Arbeit. Schau ab und zu ins Lager!', 'Hast du schon die anderen Ruinen gesehen?', 'Weißt du, was ich vermisst habe? Gesellschaft. 😊'];
      msg = U.pick(lines, Math.random()) + `<br><small>Beruf: ${J.name} – liefert ${U.fmtNeed(J.yields)} pro Minute${J.req && !Game.isRestored(J.req) ? ' (braucht: ' + LANDMARKS[J.req].name + ')' : ''}.</small>`;
    } else if (!s.helped && S.want) {
      msg = `${S.hello}<br><br>Könntest du mir <b>${U.fmtNeed(S.want)}</b> bringen?`;
      btns = `<div class="needs">${needHtml(S.want)}</div><button class="btn ${Game.has(S.want) ? '' : 'dis'}" id="giveBtn">Geben</button>`;
    } else {
      const base = Game.basePos();
      if (!base) msg = (s.helped ? 'Danke nochmal! ' : S.hello + ' ') + 'Wenn du ein Zuhause hast, komme ich gern mit. Repariere doch die verlassene Hütte!';
      else if (Game.residents() >= Game.capacity()) msg = (s.helped ? 'Danke nochmal! ' : S.hello + ' ') + 'Leider ist bei dir kein Platz mehr frei. Repariere ein Ruinenhaus, dann ziehe ich ein!';
      else { msg = (s.helped ? 'Danke! Du bist so nett. ' : S.hello + ' ') + `Darf ich bei dir wohnen? Ich bin <b>${J.name}</b>.`; btns = '<button class="btn big" id="joinBtn">Komm mit zu meiner Basis! 🏡</button>'; }
    }
    this.open('talk', S.name, `<div class="talk">${face}<div class="bubble">${msg}</div></div>${btns}`);
    const fc = $('faceCv').getContext('2d'); fc.scale(2, 2); Art.person(fc, 30, 56, s.look, 0, 0, false, false, 0);
    const gb = $('giveBtn'); if (gb) gb.onclick = () => {
      if (!Game.has(S.want)) { Sound.play('nope'); return; }
      Game.take(S.want); s.helped = true; Sound.play('friend');
      G.particles.push({ kind: 'heart', x: s.x, y: s.y - 50, vx: 0, vy: -30, life: 1.4, t: 0 });
      this.openSurvivor(s);
    };
    const jb = $('joinBtn'); if (jb) jb.onclick = () => { s.helped = true; Game.recruit(s); Game.save(); this.close(); };
  },

  openMap() {
    this.open('map', '🗺️ Karte von Neuland', '<canvas id="bigMap"></canvas><p class="tip">Orange = Ruinen · Grün = repariert · Rosa = Überlebende · Blau = Fahrzeuge</p>');
    const cv = $('bigMap'); const s = Math.min(window.innerWidth - 80, window.innerHeight - 220, 640);
    cv.width = s; cv.height = s; MiniMap.draw(cv, true);
  },

  openMenu() {
    this.open('menu', '☰ Menü', `
      <button class="btn big" id="mSave">💾 Speichern</button>
      <button class="btn big" id="mMusic">${Sound.musicOn ? '🔇 Musik aus' : '🎵 Musik an'}</button>
      <button class="btn big" id="mSfx">${Sound.sfxOn ? '🔇 Geräusche aus' : '🔊 Geräusche an'}</button>
      <div class="help">
        <h3>Steuerung</h3>
        <p><b>WASD / Pfeiltasten</b> laufen · <b>E / Leertaste</b> (halten) sammeln & benutzen<br>
        <b>C</b> Herstellen · <b>B</b> Bauen · <b>M</b> Karte · <b>Mausrad / + −</b> Zoom · <b>Esc</b> schließen</p>
        <p>Am Handy: linker Daumen zum Laufen ziehen, ✋ zum Sammeln/Benutzen.</p>
      </div>
      <button class="btn danger" id="mNew">🌱 Neue Welt beginnen</button>`);
    $('mSave').onclick = () => { Game.save(); this.toast('Gespeichert! 💾'); };
    $('mMusic').onclick = () => { Sound.setMusic(!Sound.musicOn); this.syncMusic(); this.openMenu(); };
    $('mSfx').onclick = () => { Sound.setSfx(!Sound.sfxOn); this.openMenu(); };
    $('mNew').onclick = () => { if (confirm('Wirklich eine neue Welt beginnen? Dein aktueller Spielstand wird überschrieben.')) { this.close(); Game.newGame(); Game.save(); } };
  },

  // ---------- Bau-Modus ----------
  toggleBuild() {
    if (G.buildMode) { G.buildMode = null; $('buildBar').classList.remove('show'); return; }
    this.close(); G.buildMode = BUILDS[0].id; $('buildBar').classList.add('show'); this.renderBuildBar(); Sound.play('click');
    this.toast('Bau-Modus: Wähle unten ein Teil und klicke/tippe auf ein Feld.', 'planks');
  },
  renderBuildBar() {
    let h = '';
    for (const b of BUILDS) {
      const can = Game.has(b.need);
      h += `<button class="bitem ${G.buildMode === b.id ? 'sel' : ''} ${can ? '' : 'dis'}" data-b="${b.id}" title="${b.desc || ''}"><b>${b.name}</b><span>${Object.entries(b.need).map(([k, v]) => icon(k) + v).join(' ')}</span></button>`;
    }
    h += `<button class="bitem rm ${G.buildMode === 'remove' ? 'sel' : ''}" data-b="remove"><b>🧹 Abbauen</b><span>gibt alles zurück</span></button>`;
    h += `<button class="bitem done" data-b="done"><b>✔ Fertig</b><span>[B]</span></button>`;
    $('buildItems').innerHTML = h;
    $('buildItems').querySelectorAll('button').forEach(btn => btn.onclick = (e) => {
      e.stopPropagation();
      const id = btn.dataset.b; if (id === 'done') return this.toggleBuild();
      G.buildMode = id; Sound.play('click'); this.renderBuildBar();
    });
  },
};
