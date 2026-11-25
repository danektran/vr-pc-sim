# Jednodušší úvodní karta a návrat na začátek – plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Úvodní karta bez kódu účastníka s jedním výrazným tlačítkem a tlačítko „Zpět na začátek“ (s potvrzením) na 3D panelu ve všech fázích kromě úvodu.

**Architecture:** HTML karta se upraví v `index.html` + `css/style.css`; kód účastníka se místo z pole bere z parametru `?kod=`. Nový modul `js/back.js` drží logiku návratu (potvrzení, odeslání dat, úklid scény, `restart()`); `js/ui-panel.js` v `setPanel()` přidá malé tlačítko nad pravý horní roh panelu. Lišta na počítači používá stejnou logiku.

**Tech Stack:** nativní ES moduly bez build kroku, three.js r147 UMD, Playwright kontroly ve `C:/Users/trani/vr-pc-sim-test` (hák `window.__T` z `lib.js`).

**Spec:** `docs/superpowers/specs/2026-11-25-uvod-a-navrat-design.md`

## Global Constraints

- Platí `CLAUDE.md`: bez build kroku, three.js r147 UMD, žádné `examples/jsm`, texty česky s českou typografií, texty pro studenta do `data/hlasky.json`.
- Názvy sloupců v `resultData()` / `sendData()` a stávající typy událostí neměnit. `kod_ucastnika` zůstává (prázdný, nebo z `?kod=`).
- Nová hodnota `udalost` a nový typ události v logu: přesně `navrat_na_zacatek`.
- Odesílá se jen se souhlasem (`#consent`), jako dosud.
- Výkon na Questu: tlačítko je jedna canvas textura, překreslí se jen při změně (hover / potvrzení), ne každý snímek.
- Commity česky, po každém funkčním kroku; větev `uvod-a-navrat`.

## Review Focus

1. **Návrat s dílem v ruce** (myš táhne díl / ovladač drží díl): po návratu nesmí díl zůstat přichycený k ovladači ani viset ve vzduchu; čeká se, že je zpět sestavený na stole. → test v Task 2 (`drag` scénář).
2. **Návrat během přehřátí / animace zapnutí** (`S.anim` běží): smyčka v `app.js` nesmí po návratu dokončit animaci a přepsat úvodní panel `buildPanel(...)`/`showStage(...)`. → test v Task 2 (`anim` scénář).
3. **Divák přenosu** vidí tlačítko, ale stisk u něj nic nespustí; hover indexy `captureHover` / `applyState('hov')` se nesmí posunout (tlačítko je v `panel.buttons` poslední). → test v Task 3 (`stream-apply.js`, `stream-e2e.js`).
4. **Přeplněný panel** (diagnóza se 4 možnostmi, otázky opakování): tlačítko nesmí překrýt text ani tlačítka. → test v Task 2 (geometrie: tlačítko celé nad horní hranou panelu).
5. **Potvrzení vyprší a panel se mezitím překreslí** (`setPanel` zavolaný během 4 s čekání): nesmí zůstat viset časovač, který pak přepíše nové tlačítko nebo spustí návrat. → test v Task 2 (`timeout` scénář).

---

### Task 1: Úvodní karta bez kódu účastníka

**Files:**
- Modify: `index.html:27-44` (pravý sloupec karty)
- Modify: `css/style.css` (oddíl „Pro vyučujícího“, menší vedlejší tlačítka)
- Modify: `js/data.js:20` (`participant()`)
- Modify: `js/xr.js:41-44` (které tlačítko je hlavní)
- Modify: `CLAUDE.md` (parametr `?kod=` v oddílu Parametry v adrese)
- Test: `C:/Users/trani/vr-pc-sim-test/intro-check.js` (nový)

**Interfaces:**
- Produces: `participant()` vrací `{kod, souhlas}`; `kod` = `PARAMS.get('kod')` ořezaný, velkými písmeny, max. 40 znaků, jinak `''`.

Cílová podoba pravého sloupce (shora dolů): rámeček `#research` jen se zaškrtávátkem `#consent` a řádkem „Bez souhlasu…“; `.btns` s hlavním tlačítkem (jediné `button.primary`); pod ním `.btns.small` s vedlejšími (`#btnAR`, a `#btnDesk`, pokud není hlavní); `#xrNote`; oddíl `<div class="teacher" id="teacherBox">` s nadpisem `<h3>Pro vyučujícího</h3>`, `#streamNote` a `#streamBtns`. Oddíl se skryje, když je `#streamBtns` skrytý i `#streamNote` prázdný (bez prostředníka). Hlavní tlačítko: `#btnVR`, když je VR podporováno, jinak `#btnDesk`; `#btnDesk` se při podpoře VR přesune do `.btns.small` (přesunout uzel v `checkXR`, ne duplikovat id).

