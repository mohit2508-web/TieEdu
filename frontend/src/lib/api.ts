import { Company, InterviewReport, PricingPlan } from '@/types';
import { getAccessToken, getUserId, apiRefresh, setAuthSession } from './auth';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const authHeaders = (): Record<string, string> =>
  getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {};

// Single-flight session refresh: when the 15-min access token expires, any
// 401 triggers ONE refresh via the httpOnly cookie, then retries the request.
// If the refresh itself fails the user is signed out and the error surfaces.
let refreshInFlight: Promise<boolean> | null = null;
const tryRefreshSession = (): Promise<boolean> => {
  if (!refreshInFlight) {
    refreshInFlight = apiRefresh()
      .then((data) => {
        if (data?.accessToken) {
          setAuthSession(data.accessToken, data.user?.id || getUserId());
          return true;
        }
        setAuthSession(null, null);
        return false;
      })
      .finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
};

const apiFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const doRequest = (): Promise<Response> =>
    fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(options.headers || {}) },
    });
  const res = await doRequest();
  if (res.status === 401 && getAccessToken() &&
      !url.includes('/auth/refresh') && !url.includes('/auth/login') && !url.includes('/auth/signup') && !url.includes('/auth/logout')) {
    const refreshed = await tryRefreshSession();
    if (refreshed) return doRequest();
  }
  return res;
};

// ============================================================================
// PDF LIBRARY (module-level single PDF — admin upload, student view-only)
// ============================================================================

export const pdfFileUrl = (storedName: string) => `${API_BASE_URL}/pdf/file/${encodeURIComponent(storedName)}`;

export const uploadModulePdfApi = async (
  moduleId: string,
  file: File,
  title: string,
  onProgress?: (percent: number) => void
) => {
  return new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append('file', file);
    form.append('title', title || file.name.replace(/\.pdf$/i, ''));
    xhr.open('POST', `${API_BASE_URL}/pdf/admin/modules/${encodeURIComponent(moduleId)}/upload`);
    if (getAccessToken()) {
      xhr.setRequestHeader('Authorization', `Bearer ${getAccessToken()}`);
    }
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new Error(data.error || 'Upload failed'));
      } catch {
        reject(new Error('Upload failed'));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(form);
  });
};

export const deleteModulePdfApi = async (moduleId: string) => {
  const res = await apiFetch(`${API_BASE_URL}/pdf/admin/modules/${encodeURIComponent(moduleId)}/pdf`, {
    method: 'DELETE',
  });
  return await res.json();
};

export const fetchPdfBytesApi = async (storedName: string, onProgress?: (fraction: number) => void) => {
  const res = await apiFetch(`${API_BASE_URL}/pdf/file/${encodeURIComponent(storedName)}`);
  if (res.status === 403) throw new Error('LOCKED');
  if (!res.ok) throw new Error('PDF load failed');
  if (!res.body || !onProgress) return res.arrayBuffer();
  const total = Number(res.headers.get('Content-Length')) || 0;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      loaded += value.length;
      if (total) onProgress(loaded / total);
    }
  }
  const out = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out.buffer;
};

// Admin preview + authenticated in-app PDF open — returns a blob object URL.
export const pdfFileObjectUrlApi = async (storedName: string): Promise<string> => {
  const res = await apiFetch(`${API_BASE_URL}/pdf/file/${encodeURIComponent(storedName)}`);
  if (!res.ok) {
    if (res.status === 403) throw new Error('LOCKED');
    throw new Error('PDF load failed');
  }
  return URL.createObjectURL(await res.blob());
};

