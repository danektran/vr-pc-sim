# Přenos sezení pro diváka – implementační plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Divák v prohlížeči (PC/tablet) živě sleduje sezení z brýlí: buď očima hráče, nebo volnou kamerou. Nic neovládá.

**Architecture:** Brýle (`?prenos=ano`) 10× za s sestaví stav scény (polohy, panel, monitor, zákazníci…), pošlou jen změněné části a každé 2 s celý snímek. Zprávy jdou přes WebSocket do prostředníka na Cloudflare (Durable Object, jedna místnost na kód) a ten je přepošle divákům. Divák (`?divak=KÓD`) spustí stejnou scénu bez herní logiky a ovládání a stav jen přebírá. Mezi zprávami polohy plynule dopočítává.

**Tech Stack:** nativní ES moduly, three.js r147 UMD (globální `THREE`), WebSocket, Cloudflare Workers + Durable Objects (SQLite, Hibernation API), `wrangler`, `node --test` (Node 24, bez knihoven), Playwright z npx cache (`vr-pc-sim-test`).

**Spec:** `docs/superpowers/specs/2026-11-04-prenos-pro-divaka-design.md`

## Global Constraints

- Bez build kroku pro aplikaci, three.js r147 UMD, žádné `examples/jsm`. Platí `CLAUDE.md` (výkon 72 fps, canvas textury nepřekreslovat každý snímek, české texty, typografie „ “ a –).
- Bez `?prenos=ano` aplikace nenavazuje žádné spojení a chová se přesně jako dnes. Porovnávací test `node run.js C:/Users/trani/vr-pc-sim both` musí projít se stejnými známými rozdíly (ženské citace, náhodný kód sezení, chybějící „přímé volání“).
- Názvy sloupců v `resultData()` / `gameFields()` a typy událostí se nemění. Přibude jen sloupec `divak` v souhrnu, který se posílá do Google tabulky.
- Divák nic neposílá do Google tabulky (ani `flushQueue`) a nespouští herní logiku po kliknutí.
- Selhání sítě nebo prostředníka nesmí v brýlích vyhodit výjimku ani zablokovat smyčku. Veškerá práce se sítí je v `try/catch`.
- Cíl datového toku: do 5 kB/s na dvojici. Frekvence `SEND_HZ = 10`, celý snímek `FULL_EVERY_MS = 2000`.
- Kód přenosu: 4 znaky z `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, platí do obnovení stránky, není to `S.code`.
- Ve zprávách nejsou jména ani kód účastníka (kód z `#pcode` se nikdy neposílá).
- Texty, které vidí uživatel, patří do `data/hlasky.json` (nové klíče `prenos` a `divak`). Statické texty karty diváka mohou být přímo v `index.html` jako u úvodní karty.

## Review Focus

1. **Divák se připojí uprostřed sezení** (zákazník u stolu, díly rozložené nebo vyjmuté). Do 2 s musí vidět úplný stav, ne prázdnou úvodní scénu. Test: Task 5, `stream-e2e.js` krok „pozdní divák“.
2. **Brýle obnoví stránku nebo zavřou kartu.** Divák do 3 s ukáže „Brýle se odpojily“ a nezamrzne s chybou. Při nové stránce brýlí je kód jiný, takže divák zůstane čekat. Test: Task 5, krok „hráč odešel“.
3. **Prostředník neběží nebo je nedostupný.** Brýle s `?prenos=ano` hrají celý scénář bez výjimky. Jediné povolené hlášky v konzoli jsou ty, které Chrome sám vypisuje při neúspěšném WebSocketu (`WebSocket connection to`). Test: Task 4, `stream-offline.js`.
4. **Divák zadá kód malými písmeny, s mezerou nebo s pomlčkou.** Kód se normalizuje (velká písmena, odstraní se mezery a `-`), neplatný kód vypíše hlášku a nepřipojí se. Test: Task 1, `normalizeCode`.
5. **Druhé brýle se stejným kódem nebo moc diváků.** Novější hráč nahradí staršího (starý socket se zavře), divák nad limit `MAX_VIEWERS = 5` je odmítnut zavřením se zdůvodněním. Test: Task 2, `room-logic.test.mjs`.

---

## Struktura souborů

