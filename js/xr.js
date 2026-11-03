// Spuštění VR a smíšené reality, kontrola podpory WebXR.
import { $ } from './helpers.js';
import { log, S } from './state.js';
import { renderer, rig, setAR } from './scene.js';
import { PARAMS } from './config.js';
import { updateOrbit } from './interaction.js';
import { fill, H } from './content.js';

/* ---------- XR session ---------- */
let xrMode = null;
// Režim vsedě (?vsede=ano): pohled i ovladače se v brýlích zvednou o 40 cm. Sedící má oči zhruba o 40–45 cm níž
// než stojící, takže stůl, skříň i panel vidí a dosáhne na ně podobně jako vestoje. Na počítači se nic nemění.
const SEATED = PARAMS.get('vsede') === 'ano';
const SEATED_OFFSET = 0.4;
async function startXR(mode){
  try{
    const s = await navigator.xr.requestSession(mode, {optionalFeatures:['local-floor','bounded-floor']});
    renderer.xr.setReferenceSpaceType('local-floor');
    await renderer.xr.setSession(s);
    xrMode=mode; setAR(mode==='immersive-ar'); log('xr', mode);
    rig.position.y = SEATED ? SEATED_OFFSET : 0;
    $('overlay').hidden=true; $('hud').hidden=true; $('results').hidden=true;
    s.addEventListener('end', ()=>{ xrMode=null; rig.position.y = 0; setAR(false); updateOrbit(); if(S.phase==='results') $('results').hidden=false; $('hud').hidden=false; });
  }catch(err){ $('xrNote').textContent=fill(H.xr.chyba,{chyba:(err && err.message ? err.message : err)}); $('xrNote').className='note warn'; }
}
$('btnVR').onclick = ()=>startXR('immersive-vr');
$('btnAR').onclick = ()=>startXR('immersive-ar');
$('btnDesk').onclick = ()=>{ $('overlay').hidden=true; $('hud').hidden=false; };
$('btnMenu').onclick = ()=>{ $('overlay').hidden=false; $('hud').hidden=true; };
(async function checkXR(){
  const note=$('xrNote'); const framed = window.self!==window.top;
  if(!navigator.xr){ note.textContent = framed ? H.xr.v_ramu : H.xr.bez_webxr; return; }
  let vr=false, ar=false;
  try{ vr = await navigator.xr.isSessionSupported('immersive-vr'); }catch(e){}
  try{ ar = await navigator.xr.isSessionSupported('immersive-ar'); }catch(e){}
  $('btnVR').hidden=!vr; $('btnAR').hidden=!ar;
  if(vr){ $('btnDesk').classList.remove('primary'); note.textContent = ar ? H.xr.ar : H.xr.vr; }
  else note.textContent = framed ? H.xr.v_ramu : H.xr.bez_bryli;
  if(!vr) $('btnDesk').classList.add('primary');
})();

export { xrMode, startXR, SEATED };
