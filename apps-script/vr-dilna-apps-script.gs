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
