'use client';

import { useEffect, useState } from 'react';
import {
  fetchCompanies,
  fetchInterviewModulesApi,
  fetchMyStudyPlanApi,
  getInterviewCourseProgressApi,
} from '@/lib/api';
import { fetchMyCourses } from '@/lib/coursesApi';
import { fetchMyAttemptsApi, fetchSkillsApi } from '@/lib/skillTestApi';
import { fetchDropFeedApi } from '@/lib/dropsApi';
import type { BriefingSources } from '@/lib/briefing/briefingLogic';

const FETCH_BUDGET_MS = 4000;

const softTimeout = <T,>(promise: Promise<T>): Promise<T | null> =>
  Promise.race([
    promise.then((value) => value).catch(() => null),
    new Promise<null>((resolve) => window.setTimeout(() => resolve(null), FETCH_BUDGET_MS)),
  ]);

const EMPTY_SOURCES: BriefingSources = {
  plan: null,
  myCourses: null,
  skills: null,
  attempts: null,
  interviewModules: null,
  interviewProgress: null,
  companies: null,
  drops: null,
};

export interface UseBriefingDataResult {
  sources: BriefingSources;
  ready: boolean;
}

export const useBriefingData = (enabled: boolean): UseBriefingDataResult => {
  const [sources, setSources] = useState<BriefingSources>(EMPTY_SOURCES);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled || ready) return;
    let active = true;

    (async () => {
      const [
        plan,
        myCourses,
        skills,
        attempts,
        interviewModules,
        interviewProgress,
        companies,
        drops,
      ] = await Promise.all([
        softTimeout(fetchMyStudyPlanApi()),
        softTimeout(fetchMyCourses()),
        softTimeout(fetchSkillsApi()),
        softTimeout(fetchMyAttemptsApi()),
        softTimeout(fetchInterviewModulesApi()),
        softTimeout(getInterviewCourseProgressApi().catch(() => null)),
        softTimeout(fetchCompanies()),
        softTimeout(fetchDropFeedApi({ limit: 5 })),
      ]);
      if (!active) return;
      setSources({
        plan,
        myCourses,
        skills,
        attempts,
        interviewModules,
        interviewProgress,
        companies,
        drops,
      });
      setReady(true);
    })();

    return () => {
      active = false;
    };
  }, [enabled, ready]);

  return { sources, ready };
};
