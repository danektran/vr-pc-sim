# Sestav si PC – VR dílna

Vzdělávací WebXR aplikace pro předmět **Architektura počítačů** (Ostravská univerzita, katedra ICT). Běží v prohlížeči brýlí Meta Quest (2, 3, 3S) bez instalace, záložně i na počítači v desktopovém režimu. Hostování: GitHub Pages, repozitář `vr-pc-sim`, soubor `index.html` v kořeni.

Autor a vyučující nejsou profesionální vývojáři. Vysvětluj změny srozumitelně, česky a bez zbytečného žargonu.

## Části aplikace

1. **Výklad**: sestavený počítač se rozloží do prostoru, výběrem dílu se zobrazí popis.
2. **Stavba**: student vkládá 9 dílů do skříně (deska, CPU, chladič, 2× RAM, SSD M.2, GPU, zdroj, napájecí kabel GPU). Hlídá se pořadí, po zapnutí se projeví chyby (diagnostické LED, černý monitor, přehřátí, UEFI bez disku, single channel).
3. **Opakování**: 7 otázek s vysvětlením.
4. **Hra Den v PC dílně**: 4 zákazníci za den, každý s jednou ze 6 poruch. Student zapne PC, pozoruje příznaky, určí diagnózu (4 možnosti), teprve pak opravuje, kupuje díly, předá zákazníkovi. Pokladna, hvězdy, reputace, souhrn dne.

Do hry lze vstoupit i přímo z úvodu. Podrobný herní návrh je v `docs/herni-navrh.md`, tam je i plán dalších fází.

## Současný stav kódu

Vše je v jednom souboru `index.html` (asi 1 100 řádků): HTML, CSS a jeden velký skript v IIFE. Sekce skriptu jsou oddělené komentáři `/* ---------- název ---------- */` (scéna, díly, panel UI, stav, fáze, vyhodnocení POST, kvíz, hra, výzkumná data, výsledky, interakce, ovladače XR, desktop, XR session, smyčka, start). První úkol je rozdělit kód do modulů, viz `docs/prvni-prompt.md`.

## Technická pravidla (neporušovat)

- **Bez build kroku.** Statické soubory, které GitHub Pages servíruje přímo. Žádný bundler, pokud se na tom výslovně nedohodneme.
- **three.js r147 jako UMD** z `https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js` (globální `THREE`). Nepřidávej `examples/jsm` doplňky (VRButton, controller modely, OrbitControls), aplikace má vlastní náhrady. Změnu verze three.js nejdřív navrhni.
- **Výkon na Questu:** 72 fps. Low-poly geometrie generovaná v kódu, žádné externí modely ani textury z jiných domén, žádné stíny ani post-processing. Text se kreslí do canvasu jako textura.
- **Ovládání:** paprsek z ovladače + spoušť (klik a držení = uchopení). Žádný plynulý pohyb joystickem (nevolnost). Desktop: myš (klik, tažení dílu, otáčení pohledu, kolečko).
- **Režimy XR:** `immersive-vr` a `immersive-ar` (smíšená realita na Questu 3, skryje místnost). Referenční prostor `local-floor`, stůl ve výšce 0,75 m, uživatel stojí.
- **Barvy:** `THREE.ColorManagement.legacyMode = false`, `renderer.outputEncoding = sRGBEncoding`, canvas textury v sRGB.
- **HTML překryv** (úvodní karta, lišta, výsledky) má barvy jako proměnné na `:root` se světlou i tmavou variantou.

## Obsah a jazyk

- Veškerý text v aplikaci je česky. Typografie: české uvozovky „ “, pomlčka – , nedělitelné mezery tam, kde je to přirozené. V kódu (JS, CSS) rovné uvozovky.
- Identifikátory v kódu anglicky nebo česky bez diakritiky, komentáře mohou být česky.
- Odborná přesnost je důležitější než efekt. Pokud něco zjednodušuješ (např. procesor bez integrované grafiky, propustnosti sběrnic), napiš to do komentáře v kódu a řekni mi o tom.
- Díly a ceny ve hře jsou smyšlené, bez značek výrobců.

## Data pro výzkum (nerozbít)

- Každé sezení má kód `VR-XXXX`, log událostí `S.log` (`{t, type, detail}`, čas v ms od začátku sezení).
- Výsledky: CSV ke stažení (oddělovač `;`, UTF-8 s BOM) a volitelně odeslání do Google tabulky (`DATA_ENDPOINT`, `DATA_KEY`; skript v `apps-script/`). Odesílá se jen se souhlasem účastníka.
- **Názvy sloupců v `resultData()` / `gameFields()` a typy událostí v logu neměň ani nepřejmenovávej**, navazují na ně už sebraná data. Nové sloupce a události přidávej, staré zachovej.
- Neukládej jména ani jiné osobní údaje. Kód účastníka je pseudonym.

## Parametry v adrese

`?start=hra` (rovnou do hry), `?scenar=den1` (pevný den, stejné zakázky pro všechny), `?napoveda=ne` (bez žlutých obrysů a nápověd), `?skupina=…` (označení skupiny do dat). Lze kombinovat. Nové parametry dokumentuj sem.

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
