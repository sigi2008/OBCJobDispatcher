'use strict';
// ---------- Cartoon-Grafiken, komplett im Code gezeichnet ----------
const OL = '#3a2a22';
const TAU = Math.PI * 2;

const Art = { S: 2, sprites: {}, icons: {}, lm: {} };

function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function circ(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }
function ell(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); }
function poly(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); }
function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
function fillOl(ctx, fill, lw = 3) { ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = OL; ctx.lineJoin = 'round'; ctx.stroke(); }
function shadow(ctx, x, y, rx, ry) { ell(ctx, x, y, rx, ry); ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fill(); }

// Blob aus Kreisen mit gemeinsamer Outline
function blob(ctx, circles, fill, lw = 3) {
  ctx.fillStyle = OL;
  for (const [x, y, r] of circles) { circ(ctx, x, y, r + lw); ctx.fill(); }
  ctx.fillStyle = fill;
  for (const [x, y, r] of circles) { circ(ctx, x, y, r); ctx.fill(); }
}

Art.make = function (name, w, h, ax, ay, fn) {
  const S = Art.S, c = mkCanvas(w * S, h * S), ctx = c.getContext('2d');
  ctx.scale(S, S); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  fn(ctx, w, h);
  Art.sprites[name] = { c, w, h, ax, ay };
  return Art.sprites[name];
};

Art.draw = function (ctx, name, x, y, sx = 1) {
  const s = Art.sprites[name]; if (!s) return;
  if (sx === 1) ctx.drawImage(s.c, x - s.ax, y - s.ay, s.w, s.h);
  else { ctx.save(); ctx.translate(x, y); ctx.scale(sx, 1); ctx.drawImage(s.c, -s.ax, -s.ay, s.w, s.h); ctx.restore(); }
};

// ---------- Bäume & Natur ----------
function drawOak(ctx, pal, apples) {
  shadow(ctx, 36, 90, 24, 7);
  rrect(ctx, 30, 56, 12, 34, 4); fillOl(ctx, '#8d5a32');
  ctx.strokeStyle = '#6e4224'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(34, 64); ctx.lineTo(34, 84); ctx.stroke();
  const cs = [[36, 40, 24], [18, 52, 15], [54, 52, 15], [36, 22, 16], [22, 32, 13], [50, 32, 13]];
  blob(ctx, cs, pal[0]);
  ctx.fillStyle = pal[1];
  for (const [x, y, r] of cs) { circ(ctx, x - r * 0.25, y - r * 0.3, r * 0.6); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; circ(ctx, 28, 20, 5); ctx.fill(); circ(ctx, 20, 30, 3); ctx.fill();
  if (apples) { for (const [x, y] of [[26, 44], [46, 36], [40, 56], [20, 54], [52, 50]]) { circ(ctx, x, y, 3.2); fillOl(ctx, apples, 1.5); } }
}
function drawPine(ctx, col, hi, snow) {
  shadow(ctx, 32, 92, 20, 6);
  rrect(ctx, 27, 72, 10, 20, 3); fillOl(ctx, '#7a4a2a');
  const tiers = [[78, 28, 26], [58, 23, 24], [38, 17, 22]];
  for (const [y, w, h] of tiers) {
    poly(ctx, [32 - w, y, 32 + w, y, 32, y - h - 8]); fillOl(ctx, col);
    poly(ctx, [32 - w + 5, y - 3, 32, y - 3, 32, y - h - 4]); ctx.fillStyle = hi; ctx.fill();
    if (snow) { poly(ctx, [32 - w * 0.45, y - h * 0.62, 32 + w * 0.45, y - h * 0.62, 32, y - h - 7]); ctx.fillStyle = '#fbfdff'; ctx.fill(); }
  }
}
function drawBirch(ctx) {
  shadow(ctx, 32, 92, 20, 6);
  rrect(ctx, 27, 46, 10, 46, 4); fillOl(ctx, '#f2efe6');
  ctx.fillStyle = '#333'; for (const [y, w] of [[54, 5], [64, 4], [76, 6], [84, 3]]) ctx.fillRect(28 + (y % 3), y, w, 2);
  const cs = [[32, 32, 18], [18, 40, 12], [46, 40, 12], [32, 16, 12]];
  blob(ctx, cs, '#a6d65a');
  ctx.fillStyle = '#c4e67a'; for (const [x, y, r] of cs) { circ(ctx, x - r * 0.25, y - r * 0.3, r * 0.55); ctx.fill(); }
}
function drawPalm(ctx) {
  shadow(ctx, 34, 92, 18, 5);
  ctx.lineWidth = 12; ctx.strokeStyle = OL; ctx.beginPath(); ctx.moveTo(32, 90); ctx.quadraticCurveTo(28, 55, 42, 28); ctx.stroke();
  ctx.lineWidth = 7; ctx.strokeStyle = '#b5834f'; ctx.stroke();
  ctx.strokeStyle = '#8d6238'; ctx.lineWidth = 2;
  for (let t = 0.1; t < 0.95; t += 0.12) { const x = (1 - t) * (1 - t) * 32 + 2 * (1 - t) * t * 28 + t * t * 42, y = (1 - t) * (1 - t) * 90 + 2 * (1 - t) * t * 55 + t * t * 28; ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y - 1); ctx.stroke(); }
  const fr = [[-40, 6], [-22, -16], [4, -24], [28, -12], [40, 10], [-10, 14], [18, 16]];
  for (const [dx, dy] of fr) {
    const ex = 42 + dx, ey = 28 + dy;
    ctx.beginPath(); ctx.moveTo(42, 28); ctx.quadraticCurveTo(42 + dx * 0.5, 28 + dy - 14, ex, ey + 6);
    ctx.quadraticCurveTo(42 + dx * 0.5, 28 + dy - 4, 42, 30); fillOl(ctx, '#4fb04a', 2.5);
  }
  for (const [x, y] of [[38, 33], [45, 34]]) { circ(ctx, x, y, 4); fillOl(ctx, '#7a5230', 1.5); }
}
function drawStump(ctx) {
  shadow(ctx, 24, 30, 14, 5);
  rrect(ctx, 13, 16, 22, 14, 3); fillOl(ctx, '#8d5a32');
  ell(ctx, 24, 16, 11, 5); fillOl(ctx, '#e0b47a', 2.5);
  ell(ctx, 24, 16, 5, 2); ctx.strokeStyle = '#b07e48'; ctx.lineWidth = 1.5; ctx.stroke();
}
function drawRock(ctx, ore, snow) {
  shadow(ctx, 26, 38, 22, 6);
  poly(ctx, [6, 36, 4, 22, 14, 10, 30, 6, 44, 14, 48, 30, 42, 38]); fillOl(ctx, snow ? '#b9bfc9' : '#a3a09b');
  poly(ctx, [12, 20, 16, 12, 30, 9, 40, 16, 30, 20]); ctx.fillStyle = snow ? '#f3f6fa' : '#c9c6c0'; ctx.fill();
  ctx.strokeStyle = 'rgba(58,42,34,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(26, 22); ctx.lineTo(22, 32); ctx.stroke();
  if (ore) { for (const [x, y, r] of [[16, 28, 3.5], [34, 26, 4], [40, 33, 2.5], [24, 16, 2.5]]) { circ(ctx, x, y, r); fillOl(ctx, '#e0892f', 1.5); circ(ctx, x - 1, y - 1, r * 0.4); ctx.fillStyle = '#ffd08a'; ctx.fill(); } }
}
function drawCrystal(ctx) {
  shadow(ctx, 22, 40, 16, 5);
  const shards = [[22, 40, 8, 34], [12, 40, 6, 22], [32, 40, 6, 26]];
  for (const [x, y, w, h] of shards) {
    poly(ctx, [x - w, y, x - w, y - h * 0.7, x, y - h, x + w, y - h * 0.7, x + w, y]); fillOl(ctx, '#7ae6f2', 2.5);
    poly(ctx, [x - w + 2, y - 2, x - w + 2, y - h * 0.68, x - 1, y - h + 3, x - 1, y - 2]); ctx.fillStyle = '#c8f7ff'; ctx.fill();
  }
  ctx.fillStyle = '#fff'; circ(ctx, 18, 14, 2); ctx.fill();
}
function drawBush(ctx, berries) {
  shadow(ctx, 22, 32, 18, 5);
  blob(ctx, [[22, 20, 13], [10, 25, 8], [34, 25, 8], [16, 14, 8], [30, 14, 8]], '#4ea24a');
  ctx.fillStyle = '#6dbf5a'; circ(ctx, 18, 14, 6); ctx.fill(); circ(ctx, 28, 16, 4); ctx.fill();
  if (berries) for (const [x, y] of [[14, 22], [24, 26], [30, 19], [20, 15], [34, 26], [9, 27]]) { circ(ctx, x, y, 3); fillOl(ctx, berries, 1.4); ctx.fillStyle = 'rgba(255,255,255,.7)'; circ(ctx, x - 1, y - 1, 1); ctx.fill(); }
}
function drawTuft(ctx, col) {
  const blades = [[-10, -18], [-5, -26], [0, -30], [5, -24], [10, -17], [-2, -20]];
  for (const pass of [0, 1]) {
    ctx.lineWidth = pass ? 3 : 6; ctx.strokeStyle = pass ? col : OL;
    for (const [dx, dy] of blades) { ctx.beginPath(); ctx.moveTo(20 + dx * 0.3, 32); ctx.quadraticCurveTo(20 + dx * 0.6, 32 + dy * 0.5, 20 + dx, 32 + dy); ctx.stroke(); }
  }
  ctx.fillStyle = '#e6d070'; for (const [x, y] of [[15, 6], [26, 9], [20, 2]]) { ell(ctx, x, y, 2, 3.5); ctx.fill(); }
}
function drawStick(ctx) {
  ctx.lineWidth = 6; ctx.strokeStyle = OL; ctx.beginPath(); ctx.moveTo(6, 24); ctx.lineTo(34, 14); ctx.moveTo(22, 19); ctx.lineTo(28, 8); ctx.stroke();
  ctx.lineWidth = 3; ctx.strokeStyle = '#a06a3a'; ctx.stroke();
  ctx.lineWidth = 5; ctx.strokeStyle = OL; ctx.beginPath(); ctx.moveTo(12, 28); ctx.lineTo(32, 26); ctx.stroke();
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#8d5a32'; ctx.stroke();
}
function drawPebbles(ctx) {
  for (const [x, y, rx, ry, c] of [[14, 24, 7, 5, '#a9a6a0'], [26, 27, 5, 4, '#bdb9b2'], [22, 18, 4, 3, '#999590']]) { ell(ctx, x, y, rx, ry); fillOl(ctx, c, 2); ctx.fillStyle = 'rgba(255,255,255,.4)'; ell(ctx, x - 2, y - 2, rx * 0.4, ry * 0.3); ctx.fill(); }
}
function drawShell(ctx) {
  ctx.beginPath(); ctx.moveTo(18, 26); ctx.arc(18, 22, 11, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); fillOl(ctx, '#f7b6c2', 2.2);
  ctx.strokeStyle = '#d9849a'; ctx.lineWidth = 1.5; for (const a of [-2.6, -2.1, -1.57, -1.05, -0.55]) { ctx.beginPath(); ctx.moveTo(18, 25); ctx.lineTo(18 + Math.cos(a) * 9, 22 + Math.sin(a) * 9); ctx.stroke(); }
  ell(ctx, 18, 27, 4, 2); fillOl(ctx, '#f7b6c2', 1.5);
}
function drawScrap(ctx) {
  shadow(ctx, 22, 30, 18, 5);
  poly(ctx, [6, 28, 10, 16, 24, 14, 22, 28]); fillOl(ctx, '#8a8f99', 2);
  poly(ctx, [20, 30, 26, 18, 38, 22, 36, 31]); fillOl(ctx, '#b0623a', 2);
  ctx.save(); ctx.translate(28, 14);
  for (let i = 0; i < 8; i++) { ctx.rotate(TAU / 8); ctx.fillStyle = OL; ctx.fillRect(-2, -9, 4, 4); }
  circ(ctx, 0, 0, 6.5); fillOl(ctx, '#c3c8d0', 2); circ(ctx, 0, 0, 2); ctx.fillStyle = OL; ctx.fill(); ctx.restore();
}
function drawFlowers(ctx, cols) {
  const fl = [[10, 22], [20, 14], [30, 22], [16, 28], [26, 30]];
  ctx.strokeStyle = '#3f8a3a'; ctx.lineWidth = 2;
  fl.forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, 36); ctx.stroke(); });
  fl.forEach(([x, y], i) => {
    const c = cols[i % cols.length];
    for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; circ(ctx, x + Math.cos(a) * 3.2, y + Math.sin(a) * 3.2, 2.6); ctx.fillStyle = c; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = OL; ctx.stroke(); }
    circ(ctx, x, y, 2); ctx.fillStyle = '#ffd84a'; ctx.fill();
    ctx.strokeStyle = '#3f8a3a'; ctx.lineWidth = 2;
  });
}

