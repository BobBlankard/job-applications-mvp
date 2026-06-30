import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const builtHtml = readFileSync('dist/index.dev.html', 'utf8');
writeFileSync('index.html', builtHtml);
rmSync('assets', { recursive: true, force: true });
cpSync('dist/assets', 'assets', { recursive: true });

console.log('Updated index.html and assets/ for file:// use.');
