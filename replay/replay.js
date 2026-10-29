
/* ---------- WATCH REPLAYS ----------
   Every Watch match is recorded two ways while it plays:
   - a frame buffer (one small JPEG per frame at 30 fps) that the in-game replay viewer scrubs: play / pause,
     step one frame back or forward, slow motion, jump anywhere on the bar;
   - a video file (MediaRecorder on the canvas, with the game sound) that SAVE CLIP hands to the phone or PC
     (mp4 where the browser can make one, otherwise webm).
   The end-of-match screen gets REPLAY and SAVE CLIP next to REMATCH and CHOOSE. */
const RP = { frames: [], recording: false, tick: 0, rec: null, chunks: [], blob: null, mime: '', ext: 'webm', name: '',
  pos: 0, playing: false, speed: 1, shown: -1, img: null, decoding: false, msg: null, msgT: 0, sc: null, sx: null };
const RP_FPS = 30, RP_MAX = RP_FPS * 150, RP_W = 640, RP_H = 360;
function rpMime() {
  if (typeof MediaRecorder === 'undefined' || !cv.captureStream) return null;
  for (const [m, ext] of [['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'mp4'], ['video/mp4', 'mp4'], ['video/webm;codecs=vp9,opus', 'webm'], ['video/webm;codecs=vp8,opus', 'webm'], ['video/webm', 'webm']])
    try { if (MediaRecorder.isTypeSupported(m)) return [m, ext]; } catch (e) {}
  return null;
}
function rpStart() {
  rpStop(true);
  RP.frames = []; RP.tick = 0; RP.lastT = -1; RP.blob = null; RP.chunks = []; RP.recording = true; RP.pos = 0; RP.shown = -1; RP.img = null;
  if (!RP.sc) { RP.sc = document.createElement('canvas'); RP.sc.width = RP_W; RP.sc.height = RP_H; RP.sx = RP.sc.getContext('2d'); }
  const mm = rpMime(); if (!mm) { RP.rec = null; return; }
  try {
    const stream = cv.captureStream(RP_FPS);
    if (audio.ac && audio.ac.createMediaStreamDestination) {
      if (!audio.recDest) { audio.recDest = audio.ac.createMediaStreamDestination(); audio.out().connect(audio.recDest); }
      const tr = audio.recDest.stream.getAudioTracks()[0]; if (tr) stream.addTrack(tr);
    }
    RP.mime = mm[0]; RP.ext = mm[1];
    const rec = new MediaRecorder(stream, { mimeType: RP.mime, videoBitsPerSecond: 4e6 });
    rec.ondataavailable = ev => { if (ev.data && ev.data.size) RP.chunks.push(ev.data); };
    rec.onstop = () => { if (RP.rec === rec && !rec.discard) RP.blob = new Blob(RP.chunks, { type: RP.mime.split(';')[0] }); };
    rec.start(1000); RP.rec = rec;
  } catch (e) { RP.rec = null; }
}
function rpStop(discard) {
  RP.recording = false;
  const r = RP.rec; if (!r) return;
  if (discard) { r.discard = true; RP.rec = null; }
  try { if (r.state !== 'inactive') r.stop(); } catch (e) {}
}
// one small JPEG per 1/30 s of game time
function rpCapture() {
  if (game.t - RP.lastT < 1 / RP_FPS - .002) return;   // by game time, so a 120 Hz screen doesn't record double speed
  RP.lastT = game.t;
  RP.sx.drawImage(cv, 0, 0, RP_W, RP_H);
  const i = RP.frames.length; RP.frames.push(null);
  RP.sc.toBlob(b => { RP.frames[i] = b; }, 'image/jpeg', .72);
  if (RP.frames.length > RP_MAX) { RP.frames.splice(0, RP_FPS); }   // keep the last two and a half minutes
}
function rpMsg(t) { RP.msg = t; RP.msgT = 2; }

// ---------- the viewer ----------
function rpOpen() {
  const n = RP.frames.filter(Boolean).length; if (!n) { rpMsg('NOTHING RECORDED'); return; }
  RP.pos = 0; RP.playing = true; RP.speed = 1; RP.shown = -1; game.mode = 'replay'; audio.thump(600, .04, .12);
}
function rpClose() { game.mode = 'watchend'; RP.img = null; RP.shown = -1; }
const rpLast = () => { let n = RP.frames.length - 1; while (n > 0 && !RP.frames[n]) n--; return Math.max(0, n); };
function rpStep(d) { RP.playing = false; RP.pos = Math.max(0, Math.min(rpLast(), Math.round(RP.pos) + d)); }
function rpTick(dt) {
  if (RP.msgT > 0) RP.msgT -= dt;
  if (RP.playing) { RP.pos += dt * RP_FPS * RP.speed; if (RP.pos >= rpLast()) { RP.pos = rpLast(); RP.playing = false; } }
  const i = Math.floor(RP.pos);
  if (i !== RP.shown && !RP.decoding && RP.frames[i]) {
    RP.decoding = true;
    createImageBitmap(RP.frames[i]).then(bm => { if (RP.img && RP.img.close) RP.img.close(); RP.img = bm; RP.shown = i; RP.decoding = false; }, () => { RP.decoding = false; RP.shown = i; });
  }
}
const RP_BAR = { x: 300, y: H - 52, w: W - 300 - 196, h: 30 };
const RP_B = {
  back: { x: 14, y: H - 56, w: 58, h: 38 }, play: { x: 78, y: H - 56, w: 70, h: 38 }, fwd: { x: 154, y: H - 56, w: 58, h: 38 },
  speed: { x: 218, y: H - 56, w: 70, h: 38 }, save: { x: W - 186, y: H - 56, w: 96, h: 38 }, exit: { x: W - 84, y: H - 56, w: 70, h: 38 },
};
function rpDraw() {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (RP.img) ctx.drawImage(RP.img, 0, 0, W, H);
  ctx.fillStyle = 'rgba(15,10,30,.82)'; ctx.fillRect(0, H - 66, W, 66);
  const last = rpLast(), i = Math.floor(RP.pos);
  btn(RP_B.back, '◀ 1', '#a99cc8'); btn(RP_B.play, RP.playing ? '❚❚' : '▶', '#ffd36b', true); btn(RP_B.fwd, '1 ▶', '#a99cc8');
  btn(RP_B.speed, RP.speed + 'x', '#7cf0b0');
  if (RP.blob || RP.rec) btn(RP_B.save, 'SAVE CLIP', '#ff8fb0'); btn(RP_B.exit, 'EXIT', '#a99cc8');
  const b = RP_BAR, q = last ? i / last : 0;
  ctx.fillStyle = '#2b1f52'; ctx.fillRect(b.x, b.y + 11, b.w, 8);
  ctx.fillStyle = '#ffd36b'; ctx.fillRect(b.x, b.y + 11, b.w * q, 8);
  ctx.beginPath(); ctx.arc(b.x + b.w * q, b.y + 15, 8, 0, 7); ctx.fill();
  ctx.textAlign = 'left'; ctx.font = '700 12px Silkscreen, monospace'; ctx.fillStyle = 'rgba(246,236,216,.92)';
  ctx.fillText(`REPLAY  ${(i / RP_FPS).toFixed(2)}s  FRAME ${i + 1}/${last + 1}`, 14, 22);
  ctx.textAlign = 'right'; ctx.font = '700 10px Silkscreen, monospace'; ctx.fillStyle = 'rgba(246,236,216,.7)';
  ctx.fillText('← → ONE FRAME · SHIFT = 10 · SPACE PLAY · ↑↓ SPEED · S SAVE · ESC BACK', W - 14, 22);
  if (RP.msgT > 0) { ctx.textAlign = 'center'; ctx.font = '18px Bungee, Impact, sans-serif'; ctx.fillStyle = '#ffd36b'; ctx.fillText(RP.msg, W / 2, H / 2); }
}
const RP_SPEEDS = [1, .5, .25];
function rpPointer(p) {
  if (inBox(p, RP_B.back)) rpStep(-1);
  else if (inBox(p, RP_B.fwd)) rpStep(1);
  else if (inBox(p, RP_B.play)) { if (!RP.playing && RP.pos >= rpLast()) RP.pos = 0; RP.playing = !RP.playing; }
  else if (inBox(p, RP_B.speed)) RP.speed = RP_SPEEDS[(RP_SPEEDS.indexOf(RP.speed) + 1) % RP_SPEEDS.length];
  else if (inBox(p, RP_B.save)) rpSave();
  else if (inBox(p, RP_B.exit)) rpClose();
  else if (p.x >= RP_BAR.x - 10 && p.x <= RP_BAR.x + RP_BAR.w + 10 && p.y >= RP_BAR.y - 6 && p.y <= RP_BAR.y + RP_BAR.h + 6) {
    RP.playing = false; RP.pos = Math.round(Math.max(0, Math.min(1, (p.x - RP_BAR.x) / RP_BAR.w)) * rpLast());
  }
  else { RP.playing = !RP.playing; }   // tap the picture: play / pause
}
function rpKey(e) {
  const k = e.key, n = e.shiftKey ? 10 : 1;
  if (k === 'ArrowLeft' || k === 'a' || k === 'A' || k === ',') rpStep(-n);
  else if (k === 'ArrowRight' || k === 'd' || k === 'D' || k === '.') rpStep(n);
  else if (k === ' ' || k === 'j' || k === 'J' || k === 'Enter') { if (!e.repeat) { if (!RP.playing && RP.pos >= rpLast()) RP.pos = 0; RP.playing = !RP.playing; } }
  else if (k === 'ArrowUp' || k === 'w' || k === 'W') RP.speed = RP_SPEEDS[Math.max(0, RP_SPEEDS.indexOf(RP.speed) - 1)];
  else if (k === 'ArrowDown') RP.speed = RP_SPEEDS[Math.min(RP_SPEEDS.length - 1, RP_SPEEDS.indexOf(RP.speed) + 1)];
  else if (k === 's' || k === 'S') { if (!e.repeat) rpSave(); }
  else if (k === 'Escape' || k === 'Backspace' || k === 'r' || k === 'R') rpClose();
  else if (k === 't' || k === 'T') return false;
  e.preventDefault(); return true;
}
// ---------- saving: the claude.ai downloads capability when the page runs there, a plain download elsewhere ----------
async function rpSave() {
  if (!RP.blob) {
    if (RP.rec && RP.rec.state !== 'inactive') { rpMsg('STILL RECORDING...'); return; }
    if (!RP.rec) { rpMsg(rpMime() ? 'NO CLIP RECORDED' : 'THIS BROWSER CAN\'T SAVE VIDEO'); return; }
    rpMsg('FINISHING THE CLIP...'); setTimeout(() => { if (RP.blob) rpSave(); }, 700); return;
  }
  const stamp = new Date(), pad = v => String(v).padStart(2, '0');
  const fn = `iron-beach-${(RP.name || 'watch').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)}-${stamp.getFullYear()}${pad(stamp.getMonth() + 1)}${pad(stamp.getDate())}-${pad(stamp.getHours())}${pad(stamp.getMinutes())}.${RP.ext}`;
  try {
    if (window.claude && typeof window.claude.use === 'function') {
      const dl = await window.claude.use('downloads');
      if (dl) {
        try { await dl.save({ filename: fn, data: RP.blob }); rpMsg('CLIP SAVED'); }
        catch (err) { rpMsg(err && err.code === 'declined' ? 'SAVE CANCELLED' : err && err.code === 'rate_limited' ? 'ONE MOMENT...' : 'COULDN\'T SAVE THE CLIP'); }
        return;
      }
    }
  } catch (e) {}
  const a = document.createElement('a'); a.href = URL.createObjectURL(RP.blob); a.download = fn; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); rpMsg('CLIP SAVED');
}

// ---------- hooks into the game ----------
const WATCH_RP = { replay: { x: W / 2 - 230, y: 212, w: 210, h: 40 }, save: { x: W / 2 + 20, y: 212, w: 210, h: 40 } };
{
  const _startWatch = startWatch;
  startWatch = function () { _startWatch.apply(this, arguments); if (game.watch) { RP.name = (game.watch.teams || []).map(t => t.map(i => rosterName(ROSTER[i])).join('+')).join('-vs-'); rpStart(); } };
  const _update = update;
  update = function (dt) { if (game.mode === 'replay') { game.t += dt; rpTick(dt); return; } if (RP.msgT > 0) RP.msgT -= dt; return _update(dt); };
  const _render = render;
  render = function () {
    if (game.mode === 'replay') { rpDraw(); return; }
    _render();
    if (RP.recording) {
      if (!game.watch || (game.mode !== 'play' && game.mode !== 'pause')) rpStop(!game.watch || game.mode === 'select' || game.mode === 'title');
      else if (game.mode === 'play') { rpCapture(); if (RP.rec && RP.rec.state === 'paused') try { RP.rec.resume(); } catch (e) {} }
      else if (RP.rec && RP.rec.state === 'recording') try { RP.rec.pause(); } catch (e) {}
    }
    if (game.mode === 'watchend') {
      btn(WATCH_RP.replay, 'REPLAY', '#7cf0b0'); if (rpMime()) btn(WATCH_RP.save, 'SAVE CLIP', '#ff8fb0');
      ctx.textAlign = 'center'; ctx.font = '700 10px Silkscreen, monospace'; ctx.fillStyle = 'rgba(246,236,216,.75)'; ctx.fillText('R REPLAY · S SAVE CLIP', W / 2, 270);
      if (RP.msgT > 0) { ctx.font = '16px Bungee, Impact, sans-serif'; ctx.fillStyle = '#ffd36b'; ctx.fillText(RP.msg, W / 2, 296); }
    }
  };
  const _vp = versusPointer;
  versusPointer = function (p) {
    if (game.mode === 'replay') { rpPointer(p); return true; }
    if (game.mode === 'watchend') { if (inBox(p, WATCH_RP.replay)) { rpOpen(); return true; } if (inBox(p, WATCH_RP.save) && rpMime()) { rpSave(); return true; } }
    return _vp(p);
  };
  const _vk = versusKey;
  versusKey = function (e) {
    if (game.mode === 'replay') return rpKey(e) || _vk(e);
    if (game.mode === 'watchend' && !e.repeat) { if (e.key === 'r' || e.key === 'R') { rpOpen(); e.preventDefault(); return true; } if (e.key === 's' || e.key === 'S') { rpSave(); e.preventDefault(); return true; } }
    return _vk(e);
  };
}
