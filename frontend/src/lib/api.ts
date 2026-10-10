import { Company, ComparisonMatrix, HeroPoster, HeroPosterAdmin, InterviewReport, PricingPlan, PricingCatalog, StudyPlanTemplateMeta } from '@/types';
import { getAccessToken, getUserId, apiRefresh, setAuthSession, AuthUser } from './auth';
import { API_BASE_URL, apiAssetUrl, isApiAssetUrl } from './assetUrl';

// Re-exported so the many existing `from '@/lib/api'` call sites keep working.
// The definitions live in `./assetUrl` so a unit suite can import and *execute*
// them; see the note at the top of that file.
export { API_BASE_URL, apiAssetUrl, isApiAssetUrl };

export const authHeaders = (): Record<string, string> =>
  getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {};

// Single-flight session refresh: when the 15-min access token expires, any
// 401 triggers ONE refresh via the httpOnly cookie, then retries the request.
// If the refresh itself fails the user is signed out and the error surfaces.
//
// Exported because the *boot* refresh has to share this guard, and not just the
// 401 path. The refresh token rotates: a second refresh presents a cookie that
// the first one already consumed, so it 401s and signs the user out. Anything
// that can call refresh more than once for the same session - a remounted
// effect, a second tab, a cold start - must go through here.
export let refreshInFlight: Promise<boolean> | null = null;

// The user that came back with the last successful refresh. The boot path needs
// it, and asking for it with a second `apiRefresh()` would re-introduce exactly
// the race this guard exists to prevent.
let sessionUser: AuthUser | null = null;
export const getSessionUser = (): AuthUser | null => sessionUser;

/*
 * Whether this browser is known to have no session, set only once a refresh has
 * actually failed. It exists because `getAccessToken()` cannot answer that
 * question: the access token is held in memory only, so on a cold start it is
 * empty even when the refresh cookie is completely valid.
 *
 * Gating 401 recovery on an in-memory token therefore skipped the recovery for
 * precisely the case that needed it - a privileged call made before the boot
 * refresh hydrated the token. On a freshly installed PWA that was the difference
 * between a stored push subscription and a silent 401, since the browser keeps
 * its own subscription and the server ends up with nothing.
 */
let sessionSignedOut = false;
export const isSessionSignedOut = (): boolean => sessionSignedOut;

