import yaml from 'js-yaml';

export function deriveDisplayNameFromFilename(filename) {
  return (
    String(filename || '')
      .replace(/\.(ya?ml)$/i, '')
      .replace(/[-_]+/g, ' ')
      .trim() || 'Imported Document'
  );
}

export function parseYamlText(yamlText) {
  let data;
  try {
    data = yaml.load(yamlText);
  } catch (err) {
    throw new Error(err.message || 'Could not parse YAML.');
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('YAML file must contain a document object.');
  }
  return data;
}

export function isCoverLetterData(data) {
  return Boolean(data.body && (data.salutation || data.recipient || data.closing));
}

export function isResumeData(data) {
  return Boolean(data.experience || data.education || data.skills);
}

export async function importYamlFile(file, { expectedType } = {}) {
  if (!file) {
    throw new Error('No file selected.');
  }

  const yamlText = await file.text();
  const data = parseYamlText(yamlText);
  const isCoverLetter = isCoverLetterData(data);
  const isResume = isResumeData(data);

  if (expectedType === 'resume' && isCoverLetter && !isResume) {
    throw new Error('This looks like a cover letter YAML. Import it from the Cover Letters page.');
  }
  if (expectedType === 'cover-letter' && isResume && !isCoverLetter) {
    throw new Error('This looks like a resume YAML. Import it from the Home page.');
  }
  if (!isCoverLetter && !isResume) {
    throw new Error('Unrecognized YAML format. Use a resume or cover letter file.');
  }

  const filenameName = deriveDisplayNameFromFilename(file.name);
  const suggestedName =
    filenameName ||
    (isCoverLetter && data.recipient?.company
      ? `${data.recipient.company} Cover Letter`
      : null) ||
    (typeof data.name === 'string' && data.name.trim()) ||
    'Imported Document';

  return { yamlText, data, suggestedName, isCoverLetter, isResume };
}

export function bindYamlFileInput(inputEl, { expectedType, onImported, onError, onLoading }) {
  inputEl.addEventListener('change', async () => {
    const file = inputEl.files?.[0];
    inputEl.value = '';
    if (!file) return;

    onLoading?.(true);
    try {
      const result = await importYamlFile(file, { expectedType });
      await onImported(result);
    } catch (err) {
      onError?.(err.message || 'Failed to import YAML.');
    } finally {
      onLoading?.(false);
    }
  });
}
