#!/usr/bin/env node
/**
 * Optional AI generation via Cursor SDK (runs locally, not in the browser).
 *
 * Setup:
 *   npm install @cursor/sdk
 *   export CURSOR_API_KEY="cursor_..."   # https://cursor.com/dashboard/integrations
 *
 * Usage:
 *   node scripts/generate-with-cursor.js --job path/to/job.txt
 *   node scripts/generate-with-cursor.js --job path/to/job.txt --out ./output
 *
 * Billing note: Cursor Pro ($20/mo) includes ~$20 of frontier-model API credit.
 * This script uses composer-2.5 by default (lower cost). See README in output for cost guidance.
 */

import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { buildSimpleCursorPrompt } from '../src/document-generator.js';
import { parseJobDescription } from '../src/job-parser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function parseArgs(argv) {
  const args = { job: '', out: join(root, 'generated') };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--job' && argv[i + 1]) args.job = argv[++i];
    else if (argv[i] === '--out' && argv[i + 1]) args.out = resolve(argv[++i]);
  }
  return args;
}

function extractYamlBlocks(text) {
  const blocks = [];
  const fence = /```(?:yaml|yml)?\s*([\s\S]*?)```/gi;
  let match;
  while ((match = fence.exec(text)) !== null) {
    if (match[1]?.trim()) blocks.push(match[1].trim());
  }
  return blocks;
}

async function main() {
  const { job: jobPath, out: outDir } = parseArgs(process.argv);
  if (!jobPath) {
    console.error('Usage: node scripts/generate-with-cursor.js --job <job-description.txt> [--out <dir>]');
    process.exit(1);
  }

  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    console.error('Set CURSOR_API_KEY (https://cursor.com/dashboard/integrations)');
    process.exit(1);
  }

  let Agent;
  try {
    ({ Agent } = await import('@cursor/sdk'));
  } catch {
    console.error('Install the SDK first: npm install @cursor/sdk');
    process.exit(1);
  }

  const jobText = readFileSync(resolve(jobPath), 'utf8');
  const masterYaml = readFileSync(resolve(root, 'src/data/master-profile.yaml'), 'utf8');
  const job = parseJobDescription(jobText);
  const prompt = buildSimpleCursorPrompt(job, masterYaml);

  console.log(`Generating for ${job.company} — ${job.title} via Cursor Agent...`);

  const result = await Agent.prompt(prompt, {
    apiKey,
    model: { id: 'composer-2.5' },
    local: { cwd: root, settingSources: [] },
  });

  if (result.status === 'error') {
    console.error('Agent run failed:', result.result || result.id);
    process.exit(2);
  }

  const blocks = extractYamlBlocks(result.result || '');
  if (blocks.length < 2) {
    console.error('Expected resume + cover letter YAML in agent response. Raw output saved.');
    mkdirSync(outDir, { recursive: true });
    const slug = `${job.company}-${job.title}`.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    writeFileSync(join(outDir, `${slug}-raw.txt`), result.result || '');
    process.exit(2);
  }

  mkdirSync(outDir, { recursive: true });
  const slug = `${job.company}-${job.title}`.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const resumePath = join(outDir, `${slug}-resume.yaml`);
  const coverPath = join(outDir, `${slug}-cover-letter.yaml`);
  writeFileSync(resumePath, blocks[0] + '\n');
  writeFileSync(coverPath, blocks[1] + '\n');

  console.log('Wrote:');
  console.log(' ', resumePath);
  console.log(' ', coverPath);
  console.log('\nImport these in the app or paste YAML into the editors.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
