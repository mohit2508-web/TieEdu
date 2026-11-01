/**
 * Company industries are free text typed by admins, so the same field arrives
 * as "IT Services & Consulting", "IT Services and IT Consulting" and "IT
 * Consulting & Services". As filter chips that was five near-duplicates, one of
 * them a sentence long. This folds them into a few short groups. Order matters:
 * the first match wins, so the narrower groups come first.
 */
const GROUPS: Array<[string, RegExp]> = [
  ['Cybersecurity', /cyber|security/i],
  ['Fintech', /fintech|bank|financ|payment|insur/i],
  ['Analytics & AI', /analytic|data|artificial|\bai\b|machine learning/i],
  ['Product', /product|software|saas|internet|e-?commerce|cloud/i],
  ['IT Services', /it services|consult|outsourc|services/i],
];

export const industryGroup = (industry?: string | null): string => {
  if (!industry) return 'Other';
  for (const [name, re] of GROUPS) if (re.test(industry)) return name;
  return 'Other';
};
