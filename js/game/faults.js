// Poruchy ve hře: nasazení poruchy, výměna dílů a vyhodnocení zapnutí.
import { tweens } from '../helpers.js';
import { GAME } from '../state.js';
import { scene } from '../scene.js';
import { buildPSU, partList, parts, setInstalled, uninstall } from '../parts.js';
import { evaluate } from '../phases/build.js';

function replacePart(id, watt){
  const p=parts[id]; if(p.at) uninstall(id); GAME.loose.delete(id);
  const old=p.obj; for(let i=tweens.length-1;i>=0;i--) if(tweens[i].obj===old) tweens.splice(i,1);
  scene.remove(old);
  const o = id==='psu' ? buildPSU(watt||650) : p.def.build(); o.userData.partId=id; scene.add(o);
  partList[partList.indexOf(old)] = o; p.obj=o; p.faulty=false; p.dirty=false;
  if(id==='psu') p.watt = watt||650;
  o.position.copy(p.homeP); o.quaternion.copy(p.homeQ);
}
function freshParts(){ for(const id in parts){ const p=parts[id]; if(p.faulty || p.dirty || (id==='psu' && p.watt!==650)) replacePart(id, 650); } }
function applyFault(f){
  if(f==='ram_loose'){ for(const id of ['ram1','ram2']){ GAME.loose.add(id); const o=parts[id].obj; o.position.y+=0.012; o.rotateX(0.14); } }
  if(f==='gpu_power'){ uninstall('cable'); const c=parts.cable; c.obj.position.copy(c.homeP); c.obj.quaternion.copy(c.homeQ); }
  if(f==='ssd_dead') parts.ssd.faulty=true;
  if(f==='cooler'){ parts.cooler.dirty=true; const seen=new Set(); parts.cooler.obj.traverse(m=>{ if(m.isMesh && m.material && m.material.color && !seen.has(m.material)){ seen.add(m.material); m.material.color.multiplyScalar(0.55); } }); }
  if(f==='psu_weak'){ uninstall('cable'); replacePart('psu',450); setInstalled('psu','psu',false); setInstalled('cable','cable',false); }
  if(f==='single'){ uninstall('ram1'); uninstall('ram2'); setInstalled('ram1','A1',false); setInstalled('ram2','A2',false); }
}
function gameEvaluate(){
  const base = evaluate();
  if(!base.ok){
    const sym = base.code==='bez_ram' ? 'Ventilátory se točí, monitor je černý a na desce svítí kontrolka DRAM.'
      : base.code==='grafika_bez_napajeni' ? 'Ventilátory se točí, monitor je černý a na desce svítí kontrolka VGA.'
      : base.title+'. '+base.msg;
    return Object.assign({}, base, {sym, anim: base.mon==='overheat' ? 'nocool' : null});
  }
  if(parts.ssd.faulty) return {code:'vadny_disk', mon:'bios', led:'BOOT', sym:'Počítač naběhl do nastavení UEFI s hlášením, že nenašel zaváděcí zařízení. Svítí kontrolka BOOT.'};
  if(parts.cooler.dirty) return {code:'ucpany_chladic', mon:'boot', anim:'hot', sym:'Počítač naběhl. Při zátěžovém testu teplota procesoru rychle stoupala a počítač se vypnul.'};
  if(parts.psu.watt<600) return {code:'slaby_zdroj', mon:'boot', anim:'psu', sym:'Počítač naběhl a teplota procesoru byla v normě. Při zátěžovém testu grafiky se ale náhle vypnul.'};
  if(base.ramMode==='single') return {ok:true, ramMode:'single', ram:base.ram, code:'single', sym:'Počítač funguje, ale systém hlásí, že paměť běží v režimu single channel.'};
  return {ok:true, ramMode:base.ramMode, ram:base.ram, code:'ok', sym:'Počítač naběhl a zátěžový test proběhl bez problémů.'};
}

export { replacePart, freshParts, applyFault, gameEvaluate };
