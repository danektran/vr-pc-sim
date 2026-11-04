# Prostředník pro přenos sezení (Cloudflare Worker)

Malý server, který spojí hráče v brýlích s diváky v prohlížeči. Hráč se připojí na `/room/KÓD?role=hrac`, diváci na `/room/KÓD?role=divak`. Prostředník jen přeposílá zprávy od hráče všem divákům (nejvýše 5), nic neukládá. Každý kód má vlastní místnost (Durable Object `Room`, třída s úložištěm SQLite, jinak ji plán Free nepovolí).

Pravidla: zpráva může mít nejvýše `MAX_MSG_BYTES` (16 000) znaků, hráč nejvýše 30 zpráv za sekundu (víc se zahodí), druhý hráč v téže místnosti vyhodí prvního (kód 4000), šestý divák se nevejde (kód 4001). Požadavky z prohlížeče musí mít `Origin` `https://danektran.github.io` nebo `http://localhost:*` / `http://127.0.0.1:*`.

## Soubory

- `room-logic.js` – čistá logika místnosti (testy: `node --test tests/*.test.mjs`)
- `worker.js` – Worker a třída `Room`
- `wrangler.toml` – nastavení (`name = "vr-dilna-prenos"`)
- `smoke.mjs` – rychlá zkouška proti lokálně běžícímu serveru

## Místní zkouška

```
cd prenos
npx wrangler dev --port 8787
# v druhém terminálu:
node smoke.mjs
```

## Nasazení (dělá Daniel, vyžaduje účet Cloudflare)

```
cd prenos
npx wrangler login
npx wrangler deploy
```

Výsledná adresa bude `https://vr-dilna-prenos.<účet>.workers.dev`; klient se na ni připojuje přes `wss://`.

## Limity plánu Workers Free a výpočet

Zdroje (ověřeno 2026-11-04):
- https://developers.cloudflare.com/durable-objects/platform/pricing/
- https://developers.cloudflare.com/durable-objects/platform/limits/

Čísla z dokumentace (Free, denně, nuluje se v 00:00 UTC; po překročení další operace selhávají):
- požadavky: 100 000 / den; zahrnují vytvoření WebSocketu a příchozí zprávy, příchozí zprávy se počítají v poměru 20 : 1, odchozí zprávy jsou zdarma
- doba běhu: 13 000 GB-s / den; objekt se účtuje za 128 MB (0,125 GB) po dobu, kdy je aktivní a nemůže hibernovat
- velikost přijaté WebSocket zprávy: 32 MiB (my máme 16 000 znaků, takže bez problému)

Scénář: 15 dvojic (hráč + 1 divák), 10 zpráv/s od hráče, 45 minut = 2 700 s.
- příchozí zprávy: 15 × 10 × 2 700 = 405 000; při poměru 20 : 1 je to 20 250 požadavků
- spojení: 15 hráčů + 15 diváků = 30 požadavků
- celkem asi 20 300 požadavků = **20 % denního limitu** (100 000)
- doba běhu v nejhorším případě (zprávy chodí po 100 ms, objekt tedy nikdy nehibernuje): 2 700 s × 0,125 GB = 337,5 GB-s na místnost, × 15 = 5 062 GB-s = **39 % denního limitu** (13 000)

Oba údaje jsou pod hranicí 50 %. Rezerva je ale jen asi dvojnásobná u doby běhu: dvě třídy po 15 dvojicích za jeden den už by limit překročily. Odchozí zprávy diváků a ostatní diváci v téže místnosti dobu běhu nezvyšují (objekt je jeden na místnost). Plné stavy každé 2 s (`FULL_EVERY_MS`) přidají asi 5 % zpráv navíc, výpočet to nemění.
