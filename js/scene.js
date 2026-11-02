// 3D scéna: renderer, kamera, světla, místnost, stůl, skříň s tlačítkem a monitor.
import { box, canvasTex, CASE_POS, COL, cyl, FONT, makeCanvas, mat, T, TABLE_Y, wrapLines } from './helpers.js';

/* ---------- renderer & scene ---------- */
const canvas = document.getElementById('scene');
const renderer = new T.WebGLRenderer({canvas, antialias:true, alpha:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = T.sRGBEncoding;
renderer.xr.enabled = true;

const scene = new T.Scene();
const BG = new T.Color(0x1e252d);
scene.background = BG;
const camera = new T.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.02, 50);
const rig = new T.Group(); rig.add(camera); scene.add(rig);

scene.add(new T.HemisphereLight(0xf4f6ff, 0x3a3f48, 1.1));
const sun = new T.DirectionalLight(0xffffff, 0.9); sun.position.set(0.6, 2.4, 1.2); scene.add(sun);
const fill = new T.DirectionalLight(0xffe7c4, 0.35); fill.position.set(-1.5, 1.2, -0.5); scene.add(fill);

/* ---------- room ---------- */
const room = new T.Group(); scene.add(room);
(function buildRoom(){
  const floor = new T.Mesh(new T.CircleGeometry(4, 48), mat(COL.floor,{roughness:0.95}));
  floor.rotation.x = -Math.PI/2; room.add(floor);
  // pegboard wall
  const c = makeCanvas(1024,640), x = c.getContext('2d');
  x.fillStyle = '#2b3440'; x.fillRect(0,0,1024,640);
  x.fillStyle = '#1b2129';
  for(let i=16;i<1024;i+=32) for(let j=16;j<640;j+=32){ x.beginPath(); x.arc(i,j,3.2,0,Math.PI*2); x.fill(); }
  const wall = new T.Mesh(new T.PlaneGeometry(4,2.5), new T.MeshStandardMaterial({map:canvasTex(c), roughness:0.9}));
  wall.position.set(0,1.25,-1.3); room.add(wall);
  // a few tools on the pegboard as quiet set dressing
  const toolMat = mat(0x8a96a3,{metalness:0.5, roughness:0.4});
  box(0.02,0.22,0.01,toolMat,-0.9,1.55,-1.28,room); box(0.06,0.03,0.012,mat(COL.accent),-0.9,1.67,-1.28,room);
  box(0.018,0.18,0.01,toolMat,-0.78,1.53,-1.28,room); box(0.05,0.025,0.012,mat(0x3a6ea5),-0.78,1.63,-1.28,room);
  const reel = cyl(0.07,0.03,mat(0x2f6e4a),0.95,1.6,-1.27,room); reel.rotation.x=Math.PI/2;
})();

/* ---------- table ---------- */
(function buildTable(){
  const top = box(1.4,0.04,0.72,mat(COL.table,{roughness:0.8}),0,TABLE_Y-0.02,-0.56,scene);
  const edge = mat(COL.tableEdge);
  box(1.4,0.012,0.012,edge,0,TABLE_Y-0.034,-0.2,scene);
  const leg = mat(0x30363e,{metalness:0.4});
  for(const [lx,lz] of [[-0.65,-0.26],[0.65,-0.26],[-0.65,-0.86],[0.65,-0.86]]) box(0.04,TABLE_Y-0.04,0.04,leg,lx,(TABLE_Y-0.04)/2,lz,scene);
  top.userData.table = true;
})();

/* ---------- PC case (fixed) ---------- */
const pcCase = new T.Group(); pcCase.position.copy(CASE_POS); scene.add(pcCase);
const caseMat = mat(COL.metal,{metalness:0.45, roughness:0.5});
box(0.42,0.006,0.38,mat(0x3a4049,{metalness:0.4}),0,0.003,0,pcCase);
box(0.42,0.18,0.006,caseMat,0,0.09,-0.19,pcCase);          // back (I/O) wall
box(0.006,0.18,0.38,caseMat,-0.21,0.09,0,pcCase);          // tower top
box(0.006,0.18,0.38,caseMat,0.21,0.09,0,pcCase);           // tower bottom
box(0.42,0.05,0.006,caseMat,0,0.025,0.19,pcCase);          // low front lip
for(const [sx,sz] of [[-0.19,-0.13],[-0.19,0.07],[0.07,-0.13],[0.07,0.07],[-0.06,-0.13],[-0.06,0.07]]) cyl(0.004,0.006,mat(COL.gold,{metalness:0.7}),sx,0.009,sz,pcCase,8);
const powerBtnMat = mat(0x22272d,{emissive:0x000000});
const powerBtn = cyl(0.011,0.006,powerBtnMat,-0.15,0.026,0.195,pcCase); powerBtn.rotation.x=Math.PI/2;
const powerRing = new T.Mesh(new T.TorusGeometry(0.012,0.0018,8,32), mat(COL.accent,{emissive:COL.accent, emissiveIntensity:0.35}));
powerRing.position.set(-0.15,0.026,0.199); pcCase.add(powerRing);
const powerLedMat = mat(0x223322,{emissive:0x000000});
box(0.006,0.004,0.003,powerLedMat,-0.125,0.026,0.195,pcCase);
powerBtn.userData = {power:true};
// small sign next to the button
(function(){ const c=makeCanvas(256,64), x=c.getContext('2d'); x.fillStyle='rgba(0,0,0,0)'; x.clearRect(0,0,256,64); x.fillStyle='#f2c230'; x.font='700 34px '+FONT; x.fillText('Zapnout',8,44);
  const m=new T.Mesh(new T.PlaneGeometry(0.06,0.015), new T.MeshBasicMaterial({map:canvasTex(c), transparent:true})); m.position.set(-0.1,0.012,0.194); pcCase.add(m); })();

/* ---------- monitor ---------- */
const monitor = { canvas:makeCanvas(640,400) };
monitor.ctx = monitor.canvas.getContext('2d'); monitor.tex = canvasTex(monitor.canvas);
(function buildMonitor(){
  const g = new T.Group(); g.position.set(0.47,TABLE_Y,-0.83); g.rotation.y=-0.45; scene.add(g);
  const st = mat(0x24292f,{metalness:0.3});
  box(0.16,0.01,0.11,st,0,0.005,0,g); box(0.03,0.16,0.02,st,0,0.09,-0.02,g);
  box(0.4,0.25,0.018,mat(0x15181c),0,0.25,0,g);
  const screen = new T.Mesh(new T.PlaneGeometry(0.38,0.2375), new T.MeshBasicMaterial({map:monitor.tex, toneMapped:false}));
  screen.position.set(0,0.25,0.0095); g.add(screen);
})();
function drawMonitor(mode, d={}){
  const x = monitor.ctx, W=640, H=400;
  x.fillStyle = '#040506'; x.fillRect(0,0,W,H);
  x.textBaseline='alphabetic';
  if(mode==='black'){ x.fillStyle='#4b5560'; x.font='400 22px '+FONT; x.fillText('Žádný signál', W/2-62, H-30); }
  if(mode==='boot' || mode==='overheat'){
    x.fillStyle='#c8d2dc'; x.font='400 24px '+FONT;
    x.fillText('Spouštím…', 40, 60); x.fillText('Test paměti: OK', 40, 96); x.fillText('Grafika: OK', 40, 132);
    if(d.line){ x.fillStyle='#f2c230'; x.fillText(d.line, 40, 168); }
    if(mode==='overheat'){
      const t = d.temp||40; const r = Math.min(1,(t-40)/60);
      x.font='700 96px '+FONT; x.fillStyle = `rgb(${Math.round(242+13*r)},${Math.round(194-140*r)},${Math.round(48-10*r)})`;
      x.fillText(Math.round(t)+' °C', 40, 290);
      x.font='400 24px '+FONT; x.fillStyle='#9fb0c0'; x.fillText('Teplota procesoru', 44, 330);
    }
  }
  if(mode==='shutdown'){ x.fillStyle='#e5534b'; x.font='700 30px '+FONT; x.fillText('Počítač se vypnul', 40, 80); x.fillStyle='#9fb0c0'; x.font='400 24px '+FONT; x.fillText('Ochrana proti přehřátí procesoru', 40, 120); }
  if(mode==='bios'){
    x.fillStyle='#0d2a4a'; x.fillRect(0,0,W,H); x.fillStyle='#f2c230'; x.font='700 30px '+FONT; x.fillText('Nastavení UEFI (BIOS)', 40, 64);
    x.fillStyle='#e6edf3'; x.font='400 24px '+FONT; wrapLines(x,'Nenalezeno zaváděcí zařízení. Vlož disk s operačním systémem a restartuj počítač.',560).forEach((l,i)=>x.fillText(l,40,120+i*34));
  }
  if(mode==='ok'){
    x.fillStyle='#13344d'; x.fillRect(0,0,W,H); x.fillStyle='#3fbf7f'; x.font='700 36px '+FONT; x.fillText('Systém naběhl', 40, 72);
    x.fillStyle='#e6edf3'; x.font='400 24px '+FONT;
    const lines = ['Procesor: v provozu, 45 °C', 'Paměť: '+d.ram, 'Grafika: připojena a napájena', 'Disk: SSD M.2, systém nalezen'];
    lines.forEach((l,i)=>x.fillText(l,40,130+i*40));
  }
  monitor.tex.needsUpdate = true;
}
drawMonitor('off');

function setAR(on){ room.visible=!on; scene.background = on ? null : BG; renderer.setClearColor(0x000000, on?0:1); }

export { canvas, renderer, scene, BG, camera, rig, sun, fill, room, pcCase, caseMat, powerBtnMat, powerBtn, powerRing, powerLedMat, monitor, drawMonitor, setAR };
