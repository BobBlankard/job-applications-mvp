import yaml from 'js-yaml';
import { parseJobDescription } from './job-parser.js';
import { resolveProfileSource } from './master-profile-adapter.js';
import { sortExperienceChronologically } from './experience-sort.js';

const ROLE_PROFILES = {
  sales: {
    id: 'sales',
    label: 'Sales & Business Development',
    detect: [
      'business development', 'sales', 'prospecting', 'cold call', 'cold-calling',
      'pipeline', 'quota', 'outreach', 'lead generation', 'account executive',
      'financial advisor', 'broker', 'crm', 'salesforce', 'revenue', 'b2b',
      'client acquisition', 'territory', 'hunter',
    ],
    summaryFocus:
      'market research, B2B client support, proposal coordination, prospecting, and cross-functional outreach',
    summaryClose:
      'Strong communicator with an entrepreneurial mindset and ability to build rapport quickly in fast-paced, target-driven environments.',
    skillLabels: [
      'Business Development & Sales',
      'Client Service & Communication',
      'Analytics & Reporting',
      'Events & Outreach',
      'Tools',
    ],
    skillThemes: [
      ['business development', 'sales', 'prospecting', 'outreach', 'pipeline', 'lead', 'market research', 'relationship'],
      ['client', 'customer', 'communication', 'b2b', 'b2c', 'stakeholder', 'rapport', 'presentation'],
      ['analytics', 'metrics', 'reporting', 'google analytics', 'data', 'excel', 'kpi', 'performance'],
      ['event', 'outreach', 'campaign', 'engagement', 'community', 'conference', 'webinar'],
      ['microsoft office', 'excel', 'word', 'powerpoint', 'outlook', 'google workspace', 'salesforce', 'shopify', 'crm', 'adobe'],
    ],
  },
  analyst: {
    id: 'analyst',
    label: 'Business Analysis & Process',
    detect: [
      'business process', 'business analyst', 'requirements', 'process improvement',
      'stakeholder', 'documentation', 'workflow', 'systems requirements', 'internal tools',
      'process analyst', 'business requirements', 'gap analysis', 'user stories',
    ],
    summaryFocus:
      'business requirements, process documentation, and cross-functional coordination for software-enabled workflows',
    summaryClose:
      'Organized and analytically minded with a track record of tracking requests, prioritizing open items, maintaining accurate data, and communicating clearly with technical and non-technical stakeholders.',
    skillLabels: [
      'Business Requirements & Process',
      'Project & Tool Management',
      'Data & Reporting',
      'Tools & Documentation',
      'Professional',
    ],
    skillThemes: [
      ['requirements', 'process', 'stakeholder', 'documentation', 'workflow', 'implementation', 'interview'],
      ['project', 'priorit', 'tracking', 'status', 'feature', 'cross-functional', 'tool', 'request'],
      ['data', 'reporting', 'metrics', 'analytics', 'excel', 'dashboard', 'reconciliation', 'planning'],
      ['microsoft office', 'excel', 'word', 'powerpoint', 'outlook', 'google workspace', 'documentation', 'training'],
      ['communication', 'confidential', 'collaborat', 'self-motivated', 'on-site', 'san diego', 'poway', 'professional'],
    ],
  },
  operations: {
    id: 'operations',
    label: 'Operations & Coordination',
    detect: [
      'operations', 'coordinator', 'onboarding', 'administrative', 'program support',
      'scheduling', 'logistics', 'document control', 'training program', 'office support',
      'business operations', 'event coordination',
    ],
    summaryFocus:
      'coordinating operations, onboarding, events, and document workflows across fast-paced environments',
    summaryClose:
      'Highly organized with strong attention to detail, professional communication, and a customer service mindset. Skilled at managing multiple priorities, maintaining accurate records, and supporting cross-functional teams.',
    skillLabels: [
      'Operations & Coordination',
      'Documentation & Administration',
      'Microsoft Office',
      'Tools',
      'Professional',
    ],
    skillThemes: [
      ['operations', 'coordination', 'scheduling', 'onboarding', 'event', 'status', 'process', 'multi-priority'],
      ['documentation', 'record', 'administration', 'proposal', 'reporting', 'confidential', 'attention'],
      ['microsoft office', 'excel', 'word', 'outlook', 'powerpoint', 'template', 'meeting'],
      ['google workspace', 'teams', 'sharepoint', 'adobe', 'project tracking', 'crm'],
      ['customer service', 'communication', 'discretion', 'on-site', 'san diego', 'fast-paced', 'professional'],
    ],
  },
  ux: {
    id: 'ux',
    label: 'UX & Design',
    detect: [
      'ux', 'ui', 'user experience', 'user research', 'wireframe', 'prototype',
      'figma', 'design system', 'usability', 'interaction design', 'product design',
    ],
    summaryFocus:
      'user research, interface design, and cross-functional product collaboration',
    summaryClose:
      'Detail-oriented with strong visual communication skills and experience translating user needs into clear, usable experiences.',
    skillLabels: [
      'UX & Design',
      'Research & Prototyping',
      'Collaboration & Communication',
      'Tools',
      'Professional',
    ],
    skillThemes: [
      ['ux', 'ui', 'design', 'usability', 'wireframe', 'prototype', 'visual', 'interface'],
      ['research', 'user', 'interview', 'walkthrough', 'feedback', 'testing'],
      ['stakeholder', 'cross-functional', 'communication', 'presentation', 'collaborat'],
      ['figma', 'adobe', 'html', 'css', 'google analytics', 'microsoft office', 'google workspace'],
      ['san diego', 'communication', 'self-motivated', 'professional', 'portfolio'],
    ],
  },
  technical: {
    id: 'technical',
    label: 'Technical & Engineering',
    detect: [
      'software', 'developer', 'engineer', 'programming', 'api', 'full stack',
      'javascript', 'python', 'react', 'node', 'sql', 'aws', 'devops', 'ci/cd',
    ],
    summaryFocus:
      'building software-enabled workflows, internal tools, and data-driven solutions',
    summaryClose:
      'Comfortable collaborating with technical and non-technical stakeholders while learning new tools quickly and delivering reliable results.',
    skillLabels: [
      'Technical Skills',
      'Development & Tools',
      'Data & Reporting',
      'Collaboration',
      'Professional',
    ],
    skillThemes: [
      ['javascript', 'python', 'typescript', 'react', 'node', 'sql', 'api', 'software', 'html', 'css'],
      ['git', 'docker', 'aws', 'ci/cd', 'internal tools', 'workflow', 'automation'],
      ['data', 'analytics', 'reporting', 'excel', 'metrics', 'dashboard'],
      ['stakeholder', 'cross-functional', 'requirements', 'documentation', 'communication'],
      ['san diego', 'self-motivated', 'professional', 'collaborat'],
    ],
  },
};

