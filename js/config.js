// Nastavení aplikace na jednom místě.

// Parametry v adrese (lze kombinovat):
//   ?start=hra      rovnou do hry
//   ?scenar=den1    pevný den, stejné zakázky pro všechny
//   ?napoveda=ne    bez žlutých obrysů a nápověd
//   ?skupina=AP-cv1 označení skupiny ve výsledcích
const PARAMS = new URLSearchParams(location.search);

// Odesílání výsledků do Google tabulky (skript je v apps-script/).
// Sem vložte adresu webové aplikace Google Apps Script (končí na /exec). Prázdná = nic se neodesílá.
const DATA_ENDPOINT = '';
// Musí se shodovat s KLIC ve skriptu Google Apps Script.
const DATA_KEY = 'vr-dilna';

export { PARAMS, DATA_ENDPOINT, DATA_KEY };