- [ ] **Step 1: Napiš kontrolu `intro-check.js`** (vzor: `card-check.js`, hák a server z `lib.js`). Kontroly:
  - `#pcode` na stránce neexistuje.
  - V `#overlay` je viditelné právě jedno `button.primary` a je to `#btnDesk` (Playwright nemá WebXR).
  - `#streamBtns` je uvnitř `#teacherBox` a `#teacherBox h3` má text „Pro vyučujícího“.
  - S `?kod=test1`: zaškrtnout `#consent`, zachytit `fetch` (přepsat `window.fetch` před načtením), zavolat `__T.sendData('x')` → v těle `souhrn.kod_ucastnika === 'TEST1'`.
  - Bez `?kod`: totéž → `kod_ucastnika === ''`.
  - Bez souhlasu: `sendData` vrátí `false`, žádný `fetch`.
  - Negativní kontrola: spustit proti `main` (`git stash` / jiná kopie) → musí hlásit chyby (`#pcode` existuje).
  Pokud `sendData` není v `EXPOSE` v `lib.js`, přidej ho tam.
- [ ] **Step 2: Spusť** `node intro-check.js C:/Users/trani/vr-pc-sim` → očekávané CHYBY (pole existuje, chybí `#teacherBox`).
- [ ] **Step 3: Uprav `index.html`, `css/style.css`, `js/data.js`, `js/xr.js`** podle cílové podoby. `.teacher` má horní oddělovací čáru (`border-top:1px solid var(--line)`), nadpis malým tlumeným písmem (`var(--muted)`); jen proměnné z `:root`, žádné nové barvy.
- [ ] **Step 4: Spusť** `node intro-check.js …` → `Vše OK`; `node card-check.js C:/Users/trani/vr-pc-sim` → `Vše OK` ve všech velikostech (prohlédni i snímky v `card-shots/`).
- [ ] **Step 5: Doplň `?kod=` do `CLAUDE.md`** (Parametry v adrese: „`?kod=TEST1` vyplní kód účastníka do dat; řádky s kódem začínajícím TEST přehled v tabulce vynechá“) a oprav zmínku o kódu účastníka v oddílu Data pro výzkum.
- [ ] **Step 6: Commit** `Úvodní karta: bez kódu účastníka, jedno hlavní tlačítko, oddíl pro vyučujícího`.

### Task 2: Tlačítko „Zpět na začátek“ na 3D panelu a v liště

**Files:**
- Create: `js/back.js`
- Modify: `js/ui-panel.js:80-95` (`setPanel` přidá tlačítko)
- Modify: `js/xr.js:33` (`btnMenu`)
- Modify: `data/hlasky.json` (nový oddíl `navrat`)
- Modify: `CLAUDE.md` (struktura kódu: `js/back.js`)
- Test: `C:/Users/trani/vr-pc-sim-test/back-check.js` (nový)

**Interfaces:**
- Consumes: `restart()` z `js/phases/results.js`, `sendData(udalost)` z `js/data.js`, `log()` a `S` ze `js/state.js`, `ctrl`, `desk` z `js/interaction.js`, `VIEWER` z `js/config.js`.
- Produces (`js/back.js`):
  - `backSpec()` → `{label, back:true, onClick}` nebo `null` (když `S.phase==='intro'`). `setPanel` ho volá při každém sestavení panelu.
  - `pressBack(button)` – první stisk: `spec.label = H.navrat.potvrdit`, překreslit `drawButton`, časovač 4000 ms vrátí `H.navrat.tlacitko`; druhý stisk do 4 s: `goBackToStart()`.
  - `goBackToStart()` – `log('navrat_na_zacatek', fazeZKtereOdchazi)`; `sendData('navrat_na_zacatek')`; úklid: `S.anim=null`, díl držený ovladačem nebo myší vrátit (odpojit od ovladače, `desk.drag=null`, `userData.grab=null`), skrýt obrysy; pak `restart()`. Na počítači (ne v XR) navíc `$('overlay').hidden=false; $('hud').hidden=true`.
  - `cancelBackConfirm()` – zruší běžící časovač; volá ho `setPanel` na začátku.
- `data/hlasky.json`: `"navrat": {"tlacitko": "Zpět na začátek", "potvrdit": "Opravdu? Práce se ztratí"}`.

Umístění tlačítka: mimo canvas panelu, celé nad horní hranou, zarovnané vpravo: šířka 0,26 m, výška 0,05 m, střed `x = PW/2 - 0.13`, `y = PH/2 + 0.035`, `z = 0.002`. Vytvořit přes `makeButton(spec, 0.26)` (výšku `BH` lze pro toto tlačítko přepsat parametrem, nebo použít `BH` – rozhodne stavitel, jen musí platit geometrie z testu). Push do `panel.buttons` **jako poslední**. Na straně diváka (`VIEWER`) se tlačítko ukáže, ale bez `onClick`.

