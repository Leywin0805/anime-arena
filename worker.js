// Anime Arena relay: one Durable Object per room code. It only passes messages between the players in a room.
// Room code in the URL: wss://<your-worker>/room/ABCD?host=1 (create) or ?host=0 (join)
export class Room {
  constructor(state, env) { this.peers = new Map(); this.hostId = 0; }
  send(ws, o) { try { ws.send(JSON.stringify(o)); } catch (e) {} }
  async fetch(req) {
    if ((req.headers.get('Upgrade') || '').toLowerCase() !== 'websocket') return new Response('websocket only', { status: 426 });
    const wantHost = new URL(req.url).searchParams.get('host') === '1';
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    const refuse = (m) => { this.send(server, { t: 'err', m }); server.close(1000, m); return new Response(null, { status: 101, webSocket: client }); };
    if (wantHost && this.peers.size > 0) return refuse('that code is already in use');
    if (!wantHost && this.peers.size === 0) return refuse('no room with that code');
    if (this.peers.size >= 4) return refuse('room is full');
    let id = 0; while (this.peers.has(id)) id++;
    if (wantHost) this.hostId = id;
    this.peers.set(id, server);
    this.send(server, { t: 'welcome', id, hostId: this.hostId });
    server.addEventListener('message', (ev) => {
      if (typeof ev.data !== 'string' || ev.data.length > 4000) return;
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.t === 'kick') { if (id === this.hostId) { const w = this.peers.get(m.id); if (w) try { w.close(1000, 'kicked'); } catch (e) {} } return; }
      m.from = id;
      const out = JSON.stringify(m);
      if (typeof m.to === 'number') { const w = this.peers.get(m.to); if (w) try { w.send(out); } catch (e) {} }
      else for (const [pid, w] of this.peers) if (pid !== id) try { w.send(out); } catch (e) {}
    });
    const gone = () => {
      if (this.peers.get(id) !== server) return;
      this.peers.delete(id);
      if (id === this.hostId && this.peers.size) { this.hostId = Math.min(...this.peers.keys()); for (const w of this.peers.values()) this.send(w, { t: 'host', id: this.hostId }); }
      for (const w of this.peers.values()) this.send(w, { t: 'left', id });
    };
    server.addEventListener('close', gone);
    server.addEventListener('error', gone);
    return new Response(null, { status: 101, webSocket: client });
  }
}
export default {
  async fetch(req, env) {
    const m = new URL(req.url).pathname.match(/^\/room\/([A-Za-z]{4})$/);
    if (!m) return new Response('Anime Arena relay', { status: 200 });
    const stub = env.ROOM.get(env.ROOM.idFromName(m[1].toUpperCase()));
    return stub.fetch(req);
  },
};
