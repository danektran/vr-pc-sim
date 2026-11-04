// 1. Výklad: rozložení počítače a popisy dílů.
import { T, tweenTo } from '../helpers.js';
import { log, S } from '../state.js';
import { scene } from '../scene.js';
import { PART_DEFS, parts, setCableTube, uninstall } from '../parts.js';
import { explodeLabels, makeLabel, setPanel, updatePanel } from '../ui-panel.js';
import { goBuild } from './build.js';
import { makeCode } from '../data.js';
import { DILY, H, fill } from '../content.js';

function goTheory(){
  S.phase='theory'; S.t.theory=performance.now(); S.code = S.code || makeCode(); log('phase','theory');
  setPanel({step:1, title:H.vyklad.nadpis,
    body:H.vyklad.text,
    rows:[[{label:H.vyklad.tlacitko_rozlozit, kind:'primary', onClick:explode}]]});
}
// Popisky dílů v rozloženém výkladu (používá i přenos stavu pro diváka).
function showExplodeLabels(){
  if(explodeLabels.length) return;
  for(const d of PART_DEFS){ if(d.label==null) continue; const l=makeLabel(d.name,0.15); l.position.copy(parts[d.id].expP).add(new T.Vector3(0,d.label,0)); scene.add(l); explodeLabels.push(l); }
}
function clearExplodeLabels(){ explodeLabels.forEach(l=>scene.remove(l)); explodeLabels.length=0; }
function explode(){
  if(S.exploded) return; S.exploded=true; setCableTube(false);
  for(const id in parts){ const p=parts[id]; uninstall(id); tweenTo(p.obj, p.expP, p.expQ, 1.1); }
  setTimeout(()=>{ if(S.phase!=='theory') return; showExplodeLabels(); }, 1100);
  setPanel({step:1, title:H.vyklad.nadpis, body:H.vyklad.rozlozeno_text+' '+fill(H.vyklad.prohlednuto,{n:0}),
    rows:[[{label:H.vyklad.tlacitko_stavba, kind:'primary', onClick:goBuild}]]});
}
function showInfo(id){
  const d=parts[id].def; const key = d.txt||d.id; S.seen.add(key);
  updatePanel({title:d.name, body:DILY[key].popis+'\n\n'+fill(H.vyklad.prohlednuto,{n:S.seen.size})});
}

export { goTheory, explode, showInfo, showExplodeLabels, clearExplodeLabels };
