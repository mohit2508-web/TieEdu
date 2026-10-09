import React from 'react';
import { SchoolProvider } from '@/context/SchoolContext';
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
      <SchoolShell>
        <Screen />
      </SchoolShell>
      <SchoolTabBar />
    </SchoolProvider>
  );
};

export default SchoolApp;