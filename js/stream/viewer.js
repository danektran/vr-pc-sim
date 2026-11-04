// Divák: stránka ?divak=KÓD jen sleduje přenos z brýlí. Nic neovládá, nic neodesílá, nespouští herní logiku.
// Kamera je buď „očima hráče“ (plynule sleduje hlavu hráče), nebo volná (otáčení jako dnes, dotykem se i přibližuje).
// Veškerá práce se sítí je v try/catch.
import { $, T } from '../helpers.js';
import { PARAMS, RELAY_URL, VIEWER } from '../config.js';
import { H, fill } from '../content.js';
import { camera, canvas, scene } from '../scene.js';
import { desk, updateOrbit } from '../interaction.js';
import { decode, normalizeCode } from './protocol.js';
import { applyState, stepTargets, targets } from './snapshot.js';
import { makePlayerAvatar } from './player-avatar.js';

const BACKOFF = [1000, 2000, 4000, 8000, 15000];
const EYES_FOV = 80;               // zorné pole jako u Questu
const HEAD_RATE = 6;               // rychlost vyhlazení hlavy (1/s)
const HAND_RATE = 15;              // ovladače sledují cíl rychleji
const FREE_FOV = camera.fov;
const MEASURE = PARAMS.get('ladeni') === 'ano';

let viewMode = 'eyes';
let code = '', ws = null, retry = 0, retryTimer = 0, everPlayer = false;
let avatar = null;

/* ---------- vyhlazená poloha hlavy a ovladačů ---------- */
const head = {init: false, pos: new T.Vector3(), quat: new T.Quaternion()};
const hand = [0, 1].map(() => ({init: false, pos: new T.Vector3(), quat: new T.Quaternion(), ray: 0, arr: [0, 0, 0, 0, 0, 0, 1, 0]}));
const headArr = [0, 0, 0, 0, 0, 0, 1];
const _tp = new T.Vector3(), _tq = new T.Quaternion();

function follow(s, a, k){
  _tp.set(a[0], a[1], a[2]); _tq.set(a[3], a[4], a[5], a[6]).normalize();
  if(!s.init){ s.pos.copy(_tp); s.quat.copy(_tq); s.init = true; }
  else { s.pos.lerp(_tp, k); s.quat.slerp(_tq, k); }
}
function packInto(s, out){
  out[0] = s.pos.x; out[1] = s.pos.y; out[2] = s.pos.z; out[3] = s.quat.x; out[4] = s.quat.y; out[5] = s.quat.z; out[6] = s.quat.w;
  return out;
}

/* ---------- stav v liště ---------- */
function setStatus(key){
  const el = $('viewerStatus'); if(!el) return;
  el.textContent = fill(H.divak[key], {kod: code});
  el.dataset.state = key;
}

/* ---------- výsledky (HTML karta z brýlí) ---------- */
function showResults(res){
  const card = $('results');
  if(!res){ card.hidden = true; return; }
  $('resCode').textContent = res.code;
  const tb = $('resTable'); tb.textContent = '';
  for(const [a, b] of res.rows){
    const tr = document.createElement('tr'), t1 = document.createElement('td'), t2 = document.createElement('td');
    t1.textContent = a; t2.textContent = b; tr.append(t1, t2); tb.append(tr);
  }
  $('btnSave').hidden = true; $('btnCopy').hidden = true; $('saveNote').textContent = ''; $('csvBox').hidden = true;
  card.hidden = false;
}

/* ---------- spojení ---------- */
function onMessage(e){
  const raw = String(e.data);
  if(MEASURE) window.__streamBytes = (window.__streamBytes || 0) + raw.length;
  const m = decode(raw); if(!m) return;
  if(m.t === 'player'){
    if(m.on){ everPlayer = true; setStatus('pripojeno'); }
    else setStatus(everPlayer ? 'hrac_odesel' : 'ceka');
  } else if(m.t === 's' && m.d && typeof m.d === 'object'){
    everPlayer = true;
    const el = $('viewerStatus'); if(el && el.dataset.state !== 'pripojeno') setStatus('pripojeno');
    applyState(m.d);
    if('res' in m.d) showResults(m.d.res);
  }
}
function scheduleReconnect(){
  clearTimeout(retryTimer);
  const delay = BACKOFF[Math.min(retry, BACKOFF.length - 1)]; retry++;
  retryTimer = setTimeout(connect, delay);
}
function connect(){
  try {
    ws = new WebSocket(`${RELAY_URL}/room/${code}?role=divak`);
    const mine = ws;
    ws.onopen = ()=>{ retry = 0; setStatus('ceka'); };
    ws.onmessage = (e)=>{
      try { onMessage(e); } catch(err){ console.info('divák: zpráva', err); }
    };
    ws.onclose = (e)=>{
      if(ws !== mine) return;
      ws = null;
      if(e && e.code === 4001){ setStatus('plno'); return; }   // plno: znovu se nepřipojujeme
      setStatus('preruseno'); scheduleReconnect();
    };
    ws.onerror = ()=>{};
  } catch(err){
    console.info('divák: spojení', err); ws = null; setStatus('preruseno'); scheduleReconnect();
  }
}