// ---------- Gebäude der Ruinen ----------
function logWall(ctx, x, y, w, h, col) {
  rrect(ctx, x, y, w, h, 3); fillOl(ctx, col);
  ctx.strokeStyle = U.shade(col, -0.25); ctx.lineWidth = 2;
  for (let yy = y + 9; yy < y + h - 2; yy += 9) { ctx.beginPath(); ctx.moveTo(x + 2, yy); ctx.lineTo(x + w - 2, yy); ctx.stroke(); }
}
function windowBox(ctx, x, y, w, h) {
  rrect(ctx, x, y, w, h, 3); fillOl(ctx, '#ffe7a0');
  ctx.strokeStyle = OL; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(x + 3, y + 3, 4, 4);
}
function door(ctx, x, y, w, h, col = '#7a4a25') {
  ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + w / 2); ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.closePath(); fillOl(ctx, col);
  ctx.strokeStyle = U.shade(col, -0.3); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + w / 2, y + 4); ctx.lineTo(x + w / 2, y + h - 2); ctx.stroke();
  circ(ctx, x + w * 0.75, y + h * 0.6, 2); ctx.fillStyle = '#ffd54a'; ctx.fill();
}
function roof(ctx, x1, y1, x2, apexY, col) {
  poly(ctx, [x1, y1, (x1 + x2) / 2, apexY, x2, y1]); fillOl(ctx, col);
  ctx.strokeStyle = U.shade(col, -0.2); ctx.lineWidth = 2;
  const steps = 4; for (let i = 1; i < steps; i++) { const t = i / steps; const yy = apexY + (y1 - apexY) * t; const hw = (x2 - x1) / 2 * t; ctx.beginPath(); ctx.moveTo((x1 + x2) / 2 - hw + 3, yy); ctx.lineTo((x1 + x2) / 2 + hw - 3, yy); ctx.stroke(); }
}
function flowerBox(ctx, x, y, w) {
  rrect(ctx, x, y, w, 6, 2); fillOl(ctx, '#9c6233', 2);
  for (let i = 0; i < w; i += 6) { circ(ctx, x + 3 + i, y - 1, 2.5); ctx.fillStyle = ['#ff6f91', '#ffd84a', '#ffffff'][(i / 6) % 3]; ctx.fill(); }
}

