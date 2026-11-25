# Jednodušší úvodní karta a návrat na začátek – návrh

Datum: 2026-11-25

## Proč

Zkušenost z hodiny: studentům chvíli trvalo, než na úvodní kartě pochopili, kam kliknout. Mátlo je pole „Kód účastníka“, protože se zároveň zadával jiný kód (kód přenosu pro diváka). Ve VR se navíc nedá vrátit na začátek jinak než dojít až k výsledkům.

## Cíle

1. Úvodní karta má jedno zřetelné hlavní tlačítko, ostatní volby jsou menší.
2. Na kartě není žádný kód k vyplnění pro studenta; jediný kód, který se ve třídě objeví, je kód přenosu.
3. Z kterékoli části aplikace (výklad, stavba, opakování, hra) se dá vrátit na začátek – ve VR i na počítači.

## Ne-cíle

- Neměnit obsah fází, herní logiku ani přenos samotný.
- Neměnit názvy sloupců ani existující typy událostí ve výzkumných datech.

## Anti-cíle (selhání, i kdyby to technicky fungovalo)

- Tlačítko návratu jde snadno stisknout omylem a student přijde o rozdělanou práci.
- Výzkumná data z hodiny se neuloží nebo se pokusy smíchají do jednoho řádku.
- Panel ve VR se přeplní (tlačítko překryje text nebo jiná tlačítka, např. 4 možnosti diagnózy).

## Přístupy (zvažované pro návrat ve VR)

1. **Stálé tlačítko „Zpět na začátek“ na 3D panelu s potvrzením** – vybráno (Danek). Je vidět, ovládá se stejně jako vše ostatní (paprsek + spoušť), potvrzení brání omylu.
2. Tlačítko na ovladači (B/Y) – nic nepřekáží, ale studenti ho neobjeví.
3. Plovoucí tlačítko u zápěstí – hezké, ale pracnější a ladí se jen v brýlích.

## Rozhodnuto s Dankem

- **Výzkum zůstává zapnutý jako výchozí.** Kód účastníka se nepotřebuje (nepáruje se s dotazníky) → pole `pcode` z karty zmizí, zůstane jen zaškrtávátko souhlasu.
- Sloupec `kod_ucastnika` v datech zůstává (prázdný), kvůli návaznosti na sebraná data.
- Úvodní karta podle náčrtu: vlevo název, popis a 4 kroky; vpravo souhlas, pod ním jedno velké hlavní tlačítko („Vstoupit do VR“ na Questu, jinak „Spustit na počítači“), pod ním menší „Smíšená realita“ / „Na počítači“, oddělený oddíl „Pro vyučujícího“ s tlačítky přenosu.
- Návrat: varianta 1 výše.

## Moje rozhodnutí (Danek může opravit)

- **Testovací řádky:** přehled v Google tabulce vynechává řádky s kódem účastníka začínajícím `TEST`. Aby to šlo dál, nový parametr `?kod=…` (např. `?kod=TEST1`) vyplní `kod_ucastnika` bez viditelného pole. Zdokumentovat v CLAUDE.md.
- **Co návrat udělá s daty:** pokud je souhlas, odešle se rozdělané sezení s novou hodnotou `udalost = "navrat_na_zacatek"` (a do logu nová událost téhož typu s detailem = fáze, ze které se odchází). Pak proběhne totéž co tlačítko „Znovu“ ve výsledcích (`restart()`): nové sezení s novým kódem `VR-XXXX` a 3D úvod (Výklad / Hra). Pokusy se tak v datech nesmíchají.
- **Potvrzení:** první klik změní tlačítko na „Opravdu? Rozdělaná práce se ztratí“; druhý klik do pár sekund návrat provede, jinak se tlačítko vrátí do původního stavu.
- **Kde na panelu:** malé tlačítko mimo běžné řady tlačítek (např. roh panelu), aby se nesnižoval prostor pro text a odpovědi. Na úvodním 3D panelu (fáze `intro`) se nezobrazuje.
- **Počítač:** tlačítko „Úvodní obrazovka“ v liště dělá totéž co návrat ve VR (s potvrzením) a navíc znovu ukáže HTML úvodní kartu.
- **Divák přenosu:** vidí panel včetně tlačítka, ale nemůže ho stisknout (jako dosud).
- Texty nových tlačítek a hlášek jdou do `data/hlasky.json`.

## Na stavitele

- Přesné umístění a velikost tlačítka na panelu (ověřit na všech fázích, zejména diagnóza ve hře a otázky opakování, a ve VR i na počítači).
- Úklid scény při návratu z rozdělané stavby / hry / animace pasty (zákazník, díly v ruce, `S.busy`).
- Rozšíření kontrol ve `vr-pc-sim-test` (nová kontrola karty a návratu; `run.js` bude mít nové očekávané rozdíly kvůli kartě – nastavit novou referenci).