```
js/stream/protocol.js      čisté funkce bez THREE: kód, zaokrouhlení, rozdíl stavu, serializace panelu, konstanty
js/stream/snapshot.js      captureState() na straně brýlí, applyState() na straně diváka (jediné místo, které zná formát stavu)
js/stream/sender.js        brýle: spojení, odesílání, štítek s kódem na panelu, poznámka na úvodní kartě
js/stream/viewer.js        divák: karta s kódem, lišta, spojení, interpolace, kamera (očima hráče / volná), dotyk
js/stream/player-avatar.js postava hráče pro volnou kameru (hlava + 2 ovladače s paprsky)
prenos/room-logic.js       logika místnosti bez Cloudflare (testovatelná v Node)
prenos/worker.js           Cloudflare Worker + Durable Object Room (tenká vrstva nad room-logic.js)
prenos/wrangler.toml       konfigurace (binding ROOMS, migrace new_sqlite_classes)
tests/protocol.test.mjs    node --test
tests/room-logic.test.mjs  node --test
C:/Users/trani/vr-pc-sim-test/lib.js            společné části run.js (serve, makeCtx, scénáře) – run.js beze změny chování
C:/Users/trani/vr-pc-sim-test/stream-apply.js   capture → apply mezi dvěma stránkami bez sítě
C:/Users/trani/vr-pc-sim-test/stream-offline.js brýle s ?prenos=ano a nedostupným prostředníkem
C:/Users/trani/vr-pc-sim-test/stream-e2e.js     wrangler dev + brýle + divák, porovnání v kontrolních bodech
```

Upravené soubory: `js/config.js`, `js/app.js`, `js/interaction.js`, `js/scene.js`, `js/game/customer.js`, `js/game/paste.js`, `js/phases/theory.js`, `js/data.js`, `index.html`, `css/style.css`, `data/hlasky.json`, `CLAUDE.md`.

## Formát zpráv (rozhodnuto, platí pro všechny úlohy)

Adresa: `${RELAY_URL}/room/${code}?role=hrac|divak` (WebSocket). JSON text.

- prostředník → hráč: `{t:'viewers', n}` (počet diváků, posílá se při každé změně a hned po připojení hráče).
- prostředník → divák: `{t:'player', on:true|false}` (hned po připojení diváka a při každé změně).
- prostředník → hráč při připojení nového diváka: `{t:'need_full'}`.
- hráč → diváci (prostředník přeposílá beze změny): `{t:'s', full:0|1, seq, d:{…}}`, kde `d` obsahuje jen změněné klíče (při `full:1` všechny):

| klíč | hodnota |
| --- | --- |
| `head` | `[x,y,z,qx,qy,qz,qw]` světové souřadnice kamery |
| `c0`, `c1` | `[x,y,z,qx,qy,qz,qw,rayLen]` ovladač, nebo `null` mimo XR |
| `p` | `{partId:[x,y,z,qx,qy,qz,qw]}` všech 9 dílů (světové) |
| `inst` | `{slot:partId}` (kopie `installed`) |
| `loose` | `[partId]` (`GAME.loose`) |
| `pled` | hex LED napájení (`powerLedMat.emissive.getHex()`) |
| `leds` | `'CPU'|'DRAM'|'VGA'|'BOOT'|null` |
| `ghosts` | `[targetKey]` viditelných obrysů |
| `cable` | `0|1` trubka kabelu |
| `phase` | `S.phase` |
| `panel` | `serializePanel(panel.content)` |
| `hov` | `[[row,col]]` zvýrazněná tlačítka panelu, `pbtn` `0|1` zvýrazněné tlačítko napájení |
| `hl` | `{text, pos:[x,y,z]}` nebo `null` (plovoucí popisek) |
| `xl` | `0|1` popisky rozloženého výkladu |
| `mon` | `{mode, d}` poslední `drawMonitor` |
| `cust` | `[{name, body, state, t, talk, pos:[x,z], ry}]` |
| `paste` | čas animace pasty v s, nebo `null` |
| `psu` | výkon zdroje ve W, `dirty` `0|1` (ucpaný chladič) |
| `res` | `{code, rows:[[popis, hodnota]]}` pokud je HTML karta výsledků vidět, jinak `null` |

