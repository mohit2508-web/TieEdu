// ============================================================================
// TRACKS
//
// Career learning tracks — ordered course sequences with an aggregated
// progress meter and a Career Track certificate issued once every member
// course is complete AND certificate-ready.
//
// Two rules the UI depends on:
//   1. A track's `courses` array may contain `published: false` entries
//      (member course unpublished or missing from the store). These are shown
//      as "coming soon" and block claiming — never silently dropped.
//   2. The track certificate reuses the course certificate download/verify
//      endpoints (serial is the same TIEEDU-YYYY-XXXXXXXX shape), so no
//      separate download wiring is needed.
// ============================================================================

import { API_BASE_URL, apiFetch } from './api';
import type {
  TrackListResponse,
  TrackDetailResponse,
  LearningTrack,
  TrackCertificate,
} from '@/types';

const TRACKS = `${API_BASE_URL}/tracks`;

/** Pull the server's error message out of a failed response. */
async function apiError(res: Response, fallback: string): Promise<Error> {
  const data = await res.json().catch(() => ({}));
  return new Error(data?.error || fallback);
}

/** Public list of all published tracks, with aggregate progress if signed in. */
export const fetchTracks = async (): Promise<LearningTrack[]> => {
  const res = await apiFetch(TRACKS);
  if (!res.ok) throw await apiError(res, 'Could not load learning tracks');
  const data: TrackListResponse = await res.json();
  return data.tracks || [];
};

/** Full detail for one track, including per-course state and certificate. */
export const fetchTrack = async (slug: string): Promise<LearningTrack> => {
  const res = await apiFetch(`${TRACKS}/${encodeURIComponent(slug)}`);
  if (!res.ok) throw await apiError(res, 'Track not found');
  const data: TrackDetailResponse = await res.json();
  return data.track;
};

/**
 * Claim the Career Track certificate. Idempotent — re-claiming returns the
 * existing certificate. Requires auth; server-side readiness gate rejects
 * with a 403 if any member course is incomplete or not cert-ready.
 */
export const claimTrackCertificate = async (
  slug: string
): Promise<TrackCertificate> => {
  const res = await apiFetch(`${TRACKS}/${encodeURIComponent(slug)}/certificate`, {
    method: 'POST',
  });
  if (!res.ok) throw await apiError(res, 'Could not issue track certificate');
  const data = await res.json();
  return data.certificate;
};
