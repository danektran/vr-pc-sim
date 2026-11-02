# Herní návrh: Den v PC dílně

Hra je čtvrtou částí aplikace Sestav si PC. Student v ní jako technik servisu vyřizuje zakázky zákazníků: opravuje počítače s poruchou a staví nové sestavy podle rozpočtu, přičemž mu pomáhá rentgenový pohled do počítače.

**Stav implementace (listopad 2026):** fáze 1 (opravy) je hotová. Fáze 2–4 čekají.

## Místo v aplikaci

Úvod → 1 Výklad → 2 Stavba → 3 Opakování → 4 Hra. Z úvodu vede i přímá cesta do hry (tlačítko „Rovnou do hry“ nebo `?start=hra`). Po opakování panel nabídne výsledky i pokračování do hry.

## Cíle učení

Po odehrání jednoho dne student zvládne:

- určit příčinu nefunkčního počítače podle příznaků (kontrolky na desce, obraz na monitoru, chování po zapnutí) a zdůvodnit ji dřív, než začne díly měnit;
- sestavit funkční a kompatibilní počítač pro daný účel a rozpočet;
- popsat, kudy v počítači teče energie a data, a pojmenovat hlavní sběrnice a jejich propustnost;
- najít úzké hrdlo výkonu a navrhnout levnou úpravu.

## Herní smyčka

Jeden den = 4 zakázky, zhruba 20–30 minut. Ve třídě se po každé zakázce může vystřídat student v brýlích.

**Den:** ráno přehled (pokladna, reputace, použití rentgenu, fronta zákazníků) → zakázky → večer souhrn (zisk, průměrná spokojenost, diagnózy napoprvé, chyby), při dobré reputaci odemčení náročnějších zákazníků.

**Oprava:** zákazník laicky popíše potíž → student zapne PC a pozoruje příznaky → případně rentgen → vybere diagnózu ze 4 možností (teprve pak lze skříň otevřít) → opraví (zasune díl, nebo koupí nový) → zapne znovu a předá → platba a hodnocení.

**Nová sestava:** zákazník řekne účel a rozpočet → student vybírá díly z regálu (cena, parametry, průběžný součet ceny a spotřeby proti výkonu zdroje) → sestaví a zapne → vyhodnocení funkčnosti, rozpočtu a vhodnosti.

## Zakázky typu Oprava

Jedna skrytá porucha na zakázku (od úrovně 3 i dvě). Obtížnost 1 = jasný příznak, 3 = příznak vede i na jiné příčiny.

| Porucha | Co říká zákazník | Příznaky | Oprava | Obtížnost | Stav |
| --- | --- | --- | --- | --- | --- |
| Uvolněná RAM | „Zapnu to, větráky jedou, ale obrazovka je černá.“ | Kontrolka DRAM, černý monitor | Zasunout moduly (zdarma) | 1 | hotovo |
| Odpojené napájení grafiky | „Po stěhování to nic neukazuje.“ | Kontrolka VGA, černý monitor | Připojit kabel (zdarma) | 1 | hotovo |
| Vadný disk | „Píše to něco o zaváděcím zařízení.“ | Naběhne do UEFI, kontrolka BOOT | Nový SSD | 1 | hotovo |
| Vyschlá pasta, ucpaný chladič | „Při hraní se to po chvíli samo vypne.“ | Teplota roste, vypnutí při zátěži | Vyčistit + pasta, nebo nový chladič | 2 | hotovo |
| Slabý zdroj | „Koupil jsem novou grafiku a od té doby se to vypíná.“ | Vypnutí při zátěži, teplota v normě, štítek 450 W | Silnější zdroj | 2 | hotovo |
| RAM v jednom kanálu | „Kolega má stejný počítač a ten jeho je rychlejší.“ | Funguje, systém hlásí single channel | Přesunout do A2 a B2 (zdarma) | 2 | hotovo |
| Vadný modul RAM | „Občas to spadne a pak to zase chvíli jde.“ | Náhodné pády, vadný jeden ze dvou modulů | Najít a vyměnit modul | 3 | čeká |
| Vadný zdroj | „Nedělá to vůbec nic.“ | Žádná reakce | Nový zdroj | 3 | čeká |

Špatná diagnóza: −1 hvězda a nápověda. Po druhé špatné hra prozradí správnou diagnózu a zakázka se hodnotí hůř.

## Zakázky typu Nová sestava (fáze 3)

Díly i ceny smyšlené a orientační, bez značek.

| Zákazník | Účel | Rozpočet | Na co si dát pozor |
| --- | --- | --- | --- |
| Paní Nováková | Kancelář, e-maily, video hovory | 14 000 Kč | Bez grafické karty, procesor s integrovanou grafikou |
| Student Tomáš | Hry ve Full HD | 28 000 Kč | Většina rozpočtu do grafiky, zdroj s rezervou |
| Fotografka Jana | Střih videa a úprava fotek | 40 000 Kč | 32 GB RAM, rychlý SSD, výkonný procesor |
| Malá firma | Domácí server, ticho, nízká spotřeba | 18 000 Kč | Malá skříň, úsporný procesor, dva disky |