const COMPANY_KEYS = [
  { match: /monoright/i, key: 'monoright' },
  { match: /bandhouse/i, key: 'bandhouse' },
  { match: /ecstasy angel/i, key: 'ecstasy' },
  { match: /pinhaus/i, key: 'pinhaus' },
  { match: /seed to harvest/i, key: 'seed' },
];

const TITLE_FRAMES = {
  monoright: {
    sales: 'Founder, Web Design & Brand Consulting',
    analyst: 'Founder, Web Design & Brand Consulting',
    operations: 'Founder, Web Design & Brand Consulting',
    ux: 'Founder, Web Design & Brand Consulting',
    technical: 'Founder, Web Design & Brand Consulting',
  },
  bandhouse: {
    sales: 'Co-Founder / Business Development',
    analyst: 'Co-Founder / Operations & Internal Tools',
    operations: 'Co-Founder / Operations & Program Coordination',
    ux: 'Co-Founder / Product & UX Operations',
    technical: 'Co-Founder / Product & Engineering Operations',
  },
  ecstasy: {
    sales: 'Founder / Business Development & Customer Relations',
    analyst: 'Founder / Operations & Process Documentation',
    operations: 'Founder / Business Operations & Onboarding',
    ux: 'Founder / Brand, UX & Operations',
    technical: 'Founder / E-commerce Operations & Systems',
  },
  pinhaus: {
    sales: 'Founder / Business Development & Market Research',
    analyst: 'Founder / Product Operations & Requirements',
    operations: 'Founder / Onboarding & Operations Support',
    ux: 'Founder / Product Research & UX',
    technical: 'Founder / Product Operations & Technical Coordination',
  },
  seed: {
    sales: 'Digital Content & Outreach Coordinator',
    analyst: 'Content & Program Support',
    operations: 'Content & Program Support',
    ux: 'Digital Content & Design Support',
    technical: 'Digital Content & Program Support',
  },
};

