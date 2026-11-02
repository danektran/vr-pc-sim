// 3D panel s textem a tlačítky a plovoucí popisky dílů.
import { canvasTex, FONT, makeCanvas, roundRect, T, wrapLines } from './helpers.js';
import { canvas, scene } from './scene.js';
import { H as HL } from './content.js';

/* ---------- labels ---------- */
function makeLabel(text, w=0.17){
  const c=makeCanvas(512,112), x=c.getContext('2d');
  roundRect(x,4,4,504,104,22); x.fillStyle='rgba(24,34,46,.92)'; x.fill(); x.strokeStyle='#f2c230'; x.lineWidth=4; x.stroke();
  x.fillStyle='#eef2f5'; let fs=48; x.font=`700 ${fs}px ${FONT}`; while(x.measureText(text).width>470 && fs>24){ fs-=2; x.font=`700 ${fs}px ${FONT}`; }
  x.textAlign='center'; x.textBaseline='middle'; x.fillText(text,256,58);
  const s = new T.Sprite(new T.SpriteMaterial({map:canvasTex(c), depthTest:false, transparent:true}));
  s.scale.set(w, w*112/512, 1); s.renderOrder=10; return s;
}
const explodeLabels = [];
const hoverLabel = makeLabel(' '); hoverLabel.visible=false; scene.add(hoverLabel);
function setHoverLabel(text, pos){
  if(!text){ hoverLabel.visible=false; hoverLabel.userData.text=null; return; }
  if(hoverLabel.userData.text!==text){ const n=makeLabel(text); hoverLabel.material.map.dispose(); hoverLabel.material.map=n.material.map; hoverLabel.userData.text=text; }
  hoverLabel.position.copy(pos); hoverLabel.visible=true;
}

/* ---------- 3D panel UI ---------- */
const PW=0.86, PH=0.56, PPM=1200;
const panel = { group:new T.Group(), canvas:makeCanvas(Math.round(PW*PPM), Math.round(PH*PPM)), buttons:[], content:{} };
panel.ctx = panel.canvas.getContext('2d'); panel.tex = canvasTex(panel.canvas);
panel.group.position.set(-0.5,1.3,-0.88); panel.group.rotation.y = 0.5; scene.add(panel.group);
panel.mesh = new T.Mesh(new T.PlaneGeometry(PW,PH), new T.MeshBasicMaterial({map:panel.tex, transparent:true, toneMapped:false}));
panel.group.add(panel.mesh);
const BH=0.062, BG_=0.014, BM=0.03;

