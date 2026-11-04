// Snímek stavu scény pro přenos: captureState() ho čte v brýlích (hráč), applyState() ho použije u diváka.
// Klíče snímku jsou popsané v docs (formát zpráv); `d` obsahuje jen klíče, které se mají použít.
// Divák z toho nespouští herní logiku, jen přepíše vzhled scény a panelu.
import { T } from '../helpers.js';
import { GAME, installed, S } from '../state.js';
import { camera, drawMonitor, monitor, powerBtnMat, powerLedMat, renderer } from '../scene.js';
import { cableTube, ghosts, parts, setCableTube, setLeds } from '../parts.js';
import { drawButton, explodeLabels, hoverLabel, panel, setHoverLabel, setPanel } from '../ui-panel.js';
import { ctrl } from '../interaction.js';
import { arriveCustomer, avatars, removeAvatar } from '../game/customer.js';
import { hasPaste, pasteRunning, pasteTime, PASTE_DUR, setPasteTime, startPasteAnim, clearPaste } from '../game/paste.js';
import { applyFault, replacePart } from '../game/faults.js';
import { clearExplodeLabels, showExplodeLabels } from '../phases/theory.js';
import { packPose, q, serializePanel } from './protocol.js';

const POWER_BTN_HOVER = 0x554410;   // stejná barva jako v interaction.js (applyHover)
const POS_TOLERANCE = 0.05;         // m, o kolik se smí zákazník lišit, než ho srovnáme

const _p = new T.Vector3(), _q = new T.Quaternion(), _s = new T.Vector3();
function worldPose(obj){
  obj.updateWorldMatrix(true, false);
  obj.matrixWorld.decompose(_p, _q, _s);
  return packPose(_p, _q);
}

/* ---------- hráč: čtení stavu ---------- */
function captureController(i){
  const c = ctrl[i];
  if(!c || !renderer.xr.isPresenting) return null;
  c.matrixWorld.decompose(_p, _q, _s);
  const line = c.userData.line;
  return packPose(_p, _q).concat(line && line.visible ? q(line.scale.z) : 0);
}

function captureHover(){
  const out = []; let idx = 0;
  (panel.content.rows || []).forEach((row, ri) => row.forEach((_, ci) => {
    const b = panel.buttons[idx++];
    if(b && b.userData.hover) out.push([ri, ci]);
  }));
  return out;
}

function captureResults(){
  const card = document.getElementById('results');
  if(!card || card.hidden) return null;
  const rows = Array.from(document.getElementById('resTable').rows).map(tr => [tr.cells[0].textContent, tr.cells[1].textContent]);
  return {code: document.getElementById('resCode').textContent, rows};
}

function captureState(){
  const p = {};
  for(const id in parts) p[id] = worldPose(parts[id].obj);
  const leds = parts.board.obj.userData.leds;
  const ledOn = Object.keys(leds).find(k => leds[k].emissive.getHex() !== 0) || null;
  return {
    head: (camera.matrixWorld.decompose(_p, _q, _s), packPose(_p, _q)),
    c0: captureController(0),
    c1: captureController(1),
    p,
    inst: Object.assign({}, installed),
    loose: Array.from(GAME.loose),
    pled: powerLedMat.emissive.getHex(),
    leds: ledOn,
    ghosts: Object.keys(ghosts).filter(k => ghosts[k].visible),
    cable: cableTube ? 1 : 0,
    phase: S.phase,
    panel: serializePanel(panel.content),
    hov: captureHover(),
    pbtn: powerBtnMat.emissive.getHex() !== 0 ? 1 : 0,
    hl: hoverLabel.visible && hoverLabel.userData.text ? {text: hoverLabel.userData.text, pos: hoverLabel.position.toArray().map(q)} : null,
    xl: explodeLabels.length ? 1 : 0,
    mon: monitor.last ? {mode: monitor.last.mode, d: monitor.last.d} : {mode: 'off', d: {}},
    cust: avatars.map(a => ({
      name: a.name, body: a.bodyType, state: a.state, t: q(a.t), talk: q(a.talk),
      pos: [q(a.root.position.x), q(a.root.position.z)], ry: q(a.root.rotation.y),
    })),
    paste: pasteTime(),
    psu: parts.psu.watt,
    dirty: parts.cooler.dirty ? 1 : 0,
    res: captureResults(),
  };
}

/* ---------- divák: použití stavu ---------- */
// Cílové polohy: díly se k nim plynule přibližují ve stepTargets(), hlava a ovladače se jen uloží (pro avatara).
const targets = {parts: {}, head: null, c0: null, c1: null};
let seeded = false;            // první snímek s díly nastaví polohy rovnou
const snapNext = new Set();    // díly, které se právě vyměnily: příští krok je dá rovnou na cíl

function setTarget(id, a){
  const t = targets.parts[id] || (targets.parts[id] = {pos: new T.Vector3(), quat: new T.Quaternion()});
  t.pos.set(a[0], a[1], a[2]); t.quat.set(a[3], a[4], a[5], a[6]).normalize();   // po zaokrouhlení na 3 místa už není jednotkový a slerp by uvízl
  return t;
}

