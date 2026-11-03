/**
 * Příjem výzkumných dat z aplikace „Sestav si PC – VR dílna“.
 * Vložte do Google tabulky přes Rozšíření → Apps Script a nasaďte jako webovou aplikaci.
 *
 * List „Souhrn“   – jeden řádek za každé odeslání (dokončené opakování nebo herní den).
 * List „Udalosti“ – jeden řádek za každou akci studenta (vložení dílu, zapnutí, diagnóza…).
 */

// Musí se shodovat s DATA_KEY v aplikaci. Chrání tabulku před náhodnými zápisy, nejde o heslo.
const KLIC = 'vr-dilna';
const LIST_SOUHRN = 'Souhrn';
const LIST_UDALOSTI = 'Udalosti';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.klic !== KLIC) return odpoved({ ok: false, chyba: 'klic' });

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const souhrn = data.souhrn || {};
    souhrn.prijato = new Date();

    // Souhrn: hlavička se doplňuje sama, když aplikace začne posílat nové sloupce.
    const sh = ss.getSheetByName(LIST_SOUHRN) || ss.insertSheet(LIST_SOUHRN);
    const hlavicka = sh.getLastRow() > 0 ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0] : [];
    Object.keys(souhrn).forEach(function (k) { if (hlavicka.indexOf(k) === -1) hlavicka.push(k); });
    sh.getRange(1, 1, 1, hlavicka.length).setValues([hlavicka]).setFontWeight('bold');
    sh.appendRow(hlavicka.map(function (h) { return souhrn[h] === undefined ? '' : souhrn[h]; }));

    // Události: jeden řádek za akci, čas v ms od začátku sezení.
    const lg = ss.getSheetByName(LIST_UDALOSTI) || ss.insertSheet(LIST_UDALOSTI);
    if (lg.getLastRow() === 0) {
      lg.appendRow(['kod_sezeni', 'kod_ucastnika', 'skupina', 'cas_ms', 'typ', 'detail']);
      lg.getRange(1, 1, 1, 6).setFontWeight('bold');
    }
    const radky = (data.udalosti || []).map(function (u) {
      return [souhrn.kod_sezeni || '', souhrn.kod_ucastnika || '', souhrn.skupina || '',
              u.t, u.type, u.detail === undefined ? '' : JSON.stringify(u.detail)];
    });
    if (radky.length) lg.getRange(lg.getLastRow() + 1, 1, radky.length, 6).setValues(radky);

    return odpoved({ ok: true });
  } catch (err) {
    return odpoved({ ok: false, chyba: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Kontrola v prohlížeči: otevřete adresu webové aplikace, měla by se ukázat zpráva níže.
function doGet() {
  return odpoved({ ok: true, zprava: 'Příjem dat z VR dílny běží.' });
}

function odpoved(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- Přehled pro vyučujícího ----------
 * List „Prehled“ se přepočítá při každém otevření tabulky a z nabídky VR dílna → Aktualizovat přehled.
 * Čte jen list „Souhrn“, nic v něm nemění. Odesílání dat (doPost) se tím nemění, nové nasazení není potřeba:
 * stačí skript vložit a uložit.
 */
const LIST_PREHLED = 'Prehled';

// Čitelné názvy pro přehled. Klíče odpovídají aplikaci; neznámý klíč se ukáže tak, jak je.
const NAZVY_PORUCH = {
  ram_loose: 'špatně zasunutá paměť', gpu_power: 'grafika bez napájení', ssd_dead: 'vadný disk',
  cooler: 'ucpaný chladič a pasta', psu_weak: 'slabý zdroj', single: 'paměti v jednom kanálu'
};
const NAZVY_CHYB = {
  bez_zdroje: 'bez zdroje', bez_desky: 'bez desky', bez_procesoru: 'bez procesoru', bez_ram: 'bez paměti',
  bez_grafiky: 'bez grafiky', grafika_bez_napajeni: 'grafika bez napájení', bez_chladice: 'bez chladiče',
  bez_disku: 'bez disku', single_channel: 'paměti v jednom kanálu'
};

function onOpen() {
  SpreadsheetApp.getUi().createMenu('VR dílna').addItem('Aktualizovat přehled', 'aktualizujPrehled').addToUi();
  try { aktualizujPrehled(); } catch (e) { /* prázdná tabulka apod. – přehled počká */ }
}

function aktualizujPrehled() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(LIST_SOUHRN);
  const radky = sh && sh.getLastRow() > 1 ? sh.getDataRange().getValues() : [];
  const tabulka = sestavPrehled(radky, new Date());
  const pr = ss.getSheetByName(LIST_PREHLED) || ss.insertSheet(LIST_PREHLED, 0);
  pr.clear();
  const sirka = Math.max.apply(null, tabulka.map(function (r) { return r.length; }));
  const vyplnene = tabulka.map(function (r) { const k = r.slice(); while (k.length < sirka) k.push(''); return k; });
  pr.getRange(1, 1, vyplnene.length, sirka).setValues(vyplnene);
  vyplnene.forEach(function (r, i) { if (r[0] && String(r[0]).indexOf('■') === 0) pr.getRange(i + 1, 1, 1, sirka).setFontWeight('bold').setBackground('#fff2cc'); });
  pr.getRange(1, 1).setFontSize(13);
  pr.autoResizeColumns(1, sirka);
}

// Čistý výpočet bez práce s tabulkou (jde otestovat i mimo Google). radky = hodnoty listu Souhrn včetně hlavičky.
function sestavPrehled(radky, ted) {
  const out = [['VR dílna – přehled pro vyučujícího', 'aktualizováno ' + Utilities_formatDate(ted)]];
  if (radky.length < 2) { out.push(['Zatím nejsou žádná data.']); return out; }
  const h = radky[0];
  const zaznamy = radky.slice(1).map(function (r) { const o = {}; h.forEach(function (k, i) { o[k] = r[i]; }); return o; })
    .filter(function (o) { return o.kod_sezeni && String(o.kod_ucastnika).toUpperCase().indexOf('TEST') !== 0; });

  // jedno sezení = poslední odeslaný řádek (data jsou kumulativní); opakování z řádku „opakovani_dokonceno“
  const posledni = {}, opak = {};
  zaznamy.forEach(function (o) {
    posledni[o.kod_sezeni] = o;
    if (o.udalost === 'opakovani_dokonceno') opak[o.kod_sezeni] = o;
  });
  const skupiny = {};
  Object.keys(posledni).forEach(function (k) { const s = posledni[k].skupina || '(bez skupiny)'; (skupiny[s] = skupiny[s] || []).push(k); });
  const nazvy = Object.keys(skupiny).sort();
  if (nazvy.length > 1) { skupiny['Všechny skupiny'] = Object.keys(posledni); nazvy.push('Všechny skupiny'); }

  nazvy.forEach(function (sk) {
    const kody = skupiny[sk];
    out.push([]);
    out.push(['■ ' + sk, kody.length + ' ' + sklonuj(kody.length, 'sezení', 'sezení', 'sezení')]);

    // Opakování
    const q = kody.map(function (k) { return opak[k]; }).filter(Boolean);
    if (q.length) {
      const prumer = q.reduce(function (a, o) { return a + Number(o.test_skore || 0); }, 0) / q.length;
      out.push(['Opakování', 'dokončilo ' + q.length + ', průměr ' + cislo(prumer) + ' z ' + (q[0].test_max || '?')]);
      // Tabulka převádí „0110101“ na číslo 110101 (ztratí úvodní nuly) – doplníme je zpět podle počtu otázek.
      q.forEach(function (o) { o.odpovedi = String(o.odpovedi === undefined ? '' : o.odpovedi); const m = Number(o.test_max) || 0; if (/^\d+$/.test(o.odpovedi) && o.odpovedi.length < m) o.odpovedi = o.odpovedi.padStart(m, '0'); });
      const pocet = Math.max.apply(null, q.map(function (o) { return o.odpovedi.length; }));
      const radek = ['  úspěšnost otázek (pořadí jako v data/otazky.json)'];
      for (let i = 0; i < pocet; i++) {
        const odp = q.map(function (o) { return String(o.odpovedi || '').charAt(i); }).filter(function (c) { return c === '0' || c === '1'; });
        const pct = odp.length ? Math.round(100 * odp.filter(function (c) { return c === '1'; }).length / odp.length) : '';
        radek.push((i + 1) + '. ' + pct + ' %' + (pct !== '' && pct < 60 ? ' ⚠' : ''));
      }
      out.push(radek);
    } else out.push(['Opakování', 'zatím nikdo nedokončil']);

    // Stavba
    const st = kody.map(function (k) { return posledni[k]; }).filter(function (o) { return o.pokusy_zapnuti !== '' && o.pokusy_zapnuti !== undefined && Number(o.pokusy_zapnuti) > 0; });
    if (st.length) {
      const chyby = {};
      st.forEach(function (o) { String(o.chyby_pri_zapnuti || '').split(' ').filter(String).forEach(function (c) { chyby[c] = (chyby[c] || 0) + 1; }); });
      const prum = function (pole) { return cislo(st.reduce(function (a, o) { return a + Number(o[pole] || 0); }, 0) / st.length); };
      out.push(['Stavba', 'pokusy o zapnutí: průměrně ' + prum('pokusy_zapnuti') + '; chyby v pořadí: průměrně ' + prum('chyby_poradi')]);
      out.push(['  nejčastější chyby při zapnutí'].concat(top(chyby, 4, NAZVY_CHYB, ' ×')));
    }

    // Hra
    const hr = kody.map(function (k) { return posledni[k]; }).filter(function (o) { return o.hra_zakazky; });
    if (hr.length) {
      // reputace se počítá z hvězd jednotlivých zakázek (sloupec hra_reputace může tabulka převést na datum)
      const por = {};
      let hvezdy = 0, zakazek = 0;
      hr.forEach(function (o) {
        String(o.hra_zakazky).split(' ').filter(String).forEach(function (z) {
          const p = z.split('/'); if (p.length < 4) return;   // den/porucha/hvězdy h/pokusy d/zbytečné z/čas s
          const f = p[1], pokusy = parseInt(p[3], 10) || 0;
          hvezdy += parseInt(p[2], 10) || 0; zakazek++;
          por[f] = por[f] || { n: 0, napoprve: 0 }; por[f].n++; if (pokusy === 0) por[f].napoprve++;
        });
      });
      out.push(['Hra', hr.length + ' ' + sklonuj(hr.length, 'hráč', 'hráči', 'hráčů') + ', průměrná spokojenost ' + (zakazek ? cislo(hvezdy / zakazek) : '–') + ' ★ (' + zakazek + ' ' + sklonuj(zakazek, 'zakázka', 'zakázky', 'zakázek') + ')']);
      const pr = Object.keys(por).map(function (f) { return { f: f, pct: Math.round(100 * por[f].napoprve / por[f].n), n: por[f].n }; })
        .sort(function (a, b) { return a.pct - b.pct; });
      out.push(['  diagnóza napoprvé (od nejhorší)'].concat(pr.map(function (x) {
        return (NAZVY_PORUCH[x.f] || x.f) + ': ' + x.pct + ' % z ' + x.n + (x.pct < 60 ? ' ⚠' : '');
      })));
    }
  });
  out.push([]);
  out.push(['⚠ = méně než 60 % správně, stojí za to probrat znovu. Řádky s kódem účastníka začínajícím TEST se nepočítají.']);
  return out;
}

function top(pocty, n, nazvy, pripona) {
  return Object.keys(pocty).sort(function (a, b) { return pocty[b] - pocty[a]; }).slice(0, n)
    .map(function (k) { return (nazvy[k] || k) + pripona + pocty[k]; });
}
function cislo(x) { return (Math.round(x * 10) / 10).toString().replace('.', ','); }
function sklonuj(n, jedna, dve, pet) { return n === 1 ? jedna : (n >= 2 && n <= 4 ? dve : pet); }
function Utilities_formatDate(d) {
  return typeof Utilities !== 'undefined' ? Utilities.formatDate(d, 'Europe/Prague', 'd. M. yyyy H:mm') : d.toISOString();
}