Čísla v polohách se zaokrouhlují na 3 desetinná místa (`q()`).

---

### Task 1: Protokol (čisté funkce)

**Files:**
- Create: `js/stream/protocol.js`
- Test: `tests/protocol.test.mjs`

**Interfaces:**
- Produces:
  - `CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'`, `SEND_HZ = 10`, `FULL_EVERY_MS = 2000`, `MAX_MSG_BYTES = 16000`, `MAX_VIEWERS = 5`
  - `makeStreamCode(rnd = Math.random): string`, 4 znaky
  - `normalizeCode(s: string): string|null`: trim, velká písmena, odstraní mezery a `-`, vrátí kód, nebo `null`, když neodpovídá `/^[A-HJ-NP-Z2-9]{4}$/`
  - `q(n: number): number`: zaokrouhlení na 3 desetinná místa
  - `packPose(p:{x,y,z}, quat:{x,y,z,w}): number[7]` (už zaokrouhlené)
  - `serializePanel(c): {step,topline,title,body,status,statusKind,rows:[[{label,kind,disabled}]]}`: bez `onClick`, chybějící hodnoty `undefined` vynechá
  - `diffState(prev: object, next: object): object`: klíče z `next`, jejichž `JSON.stringify` se liší od `prev`
  - `encode(msg): string`, `decode(str): object|null` (`null` při neplatném JSON nebo chybějícím `t`)

- [ ] **Step 1: Write the failing tests** `tests/protocol.test.mjs` (`node:test`, `node:assert/strict`):
  - `makeStreamCode` s pevným `rnd = () => 0` vrátí `'AAAA'`, s `() => 0.999` vrátí `'9999'`, 1000 náhodných kódů projde `normalizeCode`.
  - `normalizeCode(' k7-qm ') === 'K7QM'`, `normalizeCode('K0QM') === null` (0 není v abecedě), `normalizeCode('K7Q') === null`, `normalizeCode('') === null`.
  - `q(1.23456) === 1.235`, `q(-0.0004) === -0` nebo `0` (`Object.is` neřešit, stačí `== 0`).
  - `serializePanel({title:'A', rows:[[{label:'X', kind:'primary', onClick(){}}]]})` deepEqual `{title:'A', rows:[[{label:'X', kind:'primary'}]]}`.
  - `diffState({a:1,b:[1,2]},{a:1,b:[1,3],c:null})` deepEqual `{b:[1,3], c:null}`. `diffState({}, x)` deepEqual `x`.
  - `decode('nejson') === null`, `decode('{"x":1}') === null`, `decode(encode({t:'s',d:{}}))` deepEqual `{t:'s',d:{}}`.
- [ ] **Step 2: Run** `node --test tests/` (v `C:/Users/trani/vr-pc-sim`). Expected: FAIL, modul neexistuje.
- [ ] **Step 3: Implement** `js/stream/protocol.js` s rozhraním výše. Modul nesmí sahat na `THREE` ani DOM, importuje ho i prostředník.
- [ ] **Step 4: Run** `node --test tests/`. Expected: všechny PASS.
- [ ] **Step 5: Commit** `git add js/stream/protocol.js tests/protocol.test.mjs && git commit -m "Přenos: protokol zpráv a kód přenosu"`

### Task 2: Prostředník (Cloudflare Worker)

**Files:**
- Create: `prenos/room-logic.js`, `prenos/worker.js`, `prenos/wrangler.toml`, `prenos/README.md` (česky: k čemu je, jak nasadit, výpočet limitů)
- Test: `tests/room-logic.test.mjs`

