// 3D díly počítače: stavba modelů, cílová místa ve skříni, obrysy-nápovědy, vkládání a vyjímání.
import { box, canvasTex, CASE_POS, COL, cyl, FONT, makeCanvas, mat, T, TABLE_Y, tweenTo } from './helpers.js';
import { GAME, installed, S } from './state.js';
import { drawMonitor, powerLedMat, scene } from './scene.js';
import { DILY } from './content.js';

/* ---------- part builders (origin = bottom centre) ---------- */
const silk = '#e8efe9';
function buildBoard(){
  const g = new T.Group();
  const c = makeCanvas(580,460), x = c.getContext('2d');
  x.fillStyle='#1d6b47'; x.fillRect(0,0,580,460);
  x.strokeStyle='rgba(160,220,180,.22)'; x.lineWidth=2;
  for(let i=0;i<26;i++){ x.beginPath(); const y0=20+i*17; x.moveTo(10,y0); x.lineTo(150+((i*37)%120),y0); x.lineTo(190+((i*37)%120),y0+30); x.lineTo(560,y0+30); x.stroke(); }
  const px=(bx)=> (bx+0.145)/0.29*580, pz=(bz)=> (bz+0.115)/0.23*460;
  x.fillStyle=silk; x.font='700 22px '+FONT;
  x.fillText('CPU', px(-0.05)-22, pz(-0.05)-6);
  x.font='700 16px '+FONT;
  [['A1',0.045],['A2',0.055],['B1',0.068],['B2',0.078]].forEach(([n,z])=>x.fillText(n, px(0.022), pz(z)+6));
  x.font='700 18px '+FONT; x.fillText('M.2', px(0.045), pz(-0.074)); x.fillText('PCIEX16', px(0.085), pz(0.06));
  x.font='400 14px '+FONT; ['CPU','DRAM','VGA','BOOT'].forEach((n,i)=>x.fillText(n, px(0.118), pz(0.07+i*0.012)+5));
  x.font='700 20px '+FONT; x.fillText('ATX', px(0.09), pz(0.105));
  const top = new T.MeshStandardMaterial({map:canvasTex(c), roughness:0.6});
  const side = mat(0x174f36);
  const pcb = new T.Mesh(new T.BoxGeometry(0.29,0.003,0.23), [side,side,top,side,side,side]); pcb.position.y=0.0015; g.add(pcb);
  box(0.05,0.001,0.05,mat(0x9aa3ad,{metalness:0.6,roughness:0.3}),-0.05,0.0035,-0.02,g); // socket
  box(0.003,0.002,0.05,mat(0x9aa3ad,{metalness:0.6}),-0.077,0.004,-0.02,g);           // lever
  const slotA = mat(0x111214), slotB = mat(0x3a3f46);
  [[0.045,slotA],[0.055,slotB],[0.068,slotA],[0.078,slotB]].forEach(([z,m])=>box(0.135,0.007,0.006,m,-0.05,0.0065,z,g));
  box(0.024,0.004,0.006,mat(0x111214),0.03,0.005,-0.072,g);                              // M.2 connector
  cyl(0.002,0.004,mat(COL.gold,{metalness:0.7}),0.03,0.005,0.01,g,8);
  box(0.008,0.009,0.09,mat(0x111214),0.075,0.0075,0,g);                                  // PCIe slot
  const hs = mat(0x4a525c,{metalness:0.5,roughness:0.4});
  box(0.02,0.014,0.06,hs,-0.125,0.01,-0.02,g); box(0.06,0.014,0.018,hs,-0.05,0.01,-0.075,g);
  box(0.08,0.02,0.012,mat(0x8a939c,{metalness:0.5}),-0.08,0.013,-0.108,g);              // I/O
  box(0.03,0.012,0.03,hs,0.06,0.009,0.085,g);                                            // chipset
  const leds = {};
  ['CPU','DRAM','VGA','BOOT'].forEach((n,i)=>{ const m=mat(0x3a1414,{emissive:0x000000}); leds[n]=m; box(0.004,0.002,0.003,m,0.112,0.004,0.07+i*0.012,g); });
  g.userData.leds = leds;
  return g;
}
function buildCPU(){
  const g = new T.Group();
  box(0.04,0.0015,0.04,mat(0x2f6b45),0,0.00075,0,g);
  box(0.034,0.0025,0.034,mat(0xc3c9cf,{metalness:0.8,roughness:0.25}),0,0.00275,0,g);
  const tri = new T.Mesh(new T.CircleGeometry(0.004,3), new T.MeshBasicMaterial({color:COL.gold}));
  tri.rotation.x=-Math.PI/2; tri.rotation.z=Math.PI/4; tri.position.set(-0.0165,0.0017,0.0165); g.add(tri);
  return g;
}
function buildCooler(){
  const g = new T.Group();
  box(0.04,0.006,0.04,mat(COL.copper,{metalness:0.7,roughness:0.35}),0,0.003,0,g);
  for(const dx of [-0.012,0,0.012]) cyl(0.003,0.03,mat(COL.copper,{metalness:0.7}),dx,0.02,0,g,10);
  const finMat = mat(COL.alu,{metalness:0.6,roughness:0.35});
  for(let i=0;i<12;i++) box(0.1,0.0035,0.05,finMat,0,0.03+i*0.008,0,g);
  box(0.1,0.006,0.05,finMat,0,0.127,0,g);
  const fan = box(0.1,0.1,0.022,mat(0x23272c),0,0.077,0.036,g);
  const disc = cyl(0.044,0.004,mat(0x3a3f46),0,0.077,0.048,g); disc.rotation.x=Math.PI/2;
  const hub = cyl(0.014,0.006,mat(COL.accent),0,0.077,0.05,g); hub.rotation.x=Math.PI/2;
  return g;
}
function buildRAM(){
  const g = new T.Group();
  box(0.133,0.031,0.0012,mat(0x1f6e45),0,0.0155,0,g);
  const sp = mat(COL.ram,{metalness:0.4,roughness:0.45});
  box(0.125,0.024,0.0016,sp,0,0.018,0.0014,g); box(0.125,0.024,0.0016,sp,0,0.018,-0.0014,g);
  box(0.125,0.003,0.0014,mat(COL.gold,{metalness:0.8,roughness:0.3}),0,0.0015,0,g);
  return g;
}
function buildSSD(){
  const g = new T.Group();
  box(0.022,0.0015,0.08,mat(0x1d4f3a),0,0.00075,0,g);
  box(0.018,0.0015,0.012,mat(0x111214),0,0.0022,-0.02,g); box(0.018,0.0015,0.014,mat(0x111214),0,0.0022,0.005,g);
  const c = makeCanvas(64,256), x=c.getContext('2d'); x.fillStyle='#f2c230'; x.fillRect(0,0,64,256); x.fillStyle='#18222e'; x.font='700 20px '+FONT;
  x.save(); x.translate(40,200); x.rotate(-Math.PI/2); x.fillText('SSD 1 TB',0,0); x.restore();
  const lbl = new T.Mesh(new T.PlaneGeometry(0.016,0.05), new T.MeshBasicMaterial({map:canvasTex(c)}));
  lbl.rotation.x=-Math.PI/2; lbl.position.set(0,0.0031,0.012); g.add(lbl);
  return g;
}
function buildGPU(){
  const g = new T.Group();
  box(0.036,0.11,0.24,mat(COL.darkGrey,{metalness:0.35,roughness:0.5}),0,0.055,0,g);
  for(const z of [-0.055,0.06]){ const f=cyl(0.044,0.004,mat(0x14171a),-0.019,0.055,z,g); f.rotation.z=Math.PI/2; const h=cyl(0.012,0.006,mat(COL.accent),-0.021,0.055,z,g); h.rotation.z=Math.PI/2; }
  box(0.002,0.104,0.23,mat(0x50575f,{metalness:0.6}),0.019,0.055,0,g);
  box(0.002,0.009,0.07,mat(COL.gold,{metalness:0.8}),0,-0.004,0.01,g);
  box(0.04,0.12,0.002,mat(0x9aa3ad,{metalness:0.6}),0,0.055,-0.121,g);
  box(0.012,0.008,0.02,mat(0x111214),0,0.114,0.09,g);
  return g;
}
function buildPSU(w=650){
  const g = new T.Group();
  const c = makeCanvas(256,256), x=c.getContext('2d'); x.fillStyle='#1a1c1f'; x.fillRect(0,0,256,256);
  x.fillStyle='#f2c230'; x.fillRect(18,18,220,70); x.fillStyle='#18222e'; x.font='700 44px '+FONT; x.fillText(w+' W',48,70);
  x.fillStyle='#9fb0c0'; x.font='400 22px '+FONT; x.fillText('12 V  5 V  3,3 V',30,140); x.fillText('230 V AC',30,176);
  const top = new T.MeshStandardMaterial({map:canvasTex(c), roughness:0.6}); const s = mat(COL.black,{roughness:0.55});
  const b = new T.Mesh(new T.BoxGeometry(0.086,0.15,0.14), [s,s,top,s,s,s]); b.position.y=0.075; g.add(b);
  for(let i=0;i<3;i++) box(0.002,0.012,0.022,mat(0x0e0f10),-0.044,0.04+i*0.03,0.03,g);
  return g;
}
function buildCable(){
  const g = new T.Group();
  box(0.02,0.01,0.008,mat(0x111214),0,0.005,0,g);
  const c = cyl(0.0045,0.05,mat(0x16181b),0,0.035,0,g,10);
  return g;
}

