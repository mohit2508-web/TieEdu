import { API_BASE_URL, apiFetch } from './api';

export const SUPPORT_TOPICS = [
  { id: 'payment', label: 'Payment or refund' },
  { id: 'account', label: 'Account or sign-in' },
  { id: 'course', label: 'A course or lesson' },
  { id: 'certificate', label: 'Certificate' },
  { id: 'drive', label: 'Mock drive' },
  { id: 'college', label: 'For colleges / TPO' },
  { id: 'other', label: 'Something else' },
] as const;
export type SupportTopic = (typeof SUPPORT_TOPICS)[number]['id'];

export async function sendSupportRequest(input: { name: string; email: string; topic: SupportTopic; message: string }): Promise<{ ref: string }> {
  const res = await apiFetch(`${API_BASE_URL}/support/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Could not send (${res.status})`);
  return body as { ref: string };
}
