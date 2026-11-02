// 2. Stavba: vkládání dílů, zapnutí a vyhodnocení chyb (POST).
import { tweenTo } from '../helpers.js';
import { GAME, installed, log, S } from '../state.js';
import { drawMonitor, powerLedMat, scene } from '../scene.js';
import { isIn, parts, powerOff, ramSlots, setLeds, uninstall } from '../parts.js';
import { explodeLabels, panel, setPanel } from '../ui-panel.js';
import { goQuiz } from './quiz.js';
import { gamePower } from '../game/game.js';
import { H, fill } from '../content.js';

function goBuild(){
  S.phase='build'; S.t.build=performance.now(); log('phase','build');
  explodeLabels.forEach(l=>scene.remove(l)); explodeLabels.length=0;
  for(const id in parts){ uninstall(id); const p=parts[id]; tweenTo(p.obj, p.homeP, p.homeQ, 0.9); }
  powerOff(); buildPanel(H.stavba.uvodni_stav,'info');
}
function buildPanel(status, kind){
  const rows = [[{label:H.spolecne.zapnout, kind:'primary', onClick:pressPower}, {label:S.hints?H.stavba.napoveda_zapnuta:H.stavba.napoveda_vypnuta, onClick:toggleHints}]];
  if(S.success) rows.push([{label:H.stavba.tlacitko_opakovani, kind:'primary', onClick:goQuiz}]);
  setPanel({step:2, title:H.stavba.nadpis,
    body:H.stavba.text + (S.hints?' '+H.stavba.text_napoveda:''),
    status, statusKind:kind, rows});
}
function toggleHints(){ S.hints=!S.hints; if(!S.hints) S.hintsEverOff=true; log('hints', S.hints); buildPanel(panel.content.status, panel.content.statusKind); }

/* ---------- POST evaluation ---------- */
// nadpis a text hlášky po zapnutí podle kódu (data/hlasky.json → zapnuti)
const Z = code => ({title:H.zapnuti[code].nadpis, msg:H.zapnuti[code].text});
function evaluate(){
  const r = ramSlots().filter(k=>!GAME.loose.has(installed[k])); const a=r.filter(k=>k[0]==='A').length, b=r.filter(k=>k[0]==='B').length;
  if(!isIn('psu')) return {code:'bez_zdroje', ...Z('bez_zdroje'), mon:'off'};
  if(!isIn('board')) return {code:'bez_desky', ...Z('bez_desky'), mon:'off'};
  if(!isIn('cpu')) return {code:'bez_procesoru', ...Z('bez_procesoru'), led:'CPU', mon:'black'};
  if(r.length===0) return {code:'bez_ram', ...Z('bez_ram'), led:'DRAM', mon:'black'};
  if(!isIn('gpu')) return {code:'bez_grafiky', ...Z('bez_grafiky'), led:'VGA', mon:'black'};
  if(!isIn('cable')) return {code:'grafika_bez_napajeni', ...Z('grafika_bez_napajeni'), led:'VGA', mon:'black'};
  if(!isIn('cooler')) return {code:'bez_chladice', ...Z('bez_chladice'), mon:'overheat'};
  if(!isIn('ssd')) return {code:'bez_disku', ...Z('bez_disku'), led:'BOOT', mon:'bios'};
  const dual = a>=1 && b>=1;
  if(!dual){
    const why = r.length===1 ? H.zapnuti.single_jeden_modul : fill(H.zapnuti.single_stejny_kanal,{sloty:r.sort().join(' a ')});
    return {ok:true, ramMode:'single', title:H.zapnuti.single.nadpis, msg:fill(H.zapnuti.single.text,{proc:why}), ram:H.zapnuti.pamet_single, kind:'info'};
  }
  const ideal = installed.A2 && installed.B2;
  return {ok:true, ramMode: ideal?'dual_A2B2':'dual_jine', title:H.zapnuti.dual.nadpis, msg: ideal ? H.zapnuti.dual.text_a2b2 : H.zapnuti.dual.text_jine, ram:H.zapnuti.pamet_dual, kind:'ok'};
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
  if(res.mon==='overheat'){ S.anim={kind:'nocool', t:0, res}; drawMonitor('boot'); buildPanel(H.spolecne.spousti,'info'); return; }
  drawMonitor(res.mon);
  buildPanel(res.title+'. '+res.msg, 'err');
}

export { goBuild, buildPanel, toggleHints, evaluate, pressPower };