| Díl | Varianty | Klíčový parametr |
| --- | --- | --- |
| Procesor | Úsporný s grafikou, střední, výkonný | Patice A/B, spotřeba W, integrovaná grafika |
| Základní deska | ATX a micro-ATX, pro patici A nebo B | Patice, typ paměti, velikost |
| Paměť | 2× 8 GB, 2× 16 GB, DDR4 a DDR5 | Typ podle desky |
| Grafická karta | Žádná, střední, výkonná | Spotřeba W, délka mm |
| Disk | SSD 500 GB, SSD 1 TB, HDD 4 TB | Rychlost, kapacita |
| Zdroj | 450 W, 650 W, 850 W | Výkon W |
| Skříň | Malá (micro-ATX), střední (ATX) | Velikost desky, max. délka grafiky |

Kompatibilita: patice CPU = patice desky; typ paměti = typ desky; deska se vejde do skříně a grafika nepřesahuje max. délku; součet spotřeby × 1,3 ≤ výkon zdroje; bez grafické karty musí mít CPU integrovanou grafiku. Nekompatibilní díl nejde vložit, nebo PC nenaběhne, a student se dozví proč.

## Rentgen (fáze 2)

Skříň zprůhlední a zobrazí jednu ze tří vrstev. Při opravě 3 použití za den po 15 s, po dokončení zakázky bez omezení jako výklad.

| Vrstva | Co ukazuje | Odhalí |
| --- | --- | --- |
| Energetická | Toky ze zdroje (24pin desky, 8pin CPU, napájení GPU, SATA), tloušťka = výkon, zatížení zdroje v % | Odpojené napájení, slabý/vadný zdroj |
| Datová | Sběrnice CPU, RAM, GPU, disk, čipset s propustností (DDR5 dvoukanálově, PCIe 4.0 x16, PCIe 4.0 x4), pohyblivé pakety | Single channel, přerušená cesta, úzké hrdlo |
| Tepelná | Barevná mapa teplot | Ucpaný chladič, pasta, přehřívání |

Ve výkladovém režimu datové vrstvy lze ťuknout na sběrnici a dostat vysvětlení (co po ní teče, propustnost, proč je důležitá). Tady se hra nejvíc propojuje s látkou předmětu.

## Bodování a ekonomika

Pokladna (začátek dne 5 000 Kč), spokojenost zakázky (1–5 hvězd), reputace (průměr za den).

| Událost | Pokladna | Spokojenost | Stav |
| --- | --- | --- | --- |
| Oprava dokončená | + práce 800 Kč + potřebné díly | základ 5 | hotovo |
| Diagnóza napoprvé | + 200 Kč | — | hotovo |
| Špatná diagnóza | — | −1 | hotovo |
| Zbytečně koupený díl | platí dílna | −1 | hotovo |
| Paměť zůstala v single channel (u jiné poruchy) | — | −1 | hotovo |
| Sestava funguje a je v rozpočtu | + 15 % z ceny | základ 5 | fáze 3 |
| Sestava přes rozpočet | nižší marže | −1 za každých 10 % | fáze 3 |
| Sestava nevhodná pro účel | — | −2 | fáze 3 |
| Zbytečně drahý díl | — | −1 | fáze 3 |
| Zakázka nad 10 min | — | −1 | zvážit |

Reputace 4+ odemyká úroveň 2, reputace 4+ na úrovni 2 odemyká úroveň 3. Čísla se doladí při testování.

## Učitelský režim a data

| Parametr | Příklad | Co dělá | Stav |
| --- | --- | --- | --- |
| `start` | `?start=hra` | Rovnou do hry | hotovo |
| `scenar` | `&scenar=den1` | Pevný den, srovnatelné výsledky | hotovo |
| `napoveda` | `&napoveda=ne` | Bez obrysů a nápověd | hotovo |
| `skupina` | `&skupina=AP-cv1` | Označení skupiny v datech | hotovo |
| `uroven` | `&uroven=2` | Start na vyšší úrovni | čeká |
| `rentgen` | `&rentgen=ne` | Rentgen jen ve výkladu | čeká |

Hra zaznamenává u každé zakázky poruchu, diagnózy v pořadí, nákupy (včetně zbytečných), čas a hvězdy; za den pokladnu a reputaci. Data jsou pod pseudonymním kódem.

## Fáze vývoje

| Fáze | Obsah | Stav |
| --- | --- | --- |
| 1. Opravy | Vstup do hry, den se 4 opravami, diagnóza, nákup dílů, pokladna, hvězdy, souhrn | hotovo |
| 2. Rentgen | Tři vrstvy, výkladový režim sběrnic | čeká |
| 3. Nové sestavy | Katalog, rozpočet, kompatibilita, hodnocení | čeká |
| 4. Doladění | Úrovně a reputace, poruchy obtížnosti 3, dvě poruchy najednou, zrychlení počítače, `uroven`, `rentgen` | čeká |

## Otevřené otázky

- Postavy zákazníků (avatary u pultu), nebo stačí text na panelu?
- Ceny v Kč, nebo body?
- Časový limit zakázky ano, nebo ne?
- Které poruchy a sběrnice nejvíc odpovídají sylabu předmětu?
- Kam ukládat výsledky celé skupiny (CSV, nebo Google tabulka)?
