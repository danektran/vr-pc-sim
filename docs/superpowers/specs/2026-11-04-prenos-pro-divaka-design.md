# Přenos sezení pro diváka – návrh

Datum: 2026-11-04 · větev `prenos-divak`

## Proč

Ve dvojici má jeden student brýle a hraje, druhý se dívá na počítači nebo tabletu. Vestavěné zrcadlení Questu (oculus.com/casting) nechceme: vyžaduje přihlášení k účtu Meta a posílá video, které by při 15 dvojicích zahltilo školní Wi‑Fi. Divák má vidět totéž co hráč, případně se dívat z jiného úhlu.

## Cíle

- **15 dvojic současně**, ke každým brýlím jeden divák.
- Divák otevře aplikaci v prohlížeči (PC, tablet), zadá kód a vidí sezení **živě**.
- Dva pohledy, přepínatelné tlačítkem:
  - **Očima hráče:** kamera sleduje hlavu z brýlí, vyhlazeně (divákovi se nesmí točit hlava z drobných pohybů).
  - **Volná kamera:** otáčení a přiblížení kolem stolu (myš: tažení + kolečko, tablet: tažení prstem + roztažení dvěma prsty). Hráč je vidět jako jednoduchá postava (hlava + oba ovladače s paprsky).
- Bez účtů a přihlašování, bez instalace.
- Malý datový tok: brýle neposílají obraz, jen stav scény (cíl: do 5 kB/s na dvojici).

## Ne-cíle

- Divák nic neovládá: žádné klikání do scény, uchopování ani tlačítka panelu. Jediné ovládání je kamera a přepínač pohledu.
- Divák neposílá nic do Google tabulky a nevytváří výzkumná data.
- Žádný zvuk u diváka (může být později).
- Víc diváků na jedny brýle se nebrání, ale neladí se na to.
- Záznam a pozdější přehrání sezení není součástí.
- Přehled všech 15 přenosů najednou pro vyučujícího (mřížka) není součástí, dá se přidat později nad stejným prostředníkem.

## Anti-cíle (selhání, i kdyby to technicky fungovalo)

- **Přenos zhorší hraní v brýlích:** pokles pod 72 fps, zaseknutí nebo chybová hláška, když prostředník nejede nebo vypadne síť. Brýle musí fungovat přesně jako dnes i bez spojení.
- **Změní se výzkumná data** (názvy sloupců, typy událostí, kódy poruch) nebo chování aplikace, když přenos není zapnutý. Porovnávací test ve `vr-pc-sim-test` musí bez zapnutého přenosu dál projít beze změny.
- Divák vidí jiný stav, než jaký má hráč (např. jiný text na panelu, díl jinde).

## Omezení

- Pravidla z `CLAUDE.md` platí: bez build kroku, three.js r147 UMD, žádné `examples/jsm`, low-poly, canvas textury nepřekreslovat každý snímek, české texty v `data/hlasky.json`.
- Aplikace je statická na GitHub Pages, proto potřebuje **prostředníka**, který zprávy přeposílá.
- **Prostředník: Cloudflare Worker s Durable Objects (bezplatný účet).** Jedna místnost (Durable Object) na kód dvojice, spojení přes WebSocket, použít WebSocket Hibernation API. Supabase Realtime zdarma nestačí (strop 100 zpráv/s na projekt). Přímé spojení zařízení (WebRTC) se ve školních sítích často blokuje. Daniel souhlasil se založením bezplatného účtu Cloudflare.
  - Účtování: příchozí WebSocket zprávy 20 : 1 jako požadavky, odchozí zdarma. Odhad: 15 brýlí × 10 zpráv/s × 45 min ≈ 405 tis. příchozích zpráv ≈ 20 tis. požadavků za hodinu. **Při stavbě ověřit denní bezplatný limit požadavků i doby běhu Durable Objects** v aktuální dokumentaci a výpočet zapsat do kódu prostředníka jako komentář.
- Kód prostředníka žije v repu ve složce `prenos/` (worker + `wrangler.toml`), nasazuje se `npx wrangler deploy`. Adresa prostředníka se zapíše do `js/config.js` (`RELAY_URL`) stejně jako `DATA_ENDPOINT`. Přihlášení k Cloudflare (`npx wrangler login`, otevře prohlížeč) provede Daniel sám, nasazení pak stavitel.

## Jak to funguje (rozhodnuto)

### Zapnutí a párování

- Přenos se zapíná parametrem **`?prenos=ano`** v odkazu pro brýle. Bez parametru se nic nenavazuje a aplikace se chová přesně jako dnes. *(Moje volba: kvůli srovnatelnosti s už sebranými daty a nulovému riziku pro dosavadní používání.)*
- Při zapnutém přenosu dostanou brýle po načtení stránky **kód přenosu**: 4 znaky ze stejné abecedy jako `makeCode()` (bez 0/O, 1/I), třeba `K7QM`. Je to samostatný kód, ne `S.code` (kód sezení se mění a patří do výzkumných dat). Kód platí, dokud se stránka znovu nenačte. *(Moje volba.)*
- Kde je kód vidět: na úvodní kartě (před vstupem do VR) a malým štítkem v rohu 3D panelu po celou dobu, včetně stavu „divák připojen“. *(Moje volba. Hráč ho tak může diktovat i z brýlí.)*
- Divák otevře **`?divak`** (bez kódu se zobrazí pole pro kód) nebo rovnou `?divak=K7QM`.