/* ---------- part definitions ---------- */
const PART_DEFS = [
  {id:'board', name:DILY.board.nazev, build:buildBoard, targets:['board'], home:[-0.5,0,-0.62,0,0,0], explode:[-0.28,1.18,-0.52,1.15,0,0], label:0.24},
  {id:'cpu', name:DILY.cpu.nazev, build:buildCPU, targets:['cpu'], home:[-0.38,0,-0.32,0,0.3,0], explode:[-0.03,1.2,-0.58,1.15,0,0], label:0.08},
  {id:'cooler', name:DILY.cooler.nazev, build:buildCooler, targets:['cooler'], home:[-0.55,0,-0.35,0,0.4,0], explode:[0.15,1.16,-0.6,0,0,0], label:0.17},
  {id:'ram1', name:DILY.ram.nazev, build:buildRAM, targets:['A1','A2','B1','B2'], home:[-0.22,0.003,-0.27,-Math.PI/2,0,0], explode:[0.37,1.2,-0.58,0,0,0], label:0.12, txt:'ram'},
  {id:'ram2', name:DILY.ram.nazev, build:buildRAM, targets:['A1','A2','B1','B2'], home:[-0.22,0.003,-0.33,-Math.PI/2,0,0], explode:[0.37,1.24,-0.6,0,0,0], label:null, txt:'ram'},
  {id:'ssd', name:DILY.ssd.nazev, build:buildSSD, targets:['ssd'], home:[0.25,0,-0.3,0,0.5,0], explode:[-0.28,0.93,-0.54,1.15,0,0], label:0.1},
  {id:'gpu', name:DILY.gpu.nazev, build:buildGPU, targets:['gpu'], home:[0.45,0.019,-0.4,0,0,Math.PI/2], explode:[0.04,0.93,-0.6,0,Math.PI/2,0], label:0.15},
  {id:'psu', name:DILY.psu.nazev, build:buildPSU, targets:['psu'], home:[0.6,0,-0.55,0,0,0], explode:[0.30,0.92,-0.62,0.5,-0.3,0], label:0.2},
  {id:'cable', name:DILY.cable.nazev, build:buildCable, targets:['cable'], home:[0.27,0,-0.45,0,0,0], explode:[0.48,0.95,-0.6,0,0,0], label:0.1}
];
const TARGETS = {
  board:{pos:[-0.055,0.012,-0.03], req:[]},
  cpu:{pos:[-0.105,0.016,-0.05], req:['board']},
  cooler:{pos:[-0.105,0.0205,-0.05], req:['cpu']},
  A1:{pos:[-0.105,0.017,0.015], req:['board'], ram:'A'},
  A2:{pos:[-0.105,0.017,0.025], req:['board'], ram:'A'},
  B1:{pos:[-0.105,0.017,0.038], req:['board'], ram:'B'},
  B2:{pos:[-0.105,0.017,0.048], req:['board'], ram:'B'},
  ssd:{pos:[-0.025,0.0165,-0.06], req:['board']},
  gpu:{pos:[0.02,0.02,-0.04], req:['board']},
  psu:{pos:[0.16,0.006,-0.04], req:[]},
  cable:{pos:[0.02,0.132,0.05], req:['gpu','psu']}
};
const REQ_NAMES = {board:DILY.board.akuzativ, cpu:DILY.cpu.akuzativ, gpu:DILY.gpu.akuzativ, psu:DILY.psu.akuzativ};
for(const k in TARGETS){ const t=TARGETS[k]; t.world = new T.Vector3(...t.pos).add(CASE_POS); t.quat = new T.Quaternion(); }

