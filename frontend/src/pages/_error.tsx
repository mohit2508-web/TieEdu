import React, { useEffect, useState } from 'react';
import type { NextPageContext } from 'next';
import Head from 'next/head';
import { ErrorScreen } from '@/components/common/ErrorScreen';
import NotFoundPage from './404';
import { newErrorRef, reportClientError } from '@/lib/clientErrors';

/** Any other error status (PRACTICE_POLISH_PLAN.md §3.1): 404 gets the not-found page, the rest the error screen. */
function ErrorPage({ statusCode }: { statusCode?: number }) {
  const [ref, setRef] = useState<string>();
  useEffect(() => {
    if (statusCode === 404) return;
    const r = newErrorRef();
    reportClientError(new Error(`Error page shown (${statusCode ?? 'client'})`), 'page-error', r);
    setRef(r);
  }, [statusCode]);
  if (statusCode === 404) return <NotFoundPage />;
  return (
    <>
      <Head><title>Something went wrong · TiEEdu</title><meta name="robots" content="noindex" /></Head>
      <ErrorScreen errorRef={ref} />
    </>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => ({ statusCode: res ? res.statusCode : err ? err.statusCode : 404 });

export default ErrorPage;
