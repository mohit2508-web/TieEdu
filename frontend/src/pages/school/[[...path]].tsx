import React, { useEffect } from 'react';
import { SchoolProvider, useSchool } from '@/context/SchoolContext';
import { SchoolShell } from '@/components/school/SchoolShell';
import { SchoolTabBar } from '@/components/school/SchoolTabBar';
import HomeScreen from '@/components/school/screens/HomeScreen';
import CoursesScreen from '@/components/school/screens/CoursesScreen';
import NoticesScreen from '@/components/school/screens/NoticesScreen';
import ProgressScreen from '@/components/school/screens/ProgressScreen';
import LoginScreen from '@/components/school/screens/LoginScreen';
import ProfileScreen from '@/components/school/screens/ProfileScreen';
import CourseDetailScreen from '@/components/school/screens/CourseDetailScreen';
import { useRouter } from 'next/router';
import '@/styles/school/school.module.css';

/**
 * Auth gate for the school PWA. Without it, a signed-out visit to `/school`
 * rendered the empty Home shell ("Hi there", XP 0, no programmes) because the
 * screens read `SchoolContext` before it had a session, and nothing redirected.
 * While the boot call is in flight we show a loader; once it fails (or returns
 * no school) we replace the route with the login screen.
 */
const SchoolGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const { loading, school } = useSchool();

  useEffect(() => {
    if (!loading && !school) router.replace('/school/login');
  }, [loading, school, router]);

  if (loading || !school) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: 14,
        }}
      >
        Loading…
      </div>
    );
  }

  return <>{children}</>;
};

const SchoolApp: React.FC = () => {
  const router = useRouter();
  const path = router.asPath;

  let Screen: React.FC | null = null;
  if (path.startsWith('/school/courses/') && path !== '/school/courses') {
    Screen = CourseDetailScreen;
  } else if (path.startsWith('/school/courses')) {
    Screen = CoursesScreen;
  } else if (path.startsWith('/school/notices')) {
    Screen = NoticesScreen;
  } else if (path.startsWith('/school/progress')) {
    Screen = ProgressScreen;
  } else if (path.startsWith('/school/profile')) {
    Screen = ProfileScreen;
  } else if (path.startsWith('/school/login')) {
    Screen = LoginScreen;
  } else {
    Screen = HomeScreen;
  }

  if (path.startsWith('/school/login')) {
    return <LoginScreen />;
  }

  return (
    <SchoolProvider>
      <SchoolGate>
        <SchoolShell>
          <Screen />
        </SchoolShell>
        <SchoolTabBar />
      </SchoolGate>
    </SchoolProvider>
  );
};

export default SchoolApp;