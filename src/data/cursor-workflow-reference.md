# AI Import Workflow Reference

Use any AI chat (ChatGPT, Claude, Gemini, Cursor, etc.) for generation. The website imports one paste per job and tracks applications.

## Workflow

1. **One-time setup:** paste the prompt from Applications How To plus your base/master resume together as the first message in an AI chat.
2. **Per job:** paste only the full job description into the same chat (do not resend your resume or the full prompt).
3. **Import:** copy the AI's **full** response (all four sections) and paste into **Import Application** on the website.

## Import format (single paste)

```
---APPLICATION---
company: Example Corp
title: Business Development Associate
location: City, ST
status: applied
fit_rating: moderate
fit_score: 62
asks_for_linkedin: false

---FIT---
Why it might not work:
- Gap or blocker one
- Gap or blocker two

Strengths:
- Strength one
- Strength two

Verdict:
- Clear apply / maybe / skip recommendation

---RESUME YAML---
name: Your Name
contact:
  email: you@example.com
  phone: 555-1234
  location: City, ST
summary: |
  Tailored summary for this role. Do not name the target company here.
experience:
  - title: Role Title
    company: Company
    location: City, ST
    start: Jan 2022
    end: Present
    bullets:
      - Achievement bullet one
      - Achievement bullet two
education:
  - degree: B.A. Example
    school: Example University
    location: City, ST
    year: "2020"
skills:
  - "Category: skill, skill, skill"
---COVER LETTER YAML---
name: Your Name
contact:
  email: you@example.com
  phone: 555-1234
  location: City, ST
date: auto
recipient:
  company: Example Corp
  hiring_manager: Example Corp Hiring Team
salutation: Dear Example Corp Hiring Team,
body: |
  First paragraph.

  Second paragraph.
closing: Sincerely,
signature_name: Your Name
```

### Section rules

| Section | Required | Notes |
|---------|----------|-------|
| `---APPLICATION---` | Recommended | Company, title, location, status, **one** `fit_rating` value, optional `fit_score` (0–100), `asks_for_linkedin` true/false (or `linkedin_required`). |
| `---FIT---` | Optional | Honest assessment text only — not in resume/cover letter bodies. Exact labels + `- ` bullets; gaps first. |
| `---RESUME YAML---` | Yes | Full resume YAML (one page). Identity and employers from the user's base resume. Optional ` ```yaml ` fence around the document only. |
| `---COVER LETTER YAML---` | Yes | Full cover letter YAML. Use `body: \|` for multi-paragraph text. |

### Fit ratings (pick exactly one)

| `fit_rating` | Meaning |
|--------------|---------|
| `highly_qualified` | Clearly meets or exceeds core requirements |
| `good_match` | Solid match with minor gaps |
| `moderate` | Plausible but meaningful gaps |
| `stretch` | Significant gaps |
| `big_stretch` | Major mismatch on required experience |
| `skip` | Not worth applying |

- Never output `fit_rating: highly_qualified | good_match | …` — choose a single value.
- YAML may be raw or wrapped in ` ```yaml ` fences inside each document section.
- `status` defaults to `applied`. Applied date is set to today on import.
- Legacy `---FIT---` text with APPLY / MAYBE / SKIP still parses; ratings are inferred when `fit_rating` is omitted.
- Legacy markdown headings (`## FIT ASSESSMENT`, fenced YAML) still parse.

## PDF downloads

Downloads use template styling via jsPDF with selectable text. Fit assessments are tracker-only and are not included in PDFs.
