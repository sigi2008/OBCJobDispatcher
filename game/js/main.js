'use strict';
// ---------- Eingabe & Hauptschleife ----------
const Input = {
  keys: {}, held: false, pressed: false, _pressQ: false, mx: 0, my: 0, mouseInside: false, touchMode: false,
  joy: null, joyVec: { x: 0, y: 0 }, actionTouch: false, mouseHeld: false,

  init() {
    const cv = R.cv;
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (!this.keys[k] && (k === 'e' || k === ' ')) this._pressQ = true;
      this.keys[k] = true;
      if (!G.started) return;
      if (k === 'c') UI.toggle('craft');
      else if (k === 'b') UI.toggleBuild();
      else if (k === 'm') UI.toggle('map');
      else if (k === 'escape') { if (UI.panelOpen) UI.close(); else if (G.buildMode) UI.toggleBuild(); else UI.toggle('menu'); }
      else if (k === '+' || k === '=') this.zoom(1.1);
      else if (k === '-') this.zoom(1 / 1.1);
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { this.keys[e.key.toLowerCase()] = false; });
    window.addEventListener('blur', () => { this.keys = {}; this.mouseHeld = false; });
    cv.addEventListener('mousemove', (e) => { this.mx = e.clientX; this.my = e.clientY; this.mouseInside = true; });
    cv.addEventListener('mouseleave', () => { this.mouseInside = false; this.mouseHeld = false; });
    cv.addEventListener('mousedown', (e) => {
      this.mx = e.clientX; this.my = e.clientY;
      if (G.buildMode) { this.buildClick(e.button === 2); return; }
      if (e.button === 0) { this.mouseHeld = true; this._pressQ = true; }
    });
    window.addEventListener('mouseup', () => { this.mouseHeld = false; });
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('wheel', (e) => { e.preventDefault(); this.zoom(e.deltaY < 0 ? 1.1 : 1 / 1.1); }, { passive: false });
    // Touch
    cv.addEventListener('touchstart', (e) => {
      e.preventDefault(); this.touchMode = true; document.body.classList.add('touch');
      for (const t of e.changedTouches) {
        if (!this.joy) this.joy = { id: t.identifier, x: t.clientX, y: t.clientY, sx: t.clientX, sy: t.clientY, t0: performance.now(), moved: false };
      }
    }, { passive: false });
    cv.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) if (this.joy && t.identifier === this.joy.id) {
        const dx = t.clientX - this.joy.sx, dy = t.clientY - this.joy.sy, l = Math.hypot(dx, dy);
        if (l > 12) this.joy.moved = true;
        if (this.joy.moved) { const m = Math.min(l, 50) / 50; this.joyVec = { x: dx / (l || 1) * m, y: dy / (l || 1) * m }; this.showJoy(this.joy.sx, this.joy.sy, dx, dy); }
        this.mx = t.clientX; this.my = t.clientY;
      }
    }, { passive: false });
    const end = (e) => {
      for (const t of e.changedTouches) if (this.joy && t.identifier === this.joy.id) {
        if (!this.joy.moved && performance.now() - this.joy.t0 < 350) {
          this.mx = t.clientX; this.my = t.clientY;
          if (G.buildMode) this.buildClick(false); else this._pressQ = true;
        }
        this.joy = null; this.joyVec = { x: 0, y: 0 }; $('joy').style.display = 'none';
      }
    };
    cv.addEventListener('touchend', end); cv.addEventListener('touchcancel', end);
    const ab = $('actBtn');
    ab.addEventListener('touchstart', (e) => { e.preventDefault(); this.actionTouch = true; this._pressQ = true; }, { passive: false });
    ab.addEventListener('touchend', (e) => { e.preventDefault(); this.actionTouch = false; });
    $('zoomIn').onclick = () => this.zoom(1.15); $('zoomOut').onclick = () => this.zoom(1 / 1.15);
  },

  showJoy(x, y, dx, dy) {
    const j = $('joy'); j.style.display = 'block'; j.style.left = (x - 50) + 'px'; j.style.top = (y - 50) + 'px';
    const l = Math.hypot(dx, dy), m = Math.min(l, 50); $('joyKnob').style.transform = `translate(${dx / (l || 1) * m}px, ${dy / (l || 1) * m}px)`;
  },

  zoom(f) { G.zoom = U.clamp(G.zoom * f, 0.5, 1.8); },

  buildClick(right) {
    const tx = Math.floor(R.wx(this.mx) / TILE), ty = Math.floor(R.wy(this.my) / TILE);
    if (right || G.buildMode === 'remove') Game.demolish(tx, ty);
    else Game.place(G.buildMode, tx, ty);
  },

  move() {
    const k = this.keys;
    let x = (k['d'] || k['arrowright'] ? 1 : 0) - (k['a'] || k['arrowleft'] ? 1 : 0);
    let y = (k['s'] || k['arrowdown'] ? 1 : 0) - (k['w'] || k['arrowup'] ? 1 : 0);
    if (x && y) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
    if (!x && !y && (this.joyVec.x || this.joyVec.y)) { x = this.joyVec.x; y = this.joyVec.y; }
    return { x, y };
  },

  frame() {
    this.pressed = this._pressQ; this._pressQ = false;
    this.held = !!(this.keys['e'] || this.keys[' '] || this.actionTouch || this.mouseHeld);
  },
};

// ---------- Start ----------
let last = performance.now(), mmTimer = 0;
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (G.started) {
    Input.frame();
    Game.update(dt);
    R.frame(dt, now / 1000);
    UI.update();
    mmTimer += dt;
    if (mmTimer > 0.2) { mmTimer = 0; MiniMap.draw($('minimap'), false); if (UI.panelOpen === 'map') MiniMap.draw($('bigMap'), true); }
  }
  requestAnimationFrame(loop);
}

function startGame(load) {
  Sound.init();
  $('title').classList.add('hide');
  $('hud').classList.add('show');
  setTimeout(() => {
    if (!(load && Game.load())) { Game.newGame(); Game.save(); }
    Sound.setMusic(Sound.musicOn); Sound.setSfx(Sound.sfxOn); UI.syncMusic();
    if ('ontouchstart' in window) { Input.touchMode = true; document.body.classList.add('touch'); if (!Game.hasSave()) G.zoom = 0.85; }
  }, 30);
}

window.addEventListener('load', () => {
  Art.init();
  R.init();
  MiniMap.init();
  UI.init();
  Input.init();
  // Titelbild-Vorschau
  const tc = $('titleArt').getContext('2d'); tc.scale(2, 2);
  Art.draw(tc, 'oak0', 40, 120); Art.draw(tc, 'pine0', 300, 118);
  Art.person(tc, 150, 120, PLAYER_LOOK, 0, 0, false, false, 0);
  Art.animal(tc, { type: 'rabbit', x: 200, y: 120, face: -1, phase: 0, moving: false, var: 0 }, 0);
  Art.animal(tc, { type: 'fox', x: 240, y: 122, face: -1, phase: 0, moving: false, var: 0 }, 0);
  Art.draw(tc, 'bush0', 95, 122); Art.draw(tc, 'flowers0', 120, 126); Art.draw(tc, 'flowers1', 270, 128);
  const has = Game.hasSave();
  $('btnContinue').style.display = has ? 'block' : 'none';
  $('btnContinue').onclick = () => startGame(true);
  $('btnNew').onclick = () => { if (!has || confirm('Neue Welt beginnen? Dein alter Spielstand wird überschrieben.')) startGame(false); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) Game.save(); });
  window.addEventListener('beforeunload', () => Game.save());
  requestAnimationFrame(loop);
});
