# Sestav si PC – VR dílna

Vzdělávací WebXR aplikace pro předmět **Architektura počítačů** (Ostravská univerzita, katedra ICT). Běží v prohlížeči brýlí Meta Quest (2, 3, 3S) bez instalace, záložně i na počítači v desktopovém režimu. Hostování: GitHub Pages, repozitář `vr-pc-sim`, vstupní soubor `index.html` v kořeni. Aplikace potřebuje webový server, otevření `index.html` přímo z disku nefunguje.

Autor a vyučující nejsou profesionální vývojáři. Vysvětluj změny srozumitelně, česky a bez zbytečného žargonu.

## Části aplikace

1. **Výklad**: sestavený počítač se rozloží do prostoru, výběrem dílu se zobrazí popis.
2. **Stavba**: student vkládá 9 dílů do skříně (deska, CPU, chladič, 2× RAM, SSD M.2, GPU, zdroj, napájecí kabel GPU). Hlídá se pořadí, po zapnutí se projeví chyby (diagnostické LED, černý monitor, přehřátí, UEFI bez disku, single channel).
3. **Opakování**: 7 otázek s vysvětlením, pořadí odpovědí se míchá.
4. **Hra Den v PC dílně**: 4 zákazníci za den, každý s jednou ze 6 poruch. Student zapne PC, pozoruje příznaky, určí diagnózu (4 možnosti), teprve pak opravuje, kupuje díly, předá zákazníkovi. Pokladna, hvězdy, reputace, souhrn dne.

Do hry lze vstoupit i přímo z úvodu. Podrobný herní návrh je v `docs/herni-navrh.md`, tam je i plán dalších fází.

## Struktura kódu

Nativní ES moduly bez build kroku. three.js se načítá jako UMD skript (globální `THREE`) před moduly. Původní verze v jednom souboru je pro porovnání v `legacy/index-v1.html`.

```
index.html              HTML kostra: úvodní karta, lišta, karta výsledků; načte three.js a js/main.js
css/style.css           styly HTML překryvu
data/                   obsah, který jde upravovat bez zásahu do kódu (viz níže)
js/main.js              start: načte data/*.json, pak spustí app.js; při chybě ji ukáže na úvodní kartě
js/app.js               propojení modulů, vykreslovací smyčka, start podle parametrů v adrese
js/content.js           načtení a kontrola obsahu z data/, funkce fill() pro doplnění {proměnných}
js/config.js            parametry z adresy (PARAMS), DATA_ENDPOINT, DATA_KEY
js/helpers.js           konstanty scény, tvorba těles a materiálů, kreslení do canvasu, animace přesunu
js/state.js             společný stav (S, GAME, installed) a log událostí log()
js/scene.js             renderer, kamera, místnost, stůl, skříň s tlačítkem, monitor (drawMonitor)
js/parts.js             3D modely dílů, cílová místa (TARGETS), obrysy-nápovědy, vkládání a vyjímání
js/ui-panel.js          3D panel s textem a tlačítky (setPanel), popisky dílů
js/interaction.js       paprsky, uchopení a přichycení dílů, zvýraznění, ovladače XR, myš na počítači
js/xr.js                spuštění VR a smíšené reality, kontrola podpory WebXR
js/fans.js              ventilátory chladiče a grafiky: točí se, když je počítač pod proudem a díl je zapojený
js/feedback.js          zvuky (generované Web Audio, bez souborů) a vibrace ovladačů; ?zvuk=ne vypne zvuk
js/latches.js           páčka patice (sklopí se po vložení CPU) a západky pamětí (zaklapnou po pořádném zasunutí)
js/data.js              výsledky sezení (resultData, gameFields), CSV, odesílání do Google tabulky
js/phases/              intro.js, theory.js (výklad), build.js (stavba + vyhodnocení zapnutí), quiz.js, results.js
js/game/                game.js (den, zákazníci, diagnóza, obchod, předání), faults.js (nasazení poruch, vyhodnocení),
                        customer.js (postavička zákazníka: přijde za stůl, mluví, po předání zajásá a odejde),
                        paste.js (animace „Vyčištění a pasta“: stříkačka, roztírání pasty, čištění chladiče)
```

Moduly se navzájem volají (panel → fáze → hra → panel). Funguje to, protože se importované funkce volají až za běhu; na nejvyšší úrovni modulu nevolej funkce z modulů, které se mohou načítat později. Importovanou proměnnou nejde přepsat z jiného modulu: pro nový začátek sezení slouží `resetLogClock()` a `resetSending()`.

## Obsah v data/

Texty, které vidí student, jsou v JSON souborech. Po úpravě stačí obnovit stránku.

| Soubor | Co obsahuje |
| --- | --- |
| `dily.json` | názvy a popisy dílů (výklad, popisky, hlášky o pořadí) |
| `otazky.json` | otázky opakování: vždy 4 možnosti, `spravna` = pořadí správné (1–4) |
| `poruchy.json` | poruchy ve hře (diagnóza, citace zákazníka a případně `citace_zena` pro zákaznici, nápověda, postup opravy), rušivé diagnózy, příznaky po zapnutí |
| `zakaznici.json` | zákazníci: jméno a `postava` (`muz` / `zena`), podle ní se zobrazí postavička a vybere citace |
| `obchod.json` | nabídka dílů a ceny, cena práce, bonus, počáteční pokladna, počet zakázek za den |
| `hlasky.json` | texty panelu, monitoru, výsledků a hlášky ovládání |