/* ---------- pohled ---------- */
function setViewMode(mode){
  viewMode = mode;
  $('btnEyes').classList.toggle('active', mode === 'eyes'); $('btnEyes').setAttribute('aria-pressed', String(mode === 'eyes'));
  $('btnFree').classList.toggle('active', mode === 'free'); $('btnFree').setAttribute('aria-pressed', String(mode === 'free'));
  if(avatar) avatar.hideHead = mode === 'eyes';
  if(mode === 'free'){ camera.fov = FREE_FOV; camera.updateProjectionMatrix(); updateOrbit(); }
  else { camera.fov = EYES_FOV; camera.updateProjectionMatrix(); }
}

function tickViewer(dt){
  if(!VIEWER) return;
  stepTargets(dt);
  const kh = 1 - Math.exp(-dt * HEAD_RATE), kc = 1 - Math.exp(-dt * HAND_RATE);
  if(targets.head) follow(head, targets.head, kh);
  const c = [targets.c0, targets.c1];
  for(let i = 0; i < 2; i++){
    const s = hand[i], a = c[i];
    if(!a){ s.init = false; continue; }
    follow(s, a, kc); s.ray = a[7] || 0;
  }
  if(avatar){
    const h = head.init ? packInto(head, headArr) : null;
    const pose = (i) => { const s = hand[i]; if(!s.init) return null; packInto(s, s.arr); s.arr[7] = s.ray; return s.arr; };
    avatar.setPose(h, pose(0), pose(1));
  }
  if(viewMode === 'eyes' && head.init){
    camera.position.copy(head.pos); camera.quaternion.copy(head.quat);
  }
}

/* ---------- dotyk: dva prsty = přiblížení, během gesta se neotáčí ---------- */
const touches = new Map();
let pinchDist = 0;
function pinchSpan(){ const [a, b] = Array.from(touches.values()); return Math.hypot(a.x - b.x, a.y - b.y); }
function initTouch(){
  canvas.addEventListener('pointerdown', (e)=>{
    if(e.pointerType !== 'touch') return;
    touches.set(e.pointerId, {x: e.clientX, y: e.clientY});
    if(touches.size === 2){ desk.orbit = null; pinchDist = pinchSpan(); }
  });
  canvas.addEventListener('pointermove', (e)=>{
    const t = touches.get(e.pointerId); if(!t) return;
    t.x = e.clientX; t.y = e.clientY;
    if(touches.size === 2){
      desk.orbit = null;
      const d = pinchSpan();
      if(pinchDist > 0 && d > 0){
        desk.radius = Math.max(0.4, Math.min(1.9, desk.radius * pinchDist / d));
        if(viewMode === 'free') updateOrbit();
      }
      pinchDist = d;
    }
  });
  const end = (e)=>{ touches.delete(e.pointerId); if(touches.size < 2) pinchDist = 0; if(touches.size > 0) desk.orbit = null; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
}

/* ---------- start ---------- */
function begin(c){
  code = c; everPlayer = false;
  $('viewerOverlay').hidden = true; $('viewerBar').hidden = false;
  setStatus('ceka');
  try {
    const u = new URL(location.href); u.searchParams.set('divak', c);
    history.replaceState(null, '', u);
  } catch(err){}
  if(!RELAY_URL){ setStatus('preruseno'); return; }
  connect();
}

function startViewer(){
  if(!VIEWER) return;
  try {
    $('overlay').hidden = true; $('hud').hidden = true;
    avatar = makePlayerAvatar(); scene.add(avatar.group);
    $('btnEyes').onclick = ()=>setViewMode('eyes');
    $('btnFree').onclick = ()=>setViewMode('free');
    initTouch();
    setViewMode('eyes');
    const watch = ()=>{
      const c = normalizeCode($('viewerCode').value);
      if(!c){ $('viewerNote').textContent = H.divak.spatny_kod; $('viewerNote').className = 'note warn'; return; }
      begin(c);
    };
    $('btnWatch').onclick = watch;
    $('viewerCode').onkeydown = (e)=>{ if(e.key === 'Enter') watch(); };
    const c = normalizeCode(PARAMS.get('divak') || '');
    if(c) begin(c);
    else {
      $('viewerOverlay').hidden = false;
      if(PARAMS.get('divak')){ $('viewerCode').value = PARAMS.get('divak'); $('viewerNote').textContent = H.divak.spatny_kod; $('viewerNote').className = 'note warn'; }
      $('viewerCode').focus();
    }
  } catch(err){ console.info('divák: start', err); }
}

export { viewMode, startViewer, tickViewer };
