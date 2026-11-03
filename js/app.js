// Propojení modulů a vykreslovací smyčka. Spouští se z main.js až po načtení obsahu z data/.
import { $, stepTweens, T } from './helpers.js';
import { DATA_ENDPOINT, PARAMS } from './config.js';
import { PERF, S } from './state.js';
import { camera, drawMonitor, powerLedMat, powerRing, renderer, scene } from './scene.js';
import { ghostMat, setLeds } from './parts.js';
import { goIntro } from './phases/intro.js';
import { buildPanel } from './phases/build.js';
import { goGame, showStage } from './game/game.js';
import { flushQueue } from './data.js';
import { H } from './content.js';
import { updateCustomers } from './game/customer.js';
import { updatePaste } from './game/paste.js';
import { updateFans } from './fans.js';
import { updateLatches } from './latches.js';
import { applyHover, ctrl, desk, updateControllers, updateOrbit } from './interaction.js';

/* ---------- loop ---------- */
const clock = new T.Clock();
renderer.setAnimationLoop(()=>{
  const raw=clock.getDelta(), dt=Math.min(raw,0.05);
  // výkon v brýlích pro výzkumná data: snímky a pomalé snímky (delší než 1,5násobek 1/72 s)
  if(renderer.xr.isPresenting && raw<1){ PERF.frames++; PERF.time+=raw; if(raw>1.5/72) PERF.slow++; }
  stepTweens(dt);
  updateCustomers(dt);
  updatePaste(dt);
  updateFans(dt);
  updateLatches(dt);
  let hits;
  if(renderer.xr.isPresenting){ hits = updateControllers(); }
  else { for(const c of ctrl){ c.userData.dot.visible=false; } hits=[desk.drag?null:desk.hit]; }
  applyHover(hits);
  if(S.anim){
    const a=S.anim; a.t+=dt; const t=a.t;
    const cfg = a.kind==='psu' ? {t0:48, rate:2.5, end:3.4, line:H.monitor.zatez_grafiky} : a.kind==='hot' ? {t0:47, rate:14, end:4.9, line:H.monitor.zatez} : {t0:40, rate:19, end:4.2, line:null};
    if(t>=cfg.end){ S.anim=null; drawMonitor(a.kind==='psu'?'off':'shutdown'); powerLedMat.emissive.setHex(0x000000); setLeds(null);
      if(a.game) showStage(a.res.sym,'err'); else buildPanel(a.res.title+'. '+a.res.msg,'err'); }
    // monitor se překresluje jen 8× za sekundu: každé překreslení nahrává do grafiky celou texturu, na Questu drahé
    else if(t>=0.8){ const step=Math.floor((t-0.8)*8); if(step!==a.step){ a.step=step; drawMonitor('overheat',{temp:cfg.t0+step/8*cfg.rate, line:cfg.line}); } }
  }
  ghostMat.opacity = 0.22 + 0.14*Math.sin(performance.now()*0.005);
  powerRing.material.emissiveIntensity = S.phase==='build' ? 0.35+0.25*Math.sin(performance.now()*0.004) : 0.2;
  renderer.render(scene, camera);
});

/* ---------- start ---------- */
updateOrbit();
const fontReady = (document.fonts && document.fonts.load) ? Promise.all([document.fonts.load('700 40px "Atkinson Hyperlegible"'), document.fonts.load('400 30px "Atkinson Hyperlegible"')]) : Promise.resolve();
if(PARAMS.get('napoveda')==='ne'){ S.hints=false; S.hintsEverOff=true; }
if(DATA_ENDPOINT){ $('research').hidden=false; flushQueue(); }
const boot = ()=>{ goIntro(); if(PARAMS.get('start')==='hra') goGame(); };
Promise.race([fontReady, new Promise(r=>setTimeout(r,2500))]).then(boot).catch(boot);