Pravidla:
- Klíče (`ram_loose`, `psu650`, `board`, …) nepřejmenovávej, jsou v kódu i ve výzkumných datech. Měň jen texty a čísla.
- Pořadí poruch a zákazníků neměň, ovlivňuje výběr zakázek ve scénáři (`?scenar=den1`).
- `{n}`, `{jmeno}` a podobné části v textech doplňuje aplikace, v textu je nech.
- JSON je přísný: texty v dvojitých uvozovkách, čárka mezi položkami, za poslední položkou čárka není. Při chybě aplikace na úvodní kartě napíše, ve kterém souboru a na kterém řádku chyba je.
- V kódu zůstaly jen technické popisky na 3D modelech (potisk desky, štítky SSD a zdroje) a chybová hláška pro případ, že se data nenačtou.

## Technická pravidla (neporušovat)

- **Bez build kroku.** Statické soubory, které GitHub Pages servíruje přímo. Žádný bundler, pokud se na tom výslovně nedohodneme.
- **three.js r147 jako UMD** z `https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js` (globální `THREE`). Nepřidávej `examples/jsm` doplňky (VRButton, controller modely, OrbitControls), aplikace má vlastní náhrady. Změnu verze three.js nejdřív navrhni.
- **Výkon na Questu:** 72 fps. Skutečné fps v brýlích se odesílají s daty (`fps_vr`, `pomale_snimky_vr_pct`). Canvas textury nepřekreslovat každý snímek (monitor při přehřátí 8× za s). Low-poly geometrie generovaná v kódu, žádné externí modely ani textury z jiných domén, žádné stíny ani post-processing. Text se kreslí do canvasu jako textura.
- **Ovládání:** paprsek z ovladače + spoušť (klik a držení = uchopení). Žádný plynulý pohyb joystickem (nevolnost). Desktop: myš (klik, tažení dílu, otáčení pohledu, kolečko).
- **Režimy XR:** `immersive-vr` a `immersive-ar` (smíšená realita na Questu 3, skryje místnost). Referenční prostor `local-floor`, stůl ve výšce 0,75 m, uživatel stojí (vsedě s `?vsede=ano` posun `rig` o 0,4 m nahoru, jen v XR).
- **Barvy:** `THREE.ColorManagement.legacyMode = false`, `renderer.outputEncoding = sRGBEncoding`, canvas textury v sRGB.
- **HTML překryv** (úvodní karta, lišta, výsledky) má barvy jako proměnné na `:root` se světlou i tmavou variantou.

## Obsah a jazyk

- Veškerý text v aplikaci je česky. Typografie: české uvozovky „ “, pomlčka – , nedělitelné mezery tam, kde je to přirozené. V kódu (JS, CSS) rovné uvozovky.
- Identifikátory v kódu anglicky nebo česky bez diakritiky, komentáře mohou být česky.
- Odborná přesnost je důležitější než efekt. Pokud něco zjednodušuješ (např. procesor bez integrované grafiky, propustnosti sběrnic), napiš to do komentáře v kódu a řekni mi o tom.
- Díly a ceny ve hře jsou smyšlené, bez značek výrobců.

## Data pro výzkum (nerozbít)

- Každé sezení má kód `VR-XXXX`, log událostí `S.log` (`{t, type, detail}`, čas v ms od začátku sezení).
- Přehled pro vyučujícího: list „Prehled“ v Google tabulce (funkce `aktualizujPrehled` v `apps-script/`), přepočítá se při otevření tabulky a z nabídky VR dílna. Čte jen list Souhrn; řádky s kódem účastníka začínajícím TEST vynechá.
- Výsledky: CSV ke stažení (oddělovač `;`, UTF-8 s BOM) a volitelně odeslání do Google tabulky (`DATA_ENDPOINT`, `DATA_KEY`; skript v `apps-script/`). Odesílá se jen se souhlasem účastníka.
- **Názvy sloupců v `resultData()` / `gameFields()` a typy událostí v logu neměň ani nepřejmenovávej**, navazují na ně už sebraná data. Nové sloupce a události přidávej, staré zachovej.
- Neukládej jména ani jiné osobní údaje. Kód účastníka je pseudonym.

## Parametry v adrese

`?start=hra` (rovnou do hry), `?scenar=den1` (pevný den, stejné zakázky pro všechny), `?napoveda=ne` (bez žlutých obrysů a nápověd), `?skupina=…` (označení skupiny do dat), `?zvuk=ne` (bez zvuků; vibrace ovladačů zůstávají), `?michat=ne` (odpovědi v opakování v pevném pořadí, jinak se u každého studenta míchají), `?vsede=ano` (režim vsedě: v brýlích se pohled i ovladače zvednou o 40 cm, na počítači beze změny). Lze kombinovat. Nové parametry dokumentuj sem.

## Jak pracovat

- U větších změn nejdřív navrhni plán a počkej na schválení.
- Postupuj po malých krocích, po každém funkčním kroku commit s českým popisem.
- Při refaktoringu neměň chování. Po změně ověř všechny čtyři části aplikace v desktopovém režimu.
- Nové závislosti (knihovny, služby) nejdřív navrhni a zdůvodni.

## Testování

- Lokálně: `npx http-server -p 8080 -c-1` (nebo `python3 -m http.server 8080`) a otevřít `http://localhost:8080` v prohlížeči.
- V brýlích bez nahrávání na GitHub: připojit Quest kabelem (vývojářský režim), spustit `adb reverse tcp:8080 tcp:8080` a v prohlížeči Questu otevřít `http://localhost:8080`. Localhost je zabezpečený kontext, takže WebXR funguje i bez HTTPS.
- Na počítači pomáhá rozšíření Immersive Web Emulator pro Chrome.
- Kontrolní seznam po změně: úvod se načte bez chyb v konzoli, výklad (rozložení, popisy), stavba (vložení všech dílů, chyba pořadí, zapnutí s chybou i bez), opakování (7 otázek, výsledky, CSV), hra (celý den se scénářem `den1`), přechod úvod → hra.
