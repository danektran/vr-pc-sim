// Start aplikace: nejdřív načte obsah z data/*.json, pak spustí zbytek aplikace (app.js).
import { loadContent } from './content.js';

function showError(err){
  const note = document.getElementById('xrNote');
  note.textContent = 'Aplikaci se nepodařilo spustit. ' + (err && err.message ? err.message : err);
  note.className = 'note warn';
  document.querySelector('#overlay .btns').style.display = 'none';
  console.error(err);
}

// ready: splní se, až aplikace běží (používá ho i automatický test)
export const ready = loadContent().then(() => import('./app.js')).catch(err => { showError(err); throw err; });
