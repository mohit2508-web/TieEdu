import { API_BASE_URL, apiFetch } from './api';
import type { AuthUser } from './auth';

export const BRANCHES = [
  { id: 'cse', label: 'CSE' },
  { id: 'it', label: 'IT' },
  { id: 'ece', label: 'ECE' },
  { id: 'eee', label: 'EEE' },
  { id: 'mech', label: 'Mechanical' },
  { id: 'civil', label: 'Civil' },
  { id: 'other', label: 'Other' },
] as const;

export const INTERESTS = [
  { id: 'placements', label: 'Crack placements' },
  { id: 'company', label: 'A specific company' },
  { id: 'coding', label: 'Learn coding' },
  { id: 'dsa', label: 'DSA' },
  { id: 'aptitude', label: 'Aptitude & reasoning' },
  { id: 'interview', label: 'Interviews' },
  { id: 'semester', label: 'Semester exams' },
  { id: 'ai', label: 'AI skills' },
  { id: 'english', label: 'Spoken English' },
] as const;

/**
 * Year of study → graduation year. The academic year starts in July, so in
 * Nov 2026 a final-year student graduates in 2027 and a first-year in 2030.
 */
export function yearOptions(now = new Date()): { label: string; grad_year: number }[] {
  const start = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return [
    { label: '1st year', grad_year: start + 4 },
    { label: '2nd year', grad_year: start + 3 },
    { label: '3rd year', grad_year: start + 2 },
    { label: 'Final year', grad_year: start + 1 },
    { label: 'Graduated', grad_year: start },
  ];
}

export interface OnboardingInput {
  grad_year?: number | null;
  branch?: string | null;
  interests?: string[];
  notify?: { email: boolean; push: boolean; whatsapp: boolean };
  whatsapp_number?: string;
  finish?: boolean;
  skip?: boolean;
}

export async function saveOnboarding(input: OnboardingInput): Promise<AuthUser> {
  const res = await apiFetch(`${API_BASE_URL}/me/onboarding`, { method: 'PUT', body: JSON.stringify(input) });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Could not save (${res.status})`);
  return body.user as AuthUser;
}