const parts = {}; const partList = [];
for(const d of PART_DEFS){
  const o = d.build(); o.userData.partId = d.id; scene.add(o);
  const hp = new T.Vector3(d.home[0], TABLE_Y + d.home[1], d.home[2]);
  const hq = new T.Quaternion().setFromEuler(new T.Euler(d.home[3], d.home[4], d.home[5]));
  const ep = new T.Vector3(d.explode[0], d.explode[1], d.explode[2]);
  const eq = new T.Quaternion().setFromEuler(new T.Euler(d.explode[3], d.explode[4], d.explode[5]));
  const p = {def:d, obj:o, homeP:hp, homeQ:hq, expP:ep, expQ:eq, at:null};
  parts[d.id]=p; partList.push(o);
}
parts.psu.watt=650;
// ghosts for hints
const ghostMat = new T.MeshBasicMaterial({color:COL.accent, transparent:true, opacity:0.3, depthWrite:false});
const ghosts = {};
for(const k in TARGETS){
  const builder = k[0]==='A'||k[0]==='B' ? buildRAM : PART_DEFS.find(d=>d.targets[0]===k).build;
  const g = builder(); g.traverse(m=>{ if(m.isMesh) m.material = ghostMat; });
  g.position.copy(TARGETS[k].world); g.visible=false; scene.add(g); ghosts[k]=g;
}
let cableTube = null;
function setCableTube(on){
  if(cableTube){ scene.remove(cableTube); cableTube.geometry.dispose(); cableTube=null; }
  if(!on) return;
  const pts = [[0.118,0.11,0.0],[0.09,0.17,0.03],[0.04,0.18,0.055],[0.02,0.145,0.05]].map(a=>new T.Vector3(...a).add(CASE_POS));
  cableTube = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),24,0.0045,8,false), mat(0x16181b));
  scene.add(cableTube);
}

