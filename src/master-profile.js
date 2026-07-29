import yaml from 'js-yaml';
import masterProfileRaw from './data/master-profile.yaml?raw';
import {
  getMasterProfileMetadataFrom,
  masterProfileToResumeData,
  parseProfileYaml,
} from './master-profile-adapter.js';

/** Raw master profile YAML text for Cursor prompts and generation input. */
export function getMasterProfileYaml() {
  return masterProfileRaw.trim();
}

/** Full master profile object (includes ai_guidance, role_framing_examples, etc.). */
export function getMasterProfile() {
  return parseProfileYaml(getMasterProfileYaml());
}

/** Metadata preserved for AI tailoring but omitted from rendered resume YAML. */
export function getMasterProfileMetadata() {
  return getMasterProfileMetadataFrom(getMasterProfile());
}

export { masterProfileToResumeData } from './master-profile-adapter.js';

/** Resume-shaped YAML string derived from the master profile. */
export function getMasterProfileResumeYaml() {
  return yaml.dump(masterProfileToResumeData(getMasterProfile()), { lineWidth: 100, noRefs: true }).trim();
}