function drawPanel(){
  const x=panel.ctx, W=panel.canvas.width, H=panel.canvas.height, c=panel.content;
  x.clearRect(0,0,W,H);
  roundRect(x,3,3,W-6,H-6,30); x.fillStyle='#18222e'; x.fill(); x.strokeStyle='#2f3d4c'; x.lineWidth=4; x.stroke();
  // progress: three phases (a real sequence)
  const names=HL.panel.faze; const segW=(W-96)/3;
  if(c.topline){ x.fillStyle='#f2c230'; x.font=`700 28px ${FONT}`; x.fillText(c.topline,48,72); } else names.forEach((n,i)=>{ const done = c.step>i+1, cur=c.step===i+1;
    x.fillStyle = cur ? '#f2c230' : done ? '#5a7a62' : '#2f3d4c'; roundRect(x,48+i*segW,30,segW-12,10,5); x.fill();
    x.fillStyle = cur ? '#f2c230' : '#9fb0c0'; x.font=`${cur?700:400} 26px ${FONT}`; x.fillText((i+1)+'  '+n, 48+i*segW, 76); });
  x.fillStyle='#eef2f5'; x.font=`700 46px ${FONT}`; x.fillText(c.title||'',48,140);
  const rows = (c.rows||[]).length;
  const btnTopPx = H - (BM + rows*(BH+BG_))*PPM;
  let bottom = btnTopPx - 10;
  if(c.status){
    x.font=`700 28px ${FONT}`; const sl = wrapLines(x,c.status,W-140).slice(0,4); const sh = 26+sl.length*36;
    const sy = bottom - sh;
    const col = c.statusKind==='err' ? '#e5534b' : c.statusKind==='ok' ? '#3fbf7f' : '#f2c230';
    roundRect(x,48,sy,W-96,sh,14); x.fillStyle='rgba(255,255,255,0.05)'; x.fill(); x.fillStyle=col; x.fillRect(48,sy,8,sh);
    x.fillStyle=col; sl.forEach((l,i)=>x.fillText(l,74,sy+42+i*36));
    bottom = sy - 12;
  }
  x.fillStyle='#d5dde5'; let fs=31; x.font=`400 ${fs}px ${FONT}`;
  let lines = wrapLines(x,c.body||'',W-96);
  while(170 + lines.length*fs*1.38 > bottom && fs>22){ fs-=1; x.font=`400 ${fs}px ${FONT}`; lines=wrapLines(x,c.body||'',W-96); }
  lines.forEach((l,i)=>{ const y=180+i*fs*1.38; if(y<bottom) x.fillText(l,48,y); });
  panel.tex.needsUpdate=true;
}
function makeButton(spec, w){
  const cw=Math.round(w*PPM), ch=Math.round(BH*PPM), c=makeCanvas(cw,ch);
  const m = new T.Mesh(new T.PlaneGeometry(w,BH), new T.MeshBasicMaterial({map:canvasTex(c), transparent:true, toneMapped:false}));
  m.userData = {button:true, spec, canvas:c, hover:false};
  drawButton(m); return m;
}
function drawButton(m){
  const {canvas:c, spec, hover} = m.userData, x=c.getContext('2d'), W=c.width, H=c.height;
  x.clearRect(0,0,W,H);
  const k = spec.kind||'normal';
  let bg = '#26323f', fg='#eef2f5', border='#3c4b5b';
  if(k==='primary'){ bg='#f2c230'; fg='#18222e'; border='#f2c230'; }
  if(k==='correct'){ bg='#1f6b47'; border='#3fbf7f'; }
  if(k==='wrong'){ bg='#6b2724'; border='#e5534b'; }
  if(hover && !spec.disabled){ if(k==='primary'){ bg='#ffd75a'; } else { bg = k==='normal' ? '#34455a' : bg; border='#f2c230'; } }
  roundRect(x,3,3,W-6,H-6,16); x.fillStyle=bg; x.fill(); x.lineWidth=4; x.strokeStyle=border; x.stroke();
  x.globalAlpha = spec.disabled ? 0.4 : 1;
  let fs=30; x.font=`700 ${fs}px ${FONT}`; while(x.measureText(spec.label).width>W-36 && fs>18){ fs-=1; x.font=`700 ${fs}px ${FONT}`; }
  x.fillStyle=fg; x.textAlign='center'; x.textBaseline='middle'; x.fillText(spec.label,W/2,H/2+2); x.globalAlpha=1;
  m.material.map.needsUpdate=true;
}
function setPanel(c){
  panel.content = c;
  for(const b of panel.buttons){ panel.group.remove(b); b.geometry.dispose(); b.material.map.dispose(); b.material.dispose(); }
  panel.buttons = [];
  const rows = c.rows||[];
  rows.forEach((row,ri)=>{
    const fromBottom = rows.length-1-ri; const n=row.length;
    const w = (PW - 2*0.04 - (n-1)*0.016)/n;
    row.forEach((spec,ci)=>{
      const b = makeButton(spec, w);
      b.position.set(-PW/2+0.04 + w/2 + ci*(w+0.016), -PH/2 + BM + fromBottom*(BH+BG_) + BH/2, 0.002);
      panel.group.add(b); panel.buttons.push(b);
    });
  });
  drawPanel();
}
function updatePanel(patch){ Object.assign(panel.content, patch); drawPanel(); }

export { makeLabel, explodeLabels, hoverLabel, setHoverLabel, PW, PH, PPM, panel, BH, BG_, BM, drawPanel, makeButton, drawButton, setPanel, updatePanel };
