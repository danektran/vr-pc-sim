// Společný stav aplikace a log událostí pro výzkum.

/* ---------- state ---------- */
const S = {
  phase:'intro', exploded:false, hints:true, hintsEverOff:false, powered:false, busy:false, anim:null,
  seen:new Set(), t:{}, orderErrors:0, postAttempts:0, postFails:[], ramMode:'', success:false,
  quiz:{i:0, score:0, answers:[]}, code:'', log:[]
};
const installed = {}; // targetKey -> partId
const GAME = {loose:new Set(), cur:null, history:[], day:0, cash:5000, daysPlayed:0, queue:[], i:0, rnd:Math.random, dayStart:5000, dayLog:[], names:[]};
let logStart = performance.now();
// Nový začátek sezení: časy v logu se počítají znovu od nuly.
function resetLogClock(){ logStart = performance.now(); }
function log(type, detail){ S.log.push({t:Math.round(performance.now()-logStart), type, detail}); }

export { S, installed, GAME, logStart, resetLogClock, log };
