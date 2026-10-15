import type { LearningTrack } from './db';

/**
 * The seeded learning tracks.
 *
 * Each track is a curated, ordered path through courses that already exist in
 * the seed catalogue — the membership list is the recommendation ("take these
 * in this order"), and the Career Track certificate unlocks only when every
 * member course is genuinely complete.
 *
 * Tracks are kept to courses that exist today rather than the full wishlist in
 * the expansion plan: a track that references a course nobody has written yet
 * would be unclaimable forever. Missing members (Full-Stack, System Design,
 * ML/DL, Microprocessors, Embedded, Strength, Communication, GD/HR) get added
 * to the relevant track when those courses ship.
 */
export function getSeedTracks(): LearningTrack[] {
  return [
    {
      id: 'trk-placement-ready-cse',
      slug: 'placement-ready-cse',
      title: 'Placement-Ready CSE',
      tagline: 'From your first program to interview-ready DSA — the core CS placement path',
      description: `The four courses that decide most CSE placement outcomes, in the order that builds on itself: programming fundamentals in C, then the data structures companies actually ask about, then the advanced structures and algorithms round that filters most candidates.

Finish the path and you earn the Career Track certificate — one signed, verifiable credential that says you completed the whole path, not just one course along the way.`,
      branch: 'cse',
      course_ids: [
        'crs-coding-foundations',
        'crs-c-programming',
        'crs-advanced-data-structures',
        'crs-dsa-mastery',
      ],
      published: true,
      created_at: '2026-10-15T09:00:00.000Z',
      updated_at: '2026-10-15T09:00:00.000Z',
    },
    {
      id: 'trk-cs-core',
      slug: 'cs-core',
      title: 'CS Core',
      tagline: 'Operating systems, networks and databases — the theory trio every CS interview touches',
      description: `The three core CS subjects that show up in almost every technical interview and every GATE prep list: how an OS schedules and isolates work, how machines actually talk to each other, and how data is stored and queried.

All three are free. Take them after the Placement-Ready CSE programming courses, or alongside them in your semester.`,
      branch: 'cse',
      course_ids: ['crs-operating-systems', 'crs-computer-networks', 'crs-dbms'],
      published: true,
      created_at: '2026-10-15T09:00:00.000Z',
      updated_at: '2026-10-15T09:00:00.000Z',
    },
    {
      id: 'trk-web-foundations',
      slug: 'web-foundations',
      title: 'Web Foundations',
      tagline: 'Build real web apps and back them with a database you can query',
      description: `Two free courses that take you from zero to a deployed full-stack shape: the front-end and back-end of a real web app, then the SQL that stores everything behind it.

A common first portfolio path — finish both and you have something deployed to show plus the database skills to talk about it.`,
      branch: 'career',
      course_ids: ['crs-web-dev-bootcamp', 'crs-sql-databases'],
      published: true,
      created_at: '2026-10-15T09:00:00.000Z',
      updated_at: '2026-10-15T09:00:00.000Z',
    },
    {
      id: 'trk-core-ece',
      slug: 'core-ece',
      title: 'Core ECE',
      tagline: 'Digital electronics into signals and systems — the ECE interview spine',
      description: `The two free ECE core courses that carry the most interview and semester weight: digital logic from gates to sequential circuits, then the signals-and-systems math (convolution, Fourier, Laplace) that everything advanced is built on.`,
      branch: 'ece',
      course_ids: ['crs-digital-electronics', 'crs-signals-systems'],
      published: true,
      created_at: '2026-10-15T09:00:00.000Z',
      updated_at: '2026-10-15T09:00:00.000Z',
    },
    {
      id: 'trk-placement-pack',
      slug: 'placement-pack',
      title: 'Placement Pack',
      tagline: 'Aptitude plus a resume that survives the skim — the non-CS half of placement prep',
      description: `Placement is not only coding rounds. This path pairs the aptitude and reasoning sections that filter candidates early with the resume and LinkedIn rebuild that decides whether you get called at all.

Both courses are free and take a weekend together — the fastest path to a verifiable certificate on the platform.`,
      branch: 'career',
      course_ids: ['crs-aptitude-reasoning', 'crs-resume-linkedin'],
      published: true,
      created_at: '2026-10-15T09:00:00.000Z',
      updated_at: '2026-10-15T09:00:00.000Z',
    },
  ];
}
