// Páčka patice procesoru a západky pamětí (jedna na levém konci každého slotu). Stav se odvozuje z toho, co je vložené:
// páčka je sklopená, když je v patici procesor; západky slotu zaklapnou, když je v něm modul pořádně zasunutý
// (u poruchy „špatně zasunutá paměť“ zůstávají otevřené, jako ve skutečnosti).
import { GAME, installed } from './state.js';
import { parts } from './parts.js';

const LEVER_OPEN = 1.4, LATCH_OPEN = 0.7;   // úhly v radiánech
const LEVER_TIME = 0.35, LATCH_TIME = 0.15; // s, jak dlouho trvá sklopení / zaklapnutí

function approach(cur, target, maxStep){ return cur + Math.max(-maxStep, Math.min(maxStep, target - cur)); }

function updateLatches(dt){
  const ud = parts.board.obj.userData;
  if(!ud.lever) return;
  const leverTarget = installed.cpu ? 0 : LEVER_OPEN;
  ud.lever.rotation.x = approach(ud.lever.rotation.x, leverTarget, LEVER_OPEN * dt / LEVER_TIME);
  for(const k in ud.latches){
    const id = installed[k], closed = id && !GAME.loose.has(id);
    for(const l of ud.latches[k]){
      const target = closed ? 0 : -l.userData.side * LATCH_OPEN;   // vyklopení ven od slotu
      l.rotation.z = approach(l.rotation.z, target, LATCH_OPEN * dt / LATCH_TIME);
    }
  }
}

export { updateLatches };
