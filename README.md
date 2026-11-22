# Anime Arena relay (free Cloudflare Worker)

1. Install Node, then in this folder run: `npx wrangler login`
2. Run: `npx wrangler deploy`
3. Copy the URL it prints (looks like `https://anime-arena-relay.<you>.workers.dev`).
4. In the game: ONLINE > RELAY SERVER, paste it as `wss://anime-arena-relay.<you>.workers.dev` (same address, `wss://` instead of `https://`).

The relay only forwards messages between players in a room (max 4). It stores nothing.
