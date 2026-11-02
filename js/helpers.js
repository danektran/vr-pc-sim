// Společné pomůcky: konstanty scény, tvorba materiálů a těles, kreslení do canvasu, animace přesunu, náhoda, formátování.

const T = THREE;
if(T.ColorManagement) T.ColorManagement.legacyMode = false;
const FONT = '"Atkinson Hyperlegible","Segoe UI",Roboto,Arial,sans-serif';
const COL = {
  wall:0x2b3440, peg:0x222a33, floor:0x1b2026, table:0xc9a878, tableEdge:0x9c7b50,
  metal:0x434a54, metalLight:0x6b7480, pcb:0x1d6b47, black:0x1a1c1f, darkGrey:0x2d3239,
  accent:0xf2c230, ok:0x3fbf7f, err:0xe5534b, alu:0xb9c0c8, copper:0xc07a45, ram:0x8c2f2f, gold:0xd4a73a
};
const TABLE_Y = 0.75;
const CASE_POS = new T.Vector3(0, TABLE_Y, -0.62);

const mat = (color, o={}) => new T.MeshStandardMaterial(Object.assign({color, roughness:0.7, metalness:0.1}, o));
function box(w,h,d,material,x=0,y=0,z=0,parent){ const m=new T.Mesh(new T.BoxGeometry(w,h,d), material); m.position.set(x,y,z); if(parent) parent.add(m); return m; }
function cyl(r,h,material,x=0,y=0,z=0,parent,seg=24){ const m=new T.Mesh(new T.CylinderGeometry(r,r,h,seg), material); m.position.set(x,y,z); if(parent) parent.add(m); return m; }
function makeCanvas(w,h){ const c=document.createElement('canvas'); c.width=w; c.height=h; return c; }
function canvasTex(c){ const t=new T.CanvasTexture(c); t.encoding=T.sRGBEncoding; t.anisotropy=4; return t; }
function roundRect(ctx,x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
function wrapLines(ctx,text,maxW){ const out=[]; for(const para of String(text).split('\n')){ const words=para.split(' '); let line=''; for(const w of words){ const t=line?line+' '+w:w; if(ctx.measureText(t).width>maxW && line){ out.push(line); line=w; } else line=t; } out.push(line); } return out; }

/* ---------- tweening ---------- */
const tweens = [];
function tweenTo(obj, p, q, dur=0.6, done){
  for(let i=tweens.length-1;i>=0;i--) if(tweens[i].obj===obj) tweens.splice(i,1);
  tweens.push({obj, p0:obj.position.clone(), q0:obj.quaternion.clone(), p1:p.clone(), q1:q.clone(), t:0, dur, done});
}
function stepTweens(dt){
  for(let i=tweens.length-1;i>=0;i--){ const w=tweens[i]; w.t+=dt; const k=Math.min(1,w.t/w.dur), e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
    w.obj.position.lerpVectors(w.p0,w.p1,e); w.obj.quaternion.copy(w.q0).slerp(w.q1,e);
    if(k>=1){ tweens.splice(i,1); if(w.done) w.done(); } }
}

function rngFrom(seed){ let a=seed>>>0; return ()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function shuffle(arr, rnd){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); const tmp=a[i]; a[i]=a[j]; a[j]=tmp; } return a; }
function fmtKc(n){ return Number(n||0).toLocaleString('cs-CZ')+' Kč'; }
function starStr(n){ return '★'.repeat(n)+'☆'.repeat(5-n); }
const $ = id=>document.getElementById(id);

export { T, FONT, COL, TABLE_Y, CASE_POS, mat, box, cyl, makeCanvas, canvasTex, roundRect, wrapLines, tweens, tweenTo, stepTweens, rngFrom, shuffle, fmtKc, starStr, $ };
