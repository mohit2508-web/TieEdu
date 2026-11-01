/**
 * Placement readiness bands (TRAIN_TEST_TRACK_PLAN §6). The number alone does
 * not tell a student what to do, so every score is shown with a word and a
 * next step. `null` means no test yet: we never show a made-up score.
 */
export type Band = { label: string; tone: 'danger' | 'warning' | 'success' | 'signal'; message: (company: string) => string };

export const readinessBand = (score: number | null): Band | null => {
  if (score == null) return null;
  if (score >= 85) return { label: 'Drive-ready', tone: 'success', message: (c) => `You're drive-ready for ${c}.` };
  if (score >= 70) return { label: 'Ready', tone: 'success', message: (c) => `You're ready for ${c}. Keep testing.` };
  if (score >= 40) return { label: 'Getting there', tone: 'warning', message: () => 'Fix your weakest round to cross 70.' };
  return { label: 'Not ready yet', tone: 'danger', message: () => 'Start with your weakest round.' };
};

export const BAND_CLASS: Record<Band['tone'], string> = {
  danger: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-amber-deep',
  success: 'bg-success-soft text-success',
  signal: 'bg-signal-soft text-link',
};