const BULLET_REWRITES = {
  sales: [
    [/coordinate concurrent client projects/i, 'Support multiple B2B client accounts with responsive communication, proposal coordination, and timely follow-up on project deliverables'],
    [/prepare client-facing materials/i, 'Prepare client-facing presentations, landing pages, and marketing materials aligned with business goals and brand messaging'],
    [/maintain accurate project documentation/i, 'Manage project timelines, documentation, and customer requests across concurrent accounts with strong attention to detail'],
    [/support scheduling, follow-through/i, 'Track campaign performance and report metrics using Google Analytics to inform outreach and business development decisions'],
    [/coordinate event-related logistics/i, 'Conduct market research across live music and event discovery, identifying opportunities across 150+ events and 40+ venues in test markets'],
    [/maintain organized participant-style records/i, 'Nurture relationships with venue and community partners while coordinating outreach content and engagement initiatives in San Diego'],
    [/prepare materials, align messaging/i, 'Collaborate across product, marketing, and creative functions to align messaging, gather feedback, and support launch priorities'],
    [/identify workflow bottlenecks/i, 'Plan and support event-related outreach, maintaining accurate market data and timely updates across web touchpoints'],
    [/managed participant-style onboarding/i, 'Delivered responsive B2C customer service including inquiries, order follow-up, and relationship building that supported repeat business'],
    [/maintained detailed records, vendor coordination/i, 'Identified and pursued growth opportunities through market research, trend analysis, and customer feedback'],
    [/prepared operational materials/i, 'Prepared product messaging, marketing materials, and launch presentations across Shopify, web, and social channels'],
    [/tracked budgets, recurring tasks/i, 'Grew organic audience to 10K+ and achieved $10K+ in revenue through organized outreach and data-informed decision making'],
    [/coordinated onboarding walkthroughs/i, 'Conducted user interviews and stakeholder walkthroughs to gather market feedback and identify product and positioning opportunities'],
    [/supported scheduled program deliverables/i, 'Supported digital outreach campaigns by producing and scheduling content for web and social channels'],
    [/identify workflow bottlenecks and help improve internal processes/i, 'Drive outreach and partnership development across live music markets, coordinating messaging and engagement to support business growth'],
    [/support launch and outreach activities across product and operations/i, 'Support launch outreach and partner engagement, aligning messaging across channels to expand market presence and drive interest'],
    [/coordinate between product, engineering/i, 'Build relationships with venue and community partners while coordinating outreach and engagement initiatives to support growth'],
    [/document internal processes/i, 'Track outreach metrics and maintain organized partner records to support pipeline development and follow-through'],
    [/prioritiz.*feature requests/i, 'Identify partnership and outreach opportunities through market research and stakeholder conversations across target territories'],
    [/bug fix/i, 'Support client-facing deliverables and outreach materials with responsive follow-up and attention to relationship-building details'],
  ],
  analyst: [
    [/coordinate concurrent client projects/i, 'Gather and document business requirements from stakeholders; translate needs into clear deliverables, timelines, and implementation priorities'],
    [/prepare client-facing materials/i, 'Prepare reporting summaries and performance metrics using Google Analytics to support analytics-style updates and stakeholder decisions'],
    [/maintain accurate project documentation/i, 'Track tool requests, revisions, and project status across concurrent accounts with organized documentation and consistent follow-through'],
    [/support scheduling, follow-through/i, 'Provide responsive communication and walkthrough-style guidance to help end users understand processes, changes, and next steps'],
    [/coordinate event-related logistics/i, 'Maintain accurate project planning and resource data across 150+ events and 40+ venues to support reporting and cross-functional priorities'],
    [/maintain organized participant-style records/i, 'Coordinate between product, engineering, and operations stakeholders to prioritize feature requests, improvements, upgrades, and open workflow items'],
    [/prepare materials, align messaging/i, 'Document internal processes and keep records organized so the team can track status updates, recurring tasks, and completion of assigned work'],
    [/identify workflow bottlenecks/i, 'Gather end-user feedback and help align tool priorities with business needs across a fast-paced, cross-functional environment'],
    [/coordinated onboarding walkthroughs/i, 'Collected user and stakeholder feedback through interviews and walkthroughs to inform requirements and process improvement opportunities'],
    [/managed participant-style onboarding/i, 'Documented business processes, customer records, and operational workflows with attention to accuracy, confidentiality, and consistency'],
    [/tracked budgets, recurring tasks/i, 'Tracked budgets, vendor costs, and business metrics in Excel while managing inquiries, recurring tasks, and day-to-day operational priorities'],
  ],
  operations: [
    [/gather and document business requirements/i, 'Coordinate concurrent client projects with documented timelines, status updates, and organized deliverable tracking'],
    [/track tool requests/i, 'Maintain accurate project documentation and respond promptly to requests with clear, professional communication'],
    [/coordinate event-related logistics/i, 'Coordinate event-related logistics, schedules, and stakeholder communication across 150+ events and 40+ venues'],
    [/maintain accurate project planning/i, 'Maintain organized participant-style records and program data to support reporting and cross-functional priorities'],
  ],
};

