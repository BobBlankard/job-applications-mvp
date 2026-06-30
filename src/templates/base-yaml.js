export function buildStarterYaml(name = 'Jane Doe') {
  return `name: ${name}

contact:
  email: jane.doe@email.com
  phone: (555) 123-4567
  location: San Francisco, CA
  linkedin: linkedin.com/in/janedoe

summary: |
  Software engineer with 5+ years building scalable web applications.
  Experienced in full-stack development, API design, and cross-functional
  collaboration. Passionate about clean code and delivering measurable impact.

experience:
  - title: Senior Software Engineer
    company: Acme Corporation
    location: San Francisco, CA
    start: Jan 2022
    end: Present
    bullets:
      - Led development of customer-facing dashboard serving 50K+ daily users
      - Reduced API response latency by 40% through query optimization
      - Mentored 3 junior engineers and established code review best practices

  - title: Software Engineer
    company: TechStart Inc.
    location: Austin, TX
    start: Jun 2019
    end: Dec 2021
    bullets:
      - Built RESTful microservices in Node.js and PostgreSQL
      - Implemented CI/CD pipeline reducing deployment time from 2 hours to 15 minutes
      - Collaborated with product team to ship 12 features across 4 release cycles

projects:
  - title: Open Source Task Tracker
    company: Personal Project
    start: Feb 2024
    end: Present
    bullets:
      - Built a CLI and web UI for managing tasks with YAML-based project configs
      - Published on GitHub with 200+ stars and contributions from 5 developers

education:
  - degree: B.S. Computer Science
    school: University of California, Berkeley
    location: Berkeley, CA
    year: "2019"
    details: GPA 3.7, Dean's List

skills:
  - "Languages: Python, JavaScript, TypeScript, SQL"
  - "Frameworks: React, Node.js, Express, Django"
  - "Tools: Git, Docker, AWS, PostgreSQL, Redis"
`;
}
