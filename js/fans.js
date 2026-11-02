// Ventilátory chladiče a grafické karty: točí se, když je počítač pod proudem (svítí LED napájení).
// Větrák chladiče jen když je chladič nasazený na procesoru, větráky grafiky jen když je karta ve slotu
// a má připojený napájecí kabel. Zjednodušení: skutečné karty se bez přídavného napájení chovají různě
// (některé větráky krátce roztočí), tady se netočí vůbec.
import { powerLedMat } from './scene.js';
import { parts } from './parts.js';

const SPEED = 16;   // rad/s, záměrně pomaleji než skutečnost, aby lopatky na obrazovce neblikaly
const RAMP = 2.5;   // jak rychle se roztáčí a dobíhá (1/s)

function spinPart(p, on, dt){
  const fans = p.obj.userData.fans; if(!fans) return;
  const ud = p.obj.userData;
  const target = on ? SPEED : 0;
  ud.fanSpeed = (ud.fanSpeed || 0) + (target - (ud.fanSpeed || 0)) * Math.min(1, RAMP * dt);
  if(ud.fanSpeed < 0.3 && !on){ ud.fanSpeed = 0; return; }   // dobíhání ukončit, ať se lopatky neplíží
  for(const f of fans) f.rotation.z -= ud.fanSpeed * dt;
}

function updateFans(dt){
  const powered = powerLedMat.emissive.getHex() !== 0;   // LED napájení svítí = počítač je pod proudem
  spinPart(parts.cooler, powered && parts.cooler.at === 'cooler', dt);
  spinPart(parts.gpu, powered && parts.gpu.at === 'gpu' && parts.cable.at === 'cable', dt);
}

export { updateFans };