- [ ] **Step 1: Napiš `back-check.js`** (server + hák z `lib.js`, `makeCtx` → `c.click(label)`). Scénáře, každý na čerstvé stránce s `?scenar=den1`, se zachyceným `fetch` a zaškrtnutým `#consent`:
  - `intro`: v `panel.buttons` žádné tlačítko s `userData.spec.back`.
  - `faze`: pro výklad, stavbu, opakování (otázka 1), hru (fáze diagnózy) a výsledky: tlačítko existuje, jeho obrys (`Box3` ve světě) leží celý nad horní hranou `panel.mesh` a nepřekrývá žádné jiné tlačítko.
  - `potvrzeni`: jeden klik → popisek „Opravdu? Práce se ztratí“, `S.phase` beze změny; druhý klik → `S.phase==='intro'`, `S.code===''`, `S.log.length===0`, zachycený `fetch` má `souhrn.udalost==='navrat_na_zacatek'` a v `udalosti` poslední záznam `{type:'navrat_na_zacatek', detail:'build'}` (pro scénář ze stavby).
  - `timeout`: jeden klik, čekat 4500 ms → popisek zpět „Zpět na začátek“, fáze beze změny. Druhá varianta: klik, pak v téže fázi vyvolat `setPanel` (např. klik na díl ve výkladu), čekat 4500 ms → nové tlačítko má popisek „Zpět na začátek“ a fáze se nezměnila.
  - `drag`: ve stavbě začít táhnout díl myší (`mouse.down` nad dílem, posun, bez `up`), dvojklik na tlačítko přes `__T` (`spec.onClick()` dvakrát) → `__T.desk.drag==null`, všechny díly `at` vyplněné (sestaveno).
  - `anim`: ve stavbě vložit vše kromě chladiče, zapnout (běží `S.anim` přehřátí), hned návrat → počkat 6 s → `S.phase==='intro'` a `panel.content.title` je úvodní nadpis.
  - `bez souhlasu`: odškrtnout `#consent`, návrat → žádný `fetch`.
  - `lista`: na počítači klik na `#btnMenu` → text „Opravdu? Práce se ztratí“; druhý klik → `#overlay` viditelný, `S.phase==='intro'`. Ve fázi `intro` první klik rovnou ukáže kartu (není co ztratit).
- [ ] **Step 2: Spusť** `node back-check.js C:/Users/trani/vr-pc-sim` → CHYBY (tlačítko neexistuje).
- [ ] **Step 3: Implementuj `js/back.js`, úpravu `setPanel`, `btnMenu`, `hlasky.json`.** `btnMenu` používá stejné dvoukrokové potvrzení s 4s časovačem (vlastní stav pro HTML tlačítko, texty z `H.navrat`).
- [ ] **Step 4: Spusť** `node back-check.js …` → `Vše OK`. Negativní kontrola: dočasně vyřaď `S.anim=null` z `goBackToStart` → scénář `anim` musí selhat; vrať.
- [ ] **Step 5: Doplň `js/back.js` do struktury v `CLAUDE.md`.**
- [ ] **Step 6: Commit** `Tlačítko Zpět na začátek na panelu i v liště, s potvrzením`.

### Task 3: Regrese a přenos

**Files:**
- Modify (dle potřeby): `C:/Users/trani/vr-pc-sim-test/run.js` / `adapter.js` (adapter nesmí vyplňovat `#pcode`), referenční výstup
- Test: `stream-apply.js`, `stream-e2e.js`, `btn-check.js`, `node --test tests/*.test.mjs`

- [ ] **Step 1: Spusť** `node --test tests/*.test.mjs` v repu → vše prochází.
- [ ] **Step 2: Spusť** `node btn-check.js`, `node stream-apply.js`, `node stream-e2e.js` (místní `wrangler dev`) → `Vše OK`. Do `stream-apply.js` přidej kontrolu: po snímku z fáze `build` má divák v `panel.buttons` tlačítko `spec.back` bez `onClick` a hover na řádcích (`hov`) zvýrazní stejná tlačítka jako u hráče.
- [ ] **Step 3: Spusť** `node run.js C:/Users/trani/vr-pc-sim both` → rozdíly proti 91 základním: každý nový rozdíl zdůvodni (karta bez pole, extra tlačítko na panelu). Pokud jsou všechny nové rozdíly jen tyto, ulož výstup jako novou referenci `run-uvod-navrat.txt` a zapiš do `CLAUDE.md` (Testování), že základ je nový.
- [ ] **Step 4: Ruční průchod kontrolního seznamu z `CLAUDE.md`** na počítači (úvod bez chyb v konzoli, výklad, stavba, opakování, hra `den1`, úvod → hra) a návrat z každé fáze.
- [ ] **Step 5: Commit** `Testy: nová reference po úpravě úvodu a návratu`.