const LM_DRAW = {
  cabin(ctx, W, H) {
    const B = H - 6; shadow(ctx, W / 2, B, W / 2 - 4, 8);
    logWall(ctx, 18, B - 70, W - 36, 70, '#b9814a');
    for (let y = B - 66; y < B; y += 9) { circ(ctx, 18, y + 4, 4); fillOl(ctx, '#d4a06a', 1.5); circ(ctx, W - 18, y + 4, 4); fillOl(ctx, '#d4a06a', 1.5); }
    rrect(ctx, W - 50, 22, 14, 40, 2); fillOl(ctx, '#9a948c');
    roof(ctx, 6, B - 64, W - 6, 14, '#e05a4f');
    door(ctx, W / 2 - 11, B - 44, 22, 44);
    windowBox(ctx, 28, B - 52, 24, 22); windowBox(ctx, W - 52, B - 52, 24, 22);
    flowerBox(ctx, 26, B - 28, 28); flowerBox(ctx, W - 54, B - 28, 28);
  },
  house(ctx, W, H, v = 0) {
    const B = H - 6; shadow(ctx, W / 2, B, W / 2 - 4, 7);
    const walls = ['#f2e6cf', '#cfe3f0', '#f3d6c8'][v % 3], rf = ['#4f86c6', '#6aa84f', '#c0587e'][v % 3];
    rrect(ctx, 14, B - 60, W - 28, 60, 3); fillOl(ctx, walls);
    roof(ctx, 4, B - 54, W - 4, 14, rf);
    door(ctx, W / 2 - 10, B - 38, 20, 38, '#8a5a35');
    windowBox(ctx, 20, B - 46, 18, 18); windowBox(ctx, W - 38, B - 46, 18, 18);
  },
  workshop(ctx, W, H) {
    const B = H - 6; shadow(ctx, W / 2, B, W / 2 - 4, 9);
    rrect(ctx, 12, B - 86, W - 24, 86, 3); fillOl(ctx, '#d39a6a');
    ctx.strokeStyle = '#b07a4d'; ctx.lineWidth = 1.5;
    for (let y = B - 80, r = 0; y < B; y += 10, r++) for (let x = 14 + (r % 2) * 10; x < W - 14; x += 20) ctx.strokeRect(x, y, 20, 10);
    rrect(ctx, 30, 18, 18, 50, 2); fillOl(ctx, '#8d8780');
    poly(ctx, [4, B - 80, 26, 40, W - 26, 40, W - 4, B - 80]); fillOl(ctx, '#5f7a99');
    ctx.strokeStyle = '#4a6280'; ctx.lineWidth = 2; for (let x = 30; x < W - 26; x += 14) { ctx.beginPath(); ctx.moveTo(x, 42); ctx.lineTo(x - 8 + (x - W / 2) * 0.15, B - 82); ctx.stroke(); }
    rrect(ctx, W / 2 - 30, B - 56, 60, 56, 3); fillOl(ctx, '#7a5035');
    ctx.strokeStyle = '#5a3822'; ctx.lineWidth = 2; for (let x = W / 2 - 24; x < W / 2 + 30; x += 12) { ctx.beginPath(); ctx.moveTo(x, B - 54); ctx.lineTo(x, B - 2); ctx.stroke(); }
    ctx.save(); ctx.translate(W / 2, B - 70); for (let i = 0; i < 8; i++) { ctx.rotate(TAU / 8); ctx.fillStyle = OL; ctx.fillRect(-3, -14, 6, 6); }
    circ(ctx, 0, 0, 10); fillOl(ctx, '#ffd54a', 2.5); circ(ctx, 0, 0, 3.5); ctx.fillStyle = OL; ctx.fill(); ctx.restore();
    windowBox(ctx, 22, B - 60, 22, 20); windowBox(ctx, W - 44, B - 60, 22, 20);
    poly(ctx, [W - 22, B, W - 30, B - 10, W - 8, B - 10, W - 14, B]); fillOl(ctx, '#55585e', 2); rrect(ctx, W - 36, B - 16, 30, 7, 2); fillOl(ctx, '#6c7078', 2);
  },
  ship(ctx, W, H) {
    const B = H - 6; shadow(ctx, W / 2, B, W / 2 - 6, 10);
    ctx.save(); ctx.translate(W / 2, B - 30); ctx.rotate(-0.06);
    ctx.beginPath(); ctx.moveTo(-100, -34); ctx.lineTo(100, -40); ctx.quadraticCurveTo(96, 10, 60, 22); ctx.lineTo(-70, 22); ctx.quadraticCurveTo(-98, 6, -100, -34); ctx.closePath(); fillOl(ctx, '#9c6236');
    ctx.strokeStyle = '#7a4a28'; ctx.lineWidth = 2; for (let y = -24; y < 20; y += 9) { ctx.beginPath(); ctx.moveTo(-96, y); ctx.lineTo(94, y - 4); ctx.stroke(); }
    ctx.fillStyle = '#e8c85a'; ctx.fillRect(-98, -34, 196, 5);
    for (const x of [-60, -30, 0, 30, 60]) { circ(ctx, x, -14, 5); fillOl(ctx, '#3d5a73', 2); }
    rrect(ctx, 48, -64, 46, 28, 3); fillOl(ctx, '#c08a55'); windowBox(ctx, 58, -58, 14, 12); windowBox(ctx, 76, -58, 14, 12);
    ctx.lineWidth = 7; ctx.strokeStyle = OL; ctx.beginPath(); ctx.moveTo(-10, -36); ctx.lineTo(-10, -150); ctx.stroke(); ctx.lineWidth = 4; ctx.strokeStyle = '#7a4a28'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6, -140); ctx.quadraticCurveTo(50, -100, -6, -48); ctx.closePath(); fillOl(ctx, '#fbf6ea');
    ctx.fillStyle = '#e05a4f'; ctx.fillRect(-4, -104, 34, 7);
    ctx.beginPath(); ctx.moveTo(-14, -136); ctx.quadraticCurveTo(-60, -100, -14, -56); ctx.closePath(); fillOl(ctx, '#f3ecda');
    poly(ctx, [-10, -150, 14, -144, -10, -138]); fillOl(ctx, '#e05a4f', 2);
    ctx.restore();
  },
  windmill(ctx, W, H) {
    const B = H - 6; shadow(ctx, W / 2, B, W / 2 - 6, 8);
    poly(ctx, [24, B, 38, 70, W - 38, 70, W - 24, B]); fillOl(ctx, '#efe2c8');
    ctx.strokeStyle = '#d4c2a0'; ctx.lineWidth = 2; for (let y = 84; y < B; y += 14) { ctx.beginPath(); ctx.moveTo(30, y); ctx.lineTo(W - 30, y); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(32, 74); ctx.quadraticCurveTo(W / 2, 20, W - 32, 74); ctx.closePath(); fillOl(ctx, '#a0582e');
    door(ctx, W / 2 - 11, B - 40, 22, 40); windowBox(ctx, W / 2 - 9, 100, 18, 18);
    circ(ctx, W / 2, 62, 8); fillOl(ctx, '#6e4224');
  },
  greenhouse(ctx, W, H) {
    const B = H - 6; shadow(ctx, W / 2, B, W / 2 - 4, 8);
    rrect(ctx, 10, B - 14, W - 20, 14, 2); fillOl(ctx, '#a39c92');
    ctx.beginPath(); ctx.moveTo(14, B - 14); ctx.lineTo(14, B - 66); ctx.lineTo(W / 2, B - 104); ctx.lineTo(W - 14, B - 66); ctx.lineTo(W - 14, B - 14); ctx.closePath();
    ctx.fillStyle = 'rgba(170,230,240,0.75)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OL; ctx.stroke();
    for (const [x, h] of [[30, 20], [50, 30], [72, 24], [94, 34], [114, 22]]) { blob(ctx, [[x, B - 18 - h * 0.4, 8], [x - 5, B - 20, 6], [x + 5, B - 20, 6]], '#5cb14f', 1.5); circ(ctx, x, B - 22 - h * 0.4, 2.5); ctx.fillStyle = '#e8414f'; ctx.fill(); }
    ctx.strokeStyle = '#f8fbff'; ctx.lineWidth = 3;
    for (let x = 14 + (W - 28) / 5; x < W - 15; x += (W - 28) / 5) { ctx.beginPath(); ctx.moveTo(x, B - 14); ctx.lineTo(x, B - 66 - (1 - Math.abs(x - W / 2) / (W / 2 - 14)) * 38); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(14, B - 66); ctx.lineTo(W - 14, B - 66); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; poly(ctx, [24, B - 70, 44, B - 88, 50, B - 82, 30, B - 66]); ctx.fill();
  },
  garage(ctx, W, H) {
    const B = H - 6; shadow(ctx, W / 2, B, W / 2 - 4, 8);
    rrect(ctx, 10, B - 84, W - 20, 84, 4); fillOl(ctx, '#c9c4bc');
    rrect(ctx, 4, B - 92, W - 8, 14, 3); fillOl(ctx, '#e0884a');
    rrect(ctx, 24, B - 60, W - 48, 60, 2); fillOl(ctx, '#8e9aa6');
    ctx.strokeStyle = '#6f7a86'; ctx.lineWidth = 2; for (let y = B - 52; y < B; y += 8) { ctx.beginPath(); ctx.moveTo(26, y); ctx.lineTo(W - 26, y); ctx.stroke(); }
    rrect(ctx, W / 2 - 26, B - 76, 52, 12, 3); fillOl(ctx, '#fff6dc', 2);
    ctx.fillStyle = OL; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('GARAGE', W / 2, B - 67);
    for (const x of [14, W - 22]) { rrect(ctx, x, B - 30, 8, 30, 2); fillOl(ctx, '#e8414f', 2); }
  },
  lighthouse(ctx, W, H) {
    const B = H - 6; shadow(ctx, W / 2, B, W / 2 - 4, 9);
    blob(ctx, [[W / 2 - 26, B - 10, 16], [W / 2 + 24, B - 10, 18], [W / 2, B - 14, 20]], '#9a958d');
    poly(ctx, [W / 2 - 30, B - 16, W / 2 - 18, 74, W / 2 + 18, 74, W / 2 + 30, B - 16]); fillOl(ctx, '#fbf8f2');
    ctx.save(); poly(ctx, [W / 2 - 30, B - 16, W / 2 - 18, 74, W / 2 + 18, 74, W / 2 + 30, B - 16]); ctx.clip();
    ctx.fillStyle = '#e04f4f'; for (let y = 90; y < B - 16; y += 52) ctx.fillRect(0, y, W, 24); ctx.restore();
    poly(ctx, [W / 2 - 30, B - 16, W / 2 - 18, 74, W / 2 + 18, 74, W / 2 + 30, B - 16]); ctx.lineWidth = 3; ctx.strokeStyle = OL; ctx.stroke();
    door(ctx, W / 2 - 9, B - 46, 18, 30, '#5a3a25'); windowBox(ctx, W / 2 - 6, 130, 12, 14);
    rrect(ctx, W / 2 - 28, 66, 56, 9, 2); fillOl(ctx, '#3d4a5a');
    rrect(ctx, W / 2 - 16, 40, 32, 27, 3); fillOl(ctx, '#ffe58a');
    ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W / 2, 40); ctx.lineTo(W / 2, 67); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W / 2 - 20, 42); ctx.quadraticCurveTo(W / 2, 10, W / 2 + 20, 42); ctx.closePath(); fillOl(ctx, '#e04f4f');
    circ(ctx, W / 2, 20, 4); fillOl(ctx, '#3d4a5a', 2);
  },
  hangar(ctx, W, H) {
    const B = H - 6; shadow(ctx, W / 2, B, W / 2 - 4, 10);
    // Ballon
    const bx = W / 2, by = 70;
    ctx.save(); circ(ctx, bx, by, 56); ctx.clip();
    const cols = ['#ff6f61', '#ffd166', '#06d6a0', '#4ea8de'];
    for (let i = 0; i < 8; i++) { ctx.fillStyle = cols[i % 4]; ctx.fillRect(bx - 56 + i * 14, by - 60, 14, 120); }
    ctx.restore(); circ(ctx, bx, by, 56); ctx.lineWidth = 3; ctx.strokeStyle = OL; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ell(ctx, bx - 24, by - 26, 12, 18); ctx.fill();
    ctx.beginPath(); ctx.arc(10 + (W - 20) / 2, B, (W - 20) / 2, Math.PI, 0); ctx.closePath(); fillOl(ctx, '#e6cf9f');
    ctx.save(); ctx.beginPath(); ctx.arc(W / 2, B, (W - 20) / 2, Math.PI, 0); ctx.closePath(); ctx.clip();
    ctx.fillStyle = '#d4b47a'; for (let x = 10; x < W; x += 30) ctx.fillRect(x, 0, 15, H); ctx.restore();
    ctx.beginPath(); ctx.arc(W / 2, B, (W - 20) / 2, Math.PI, 0); ctx.lineWidth = 3; ctx.strokeStyle = OL; ctx.stroke();
    ctx.beginPath(); ctx.arc(W / 2, B, 46, Math.PI, 0); ctx.closePath(); fillOl(ctx, '#5a4030');
    rrect(ctx, W / 2 - 16, B - 30, 32, 26, 4); fillOl(ctx, '#b07a45');
  },
};

