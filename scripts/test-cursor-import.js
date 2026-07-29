import { readFileSync } from 'fs';
import { parseCursorResponse, getFitBadgeMeta } from '../src/cursor-import.js';

const DELIMITER_FORMAT = `---APPLICATION---
company: LPL Financial
title: Business Development Associate
location: San Diego, CA
status: draft
fit_rating: moderate
fit_score: 62
---FIT---
Moderate fit — meaningful gaps in Salesforce and cold-calling quota history.

Strengths: B2B outreach experience, phone communication, market research background.
Gaps: No direct cold-calling quota experience, no Salesforce hands-on use.
---RESUME YAML---
name: Owen Doherty
contact:
  email: test@example.com
  phone: 555-1234
  location: San Diego, CA
summary: San Diego-based graduate with business development and outreach experience.
experience:
  - title: Co-Founder / Business Development
    company: BandHouse
    start: 2022
    end: Present
    bullets:
      - Conducted market research and outreach across 150+ events
skills:
  - "Business Development: outreach, market research, client communication"
---COVER LETTER YAML---
name: Owen Doherty
contact:
  email: test@example.com
date: auto
recipient:
  company: LPL Financial
  hiring_manager: LPL Financial Hiring Team
salutation: Dear LPL Financial Hiring Team,
body: |
  I am applying for the Business Development Associate role.
closing: Sincerely,
signature_name: Owen Doherty`;

const MARKDOWN_FORMAT = `## FIT ASSESSMENT
**Moderate fit — MAYBE**

Strengths: outreach experience.
Gaps: no Salesforce.

## RESUME YAML
\`\`\`yaml
name: Owen Doherty
contact:
  email: test@example.com
experience:
  - title: Analyst
    company: Acme
    bullets:
      - Did things
\`\`\`

## COVER LETTER YAML
\`\`\`yaml
name: Owen Doherty
recipient:
  company: Acme Corp
body: I am applying for the Analyst role at Acme Corp.
\`\`\``;

const MINIMAL_FORMAT = `---RESUME YAML---
name: Test User
experience:
  - title: Engineer
    company: Startup
    bullets:
      - Built features
---COVER LETTER YAML---
name: Test User
recipient:
  company: Startup Inc
body: I am applying for the Engineer position at Startup Inc.
`;

const STRUCTURED_FIT_FORMAT = `---APPLICATION---
company: Acme Corp
title: Senior Engineer
location: Remote
status: applied
fit_rating: highly_qualified
fit_score: 91
---FIT---
Strong alignment on backend systems and team leadership.
---RESUME YAML---
name: Test User
experience:
  - title: Engineer
    company: Startup
    bullets:
      - Built features
---COVER LETTER YAML---
name: Test User
recipient:
  company: Acme Corp
body: I am applying for the Senior Engineer role at Acme Corp.
`;

const OUTER_FENCE_FORMAT = `\`\`\`yaml
${STRUCTURED_FIT_FORMAT.trim()}
\`\`\``;

let failed = 0;

function check(label, ok) {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) failed += 1;
}

// Delimiter format (primary)
const parsed = parseCursorResponse(DELIMITER_FORMAT);
check('delimiter: company', parsed.company === 'LPL Financial');
check('delimiter: title', parsed.title === 'Business Development Associate');
check('delimiter: location', parsed.location === 'San Diego, CA');
check('delimiter: status normalized to applied', parsed.status === 'applied');
check('delimiter: fit assessment', parsed.fitAssessment.includes('Moderate fit'));
check('delimiter: fit_rating', parsed.fitRating === 'moderate');
check('delimiter: fit_score', parsed.fitScore === 62);
check('delimiter: legacy recommendation', parsed.fitRecommendation === 'moderate');
check('delimiter: resume yaml', parsed.resumeYaml.includes('name: Owen Doherty'));
check('delimiter: cover letter yaml', parsed.coverLetterYaml.includes('LPL Financial'));
check('delimiter: resume data', parsed.resumeData?.experience?.length >= 1);
check('delimiter: cover letter data', parsed.coverLetterData?.body?.includes('applying'));

// Structured fit_rating + fit_score
const structured = parseCursorResponse(STRUCTURED_FIT_FORMAT);
check('structured: fit_rating', structured.fitRating === 'highly_qualified');
check('structured: fit_score', structured.fitScore === 91);
check('structured: company', structured.company === 'Acme Corp');

// Whole paste wrapped in one outer ```yaml fence (ChatGPT-style)
const fenced = parseCursorResponse(OUTER_FENCE_FORMAT);
check('outer fence: company', fenced.company === 'Acme Corp');
check('outer fence: cover letter parses', Boolean(fenced.coverLetterData?.body));
check('outer fence: no trailing fence in cover yaml', !fenced.coverLetterYaml.includes('```'));

// Markdown format (legacy)
const legacy = parseCursorResponse(MARKDOWN_FORMAT);
check('legacy: resume yaml', legacy.resumeYaml.includes('name: Owen Doherty'));
check('legacy: cover letter yaml', legacy.coverLetterYaml.includes('Acme'));
check('legacy: inferred company', legacy.company === 'Acme Corp');
check('legacy: fit_rating from MAYBE', legacy.fitRating === 'moderate');

// Minimal (no APPLICATION block — infer from YAML)
const minimal = parseCursorResponse(MINIMAL_FORMAT);
check('minimal: inferred company', minimal.company === 'Startup Inc');
check('minimal: inferred title from body', minimal.title === 'Engineer');

// Skip recommendation (legacy FIT text)
const skipResponse = `---FIT---
Poor fit. SKIP.
---RESUME YAML---
name: Test
experience: []
---COVER LETTER YAML---
name: Test
body: test`;
const skipParsed = parseCursorResponse(skipResponse);
check('skip recommendation', skipParsed.fitRecommendation === 'skip');
check('skip fit_rating', skipParsed.fitRating === 'skip');

const badge = getFitBadgeMeta('moderate');
check('fit badge has color', Boolean(badge.color));
check('fit badge label', badge.label === 'Moderate');

const legacyBadge = getFitBadgeMeta('apply');
check('legacy apply maps to good_match color', legacyBadge.color === '#14b8a6');

// Reference file exists
const refPath = new URL('../src/data/cursor-workflow-reference.md', import.meta.url);
const ref = readFileSync(refPath, 'utf8');
check('reference file documents delimiters', ref.includes('---APPLICATION---'));
check('reference file documents fit_rating', ref.includes('fit_rating'));
check('reference file documents workflow', ref.includes('One-time setup'));

if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}

console.log('\nAll cursor-import checks passed.');
