import { describe, expect, it } from 'vitest';
import {
  isPublishable,
  matchesFilters,
  parseCatalogQuery,
  slugify,
  validateForPublish,
  type FilterableCourse,
} from './catalog';

describe('slugify', () => {
  it('creates url-safe slugs', () => {
    expect(slugify('AI & Machine Learning!')).toBe('ai-machine-learning');
    expect(slugify('  Robotics — Level 1  ')).toBe('robotics-level-1');
  });

  it('strips accents and collapses separators', () => {
    expect(slugify('Café   Codé')).toBe('cafe-code');
  });

  it('returns empty for symbol-only input', () => {
    expect(slugify('!!!')).toBe('');
  });
});

describe('parseCatalogQuery', () => {
  it('applies defaults and clamps paging', () => {
    const q = parseCatalogQuery(new URLSearchParams());
    expect(q).toMatchObject({ page: 1, pageSize: 12, sort: 'newest' });
    expect(q.track).toBeUndefined();
    expect(q.level).toBeUndefined();
  });

  it('normalises track and level, rejects unknown level', () => {
    expect(parseCatalogQuery(new URLSearchParams('track=AI%20%26%20ML')).track).toBe('ai-ml');
    expect(parseCatalogQuery(new URLSearchParams('level=advanced')).level).toBe('ADVANCED');
    expect(parseCatalogQuery(new URLSearchParams('level=wizard')).level).toBeUndefined();
  });

  it('clamps grade to 3..12 and caps pageSize', () => {
    expect(parseCatalogQuery(new URLSearchParams('grade=99')).grade).toBeUndefined();
    expect(parseCatalogQuery(new URLSearchParams('grade=7')).grade).toBe(7);
    expect(parseCatalogQuery(new URLSearchParams('pageSize=9999')).pageSize).toBe(48);
    expect(parseCatalogQuery(new URLSearchParams('page=-4')).page).toBe(1);
  });

  it('truncates the search term', () => {
    const q = parseCatalogQuery(new URLSearchParams('q=' + 'a'.repeat(200)));
    expect(q.q).toHaveLength(80);
  });
});

const course = (over: Partial<FilterableCourse> = {}): FilterableCourse => ({
  title: 'Intro to Python',
  summary: 'Learn to code',
  tags: ['python', 'basics'],
  skillTrack: { slug: 'coding' },
  level: 'BEGINNER',
  gradeMin: 6,
  gradeMax: 8,
  ...over,
});

describe('matchesFilters', () => {
  const q = (s: string) => parseCatalogQuery(new URLSearchParams(s));

  it('matches by track, level and grade band', () => {
    expect(matchesFilters(course(), q('track=coding&level=BEGINNER&grade=7'))).toBe(true);
    expect(matchesFilters(course(), q('track=robotics'))).toBe(false);
    expect(matchesFilters(course(), q('level=ADVANCED'))).toBe(false);
    expect(matchesFilters(course(), q('grade=9'))).toBe(false);
  });

  it('searches title, summary and tags case-insensitively', () => {
    expect(matchesFilters(course(), q('q=PYTHON'))).toBe(true);
    expect(matchesFilters(course(), q('q=code'))).toBe(true);
    expect(matchesFilters(course(), q('q=java'))).toBe(false);
  });
});

describe('publish gate', () => {
  const ready = {
    title: 'Robotics 101',
    skillTrackId: 'track-1',
    gradeMin: 6,
    gradeMax: 8,
    modules: [{ lessons: [{ title: 'What is a robot?' }] }],
  };

  it('passes a complete course', () => {
    expect(validateForPublish(ready)).toEqual([]);
    expect(isPublishable(ready)).toBe(true);
  });

  it('rejects an empty course with all problems', () => {
    const problems = validateForPublish({
      title: '   ',
      skillTrackId: null,
      gradeMin: 12,
      gradeMax: 3,
      modules: [],
    });
    expect(problems).toContain('no_title');
    expect(problems).toContain('no_track');
    expect(problems).toContain('invalid_grade_range');
    expect(problems).toContain('no_modules');
  });

  it('rejects modules/lessons that are empty', () => {
    expect(validateForPublish({ ...ready, modules: [{ lessons: [] }] })).toContain(
      'module_without_lessons'
    );
    expect(
      validateForPublish({ ...ready, modules: [{ lessons: [{ title: '  ' }] }] })
    ).toContain('lesson_without_title');
  });
});
