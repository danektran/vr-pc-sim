// Cloudflare Worker: přijme WebSocket na /room/:code?role=hrac|divak
// a předá ho Durable Objectu, který drží jednu místnost.
import { DurableObject } from 'cloudflare:workers';
import { normalizeCode } from '../js/stream/protocol.js';
import { RoomLogic } from './room-logic.js';

export function originAllowed(origin) {
  if (origin === null || origin === undefined) return true; // klienti mimo prohlížeč
  if (origin === 'https://danektran.github.io') return true;
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const m = /^\/room\/([^/]+)$/.exec(url.pathname);
    if (request.method !== 'GET' || !m) return new Response('Nenalezeno', { status: 404 });
    if ((request.headers.get('Upgrade') || '').toLowerCase() !== 'websocket') {
      return new Response('Očekávám WebSocket', { status: 426 });
    }
    if (!originAllowed(request.headers.get('Origin'))) {
      return new Response('Zakázaný původ', { status: 403 });
    }
    let code = null;
    try { code = normalizeCode(decodeURIComponent(m[1])); } catch (e) { code = null; }
    const role = url.searchParams.get('role');
    if (!code || (role !== 'hrac' && role !== 'divak')) {
      return new Response('Špatný kód nebo role', { status: 400 });
    }
    const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
    return stub.fetch(request);
  },
};

export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.logic = new RoomLogic(() => Date.now());
    // po probuzení z hibernace obnovíme, kdo je hráč a kdo diváci
    for (const ws of this.ctx.getWebSockets()) {
      const role = this.ctx.getTags(ws)[0];
      this.logic.restore(ws, role);
    }
  }

  async fetch(request) {
    const role = new URL(request.url).searchParams.get('role');
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server, [role]);
    this.logic.join(server, role);
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(ws, message) {
    this.logic.message(ws, message);
  }

  webSocketClose(ws) {
    this.logic.leave(ws);
    try { ws.close(); } catch (e) { /* už zavřený */ }
  }

  webSocketError(ws) {
    this.logic.leave(ws);
  }
}