// Download the ORIGINAL admin-uploaded PDF (authenticated, saves as file).
export const downloadPdfApi = async (storedName: string, fileName?: string): Promise<void> => {
  const res = await apiFetch(`${API_BASE_URL}/pdf/file/${encodeURIComponent(storedName)}`);
  if (!res.ok) {
    if (res.status === 403) throw new Error('LOCKED');
    throw new Error('PDF download failed');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || storedName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export const fetchCompanies = async (): Promise<Company[]> => {
  const res = await fetch(`${API_BASE_URL}/companies`);
  if (!res.ok) throw new Error('API request failed');
  return await res.json();
};

export const fetchCompanyBySlug = async (slug: string): Promise<Company> => {
  const res = await apiFetch(`${API_BASE_URL}/companies/${slug}`);
  if (!res.ok) throw new Error('API request failed');
  return await res.json();
};

// ============================================================================
// CHECKOUT (real orders only — failures throw, never fabricated)
// ============================================================================

// Merchant UPI details shown on the payment screen (signed-in only).
export const getCheckoutPaymentInfoApi = async () => {
  const res = await apiFetch(`${API_BASE_URL}/checkout/payment-info`);
  if (!res.ok) throw new Error('Payment info unavailable');
  return await res.json();
};

export const createOrderApi = async (payload: { amount: number; items: any[]; coupon_code?: string }) => {
  const res = await apiFetch(`${API_BASE_URL}/checkout/create-order`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Checkout unavailable');
  }
  return await res.json();
};

// UPI flow: user completed the transfer → order waits for admin verification.
export const confirmPaymentApi = async (orderId: string) => {
  const res = await apiFetch(`${API_BASE_URL}/checkout/confirm-payment`, {
    method: 'POST',
    body: JSON.stringify({ order_id: orderId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Payment confirmation failed');
  }
  return await res.json();
};

// Live order status — polled while the order awaits admin verification.
export const getOrderStatusApi = async (orderId: string) => {
  const res = await apiFetch(`${API_BASE_URL}/checkout/order/${encodeURIComponent(orderId)}/status`);
  if (!res.ok) throw new Error('Order status unavailable');
  return await res.json();
};

export const validateCouponApi = async (code: string, subtotal: number) => {
  const res = await fetch(`${API_BASE_URL}/checkout/validate-coupon`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, subtotal }),
  });
  if (!res.ok) throw new Error('Coupon service unavailable');
  return await res.json();
};

export const fetchActiveCouponsApi = async () => {
  const res = await fetch(`${API_BASE_URL}/checkout/coupons`);
  if (!res.ok) throw new Error('Coupon feed unavailable');
  return await res.json();
};

export const verifyRazorpayPaymentApi = async (order_id: string, razorpay_payment_id: string, razorpay_signature: string) => {
  const res = await apiFetch(`${API_BASE_URL}/checkout/verify`, {
    method: 'POST',
    body: JSON.stringify({ order_id, razorpay_payment_id, razorpay_signature }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Payment verification failed');
  }
  return await res.json();
};

export const fetchUnlocksApi = async (userId?: string) => {
  const uid = userId || getUserId();
  if (!uid) throw new Error('Sign in to view unlocked vaults');
  const res = await apiFetch(`${API_BASE_URL}/unlocks/${uid}`);
  if (!res.ok) throw new Error('Unlock feed unavailable');
  return await res.json();
};

export const grantUnlockApi = async (companyId: string) => {
  const res = await apiFetch(`${API_BASE_URL}/unlocks`, {
    method: 'POST',
    body: JSON.stringify({ company_id: companyId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Unlock grant failed');
  }
  return await res.json();
};

export const submitInterviewReportApi = async (reportData: any) => {
  const res = await apiFetch(`${API_BASE_URL}/reports`, {
    method: 'POST',
    body: JSON.stringify(reportData),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Report submission failed');
  }
  return await res.json();
};

export const submitInterviewReportForCompanyApi = async (
  companyId: string,
  reportData: any
) => submitInterviewReportApi({ ...reportData, company_id: companyId });

// Admin moderation queue — Bearer token required (admins see every status; students only see published).
export const fetchModerationReportsApi = async () => {
  const res = await apiFetch(`${API_BASE_URL}/reports`);
  if (!res.ok) throw new Error('Reports feed unavailable');
  return await res.json();
};

export const fetchPublishedReportsApi = async (companyId: string) => {
  const res = await fetch(`${API_BASE_URL}/reports?company_id=${encodeURIComponent(companyId)}&status=published`);
  if (!res.ok) throw new Error('Published reports unavailable');
  return await res.json();
};

export const updateReportStatusApi = async (reportId: string, status: 'published' | 'rejected') => {
  const res = await apiFetch(`${API_BASE_URL}/reports/${reportId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Report status update failed');
  }
  return await res.json();
};

export const saveBlockContentApi = async (blockData: any) => {
  const res = await apiFetch(`${API_BASE_URL}/admin/blocks`, {
    method: 'POST',
    body: JSON.stringify(blockData),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Block save failed');
  }
  return await res.json();
};

// ============================================================================
// ADMIN CMS API (Module A — full CRUD)
// ============================================================================

const adminFetch = async (path: string, options?: RequestInit) => {
  const res = await apiFetch(`${API_BASE_URL}${path}`, options);
  if (!res.ok) {
    let message = `API error ${res.status}`;
    try { message = (await res.json()).error || message; } catch { /* ignore */ }
    throw new Error(message);
  }
  return res.json();
};

export const updateCompanyApi = async (companyId: string, data: any) =>
  adminFetch(`/admin/companies/${companyId}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteCompanyApi = async (companyId: string) =>
  adminFetch(`/admin/companies/${companyId}`, { method: 'DELETE' });

export const createCompanyApi = async (data: any) =>
  adminFetch('/admin/companies', { method: 'POST', body: JSON.stringify(data) });

export const createModuleApi = async (companyId: string, data: any) =>
  adminFetch(`/admin/companies/${companyId}/modules`, { method: 'POST', body: JSON.stringify(data) });

export const updateModuleApi = async (moduleId: string, data: any) =>
  adminFetch(`/admin/modules/${moduleId}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteModuleApi = async (moduleId: string) =>
  adminFetch(`/admin/modules/${moduleId}`, { method: 'DELETE' });

export const reorderModulesApi = async (companyId: string, moduleIds: string[]) =>
  adminFetch(`/admin/companies/${companyId}/modules/reorder`, { method: 'POST', body: JSON.stringify({ module_ids: moduleIds }) });

export const saveSectionDataApi = async (moduleId: string, sectionData: any) =>
  adminFetch(`/admin/modules/${moduleId}/section`, { method: 'PUT', body: JSON.stringify(sectionData) });

export const createItemApi = async (moduleId: string, data: any) =>
  adminFetch(`/admin/modules/${moduleId}/items`, { method: 'POST', body: JSON.stringify(data) });

export const updateItemApi = async (moduleId: string, itemId: string, data: any) =>
  adminFetch(`/admin/modules/${moduleId}/items/${itemId}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteItemApi = async (moduleId: string, itemId: string) =>
  adminFetch(`/admin/modules/${moduleId}/items/${itemId}`, { method: 'DELETE' });

export const addBlockApi = async (itemId: string, data: any) =>
  adminFetch(`/admin/items/${itemId}/blocks`, { method: 'POST', body: JSON.stringify(data) });

export const updateBlockApi = async (itemId: string, blockId: string, data: any) =>
  adminFetch(`/admin/items/${itemId}/blocks/${blockId}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteBlockApi = async (itemId: string, blockId: string) =>
  adminFetch(`/admin/items/${itemId}/blocks/${blockId}`, { method: 'DELETE' });

export const reorderBlocksApi = async (itemId: string, blockIds: string[]) =>
  adminFetch(`/admin/items/${itemId}/blocks/reorder`, { method: 'POST', body: JSON.stringify({ block_ids: blockIds }) });

export const fetchCouponsApi = async () => {
  const res = await apiFetch(`${API_BASE_URL}/admin/coupons`);
  if (!res.ok) throw new Error('Admin coupon feed unavailable');
  return await res.json();
};

export const createCouponApi = async (data: any) =>
  adminFetch('/admin/coupons', { method: 'POST', body: JSON.stringify(data) });

export const updateCouponApi = async (couponId: string, data: any) =>
  adminFetch(`/admin/coupons/${couponId}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteCouponApi = async (couponId: string) =>
  adminFetch(`/admin/coupons/${couponId}`, { method: 'DELETE' });

export const fetchLeaderboardApi = async () => {
  const res = await fetch(`${API_BASE_URL}/gamification/leaderboard`);
  if (!res.ok) throw new Error('Leaderboard unavailable');
  const data = await res.json();
  return Array.isArray(data) ? data : (data?.entries || []);
};

export const generateStudyPlanApi = async (payload: { targetCompany: string; targetRole: string; daysRemaining: number }) => {
  const res = await fetch(`${API_BASE_URL}/gamification/study-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Study plan generation failed');
  return await res.json();
};

export const fetchInterviewModulesApi = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/interview-course/modules`);
    if (!res.ok) throw new Error('API request failed');
    return await res.json();
  } catch (err) {
    return { success: false, data: [] };
  }
};

export const getInterviewCourseProgressApi = async (userId?: string) => {
  const uid = userId || getUserId();
  if (!uid) throw new Error('Sign in to sync course progress');
  const res = await apiFetch(`${API_BASE_URL}/interview-course/progress/${uid}`);
  if (!res.ok) throw new Error('Progress feed unavailable');
  return await res.json();
};

export const saveInterviewCourseProgressApi = async (moduleId: number) => {
  const res = await apiFetch(`${API_BASE_URL}/interview-course/progress`, {
    method: 'POST',
    body: JSON.stringify({ module_id: moduleId }),
  });
  if (!res.ok) throw new Error('Progress save failed');
  return await res.json();
};

export const generateCourseCertificateApi = async (candidateName: string) => {
  const res = await apiFetch(`${API_BASE_URL}/interview-course/certificate`, {
    method: 'POST',
    body: JSON.stringify({ candidate_name: candidateName }),
  });
  if (!res.ok) throw new Error('Certificate generation failed');
  return await res.json();
};

export interface MyAccount {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'user' | 'admin';
    xp: number;
    streak: number;
    college?: string | null;
    badge?: string | null;
    avatar?: string | null;
    created_at: string;
  };
  unlocked_company_ids: string[];
  orders: {
    id: string;
    amount: number | null;
    status: string;
    coupon_code: string | null;
    created_at: string;
    items: { name: string; kind: string }[];
  }[];
}

export const fetchMyAccount = async (): Promise<MyAccount> => {
  const res = await apiFetch(`${API_BASE_URL}/auth/me`);
  if (!res.ok) throw new Error('Could not load your account — please try again.');
  return await res.json();
};

export const fetchMyReports = async () => {
  const res = await apiFetch(`${API_BASE_URL}/reports/mine`);
  if (!res.ok) throw new Error('Reports feed unavailable');
  return await res.json();
};

export const updateProfileApi = async (payload: { name?: string; college?: string; avatar?: string | null }) => {
  const res = await apiFetch(`${API_BASE_URL}/auth/profile`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Profile update failed');
  }
  const data = await res.json();
  return data.user;
};

export const changePasswordApi = async (currentPassword: string, newPassword: string) => {
  const res = await apiFetch(`${API_BASE_URL}/auth/change-password`, {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Password change failed');
  }
  return await res.json();
};

// ============================================================================
// ADMIN DASHBOARD API (Phase Ad) — real data, no fabricated fallbacks
// ============================================================================

export interface AdminOrder {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  amount_paisa: number;
  amount_inr: number;
  base_amount_paisa: number;
  discount_paisa: number;
  status: string;
  coupon_code: string | null;
  items: { kind: string; name: string; module_title: string | null }[];
  item_names: string[];
  created_at: string;
  paid_at: string | null;
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  disabled: boolean;
  xp: number;
  streak: number;
  college: string | null;
  badge: string | null;
  created_at: string;
  orders_count: number;
  revenue_inr: number;
  unlocks_count: number;
  reports_count: number;
}

export interface PlatformSettings {
  platform_name: string;
  support_email: string;
  upi_id: string;
  upi_qr: string;
  merchant_name: string;
  upi_instructions: string;
}

export interface AnalyticsSnapshot {
  status: string;
  honest: boolean;
  system: { storage: string; uptime_seconds: number; time: string };
  content: { companies: number; modules: number; items: number; pdfs: number; published_reports: number; pending_reports: number };
  commerce: { orders_created: number; orders_paid: number; revenue_inr: number; coupons_applied: number; coupon_redemptions: number };
  vaults: { active_unlocks: number; unique_users_unlocked: number; weekly_unlocks: number };
  accounts: { users: number; admins: number; active_sessions: number };
}

export interface RevenuePoint {
  date: string;
  revenue_inr: number;
  orders: number;
}

export const fetchAdminOrdersApi = async (q?: string, statusFilter?: string) => {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (statusFilter) params.set('status', statusFilter);
  const qs = params.toString();
  return adminFetch(`/admin/orders${qs ? `?${qs}` : ''}`);
};

export const fetchAdminUsersApi = async (q?: string) => {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  const qs = params.toString();
  return adminFetch(`/admin/users${qs ? `?${qs}` : ''}`);
};

export const setUserDisabledApi = async (userId: string, disabled: boolean) =>
  adminFetch(`/admin/users/${userId}/status`, { method: 'PUT', body: JSON.stringify({ disabled }) });

export const fetchAdminSettingsApi = async () => adminFetch('/admin/settings');

export const fetchAdminAuditApi = async () => adminFetch('/admin/audit');

export const updateAdminSettingsApi = async (settings: Partial<PlatformSettings>) =>
  adminFetch('/admin/settings', { method: 'PUT', body: JSON.stringify(settings) });

// UPI manual-verification queue (admin) — real money in, real unlocks out.
export interface PendingPayment {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  amount_paisa: number;
  amount_inr: number;
  coupon_code: string | null;
  item_names: string[];
  confirmed_at: string;
  created_at: string;
}

export const fetchPendingPaymentsApi = async (): Promise<{ status: string; pending: PendingPayment[] }> =>
  adminFetch('/admin/payments/pending');

export const verifyPaymentApi = async (orderId: string) =>
  adminFetch(`/admin/payments/${orderId}/verify`, { method: 'POST' });

export const rejectPaymentApi = async (orderId: string, reason?: string) =>
  adminFetch(`/admin/payments/${orderId}/reject`, { method: 'POST', body: JSON.stringify({ reason: reason || '' }) });

export const fetchAnalyticsApi = async (): Promise<AnalyticsSnapshot> => {
  const res = await fetch(`${API_BASE_URL}/analytics`);
  if (!res.ok) throw new Error('Analytics feed unavailable');
  return await res.json();
};

export const fetchRevenueSeriesApi = async (): Promise<{ status: string; series: RevenuePoint[] }> => {
  const res = await fetch(`${API_BASE_URL}/analytics/revenue`);
  if (!res.ok) throw new Error('Revenue feed unavailable');
  return await res.json();
};

export const revokeUnlockApi = async (userId: string, companyId: string) => {
  const res = await apiFetch(`${API_BASE_URL}/unlocks`, {
    method: 'DELETE',
    body: JSON.stringify({ user_id: userId, company_id: companyId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Unlock revoke failed');
  }
  return await res.json();
};