**Interfaces:**
- Consumes: `normalizeCode`, `MAX_MSG_BYTES`, `MAX_VIEWERS` z `../js/stream/protocol.js`
- Produces:
  - `class RoomLogic` v `prenos/room-logic.js`. Socket je libovolný objekt s `send(str)` a `close(code, reason)`.
    - `join(sock, role: 'hrac'|'divak'): boolean`. Hráč nahradí předchozího (`close(4000,'nahrazen')`) a dostane `{t:'viewers',n}`. Divák nad `MAX_VIEWERS` dostane `close(4001,'plno')` a vrátí `false`, jinak dostane `{t:'player',on}` a hráč dostane `{t:'viewers',n}` a `{t:'need_full'}`.
    - `leave(sock)`: odchod hráče pošle divákům `{t:'player',on:false}`, odchod diváka pošle hráči nový `viewers`.
    - `message(sock, data: string)`: od hráče přepošle všem divákům, pokud `data.length <= MAX_MSG_BYTES` a hráč neposlal v posledních 1000 ms víc než 30 zpráv (jinak zprávu zahodí). Zprávy od diváků zahodí.
    - `now` se předává v konstruktoru (`new RoomLogic(() => Date.now())`), aby šel v testu podstrčit čas.
  - `worker.js`: `fetch` přijme jen `GET /room/:code` s hlavičkou `Upgrade: websocket`, kód ověří `normalizeCode` a `role` musí být `hrac|divak`, jinak 400. Hlavička Origin, pokud ji požadavek má (prohlížeče ji posílají vždy), musí být `https://danektran.github.io` nebo `http://localhost:*` / `http://127.0.0.1:*`, jinak 403. Bez hlavičky Origin požadavek projde (Node testy; jiné weby tak nemohou přenos zneužít, klienty mimo prohlížeč to stejně nezastaví). Požadavek předá Durable Objectu `ROOMS.idFromName(code)`. Třída `Room` používá `this.ctx.acceptWebSocket(server, [role])` a handlery `webSocketMessage` / `webSocketClose` / `webSocketError`. `RoomLogic` po probuzení z hibernace obnoví z `this.ctx.getWebSockets()` a jejich tagů.
  - `wrangler.toml`: `name = "vr-dilna-prenos"`, `main = "worker.js"`, aktuální `compatibility_date`, `[[durable_objects.bindings]] name = "ROOMS" class_name = "Room"`, `[[migrations]] tag = "v1" new_sqlite_classes = ["Room"]`.

- [ ] **Step 1: Write the failing tests** `tests/room-logic.test.mjs` s falešnými sockety (`{sent:[], closed:null, send(s){this.sent.push(JSON.parse(s))}, close(c,r){this.closed=[c,r]}}`):
  - `hráč pak divák`: hráč má `[{t:'viewers',n:0}, {t:'viewers',n:1}, {t:'need_full'}]`, divák má `[{t:'player',on:true}]`.
  - `přeposlání`: `message(hrac, '{"t":"s"}')` se objeví u obou diváků, `message(divak, …)` u nikoho.
  - `velikost`: zpráva o `MAX_MSG_BYTES + 1` znacích se nepřepošle.
  - `četnost`: 31. zpráva v rámci jedné sekundy (podstrčený čas) se nepřepošle, po posunu času o 1001 ms projde.
  - `druhý hráč`: první hráč má `closed[0] === 4000`, diváci zprávy dostávají od druhého.
  - `plno`: šestý divák má `closed[0] === 4001` a `join` vrátí `false`.
  - `hráč odešel`: divák dostane `{t:'player',on:false}`.
- [ ] **Step 2: Run** `node --test tests/`. Expected: FAIL u room-logic.
- [ ] **Step 3: Implement** `prenos/room-logic.js`, pak `worker.js` a `wrangler.toml`.
- [ ] **Step 4: Run** `node --test tests/`. Expected: PASS. Pak `cd prenos && npx wrangler dev --port 8787` a v druhém terminálu krátký skript `prenos/smoke.mjs` (globální `WebSocket` v Node, bez Origin): připojí `role=hrac` a `role=divak` na `ws://127.0.0.1:8787/room/K7QM`, hráč pošle `{"t":"s","d":{}}`. Expected: divák ji dostane. Dál `curl -i` s hlavičkami WebSocket upgradu a `Origin: https://evil.example` → `403`, kód `K0QM` → `400`.
- [ ] **Step 5: Ověř limity.** V aktuální dokumentaci Cloudflare (Durable Objects → Pricing / Limits, plán Workers Free) najdi denní limit požadavků a doby běhu. Do `prenos/README.md` zapiš čísla, odkaz a výpočet pro 15 dvojic × 10 zpráv/s × 45 min (příchozí zprávy 20 : 1). Pokud výpočet vychází nad 50 % denního limitu, zastav se a řekni to Danielovi.
- [ ] **Step 6: Commit** `git add prenos tests/room-logic.test.mjs && git commit -m "Přenos: prostředník na Cloudflare (místnost na kód)"`

