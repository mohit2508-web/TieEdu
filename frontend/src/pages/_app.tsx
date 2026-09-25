import type { AppProps } from 'next/app';
import '@/styles/globals.css';
import { TieEduLoader } from '@/components/common/TieEduLoader';
import { AuthProvider } from '@/context/AuthContext';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <TieEduLoader />
      <Component {...pageProps} />
    </AuthProvider>
  );
}