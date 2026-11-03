// Nastavení aplikace na jednom místě.

// Parametry v adrese (lze kombinovat):
//   ?start=hra      rovnou do hry
//   ?scenar=den1    pevný den, stejné zakázky pro všechny
//   ?napoveda=ne    bez žlutých obrysů a nápověd
//   ?skupina=AP-cv1 označení skupiny ve výsledcích
const PARAMS = new URLSearchParams(location.search);

// Odesílání výsledků do Google tabulky (skript je v apps-script/).
// Sem vložte adresu webové aplikace Google Apps Script (končí na /exec). Prázdná = nic se neodesílá.
const DATA_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwaAi41rmB0AJeYXD12gUGPt-pXVMdH_AiKox-O5xtFl7JryA6Kz3CD1ylKG0EJmWySOQ/exec';
// Musí se shodovat s KLIC ve skriptu Google Apps Script.
const DATA_KEY = 'vr-dilna';

export { PARAMS, DATA_ENDPOINT, DATA_KEY };