function ruinify(sp, seed) {
  const r = U.rng(seed), c = sp.c, ctx = c.getContext('2d');
  const img = ctx.getImageData(0, 0, c.width, c.height), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const g = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
    d[i] = U.lerp(d[i], g * 0.85 + 25, 0.7) * 0.82;
    d[i + 1] = U.lerp(d[i + 1], g * 0.85 + 15, 0.7) * 0.8;
    d[i + 2] = U.lerp(d[i + 2], g * 0.85, 0.7) * 0.74;
  }
  ctx.putImageData(img, 0, 0);
  ctx.save(); ctx.setTransform(Art.S, 0, 0, Art.S, 0, 0);
  const W = sp.w, H = sp.h;
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 5; i++) {
    const cx = W * (0.2 + r() * 0.6), cy = H * (0.05 + r() * 0.4), s = 10 + r() * 18;
    ctx.beginPath(); for (let k = 0; k < 7; k++) { const a = k / 7 * TAU; const rr = s * (0.5 + r() * 0.7); k ? ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : ctx.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } ctx.closePath(); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-atop';
  ctx.strokeStyle = 'rgba(40,30,25,0.7)'; ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) { let x = W * (0.15 + r() * 0.7), y = H * (0.3 + r() * 0.6); ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 16; y += r() * 10; ctx.lineTo(x, y); } ctx.stroke(); }
  for (let i = 0; i < 4; i++) {
    let x = W * (0.1 + r() * 0.8), y = H; ctx.strokeStyle = '#3f7d35'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y);
    const pts = []; for (let k = 0; k < 8; k++) { x += (r() - 0.5) * 14; y -= 8 + r() * 8; ctx.lineTo(x, y); pts.push([x, y]); } ctx.stroke();
    ctx.fillStyle = '#5aa848'; for (const [px, py] of pts) { ell(ctx, px + 3, py, 4, 2.5); ctx.fill(); }
  }
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 5; i++) { const x = W * (0.1 + r() * 0.8), y = H - 6 - r() * 6; ctx.save(); ctx.translate(x, y); ctx.rotate((r() - 0.5) * 1.2); rrect(ctx, -12, -2.5, 24, 5, 1); fillOl(ctx, '#8a6a4a', 1.5); ctx.restore(); }
  for (let i = 0; i < 6; i++) { const x = W * (0.05 + r() * 0.9), y = H - 4 - r() * 8; blob(ctx, [[x, y, 4 + r() * 4], [x + 5, y + 1, 3 + r() * 3]], '#6aa84f', 1.5); }
  ctx.restore();
}

Art.landmark = function (type, ruined, variant = 0) {
  const key = type + (ruined ? '_r' : '') + '_' + variant;
  if (Art.lm[key]) return Art.lm[key];
  const L = LANDMARKS[type];
  const S = Art.S, c = mkCanvas(L.sw * S, L.sh * S), ctx = c.getContext('2d');
  ctx.scale(S, S); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  LM_DRAW[type](ctx, L.sw, L.sh, variant);
  if (type === 'windmill' && ruined) {
    ctx.save(); ctx.translate(L.sw / 2, 62); ctx.rotate(0.5);
    for (const a of [0, 2.2]) { ctx.save(); ctx.rotate(a); rrect(ctx, -5, -70 * (a ? 0.6 : 1), 10, 70 * (a ? 0.6 : 1), 2); fillOl(ctx, '#d8c8a8', 2); ctx.restore(); }
    ctx.restore();
  }
  const sp = { c, w: L.sw, h: L.sh };
  if (ruined) ruinify(sp, type.length * 977 + variant * 31);
  Art.lm[key] = sp;
  return sp;
};

