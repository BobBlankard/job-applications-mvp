import { parseResumeText, resumeDataToYaml } from '../src/pdf-parser.js';

const sampleLines = `
Jane Doe
jane.doe@email.com | (555) 123-4567 | San Francisco, CA | linkedin.com/in/janedoe

SUMMARY
Software engineer with 5+ years building scalable web applications.
Experienced in full-stack development and API design.

EXPERIENCE
Senior Software Engineer
Acme Corporation | San Francisco, CA
Jan 2022 - Present
• Led development of customer-facing dashboard serving 50K+ daily users
• Reduced API response latency by 40% through query optimization

Software Engineer
TechStart Inc. | Austin, TX
Jun 2019 - Dec 2021
• Built RESTful microservices in Node.js and PostgreSQL

EDUCATION
B.S. Computer Science
University of California, Berkeley
2019

SKILLS
Languages: Python, JavaScript, TypeScript, SQL
Frameworks: React, Node.js, Express
`.trim().split('\n').map((text) => ({ text }));

const data = parseResumeText(sampleLines);
const output = resumeDataToYaml(data);

console.log('--- Parsed resume data ---');
console.log(JSON.stringify(data, null, 2));
console.log('\n--- YAML output ---');
console.log(output);

const checks = [
  ['name', data.name === 'Jane Doe'],
  ['email', data.contact?.email === 'jane.doe@email.com'],
  ['experience count', data.experience?.length === 2],
  ['first job title', data.experience?.[0]?.title === 'Senior Software Engineer'],
  ['education', data.education?.length === 1],
  ['skills', (data.skills?.length ?? 0) >= 2],
];

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) failed += 1;
}

if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}

console.log('\nAll parser checks passed.');