const isIn = id => !!parts[id].at;
const ramSlots = () => Object.keys(installed).filter(k=>k[0]==='A'||k[0]==='B');
function setInstalled(id, key, animate=true, done){
  const p=parts[id]; p.at=key; installed[key]=id;
  if(animate) tweenTo(p.obj, TARGETS[key].world, TARGETS[key].quat, 0.25, done); else { p.obj.position.copy(TARGETS[key].world); p.obj.quaternion.copy(TARGETS[key].quat); }
  if(id==='cable') setCableTube(true);
}
function uninstall(id){ const p=parts[id]; if(!p.at) return; delete installed[p.at]; p.at=null; if(id==='cable') setCableTube(false); }
function powerOff(){ S.powered=false; S.anim=null; powerLedMat.emissive.setHex(0x000000); setLeds(null); drawMonitor('off'); }
function setLeds(which){ const L=parts.board.obj.userData.leds; for(const k in L) L[k].emissive.setHex(k===which?0xff2a1a:0x000000); }
function assembleAll(){
  GAME.loose.clear();
  for(const id in parts) uninstall(id);
  const map = {board:'board',cpu:'cpu',cooler:'cooler',ram1:'A2',ram2:'B2',ssd:'ssd',gpu:'gpu',psu:'psu',cable:'cable'};
  for(const id in map) setInstalled(id, map[id], false);
}

function showGhosts(id){ if(!S.hints) return; for(const k of parts[id].def.targets){ if(installed[k]) continue; if(TARGETS[k].req.every(r=>isIn(r))) ghosts[k].visible=true; } }
function hideGhosts(){ for(const k in ghosts) ghosts[k].visible=false; }

export { silk, buildBoard, buildCPU, buildCooler, buildRAM, buildSSD, buildGPU, buildPSU, buildCable, PART_DEFS, TARGETS, REQ_NAMES, parts, partList, ghostMat, ghosts, cableTube, setCableTube, isIn, ramSlots, setInstalled, uninstall, powerOff, setLeds, assembleAll, showGhosts, hideGhosts };
