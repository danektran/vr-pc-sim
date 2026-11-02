// Spuštění VR a smíšené reality, kontrola podpory WebXR.
import { $ } from './helpers.js';
import { log, S } from './state.js';
import { renderer, setAR } from './scene.js';
import { updateOrbit } from './interaction.js';

/* ---------- XR session ---------- */
let xrMode = null;
async function startXR(mode){
  try{
    const s = await navigator.xr.requestSession(mode, {optionalFeatures:['local-floor','bounded-floor']});
    renderer.xr.setReferenceSpaceType('local-floor');
    await renderer.xr.setSession(s);
    xrMode=mode; setAR(mode==='immersive-ar'); log('xr', mode);
    $('overlay').hidden=true; $('hud').hidden=true; $('results').hidden=true;
    s.addEventListener('end', ()=>{ xrMode=null; setAR(false); updateOrbit(); if(S.phase==='results') $('results').hidden=false; $('hud').hidden=false; });
  }catch(err){ $('xrNote').textContent='VR se nepodařilo spustit: '+(err && err.message ? err.message : err); $('xrNote').className='note warn'; }
}
$('btnVR').onclick = ()=>startXR('immersive-vr');
$('btnAR').onclick = ()=>startXR('immersive-ar');
$('btnDesk').onclick = ()=>{ $('overlay').hidden=true; $('hud').hidden=false; };
$('btnMenu').onclick = ()=>{ $('overlay').hidden=false; $('hud').hidden=true; };
(async function checkXR(){
  const note=$('xrNote'); const framed = window.self!==window.top;
  if(!navigator.xr){ note.textContent = framed ? 'VR tady není k dispozici. V prohlížeči brýlí otevři aplikaci na samostatné stránce.' : 'Tento prohlížeč nepodporuje WebXR. Otevři stránku v prohlížeči brýlí Meta Quest, nebo pokračuj na počítači.'; return; }
  let vr=false, ar=false;
  try{ vr = await navigator.xr.isSessionSupported('immersive-vr'); }catch(e){}
  try{ ar = await navigator.xr.isSessionSupported('immersive-ar'); }catch(e){}
  $('btnVR').hidden=!vr; $('btnAR').hidden=!ar;
  if(vr){ $('btnDesk').classList.remove('primary'); note.textContent = ar ? 'Ve smíšené realitě uvidíš kolem stolu skutečnou místnost.' : 'Připraveno. Postav se, stůl s počítačem bude před tebou.'; }
  else note.textContent = framed ? 'VR tady není k dispozici. V prohlížeči brýlí otevři aplikaci na samostatné stránce.' : 'VR brýle nejsou připojené. Aplikaci můžeš vyzkoušet na počítači.';
  if(!vr) $('btnDesk').classList.add('primary');
})();

export { xrMode, startXR };