### Co brýle posílají

Brýle jsou zdroj pravdy, divák je „loutka“: nespouští herní logiku, jen přebírá stav.

- **Pohyb asi 10× za sekundu:** hlava (kamera) a oba ovladače, polohy a natočení všech pohyblivých objektů (díly, víko a části skříně, páčka a západky, zákazníci, stříkačka pasty a podobně). Posílají se jen objekty, které se od minula pohnuly.
- **Události hned, když nastanou:** obsah panelu (stejná data, jaká dostává `setPanel` / `updatePanel`), stav monitoru (`drawMonitor(mode, d)`), LED desky a napájení, příchod a odchod zákazníka (jméno a postava, vzhled se ze jména odvodí sám), zvýrazněný díl nebo tlačítko, viditelnost obrysů a nápověd, režim smíšené reality.
- **Úplný snímek stavu** po připojení diváka a pak každé 2 s, aby se divák mohl připojit kdykoli a po výpadku se sám srovnal.
- Funguje stejně, když hráč hraje na počítači v desktopovém režimu (místo hlavy se posílá kamera, ovladače se skryjí).
- Výsledky na konci (HTML karta v desktopovém režimu) se divákovi ukážou stejnou kartou, údaje přijdou zprávou.
- Brýle posílají jen tehdy, když je v místnosti připojený divák (prostředník to brýlím oznámí). *(Moje volba, šetří síť i výkon.)*
- Odesílání nesmí běžet ve vykreslovací smyčce déle než zlomek milisekundy. Sestavení zprávy je levné, posílá se mimo kritickou cestu.

### Divák

- Stejná stránka a stejná scéna (`scene.js`, `parts.js`, zákazníci), ale bez herní logiky, bez ovládání dílů a bez odesílání dat. Úvodní karta má v režimu diváka vlastní obsah: pole pro kód, stav spojení („čekám na brýle“, „připojeno“, „spojení přerušeno, zkouším znovu“).
- Mezi zprávami se polohy plynule dopočítávají (interpolace), divák má zpoždění kolem 100–200 ms. To nevadí.
- Lišta nahoře: přepínač **Očima hráče / Volná kamera** a kód.
- V pohledu očima hráče je zorné pole jako u Questu a kamera je vyhlazená. Volná kamera vychází z dnešního otáčení myší (`updateOrbit`), přibude dotykové ovládání.
- Ve smíšené realitě hráče vidí divák normální místnost. *(Moje volba.)*

#### Soukromí

- Ve zprávách nejsou jména ani kód účastníka, jen stav scény a herní texty. Kdo uhodne kód, uvidí cizí přenos. U 4 znaků (asi milion možností) a hodinového sezení je to přijatelné riziko. *(Moje volba.)*

### Výzkumná data

- Brýle přidají do souhrnu sloupec **`divak`** (`ano`, když byl během sezení připojen divák, jinak `ne`, a prázdný, když přenos nebyl zapnutý). Apps Script si nové sloupce do hlavičky doplní sám. Ostatní sloupce a události se nemění. *(Moje volba: kvůli výzkumu se hodí vědět, kdo hrál pozorovaný.)*

## Dokumentace

- Doplnit `?prenos=ano` a `?divak` do `CLAUDE.md` (parametry v adrese) a do komentáře v `js/config.js`. Do struktury kódu přidat novou složku a `prenos/`.

## Ověření

- Porovnávací test (`node run.js C:/Users/trani/vr-pc-sim both`) bez `?prenos` projde se stejnými známými rozdíly jako dnes.
- Nový automatický test: místní prostředník (`wrangler dev`), jedna stránka jako brýle v desktopovém režimu (`?prenos=ano`), druhá jako divák. Projde se celý scénář `den1` a v klíčových chvílích se porovná: text panelu, stav monitoru, polohy dílů (tolerance 1 cm), přítomnost zákazníka. Negativní kontrola: záměrně rozbitá zpráva musí test shodit.
- Měření: velikost datového toku na dvojici (cíl do 5 kB/s), čas sestavení zprávy na snímek.
- Výpadek: vypnutý prostředník → brýle bez chyb v konzoli a bez zaseknutí, divák ukazuje „zkouším znovu“ a po obnovení se srovná.
- Test v brýlích (Quest) zatím neproběhl ani u zbytku aplikace. Až proběhne, přidat kontrolu fps s připojeným divákem.

## Nechává se na stavitelovi

- Přesný formát zpráv (JSON s krátkými klíči je v pořádku, binární formát není nutný), seznam sledovaných objektů a způsob, jak je jednoznačně pojmenovat na obou stranách (náhodné UUID z three.js nepoužívat).
- Kde přesně se napojit na `setPanel`, `drawMonitor` a další, aby se do herní logiky zasahovalo co nejméně (nejlépe jednou tenkou vrstvou, třeba `js/stream/`).
- Vzhled postavy hráče, štítku s kódem a lišty diváka (podle stávajících barev a stylu).
- Opakované připojení (backoff), uklízení prázdných místností v prostředníkovi, ochrana proti zahlcení (limit velikosti a četnosti zpráv na místnost).
