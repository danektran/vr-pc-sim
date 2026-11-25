// Návrat na začátek z kterékoli fáze: malé tlačítko nad 3D panelem (ve VR i na počítači) a tlačítko v liště.
// První stisk žádá potvrzení, druhý do 4 s vrátí aplikaci na úvod. Rozdělané sezení se (se souhlasem) odešle
// s událostí „navrat_na_zacatek“ a pak začne nové sezení s novým kódem – pokusy se v datech nesmíchají.
import { $ } from './helpers.js';
import { log, S } from './state.js';
import { renderer, scene } from './scene.js';
import { VIEWER } from './config.js';
import { H } from './content.js';
import { drawButton, panel, setHoverLabel } from './ui-panel.js';
import { hideGhosts, parts } from './parts.js';
import { ctrl, desk } from './interaction.js';
import { sendData } from './data.js';
import { restart } from './phases/results.js';

const CONFIRM_MS = 4000;
let timer = null;

function cancelBackConfirm(){ if(timer){ clearTimeout(timer); timer = null; } }

// Tlačítko pro setPanel(); na úvodu není (není kam se vracet). Divák ho vidí, ale bez onClick.
function backSpec(){
  if(S.phase === 'intro') return null;
  const spec = {label: H.navrat.tlacitko, back: true};
  if(!VIEWER) spec.onClick = ()=>pressBack(spec);
  return spec;
}

function relabel(spec, text){
  spec.label = text;
  const m = panel.buttons.find(b=>b.userData.spec === spec);
  if(m) drawButton(m);
}

function pressBack(spec){
  if(spec.label === H.navrat.potvrdit){ cancelBackConfirm(); goBackToStart(); return; }
  relabel(spec, H.navrat.potvrdit);
  cancelBackConfirm();
  timer = setTimeout(()=>{ timer = null; relabel(spec, H.navrat.tlacitko); }, CONFIRM_MS);
}

// Pustí díl držený myší nebo ovladačem; goIntro ho pak vrátí do sestaveného počítače.
function dropHeld(){
  desk.drag = null;
  for(const c of ctrl){
    if(!c || !c.userData.grab) continue;
    const held = parts[c.userData.grab] && parts[c.userData.grab].obj;
    if(held && held.parent === c) scene.attach(held);
    c.userData.grab = null;
  }
  hideGhosts(); setHoverLabel(null);
}

function goBackToStart(){
  log('navrat_na_zacatek', S.phase);
  sendData('navrat_na_zacatek');
  S.anim = null;   // jinak by smyčka v app.js po skončení animace přepsala úvodní panel
  dropHeld();
  restart();
  if(!renderer.xr.isPresenting){ $('overlay').hidden = false; $('hud').hidden = true; }
}

// Lišta na počítači: stejné potvrzení; na úvodu se karta ukáže hned.
const menuBtn = $('btnMenu');
let menuTimer = null; const menuLabel = menuBtn.textContent;
function resetMenu(){ if(menuTimer){ clearTimeout(menuTimer); menuTimer = null; } menuBtn.textContent = menuLabel; }
menuBtn.onclick = ()=>{
  if(S.phase === 'intro'){ resetMenu(); $('overlay').hidden = false; $('hud').hidden = true; return; }
  if(menuTimer){ resetMenu(); goBackToStart(); return; }
  menuBtn.textContent = H.navrat.potvrdit;
  menuTimer = setTimeout(resetMenu, CONFIRM_MS);
};

export { backSpec, cancelBackConfirm, goBackToStart };
