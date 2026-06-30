import './styles/app.css';
import './styles/resume.css';
import './styles/templates.css';
import './styles/cover-letter.css';
import './styles/cover-letter-templates.css';
import './styles/home.css';
import { initRouter } from './router.js';
import { migrateLegacyStorage } from './storage.js';
import { DEFAULT_TEMPLATE_ID, getTemplateById } from './templates/index.js';

const defaultTemplate = getTemplateById(DEFAULT_TEMPLATE_ID);
migrateLegacyStorage(DEFAULT_TEMPLATE_ID, defaultTemplate.defaultYaml);

initRouter();
