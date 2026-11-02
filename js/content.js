// Obsah aplikace (texty, otázky, poruchy, zákazníci, ceny) se načítá z JSON souborů ve složce data/.
// Ostatní moduly se spouštějí až po načtení (viz main.js), takže hodnoty níže jsou vždy vyplněné.

const FILES = ['dily', 'otazky', 'poruchy', 'zakaznici', 'obchod', 'hlasky'];

const DILY = {};        // klíč dílu -> {nazev, akuzativ?, popis}
const H = {};           // hlášky: H.uvod.nadpis, H.monitor.spoustim, …
const QUIZ = [];        // {q, o:[4 možnosti], c:index správné, e:vysvětlení}
const FAULTS = {};      // klíč poruchy -> {diag, quote, hint, fix}
const DISTRACT = [];    // rušivé diagnózy do výběru
const SYMPTOMS = {};    // co student uvidí po zapnutí ve hře
const CUSTOMERS = [];
const SHOP = [];        // {key, label, price, part, watt?, fixes}
let WORK = 0, BONUS = 0, START_CASH = 0, PER_DAY = 0;

// Doplní hodnoty do textu: fill('Prohlédnuto {n} z 8 dílů.', {n:3})
function fill(text, vars){ return String(text).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)); }

async function loadFile(name){
  const url = 'data/' + name + '.json';
  let res;
  try{ res = await fetch(url, {cache:'no-cache'}); }catch(e){ throw new Error('Nepodařilo se načíst ' + url + '. Aplikace musí běžet přes webový server, ne otevřením souboru z disku.'); }
  if(!res.ok) throw new Error('Nepodařilo se načíst ' + url + ' (chyba ' + res.status + ').');
  const text = await res.text();
  try{ return JSON.parse(text); }
  catch(e){ throw new Error('Chyba v souboru ' + url + ': ' + e.message + '. Zkontroluj čárky a uvozovky.'); }
}

function check(ok, msg){ if(!ok) throw new Error('Chyba v obsahu: ' + msg); }

async function loadContent(){
  const d = {};
  await Promise.all(FILES.map(async f => { d[f] = await loadFile(f); }));

  Object.assign(DILY, d.dily); delete DILY._poznamka;
  for(const k of ['board','cpu','cooler','ram','ssd','gpu','psu','cable']) check(DILY[k] && DILY[k].nazev && DILY[k].popis, 'v data/dily.json chybí díl „' + k + '“ s názvem a popisem.');

  d.otazky.otazky.forEach((o, i) => {
    check(Array.isArray(o.moznosti) && o.moznosti.length === 4, 'otázka ' + (i+1) + ' v data/otazky.json musí mít přesně 4 možnosti.');
    check(o.spravna >= 1 && o.spravna <= 4, 'otázka ' + (i+1) + ' v data/otazky.json: „spravna“ musí být číslo 1 až 4.');
    QUIZ.push({q:o.otazka, o:o.moznosti, c:o.spravna - 1, e:o.vysvetleni});
  });

  for(const [k, f] of Object.entries(d.poruchy.poruchy)) FAULTS[k] = {diag:f.diagnoza, quote:f.citace, hint:f.napoveda, fix:f.oprava};
  DISTRACT.push(...d.poruchy.rusive_diagnozy);
  Object.assign(SYMPTOMS, d.poruchy.priznaky);
  CUSTOMERS.push(...d.zakaznici.jmena);

  const o = d.obchod;
  for(const s of o.nabidka){ const item = {key:s.klic, label:s.nazev, price:s.cena, part:s.dil}; if(s.vykon_w) item.watt = s.vykon_w; item.fixes = s.opravuje ?? null; SHOP.push(item); }
  for(const k of ['ssd','psu650','psu850','cooler','ram','clean']) check(SHOP.some(s => s.key === k), 'v data/obchod.json chybí položka s klíčem „' + k + '“.');
  WORK = o.prace; BONUS = o.bonus_diagnoza_napoprve; START_CASH = o.pocatecni_pokladna; PER_DAY = o.zakazek_za_den;

  Object.assign(H, d.hlasky);
}

export { DILY, H, QUIZ, FAULTS, DISTRACT, SYMPTOMS, CUSTOMERS, SHOP, WORK, BONUS, START_CASH, PER_DAY, fill, loadContent };
