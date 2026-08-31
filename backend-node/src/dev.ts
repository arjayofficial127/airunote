import fs from 'fs';
import path from 'path';

function loadDevelopmentNeonUrl(): string {
  const envPath = path.resolve(process.cwd(), '.env');
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/^\s*#.*\bDATABASE_URL=(.+)\s*$/);
    if (!match?.[1]) continue;

    const value = match[1].trim().replace(/^['"]|['"]$/g, '');
    const target = new URL(value);
    if (target.hostname.endsWith('.neon.tech')) return value;
  }

  throw new Error('Development requires the commented production Neon DATABASE_URL profile in backend-node/.env');
}

process.env.DATABASE_URL = loadDevelopmentNeonUrl();

void import('./index.js');
