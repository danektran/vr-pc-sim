// Úvod: sestavený počítač na stole a rozcestník.
import { tweens } from '../helpers.js';
import { S } from '../state.js';
import { scene } from '../scene.js';
import { assembleAll, powerOff } from '../parts.js';
import { explodeLabels, setPanel } from '../ui-panel.js';
import { goTheory } from './theory.js';
import { goGame } from '../game/game.js';
import { H } from '../content.js';

/* ---------- phases ---------- */
function goIntro(){
  S.phase='intro'; S.exploded=false; explodeLabels.forEach(l=>scene.remove(l)); explodeLabels.length=0;
  tweens.length=0; assembleAll(); powerOff();
  setPanel({step:0, title:H.uvod.nadpis,
    body:H.uvod.text,
    rows:[[{label:H.uvod.tlacitko_vyklad, kind:'primary', onClick:goTheory}],[{label:H.uvod.tlacitko_hra, onClick:goGame}]]});
}

export { goIntro };
