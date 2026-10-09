import { describe, expect, it } from 'vitest';
import {
  averageProgress,
  classifyRisk,
  completionRate,
  DEFAULT_RISK_THRESHOLDS,
  progressDistribution,
} from './analytics';

describe('averageProgress', () => {
  it('averages and rounds', () => {
    expect(averageProgress([100, 50, 0])).toBe(50);
    expect(averageProgress([33, 33, 34])).toBe(33);
  });

  it('handles empty and out-of-range values', () => {
    expect(averageProgress([])).toBe(0);
    expect(averageProgress([150, -50])).toBe(50);
  });
});

describe('completionRate', () => {
  it('computes a rounded rate', () => {
    expect(completionRate(3, 4)).toBe(75);
    expect(completionRate(1, 3)).toBe(33);
  });

  it('guards zero and clamps', () => {
    expect(completionRate(0, 0)).toBe(0);
    expect(completionRate(9, 4)).toBe(100);
  });
});

describe('classifyRisk', () => {
  it('flags completed work', () => {
    expect(classifyRisk({ progressPct: 100, daysSinceActive: 30, completed: true })).toBe('COMPLETED');
  });

  it('flags low progress as at risk regardless of activity', () => {
    expect(classifyRisk({ progressPct: 10, daysSinceActive: 0 })).toBe('AT_RISK');
  });

  it('flags inactivity as at risk when far from done', () => {
    expect(classifyRisk({ progressPct: 80, daysSinceActive: 20 })).toBe('AT_RISK');
  });

  it('watches moderate progress', () => {
    expect(classifyRisk({ progressPct: 45, daysSinceActive: 1 })).toBe('WATCH');
  });

  it('marks healthy progress on track', () => {
    expect(classifyRisk({ progressPct: 90, daysSinceActive: 2 })).toBe('ON_TRACK');
  });

  it('respects custom thresholds', () => {
    const t = { ...DEFAULT_RISK_THRESHOLDS, atRiskProgress: 50 };
    expect(classifyRisk({ progressPct: 40, daysSinceActive: 1 }, t)).toBe('AT_RISK');
  });
});

describe('progressDistribution', () => {
  it('counts each fixed bucket', () => {
    const out = progressDistribution([0, 10, 30, 60, 90, 100, 100]);
    const counts = Object.fromEntries(out.map((b) => [b.label, b.count]));
    expect(counts).toEqual({ '0-24': 2, '25-49': 1, '50-74': 1, '75-99': 1, '100': 2 });
  });

  it('returns all buckets even when empty', () => {
    expect(progressDistribution([])).toHaveLength(5);
  });
});
