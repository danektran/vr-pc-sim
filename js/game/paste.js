// Animace „Vyčištění a pasta“: stříkačka nanese kapku teplovodivé pasty na procesor, stěrka ji roztáhne
// do tenké vrstvy a chladič na stole se mezitím očistí (zvedá se z něj prach, žebrování se rozjasní).
// Během animace je S.busy = true, takže nejde mačkat tlačítka ani brát díly.
import { T, box, cyl, mat } from '../helpers.js';
import { S } from '../state.js';
import { scene } from '../scene.js';
import { parts } from '../parts.js';

const DUR = 3.2;   // s, celá animace
const PASTE_COL = 0x8e949b;   // šedá jako běžná teplovodivá pasta
let anim = null;

// Kapka/vrstva pasty zůstává na procesoru (je vidět pod chladičem), odstraní se s dalším zákazníkem.
function clearPaste(){
  const cpu = parts.cpu.obj, old = cpu.getObjectByName('pasta');
  if(old){ cpu.remove(old); old.traverse(m => { if(m.isMesh){ m.geometry.dispose(); m.material.dispose(); } }); }
}

function buildSyringe(){
  const g = new T.Group();
  const body = cyl(0.007, 0.07, mat(0xe8edf2, {transparent:true, opacity:0.85, roughness:0.3}), 0, 0.05, 0, g, 12);
  cyl(0.0055, 0.06, mat(PASTE_COL), 0, 0.045, 0, g, 12);                 // pasta uvnitř
  const plunger = new T.Group(); plunger.position.y = 0.09; g.add(plunger);
  cyl(0.002, 0.04, mat(0x5a6470), 0, 0, 0, plunger, 8);
  cyl(0.009, 0.003, mat(0x5a6470), 0, 0.02, 0, plunger, 12);
  const tip = new T.Mesh(new T.ConeGeometry(0.004, 0.015, 10), mat(0xe8edf2)); tip.rotation.x = Math.PI; tip.position.y = 0.008; g.add(tip);
  g.userData.plunger = plunger; g.userData.body = body;
  return g;
}
function buildSpatula(){
  const g = new T.Group();
  box(0.034, 0.0015, 0.012, mat(0xc9d1d9, {metalness:0.6, roughness:0.3}), 0, 0, 0, g);   // plochá stěrka
  const handle = box(0.006, 0.006, 0.06, mat(0x2f6e4a), 0, 0.012, 0.035, g); handle.rotation.x = -0.35;
  return g;
}

function startPasteAnim(done){
  clearPaste();
  S.busy = true;
  const cpu = parts.cpu.obj;
  // kapka a vrstva jsou v souřadnicích procesoru (horní plocha je ve výšce 0,004 m)
  const holder = new T.Group(); holder.name = 'pasta'; cpu.add(holder);
  const blob = new T.Mesh(new T.SphereGeometry(0.006, 14, 10), mat(PASTE_COL, {roughness:0.55})); blob.position.y = 0.004; blob.scale.setScalar(0.001); holder.add(blob);
  const layer = box(0.03, 0.0007, 0.03, mat(PASTE_COL, {roughness:0.5}), 0, 0.0044, 0, holder); layer.scale.set(0.001, 1, 0.001);
  const syringe = buildSyringe(), spatula = buildSpatula();
  syringe.visible = spatula.visible = false; scene.add(syringe, spatula);

  // chladič na stole: ztmavíme ho a během animace vrátíme původní barvy
  const cooler = parts.cooler.obj, mats = [];
  cooler.traverse(m => { if(m.isMesh && m.material.color && !mats.some(x => x.m === m.material)) mats.push({m:m.material, clean:m.material.color.clone()}); });
  mats.forEach(x => x.m.color.copy(x.clean).multiplyScalar(0.55));
  const dust = [];
  const r = i => (Math.sin(i * 12.9898) * 43758.5453) % 1 + (Math.sin(i * 12.9898) < 0 ? 1 : 0);   // pevný „náhodný“ rozptyl, nemění Math.random
  for(let i = 0; i < 14; i++){
    const d = new T.Mesh(new T.SphereGeometry(0.005 + r(i)*0.004, 6, 4), mat(0x8a8f96, {transparent:true, opacity:0.8}));
    d.userData.v = new T.Vector3((r(i+20)-0.5)*0.12, 0.12 + r(i+40)*0.1, (r(i+60)-0.5)*0.12);
    d.userData.t0 = r(i+80)*1.2; d.visible = false; scene.add(d); dust.push(d);
  }
  anim = {t:0, cpu, blob, layer, syringe, spatula, cooler, mats, dust, done};
}

function finish(){
  const a = anim; anim = null;
  scene.remove(a.syringe, a.spatula, ...a.dust);
  for(const o of [a.syringe, a.spatula, ...a.dust]) o.traverse(m => { if(m.isMesh){ m.geometry.dispose(); m.material.dispose(); } });
  a.mats.forEach(x => x.m.color.copy(x.clean));
  a.blob.visible = false; a.layer.scale.set(1, 1, 1);
  S.busy = false;
  a.done();
}

const ease = k => k < 0.5 ? 2*k*k : 1 - Math.pow(-2*k + 2, 2)/2;
const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a)/(b - a)));

function updatePaste(dt){
  if(!anim) return;
  const a = anim; a.t += dt; const t = a.t;
  const top = a.cpu.localToWorld(new T.Vector3(0, 0.004, 0));

  // 1) stříkačka sjede nad procesor (0–0,6 s), vytlačí kapku (0,6–1,5 s) a odjede (1,5–1,9 s)
  const down = ease(seg(t, 0, 0.6)), up = ease(seg(t, 1.5, 1.9));
  a.syringe.visible = t < 1.9;
  a.syringe.position.set(top.x + 0.01, top.y + 0.004 + 0.12*(1 - down) + 0.12*up, top.z);
  a.syringe.rotation.z = 0.25;
  const push = seg(t, 0.6, 1.5);
  a.syringe.userData.plunger.position.y = 0.09 - 0.035*push;
  a.blob.scale.set(push, 0.55*push, push).addScalar(0.001);

  // 2) stěrka dvakrát přejede a kapka se roztáhne do vrstvy (1,9–2,9 s)
  const spread = seg(t, 1.9, 2.9);
  a.spatula.visible = t >= 1.8 && t < 3.0;
  a.spatula.position.set(top.x + Math.sin(spread*Math.PI*2)*0.012, top.y + 0.004 + (t < 1.9 || t > 2.9 ? 0.03 : 0), top.z - 0.004);
  if(spread > 0){
    a.blob.scale.set(1 + spread, Math.max(0.05, 0.55*(1 - spread)), 1 + spread);
    a.layer.scale.set(Math.max(0.001, spread), 1, Math.max(0.001, spread));
  }

  // 3) čištění chladiče: prach se zvedá a rozplývá, barvy se vracejí
  const clean = seg(t, 0.3, DUR - 0.2);
  a.mats.forEach(x => x.m.color.copy(x.clean).multiplyScalar(0.55 + 0.45*clean));
  const cpos = a.cooler.localToWorld(new T.Vector3(0, 0.08, 0));
  for(const d of a.dust){
    const life = t - d.userData.t0;
    d.visible = life > 0 && life < 1.4;
    if(d.visible){ d.position.copy(cpos).addScaledVector(d.userData.v, life); d.material.opacity = 0.8*(1 - life/1.4); }
  }

  if(t >= DUR) finish();
}

export { startPasteAnim, updatePaste, clearPaste };
