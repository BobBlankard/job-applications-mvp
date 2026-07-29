import {
  buildResumePdf,
  countResumePdfPages,
} from '../src/pdf-text-export.js';
import { DEFAULT_APPLICATION_RESUME_TEMPLATE_ID } from '../src/application-storage.js';
import zlib from 'zlib';

function decodePdfText(doc) {
  const pdf = Buffer.from(doc.output('arraybuffer')).toString('latin1');
  const streams = [...pdf.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map((match) => {
    try {
      return zlib.inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1');
    } catch {
      return match[1];
    }
  });
  return streams.join('\n');
}

const amkorResume = {
  name: 'Owen Doherty',
  contact: {
    email: 'o.n.doherty@gmail.com',
    phone: '(858) 776-6618',
    location: 'San Diego, CA',
    website: 'owendohertyworks.com',
  },
  summary:
    'San Diego-based SDSU Fowler College of Business graduate with hands-on experience in customer account support, payment and invoice workflows, Excel reporting, and Google Analytics. Brings detail-oriented operations work from High Country West resident billing, client-facing web design and brand consulting at monoright.com, and Shopify order tracking at Ecstasy Angel. Organized, responsive, and comfortable managing deadlines, documentation, and account follow-through in fast-paced environments.',
  experience: [
    {
      title: 'Club Supervisor',
      company: 'High Country West',
      location: 'San Diego, CA',
      start: 'March 2021',
      end: 'July 2023',
      bullets: [
        'Prepared and mailed resident payment notices and payment packets with amounts due and clear payment instructions.',
        'Tracked upcoming payment deadlines and coordinated outgoing payment correspondence so notices went out on schedule.',
        'Handled checks associated with resident payments, processing and organizing payment materials with consistent attention to detail.',
        'Streamlined invoice mailing workflows to speed up preparation and distribution of billing documents to residents.',
      ],
    },
    {
      title: 'Founder, Web Design & Brand Consulting',
      company: 'monoright.com',
      location: 'San Diego, CA',
      start: 'February 2026',
      end: 'Present',
      bullets: [
        'Run a web design and brand consulting practice serving multiple client accounts with responsive communication and clear project timelines.',
        'Track website performance with Google Analytics and report results to inform design and client priorities.',
        'Maintain organized project documentation, revisions, and status updates across concurrent web and brand deliverables.',
        'Design and build client websites and landing pages aligned with brand identity and conversion goals.',
      ],
    },
    {
      title: 'Founder',
      company: 'Ecstasy Angel',
      location: 'San Diego, CA',
      start: 'July 2020',
      end: 'November 2023',
      bullets: [
        'Tracked orders and customer workflows through Shopify; managed inquiries and follow-up with a responsive approach.',
        'Tracked budgets, vendor costs, and business metrics in Excel and Shopify; achieved $10K+ in revenue.',
        'Grew an art account organically to 10K+ followers and built an engaged community around the brand.',
        'Ran A/B tests on marketing content to learn what resonated and improve engagement and conversion.',
      ],
    },
    {
      title: 'Co-Founder',
      company: 'BandHouse',
      location: 'San Diego, CA',
      start: 'November 2025',
      end: 'Present',
      bullets: [
        'Maintain accurate event, venue, and planning data for discovery and outreach priorities.',
        'Drove real attendees to local events through the platform (100+ app downloads).',
        'Posted 1,000+ flyers and promoted smaller shows to increase attendance and community turnout.',
        'Conduct partner and venue outreach; coordinate messaging and launch priorities in San Diego.',
      ],
    },
    {
      title: 'Founder',
      company: 'PinHaus',
      location: 'San Diego, CA',
      start: 'March 2025',
      end: 'Present',
      bullets: [
        'Documented workflows and operational priorities across a pre-launch product initiative.',
        'Conducted user interviews and stakeholder walkthroughs to gather feedback and inform product direction.',
      ],
    },
    {
      title: 'Podcast Editor & Content Producer',
      company: 'Seed to Harvest',
      location: 'San Diego, CA',
      start: 'March 2025',
      end: 'May 2025',
      bullets: [
        'Edited podcast episodes and produced short-form clips for YouTube and social distribution.',
      ],
    },
  ],
  education: [
    {
      degree: 'B.S. Business Administration (Management), Minor in Art',
      school: 'San Diego State University (SDSU), Fowler College of Business',
      location: 'San Diego, CA',
      year: 'August 2021 - December 2025',
      details: 'GPA 3.42, Emphasis in Entrepreneurship',
    },
  ],
  skills: [
    'Account Operations: payment notices, invoice preparation, deadline tracking, customer follow-up, record keeping',
    'Data & Reporting: Excel spreadsheets and reporting, Google Analytics, data accuracy, budget tracking',
    'Client Service: responsive communication, account updates, documentation, cross-functional coordination',
    'Tools: Microsoft Office (Excel, Word, Outlook), Google Workspace, Shopify, Adobe Acrobat (familiar)',
  ],
};

const templateId = DEFAULT_APPLICATION_RESUME_TEMPLATE_ID;
const pages = countResumePdfPages(amkorResume, templateId);
const doc = buildResumePdf(amkorResume, templateId);
const pdfText = decodePdfText(doc);
const pdfHasHcw = /High Country West/i.test(pdfText);

console.log(`Pages: ${pages}`);
console.log(`High Country West in PDF output: ${pdfHasHcw}`);
console.log(`${pages === 1 && pdfHasHcw ? 'PASS' : 'FAIL'}: one page with High Country West`);