### Task 3: Snímek stavu (capture/apply)

**Files:**
- Create: `js/stream/snapshot.js`
- Modify: `js/scene.js` (`drawMonitor` uloží `monitor.last = {mode, d}`), `js/game/paste.js` (export `pasteTime(): number|null` a `setPasteTime(t: number): void`), `js/game/customer.js` (`arriveCustomer` uloží na avatar `a.name`, `a.bodyType`; export `removeAvatar`), `js/phases/theory.js` (vytáhnout tvorbu popisků do exportovaných `showExplodeLabels()` a `clearExplodeLabels()`, `explode()` je používá, chování beze změny)
- Test: `C:/Users/trani/vr-pc-sim-test/lib.js` (vytaženo z `run.js`), `C:/Users/trani/vr-pc-sim-test/stream-apply.js`

**Interfaces:**
- Consumes: Task 1 (`packPose`, `serializePanel`, `q`)
- Produces:
  - `captureState(): object`, všechny klíče z tabulky formátu zpráv. Hlava z `camera.matrixWorld` (`decompose`), ovladače z `ctrl[i].matrixWorld`, jen když `renderer.xr.isPresenting`, jinak `null`. `rayLen` = `ctrl[i].userData.line.scale.z`, nebo `0`, když paprsek není vidět. `hov` z `panel.buttons` s `userData.hover`, `res` čte `#results` (hidden → `null`), `#resCode` a řádky `#resTable`.
  - `applyState(d: object): void` (divák). Aplikuje jen klíče přítomné v `d`, každý ve vlastní větvi `if('<klíč>' in d)` (přesně takový zápis, test na něm staví negativní kontrolu). Polohy dílů neaplikuje přímo, ale uloží jako cíle do `targets` (`export const targets = {parts:{}, head:null, c0:null, c1:null}`). Zbytek se aplikuje hned:
    - `inst`: přepíše `installed` a `parts[id].at`, nastaví trubku kabelu, polohy nemění
    - `panel`: `setPanel` s tlačítky bez `onClick`, potom `hov`
    - `mon`: `drawMonitor(mode, d)`
    - `cust`: chybějící zákazníky vytvoří `arriveCustomer`, nastaví `state`/`t`/`talk`/`ry`, polohu opraví, když se liší o víc než 5 cm, a zákazníky, kteří ve zprávě nejsou, odstraní `removeAvatar`
    - `paste`: když přijde číslo a animace neběží, `startPasteAnim(()=>{})`, pak `setPasteTime(t)`
    - `psu` / `dirty`: při změně `replacePart('psu', w)` nebo `applyFault('cooler')`. Při `dirty` 1 → 0 použij `replacePart('cooler')`.
    - `xl`: `showExplodeLabels()` / `clearExplodeLabels()`, `ghosts`, `leds` (`setLeds`), `pled`, `phase` (`S.phase`), `hl` (`setHoverLabel`)
  - `stepTargets(dt: number): void`: díly se přibližují k cílům, `k = 1 - Math.exp(-dt*15)` (lerp + slerp). Na začátku (první `full`) se nastaví rovnou.

- [ ] **Step 1: Vytáhni `serve`, `makeCtx` a scénáře z `run.js` do `lib.js`** (`module.exports`), `run.js` je jen použije. Spusť `node run.js C:/Users/trani/vr-pc-sim both`. Expected: stejný výsledek jako před úpravou (jen známé rozdíly).
- [ ] **Step 2: Write the failing test** `stream-apply.js`. Dvě stránky v jednom prohlížeči. Stránka A (`?scenar=den1&skupina=TEST-A`) projde scénářem `scenarioFull` z `lib.js`. Stránka B (`?scenar=den1`, jen načtená, nic se neklikne). V každém kontrolním bodě `snap` zavolej v A `captureState()`, předej výsledek do B `applyState(d)` a v B 2 s volej `stepTargets(0.05)`. Pak porovnej A a B:
  - `panel.content` přes `serializePanel` (deepEqual)
  - `monitor.last` (deepEqual)
  - `installed` (deepEqual)
  - polohy všech 9 dílů (rozdíl ≤ 0,01 m)
  - jména a stavy zákazníků
  - `S.phase`
  - hash `panel.canvas.toDataURL()` (shodný)

  Funkce se zpřístupní přes `adapter.js` (`window.__T.captureState`, `applyState`, `stepTargets`). Výstup: `OK n kontrol` nebo seznam rozdílů a exit kód 1.
