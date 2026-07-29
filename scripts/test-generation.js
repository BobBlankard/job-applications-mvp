import { readFileSync } from 'fs';
import { parseJobDescription } from '../src/job-parser.js';
import { generateApplicationDocuments } from '../src/document-generator.js';
import { countResumePdfPages, buildResumePdf } from '../src/pdf-text-export.js';
import zlib from 'zlib';
import { masterProfileToResumeData, parseProfileYaml } from '../src/master-profile-adapter.js';

const LPL_JOB = `For this role:
Company logo for, LPL Financial.
LPL Financial

Business Development Associate 

San Diego, CA · Reposted 14 hours ago · 74 people clicked apply

Promoted by hirer · Responses managed off LinkedIn

Full-time
Apply

Save
About the job
Where Ambition Meets Innovation

Job Overview: 

As the Business Development Associate (BDA), you will be responsible for driving Financial Advisor lead flow to LPL's Advisor Recruiting team in order to increase sales. This will be done through prospecting, lead qualification, and effective reporting. Primary prospecting efforts will be phone based (cold-calling) with supplemental efforts using digital means (email campaigns and social media).

Responsibilities: 

Prospect financial advisors to gauge/create interest in meeting with a LPL recruiter
Use independent judgement to qualify a lead, determining if the lead should be introduced to the pipeline
100 outreaches per day – cold calls (primary), individual emails and social media outreaches (LinkedIn)
Utilize Salesforce.com to track individual KPIs and understand the impact of lead flow on territory funnel and results

Requirements: 

Sales experience or similar related degree

Core Competencies: 

Highly motivated and resilient by achieving sales targets consistently
Ability to quickly build rapport, primarily via phone based communication
Experience with MS Word, MS Excel, MS PowerPoint, Salesforce, MS Outlook
Experience or understanding of broker/dealers, advisory, finance or sales principals`;

const masterYaml = readFileSync(
  new URL('../src/data/master-profile.yaml', import.meta.url),
  'utf8'
);
const masterData = masterProfileToResumeData(parseProfileYaml(masterYaml));

const profileChecks = [
  ['master profile loads', masterYaml.length > 1000],
  ['master profile has ai_guidance', /ai_guidance:/i.test(masterYaml)],
  ['master profile has 6 experience entries', masterData.experience.length >= 6],
  ['master profile has High Country West', masterData.experience.some((j) => /high country/i.test(j.company))],
  ['master profile skills are formatted lines', masterData.skills.every((s) => typeof s === 'string' && s.includes(':'))],
  ['master profile has projects', masterData.projects.length >= 2],
];

const parsed = parseJobDescription(LPL_JOB);
console.log('--- Parsed job ---');
console.log(JSON.stringify(parsed, null, 2));

let failed = 0;
for (const [label, ok] of profileChecks) {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) failed += 1;
}

const checks = [
  ['company is LPL Financial', parsed.company === 'LPL Financial'],
  ['title is Business Development Associate', parsed.title === 'Business Development Associate'],
  ['location is San Diego, CA', parsed.location === 'San Diego, CA'],
  ['no company logo in company', !/company logo/i.test(parsed.company)],
  ['keywords include salesforce', parsed.keywords.includes('salesforce')],
  ['keywords include sales', parsed.keywords.includes('sales')],
];

for (const [label, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) failed += 1;
}

const generated = generateApplicationDocuments(masterYaml, LPL_JOB);
console.log('\n--- Generation ---');
console.log(`Role type: ${generated.roleType} (${generated.roleLabel})`);
console.log(`Summary: ${generated.resumeData.summary}`);
console.log(`Experience count: ${generated.resumeData.experience.length}`);
console.log(`First experience title: ${generated.resumeData.experience[0].title}`);
console.log(`First bullets: ${generated.resumeData.experience[0].bullets.join(' | ')}`);

const bandhouse = generated.resumeData.experience.find((job) => /bandhouse/i.test(job.company));
if (bandhouse) {
  console.log(`BandHouse bullets: ${bandhouse.bullets.join(' | ')}`);
}

function allBulletsUnique(experience) {
  const bullets = experience.flatMap((job) => job.bullets || []);
  for (let i = 0; i < bullets.length; i++) {
    for (let j = i + 1; j < bullets.length; j++) {
      const a = bullets[i].toLowerCase().slice(0, 48);
      const b = bullets[j].toLowerCase().slice(0, 48);
      if (a === b || bullets[i].toLowerCase() === bullets[j].toLowerCase()) return false;
    }
  }
  return true;
}

const pdfPages = countResumePdfPages(generated.resumeData, 'classic');
console.log(`PDF page count: ${pdfPages}`);

function decodeFirstPdfStream(doc) {
  const pdf = Buffer.from(doc.output('arraybuffer')).toString('latin1');
  const streamMatch = pdf.match(/stream\r?\n([\s\S]*?)\r?\nendstream/);
  if (!streamMatch) return '';
  try {
    return zlib.inflateSync(Buffer.from(streamMatch[1], 'latin1')).toString('latin1');
  } catch {
    return streamMatch[1];
  }
}

const compactDoc = buildResumePdf(generated.resumeData, 'compact-minimal');
const compactStream = decodeFirstPdfStream(compactDoc);
const idxName = compactStream.indexOf(generated.resumeData.name || 'Your Name');
const idxSummary = compactStream.indexOf('SUMMARY');
const idxExperience = compactStream.indexOf('EXPERIENCE');
const pdfOrderOk = idxName >= 0 && idxSummary > idxName && idxExperience > idxSummary;
console.log(`${pdfOrderOk ? '✓' : '✗'} PDF stream order: name before sections`);

const genChecks = [
  ['role type is sales', generated.roleType === 'sales'],
  ['summary has no Applying for', !/Applying for/i.test(generated.resumeData.summary)],
  ['summary has no Eager to contribute', !/Eager to contribute/i.test(generated.resumeData.summary)],
  ['summary has no company name', !/LPL Financial/i.test(generated.resumeData.summary)],
  ['summary has no Poway', !/Poway/i.test(generated.resumeData.summary)],
  ['summary mentions San Diego area', /San Diego/i.test(generated.resumeData.summary)],
  ['summary mentions prospecting or business development', /prospecting|business development/i.test(generated.resumeData.summary)],
  ['summary has no internal tools bleed', !/internal tools/i.test(generated.resumeData.summary)],
  ['title reframed for sales', /Business Development/i.test(generated.resumeData.experience[0].title)],
  ['skills reorganized for sales', /Business Development:/i.test(generated.resumeData.skills[0])],
  ['bullet mentions client or outreach', /client|outreach|communication|follow-up/i.test(generated.resumeData.experience[0].bullets[0])],
  ['no duplicate bullets', allBulletsUnique(generated.resumeData.experience)],
  ['PinHaus/Seed deprioritized (max 4 jobs)', generated.resumeData.experience.length <= 4],
  ['BandHouse bullets sound like BD/sales', bandhouse ? !/feature requests|bug fix/i.test(bandhouse.bullets.join(' ')) : true],
  ['BandHouse bullets mention outreach or partners', bandhouse ? /outreach|partner|market|relationship/i.test(bandhouse.bullets.join(' ')) : true],
  ['PDF fits one page', pdfPages === 1],
  ['PDF stream order name before sections', pdfOrderOk],
];

for (const [label, ok] of genChecks) {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) failed += 1;
}

if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}

console.log('\nAll generation checks passed.');