// ---------- Bauteile ----------
function buildSprites() {
  Art.make('fence', 32, 40, 16, 34, (c) => { rrect(c, 12, 8, 8, 28, 2); fillOl(c, '#b07a45', 2.5); poly(c, [12, 8, 16, 3, 20, 8]); fillOl(c, '#b07a45', 2.5); });
  Art.make('wall', 32, 44, 16, 36, (c) => {
    rrect(c, 1, 10, 30, 28, 3); fillOl(c, '#a9a49c');
    c.strokeStyle = '#8a857e'; c.lineWidth = 2; c.beginPath(); c.moveTo(2, 20); c.lineTo(30, 20); c.moveTo(2, 29); c.lineTo(30, 29); c.moveTo(12, 10); c.lineTo(12, 20); c.moveTo(22, 20); c.lineTo(22, 29); c.moveTo(10, 29); c.lineTo(10, 38); c.stroke();
    c.fillStyle = '#c6c1ba'; c.fillRect(3, 12, 26, 3);
  });
  Art.make('lantern', 32, 64, 16, 58, (c) => {
    shadow(c, 16, 58, 9, 3); rrect(c, 14, 20, 4, 38, 1); fillOl(c, '#4a4f58', 2);
    rrect(c, 8, 6, 16, 18, 3); fillOl(c, '#ffe58a', 2.5); poly(c, [6, 7, 16, 0, 26, 7]); fillOl(c, '#4a4f58', 2);
    c.fillStyle = '#fff6c4'; circ(c, 16, 15, 4); c.fill();
  });
  Art.make('bench', 48, 36, 24, 30, (c) => {
    shadow(c, 24, 30, 20, 4); rrect(c, 4, 4, 40, 8, 2); fillOl(c, '#b07a45', 2.5); rrect(c, 4, 15, 40, 7, 2); fillOl(c, '#c68c52', 2.5);
    for (const x of [8, 36]) { rrect(c, x, 20, 4, 10, 1); fillOl(c, '#5a5f68', 2); }
  });
  Art.make('chest', 36, 34, 18, 28, (c) => {
    shadow(c, 18, 28, 15, 4); rrect(c, 4, 12, 28, 16, 3); fillOl(c, '#a8693a'); c.beginPath(); c.moveTo(4, 16); c.quadraticCurveTo(18, 0, 32, 16); c.closePath(); fillOl(c, '#c27d45');
    c.fillStyle = '#e8c35a'; c.fillRect(16, 12, 4, 16); rrect(c, 15, 14, 6, 6, 1); fillOl(c, '#ffd54a', 1.5);
  });
  Art.make('tent', 64, 56, 32, 50, (c) => {
    shadow(c, 32, 50, 28, 5); poly(c, [4, 50, 32, 6, 60, 50]); fillOl(c, '#4fa08b');
    poly(c, [24, 50, 32, 22, 40, 50]); fillOl(c, '#2f6d5e', 2.5);
    c.strokeStyle = '#7bc4b0'; c.lineWidth = 2; c.beginPath(); c.moveTo(32, 8); c.lineTo(12, 48); c.stroke();
  });
  Art.make('well', 48, 64, 24, 56, (c) => {
    shadow(c, 24, 56, 21, 5); rrect(c, 4, 34, 40, 22, 6); fillOl(c, '#a9a49c'); ell(c, 24, 36, 18, 6); fillOl(c, '#3f5f80', 2.5);
    for (const x of [6, 40]) { rrect(c, x, 8, 4, 30, 1); fillOl(c, '#8d5a32', 2); }
    poly(c, [0, 12, 24, 0, 48, 12]); fillOl(c, '#d9534f', 2.5);
    c.strokeStyle = OL; c.lineWidth = 1.5; c.beginPath(); c.moveTo(24, 12); c.lineTo(24, 26); c.stroke(); rrect(c, 20, 24, 8, 7, 1); fillOl(c, '#8d5a32', 1.5);
  });
  Art.make('statue', 40, 70, 20, 62, (c) => {
    shadow(c, 20, 62, 16, 4); rrect(c, 6, 46, 28, 16, 3); fillOl(c, '#bdb8b0');
    poly(c, [20, 4, 30, 24, 24, 46, 16, 46, 10, 24]); fillOl(c, '#8ff0ff');
    poly(c, [20, 8, 18, 24, 20, 42, 14, 24]); c.fillStyle = '#d8fbff'; c.fill();
  });
  Art.make('campfire_base', 40, 30, 20, 22, (c) => {
    shadow(c, 20, 22, 17, 5);
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; ell(c, 20 + Math.cos(a) * 13, 20 + Math.sin(a) * 5, 5, 3.5); fillOl(c, '#9e9a94', 1.5); }
    c.save(); c.translate(20, 18); for (const a of [-0.5, 0.5, 0]) { c.save(); c.rotate(a); rrect(c, -12, -2.5, 24, 5, 2); fillOl(c, '#8d5a32', 1.8); c.restore(); } c.restore();
  });
}

Art.drawFlame = function (ctx, x, y, t, s = 1) {
  const f = Math.sin(t * 12) * 1.5, g = Math.cos(t * 9) * 1.2;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(-9, 0); ctx.quadraticCurveTo(-11, -12 + f, 0, -24 + g); ctx.quadraticCurveTo(11, -12 - f, 9, 0); ctx.closePath(); ctx.fillStyle = '#ff7b2e'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OL; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-5, 0); ctx.quadraticCurveTo(-6, -8 - f, 0, -15 + g); ctx.quadraticCurveTo(6, -8 + f, 5, 0); ctx.closePath(); ctx.fillStyle = '#ffd34a'; ctx.fill();
  ctx.restore();
};

// Boden-Bauteile werden direkt gezeichnet
Art.drawFloor = function (ctx, b, x, y, now) {
  const T = 32;
  if (b.type === 'path' || b.type === 'shellpath') {
    rrect(ctx, x + 1, y + 1, T - 2, T - 2, 6); ctx.fillStyle = b.type === 'path' ? '#cfc6b6' : '#f6e3d3'; ctx.fill();
    const r = U.rng(b.tx * 31 + b.ty * 17);
    for (let i = 0; i < 4; i++) { ell(ctx, x + 7 + (i % 2) * 16 + r() * 4, y + 8 + Math.floor(i / 2) * 15 + r() * 3, 6, 4.5); ctx.fillStyle = b.type === 'path' ? '#b3a996' : '#f2b5c3'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(58,42,34,.4)'; ctx.stroke(); }
  } else if (b.type === 'bridge') {
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x, y + 4, T, T);
    for (let i = 0; i < 4; i++) { rrect(ctx, x, y + i * 8, T, 7, 2); ctx.fillStyle = i % 2 ? '#b98552' : '#c8935e'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = OL; ctx.stroke(); }
  } else if (b.type === 'flowerbed') {
    rrect(ctx, x + 2, y + 4, T - 4, T - 6, 5); fillOl(ctx, '#7a5236', 2);
    const cols = ['#ff6f91', '#ffd84a', '#b388ff', '#ffffff'];
    for (let i = 0; i < 6; i++) { const fx = x + 8 + (i % 3) * 8, fy = y + 12 + Math.floor(i / 3) * 9; ctx.fillStyle = '#3f8a3a'; ctx.fillRect(fx - 1, fy, 2, 5); circ(ctx, fx, fy, 3.2); ctx.fillStyle = cols[(i + b.tx) % 4]; ctx.fill(); }
  } else if (b.type === 'garden') {
    rrect(ctx, x + 2, y + 3, T - 4, T - 5, 5); fillOl(ctx, '#6b4529', 2);
    ctx.strokeStyle = '#563620'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x + 6, y + 9 + i * 8); ctx.lineTo(x + T - 6, y + 9 + i * 8); ctx.stroke(); }
    const g = U.clamp((now - b.t) / 90, 0, 1);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      const px = x + 9 + i * 7, py = y + 11 + j * 10, s = 2 + g * 4;
      ctx.fillStyle = '#5cb14f'; circ(ctx, px, py, s); ctx.fill();
      if (g >= 1) { circ(ctx, px + 1, py, 2); ctx.fillStyle = '#e8414f'; ctx.fill(); }
    }
  }
};

