import type { GetServerSideProps } from 'next';

/**
 * The old study plan was retired (PROFESSIONAL_PLATFORM_PLAN §9): company
 * prep now lives in the Train · Test · Track plan on Today. This route stays
 * only so links already out there — feed posts, emails, bookmarks — land
 * somewhere useful instead of a 404.
 */
export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: { destination: '/', permanent: false },
});

export default function StudyPlanRetired() {
  return null;
}
