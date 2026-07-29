# AI Import Workflow Reference

Use any AI chat for generation. The website imports one paste per job and tracks applications.

## Workflow

1. **One-time setup:** paste the prompt from Applications How To plus your base/master resume together as the first message in an AI chat.
2. **Per job:** paste only the full job description into the same chat (do not resend your resume or the full prompt).
3. **Import:** copy the AI response and paste into **Import Application** on the website.

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

Use these three section labels and "- " bullets. Gaps first. Do not repeat fit_rating or fit_score here.

---RESUME YAML---
name: Your Name
contact:
  email: you@example.com
  phone: 555-1234
  location: City, ST
summary: Tailored summary for this role.
experience:
  - title: Role Title
    company: Company
    start: 2022
    end: Present
    bullets:
      - Achievement bullet one
skills:
  - "Category: skill, skill, skill"
---COVER LETTER YAML---
name: Your Name
contact:
  email: you@example.com
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
| `---APPLICATION---` | Recommended | Company, title, location, status, `fit_rating`, optional `fit_score` (0–100), optional `asks_for_linkedin` / `linkedin_required` (true when the posting requests LinkedIn). |
| `---FIT---` | Optional | Honest assessment text only — not in resume/cover letter bodies. |
| `---RESUME YAML---` | Yes | Full resume YAML (one page). Identity and employers must come from the user's base resume. No fit scores in body. |
| `---COVER LETTER YAML---` | Yes | Full cover letter YAML. No fit scores in body. |

### Fit ratings

| `fit_rating` | Meaning |
|--------------|---------|
| `highly_qualified` | Clearly meets or exceeds core requirements |
| `good_match` | Solid match with minor gaps |
| `moderate` | Plausible but meaningful gaps |
| `stretch` | Significant gaps |
| `big_stretch` | Major mismatch on required experience |
| `skip` | Not worth applying |

- YAML may be raw or wrapped in ` ```yaml ` fences inside each section.
- `status` defaults to `applied`. Applied date is set to today on import.
- Legacy `---FIT---` text with APPLY / MAYBE / SKIP still parses; ratings are inferred when `fit_rating` is omitted.
- Legacy markdown headings (`## FIT ASSESSMENT`, fenced YAML) still parse.

## PDF downloads

Downloads use template styling via jsPDF with selectable text. Fit assessments are tracker-only and are not included in PDFs.
