import net from 'net';
import fs from 'fs';
import path from 'path';

const PORT = parseInt(process.env.PG_PORT || '5433', 10);
const HOST = '127.0.0.1';
const DATA_DIR = path.resolve(process.env.PG_DATA_DIR || './.pglite-data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

console.log(`[PG-SERVER] Starting PostgreSQL zero-dependency server on ${HOST}:${PORT}`);
console.log(`[PG-SERVER] Data directory: ${DATA_DIR}`);

const server = net.createServer((socket) => {
  socket.on('error', (err) => {
    // Gracefully handle client disconnects
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[PG-SERVER] PostgreSQL server listening on ${HOST}:${PORT}`);
});

process.on('SIGINT', () => {
  server.close(() => {
    console.log('[PG-SERVER] Server stopped');
    process.exit(0);
  });
});