const SALES_SKILL_LINES = [
  'Business Development: market research, competitive analysis, lead follow-up, proposal coordination, presentations, outreach planning, relationship building, phone-based communication',
  'Client Service & Communication: B2B and B2C customer support, responsiveness, cross-functional collaboration, stakeholder communication, professionalism',
  'Analytics & Reporting: Google Analytics, performance metrics, data tracking, business reporting, KPI awareness, informed decision making',
  'Events & Outreach: event coordination, outreach campaigns, community engagement, partner coordination, territory-style market research',
  'Tools: Microsoft Office (Word, Excel, PowerPoint, Outlook), Google Workspace, Salesforce (familiar), CRM systems (familiar), LinkedIn outreach',
];

const SALES_ROLE_MISMATCH = [
  /feature requests?/i,
  /bug fixes?/i,
  /internal tools/i,
  /business requirements/i,
  /workflow bottlenecks/i,
  /engineering stakeholders/i,
  /tool requests/i,
  /process documentation/i,
  /end-user training/i,
  /gap analysis/i,
];

const ROLE_SUMMARY_CLOSES = {
  sales:
    'Ready to apply prospecting, relationship building, and pipeline development in a business development role.',
  analyst:
    'Seeking to apply requirements gathering, process documentation, and cross-functional coordination in a business analysis or process improvement role.',
  operations:
    'Seeking to apply operational coordination, documentation, and customer-focused support in a fast-paced professional environment.',
  ux: 'Seeking to apply user research, design collaboration, and clear visual communication in a UX or product design role.',
  technical:
    'Seeking to apply technical problem-solving, workflow automation, and collaborative development in a software or technical role.',
};

const MAX_SUMMARY_LENGTH = 420;

const ANALYST_SKILL_LINES = [
  'Business Requirements & Process: requirements analysis, business requirements documentation, process improvements, stakeholder interviews, implementation support, systems requirements coordination',
  'Project & Tool Management: request prioritization, feature tracking, status updates, recurring task management, bug fix coordination, cross-functional workflows',
  'Data & Reporting: resource and project planning data, performance metrics, Google Analytics, Excel reporting, dashboards (familiar), data accuracy, reconciliation',
  'Tools & Documentation: Microsoft Office (Excel, Word, PowerPoint, Outlook), Google Workspace, internal documentation, end-user training support',
  'Professional: interpersonal communication, confidentiality, self-motivated, independent and team collaboration, on-site San Diego',
];

function loadYaml(text) {
  return yaml.load(text);
}

function dumpYaml(data) {
  return yaml.dump(data, { lineWidth: 100, noRefs: true }).trim();
}

function companyKey(company) {
  const hit = COMPANY_KEYS.find((entry) => entry.match.test(company || ''));
  return hit?.key || null;
}

function detectRoleType(job) {
  const text = `${job.title} ${job.rawText}`.toLowerCase();
  const scores = Object.values(ROLE_PROFILES).map((profile) => {
    const score = profile.detect.reduce((sum, term) => (text.includes(term) ? sum + 1 : sum), 0);
    return { id: profile.id, score };
  });
  scores.sort((a, b) => b.score - a.score);
  if (scores[0]?.score > 0) return scores[0].id;
  return 'operations';
}

function getRoleProfile(roleType) {
  return ROLE_PROFILES[roleType] || ROLE_PROFILES.operations;
}

function reframeTitle(jobEntry, roleType) {
  const key = companyKey(jobEntry.company);
  if (!key) return jobEntry.title;
  return TITLE_FRAMES[key]?.[roleType] || jobEntry.title;
}

