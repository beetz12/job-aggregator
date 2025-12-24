// Minimal test server to diagnose Railway routing
// This runs INSTEAD of Motia to test if basic HTTP works

const http = require('http');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'ok',
    message: 'Minimal test server is working!',
    port: PORT,
    timestamp: new Date().toISOString(),
    path: req.url
  }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Minimal Test Server] Running on http://0.0.0.0:${PORT}`);
  console.log(`[Minimal Test Server] PORT env: ${process.env.PORT}`);
  console.log(`[Minimal Test Server] NODE_ENV: ${process.env.NODE_ENV}`);
});

// Keep the process alive
process.on('SIGTERM', () => {
  console.log('[Minimal Test Server] SIGTERM received, shutting down...');
  server.close(() => process.exit(0));
});
