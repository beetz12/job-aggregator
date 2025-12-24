#!/usr/bin/env node
const { detectPort } = require('detect-port');
const { spawn } = require('child_process');

// Use PORT env var (Railway sets this) or default to 3000
const DEFAULT_PORT = parseInt(process.env.PORT || '3000', 10);

async function startProd() {
  // Skip port detection if PORT is explicitly set (production/Railway)
  const port = process.env.PORT ? DEFAULT_PORT : await detectPort(DEFAULT_PORT);

  if (port !== DEFAULT_PORT && !process.env.PORT) {
    console.log(`\n⚠️  Port ${DEFAULT_PORT} is in use, using port ${port} instead\n`);
  }

  console.log(`Starting Next.js on port ${port}...`);

  const next = spawn('npx', ['next', 'start', '-p', port.toString()], {
    stdio: 'inherit',
    shell: true
  });

  next.on('close', (code) => {
    process.exit(code);
  });
}

startProd();
