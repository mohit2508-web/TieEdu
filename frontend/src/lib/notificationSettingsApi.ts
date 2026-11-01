import { API_BASE_URL, apiFetch } from './api';

export type Channel = 'email' | 'push' | 'whatsapp';
export type ChannelMap = Record<Channel, boolean>;

export interface NotificationSettingsView {
  topics: { id: string; label: string; description: string; required: boolean }[];
  prefs: Record<string, ChannelMap>;
  channels: ChannelMap;
  email: string;
  email_verified: boolean;
  whatsapp: { number: string; verified: boolean } | null;
}

async function call<T>(init?: RequestInit): Promise<T> {
  const res = await apiFetch(`${API_BASE_URL}/me/notification-settings`, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body as T;
}

export const fetchNotificationSettings = () => call<NotificationSettingsView>();
export const saveNotificationSettings = (patch: { channels?: Partial<ChannelMap>; topics?: Record<string, Partial<ChannelMap>> }) =>
  call<{ prefs: Record<string, ChannelMap>; channels: ChannelMap }>({ method: 'PUT', body: JSON.stringify(patch) });
