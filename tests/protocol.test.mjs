import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  makeStreamCode,
  normalizeCode,
  q,
  serializePanel,
  diffState,
  encode,
  decode,
} from '../js/stream/protocol.js';

test('makeStreamCode vrací 4 znaky z abecedy', () => {
  assert.equal(makeStreamCode(() => 0), 'AAAA');
  assert.equal(makeStreamCode(() => 0.999), '9999');
});

test('makeStreamCode vytváří platné kódy', () => {
  for (let i = 0; i < 1000; i++) {
    const code = makeStreamCode();
    assert.notEqual(normalizeCode(code), null, `neplatný kód: ${code}`);
  }
});

test('normalizeCode normalizuje a validuje', () => {
  assert.equal(normalizeCode(' k7-qm '), 'K7QM');
  assert.equal(normalizeCode('K0QM'), null);
  assert.equal(normalizeCode('K7Q'), null);
  assert.equal(normalizeCode(''), null);
});

test('q zaokrouhluje na 3 desetinná místa', () => {
  assert.equal(q(1.23456), 1.235);
  assert.equal(q(-0.0004) == 0, true);
});

test('serializePanel odstraní onClick', () => {
  const out = serializePanel({
    title: 'A',
    rows: [[{ label: 'X', kind: 'primary', onClick() {} }]],
  });
  assert.deepEqual(out, { title: 'A', rows: [[{ label: 'X', kind: 'primary' }]] });
});

test('diffState vrací jen změněné klíče z next', () => {
  assert.deepEqual(
    diffState({ a: 1, b: [1, 2] }, { a: 1, b: [1, 3], c: null }),
    { b: [1, 3], c: null },
  );
  const x = { a: 1 };
  assert.deepEqual(diffState({}, x), x);
});

test('decode vrací null pro neplatný vstup', () => {
  assert.equal(decode('nejson'), null);
  assert.equal(decode('{"x":1}'), null);
});

test('encode a decode jsou vzájemně inverzní', () => {
  assert.deepEqual(decode(encode({ t: 's', d: {} })), { t: 's', d: {} });
});

test('diffStateJson souhlasí s diffState a vrací řetězce pro příště', async () => {
  const { diffStateJson } = await import('../js/stream/protocol.js');
  const prev = { a: 1, b: [1, 2], z: 'x' };
  const next = { a: 1, b: [1, 3], c: null, z: 'x' };
  const r1 = diffStateJson(null, prev);
  assert.deepEqual(r1.d, prev);
  assert.deepEqual(r1.json, { a: '1', b: '[1,2]', z: '"x"' });
  const r2 = diffStateJson(r1.json, next);
  assert.deepEqual(r2.d, diffState(prev, next));
  assert.deepEqual(r2.d, { b: [1, 3], c: null });
  assert.deepEqual(diffStateJson(r2.json, next).d, {});
});
