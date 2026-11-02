// Úvod: sestavený počítač na stole a rozcestník.
import { tweens } from '../helpers.js';
import { S } from '../state.js';
import { scene } from '../scene.js';
import { assembleAll, powerOff } from '../parts.js';
import { explodeLabels, setPanel } from '../ui-panel.js';
import { goTheory } from './theory.js';
import { goGame } from '../game/game.js';

/* ---------- phases ---------- */
function goIntro(){
  S.phase='intro'; S.exploded=false; explodeLabels.forEach(l=>scene.remove(l)); explodeLabels.length=0;
  tweens.length=0; assembleAll(); powerOff();
  setPanel({step:0, title:'Vítej v dílně',
    body:'Na stole stojí sestavený počítač. Projdeš výklad, stavbu a krátké opakování, pak tě čeká hra Den v PC dílně. Do hry můžeš skočit i rovnou.\nV brýlích ukaž paprskem z ovladače a stiskni spoušť. Díl uchopíš tak, že spoušť držíš. Na počítači klikni nebo táhni myší.',
    rows:[[{label:'Začít výklad', kind:'primary', onClick:goTheory}],[{label:'Rovnou do hry', onClick:goGame}]]});
}

export { goIntro };
