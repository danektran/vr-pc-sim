// 3. Opakování: otázky s vysvětlením.
import { log, S } from '../state.js';
import { hideGhosts } from '../parts.js';
import { setPanel } from '../ui-panel.js';
import { goResults } from './results.js';

/* ---------- quiz ---------- */
const QUIZ = [
  {q:'Co se stane, když zapneš počítač bez chladiče procesoru?', o:['Počítač vůbec nezareaguje','Naběhne, ale po chvíli se přehřeje a vypne','Poběží normálně, jen hlučněji','Monitor zůstane černý kvůli grafice'], c:1, e:'Procesor bez chladiče dosáhne kritické teploty během několika sekund a ochrana počítač vypne.'},
  {q:'Máš dva moduly RAM a desku se sloty A1, A2, B1 a B2. Kam je vložíš?', o:['A1 a A2','A2 a B2','B1 a B2','Je to jedno, výkon bude stejný'], c:1, e:'Každý modul patří do jiného kanálu, pak paměť běží v režimu dual channel. Většina výrobců doporučuje A2 a B2.'},
  {q:'Proč potřebuje výkonná grafická karta samostatný napájecí kabel?', o:['Slot PCIe dodá nejvýš 75 W, karta potřebuje víc','Kabel přenáší obraz do monitoru','Bez kabelu karta nepozná, že je zapojená','Kabel slouží jen k uzemnění'], c:0, e:'Slot PCIe x16 dodá nejvýš 75 W. Výkonné karty berou několikanásobně víc, proto mají přídavné napájení ze zdroje.'},
  {q:'Počítač naběhne, ale hlásí, že nenašel zaváděcí zařízení. Co nejspíš chybí?', o:['Operační paměť','Disk s operačním systémem','Chladič','Grafická karta'], c:1, e:'Bez disku se systémem počítač doběhne jen do nastavení UEFI (BIOS).'},
  {q:'Který z těchto dílů vložíš do skříně jako první?', o:['Chladič','Operační paměť','Základní deska','Napájecí kabel grafiky'], c:2, e:'Procesor, paměti, SSD i grafika se zasouvají do desky, takže deska musí být ve skříni dřív. V praxi se procesor a RAM často osazují do desky ještě mimo skříň.'},
  {q:'K čemu slouží teplovodivá pasta?', o:['Lepí chladič k procesoru','Vyplňuje mikroskopické mezery a zlepšuje přenos tepla','Elektricky izoluje procesor','Chrání procesor před prachem'], c:1, e:'Povrchy procesoru a chladiče nejsou dokonale rovné. Pasta vyplní vzduchové mezery, které teplo vedou špatně.'},
  {q:'Ventilátory se točí, monitor je černý a na desce svítí kontrolka DRAM. Co zkontroluješ?', o:['Zdroj','Operační paměť','SSD disk','Chladič'], c:1, e:'Kontrolka DRAM upozorňuje na problém s operační pamětí: chybí, není správně zasunutá, nebo je vadná.'}
];
function goQuiz(){ S.phase='quiz'; S.t.quiz=performance.now(); S.quiz={i:0,score:0,answers:[]}; log('phase','quiz'); hideGhosts(); showQuestion(); }
function showQuestion(sel){
  const Q=QUIZ[S.quiz.i], answered = sel!=null;
  const opt = (i)=>({label:Q.o[i], kind: answered ? (i===Q.c?'correct': i===sel?'wrong':'normal') : 'normal', disabled: answered && i!==Q.c && i!==sel, onClick: answered?null:()=>answer(i)});
  const rows = [[opt(0),opt(1)],[opt(2),opt(3)]];
  if(answered) rows.push([{label: S.quiz.i<QUIZ.length-1 ? 'Další otázka' : 'Zobrazit výsledky', kind:'primary', onClick:nextQuestion}]);
  setPanel({step:3, title:'Otázka '+(S.quiz.i+1)+' z '+QUIZ.length, body:Q.q,
    status: answered ? ((sel===Q.c?'Správně. ':'Správná odpověď je zvýrazněná. ')+Q.e) : null, statusKind: answered ? (sel===Q.c?'ok':'err') : null, rows});
}
function answer(i){ const Q=QUIZ[S.quiz.i]; S.quiz.answers.push(i===Q.c?1:0); if(i===Q.c) S.quiz.score++; log('answer',{q:S.quiz.i,a:i}); showQuestion(i); }
function nextQuestion(){ if(S.quiz.i<QUIZ.length-1){ S.quiz.i++; showQuestion(); } else goResults(); }

export { QUIZ, goQuiz, showQuestion, answer, nextQuestion };
