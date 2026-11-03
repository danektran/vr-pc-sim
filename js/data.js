// Výzkumná data: výsledky sezení (názvy sloupců neměnit!), CSV a odesílání do Google tabulky.
import { DATA_ENDPOINT, DATA_KEY, PARAMS } from './config.js';
import { GAME, PERF, S } from './state.js';
import { SEATED, xrMode } from './xr.js';
import { QUIZ } from './content.js';
import { SOUND_ON } from './feedback.js';

function gameFields(){
  const H=GAME.history, n=H.length;
  return {hra_dny:n?GAME.daysPlayed:'', hra_pokladna:n?GAME.cash:'', hra_reputace:n?(H.reduce((a,r)=>a+r.stars,0)/n).toFixed(2):'',
    hra_diagnozy_napoprve:n?H.filter(r=>r.firstTry).length+'/'+n:'', hra_zbytecne_vymeny:n?H.reduce((a,r)=>a+r.unnecessary,0):'',
    hra_zakazky:H.map(r=>[r.day,r.fault,r.stars+'h',r.attempts+'d',r.unnecessary+'z',r.secs+'s'].join('/')).join(' ')};
}


let sentUpTo = 0, sentAny = false;
// Nový začátek sezení: další odeslání pošle log zase od začátku.
function resetSending(){ sentUpTo = 0; sentAny = false; }
function participant(){ const c=document.getElementById('pcode'), k=document.getElementById('consent'); return {kod:(c&&c.value||'').trim().toUpperCase().slice(0,40), souhlas:!!(k&&k.checked)}; }
function sendData(udalost){
  if(!DATA_ENDPOINT) return false;
  const pc = participant(); if(!pc.souhlas) return false;
  const souhrn = Object.assign({kod_sezeni:S.code, kod_ucastnika:pc.kod, skupina:PARAMS.get('skupina')||'', udalost,
    rezim: xrMode==='immersive-vr'?'vr' : xrMode==='immersive-ar'?'smisena_realita' : 'pocitac', napoveda_pri_odeslani:S.hints?'ano':'ne', zvuk:SOUND_ON?'ano':'ne', michani_odpovedi:PARAMS.get('michat')==='ne'?'ne':'ano', vsede:SEATED?'ano':'ne',
    fps_vr: PERF.time>1 ? Math.round(PERF.frames/PERF.time) : '', pomale_snimky_vr_pct: PERF.frames ? Math.round(100*PERF.slow/PERF.frames) : '',
    zarizeni:navigator.userAgent.slice(0,150)}, resultData());
  const ev = S.log.slice(sentUpTo); sentUpTo = S.log.length;
  postPayload(JSON.stringify({klic:DATA_KEY, souhrn, udalosti:ev}));
  sentAny = true; return true;
}
function postPayload(payload){
  fetch(DATA_ENDPOINT, {method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:payload, keepalive:payload.length<60000})
    .then(()=>flushQueue())
    .catch(()=>{ try{ const q=JSON.parse(localStorage.getItem('vr-dilna-fronta')||'[]'); q.push(payload); localStorage.setItem('vr-dilna-fronta', JSON.stringify(q.slice(-50))); }catch(e){} });
}
function flushQueue(){ try{ const q=JSON.parse(localStorage.getItem('vr-dilna-fronta')||'[]'); if(!q.length) return; localStorage.removeItem('vr-dilna-fronta'); q.forEach(postPayload); }catch(e){} }

function makeCode(){ const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s='VR-'; for(let i=0;i<4;i++) s+=a[Math.floor(Math.random()*a.length)]; return s; }
const secs = (a,b)=> (a&&b) ? Math.round((b-a)/1000) : '';
function resultData(){
  const now = S.t.end||performance.now();
  return {
    kod:S.code, datum:new Date().toISOString(),
    vyklad_s:secs(S.t.theory,S.t.build), prohlednuto_dilu:S.seen.size,
    stavba_s:secs(S.t.build,S.t.quiz), pokusy_zapnuti:S.postAttempts, chyby_poradi:S.orderErrors,
    chyby_pri_zapnuti:S.postFails.join(' '), rezim_ram:S.ramMode, napoveda_vypnuta:S.hintsEverOff?'ano':'ne',
    test_s:secs(S.t.quiz,now), test_skore:S.quiz.score, test_max:QUIZ.length, odpovedi:S.quiz.answers.join(''),
    ...gameFields()
  };
}
function toCSV(d){ const k=Object.keys(d); return '\ufeff'+k.join(';')+'\n'+k.map(x=>String(d[x]).replace(/;/g,',')).join(';')+'\n'; }

export { gameFields, sentUpTo, sentAny, resetSending, participant, sendData, postPayload, flushQueue, makeCode, secs, resultData, toCSV };