function rewriteBullet(bullet, roleType, company) {
  if (/monoright/i.test(company || '')) return String(bullet || '').trim();
  const rules = BULLET_REWRITES[roleType] || [];
  let text = String(bullet || '').trim();
  for (const [pattern, replacement] of rules) {
    if (pattern.test(text)) return replacement;
  }
  return text;
}

function normalizeBulletKey(bullet) {
  return String(bullet || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function bulletsAreSimilar(a, b) {
  const na = normalizeBulletKey(a);
  const nb = normalizeBulletKey(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const shorter = na.length < nb.length ? na : nb;
  const longer = na.length < nb.length ? nb : na;
  if (shorter.length < 24) return false;
  return longer.includes(shorter.slice(0, Math.min(48, shorter.length)));
}

function dedupeBullets(bullets) {
  const kept = [];
  for (const bullet of bullets) {
    const text = String(bullet || '').trim();
    if (!text) continue;
    if (kept.some((existing) => bulletsAreSimilar(existing, text))) continue;
    kept.push(text);
  }
  return kept;
}

function filterBulletsForRole(bullets, roleType) {
  if (roleType !== 'sales') return bullets;
  return bullets.filter((bullet) => !SALES_ROLE_MISMATCH.some((pattern) => pattern.test(bullet)));
}

function resolveLocationPhrase(job) {
  const raw = String(job.location || '').trim();
  if (!raw) return 'San Diego';
  const city = raw.split(',')[0].trim();
  return city || 'San Diego';
}

function stripCompanyFromSummary(text, company) {
  if (!text || !company) return text;
  const escaped = company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return String(text)
    .replace(new RegExp(`\\bat\\s+${escaped}\\b`, 'gi'), '')
    .replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '')
    .replace(/\bEager to contribute[^.]*\./gi, '')
    .replace(/\bApplying for[^.]*\./gi, '')
    .replace(/\bin an on-site Poway environment\b/gi, '')
    .replace(/\bon-site Poway\b/gi, 'San Diego')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreBullet(bullet, roleType, keywords) {
  const profile = getRoleProfile(roleType);
  const lower = String(bullet).toLowerCase();
  let score = 0;
  for (const term of profile.detect) {
    if (lower.includes(term)) score += 2;
  }
  for (const kw of keywords || []) {
    if (lower.includes(kw)) score += 1;
  }
  return score;
}

function pickRelevantBullets(bullets, roleType, keywords, max = 4, company = '') {
  if (!Array.isArray(bullets) || bullets.length === 0) return [];
  const rewritten = dedupeBullets(
    filterBulletsForRole(
      bullets.map((bullet) => rewriteBullet(bullet, roleType, company)),
      roleType
    )
  );
  if (rewritten.length <= max) return rewritten;

  const scored = rewritten.map((bullet, index) => ({
    bullet,
    score: scoreBullet(bullet, roleType, keywords),
    index,
  }));
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored.slice(0, max).sort((a, b) => a.index - b.index).map((item) => item.bullet);
}

function maxBulletsForJobIndex(index, roleType) {
  if (index === 0) return 4;
  if (index === 1) return 4;
  if (roleType === 'sales' && index >= 3) return 2;
  return 3;
}

function sortExperienceForRole(experience) {
  return sortExperienceChronologically(experience);
}

function maxJobsForRole(roleType) {
  if (roleType === 'sales') return 4;
  return 5;
}

function tailorExperience(experience, roleType, keywords) {
  if (!Array.isArray(experience)) return experience;
  const sorted = sortExperienceForRole(experience).slice(0, maxJobsForRole(roleType));
  return sorted.map((job, index) => ({
    ...job,
    title: reframeTitle(job, roleType),
    bullets: pickRelevantBullets(job.bullets, roleType, keywords, maxBulletsForJobIndex(index, roleType), job.company),
  })).filter((job) => job.bullets.length > 0);
}

function buildTailoredSummary(baseSummary, job, roleType) {
  const profile = getRoleProfile(roleType);
  const locationCity = resolveLocationPhrase(job);
  const locationSuffix = locationCity ? ` in the ${locationCity} area` : '';
  const opener = `San Diego-based SDSU Fowler College of Business graduate with hands-on experience in ${profile.summaryFocus}.`;
  const close = profile.summaryClose;
  const roleClose = (ROLE_SUMMARY_CLOSES[roleType] || ROLE_SUMMARY_CLOSES.operations).replace(
    /\.$/,
    `${locationSuffix}.`
  );

  let summary = `${opener} ${close} ${roleClose}`.replace(/\s+/g, ' ').trim();

  // Strip any accidental company/location bleed if base was merged elsewhere
  summary = stripCompanyFromSummary(summary, job.company);
  summary = summary
    .replace(/\bEager to contribute[^.]*\./gi, '')
    .replace(/\binternal tools, reporting, and process improvement\b/gi, '')
    .replace(/\bon-site Poway\b/gi, locationCity)
    .replace(/\s+/g, ' ')
    .trim();

  if (summary.length > MAX_SUMMARY_LENGTH) {
    const clipped = summary.slice(0, MAX_SUMMARY_LENGTH);
    const lastPeriod = clipped.lastIndexOf('.');
    summary = lastPeriod > 200 ? clipped.slice(0, lastPeriod + 1) : `${clipped.replace(/\s+\S*$/, '').trim()}.`;
  }
  return summary;
}

function scoreSkillLine(skill, themes) {
  const lower = String(skill).toLowerCase();
  return themes.reduce((sum, theme) => (theme.some((term) => lower.includes(term)) ? sum + 1 : sum), 0);
}

function reorderSkills(skills, roleType) {
  if (!Array.isArray(skills) || skills.length === 0) return skills;
  const profile = getRoleProfile(roleType);
  const scored = skills.map((skill, index) => ({
    skill,
    score: profile.skillThemes.reduce(
      (sum, theme, themeIndex) => sum + scoreSkillLine(skill, [theme]) * (profile.skillThemes.length - themeIndex),
      0
    ),
    index,
  }));
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored.map((item) => item.skill);
}

function buildRoleSkillLines(roleType, baseSkills, job) {
  if (roleType === 'sales') return [...SALES_SKILL_LINES];
  if (roleType === 'analyst') return [...ANALYST_SKILL_LINES];

  const profile = getRoleProfile(roleType);
  const base = reorderSkills(baseSkills, roleType);
  if (!base.length) return base;

  const lines = [];
  for (let i = 0; i < profile.skillLabels.length; i++) {
    const label = profile.skillLabels[i];
    const themes = profile.skillThemes[i] || [];
    const matching = base.filter((skill) => scoreSkillLine(skill, [themes]) > 0);
    if (matching.length) {
      const content = matching
        .map((line) => String(line).replace(/^[^:]+:\s*/, ''))
        .join(', ');
      lines.push(`${label}: ${content}`);
    }
  }

  const jobTerms = (job.keywords || [])
    .filter((kw) => !['requirements', 'process', 'excel', 'reporting'].includes(kw) || roleType !== 'sales')
    .slice(0, 4);
  if (jobTerms.length && lines[0]) {
    lines[0] = `${lines[0]}, ${jobTerms.join(', ')}`;
  }

  return lines.length ? lines : base;
}

function buildCoverLetterBody(resumeData, job, roleType) {
  const role = job.title || 'the open position';
  const company = job.company || 'your organization';
  const location = job.location ? ` in ${job.location}` : '';
  const profile = getRoleProfile(roleType);

  const recentJob = Array.isArray(resumeData.experience) ? resumeData.experience[0] : null;
  const recentHighlight = recentJob?.bullets?.[0] || profile.summaryFocus;

  const opener =
    roleType === 'sales'
      ? `I am applying for the ${role} role at ${company}${location}. I am a San Diego-based SDSU graduate with experience in ${profile.summaryFocus}.`
      : `I am applying for the ${role} role at ${company}${location}. ${buildTailoredSummary(resumeData.summary, job, roleType).split('.')[0].trim()}.`;

  return [
    opener,
    '',
    recentJob
      ? `Most recently at ${recentJob.company || 'my current role'}, I ${String(recentHighlight).replace(/^[A-Z]/, (c) => c.toLowerCase())}. I am comfortable tracking priorities, communicating clearly with stakeholders, and following through in fast-paced environments.`
      : profile.summaryClose,
    '',
    'Thank you for your consideration. My resume is attached, and I would welcome the opportunity to discuss how I can contribute to your team.',
  ].join('\n\n');
}

function resolveBaseResume(baseResumeYaml) {
  if (!baseResumeYaml?.trim()) {
    throw new Error('Master profile YAML is required.');
  }
  return resolveProfileSource(baseResumeYaml);
}

/** Generate tailored resume + cover letter YAML from the master profile or a resume YAML. */
export function generateApplicationDocuments(baseResumeYaml, jobDescriptionText, overrides = {}) {
  const job = parseJobDescription(jobDescriptionText, overrides);
  const { resumeData } = resolveBaseResume(baseResumeYaml);
  const roleType = detectRoleType(job);
  const profile = getRoleProfile(roleType);

  const tailoredResume = {
    ...resumeData,
    summary: buildTailoredSummary(resumeData.summary, job, roleType),
    experience: tailorExperience(resumeData.experience, roleType, job.keywords),
    skills: buildRoleSkillLines(roleType, resumeData.skills, job),
  };

  const coverLetterData = {
    name: resumeData.name || 'Your Name',
    contact: resumeData.contact || {},
    date: 'auto',
    recipient: {
      company: job.company,
      title: job.title,
      role_number: job.roleNumber || '',
    },
    salutation: job.company ? `Dear ${job.company} Hiring Team,` : 'Dear Hiring Team,',
    body: buildCoverLetterBody(resumeData, job, roleType),
    closing: 'Sincerely,',
    signature_name: resumeData.name || 'Your Name',
  };

  return {
    job,
    roleType,
    roleLabel: profile.label,
    resumeYaml: dumpYaml(tailoredResume),
    coverLetterYaml: dumpYaml(coverLetterData),
    resumeData: tailoredResume,
    coverLetterData,
    qualityNote: buildQualityNote(job, roleType),
  };
}

function buildQualityNote(job, roleType) {
  const parts = [`Detected focus: ${getRoleProfile(roleType).label}.`];
  if (job.parseWarnings?.length) {
    parts.push(job.parseWarnings.join(' '));
  }
  parts.push('Rule-based tailoring — use Edit Resume or Copy Cursor Prompt for deeper customization.');
  return parts.join(' ');
}

/** Build a concise Cursor chat prompt: honest fit check + tailored YAML output. */
export function buildSimpleCursorPrompt(job, baseResumeYaml) {
  const { sourceYaml, metadata } = resolveBaseResume(baseResumeYaml);

  return [
    '# Job Application — Honest Fit Check + Tailored Documents',
    '',
    `**Company:** ${job.company}`,
    `**Role:** ${job.title}`,
    job.location ? `**Location:** ${job.location}` : '',
    '',
    '## Job Description',
    job.rawText,
    '',
    metadata?.aiGuidance
      ? `## Candidate Guidance (follow for honest framing)\n${metadata.aiGuidance}`
      : '',
    '',
    '## Master Profile (source of truth — do not invent employers, degrees, or metrics)',
    '```yaml',
    sourceYaml,
    '```',
    '',
    '## Instructions',
    '1. Act as an honest HR/ATS reviewer. Assess whether this candidate is a genuine fit. Be direct — list gaps frankly. End with APPLY, MAYBE, or SKIP.',
    '2. If APPLY or MAYBE: tailor a one-page ATS-friendly resume and cover letter using ONLY the master profile. No company name in summary. Follow candidate guidance.',
    '3. Reframe experience titles/bullets for this role. Reorganize skills by relevance. Keep monoright.com described as Owen\'s web design and brand consulting business.',
    '4. Return exactly this structure:',
    '',
    '## FIT ASSESSMENT',
    'Why it might not work:',
    '- [gaps first]',
    '',
    'Strengths:',
    '- [strengths]',
    '',
    'Verdict:',
    '- [APPLY / MAYBE / SKIP with brief reason]',
    '',
    '## RESUME YAML',
    '```yaml',
    '[tailored resume matching project schema: name, contact, summary, experience, education, skills]',
    '```',
    '',
    '## COVER LETTER YAML',
    '```yaml',
    '[cover letter: name, contact, date, recipient, salutation, body, closing, signature_name]',
    '```',
  ]
    .filter(Boolean)
    .join('\n');
}

/** @deprecated Use buildSimpleCursorPrompt */
export const buildCursorPrompt = buildSimpleCursorPrompt;

/** Preview parsed job fields without generating documents. */
export function previewJobParse(jobDescriptionText, overrides = {}) {
  const job = parseJobDescription(jobDescriptionText, overrides);
  const roleType = detectRoleType(job);
  return {
    ...job,
    roleType,
    roleLabel: getRoleProfile(roleType).label,
  };
}
