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
import { arriveCustomer, cheerAndLeave } from './customer.js';
import { makeCode, resultData, secs, sendData } from '../data.js';
import { BONUS, CUSTOMERS, DISTRACT, FAULTS, fill, H, PER_DAY, SHOP, START_CASH, WORK } from '../content.js';

/* ---------- game: Den v PC dílně ---------- */
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
function topline(){ return fill(H.hra.horni_lista,{den:GAME.day, zakazka:Math.min(GAME.i+1,PER_DAY), celkem:PER_DAY, pokladna:fmtKc(GAME.cash)}); }
function nextCustomer(){
  if(GAME.i>=PER_DAY) return endDay();
  const f = GAME.queue[GAME.i];
  freshParts(); assembleAll(); powerOff(); applyFault(f);
  const wrong = shuffle(Object.keys(FAULTS).filter(k=>k!==f).map(k=>FAULTS[k].diag).concat(DISTRACT), GAME.rnd).slice(0,3);
  GAME.cur = {fault:f, name:GAME.names[GAME.i], stage:'diagnose', attempts:0, firstTry:false, unnecessary:0, partsCost:0, spent:0, works:false, endRam:'', t0:performance.now(), opts:shuffle([FAULTS[f].diag].concat(wrong), GAME.rnd), fixedBy:null};
  log('customer', f); diagnosePanel(null);
  // postavička mluví zhruba tak dlouho, jak dlouho se čte citace
  arriveCustomer(GAME.cur.name, Math.min(7, Math.max(2.5, FAULTS[f].quote.length * 0.065)));
}
function diagnosePanel(status, kind){
  const g=GAME.cur;
  setPanel({topline:topline(), title:g.name, body:'„'+FAULTS[g.fault].quote+'“\n\n'+H.hra.diagnoza_text,
    status, statusKind:kind, rows:[[{label:H.spolecne.zapnout, kind:'primary', onClick:pressPower},{label:H.hra.tlacitko_diagnoza, onClick:diagChoices}]]});
}
function diagChoices(){
  const o=GAME.cur.opts; const b=i=>({label:o[i], onClick:()=>answerDiag(o[i])});
  setPanel({topline:topline(), title:H.hra.volba_nadpis, body:H.hra.volba_text, rows:[[b(0),b(1)],[b(2),b(3)],[{label:H.hra.tlacitko_zpet_pc, onClick:()=>diagnosePanel(null)}]]});
}
function answerDiag(label){
  const g=GAME.cur, F=FAULTS[g.fault]; log('diagnosis',{fault:g.fault, label});
  const fix = S.hints ? ' '+F.fix : '';
  if(label===F.diag){ g.firstTry = g.attempts===0; g.stage='repair'; return repairPanel(fill(H.hra.diagnoza_spravne,{diagnoza:F.diag.toLowerCase()})+fix,'ok'); }
  g.attempts++;
  if(g.attempts>=2){ g.stage='repair'; return repairPanel(fill(H.hra.diagnoza_prozrazena,{diagnoza:F.diag.toLowerCase()})+fix,'err'); }
  diagnosePanel(H.hra.diagnoza_spatne+' '+(S.hints?fill(H.hra.napoveda,{napoveda:F.hint}):H.hra.zkus_znovu),'err');
}
function repairPanel(status, kind){
  const g=GAME.cur; if(!g) return;
  setPanel({topline:topline(), title:fill(H.hra.oprava_nadpis,{jmeno:g.name}), body:H.hra.oprava_text,
    status, statusKind:kind, rows:[[{label:H.spolecne.zapnout, onClick:pressPower},{label:H.hra.tlacitko_objednat, onClick:()=>shopPanel(null)}],[{label:H.hra.tlacitko_predat, kind:'primary', disabled:!g.works, onClick:deliver}]]});
}
function showStage(text, kind){ const g=GAME.cur; if(!g) return; if(g.stage==='diagnose') diagnosePanel(text,kind); else repairPanel(text,kind); }
function statusMsg(text, kind){ if(S.phase==='game') repairPanel(text,kind); else buildPanel(text,kind); }
function shopPanel(status, kind){
  const it=k=>{ const s=SHOP.find(x=>x.key===k); return {label:s.label+' ('+fmtKc(s.price)+')', onClick:()=>buy(s)}; };
  setPanel({topline:topline(), title:H.hra.tlacitko_objednat, body:H.hra.obchod_text, status, statusKind:kind,
    rows:[[it('ssd'),it('psu650')],[it('psu850'),it('cooler')],[it('ram'),it('clean')],[{label:H.hra.tlacitko_zpet_oprava, onClick:()=>repairPanel(null)}]]});
}
function pay(s, useful){ const g=GAME.cur; GAME.cash-=s.price; g.spent+=s.price; if(useful){ g.partsCost+=s.price; g.fixedBy=s.key; } else g.unnecessary++; log('buy',{item:s.key, useful}); }
function buy(s){
  const g=GAME.cur;
  if(GAME.cash < s.price) return shopPanel(H.hra.malo_penez,'err');
  if(s.part==='clean'){
    if(parts.cooler.at) return shopPanel(H.hra.sundej_chladic,'err');
    pay(s, g.fault==='cooler' && parts.cooler.dirty && !g.fixedBy); replacePart('cooler');
    return repairPanel(H.hra.vycisteno,'ok');
  }
  let target = s.part;
  if(s.part==='ram'){ target = ['ram1','ram2'].find(id=>!parts[id].at); if(!target) return shopPanel(H.hra.vyjmi_modul,'err'); }
  if(parts[target].at) return shopPanel(H.hra.vyjmi_stary,'err');
  const useful = s.fixes===g.fault && !g.fixedBy && (target!=='psu' || parts.psu.watt<600) && (target!=='ssd' || parts.ssd.faulty) && (target!=='cooler' || parts.cooler.dirty);
  pay(s, useful); replacePart(target, s.watt);
  repairPanel(fill(H.hra.na_stole,{dil:s.label}),'ok');
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
    return showStage(res.sym+(g.works?' '+H.hra.lze_predat:''), g.works?'ok':'info');
  }
  g.works=false;
  if(res.anim){ S.anim={kind:res.anim, t:0, res, game:true}; drawMonitor('boot'); return showStage(H.spolecne.spousti,'info'); }
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
  GAME.i++; g.stage='done'; powerOff(); cheerAndLeave();
  const notes=[]; if(g.firstTry) notes.push(H.hra.poznamka_bonus); if(g.attempts) notes.push(fill(H.hra.poznamka_spatne,{n:g.attempts})); if(g.unnecessary) notes.push(fill(H.hra.poznamka_zbytecne,{n:g.unnecessary})); if(slow) notes.push(H.hra.poznamka_pomalejsi);
  const rozpis=[fill(H.hra.rozpis_prace,{castka:fmtKc(WORK)})]; if(g.firstTry) rozpis.push(fill(H.hra.rozpis_bonus,{castka:fmtKc(BONUS)})); if(g.partsCost) rozpis.push(fill(H.hra.rozpis_dily,{castka:fmtKc(g.partsCost)}));
  setPanel({topline:topline(), title:H.hra.predano_nadpis, body:fill(H.hra.predano_text,{castka:fmtKc(paid), rozpis:rozpis.join(', '), hvezdy:starStr(stars)})+(notes.length?'\n'+notes.join(', ')+'.':''),
    rows:[[{label: GAME.i<PER_DAY ? H.hra.tlacitko_dalsi_zakaznik : H.hra.tlacitko_konec_dne, kind:'primary', onClick:nextCustomer}]]});
}
function endDay(){
  GAME.daysPlayed++; GAME.cur=null; powerOff();
  const L=GAME.dayLog, rep=L.reduce((a,r)=>a+r.stars,0)/L.length;
  const first=L.filter(r=>r.firstTry).length, unn=L.reduce((a,r)=>a+r.unnecessary,0);
  const lines=L.map((r,i)=>fill(H.hra.souhrn_radek,{poradi:i+1, jmeno:r.name, hvezdy:starStr(r.stars), diagnoza:FAULTS[r.fault].diag.toLowerCase()})).join('\n');
  setPanel({topline:fill(H.hra.konec_dne,{den:GAME.day}), title:H.hra.souhrn_nadpis, body:fill(H.hra.souhrn_text,{pokladna:fmtKc(GAME.cash), zisk:fmtKc(GAME.cash-GAME.dayStart), reputace:rep.toFixed(1).replace('.',','), napoprve:first, zakazek:L.length, zbytecne:unn})+'\n\n'+lines,
    rows:[[{label:H.hra.tlacitko_dalsi_den, kind:'primary', onClick:startDay},{label:H.hra.tlacitko_uvod, onClick:restart}]]});
  S.t.end = S.t.end || performance.now();
  sendData('den_'+GAME.day+'_dokoncen');
  showResultsHTML(resultData());
}

export { resetGame, goGame, startDay, topline, nextCustomer, diagnosePanel, diagChoices, answerDiag, repairPanel, showStage, statusMsg, shopPanel, pay, buy, gamePower, deliver, endDay };