- [ ] **Step 3: Run** `node stream-apply.js C:/Users/trani/vr-pc-sim`. Expected: FAIL (`captureState` neexistuje).
- [ ] **Step 4: Implement** úpravy v `scene.js`, `paste.js`, `customer.js`, `theory.js` a `js/stream/snapshot.js`.
- [ ] **Step 5: Run** `node stream-apply.js C:/Users/trani/vr-pc-sim`. Expected: `OK`, exit 0.
- [ ] **Step 6: Negativní kontrola.** S `NEG=1` testovací server v servírovaném `snapshot.js` nahradí `if('panel' in d)` za `if(false)`. Run: `NEG=1 node stream-apply.js C:/Users/trani/vr-pc-sim`. Expected: FAIL s rozdílem panelu.
- [ ] **Step 7: Run** `node run.js C:/Users/trani/vr-pc-sim both`. Expected: jen známé rozdíly.
- [ ] **Step 8: Commit** (v repu `git add js && git commit -m "Přenos: snímek stavu scény pro diváka"`; `vr-pc-sim-test` není git repo).

### Task 4: Odesílání z brýlí

**Files:**
- Create: `js/stream/sender.js`
- Modify: `js/config.js` (`RELAY_URL = ''`, dokud prostředník není nasazený; komentář s `?prenos=ano` a `?divak`; `VIEWER = PARAMS.has('divak')`), `js/app.js` (ve smyčce za `renderer.render` volej `tickSender(performance.now())`, při startu `startSender()`), `js/data.js` (souhrn: `divak: STREAM_ON ? (viewerEver ? 'ano' : 'ne') : ''`), `index.html` (`<p class="note" id="streamNote" hidden>` na úvodní kartě pod `#xrNote`), `data/hlasky.json` (`prenos.uvod`: „Kód pro diváka: {kod}“, `prenos.stitek_ceka`: „Divák: {kod}“, `prenos.stitek_pripojen`: „Divák: {kod} · sleduje“)
- Test: `C:/Users/trani/vr-pc-sim-test/stream-offline.js`

**Interfaces:**
- Consumes: Task 1 (`makeStreamCode`, `diffState`, `encode`, `decode`, `SEND_HZ`, `FULL_EVERY_MS`), Task 3 (`captureState`)
- Produces (`js/stream/sender.js`):
  - `STREAM_ON: boolean` = `PARAMS.get('prenos')==='ano' && !!RELAY_URL && !VIEWER`
  - `streamCode: string` (prázdný, když je přenos vypnutý)
  - `viewerEver(): boolean`
  - `startSender(): void`: když je `STREAM_ON`, vytvoří kód, ukáže `#streamNote`, vytvoří štítek a připojí se.
  - `tickSender(nowMs: number): void`: když je divák připojený (`n>0`), otevřený socket a `bufferedAmount < 64000`, pošle nejvýš `SEND_HZ`× za s rozdíl stavu. Celý snímek pošle, když od posledního uplynulo `FULL_EVERY_MS` nebo přišlo `need_full`. Bez diváka neskládá stav vůbec.
  - Opětovné připojení po `close` za 1, 2, 4, 8, 15, 15… s. Všechno v `try/catch`, chyby nejdou do konzole jako `error` (nanejvýš `console.info`).
  - Štítek: `Mesh` s canvasem 512×96 jako potomek `panel.group`, vpravo nad horní hranou panelu (`x = PW/2 - 0.1`, `y = PH/2 + 0.03`). Překresluje se jen při změně stavu (čeká / sleduje).

- [ ] **Step 1: Write the failing test** `stream-offline.js`: serve repo s `RELAY_URL` přepsaným v `js/config.js` na `ws://127.0.0.1:9` (nic tam neběží), otevři `?prenos=ano&scenar=den1&skupina=TEST-O` a projdi `scenarioFull`. Ověř:
  - scénář doběhl bez `FAILED`
  - konzole neobsahuje chyby kromě řádků se `WebSocket connection to`
  - `#streamNote` je vidět a obsahuje kód odpovídající `normalizeCode`
  - průměrná doba `tickSender` < 0,3 ms (změř v testu obalením přes `performance.now()`)
