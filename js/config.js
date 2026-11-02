// Nastavení: parametry z adresy a odesílání výsledků do Google tabulky.

const PARAMS = new URLSearchParams(location.search);
/* ---------- research data ---------- */
// Sem vložte adresu webové aplikace Google Apps Script (končí na /exec). Prázdná = nic se neodesílá.
const DATA_ENDPOINT = '';
// Musí se shodovat s KLIC ve skriptu Google Apps Script.
const DATA_KEY = 'vr-dilna';

export { PARAMS, DATA_ENDPOINT, DATA_KEY };
