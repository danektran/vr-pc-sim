# Úvodní prompt pro Claude Code

Před vložením přepni Claude Code do plan mode (Shift+Tab), aby nejdřív navrhl plán.

---

Přečti si `CLAUDE.md` a `docs/herni-navrh.md`. Pak si projdi `index.html`: celá aplikace je teď v jednom souboru.

Úkol: rozdělit aplikaci do přehledné modulární struktury, **beze změny chování**. Výsledek musí dál fungovat jako statický web na GitHub Pages bez build kroku.

Představa struktury (uprav, pokud máš lepší návrh, a zdůvodni):

```
index.html            jen HTML kostra a načtení skriptů
css/style.css         styly HTML překryvu
js/main.js            start, smyčka, propojení modulů
js/scene.js           renderer, místnost, stůl, skříň, monitor
js/parts.js           stavba 3D dílů, definice dílů a cílových pozic
js/ui-panel.js        3D panel, tlačítka, popisky
js/interaction.js     paprsky, uchopení, přichycení, desktopové ovládání, ovladače XR
js/xr.js              spuštění VR a smíšené reality
js/phases/            intro, výklad, stavba, opakování, výsledky
js/game/              hra Den v PC dílně
js/data.js            log, CSV, odesílání do Google tabulky
data/                 obsah jako JSON: popisy dílů, otázky, poruchy, zákazníci, nabídka dílů
```

Požadavky:

1. Moduly jako nativní ES moduly (`<script type="module">`). three.js zůstává jako UMD skript s globálním `THREE` (verze 0.147.0 z jsDelivr), načtený před moduly.
2. Veškerý text, který vidí student (popisy dílů, otázky, poruchy, citace zákazníků, ceny), přesuň do souborů v `data/`, abych ho mohl upravovat bez zásahu do kódu.
3. Názvy sloupců výsledků a typy událostí v logu zůstávají přesně stejné.
4. Zachovej parametry v adrese (`start`, `scenar`, `napoveda`, `skupina`) a odesílání dat (`DATA_ENDPOINT` přesuň do jednoho přehledného konfiguračního souboru, např. `js/config.js`).
5. Původní `index.html` si nejdřív ulož jako `legacy/index-v1.html` pro porovnání.

Postup:

- Nejdřív mi ukaž plán: strukturu souborů, co kam přesuneš a jaká vidíš rizika.
- Po schválení postupuj po krocích a po každém kroku ověř, že aplikace v desktopovém režimu funguje (kontrolní seznam je v `CLAUDE.md`). Po každém funkčním kroku commit.
- Na konci mi napiš, jak spustit lokální server a otestovat aplikaci v brýlích přes `adb reverse`, a krátce shrň, kde co v nové struktuře najdu.

Další rozšíření (rentgen, nové sestavy, další poruchy) zatím nedělej, přijdou až po refaktoringu.
