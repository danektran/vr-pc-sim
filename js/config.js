// Nastavení aplikace na jednom místě.

// Parametry v adrese (lze kombinovat):
//   ?start=hra      rovnou do hry
//   ?scenar=den1    pevný den, stejné zakázky pro všechny
//   ?napoveda=ne    bez žlutých obrysů a nápověd
//   ?skupina=AP-cv1 označení skupiny ve výsledcích
//   ?zvuk=ne        bez zvuků (vibrace ovladačů zůstávají)
//   ?michat=ne      odpovědi v opakování v pevném pořadí (jinak se míchají)
//   ?vsede=ano      režim vsedě: v brýlích se pohled zvedne o 40 cm
//   ?prenos=ano     hráč v brýlích vysílá svůj pohled pro diváka (kód se ukáže na úvodní kartě)
//   ?divak          stránka diváka: jen sleduje přenos, nic neodesílá
const PARAMS = new URLSearchParams(location.search);

// Odesílání výsledků do Google tabulky (skript je v apps-script/).
// Sem vložte adresu webové aplikace Google Apps Script (končí na /exec). Prázdná = nic se neodesílá.
const DATA_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwaAi41rmB0AJeYXD12gUGPt-pXVMdH_AiKox-O5xtFl7JryA6Kz3CD1ylKG0EJmWySOQ/exec';
// Musí se shodovat s KLIC ve skriptu Google Apps Script.
const DATA_KEY = 'vr-dilna';

// Adresa prostředníka přenosu (Cloudflare Worker, složka prenos/), např. 'wss://vr-dilna-prenos.xxx.workers.dev'.
// Prázdná = přenos je vypnutý, i když je v adrese ?prenos=ano.
const RELAY_URL = 'wss://vr-dilna-prenos.prenos.workers.dev';
// Stránka diváka (?divak): jen sleduje, nespouští hru a nic neodesílá.
const VIEWER = PARAMS.has('divak');

export { PARAMS, DATA_ENDPOINT, DATA_KEY, RELAY_URL, VIEWER };
