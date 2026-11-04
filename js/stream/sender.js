// Přenos pro diváka: odesílání stavu z brýlí (hráč) přes prostředníka. Zapíná se jen adresou ?prenos=ano.
// Veškerá práce se sítí je v try/catch: výpadek prostředníka nesmí zastavit smyčku ani vyhodit chybu.
import { canvasTex, FONT, makeCanvas, roundRect, T, $ } from '../helpers.js';
import { PARAMS, RELAY_URL, VIEWER } from '../config.js';
import { H, fill } from '../content.js';
import { panel, PH, PW } from '../ui-panel.js';
import { FULL_EVERY_MS, SEND_HZ, decode, diffStateJson, encode, makeStreamCode, MAX_MSG_BYTES } from './protocol.js';
import { captureState } from './snapshot.js';

const STREAM_ON = PARAMS.get('prenos') === 'ano' && !!RELAY_URL && !VIEWER;
const MAX_BUFFERED = 64000;     // B, když má socket víc nevyřízeného, snímek vynecháme
const BACKOFF = [1000, 2000, 4000, 8000, 15000];

let streamCode = '';
let ws = null, viewers = 0, ever = false, needFull = true, seq = 0;
let lastJson = null, lastTickAt = -1e9, lastFullAt = -1e9, retry = 0, retryTimer = 0;
let labelMesh = null, labelState = '';

function viewerEver(){ return ever; }

/* ---------- štítek nad panelem ---------- */
function drawLabel(state){
  if(!labelMesh || state === labelState) return;
  labelState = state;
  const c = labelMesh.userData.canvas, x = c.getContext('2d');
  const text = fill(state === 'pripojen' ? H.prenos.stitek_pripojen : H.prenos.stitek_ceka, {kod: streamCode});
  x.clearRect(0, 0, 512, 96);
  roundRect(x, 4, 4, 504, 88, 20); x.fillStyle = 'rgba(24,34,46,.92)'; x.fill();
  x.strokeStyle = state === 'pripojen' ? '#58c97a' : '#f2c230'; x.lineWidth = 4; x.stroke();
  x.fillStyle = '#eef2f5'; let fs = 44; x.font = `700 ${fs}px ${FONT}`;
  while(x.measureText(text).width > 480 && fs > 20){ fs -= 2; x.font = `700 ${fs}px ${FONT}`; }
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 256, 50);
  labelMesh.material.map.needsUpdate = true;
}
function makeLabelMesh(){
  const c = makeCanvas(512, 96), w = 0.24;
  const m = new T.Mesh(new T.PlaneGeometry(w, w * 96 / 512), new T.MeshBasicMaterial({map: canvasTex(c), transparent: true}));
  m.userData.canvas = c;
  m.position.set(PW / 2 - 0.1, PH / 2 + 0.03, 0.004);
  panel.group.add(m);
  labelMesh = m;
}

/* ---------- spojení ---------- */
function setViewers(n){
  viewers = n; if(n > 0) ever = true;
  drawLabel(n > 0 ? 'pripojen' : 'ceka');
}
function scheduleReconnect(){
  clearTimeout(retryTimer);
  const delay = BACKOFF[Math.min(retry, BACKOFF.length - 1)]; retry++;
  retryTimer = setTimeout(connect, delay);
}
function connect(){
  try {
    ws = new WebSocket(`${RELAY_URL}/room/${streamCode}?role=hrac`);
    const mine = ws;
    ws.onopen = ()=>{ retry = 0; needFull = true; };
    ws.onmessage = (e)=>{
      try {
        const m = decode(String(e.data)); if(!m) return;
        if(m.t === 'viewers') setViewers(Number(m.n) || 0);
        else if(m.t === 'need_full') needFull = true;
      } catch(err){ console.info('přenos: zpráva', err); }
    };
    ws.onclose = ()=>{ if(ws === mine){ ws = null; setViewers(0); scheduleReconnect(); } };
    ws.onerror = ()=>{};
  } catch(err){
    console.info('přenos: spojení', err); ws = null; scheduleReconnect();
  }
}

function startSender(){
  if(!STREAM_ON) return;
  try {
    streamCode = makeStreamCode();
    const n = $('streamNote');
    if(n){ n.textContent = fill(H.prenos.uvod, {kod: streamCode}); n.hidden = false; }
    makeLabelMesh(); drawLabel('ceka');
    connect();
  } catch(err){ console.info('přenos: start', err); }
}

/* ---------- smyčka ---------- */
// Samotné odeslání (předání řetězce prohlížeči) se dělá mimo vykreslovací smyčku, ve vlastní úloze hned po snímku.
function deferSend(sock, text){
  setTimeout(()=>{
    try { if(sock === ws && sock.readyState === 1) sock.send(text); } catch(err){ console.info('přenos: odesílání', err); }
  }, 0);
}
function tickSender(nowMs){
  if(!STREAM_ON || viewers <= 0 || !ws || ws.readyState !== 1) return;
  if(nowMs - lastTickAt < 1000 / SEND_HZ - 1) return;
  try {
    if(ws.bufferedAmount >= MAX_BUFFERED) return;
    lastTickAt = nowMs;
    const cur = captureState();
    const full = needFull || !lastJson || nowMs - lastFullAt >= FULL_EVERY_MS;
    const r = diffStateJson(full ? null : lastJson, cur);   // řetězce předchozího stavu se drží, nestringifikují se znovu
    const d = r.d;
    if(!full && !Object.keys(d).length) return;
    const text = encode({t: 's', full: full ? 1 : 0, seq: ++seq, d});
    if(text.length > MAX_MSG_BYTES) console.info('přenos: zpráva je příliš velká', text.length);
    deferSend(ws, text);
    lastJson = r.json;
    if(full){ lastFullAt = nowMs; needFull = false; }
  } catch(err){ console.info('přenos: odesílání', err); }
}

export { STREAM_ON, streamCode, viewerEver, startSender, tickSender };
