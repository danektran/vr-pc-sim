// Ovládání: paprsky, uchopení a přichycení dílů, zvýraznění, ovladače XR a myš na počítači.
import { COL, cyl, mat, T, TABLE_Y, tweens, tweenTo } from './helpers.js';
import { GAME, installed, log, S } from './state.js';
import { camera, canvas, powerBtn, powerBtnMat, renderer, rig, scene } from './scene.js';
import { hideGhosts, isIn, PART_DEFS, partList, parts, powerOff, REQ_NAMES, setInstalled, showGhosts, TARGETS, uninstall } from './parts.js';
import { drawButton, panel, setHoverLabel } from './ui-panel.js';
import { showInfo } from './phases/theory.js';
import { pressPower } from './phases/build.js';
import { diagnosePanel, statusMsg } from './game/game.js';

/* ---------- interaction core ---------- */
const ray = new T.Raycaster(); const tmpM = new T.Matrix4(); const v3=new T.Vector3();
function raycastAll(){
  const list = [...panel.buttons, powerBtn, ...partList];
  const hits = ray.intersectObjects(list, true);
  for(const h of hits){
    let o=h.object; while(o && !o.userData.button && !o.userData.power && !o.userData.partId) o=o.parent;
    if(!o) continue;
    if(o.userData.partId && grabbedIds().includes(o.userData.partId)) continue;
    return {obj:o, point:h.point, distance:h.distance};
  }
  return null;
}
const grabbedIds = ()=> [ctrl[0]&&ctrl[0].userData.grab, ctrl[1]&&ctrl[1].userData.grab, desk.drag&&desk.drag.id].filter(Boolean);

