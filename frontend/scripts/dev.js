#!/usr/bin/env node
const { detectPort } = require('detect-port');
const { spawn } = require('child_process');

const DEFAULT_PORT = 3000;

async function startDev() {
  const port = await detectPort(DEFAULT_PORT);

  if (port !== DEFAULT_PORT) {
    console.log(`\n⚠️  Port ${DEFAULT_PORT} is in use, using port ${port} instead\n`);
  }

  const next = spawn('npx', ['next', 'dev', '-p', port.toString()], {
    stdio: 'inherit',
    shell: true
  });

  next.on('close', (code) => {
    process.exit(code);
  });
}

startDev();
