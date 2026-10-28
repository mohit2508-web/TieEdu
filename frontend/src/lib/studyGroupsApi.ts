import { API_BASE_URL, apiFetch } from './api';

/** Mirrors backend lib/studyGroups. */
export interface GroupCompany { name: string; slug: string }
export interface GroupSummary { members: number; practised_today: number; days_this_week: number }
export interface GroupMember {
  handle: string;
  name: string;
  me: boolean;
  days_this_week: number;
  streak: number;
  last_active: string;
  active_today: boolean;
  test_date: string | null;
  can_nudge: boolean;
  nudge_note: string | null;
}
export interface GroupSettings { name_mode: 'first_name' | 'initials'; share_test_date: boolean; nudges_ok: boolean }
export type GroupView =
  | { company: GroupCompany; joined: false; summary: GroupSummary; my_test_date: string | null }
  | {
      company: GroupCompany;
      joined: true;
      summary: GroupSummary;
      settings: GroupSettings;
      members: GroupMember[];
      hidden_members: number;
      nudge_kinds: Array<{ id: string; label: string }>;
    };
export interface InboxItem { id: string; text: string; company: GroupCompany | null; created_at: string; seen: boolean }
export interface MyGroups {
  groups: Array<{ company: GroupCompany; members: number; practised_today: number }>;
  suggestions: Array<{ company: GroupCompany; members: number }>;
  inbox: { items: InboxItem[]; unread: number };
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(`${API_BASE_URL}${path}`, init);
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body as T;
}

const g = (slug: string) => `/study-groups/${encodeURIComponent(slug)}`;
export const fetchMyGroups = () => call<MyGroups>('/study-groups');
export const markNudgesSeen = () => call<void>('/study-groups/inbox/seen', { method: 'POST' });
export const fetchGroup = (slug: string) => call<GroupView>(g(slug));
export const joinGroup = (slug: string, input: Partial<GroupSettings>) => call<GroupView>(`${g(slug)}/join`, { method: 'POST', body: JSON.stringify(input) });
export const updateGroupSettings = (slug: string, input: Partial<GroupSettings>) => call<GroupView>(`${g(slug)}/me`, { method: 'PUT', body: JSON.stringify(input) });
export const leaveGroup = (slug: string) => call<void>(`${g(slug)}/me`, { method: 'DELETE' });
export const sendNudge = (slug: string, to: string, kind: string) => call<GroupView>(`${g(slug)}/nudges`, { method: 'POST', body: JSON.stringify({ to, kind }) });
