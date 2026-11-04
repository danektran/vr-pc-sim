// Logika jedné místnosti přenosu: jeden hráč, nejvýše MAX_VIEWERS diváků.
// Nezná Cloudflare, socket je libovolný objekt s send(str) a close(code, reason).
import { MAX_MSG_BYTES, MAX_VIEWERS } from '../js/stream/protocol.js';

const RATE_WINDOW_MS = 1000;
const RATE_MAX = 30;
const RATE_STRIKE_MS = 3000;   // hráč, který překračuje limit takhle dlouho v kuse, se odpojí
const PING = '{"t":"ping"}';

export class RoomLogic {
  constructor(now = () => Date.now()) {
    this.now = now;
    this.player = null;
    this.viewers = new Set();
    this.stamps = []; // časy posledních zpráv od hráče
    this.overSince = null; this.lastDrop = null;
  }

  _send(sock, obj) {
    try { sock.send(JSON.stringify(obj)); } catch (e) { /* socket už je mrtvý */ }
  }

  _tellPlayerViewers() {
    if (this.player) this._send(this.player, { t: 'viewers', n: this.viewers.size });
  }

  // Obnova po probuzení z hibernace: bez posílání zpráv.
  restore(sock, role) {
    if (role === 'hrac') this.player = sock;
    else if (role === 'divak') this.viewers.add(sock);
  }

  join(sock, role) {
    if (role === 'hrac') {
      const old = this.player;
      this.player = sock;
      this.stamps = []; this.overSince = null; this.lastDrop = null;
      if (old && old !== sock) {
        try { old.close(4000, 'nahrazen'); } catch (e) { /* už zavřený */ }
      }
      this._tellPlayerViewers();
      for (const v of this.viewers) this._send(v, { t: 'player', on: true });
      return true;
    }
    if (role === 'divak') {
      if (this.viewers.size >= MAX_VIEWERS) {
        try { sock.close(4001, 'plno'); } catch (e) { /* už zavřený */ }
        return false;
      }
      this.viewers.add(sock);
      this._send(sock, { t: 'player', on: !!this.player });
      if (this.player) {
        this._tellPlayerViewers();
        this._send(this.player, { t: 'need_full' });
      }
      return true;
    }
    return false;
  }

  leave(sock) {
    if (sock === this.player) {
      this.player = null;
      for (const v of this.viewers) this._send(v, { t: 'player', on: false });
    } else if (this.viewers.delete(sock)) {
      this._tellPlayerViewers();
    }
  }

  message(sock, data) {
    // ping hráče vyřizuje automatická odpověď prostředníka; kdyby dorazil sem, nepočítá se a nepřeposílá
    if (data === PING) return;
    // divák nic odesílat nesmí
    if (sock !== this.player) {
      try { sock.close(1008, 'divák nesmí odesílat'); } catch (e) { /* už zavřený */ }
      return;
    }
    if (typeof data !== 'string') return;
    if (data.length > MAX_MSG_BYTES) return;
    const t = this.now();
    this.stamps = this.stamps.filter((s) => t - s < RATE_WINDOW_MS);
    if (this.stamps.length >= RATE_MAX) {
      if (this.overSince === null) this.overSince = t;
      this.lastDrop = t;
      if (t - this.overSince >= RATE_STRIKE_MS) {
        try { sock.close(1008, 'příliš časté zprávy'); } catch (e) { /* už zavřený */ }
      }
      return;
    }
    if (this.lastDrop !== null && t - this.lastDrop > RATE_WINDOW_MS) { this.overSince = null; this.lastDrop = null; }
    this.stamps.push(t);
    for (const v of this.viewers) {
      try { v.send(data); } catch (e) { /* divák odpadl */ }
    }
  }
}
