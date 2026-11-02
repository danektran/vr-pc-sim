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

/* ---------- results ---------- */
function fmt(s){ if(s==='') return '–'; const m=Math.floor(s/60), r=s%60; return m? m+' min '+r+' s' : r+' s'; }
function goResults(){
  S.phase='results'; S.t.end=performance.now(); log('phase','results');
  const d=resultData();
  const ramTxt = {dual_A2B2:'dual channel (A2 a B2)', dual_jine:'dual channel', single:'single channel'}[d.rezim_ram]||'–';
  setPanel({step:4, title:'Hotovo', body:
    'Kód sezení: '+d.kod+'\n'+
    'Výklad: '+fmt(d.vyklad_s)+', prohlédnuto '+d.prohlednuto_dilu+' z 8 dílů\n'+
    'Stavba: '+fmt(d.stavba_s)+', pokusů o zapnutí '+d.pokusy_zapnuti+', chyb v pořadí '+d.chyby_poradi+'\n'+
    'Paměť: '+ramTxt+'\n'+
    'Opakování: '+d.test_skore+' z '+d.test_max+' správně\n\n'+
    'Výsledky si ulož po sundání brýlí, tlačítko najdeš na obrazovce.',
    rows:[[{label:'Začít znovu', onClick:restart},{label:'Pokračovat do hry', kind:'primary', onClick:goGame}]]});
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
  const ramTxt = {dual_A2B2:'dual channel (A2 a B2)', dual_jine:'dual channel', single:'single channel'}[d.rezim_ram]||'–';
  $('resCode').textContent = 'Kód sezení '+d.kod+'. Kód si poznamenej, výsledky jsou anonymní.';
  const rows = [];
  if(S.t.theory) rows.push(['Výklad',fmt(d.vyklad_s)],['Prohlédnuté díly',d.prohlednuto_dilu+' z 8']);
  if(S.t.build) rows.push(['Stavba',fmt(d.stavba_s)],['Pokusy o zapnutí',d.pokusy_zapnuti],['Chyby v pořadí',d.chyby_poradi],['Paměť',ramTxt]);
  if(S.t.quiz) rows.push(['Opakování',d.test_skore+' z '+d.test_max]);
  if(GAME.history.length) rows.push(['Hra: odehrané dny',d.hra_dny],['Hra: pokladna',fmtKc(d.hra_pokladna)],['Hra: reputace',String(d.hra_reputace).replace('.',',')+' z 5'],['Hra: diagnózy napoprvé',d.hra_diagnozy_napoprve],['Hra: zbytečné výměny',d.hra_zbytecne_vymeny]);
  const tb=$('resTable'); tb.textContent='';
  rows.forEach(([a,b])=>{ const tr=document.createElement('tr'); const t1=document.createElement('td'), t2=document.createElement('td'); t1.textContent=a; t2.textContent=b; tr.append(t1,t2); tb.append(tr); });
  $('csvBox').hidden=true; $('csvBox').value=toCSV(d).replace('\ufeff',''); $('saveNote').textContent = sentAny ? 'Výsledky se odeslaly vyučujícímu. Soubor si můžeš uložit i jako zálohu.' : '';
  if(!renderer.xr.isPresenting) $('results').hidden=false;
}
let downloadsCap = null;
if(window.claude && typeof window.claude.use==='function'){ window.claude.use('downloads').then(c=>{ downloadsCap=c; }).catch(()=>{}); }
$('btnSave').onclick = async ()=>{
  const d=resultData(), csv=toCSV(d), name='vr-stavba-pc-'+d.kod+'.csv';
  if(downloadsCap){ try{ await downloadsCap.save({filename:name, data:csv}); $('saveNote').textContent='Soubor '+name+' je uložený.'; return; } catch(e){ if(e && e.code==='declined'){ $('saveNote').textContent='Uložení bylo zrušeno.'; return; } } }
  try{ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download=name; document.body.append(a); a.click(); a.remove(); $('saveNote').textContent='Pokud se soubor nestáhl, použij „Kopírovat“.'; }
  catch(e){ $('saveNote').textContent='Uložení tu nefunguje, použij „Kopírovat“.'; }
};
$('btnCopy').onclick = async ()=>{
  const txt=$('csvBox').value;
  try{ await navigator.clipboard.writeText(txt); $('saveNote').textContent='Výsledky jsou ve schránce, vlož je do tabulky.'; }
  catch(e){ $('csvBox').hidden=false; $('csvBox').select(); $('saveNote').textContent='Označený text zkopíruj ručně (Ctrl+C).'; }
};
$('btnCloseRes').onclick = ()=>{ $('results').hidden=true; };

export { fmt, goResults, restart, showResultsHTML, downloadsCap };
