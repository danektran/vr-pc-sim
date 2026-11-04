// Protokol přenosu pohledu na divákovo zařízení.
// Čisté funkce bez THREE a bez DOM: importuje je i Cloudflare Worker.

// Abeceda bez znaků 0, O, I, 1, které se snadno pletou.
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const SEND_HZ = 10;
export const FULL_EVERY_MS = 2000;
export const MAX_MSG_BYTES = 16000;
export const MAX_VIEWERS = 5;

const CODE_LEN = 4;
const CODE_RE = /^[A-HJ-NP-Z2-9]{4}$/;

// Vygeneruje kód přenosu z CODE_ALPHABET. rnd musí vracet číslo v <0, 1).
export function makeStreamCode(rnd = Math.random) {
  let code = '';
  for (let i = 0; i < CODE_LEN; i++) {
    const idx = Math.floor(rnd() * CODE_ALPHABET.length);
    code += CODE_ALPHABET[idx];
  }
  return code;
}

// Uživatel může kód napsat malými písmeny, s mezerami nebo pomlčkou.
// Vrátí čistý kód, nebo null, když neodpovídá formátu.
export function normalizeCode(s) {
  if (typeof s !== 'string') return null;
  const code = s.trim().toUpperCase().replace(/[\s-]/g, '');
  return CODE_RE.test(code) ? code : null;
}

// Zaokrouhlení na 3 desetinná místa, aby zprávy zůstaly malé.
export function q(n) {
  return Math.round(n * 1000) / 1000;
}

// Pozice a natočení jako pole 7 čísel: x, y, z, qx, qy, qz, qw.
export function packPose(p, quat) {
  return [p.x, p.y, p.z, quat.x, quat.y, quat.z, quat.w].map(q);
}

// Odstraní undefined hodnoty, aby výsledek šel přes JSON bez ztráty.
function dropUndefined(obj) {
  const out = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) out[key] = obj[key];
  }
  return out;
}

// Převede panel na čistá data bez funkcí (onClick se do diváka neposílá).
export function serializePanel(c) {
  const out = dropUndefined({
    step: c.step,
    topline: c.topline,
    title: c.title,
    body: c.body,
    status: c.status,
    statusKind: c.statusKind,
  });
  if (c.rows !== undefined) {
    out.rows = c.rows.map((row) =>
      row.map((btn) => dropUndefined({ label: btn.label, kind: btn.kind, disabled: btn.disabled })),
    );
  }
  return out;
}

// Vrátí jen klíče z next, jejichž JSON hodnota se liší od prev.
export function diffState(prev, next) {
  const out = {};
  for (const key of Object.keys(next)) {
    if (JSON.stringify(prev[key]) !== JSON.stringify(next[key])) {
      out[key] = next[key];
    }
  }
  return out;
}

export function encode(msg) {
  return JSON.stringify(msg);
}

// Vrátí zprávu, nebo null při neplatném JSON nebo chybějícím textovém t.
export function decode(str) {
  let msg;
  try {
    msg = JSON.parse(str);
  } catch {
    return null;
  }
  if (msg === null || typeof msg !== 'object' || typeof msg.t !== 'string') return null;
  return msg;
}
