// 4. Hra Den v PC dílně: den, zákazníci, diagnóza, oprava, obchod, předání a souhrn dne.
import { $, fmtKc, rngFrom, shuffle, starStr } from '../helpers.js';
import { PARAMS } from '../config.js';
import { GAME, log, S } from '../state.js';
import { drawMonitor, powerLedMat, scene } from '../scene.js';
import { assembleAll, hideGhosts, parts, powerOff, setCableTube, setLeds } from '../parts.js';
import { explodeLabels, setPanel } from '../ui-panel.js';
import { buildPanel, pressPower } from '../phases/build.js';
import { restart, showResultsHTML } from '../phases/results.js';
import { applyFault, freshParts, gameEvaluate, replacePart } from './faults.js';
import { makeCode, resultData, secs, sendData } from '../data.js';

/* ---------- game: Den v PC dílně ---------- */
const FAULTS = {
  ram_loose:{diag:'Špatně zasunutá operační paměť', quote:'Zapnu to, větráky jedou, ale obrazovka je černá. Minulý týden jsem počítač stěhoval.', hint:'Všimni si, která kontrolka na desce svítí.', fix:'Vyjmi oba moduly paměti a pořádně je zasuň zpět.'},
  gpu_power:{diag:'Grafická karta nemá přídavné napájení', quote:'Po stěhování to nic neukazuje. Zkoušel jsem i jiný monitor a taky nic.', hint:'Která kontrolka svítí? A je grafická karta ke všemu připojená?', fix:'Připoj napájecí kabel ze zdroje ke grafické kartě.'},
  ssd_dead:{diag:'Vadný disk', quote:'Píše to něco o zaváděcím zařízení a dál to nejde.', hint:'Počítač došel až do nastavení UEFI. Co tam hledal a nenašel?', fix:'Vyjmi vadný disk a objednej nový.'},
  cooler:{diag:'Ucpaný chladič a vyschlá teplovodivá pasta', quote:'Při hraní se to po chvíli samo vypne. A je to čím dál hlučnější.', hint:'Sleduj teplotu procesoru během zátěžového testu.', fix:'Sundej chladič, objednej vyčištění s novou pastou (nebo nový chladič) a nasaď ho zpět.'},
  psu_weak:{diag:'Zdroj nestačí na výkon nové grafické karty', quote:'Koupil jsem si novou grafiku a od té doby se mi počítač při hraní vypíná.', hint:'Teplota byla v normě. Co se změnilo s novou grafikou? Podívej se na štítek zdroje.', fix:'Odpoj kabel grafiky, vyjmi slabý zdroj a objednej silnější.'},
  single:{diag:'Paměti zapojené v jednom kanálu', quote:'Kolega má úplně stejný počítač a ten jeho je znatelně rychlejší.', hint:'Počítač funguje. Co přesně systém hlásí o paměti?', fix:'Přesuň moduly tak, aby byl každý v jiném kanálu, ideálně A2 a B2.'}
};
const DISTRACT = ['Vadný procesor','Vadná základní deska','Vadný monitor'];
const CUSTOMERS = ['Pan Dvořák','Paní Svobodová','Student Petr','Paní Malá','Pan Novotný','Slečna Eva','Pan Kučera','Paní Horáková'];
const SHOP = [
  {key:'ssd', label:'SSD 1 TB', price:1500, part:'ssd', fixes:'ssd_dead'},
  {key:'psu650', label:'Zdroj 650 W', price:2200, part:'psu', watt:650, fixes:'psu_weak'},
  {key:'psu850', label:'Zdroj 850 W', price:2900, part:'psu', watt:850, fixes:'psu_weak'},
  {key:'cooler', label:'Nový chladič', price:900, part:'cooler', fixes:'cooler'},
  {key:'ram', label:'Modul RAM', price:900, part:'ram', fixes:null},
  {key:'clean', label:'Vyčištění a pasta', price:150, part:'clean', fixes:'cooler'}
];
const WORK = 800, BONUS = 200, START_CASH = 5000, PER_DAY = 4;
function resetGame(){ GAME.loose.clear(); GAME.cur=null; GAME.history=[]; GAME.day=0; GAME.cash=START_CASH; GAME.daysPlayed=0; }
function goGame(){
  S.phase='game'; S.code = S.code || makeCode(); log('phase','game');
  explodeLabels.forEach(l=>scene.remove(l)); explodeLabels.length=0; hideGhosts(); setCableTube(false);
  $('results').hidden=true; startDay();
}
function startDay(){
  GAME.day++; GAME.i=0; GAME.dayStart=GAME.cash; GAME.dayLog=[];
  const sc = PARAMS.get('scenar');
  let seed = Date.now() ^ Math.floor(Math.random()*1e9);
  if(sc){ seed=2166136261; for(const ch of sc+'#'+GAME.day) seed=Math.imul(seed ^ ch.charCodeAt(0), 16777619); }
  GAME.rnd = rngFrom(seed);
  GAME.queue = (sc==='den1' && GAME.day===1) ? ['gpu_power','ram_loose','cooler','psu_weak'] : shuffle(Object.keys(FAULTS), GAME.rnd).slice(0,PER_DAY);
  GAME.names = shuffle(CUSTOMERS, GAME.rnd);
  nextCustomer();
}
function topline(){ return 'Den '+GAME.day+'     Zakázka '+Math.min(GAME.i+1,PER_DAY)+' z '+PER_DAY+'     Pokladna '+fmtKc(GAME.cash); }
function nextCustomer(){
  if(GAME.i>=PER_DAY) return endDay();
  const f = GAME.queue[GAME.i];
  freshParts(); assembleAll(); powerOff(); applyFault(f);
  const wrong = shuffle(Object.keys(FAULTS).filter(k=>k!==f).map(k=>FAULTS[k].diag).concat(DISTRACT), GAME.rnd).slice(0,3);
  GAME.cur = {fault:f, name:GAME.names[GAME.i], stage:'diagnose', attempts:0, firstTry:false, unnecessary:0, partsCost:0, spent:0, works:false, endRam:'', t0:performance.now(), opts:shuffle([FAULTS[f].diag].concat(wrong), GAME.rnd), fixedBy:null};
  log('customer', f); diagnosePanel(null);
}
function diagnosePanel(status, kind){
  const g=GAME.cur;
  setPanel({topline:topline(), title:g.name, body:'„'+FAULTS[g.fault].quote+'“\n\nZapni počítač a pozoruj příznaky: kontrolky na desce, monitor a co se děje po spuštění. Skříň otevřeš až po určení diagnózy.',
    status, statusKind:kind, rows:[[{label:'Zapnout počítač', kind:'primary', onClick:pressPower},{label:'Určit diagnózu', onClick:diagChoices}]]});
}
function diagChoices(){
  const o=GAME.cur.opts; const b=i=>({label:o[i], onClick:()=>answerDiag(o[i])});
  setPanel({topline:topline(), title:'Co je příčinou?', body:'Vyber diagnózu. Každá špatná tě stojí jednu hvězdu v hodnocení zákazníka.', rows:[[b(0),b(1)],[b(2),b(3)],[{label:'Zpět k počítači', onClick:()=>diagnosePanel(null)}]]});
}
function answerDiag(label){
  const g=GAME.cur, F=FAULTS[g.fault]; log('diagnosis',{fault:g.fault, label});
  const fix = S.hints ? ' '+F.fix : '';
  if(label===F.diag){ g.firstTry = g.attempts===0; g.stage='repair'; return repairPanel('Správně: '+F.diag.toLowerCase()+'.'+fix,'ok'); }
  g.attempts++;
  if(g.attempts>=2){ g.stage='repair'; return repairPanel('Ani to nesedí. Správná diagnóza je: '+F.diag.toLowerCase()+'.'+fix,'err'); }
  diagnosePanel('To nesedí.'+(S.hints?' Nápověda: '+F.hint:' Zkus to znovu.'),'err');
}
function repairPanel(status, kind){
  const g=GAME.cur; if(!g) return;
  setPanel({topline:topline(), title:'Oprava: '+g.name, body:'Oprav počítač a ověř zapnutím, že funguje. Náhradní díly koupíš přes Objednat díl. Zákazník ti zaplatí jen díly, které byly opravdu potřeba.',
    status, statusKind:kind, rows:[[{label:'Zapnout počítač', onClick:pressPower},{label:'Objednat díl', onClick:()=>shopPanel(null)}],[{label:'Předat zákazníkovi', kind:'primary', disabled:!g.works, onClick:deliver}]]});
}
function showStage(text, kind){ const g=GAME.cur; if(!g) return; if(g.stage==='diagnose') diagnosePanel(text,kind); else repairPanel(text,kind); }
function statusMsg(text, kind){ if(S.phase==='game') repairPanel(text,kind); else buildPanel(text,kind); }
function shopPanel(status, kind){
  const it=k=>{ const s=SHOP.find(x=>x.key===k); return {label:s.label+' ('+fmtKc(s.price)+')', onClick:()=>buy(s)}; };
  setPanel({topline:topline(), title:'Objednat díl', body:'Starý díl musí být nejdřív vyjmutý ze skříně. Nový se objeví na stole na jeho místě.', status, statusKind:kind,
    rows:[[it('ssd'),it('psu650')],[it('psu850'),it('cooler')],[it('ram'),it('clean')],[{label:'Zpět k opravě', onClick:()=>repairPanel(null)}]]});
}
function pay(s, useful){ const g=GAME.cur; GAME.cash-=s.price; g.spent+=s.price; if(useful){ g.partsCost+=s.price; g.fixedBy=s.key; } else g.unnecessary++; log('buy',{item:s.key, useful}); }
function buy(s){
  const g=GAME.cur;
  if(GAME.cash < s.price) return shopPanel('Na tento díl nemáš v pokladně dost peněz.','err');
  if(s.part==='clean'){
    if(parts.cooler.at) return shopPanel('Nejdřív sundej chladič z procesoru.','err');
    pay(s, g.fault==='cooler' && parts.cooler.dirty && !g.fixedBy); replacePart('cooler');
    return repairPanel('Chladič je vyčištěný a má novou pastu. Nasaď ho zpět na procesor.','ok');
  }
  let target = s.part;
  if(s.part==='ram'){ target = ['ram1','ram2'].find(id=>!parts[id].at); if(!target) return shopPanel('Nejdřív vyjmi modul, který chceš vyměnit.','err'); }
  if(parts[target].at) return shopPanel('Nejdřív vyjmi starý díl ze skříně.','err');
  const useful = s.fixes===g.fault && !g.fixedBy && (target!=='psu' || parts.psu.watt<600) && (target!=='ssd' || parts.ssd.faulty) && (target!=='cooler' || parts.cooler.dirty);
  pay(s, useful); replacePart(target, s.watt);
  repairPanel(s.label+' leží na stole. Vlož ho do skříně.','ok');
}
function gamePower(){
  const g=GAME.cur; if(!g || S.anim || (g.stage!=='diagnose' && g.stage!=='repair')) return;
  powerOff();
  const res=gameEvaluate(); log('post', res.code||'ok');
  if(res.mon!=='off') powerLedMat.emissive.setHex(0x2bd46b);
  if(res.led) setLeds(res.led);
  if(res.ok){
    drawMonitor('ok',{ram:res.ram}); S.powered=true; g.endRam=res.ramMode;
    g.works = g.stage==='repair' && (g.fault!=='single' || res.ramMode!=='single');
    return showStage(res.sym+(g.works?' Počítač můžeš předat zákazníkovi.':''), g.works?'ok':'info');
  }
  g.works=false;
  if(res.anim){ S.anim={kind:res.anim, t:0, res, game:true}; drawMonitor('boot'); return showStage('Počítač se spouští…','info'); }
  drawMonitor(res.mon); showStage(res.sym,'err');
}
function deliver(){
  const g=GAME.cur; if(!g || !g.works) return;
  const slow = g.endRam==='single' && g.fault!=='single';
  const stars = Math.max(1, 5 - g.attempts - g.unnecessary - (slow?1:0));
  const paid = WORK + (g.firstTry?BONUS:0) + g.partsCost;
  GAME.cash += paid;
  const rec = {day:GAME.day, fault:g.fault, name:g.name, stars, attempts:g.attempts, firstTry:g.firstTry, unnecessary:g.unnecessary, spent:g.spent, paid, secs:Math.round((performance.now()-g.t0)/1000)};
  GAME.history.push(rec); GAME.dayLog.push(rec); log('deliver', rec);
  GAME.i++; g.stage='done'; powerOff();
  const notes=[]; if(g.firstTry) notes.push('bonus za diagnózu napoprvé'); if(g.attempts) notes.push('špatné diagnózy: '+g.attempts); if(g.unnecessary) notes.push('zbytečně koupené díly: '+g.unnecessary); if(slow) notes.push('paměť běží pomaleji, než by mohla');
  setPanel({topline:topline(), title:'Zakázka předána', body:'Zákazník zaplatil '+fmtKc(paid)+': práce '+fmtKc(WORK)+(g.firstTry?', bonus '+fmtKc(BONUS):'')+(g.partsCost?', díly '+fmtKc(g.partsCost):'')+'.\nHodnocení: '+starStr(stars)+(notes.length?'\n'+notes.join(', ')+'.':''),
    rows:[[{label: GAME.i<PER_DAY ? 'Další zákazník' : 'Ukončit den', kind:'primary', onClick:nextCustomer}]]});
}
function endDay(){
  GAME.daysPlayed++; GAME.cur=null; powerOff();
  const L=GAME.dayLog, rep=L.reduce((a,r)=>a+r.stars,0)/L.length;
  const first=L.filter(r=>r.firstTry).length, unn=L.reduce((a,r)=>a+r.unnecessary,0);
  const lines=L.map((r,i)=>(i+1)+'. '+r.name+': '+starStr(r.stars)+', '+FAULTS[r.fault].diag.toLowerCase()).join('\n');
  setPanel({topline:'Den '+GAME.day+' skončil', title:'Souhrn dne', body:'Pokladna: '+fmtKc(GAME.cash)+' (zisk '+fmtKc(GAME.cash-GAME.dayStart)+')\nReputace: '+rep.toFixed(1).replace('.',',')+' z 5\nDiagnózy napoprvé: '+first+' z '+L.length+', zbytečně koupené díly: '+unn+'\n\n'+lines,
    rows:[[{label:'Další den', kind:'primary', onClick:startDay},{label:'Úvodní obrazovka', onClick:restart}]]});
  S.t.end = S.t.end || performance.now();
  sendData('den_'+GAME.day+'_dokoncen');
  showResultsHTML(resultData());
}

export { FAULTS, DISTRACT, CUSTOMERS, SHOP, WORK, PER_DAY, START_CASH, BONUS, resetGame, goGame, startDay, topline, nextCustomer, diagnosePanel, diagChoices, answerDiag, repairPanel, showStage, statusMsg, shopPanel, pay, buy, gamePower, deliver, endDay };
