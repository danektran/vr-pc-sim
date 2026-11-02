// 2. Stavba: vkládání dílů, zapnutí a vyhodnocení chyb (POST).
import { tweenTo } from '../helpers.js';
import { GAME, installed, log, S } from '../state.js';
import { drawMonitor, powerLedMat, scene } from '../scene.js';
import { isIn, parts, powerOff, ramSlots, setLeds, uninstall } from '../parts.js';
import { explodeLabels, panel, setPanel } from '../ui-panel.js';
import { goQuiz } from './quiz.js';
import { gamePower } from '../game/game.js';

function goBuild(){
  S.phase='build'; S.t.build=performance.now(); log('phase','build');
  explodeLabels.forEach(l=>scene.remove(l)); explodeLabels.length=0;
  for(const id in parts){ uninstall(id); const p=parts[id]; tweenTo(p.obj, p.homeP, p.homeQ, 0.9); }
  powerOff(); buildPanel('Vlož díly do skříně. Až budeš hotov, stiskni žluté tlačítko na přední straně skříně nebo „Zapnout počítač“.','info');
}
function buildPanel(status, kind){
  const rows = [[{label:'Zapnout počítač', kind:'primary', onClick:pressPower}, {label:S.hints?'Nápověda: zapnuta':'Nápověda: vypnuta', onClick:toggleHints}]];
  if(S.success) rows.push([{label:'Pokračovat k opakování', kind:'primary', onClick:goQuiz}]);
  setPanel({step:2, title:'Sestav počítač',
    body:'Díly ber ze stolu a pokládej je na správné místo ve skříni. Když je díl blízko svého místa, sám se přichytí. Vložený díl jde zase vyjmout.' + (S.hints?' Žlutý obrys ukazuje, kam díl patří.':''),
    status, statusKind:kind, rows});
}
function toggleHints(){ S.hints=!S.hints; if(!S.hints) S.hintsEverOff=true; log('hints', S.hints); buildPanel(panel.content.status, panel.content.statusKind); }

/* ---------- POST evaluation ---------- */
function evaluate(){
  const r = ramSlots().filter(k=>!GAME.loose.has(installed[k])); const a=r.filter(k=>k[0]==='A').length, b=r.filter(k=>k[0]==='B').length;
  if(!isIn('psu')) return {code:'bez_zdroje', title:'Nic se nestalo', msg:'Po stisknutí tlačítka počítač vůbec nereaguje. Chybí zdroj, který dodává energii všem dílům.', mon:'off'};
  if(!isIn('board')) return {code:'bez_desky', title:'Nic se nestalo', msg:'Zdroj je na místě, ale bez základní desky není co zapnout. Deska propojuje všechny díly a vede k ní i tlačítko napájení.', mon:'off'};
  if(!isIn('cpu')) return {code:'bez_procesoru', title:'Žádný obraz', msg:'Ventilátory se roztočily, ale na desce svítí kontrolka CPU. Bez procesoru deska nespustí ani úvodní test (POST).', led:'CPU', mon:'black'};
  if(r.length===0) return {code:'bez_ram', title:'Žádný obraz', msg:'Svítí kontrolka DRAM. Procesor potřebuje operační paměť, aby vůbec mohl začít pracovat.', led:'DRAM', mon:'black'};
  if(!isIn('gpu')) return {code:'bez_grafiky', title:'Žádný obraz', msg:'Svítí kontrolka VGA. Tento procesor nemá integrovanou grafiku, takže bez grafické karty nemá kdo vytvořit obraz.', led:'VGA', mon:'black'};
  if(!isIn('cable')) return {code:'grafika_bez_napajeni', title:'Žádný obraz', msg:'Svítí kontrolka VGA. Grafická karta je ve slotu, ale chybí jí přídavné napájení. Slot PCIe dodá nejvýš 75 W, karta potřebuje víc.', led:'VGA', mon:'black'};
  if(!isIn('cooler')) return {code:'bez_chladice', title:'Počítač se vypnul', msg:'Počítač naběhl, ale teplota procesoru během pár sekund vystoupala přes 100 °C a ochrana ho vypnula. Chybí chladič.', mon:'overheat'};
  if(!isIn('ssd')) return {code:'bez_disku', title:'Nenalezen systém', msg:'Počítač naběhl do nastavení UEFI s hlášením, že nenašel zaváděcí zařízení. Chybí disk s operačním systémem.', led:'BOOT', mon:'bios'};
  const dual = a>=1 && b>=1;
  if(!dual){
    const why = r.length===1 ? 'Je vložený jen jeden modul.' : 'Oba moduly jsou ve stejném kanálu ('+r.sort().join(' a ')+').';
    return {ok:true, ramMode:'single', title:'Funguje, ale pomaleji', msg:'Počítač naběhl, paměť ale běží v režimu single channel. '+why+' Přesuň moduly do slotů A2 a B2 a zapni počítač znovu.', ram:'single channel (pomalejší)', kind:'info'};
  }
  const ideal = installed.A2 && installed.B2;
  return {ok:true, ramMode: ideal?'dual_A2B2':'dual_jine', title:'Hotovo, počítač funguje', msg: ideal ? 'Všechny díly jsou na místě a paměť běží v režimu dual channel. Výborně!' : 'Počítač funguje a paměť běží v režimu dual channel. Výrobci desek ale většinou doporučují sloty A2 a B2.', ram:'dual channel', kind:'ok'};
}
function pressPower(){
  if(S.phase==='game') return gamePower();
  if(S.phase!=='build' || S.anim || S.busy) return;
  S.postAttempts++; powerOff();
  const res = evaluate(); log('post', res.code||res.ramMode);
  if(res.mon!=='off') powerLedMat.emissive.setHex(0x2bd46b);
  if(res.led) setLeds(res.led);
  if(res.ok){
    drawMonitor('ok',{ram:res.ram}); S.powered=true; S.ramMode=res.ramMode;
    if(!S.success){ S.success=true; S.t.buildDone=performance.now(); }
    if(res.ramMode==='single') S.postFails.push('single_channel');
    buildPanel(res.title+'. '+res.msg, res.kind); return;
  }
  S.postFails.push(res.code);
  if(res.mon==='overheat'){ S.anim={kind:'nocool', t:0, res}; drawMonitor('boot'); buildPanel('Počítač se spouští…','info'); return; }
  drawMonitor(res.mon);
  buildPanel(res.title+'. '+res.msg, 'err');
}

export { goBuild, buildPanel, toggleHints, evaluate, pressPower };