- [ ] **Step 2: Run** `node stream-offline.js C:/Users/trani/vr-pc-sim`. Expected: FAIL (`#streamNote` neexistuje).
- [ ] **Step 3: Implement** `sender.js` a úpravy souborů výše.
- [ ] **Step 4: Run** `node stream-offline.js C:/Users/trani/vr-pc-sim`. Expected: PASS. Pak `node run.js C:/Users/trani/vr-pc-sim both`. Expected: jen známé rozdíly (bez `?prenos` se nic neděje).
- [ ] **Step 5: Commit** `git commit -am "Přenos: odesílání stavu z brýlí (?prenos=ano)"` (+ `git add js/stream/sender.js`)

### Task 5: Divák

**Files:**
- Create: `js/stream/viewer.js`, `js/stream/player-avatar.js`
- Modify: `index.html` (`#viewerOverlay`: nadpis „Sledování sezení“, pole `#viewerCode`, tlačítko `#btnWatch` „Sledovat“, `#viewerNote`; lišta `#viewerBar`: `#btnEyes` „Očima hráče“, `#btnFree` „Volná kamera“, `#viewerStatus`), `css/style.css` (lišta diváka, aktivní tlačítko přepínače), `js/app.js` (při `VIEWER` se nespouští `flushQueue`, `#research` ani `applyHover`; ve smyčce `tickViewer(dt)` před `renderer.render`; `boot` zavolá `goIntro()` a pak `startViewer()`), `js/interaction.js` (při `VIEWER` vede `pointerdown` rovnou na otáčení, `pointermove` nedělá raycast, takže se nedá nic stisknout ani uchopit), `js/xr.js` (při `VIEWER` skrýt `#overlay`, nekontrolovat XR), `js/feedback.js` (při `VIEWER` žádný zvuk ani šum ventilátorů, jako `?zvuk=ne`), `data/hlasky.json` (`divak.ceka`: „Čekám na brýle s kódem {kod}…“, `divak.pripojeno`: „Sleduješ kód {kod}“, `divak.hrac_odesel`: „Brýle se odpojily. Čekám, až se vrátí…“, `divak.preruseno`: „Spojení přerušeno, zkouším znovu…“, `divak.plno`: „K těmto brýlím už se dívá moc diváků.“, `divak.spatny_kod`: „Kód má 4 znaky, např. K7QM.“)
- Test: `C:/Users/trani/vr-pc-sim-test/stream-e2e.js`

**Interfaces:**
- Consumes: Task 1 (`normalizeCode`, `decode`), Task 3 (`applyState`, `stepTargets`, `targets`), `desk` a `updateOrbit` z `interaction.js`
- Produces:
  - `startViewer(): void`: s platným kódem v `?divak=` se připojí hned, jinak ukáže `#viewerOverlay`.
  - `tickViewer(dt: number): void`: zavolá `stepTargets(dt)` a aktualizuje kameru a postavu hráče.
  - `viewMode: 'eyes'|'free'` (výchozí `'eyes'`)
  - Pohled očima hráče: `camera.fov = 80`, poloha a natočení se přibližují k `targets.head` s `k = 1 - Math.exp(-dt*6)`. Hlava postavy je skrytá, ovladače vidět.
  - Volná kamera: `updateOrbit()` z dnešního otáčení, postava hráče je vidět. Dotyk: jeden prst otáčí (už funguje přes pointer události), dva prsty mění `desk.radius` (rozsah `0.4–1.9` jako kolečko) a během gesta se neotáčí.
  - `player-avatar.js`: `makePlayerAvatar(): {group, setPose(head, c0, c1)}`. Low-poly hlava (krabička brýlí + koule) a 2 ovladače jako v `interaction.js` s paprskem délky `rayLen` (`0` = skrytý). Barva `COL.accent`.
  - Při `res` ukázat `#results` s `#resCode` a `#resTable`, skrýt `#btnSave` a `#btnCopy`, `#btnCloseRes` nechat.
  - Opětovné připojení jako v Task 4, stavy v `#viewerStatus`. Při `close` s kódem 4001 ukázat `divak.plno` a znovu se nepřipojovat.

