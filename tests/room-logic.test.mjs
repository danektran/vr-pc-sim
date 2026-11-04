import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomLogic } from '../prenos/room-logic.js';
import { MAX_MSG_BYTES } from '../js/stream/protocol.js';

function sock() {
  return { sent: [], closed: null, send(s) { this.sent.push(JSON.parse(s)); }, close(c, r) { this.closed = [c, r]; } };
}
const raw = (s) => ({ sent: [], closed: null, send(x) { this.sent.push(x); }, close(c, r) { this.closed = [c, r]; } });

test('hráč pak divák', () => {
  const r = new RoomLogic(() => 0);
  const h = sock(), d = sock();
  assert.equal(r.join(h, 'hrac'), true);
  assert.equal(r.join(d, 'divak'), true);
  assert.deepEqual(h.sent, [{ t: 'viewers', n: 0 }, { t: 'viewers', n: 1 }, { t: 'need_full' }]);
  assert.deepEqual(d.sent, [{ t: 'player', on: true }]);
});

test('přeposlání', () => {
  const r = new RoomLogic(() => 0);
  const h = sock(), d1 = sock(), d2 = sock();
  r.join(h, 'hrac'); r.join(d1, 'divak'); r.join(d2, 'divak');
  r.message(h, '{"t":"s"}');
  assert.deepEqual(d1.sent.at(-1), { t: 's' });
  assert.deepEqual(d2.sent.at(-1), { t: 's' });
  const before = h.sent.length;
  r.message(d1, '{"t":"s","x":1}');
  assert.equal(d2.sent.length, 2);
  assert.equal(h.sent.length, before);
});

test('velikost', () => {
  const r = new RoomLogic(() => 0);
  const h = sock(), d = sock();
  r.join(h, 'hrac'); r.join(d, 'divak');
  r.message(h, 'x'.repeat(MAX_MSG_BYTES + 1));
  assert.equal(d.sent.length, 1);
  const ok = raw();
  r.join(ok, 'divak');
  r.message(h, 'x'.repeat(MAX_MSG_BYTES));
  assert.equal(ok.sent.at(-1).length, MAX_MSG_BYTES);
});

test('četnost', () => {
  let t = 0;
  const r = new RoomLogic(() => t);
  const h = sock(), d = sock();
  r.join(h, 'hrac'); r.join(d, 'divak');
  for (let i = 0; i < 30; i++) r.message(h, '{"t":"s"}');
  assert.equal(d.sent.length, 31);
  r.message(h, '{"t":"s"}');
  assert.equal(d.sent.length, 31);
  t = 1001;
  r.message(h, '{"t":"s"}');
  assert.equal(d.sent.length, 32);
});

test('druhý hráč', () => {
  const r = new RoomLogic(() => 0);
  const h1 = sock(), h2 = sock(), d = sock();
  r.join(h1, 'hrac'); r.join(d, 'divak'); r.join(h2, 'hrac');
  assert.equal(h1.closed[0], 4000);
  r.message(h2, '{"t":"s","from":2}');
  assert.deepEqual(d.sent.at(-1), { t: 's', from: 2 });
  r.leave(h1); // odchod nahrazeného nesmí vypnout nového hráče
  assert.notDeepEqual(d.sent.at(-1), { t: 'player', on: false });
});

test('plno', () => {
  const r = new RoomLogic(() => 0);
  r.join(sock(), 'hrac');
  for (let i = 0; i < 5; i++) assert.equal(r.join(sock(), 'divak'), true);
  const s = sock();
  assert.equal(r.join(s, 'divak'), false);
  assert.equal(s.closed[0], 4001);
});

test('hráč odešel', () => {
  const r = new RoomLogic(() => 0);
  const h = sock(), d = sock();
  r.join(h, 'hrac'); r.join(d, 'divak');
  r.leave(h);
  assert.deepEqual(d.sent.at(-1), { t: 'player', on: false });
});

test('divák odešel', () => {
  const r = new RoomLogic(() => 0);
  const h = sock(), d = sock();
  r.join(h, 'hrac'); r.join(d, 'divak');
  r.leave(d);
  assert.deepEqual(h.sent.at(-1), { t: 'viewers', n: 0 });
});

test('hráč se připojí k už připojeným divákům: dostanou player:true', () => {
  const r = new RoomLogic(() => 0);
  const d1 = sock(), d2 = sock();
  r.join(d1, 'divak'); r.join(d2, 'divak');
  assert.deepEqual(d1.sent, [{ t: 'player', on: false }]);
  const h = sock();
  r.join(h, 'hrac');
  assert.deepEqual(d1.sent.at(-1), { t: 'player', on: true });
  assert.deepEqual(d2.sent.at(-1), { t: 'player', on: true });
});

test('nahrazení hráče: diváci znovu dostanou player:true', () => {
  const r = new RoomLogic(() => 0);
  const h1 = sock(), h2 = sock(), d = sock();
  r.join(h1, 'hrac'); r.join(d, 'divak');
  const n = d.sent.length;
  r.join(h2, 'hrac');
  assert.deepEqual(d.sent.slice(n), [{ t: 'player', on: true }]);
  r.leave(h1);   // starý hráč se zavře později: divák nesmí dostat player:false
  assert.equal(d.sent.length, n + 1);
});

test('divák, který něco pošle, je odpojen (1008) a nic se nepřeposílá', () => {
  const r = new RoomLogic(() => 0);
  const h = sock(), d1 = sock(), d2 = sock();
  r.join(h, 'hrac'); r.join(d1, 'divak'); r.join(d2, 'divak');
  const n = d2.sent.length, hn = h.sent.length;
  r.message(d1, '{"t":"s"}');
  assert.equal(d1.closed[0], 1008);
  assert.equal(d2.sent.length, n);
  assert.equal(h.sent.length, hn);
});

test('ping se nepočítá, nepřeposílá a nikoho neodpojí', () => {
  const r = new RoomLogic(() => 0);
  const h = sock(), d = sock();
  r.join(h, 'hrac'); r.join(d, 'divak');
  const n = d.sent.length;
  for (let i = 0; i < 100; i++) r.message(h, '{"t":"ping"}');
  r.message(d, '{"t":"ping"}');
  assert.equal(d.sent.length, n);
  assert.equal(h.closed, null);
  assert.equal(d.closed, null);
  for (let i = 0; i < 30; i++) r.message(h, '{"t":"s"}');
  assert.equal(d.sent.length, n + 30);
});

test('hráč, který několik sekund v kuse překračuje limit, je odpojen', () => {
  let t = 0;
  const r = new RoomLogic(() => t);
  const h = sock(), d = sock();
  r.join(h, 'hrac'); r.join(d, 'divak');
  for (t = 0; t < 2500; t += 100) for (let i = 0; i < 40; i++) r.message(h, '{"t":"s"}');
  assert.equal(h.closed, null);
  for (t = 2500; t <= 3300; t += 100) for (let i = 0; i < 40; i++) r.message(h, '{"t":"s"}');
  assert.deepEqual(h.closed && h.closed[0], 1008);
});

test('krátké nárazové překročení limitu hráče neodpojí', () => {
  let t = 0;
  const r = new RoomLogic(() => t);
  const h = sock(), d = sock();
  r.join(h, 'hrac'); r.join(d, 'divak');
  for (let i = 0; i < 40; i++) r.message(h, '{"t":"s"}');
  t = 5000;
  for (let i = 0; i < 40; i++) r.message(h, '{"t":"s"}');
  assert.equal(h.closed, null);
});