function press(hit, source){
  if(!hit) return;
  const o=hit.obj;
  if(o.userData.button){ const s=o.userData.spec; if(!s.disabled && s.onClick && !S.busy) s.onClick(); return; }
  if(o.userData.power){ pressPower(); return; }
  if(o.userData.partId){
    const id=o.userData.partId;
    if(S.phase==='theory' && S.exploded){ showInfo(id); return; }
    if(S.phase==='build' || S.phase==='game') return tryGrab(id, source);
  }
}
function blockers(id){ // installed parts that depend on this one
  const out=[]; for(const k in installed){ const req=TARGETS[k].req; if(req.includes(id)) out.push(parts[installed[k]].def.name.toLowerCase()); }
  return [...new Set(out)];
}
function tryGrab(id, source){
  if(S.anim) return false;
  if(S.phase==='game' && (!GAME.cur || GAME.cur.stage!=='repair')){ if(GAME.cur && GAME.cur.stage==='diagnose') diagnosePanel('Skříň zatím neotvírej. Nejdřív počítač zapni, pozoruj příznaky a urči diagnózu.','info'); return false; }
  const p=parts[id];
  if(p.at){ const b=blockers(id); if(b.length){ statusMsg('Tenhle díl teď nejde vyjmout. Nejdřív vyjmi: '+b.join(', ')+'.','err'); return false; } uninstall(id); }
  GAME.loose.delete(id); if(GAME.cur) GAME.cur.works=false;
  log('remove',{part:id});
  if(S.powered || S.postFails.length || S.success || S.phase==='game'){ powerOff(); }
  for(let i=tweens.length-1;i>=0;i--) if(tweens[i].obj===p.obj) tweens.splice(i,1);
  showGhosts(id); setHoverLabel(null);
  if(source==='desk'){ desk.drag={id}; p.obj.quaternion.copy(TARGETS[p.def.targets[0]].quat); }
  else { source.attach(p.obj); source.userData.grab=id; }
  return true;
}
function release(id, mode){
  const p=parts[id]; hideGhosts();
  const pos=p.obj.position; let best=null, bd=1e9;
  for(const k of p.def.targets){ if(installed[k]) continue; const w=TARGETS[k].world;
    const d = mode==='vr' ? pos.distanceTo(w) : Math.hypot(pos.x-w.x, pos.z-w.z);
    if(d<bd){ bd=d; best=k; } }
  const thr = mode==='vr' ? 0.09 : 0.07;
  if(best && bd<thr){
    const miss = TARGETS[best].req.filter(r=>!isIn(r));
    if(miss.length){ S.orderErrors++; log('order_error',{part:id, missing:miss});
      statusMsg('Tady to zatím nepůjde. Nejdřív vlož '+miss.map(m=>REQ_NAMES[m]).join(' a ')+'. Díl se vrátil na stůl.','err');
      tweenTo(p.obj,p.homeP,p.homeQ,0.5); return; }
    setInstalled(id,best,true); log('install',{part:id, slot:best});
    const left = PART_DEFS.filter(d=>!parts[d.id].at).length;
    statusMsg(p.def.name+(best[0]==='A'||best[0]==='B'?' ve slotu '+best:'')+' je na místě. '+(S.phase==='game' ? 'Zkus počítač zapnout.' : left ? 'Na stole zbývá dílů: '+left+'.' : 'Všechny díly jsou ve skříni. Zkus počítač zapnout.'),'ok');
  } else {
    tweenTo(p.obj,p.homeP,p.homeQ,0.5);
  }
}
/* ---------- hover feedback ---------- */
let hoveredButtons = new Set();
function applyHover(hits){
  const next = new Set(); let partHit=null;
  for(const h of hits){ if(!h) continue; if(h.obj.userData.button) next.add(h.obj); else if(h.obj.userData.partId && !partHit) partHit=h; else if(h.obj.userData.power) next.add(h.obj); }
  for(const b of hoveredButtons) if(!next.has(b)){ if(b.userData.button){ b.userData.hover=false; drawButton(b); } else powerBtnMat.emissive.setHex(0x000000); }
  for(const b of next) if(!hoveredButtons.has(b)){ if(b.userData.button){ b.userData.hover=true; drawButton(b); } else powerBtnMat.emissive.setHex(0x554410); }
  hoveredButtons = next;
  const canLabel = (S.phase==='build' || S.phase==='intro' || S.phase==='game') && grabbedIds().length===0;
  if(partHit && canLabel){ const p=parts[partHit.obj.userData.partId]; const b=new T.Box3().setFromObject(p.obj);
    setHoverLabel(p.def.name + (S.phase==='build' && p.at && (p.at[0]==='A'||p.at[0]==='B') ? ' ('+p.at+')' : ''), new T.Vector3((b.min.x+b.max.x)/2, b.max.y+0.04, (b.min.z+b.max.z)/2)); }
  else setHoverLabel(null);
  canvas.style.cursor = (next.size || (partHit && (S.phase==='build' || S.exploded))) ? 'pointer' : 'default';
}

/* ---------- XR controllers ---------- */
const ctrl = [];
const rayGeo = new T.BufferGeometry().setFromPoints([new T.Vector3(0,0,0), new T.Vector3(0,0,-1)]);
for(let i=0;i<2;i++){
  const c = renderer.xr.getController(i);
  const line = new T.Line(rayGeo, new T.LineBasicMaterial({color:COL.accent, transparent:true, opacity:0.8}));
  line.scale.z = 2; c.add(line); c.userData.line=line;
  const dot = new T.Mesh(new T.SphereGeometry(0.006,12,8), new T.MeshBasicMaterial({color:COL.accent})); dot.visible=false; scene.add(dot); c.userData.dot=dot;
  c.addEventListener('selectstart', ()=>{ const h=c.userData.hit; if(h) press(h, c); });
  c.addEventListener('selectend', ()=>{ const id=c.userData.grab; if(id){ c.userData.grab=null; scene.attach(parts[id].obj); release(id,'vr'); } });
  c.addEventListener('connected', e=>{ c.userData.handed = e.data && e.data.handedness; });
  rig.add(c); ctrl.push(c);
  const grip = renderer.xr.getControllerGrip(i);
  const body = new T.Group();
  const b1 = cyl(0.016,0.1,mat(0x2a2f36,{roughness:0.5}),0,0,0.02,body,16); b1.rotation.x=Math.PI/2.6;
  const r1 = new T.Mesh(new T.TorusGeometry(0.04,0.006,8,24), mat(0x3a4049)); r1.position.set(0,0.035,-0.035); r1.rotation.x=Math.PI/3; body.add(r1);
  grip.add(body); rig.add(grip);
}
function updateControllers(){
  const hits=[];
  for(const c of ctrl){
    if(!renderer.xr.isPresenting){ c.userData.hit=null; continue; }
    tmpM.identity().extractRotation(c.matrixWorld);
    ray.ray.origin.setFromMatrixPosition(c.matrixWorld); ray.ray.direction.set(0,0,-1).applyMatrix4(tmpM);
    ray.far = 4;
    const h = c.userData.grab ? null : raycastAll();
    c.userData.hit=h; hits.push(h);
    c.userData.line.scale.z = h ? h.distance : 1.5; c.userData.line.visible = !c.userData.grab;
    c.userData.dot.visible = !!h; if(h) c.userData.dot.position.copy(h.point);
  }
  return hits;
}