- [ ] **Step 1: Write the failing test** `stream-e2e.js`:
  - Spustí `npx wrangler dev --port 8787` v `C:/Users/trani/vr-pc-sim/prenos` a počká na `Ready`.
  - Servíruje repo s `RELAY_URL = 'ws://127.0.0.1:8787'`.
  - Stránka A: `?prenos=ano&scenar=den1&skupina=TEST-S`, kód přečte z `#streamNote`.
  - Stránka B: `?divak=<kód>`.
  - A projde `scenarioFull`. V každém kontrolním bodě počká 800 ms a porovná B s A stejně jako `stream-apply.js` (panel, monitor, `installed`, polohy ≤ 0,01 m, zákazníci, fáze).
  - Pozdní divák: stránka C se připojí, až A dojde k druhému zákazníkovi. Do 2,5 s musí sedět panel i zákazník.
  - Hráč odešel: zavři A. `#viewerStatus` v B do 3 s obsahuje text `divak.hrac_odesel`.
  - Divák nic neovládá: klik v B na střed tlačítka panelu nezmění `panel.content` v A ani v B.
  - Tok dat: součet délek zpráv přijatých v B ÷ doba scénáře < 5000 B/s (počítá `viewer.js` do `window.__streamBytes`, jen když je v adrese `ladeni=ano`. Divák nic neposílá, takže to výzkumná data neovlivní).
  - Konzole B bez chyb.
- [ ] **Step 2: Run** `node stream-e2e.js C:/Users/trani/vr-pc-sim`. Expected: FAIL (divák nemá `#viewerStatus`).
- [ ] **Step 3: Implement** `viewer.js`, `player-avatar.js` a úpravy souborů výše.
- [ ] **Step 4: Run** `node stream-e2e.js C:/Users/trani/vr-pc-sim`. Expected: PASS. Negativní kontrola: `NEG=1 node stream-e2e.js …` (stejná náhrada jako v Task 3). Expected: FAIL. Pak `node run.js … both` a `node stream-offline.js …`. Expected: beze změny.
- [ ] **Step 5: Vizuální kontrola:** snímky obrazovky B v obou režimech (očima hráče, volná kamera) a s otevřeným tabletovým výřezem 820×1180 (`hasTouch: true`) do `C:/Users/trani/vr-pc-sim-test/stream-shots/`. Prohlédni je a ověř, že lišta nezakrývá panel a že postava hráče je vidět.
- [ ] **Step 6: Commit** `git add js index.html css data && git commit -m "Přenos: režim diváka (?divak=KÓD), očima hráče a volná kamera"`

### Task 6: Nasazení a dokumentace

**Files:**
- Modify: `js/config.js` (`RELAY_URL` = nasazená adresa `wss://vr-dilna-prenos.<účet>.workers.dev`), `CLAUDE.md` (parametry `?prenos=ano`, `?divak=KÓD`; struktura `js/stream/`, `prenos/`, `tests/`; testy `node --test tests/`, `stream-apply.js`, `stream-offline.js`, `stream-e2e.js`), `docs/herni-navrh.md` (parametry, pokud je tam tabulka parametrů)

- [ ] **Step 1:** Požádej Daniela o `! npx wrangler login` (ve složce `prenos`), počkej na potvrzení.
- [ ] **Step 2:** `cd prenos && npx wrangler deploy`. Expected: výpis s adresou `*.workers.dev`.
- [ ] **Step 3:** Zapiš adresu do `RELAY_URL`. Spusť `stream-e2e.js` proti nasazenému prostředníkovi: proměnná `RELAY=wss://…` přeskočí `wrangler dev`, servírovaný Origin je `http://127.0.0.1`, a ten je povolený. Expected: PASS.
- [ ] **Step 4:** Doplň dokumentaci. Spusť `node --test tests/` a `node run.js … both`. Expected: PASS / známé rozdíly.
- [ ] **Step 5: Commit** `git commit -am "Přenos: nasazený prostředník, dokumentace"`. Push a sloučení do `main` (tím i nasazení na Pages) až po souhlasu Daniela (superpowers:finishing-a-development-branch).
