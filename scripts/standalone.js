import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

// Vite emits dist/index.dev.html because rollup input is index.dev.html.
// Hosting needs dist/index.html; root copies keep file:// / standalone use.
const builtHtml = readFileSync('dist/index.dev.html', 'utf8');
writeFileSync('dist/index.html', builtHtml);
writeFileSync('index.html', builtHtml);
rmSync('assets', { recursive: true, force: true });
cpSync('dist/assets', 'assets', { recursive: true });
cpSync('dist/favicon.svg', 'favicon.svg');

console.log('Updated dist/index.html (Hosting), plus root index.html, assets/, and favicon.svg for file:// use.');