// Výměna dílu zruší jeho zařazení do skříně; divák ho má zachovat (vloženost řeší klíč `inst`).
function replaceKeepingSlot(id, watt){
  const p = parts[id], at = p.at;
  replacePart(id, watt);
  if(at){ p.at = at; installed[at] = id; }
  snapNext.add(id);
}

function applyState(d){
  if('phase' in d) S.phase = d.phase;

  if('psu' in d && d.psu !== parts.psu.watt) replaceKeepingSlot('psu', d.psu);
  if('dirty' in d){
    const want = !!d.dirty, cur = !!parts.cooler.dirty;
    if(want && !cur) applyFault('cooler');
    else if(!want && cur) replaceKeepingSlot('cooler');
  }

  if('inst' in d){
    for(const k of Object.keys(installed)) delete installed[k];
    for(const id in parts) parts[id].at = null;
    for(const k in d.inst){ installed[k] = d.inst[k]; if(parts[d.inst[k]]) parts[d.inst[k]].at = k; }
    const wantTube = Object.values(d.inst).includes('cable');
    if(wantTube !== !!cableTube) setCableTube(wantTube);
  }
  if('cable' in d && !!d.cable !== !!cableTube) setCableTube(!!d.cable);
  if('loose' in d){ GAME.loose.clear(); for(const id of d.loose) GAME.loose.add(id); }

  if('p' in d){
    for(const id in d.p){
      if(!parts[id]) continue;
      const t = setTarget(id, d.p[id]);
      if(!seeded || snapNext.has(id)){ parts[id].obj.position.copy(t.pos); parts[id].obj.quaternion.copy(t.quat); snapNext.delete(id); }
    }
    seeded = true;
  }
  if('head' in d) targets.head = d.head;
  if('c0' in d) targets.c0 = d.c0;
  if('c1' in d) targets.c1 = d.c1;

  if('panel' in d){
    const c = JSON.parse(JSON.stringify(d.panel));   // bez onClick: divák nic nespouští
    setPanel(c);
  }
  if('hov' in d){
    const on = new Set(d.hov.map(([r, c]) => {
      let idx = 0; const rows = panel.content.rows || [];
      for(let i = 0; i < r && i < rows.length; i++) idx += rows[i].length;
      return idx + c;
    }));
    panel.buttons.forEach((b, i) => { const h = on.has(i); if(b.userData.hover !== h){ b.userData.hover = h; drawButton(b); } });
  }
  if('pbtn' in d) powerBtnMat.emissive.setHex(d.pbtn ? POWER_BTN_HOVER : 0x000000);

  if('mon' in d) drawMonitor(d.mon.mode, d.mon.d || {});
  if('pled' in d) powerLedMat.emissive.setHex(d.pled);
  if('leds' in d) setLeds(d.leds);
  if('ghosts' in d){ const on = new Set(d.ghosts); for(const k in ghosts) ghosts[k].visible = on.has(k); }
  if('xl' in d){ if(d.xl) showExplodeLabels(); else clearExplodeLabels(); }
  if('hl' in d){ if(d.hl) setHoverLabel(d.hl.text, new T.Vector3(...d.hl.pos)); else setHoverLabel(null); }

  if('cust' in d){
    // zákazníci se párují podle jména (jména v data/zakaznici.json jsou jedinečná)
    const names = new Set(d.cust.map(c => c.name));
    for(const a of avatars.slice()) if(!names.has(a.name)) removeAvatar(a);
    for(const c of d.cust){
      let a = avatars.find(x => x.name === c.name);
      if(!a){ arriveCustomer(c.name, c.body, c.talk); a = avatars[avatars.length - 1]; }
      a.state = c.state; a.t = c.t; a.talk = c.talk;
      a.root.rotation.y = c.ry;
      if(Math.hypot(a.root.position.x - c.pos[0], a.root.position.z - c.pos[1]) > POS_TOLERANCE) a.root.position.set(c.pos[0], 0, c.pos[1]);
    }
  }

  if('paste' in d){
    const t = d.paste;
    if(typeof t === 'number'){
      // běží-li animace, srovná se čas; skončila-li (pasta zůstává na procesoru), nic se neděje; nová se rozjede
      if(!pasteRunning() && (!hasPaste() || t < PASTE_DUR - 0.01)) startPasteAnim(() => {});
      if(pasteRunning()) setPasteTime(t);
    } else {
      if(pasteRunning()) setPasteTime(PASTE_DUR);   // hráč už skončil, dokonči i zde
      else if(hasPaste()) clearPaste();
    }
  }
}

// Díly se plynule přibližují k cílům (exponenciální dohánění, nezávislé na fps).
function stepTargets(dt){
  const k = 1 - Math.exp(-dt * 15);
  for(const id in targets.parts){
    const o = parts[id] && parts[id].obj; if(!o) continue;
    const t = targets.parts[id];
    if(snapNext.has(id)){ o.position.copy(t.pos); o.quaternion.copy(t.quat); snapNext.delete(id); continue; }
    o.position.lerp(t.pos, k); o.quaternion.slerp(t.quat, k);
  }
}

export { captureState, applyState, stepTargets, targets };