// ---------- Figuren ----------
Art.person = function (ctx, x, y, look, dir, phase, moving, act, t) {
  const sw = moving ? Math.sin(phase) : 0, bob = moving ? Math.abs(Math.sin(phase)) * 1.5 : 0;
  shadow(ctx, x, y, 11, 4);
  ctx.save(); ctx.translate(x, y - bob);
  const side = dir === 2 || dir === 3; if (dir === 2) ctx.scale(-1, 1);
  // Beine
  ctx.lineCap = 'round';
  for (const k of [-1, 1]) { const off = side ? sw * 4 * k : 0, lift = !side ? Math.max(0, sw * k) * 3 : 0; rrect(ctx, (side ? -3 : k * 5 - 3) + off, -10 - lift, 6, 10, 3); fillOl(ctx, look.pants, 2); }
  // Körper
  rrect(ctx, -9, -26, 18, 18, 6); fillOl(ctx, look.shirt, 2.5);
  if (dir !== 1) { ctx.fillStyle = U.shade(look.shirt, 0.25); ctx.fillRect(-3, -24, 6, 3); }
  // Arme
  const arm = act ? Math.sin(t * 14) : sw;
  const hands = side ? [[arm * 6, -14]] : [[-11, -15 + sw * 2], [11, -15 - sw * 2]];
  if (act && !side) hands[1] = [12, -20 + Math.sin(t * 14) * 5];
  for (const [hx, hy] of hands) { circ(ctx, hx, hy, 3.5); fillOl(ctx, look.skin, 2); }
  if (act) {
    const [hx, hy] = hands[hands.length - 1];
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(-0.8 + Math.sin(t * 14) * 0.9);
    rrect(ctx, -1.5, -16, 3, 16, 1); fillOl(ctx, '#8d5a32', 1.5);
    poly(ctx, [-1, -16, 7, -18, 7, -10, -1, -12]); fillOl(ctx, act === 'pick' ? '#c3c8d0' : '#a7adb6', 1.5);
    ctx.restore();
  }
  // Kopf
  const hy = -38;
  circ(ctx, 0, hy, 12); fillOl(ctx, look.skin, 2.5);
  ctx.fillStyle = look.hair; ctx.strokeStyle = OL; ctx.lineWidth = 2.5;
  if (dir === 1) { circ(ctx, 0, hy, 12); ctx.fill(); ctx.stroke(); }
  else {
    ctx.beginPath(); ctx.arc(0, hy, 12, Math.PI * 1.05, Math.PI * 1.95); ctx.quadraticCurveTo(side ? 4 : 0, hy - 4, -11.5, hy - 3); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (look.style === 1) { circ(ctx, side ? -10 : -11, hy + 4, 4.5); ctx.fill(); ctx.stroke(); if (!side) { circ(ctx, 11, hy + 4, 4.5); ctx.fill(); ctx.stroke(); } }
    if (look.style === 2) { ctx.beginPath(); ctx.ellipse(side ? -9 : 0, hy - 13, 5, 4, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
    if (look.style === 3) { rrect(ctx, -13, hy - 10, 26, 5, 2); ctx.fillStyle = look.hat || '#e05a4f'; ctx.fill(); ctx.stroke(); }
    // Gesicht
    ctx.fillStyle = OL;
    const ex = side ? [3, 8] : [-4.5, 4.5];
    for (const e of ex) { ell(ctx, e, hy + 1, 1.8, 2.4); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,120,120,.45)'; for (const e of (side ? [6] : [-7, 7])) { circ(ctx, e, hy + 5, 2.2); ctx.fill(); }
    ctx.strokeStyle = OL; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(side ? 5 : 0, hy + 4, 2.5, 0.2, Math.PI - 0.2); ctx.stroke();
  }
  ctx.restore();
};

// ---------- Tiere ----------
Art.animal = function (ctx, a, t) {
  const moving = a.moving, ph = a.phase, x = a.x, y = a.y;
  const hop = a.type === 'rabbit' && moving ? Math.abs(Math.sin(ph * 0.8)) * 6 : 0;
  if (!(a.type === 'duck' && a.swim)) shadow(ctx, x, y, a.type === 'deer' ? 14 : 9, 3.5);
  ctx.save(); ctx.translate(x, y - hop); if (a.face < 0) ctx.scale(-1, 1);
  const leg = moving ? Math.sin(ph) * 3 : 0;
  switch (a.type) {
    case 'rabbit': {
      const c = a.var ? '#c9a47a' : '#f4f1ea';
      ell(ctx, 0, -8, 9, 7); fillOl(ctx, c, 2.2);
      circ(ctx, -9, -9, 3.5); fillOl(ctx, '#fff', 1.5);
      for (const dx of [5, 9]) { ell(ctx, dx, -24, 2.6, 7); fillOl(ctx, c, 2); }
      circ(ctx, 8, -14, 6); fillOl(ctx, c, 2.2);
      ctx.fillStyle = OL; circ(ctx, 10, -15, 1.3); ctx.fill(); ctx.fillStyle = '#ff9aa8'; circ(ctx, 13.5, -13, 1.3); ctx.fill();
      break;
    }
    case 'deer': {
      for (const [lx, s] of [[-8, 1], [-4, -1], [6, 1], [10, -1]]) { rrect(ctx, lx + leg * s * 0.7, -12, 3, 12, 1); fillOl(ctx, '#8a5a34', 1.5); }
      ell(ctx, 0, -17, 14, 8); fillOl(ctx, '#b87a48', 2.2);
      ctx.fillStyle = '#f4e6d0'; for (const [sx, sy] of [[-5, -20], [0, -22], [4, -19], [-8, -16]]) { circ(ctx, sx, sy, 1.4); ctx.fill(); }
      rrect(ctx, 8, -32, 6, 14, 3); fillOl(ctx, '#b87a48', 2);
      ell(ctx, 14, -33, 7, 5); fillOl(ctx, '#b87a48', 2.2);
      ell(ctx, 8, -38, 2.5, 4); fillOl(ctx, '#b87a48', 1.5);
      if (a.var) { ctx.strokeStyle = OL; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(12, -37); ctx.lineTo(10, -46); ctx.lineTo(6, -49); ctx.moveTo(10, -44); ctx.lineTo(14, -48); ctx.stroke(); ctx.strokeStyle = '#e2c79a'; ctx.lineWidth = 1.5; ctx.stroke(); }
      ctx.fillStyle = OL; circ(ctx, 15, -34, 1.4); ctx.fill(); circ(ctx, 20.5, -33, 1.6); ctx.fill();
      circ(ctx, -14, -19, 3); fillOl(ctx, '#fff', 1.5);
      break;
    }
    case 'fox': {
      const c = a.var ? '#f2f2f5' : '#ec7d2c';
      for (const [lx, s] of [[-7, 1], [5, -1]]) { rrect(ctx, lx + leg * s, -8, 3, 8, 1); fillOl(ctx, '#3a2a22', 1); }
      ctx.beginPath(); ctx.moveTo(-8, -10); ctx.quadraticCurveTo(-24, -18 + Math.sin(t * 3) * 2, -22, -4); ctx.quadraticCurveTo(-16, -4, -8, -6); fillOl(ctx, c, 2);
      ctx.beginPath(); ctx.arc(-21, -6, 3.5, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
      ell(ctx, 0, -10, 10, 6); fillOl(ctx, c, 2.2);
      poly(ctx, [6, -12, 18, -14, 12, -6]); fillOl(ctx, c, 2);
      poly(ctx, [7, -15, 9, -22, 12, -15]); fillOl(ctx, c, 1.8);
      ctx.fillStyle = '#fff'; poly(ctx, [10, -10, 18, -14, 14, -8]); ctx.fill();
      ctx.fillStyle = OL; circ(ctx, 12, -13, 1.3); ctx.fill(); circ(ctx, 18, -14, 1.3); ctx.fill();
      break;
    }
    case 'duck': {
      if (a.swim) { ell(ctx, 0, -2, 13, 4); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.stroke(); }
      else for (const lx of [-3, 3]) { ctx.strokeStyle = '#f2a23a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx, -6); ctx.lineTo(lx + leg * 0.5, 0); ctx.stroke(); }
      const c = a.var ? '#a07a52' : '#fbfbf7';
      ell(ctx, 0, -8, 10, 6); fillOl(ctx, c, 2.2);
      circ(ctx, 7, -16, 5); fillOl(ctx, a.var ? '#2e7d4f' : c, 2.2);
      poly(ctx, [11, -17, 17, -15, 11, -13]); fillOl(ctx, '#f2a23a', 1.5);
      ctx.fillStyle = OL; circ(ctx, 8, -17, 1.2); ctx.fill();
      break;
    }
    case 'sheep': {
      for (const [lx, s] of [[-6, 1], [-2, -1], [4, 1], [8, -1]]) { rrect(ctx, lx + leg * s * 0.5, -8, 3, 8, 1); ctx.fillStyle = '#333'; ctx.fill(); }
      blob(ctx, [[0, -14, 9], [-7, -12, 6], [7, -12, 6], [-4, -19, 6], [4, -19, 6]], '#fbfaf5', 2);
      ell(ctx, 11, -16, 4.5, 5.5); fillOl(ctx, '#3a3a3a', 2);
      ctx.fillStyle = '#fff'; circ(ctx, 12.5, -17, 1.2); ctx.fill();
      break;
    }
    case 'hedgehog': {
      ctx.beginPath(); ctx.arc(0, -4, 10, Math.PI, 0); ctx.closePath(); fillOl(ctx, '#7a5a3e', 2);
      ctx.strokeStyle = '#4e3826'; ctx.lineWidth = 1.5; for (let i = 0; i < 7; i++) { const aa = Math.PI + 0.3 + i * 0.4; ctx.beginPath(); ctx.moveTo(Math.cos(aa) * 6, -4 + Math.sin(aa) * 6); ctx.lineTo(Math.cos(aa) * 12, -4 + Math.sin(aa) * 12); ctx.stroke(); }
      ell(ctx, 10, -4, 5, 4); fillOl(ctx, '#e3c79e', 1.8);
      ctx.fillStyle = OL; circ(ctx, 15, -4, 1.5); ctx.fill(); circ(ctx, 10, -6, 1); ctx.fill();
      break;
    }
  }
  ctx.restore();
};

// ---------- Fahrzeuge ----------
Art.vehicle = function (ctx, v, x, y, t, rider, look, dir, moving) {
  const face = v.face || 1;
  if (v.type === 'balloon') {
    const alt = rider ? 70 + Math.sin(t * 1.5) * 4 : 0;
    shadow(ctx, x, y, rider ? 20 : 26, rider ? 6 : 7);
    const by = y - alt;
    ctx.save();
    ctx.strokeStyle = OL; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 12, by - 22); ctx.lineTo(x - 26, by - 70); ctx.moveTo(x + 12, by - 22); ctx.lineTo(x + 26, by - 70); ctx.stroke();
    if (rider) Art.person(ctx, x, by - 14, look, 0, 0, false, false, t);
    rrect(ctx, x - 14, by - 22, 28, 22, 4); fillOl(ctx, '#b07a45');
    ctx.strokeStyle = '#8d5a32'; ctx.lineWidth = 1.5; for (let i = -8; i < 14; i += 7) { ctx.beginPath(); ctx.moveTo(x + i, by - 20); ctx.lineTo(x + i, by - 2); ctx.stroke(); }
    const ey = by - 112;
    ctx.save(); ctx.beginPath(); ctx.moveTo(x - 26, ey + 42); ctx.bezierCurveTo(x - 66, ey + 10, x - 50, ey - 50, x, ey - 52); ctx.bezierCurveTo(x + 50, ey - 50, x + 66, ey + 10, x + 26, ey + 42); ctx.closePath(); ctx.clip();
    const cols = ['#ff6f61', '#ffd166', '#06d6a0', '#4ea8de'];
    for (let i = 0; i < 9; i++) { ctx.fillStyle = cols[i % 4]; ctx.fillRect(x - 63 + i * 14, ey - 60, 14, 110); }
    ctx.fillStyle = 'rgba(255,255,255,.3)'; ell(ctx, x - 22, ey - 22, 10, 18); ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(x - 26, ey + 42); ctx.bezierCurveTo(x - 66, ey + 10, x - 50, ey - 50, x, ey - 52); ctx.bezierCurveTo(x + 50, ey - 50, x + 66, ey + 10, x + 26, ey + 42); ctx.closePath(); ctx.lineWidth = 3; ctx.strokeStyle = OL; ctx.stroke();
    if (rider) Art.drawFlame(ctx, x, by - 24, t, 0.5);
    ctx.restore();
    return;
  }
  if (v.type === 'boat') {
    const bob = Math.sin(t * 2.2) * 1.5;
    ell(ctx, x, y + 2, 30, 7); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.save(); ctx.translate(x, y + bob); if (face < 0) ctx.scale(-1, 1);
    ctx.lineWidth = 4; ctx.strokeStyle = OL; ctx.beginPath(); ctx.moveTo(-2, -10); ctx.lineTo(-2, -66); ctx.stroke(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#7a4a28'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1, -62); ctx.quadraticCurveTo(28, -40, 1, -16); ctx.closePath(); fillOl(ctx, '#fbf6ea', 2.5); ctx.fillStyle = '#4ea8de'; ctx.fillRect(2, -44, 14, 5);
    ctx.restore();
    if (rider) Art.person(ctx, x - 8 * face, y - 4 + bob, look, face > 0 ? 3 : 2, 0, false, false, t);
    ctx.save(); ctx.translate(x, y + bob); if (face < 0) ctx.scale(-1, 1);
    ctx.beginPath(); ctx.moveTo(-30, -14); ctx.lineTo(30, -16); ctx.quadraticCurveTo(26, 2, 14, 4); ctx.lineTo(-20, 4); ctx.quadraticCurveTo(-30, 0, -30, -14); ctx.closePath(); fillOl(ctx, '#a8693a');
    ctx.fillStyle = '#e8c35a'; ctx.fillRect(-28, -14, 57, 3); ctx.strokeStyle = '#7a4a28'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-26, -6); ctx.lineTo(26, -8); ctx.stroke();
    ctx.restore();
    return;
  }
  // Fahrrad / Roller (Seitenansicht)
  ctx.save(); ctx.translate(x, y); if (face < 0) ctx.scale(-1, 1);
  shadow(ctx, 0, 0, 22, 4);
  const spin = t * (moving ? 18 : 0);
  if (v.type === 'bike') {
    for (const wx of [-14, 14]) { circ(ctx, wx, -9, 9); ctx.lineWidth = 3.5; ctx.strokeStyle = OL; ctx.stroke(); ctx.lineWidth = 1; for (let k = 0; k < 4; k++) { const a = spin + k * Math.PI / 4; ctx.beginPath(); ctx.moveTo(wx - Math.cos(a) * 8, -9 - Math.sin(a) * 8); ctx.lineTo(wx + Math.cos(a) * 8, -9 + Math.sin(a) * 8); ctx.stroke(); } }
    ctx.lineWidth = 5; ctx.strokeStyle = OL; ctx.beginPath(); ctx.moveTo(-14, -9); ctx.lineTo(-4, -22); ctx.lineTo(10, -22); ctx.lineTo(14, -9); ctx.moveTo(-4, -22); ctx.lineTo(0, -9); ctx.lineTo(10, -22); ctx.moveTo(10, -22); ctx.lineTo(8, -30); ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = '#e8414f'; ctx.stroke();
    rrect(ctx, -9, -27, 10, 4, 2); fillOl(ctx, '#3a3a3a', 1.5);
    ctx.lineWidth = 3; ctx.strokeStyle = OL; ctx.beginPath(); ctx.moveTo(5, -31); ctx.lineTo(12, -31); ctx.stroke();
  } else {
    for (const wx of [-14, 15]) { circ(ctx, wx, -7, 7); fillOl(ctx, '#3a3a3a', 2.5); circ(ctx, wx, -7, 2.5); ctx.fillStyle = '#ccc'; ctx.fill(); }
    ctx.beginPath(); ctx.moveTo(-22, -10); ctx.quadraticCurveTo(-22, -26, -6, -24); ctx.lineTo(4, -12); ctx.lineTo(12, -12); ctx.lineTo(14, -30); ctx.lineTo(19, -30); ctx.lineTo(20, -8); ctx.lineTo(-20, -6); ctx.closePath(); fillOl(ctx, '#7fd1c1');
    rrect(ctx, -18, -30, 14, 5, 2); fillOl(ctx, '#6b4a33', 1.8);
    circ(ctx, 21, -26, 3); fillOl(ctx, '#ffe58a', 1.5);
    ctx.lineWidth = 3; ctx.strokeStyle = OL; ctx.beginPath(); ctx.moveTo(11, -32); ctx.lineTo(20, -32); ctx.stroke();
  }
  ctx.restore();
  if (rider) {
    ctx.save(); ctx.beginPath(); ctx.rect(x - 40, y - 80, 80, 66); ctx.clip();
    Art.person(ctx, x - 3 * face, y - 16, look, face > 0 ? 3 : 2, t * 10, moving && v.type === 'bike', false, t);
    ctx.restore();
  }
};

// ---------- Item-Icons ----------
function buildIcons() {
  const I = (id, fn) => { const c = mkCanvas(64, 64), x = c.getContext('2d'); x.scale(2, 2); x.lineCap = 'round'; x.lineJoin = 'round'; fn(x); Art.icons[id] = c.toDataURL(); };
  I('wood', c => { rrect(c, 4, 10, 24, 12, 6); fillOl(c, '#a06a3a', 2); ell(c, 24, 16, 4, 6); fillOl(c, '#e0b47a', 2); });
  I('stone', c => { poly(c, [5, 24, 4, 14, 12, 6, 22, 7, 28, 16, 26, 25]); fillOl(c, '#a3a09b', 2); c.fillStyle = '#c9c6c0'; poly(c, [9, 14, 13, 9, 21, 10, 18, 15]); c.fill(); });
  I('fiber', c => { c.lineWidth = 4; c.strokeStyle = OL; for (const d of [-6, 0, 6]) { c.beginPath(); c.moveTo(16, 28); c.quadraticCurveTo(16 + d, 16, 16 + d * 2, 4); c.stroke(); } c.lineWidth = 2; c.strokeStyle = '#a5d65a'; for (const d of [-6, 0, 6]) { c.beginPath(); c.moveTo(16, 28); c.quadraticCurveTo(16 + d, 16, 16 + d * 2, 4); c.stroke(); } });
  I('berries', c => { for (const [x, y] of [[11, 18], [21, 18], [16, 10], [16, 23]]) { circ(c, x, y, 6); fillOl(c, '#6a5acd', 2); c.fillStyle = 'rgba(255,255,255,.6)'; circ(c, x - 2, y - 2, 1.5); c.fill(); } c.fillStyle = '#4ea24a'; ell(c, 20, 5, 5, 2.5); c.fill(); });
  I('flower', c => { c.strokeStyle = '#3f8a3a'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(16, 16); c.lineTo(16, 30); c.stroke(); for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; circ(c, 16 + Math.cos(a) * 6, 12 + Math.sin(a) * 6, 5); fillOl(c, '#ff6f91', 1.5); } circ(c, 16, 12, 4); fillOl(c, '#ffd84a', 1.5); });
  I('shell', c => { c.beginPath(); c.moveTo(16, 26); c.arc(16, 20, 12, Math.PI * 1.05, Math.PI * 1.95); c.closePath(); fillOl(c, '#f7b6c2', 2); });
  I('metal', c => { poly(c, [4, 24, 8, 10, 20, 8, 18, 24]); fillOl(c, '#8a8f99', 2); poly(c, [16, 28, 22, 14, 30, 18, 28, 28]); fillOl(c, '#b0623a', 2); });
  I('planks', c => { for (const y of [6, 14, 22]) { rrect(c, 3, y, 26, 6, 2); fillOl(c, '#c8935e', 2); } });
  I('rope', c => { circ(c, 16, 16, 11); c.lineWidth = 7; c.strokeStyle = OL; c.stroke(); c.lineWidth = 4; c.strokeStyle = '#d9b36c'; c.stroke(); circ(c, 16, 16, 5); c.lineWidth = 5; c.strokeStyle = OL; c.stroke(); c.lineWidth = 2.5; c.strokeStyle = '#d9b36c'; c.stroke(); });
  I('iron', c => { poly(c, [3, 24, 8, 12, 24, 12, 29, 24]); fillOl(c, '#b8c0cc', 2); c.fillStyle = '#e6ebf2'; poly(c, [9, 14, 23, 14, 25, 18, 7, 18]); c.fill(); });
  I('bread', c => { ell(c, 16, 18, 13, 9); fillOl(c, '#d9973f', 2); c.strokeStyle = '#a8692a'; c.lineWidth = 2; for (const x of [10, 16, 22]) { c.beginPath(); c.moveTo(x - 2, 13); c.lineTo(x + 2, 20); c.stroke(); } });
  I('crystal', c => { poly(c, [10, 28, 10, 12, 16, 3, 22, 12, 22, 28]); fillOl(c, '#7ae6f2', 2); c.fillStyle = '#d8fbff'; poly(c, [12, 26, 12, 13, 15, 7, 15, 26]); c.fill(); });
  I('axe', c => { c.save(); c.translate(16, 16); c.rotate(0.6); rrect(c, -2, -13, 4, 26, 1); fillOl(c, '#8d5a32', 2); poly(c, [0, -13, 11, -15, 11, -3, 0, -5]); fillOl(c, '#a7adb6', 2); c.restore(); });
  I('pick', c => { c.save(); c.translate(16, 16); c.rotate(0.6); rrect(c, -2, -11, 4, 25, 1); fillOl(c, '#8d5a32', 2); c.beginPath(); c.moveTo(-13, -6); c.quadraticCurveTo(0, -18, 13, -6); c.lineTo(10, -4); c.quadraticCurveTo(0, -12, -10, -4); c.closePath(); fillOl(c, '#a7adb6', 2); c.restore(); });
}

Art.init = function () {
  const P = [['#4caf50', '#6cc75a'], ['#3e9d4a', '#58b85a'], ['#5cb85c', '#80d06a']];
  P.forEach((p, i) => Art.make('oak' + i, 72, 96, 36, 90, c => drawOak(c, p, i === 2 ? '#e8414f' : null)));
  Art.make('pine0', 64, 96, 32, 92, c => drawPine(c, '#2e7d4f', '#3d9a60'));
  Art.make('pine1', 64, 96, 32, 92, c => drawPine(c, '#357f58', '#46a06a'));
  Art.make('snowpine0', 64, 96, 32, 92, c => drawPine(c, '#2e6d58', '#3d8a6c', true));
  Art.make('birch0', 64, 96, 32, 92, c => drawBirch(c));
  Art.make('palm0', 84, 96, 34, 92, c => drawPalm(c));
  Art.make('stump', 48, 36, 24, 30, c => drawStump(c));
  Art.make('rock0', 52, 44, 26, 38, c => drawRock(c));
  Art.make('rock1', 52, 44, 26, 38, c => drawRock(c, false, true));
  Art.make('ore0', 52, 44, 26, 38, c => drawRock(c, true));
  Art.make('crystal0', 44, 44, 22, 40, c => drawCrystal(c));
  Art.make('bush0', 44, 38, 22, 32, c => drawBush(c, '#e8414f'));
  Art.make('bush1', 44, 38, 22, 32, c => drawBush(c, '#6a5acd'));
  Art.make('bush_e', 44, 38, 22, 32, c => drawBush(c, null));
  Art.make('fiber0', 40, 36, 20, 32, c => drawTuft(c, '#a5d65a'));
  Art.make('stick0', 40, 34, 20, 26, c => drawStick(c));
  Art.make('pebble0', 40, 34, 20, 28, c => drawPebbles(c));
  Art.make('shell0', 36, 34, 18, 28, c => drawShell(c));
  Art.make('scrap0', 44, 36, 22, 30, c => drawScrap(c));
  Art.make('flowers0', 40, 40, 20, 36, c => drawFlowers(c, ['#ff6f91', '#ffd84a', '#ffffff']));
  Art.make('flowers1', 40, 40, 20, 36, c => drawFlowers(c, ['#b388ff', '#6fc3ff', '#ff9a4a']));
  buildSprites();
  buildIcons();
};
