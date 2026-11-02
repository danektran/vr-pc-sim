// Výsledky: souhrn na panelu, HTML karta s výsledky, CSV, nový začátek.
import { $, fmtKc } from '../helpers.js';
import { PARAMS } from '../config.js';
import { GAME, log, resetLogClock, S } from '../state.js';
import { renderer } from '../scene.js';
import { setPanel } from '../ui-panel.js';
import { goIntro } from './intro.js';
import { goGame, resetGame } from '../game/game.js';
import { freshParts } from '../game/faults.js';
import { resetSending, resultData, sendData, sentAny, toCSV } from '../data.js';
import { H, fill } from '../content.js';

/* ---------- results ---------- */
function fmt(s){ if(s==='') return '–'; const m=Math.floor(s/60), r=s%60; return m? m+' min '+r+' s' : r+' s'; }
function goResults(){
  S.phase='results'; S.t.end=performance.now(); log('phase','results');
  const d=resultData();
  const ramTxt = H.vysledky.pamet[d.rezim_ram]||'–';
  setPanel({step:4, title:H.vysledky.nadpis, body:fill(H.vysledky.panel_text, {kod:d.kod, vyklad:fmt(d.vyklad_s), prohlednuto:d.prohlednuto_dilu,
      stavba:fmt(d.stavba_s), pokusy:d.pokusy_zapnuti, chyby:d.chyby_poradi, pamet:ramTxt, skore:d.test_skore, max:d.test_max}),
    rows:[[{label:H.vysledky.tlacitko_znovu, onClick:restart},{label:H.vysledky.tlacitko_hra, kind:'primary', onClick:goGame}]]});
  sendData('opakovani_dokonceno');
  showResultsHTML(d, ramTxt);
}
function restart(){
  document.getElementById('results').hidden=true;
  resetGame(); freshParts(); resetSending(); resetLogClock();
  Object.assign(S,{seen:new Set(), t:{}, orderErrors:0, postAttempts:0, postFails:[], ramMode:'', success:false, quiz:{i:0,score:0,answers:[]}, code:'', log:[], hints:PARAMS.get('napoveda')!=='ne', hintsEverOff:PARAMS.get('napoveda')==='ne'});
  goIntro();
}
function showResultsHTML(d){
  const ramTxt = H.vysledky.pamet[d.rezim_ram]||'–';
  $('resCode').textContent = fill(H.vysledky.kod,{kod:d.kod});
  const L = H.vysledky.tabulka;
  const rows = [];
  if(S.t.theory) rows.push([L.vyklad,fmt(d.vyklad_s)],[L.prohlednute,d.prohlednuto_dilu+' z 8']);
  if(S.t.build) rows.push([L.stavba,fmt(d.stavba_s)],[L.pokusy,d.pokusy_zapnuti],[L.chyby,d.chyby_poradi],[L.pamet,ramTxt]);
  if(S.t.quiz) rows.push([L.opakovani,d.test_skore+' z '+d.test_max]);
  if(GAME.history.length) rows.push([L.hra_dny,d.hra_dny],[L.hra_pokladna,fmtKc(d.hra_pokladna)],[L.hra_reputace,String(d.hra_reputace).replace('.',',')+' z 5'],[L.hra_napoprve,d.hra_diagnozy_napoprve],[L.hra_zbytecne,d.hra_zbytecne_vymeny]);
  const tb=$('resTable'); tb.textContent='';
  rows.forEach(([a,b])=>{ const tr=document.createElement('tr'); const t1=document.createElement('td'), t2=document.createElement('td'); t1.textContent=a; t2.textContent=b; tr.append(t1,t2); tb.append(tr); });
  $('csvBox').hidden=true; $('csvBox').value=toCSV(d).replace('\ufeff',''); $('saveNote').textContent = sentAny ? H.vysledky.odeslano : '';
  if(!renderer.xr.isPresenting) $('results').hidden=false;
}
let downloadsCap = null;
if(window.claude && typeof window.claude.use==='function'){ window.claude.use('downloads').then(c=>{ downloadsCap=c; }).catch(()=>{}); }
$('btnSave').onclick = async ()=>{
  const d=resultData(), csv=toCSV(d), name='vr-stavba-pc-'+d.kod+'.csv';
  if(downloadsCap){ try{ await downloadsCap.save({filename:name, data:csv}); $('saveNote').textContent=fill(H.vysledky.ulozeno,{soubor:name}); return; } catch(e){ if(e && e.code==='declined'){ $('saveNote').textContent=H.vysledky.ulozeni_zruseno; return; } } }
  try{ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download=name; document.body.append(a); a.click(); a.remove(); $('saveNote').textContent=H.vysledky.nestazeno; }
  catch(e){ $('saveNote').textContent=H.vysledky.ulozeni_nefunguje; }
};
$('btnCopy').onclick = async ()=>{
  const txt=$('csvBox').value;
  try{ await navigator.clipboard.writeText(txt); $('saveNote').textContent=H.vysledky.ve_schrance; }
  catch(e){ $('csvBox').hidden=false; $('csvBox').select(); $('saveNote').textContent=H.vysledky.kopiruj_rucne; }
};
$('btnCloseRes').onclick = ()=>{ $('results').hidden=true; };

export { fmt, goResults, restart, showResultsHTML, downloadsCap };
