// Kontrola proti běžícímu "wrangler dev --port 8787": hráč pošle zprávu, divák ji musí dostat.
const base = 'ws://127.0.0.1:8787/room/K7QM';
const open = (role) => new Promise((res, rej) => {
  const ws = new WebSocket(`${base}?role=${role}`);
  ws.msgs = [];
  ws.onmessage = (e) => ws.msgs.push(e.data);
  ws.onopen = () => res(ws);
  ws.onerror = () => rej(new Error('spojení selhalo: ' + role));
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const h = await open('hrac');
const d = await open('divak');
await wait(300);
h.send('{"t":"s","d":{}}');
await wait(300);
console.log('hrac dostal:', h.msgs);
console.log('divak dostal:', d.msgs);
const ok = d.msgs.includes('{"t":"s","d":{}}');
console.log(ok ? 'SMOKE OK' : 'SMOKE SELHAL');
h.close(); d.close();
process.exit(ok ? 0 : 1);
