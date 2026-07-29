import yaml from 'js-yaml';

const SKILL_CATEGORY_LABELS = {
  business_operations: 'Business Operations',
  sales_and_business_development: 'Sales & Business Development',
  data_and_reporting: 'Data & Reporting',
  web_technical_and_design: 'Web, Technical & Design',
  tools: 'Tools',
  professional_traits: 'Professional',
};

export function isMasterProfile(data) {
  return Boolean(
    data &&
      (data.ai_guidance ||
        data.role_framing_examples ||
        (data.skills && typeof data.skills === 'object' && !Array.isArray(data.skills)))
  );
}

function formatSkillCategory(key, items) {
  const label = SKILL_CATEGORY_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const values = Array.isArray(items) ? items.join(', ') : String(items || '');
  return `${label}: ${values}`;
}

/** Metadata preserved for AI tailoring but omitted from rendered resume YAML. */
export function getMasterProfileMetadataFrom(profile) {
  return {
    aiGuidance: profile.ai_guidance || '',
    roleFramingExamples: profile.role_framing_examples || {},
    applicationsCreated: profile.applications_created_in_this_project || [],
  };
}

/**
 * Convert master profile schema to the resume YAML shape used by templates/PDF export.
 * Experience context blocks are kept on entries for downstream AI prompts.
 */
export function masterProfileToResumeData(profile) {
  const skills = [];
  if (profile.skills && typeof profile.skills === 'object' && !Array.isArray(profile.skills)) {
    for (const [key, items] of Object.entries(profile.skills)) {
      if (Array.isArray(items) && items.length) {
        skills.push(formatSkillCategory(key, items));
      }
    }
  } else if (Array.isArray(profile.skills)) {
    skills.push(...profile.skills);
  }

  const experience = (profile.experience || []).map((job) => ({
    title: job.title,
    company: job.company,
    location: job.location,
    start: job.start,
    end: job.end,
    context: job.context || '',
    bullets: Array.isArray(job.bullets) ? [...job.bullets] : [],
  }));

  const projects = (profile.projects || []).map((project) => ({
    title: project.title,
    company: project.company,
    location: project.location,
    start: project.start,
    end: project.end,
    context: project.context || '',
    bullets: Array.isArray(project.bullets) ? [...project.bullets] : [],
  }));

  const education = (profile.education || []).map((entry) => ({
    degree: entry.degree,
    school: entry.school,
    location: entry.location,
    year: entry.year,
    details: entry.details,
    notes: entry.notes,
  }));

  return {
    name: profile.name,
    contact: profile.contact || {},
    summary: profile.summary || '',
    experience,
    projects,
    education,
    skills,
  };
}

export function parseProfileYaml(yamlText) {
  return yaml.load(yamlText);
}

export function resolveProfileSource(yamlText) {
  const parsed = parseProfileYaml(yamlText);
  if (isMasterProfile(parsed)) {
    return {
      sourceYaml: yamlText,
      resumeData: masterProfileToResumeData(parsed),
      metadata: getMasterProfileMetadataFrom(parsed),
    };
  }
  return {
    sourceYaml: yamlText,
    resumeData: parsed,
    metadata: null,
  };
}