/* ---------- desktop controls ---------- */
const desk = { drag:null, orbit:null, target:new T.Vector3(-0.2,1.0,-0.74), theta:0.06, phi:1.12, radius:1.15, mouse:new T.Vector2(), hit:null };
const dragPlane = new T.Plane(new T.Vector3(0,1,0), -(TABLE_Y+0.2));
function updateOrbit(){ const s=Math.sin(desk.phi); camera.position.set(desk.target.x+desk.radius*s*Math.sin(desk.theta), desk.target.y+desk.radius*Math.cos(desk.phi), desk.target.z+desk.radius*s*Math.cos(desk.theta)); camera.lookAt(desk.target); }
function setMouse(e){ const r=canvas.getBoundingClientRect(); desk.mouse.set(((e.clientX-r.left)/r.width)*2-1, -((e.clientY-r.top)/r.height)*2+1); ray.setFromCamera(desk.mouse, camera); ray.far=20; }
canvas.addEventListener('contextmenu', e=>e.preventDefault());
canvas.addEventListener('pointerdown', e=>{
  if(renderer.xr.isPresenting) return;
  canvas.setPointerCapture(e.pointerId); setMouse(e);
  if(e.button===0){
    const h=raycastAll();
    if(h && h.obj.userData.partId && (S.phase==='build' || S.phase==='game')){ if(tryGrab(h.obj.userData.partId,'desk')) moveDrag(); return; }
    if(h && (h.obj.userData.button || h.obj.userData.power || h.obj.userData.partId)){ press(h,'desk'); return; }
  }
  desk.orbit={x:e.clientX, y:e.clientY};
});
function moveDrag(){ const p=parts[desk.drag.id]; if(ray.ray.intersectPlane(dragPlane, v3)){ v3.x=Math.max(-0.68,Math.min(0.68,v3.x)); v3.z=Math.max(-0.9,Math.min(-0.2,v3.z)); p.obj.position.copy(v3); } }
canvas.addEventListener('pointermove', e=>{
  if(renderer.xr.isPresenting) return;
  setMouse(e);
  if(desk.drag){ moveDrag(); return; }
  if(desk.orbit){ desk.theta -= (e.clientX-desk.orbit.x)*0.005; desk.phi = Math.max(0.35,Math.min(1.5, desk.phi-(e.clientY-desk.orbit.y)*0.005)); desk.orbit={x:e.clientX,y:e.clientY}; updateOrbit(); return; }
  desk.hit = raycastAll();
});
canvas.addEventListener('pointerup', e=>{
  if(desk.drag){ const id=desk.drag.id; desk.drag=null; release(id,'desk'); }
  desk.orbit=null;
});
canvas.addEventListener('wheel', e=>{ e.preventDefault(); desk.radius=Math.max(0.4,Math.min(1.9, desk.radius*(1+Math.sign(e.deltaY)*0.08))); updateOrbit(); }, {passive:false});
window.addEventListener('resize', ()=>{ camera.aspect=window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });

export { ray, tmpM, v3, raycastAll, grabbedIds, press, blockers, tryGrab, release, hoveredButtons, applyHover, ctrl, rayGeo, updateControllers, desk, dragPlane, updateOrbit, setMouse, moveDrag };
