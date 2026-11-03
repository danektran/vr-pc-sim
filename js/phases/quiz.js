// 3. Opakování: otázky s vysvětlením.
// Pořadí odpovědí se u každé otázky náhodně zamíchá (?michat=ne vypne). Pořadí otázek se nemíchá, aby sloupec
// odpovedi (1/0 po otázkách) zůstal srovnatelný. V logu je u odpovědi původní číslo možnosti (a) i pozice na panelu (pozice).
import { log, S } from '../state.js';
import { shuffle } from '../helpers.js';
import { PARAMS } from '../config.js';
import { hideGhosts } from '../parts.js';
import { setPanel } from '../ui-panel.js';
import { goResults } from './results.js';
import { H, QUIZ, fill } from '../content.js';
import { sfx } from '../feedback.js';

/* ---------- quiz ---------- */
const SHUFFLE = PARAMS.get('michat') !== 'ne';
// order[q][pozice na panelu] = původní index možnosti
function goQuiz(){ S.phase='quiz'; S.t.quiz=performance.now(); S.quiz={i:0,score:0,answers:[], order:QUIZ.map(()=>SHUFFLE ? shuffle([0,1,2,3], Math.random) : [0,1,2,3])}; log('phase','quiz'); hideGhosts(); showQuestion(); }
function showQuestion(sel){
  const Q=QUIZ[S.quiz.i], answered = sel!=null, perm=S.quiz.order[S.quiz.i];
  const opt = (pos)=>{ const i=perm[pos]; return {label:Q.o[i], kind: answered ? (i===Q.c?'correct': i===sel?'wrong':'normal') : 'normal', disabled: answered && i!==Q.c && i!==sel, onClick: answered?null:()=>answer(i)}; };
  const rows = [[opt(0),opt(1)],[opt(2),opt(3)]];
  if(answered) rows.push([{label: S.quiz.i<QUIZ.length-1 ? H.opakovani.dalsi : H.opakovani.vysledky, kind:'primary', onClick:nextQuestion}]);
  setPanel({step:3, title:fill(H.opakovani.nadpis,{n:S.quiz.i+1, celkem:QUIZ.length}), body:Q.q,
    status: answered ? ((sel===Q.c?H.opakovani.spravne:H.opakovani.spatne)+' '+Q.e) : null, statusKind: answered ? (sel===Q.c?'ok':'err') : null, rows});
}
function answer(i){ const Q=QUIZ[S.quiz.i]; S.quiz.answers.push(i===Q.c?1:0); if(i===Q.c){ S.quiz.score++; sfx.correct(); } else sfx.wrong(); log('answer',{q:S.quiz.i,a:i,pozice:S.quiz.order[S.quiz.i].indexOf(i)}); showQuestion(i); }
function nextQuestion(){ if(S.quiz.i<QUIZ.length-1){ S.quiz.i++; showQuestion(); } else goResults(); }

export { QUIZ, goQuiz, showQuestion, answer, nextQuestion };