export const tryRefreshSession = (): Promise<boolean> => {
  if (!refreshInFlight) {
    refreshInFlight = apiRefresh()
      .then((data) => {
        if (data?.accessToken) {
setAuthSession(data.accessToken, data.user?.id || getUserId());
        sessionUser = (data.user as AuthUser) || null;
        sessionSignedOut = false;
        return true;
      }
      setAuthSession(null, null);
      sessionUser = null;
      sessionSignedOut = true;
      return false;
      })
      .finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
};

// Exported so other API modules (e.g. lib/coursesApi.ts) share the single-flight
// 401 -> refresh -> retry behaviour instead of reimplementing it.
export const apiFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const doRequest = (): Promise<Response> =>
    fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(options.headers || {}) },
    });
  const res = await doRequest();
  // Recover on 401 unless this browser is *known* to be signed out. The old guard
  // required an in-memory access token to be present, so a cold start skipped the
  // refresh and handed the 401 straight to the caller.
  if (res.status === 401 && !sessionSignedOut &&
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

export type NotificationConfig = { vapidPublicKey: string | null };

/**
 * The server's public VAPID key, asked for at runtime.
 *
 * The build-time `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is only a fallback now. Inlining
 * it meant a client cached from an earlier deploy could never enable push — it
 * reported "push keys are not configured on the server" against a server that was
 * configured correctly, and nothing short of clearing site data fixed it. Key
 * rotation would have broken every installed client the same way.
 *
 * Memoised per page load: `subscribe` and the load-time sync both need it, and the
 * key cannot change within a session.
 *
 * The response body has to be parsed. `apiFetch` resolves to a raw `Response`, so
 * reading a property straight off it is always `undefined` - which silently sent
 * every client back to the build-time constant and made the runtime lookup look
 * like it worked while doing nothing.
 */
let vapidPublicKeyPromise: Promise<string | null> | null = null;

/*
 * Whether the key came from the API rather than the baked constant. It is the
 * signal that this build is actually talking to its own server: a cached app
 * shell on a dead origin still renders, and the fallback key then lets the user
 * reach a subscribe request that can only 404. Surfacing that difference is what
 * turns a silent dead end into an answerable question.
 */
let vapidConfigReachable = false;
export const isVapidConfigReachable = (): boolean => vapidConfigReachable;

export const fetchVapidPublicKey = async (): Promise<string | null> => {
  if (!vapidPublicKeyPromise) {
    vapidPublicKeyPromise = (async () => {
      const baked = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null;
      try {
        const res = await apiFetch(`${API_BASE_URL}/notifications/config`);
        if (res.ok) {
          const data = await res.json();
          const key = data?.vapidPublicKey;
          if (typeof key === 'string' && key.length > 0) {
            vapidConfigReachable = true;
            return key;
          }
        }
      } catch {
        /* Unreachable: offline, or an origin that no longer serves this API. */
      }
      return baked;
    })();
  }
  return vapidPublicKeyPromise;
};

export const uploadModulePdfApi = async (
  moduleId: string,
  file: File,
  title: string,
  onProgress?: (percent: number) => void
): Promise<any> => {
  const sendUpload = (token?: string | null): Promise<any> => {
    return new Promise<any>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const form = new FormData();
      form.append('file', file);
      form.append('title', title || file.name.replace(/\.pdf$/i, ''));
      xhr.open('POST', `${API_BASE_URL}/pdf/admin/modules/${encodeURIComponent(moduleId)}/upload`);
      xhr.timeout = 120000; // 120s timeout
      const authToken = token !== undefined ? token : getAccessToken();
      if (authToken) {
        xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
      }
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        try {
          if (xhr.status === 401) {
            return resolve({ __is401: true });
          }
          if (xhr.status === 413) {
            return reject(new Error('File size exceeds Nginx/Server upload limit (25MB max).'));
          }
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) resolve(data);
          else reject(new Error(data.error || `Upload failed (Status ${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed with server status ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('Network error during upload — check server connectivity or Nginx config.'));
      xhr.ontimeout = () => reject(new Error('Upload timed out after 120 seconds.'));
      xhr.send(form);
    });
  };

  let res = await sendUpload();
  if (res && res.__is401) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      res = await sendUpload(getAccessToken());
    } else {
      throw new Error('Session expired — please sign in again as admin.');
    }
  }
  if (res && res.__is401) {
    throw new Error('Session expired — please sign in again as admin.');
  }
  return res;
};

export const deleteModulePdfApi = async (moduleId: string) => {
  const res = await apiFetch(`${API_BASE_URL}/pdf/admin/modules/${encodeURIComponent(moduleId)}/pdf`, {
    method: 'DELETE',
  });
  return await res.json();
};

// Delete a single PDF from a module by its pdf id (multi-pdf support)
export const deleteModulePdfByIdApi = async (moduleId: string, pdfId: string) => {
  const res = await apiFetch(`${API_BASE_URL}/pdf/admin/modules/${encodeURIComponent(moduleId)}/pdfs/${encodeURIComponent(pdfId)}`, {
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

/**
 * GET /companies/compare?slugs=a,b,c
 *
 * The comparison matrix is DERIVED server-side from the live ledger (see
 * backend/src/lib/compare.ts). The browser never assembles a metric itself — it
 * only renders what the server counted, and it shows the accompanying
 * provenance so an unverified editorial figure is labelled as such.
 *
 * Passing an empty list lets the server pick the first published vaults, which
 * is what the page does on first paint before the user picks columns.
 */
export const fetchComparisonMatrix = async (slugs: string[]): Promise<ComparisonMatrix | null> => {
  try {
    const qs = slugs.filter(Boolean).map((s) => encodeURIComponent(s)).join(',');
    const res = await apiFetch(`${API_BASE_URL}/companies/compare${qs ? `?slugs=${qs}` : ''}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data && Array.isArray(data.companies) ? (data as ComparisonMatrix) : null;
  } catch {
    return null;
  }
};

// ============================================================================
// PRICING CATALOG — the only source of displayed prices
// ============================================================================

/**
 * Fetches the server-computed pricing catalog (ladder + per-company + per-module).
 * Public endpoint; the Bearer token is optional and only personalises rows to the
 * caller's already-owned modules. Never build a price in the UI without this.
 */
export const fetchPricingCatalogApi = async (): Promise<PricingCatalog | null> => {
  try {
    const res = await apiFetch(`${API_BASE_URL}/pricing/catalog`);
    if (!res.ok) return null;
    const data = await res.json();
    return data && Array.isArray(data.companies) ? (data as PricingCatalog) : null;
  } catch {
    return null;
  }
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
    // The whole parsed body is attached, not just `error`, because some
    // refusals carry an actionable field alongside the message — a slug clash
    // suggests a free alternative, which the admin UI offers as one click.
    let body: any = null;
    try {
      body = await res.json();
      message = body?.error || message;
    } catch { /* ignore */ }
    const err = new Error(message) as Error & { status?: number; body?: any };
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return res.json();
};

export const fetchAdminCompaniesApi = async (): Promise<Company[]> => {
  const res = await adminFetch('/admin/companies');
  return Array.isArray(res) ? res : [];
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

// ============================================================================
// HERO POSTERS — admin-authored creatives that rotate in the landing hero
// ============================================================================

export const fetchHeroPostersApi = async (): Promise<HeroPoster[]> => {
  // Plain fetch on purpose: this runs for logged-out visitors on the homepage,
  // and a 401-refresh dance would be pure noise. A failed request just means
  // "no posters", which the hero handles by falling back to the orbit.
  try {
    const res = await fetch(`${API_BASE_URL}/posters`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

export const fetchAdminPostersApi = async (): Promise<HeroPosterAdmin[]> => {
  const data = await adminFetch('/posters/admin');
  return Array.isArray(data) ? data : [];
};

export const createHeroPosterApi = async (data: any) =>
  adminFetch('/posters/admin', { method: 'POST', body: JSON.stringify(data) });

export const updateHeroPosterApi = async (posterId: string, data: any) =>
  adminFetch(`/posters/admin/${encodeURIComponent(posterId)}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteHeroPosterApi = async (posterId: string) =>
  adminFetch(`/posters/admin/${encodeURIComponent(posterId)}`, { method: 'DELETE' });

/**
 * Upload a poster image. Uses XHR rather than `apiFetch` because adminFetch
 * always sets a JSON content type, which multipart uploads cannot have, and
 * because the progress callback is what makes a 6MB upload feel honest.
 */
export const uploadPosterImageApi = async (file: File, onProgress?: (percent: number) => void) => {
  const form = new FormData();
  form.append('file', file);

  return new Promise<{ stored_name: string; file_name: string; size_bytes: number }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/posters/admin/upload`);
    xhr.timeout = 120000;
    const token = getAccessToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status === 401) return reject(new Error('Session expired — dobara admin login karo'));
        if (xhr.status === 413) return reject(new Error('Image 6MB se bada hai'));
        if (xhr.status >= 200 && xhr.status < 300) return resolve(data);
        reject(new Error(data?.error || `Upload failed (Status ${xhr.status})`));
      } catch {
        reject(new Error(`Upload failed with server status ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.ontimeout = () => reject(new Error('Upload timed out after 120 seconds'));
    xhr.send(form);
  });
};

export const fetchLeaderboardApi = async () => {
  const res = await fetch(`${API_BASE_URL}/gamification/leaderboard`);
  if (!res.ok) throw new Error('Leaderboard unavailable');
  const data = await res.json();
  return Array.isArray(data) ? data : (data?.entries || []);
};

export const generateStudyPlanApi = async (payload: {
  targetCompany: string;
  targetRole: string;
  /**
   * Optional hint, only used when there is no interview date. The server is
   * authoritative: a supplied `interviewDate` always wins, so the client no
   * longer has to guess (and get wrong) a day count.
   */
  daysRemaining?: number;
  interviewDate?: string | null;
}) => {
  const res = await apiFetch(`${API_BASE_URL}/study-plan/generate`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let message = 'Study plan generation failed';
    try { message = (await res.json()).error || message; } catch { /* ignore */ }
    throw new Error(message);
  }
  return await res.json();
};

export const fetchStudyPlanTemplatesApi = async (): Promise<StudyPlanTemplateMeta[]> => {
  const res = await apiFetch(`${API_BASE_URL}/study-plan/templates`);
  return (await res.json())?.templates || [];
};

export const fetchMyStudyPlanApi = async () => {
  const res = await apiFetch(`${API_BASE_URL}/study-plan/enrollment`);
  return await res.json();
};

export const saveMyStudyPlanApi = async (payload: {
  targetCompany: string;
  targetRole: string;
  interviewDate?: string | null;
}) => {
  const res = await apiFetch(`${API_BASE_URL}/study-plan/enrollment`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let message = 'Could not save your plan';
    try { message = (await res.json()).error || message; } catch { /* ignore */ }
    throw new Error(message);
  }
  return await res.json();
};

export const setStudyPlanPhaseApi = async (phaseId: string, completed: boolean) => {
  const res = await apiFetch(`${API_BASE_URL}/study-plan/enrollment/phases/${encodeURIComponent(phaseId)}`, {
    method: 'PUT',
    body: JSON.stringify({ completed }),
  });
  if (!res.ok) {
    let message = 'Could not update progress';
    try { message = (await res.json()).error || message; } catch { /* ignore */ }
    throw new Error(message);
  }
  return await res.json();
};

export const resetMyStudyPlanApi = async () => {
  const res = await apiFetch(`${API_BASE_URL}/study-plan/enrollment`, { method: 'DELETE' });
  if (!res.ok) {
    let message = 'Could not reset your plan';
    try { message = (await res.json()).error || message; } catch { /* ignore */ }
    throw new Error(message);
  }
  return await res.json();
};

// ---------- Study plan admin ----------

export const adminListStudyPlansApi = async (status?: string) =>
  adminFetch(`/admin/study-plans${status ? `?status=${encodeURIComponent(status)}` : ''}`);

export const adminGetStudyPlanApi = async (id: string) =>
  adminFetch(`/admin/study-plans/${encodeURIComponent(id)}`);

export const adminCreateStudyPlanApi = async (data: any) =>
  adminFetch('/admin/study-plans', { method: 'POST', body: JSON.stringify(data) });

export const adminUpdateStudyPlanApi = async (id: string, data: any) =>
  adminFetch(`/admin/study-plans/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) });

export const adminDeleteStudyPlanApi = async (id: string, hard = false) =>
  adminFetch(`/admin/study-plans/${encodeURIComponent(id)}${hard ? '?hard=1' : ''}`, { method: 'DELETE' });

export const adminAddStudyPlanPhaseApi = async (templateId: string, data: any) =>
  adminFetch(`/admin/study-plans/${encodeURIComponent(templateId)}/phases`, {
    method: 'POST', body: JSON.stringify(data),
  });

export const adminUpdateStudyPlanPhaseApi = async (templateId: string, phaseId: string, data: any) =>
  adminFetch(`/admin/study-plans/${encodeURIComponent(templateId)}/phases/${encodeURIComponent(phaseId)}`, {
    method: 'PUT', body: JSON.stringify(data),
  });

export const adminDeleteStudyPlanPhaseApi = async (templateId: string, phaseId: string) =>
  adminFetch(`/admin/study-plans/${encodeURIComponent(templateId)}/phases/${encodeURIComponent(phaseId)}`, {
    method: 'DELETE',
  });

export const adminReorderStudyPlanPhasesApi = async (templateId: string, phaseIds: string[]) =>
  adminFetch(`/admin/study-plans/${encodeURIComponent(templateId)}/phases/reorder`, {
    method: 'POST', body: JSON.stringify({ phase_ids: phaseIds }),
  });

export const adminAddStudyPlanBlockApi = async (templateId: string, phaseId: string, data: any) =>
  adminFetch(`/admin/study-plans/${encodeURIComponent(templateId)}/phases/${encodeURIComponent(phaseId)}/blocks`, {
    method: 'POST', body: JSON.stringify(data),
  });

export const adminUpdateStudyPlanBlockApi = async (templateId: string, phaseId: string, blockId: string, data: any) =>
  adminFetch(
    `/admin/study-plans/${encodeURIComponent(templateId)}/phases/${encodeURIComponent(phaseId)}/blocks/${encodeURIComponent(blockId)}`,
    { method: 'PUT', body: JSON.stringify(data) }
  );

export const adminDeleteStudyPlanBlockApi = async (templateId: string, phaseId: string, blockId: string) =>
  adminFetch(
    `/admin/study-plans/${encodeURIComponent(templateId)}/phases/${encodeURIComponent(phaseId)}/blocks/${encodeURIComponent(blockId)}`,
    { method: 'DELETE' }
  );

export const fetchInterviewModulesApi = async () => {
  try {
    const res = await apiFetch(`${API_BASE_URL}/interview-course/modules`);
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

/**
 * REMOVED: generateCourseCertificateApi (interview-course certificate).
 *
 * The endpoint it called now answers 410 Gone. It minted an unsigned
 * `TIEEDU-CERT-<Math.random()>` serial with a verification URL that pointed at a
 * route which never existed. Certificates are issued by the course engine
 * instead — see `issueCertificate` in `@/lib/coursesApi`, and verify them at
 * `/verify/<serial>`.
 */

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

/**
 * The student's own XP ledger (GET /courses/xp), trimmed to what the bell
 * needs. The endpoint also returns totals and a level, which nothing here
 * reads — the header shows XP from `/auth/me` so the two can never disagree
 * about the same number.
 *
 * `entries` carries negative rows when an award was reversed; callers must not
 * treat every row as a reward.
 */
export interface MyXpEntry {
  id: string;
  xp: number;
  reason: string;
  course_title: string | null;
  lesson_title?: string | null;
  note?: string;
  created_at: string;
}

export const fetchMyXpLedgerApi = async (): Promise<{ total_xp: number; entries: MyXpEntry[] }> => {
  const res = await apiFetch(`${API_BASE_URL}/courses/xp`);
  if (!res.ok) throw new Error('XP history unavailable');
  const data = await res.json();
  return { total_xp: Number(data?.total_xp) || 0, entries: Array.isArray(data?.entries) ? data.entries : [] };
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
  support_phone: string;
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

// Both analytics endpoints are admin-only on the server (`analytics.routes.ts`
// mounts `requireAdmin` router-wide), so they must go through `apiFetch` rather
// than bare `fetch`: it attaches the bearer token and performs the single-flight
// 401 -> refresh -> retry. A bare fetch sent no token at all, which is how these
// two stayed reachable by anonymous callers in the first place.
export const fetchAnalyticsApi = async (): Promise<AnalyticsSnapshot> => {
  const res = await apiFetch(`${API_BASE_URL}/analytics`);
  if (!res.ok) throw new Error('Analytics feed unavailable');
  return await res.json();
};

export const fetchRevenueSeriesApi = async (): Promise<{ status: string; series: RevenuePoint[] }> => {
  const res = await apiFetch(`${API_BASE_URL}/analytics/revenue`);
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

/** Campus cohort analytics — admin-only on the server, so it must go through
 *  apiFetch, which carries the bearer token and refreshes it when expired. */
export const fetchCampusCohortApi = async (): Promise<any> => {
  const res = await apiFetch(`${API_BASE_URL}/campus/cohort`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Cohort feed unavailable');
  }
  return await res.json();
};

/*
 * Resolve a caller's path against the configured API base.
 *
 * Callers pass bare paths like `/notifications/subscribe`. Those were handed to
 * `fetch` untouched, which only worked while the base was an absolute URL. Once
 * the app went same-origin the bare path became a request to the Next server
 * itself, which is not an API route, so it 404'd. Probing `/api/...` by hand
 * confirmed the endpoint was healthy the whole time and sent the investigation
 * in the wrong direction, so the prefix belongs here rather than at each call
 * site.
 *
 * An absolute URL is left alone: it is already resolved, and re-prefixing it
 * would break deployments that deliberately point at a different host.
 */
const apiUrl = (url: string): string => {
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
};

const apiClient = { get: (url:any,config?:any)=>apiFetch(apiUrl(url),{...config,method:'GET'}), post:(url:any,body?:any,config?:any)=>apiFetch(apiUrl(url),{...config,method:'POST',body:typeof body==='string'?body:body?JSON.stringify(body):undefined}), put:(url:any,body?:any,config?:any)=>apiFetch(apiUrl(url),{...config,method:'PUT',body:typeof body==='string'?body:body?JSON.stringify(body):undefined}), delete:(url:any,config?:any)=>apiFetch(apiUrl(url),{...config,method:'DELETE'}) };
export default apiClient;

/**
 * Push notification helpers for the admin panel's Notifications tab.
 *
 * These parse the body, unlike `apiClient` above, which hands back the raw
 * `Response`. That difference matters here: the whole point of the send-test
 * button is reading `sent`/`failed` off the reply, and against a raw `Response`
 * those properties do not exist — the count silently reads as undefined and the
 * UI reports success for a send that delivered nothing.
 */
export interface MySubscription {
  id: string;
  device_id: string;
  provider: string;
  endpoint_hint: string;
  created_at: string;
  last_success_at: string | null;
  last_seen_at: string | null;
  failure_count: number;
  blocked: boolean;
  disable_reason: string | null;
  user_agent: string | null;
  platform: string | null;
}

const jsonFetch = async <T,>(path: string, options?: RequestInit): Promise<T> => {
  const res = await apiFetch(`${API_BASE_URL}${path}`, options);
  if (!res.ok) {
    let message = `API error ${res.status}`;
    try {
      const body: any = await res.json();
      message = body?.error || message;
    } catch { /* ignore */ }
    throw new Error(message);
  }
  return (await res.json()) as T;
};

export const fetchMySubscriptionsApi = async (): Promise<MySubscription[]> => {
  const r = await jsonFetch<{ subscriptions?: MySubscription[] }>('/notifications/mine');
  return Array.isArray(r?.subscriptions) ? r.subscriptions : [];
};

/**
 * Defaults to 0 rather than `undefined` when the server omits a count, because
 * the caller branches on `sent > 0` and `undefined > 0` is false either way —
 * but `Number(undefined)` becoming NaN would render as a blank in the UI.
 */
export const sendTestPushApi = async (): Promise<{ sent: number; failed: number }> => {
  const r = await jsonFetch<{ sent?: number; failed?: number }>('/notifications/test', { method: 'POST' });
  return { sent: Number(r?.sent ?? 0), failed: Number(r?.failed ?? 0) };
};

/**
 * Staff-initiated broadcast. `confirm: true` is required by the server, not just
 * by this form — see the route, where a confirmation that only existed in the
 * client would not stop a retried request from reaching every student.
 */
export type BroadcastAudience =
  | { kind: 'all_students' }
  | { kind: 'users'; userIds: string[] }
  | { kind: 'course'; courseId: string };

export interface BroadcastResult {
  ok: boolean;
  resolved_users: number;
  endpoints: number;
  recipients: number;
  sent: number;
  failed: number;
  skipped: number;
}

export const sendBroadcastApi = async (input: {
  audience: BroadcastAudience;
  title: string;
  body: string;
  url?: string;
  confirm: boolean;
}): Promise<BroadcastResult> =>
  adminFetch('/notifications/broadcast', {
    method: 'POST',
    body: JSON.stringify(input),
  });
