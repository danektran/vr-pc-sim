// 1. Výklad: rozložení počítače a popisy dílů.
import { T, tweenTo } from '../helpers.js';
import { log, S } from '../state.js';
import { scene } from '../scene.js';
import { PART_DEFS, parts, setCableTube, uninstall } from '../parts.js';
import { explodeLabels, makeLabel, setPanel, updatePanel } from '../ui-panel.js';
import { goBuild } from './build.js';
import { makeCode } from '../data.js';

const TXT = {
  board:'Základní deska propojuje všechny díly počítače. Je na ní patice pro procesor, sloty pro paměti, konektor M.2 pro SSD a slot PCIe pro grafickou kartu. Do skříně se vkládá dřív než díly, které se do ní zasouvají.',
  cpu:'Procesor (CPU) vykonává instrukce programů. Do patice jde vložit jen jedním směrem, který určuje zlatá značka v rohu. Za provozu silně hřeje, proto potřebuje chladič.',
  cooler:'Chladič odvádí teplo z procesoru. Mezi procesor a chladič se nanáší teplovodivá pasta, která vyplní mikroskopické nerovnosti a zlepší přenos tepla. Bez chladiče se procesor přehřeje během několika sekund.',
  ram:'Operační paměť (RAM) uchovává data a programy, se kterými procesor právě pracuje. Po vypnutí se obsah ztratí. Dva moduly patří do dvou různých kanálů (obvykle sloty A2 a B2), pak paměť běží v rychlejším režimu dual channel.',
  ssd:'SSD disk ve formátu M.2 uchovává operační systém a data i po vypnutí. Zasouvá se přímo do desky a díky sběrnici PCIe je mnohem rychlejší než klasický pevný disk.',
  gpu:'Grafická karta (GPU) vytváří obraz pro monitor a zvládá velké množství paralelních výpočtů, třeba pro hry nebo umělou inteligenci. Zasouvá se do slotu PCIe x16. Výkonné karty potřebují přídavné napájení.',
  psu:'Zdroj (PSU) převádí střídavé napětí ze zásuvky na stejnosměrná napětí 12 V, 5 V a 3,3 V pro jednotlivé díly. Jeho výkon musí pokrýt spotřebu celé sestavy.',
  cable:'Napájecí kabel PCIe (8 pin) vede ze zdroje do grafické karty. Slot na desce dodá nejvýš 75 W, výkonná karta jich ale potřebuje několikanásobně víc.'
};
function goTheory(){
  S.phase='theory'; S.t.theory=performance.now(); S.code = S.code || makeCode(); log('phase','theory');
  setPanel({step:1, title:'Z čeho se skládá počítač',
    body:'Stiskni „Rozložit počítač“. Díly se rozloží do prostoru. Ukaž na kterýkoli z nich a vyber ho: tady se objeví jeho popis.',
    rows:[[{label:'Rozložit počítač', kind:'primary', onClick:explode}]]});
}
function explode(){
  if(S.exploded) return; S.exploded=true; setCableTube(false);
  for(const id in parts){ const p=parts[id]; uninstall(id); tweenTo(p.obj, p.expP, p.expQ, 1.1); }
  setTimeout(()=>{ if(S.phase!=='theory') return; for(const d of PART_DEFS){ if(d.label==null) continue; const l=makeLabel(d.name,0.15); l.position.copy(parts[d.id].expP).add(new T.Vector3(0,d.label,0)); scene.add(l); explodeLabels.push(l); } }, 1100);
  setPanel({step:1, title:'Z čeho se skládá počítač', body:'Ukaž na díl a vyber ho. Prohlédnuto 0 z 8 dílů.',
    rows:[[{label:'Pokračovat ke stavbě', kind:'primary', onClick:goBuild}]]});
}
function showInfo(id){
  const d=parts[id].def; const key = d.txt||d.id; S.seen.add(key);
  updatePanel({title:d.name, body:TXT[key]+'\n\nProhlédnuto '+S.seen.size+' z 8 dílů.'});
}

export { TXT, goTheory, explode, showInfo };
