import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { ErrorScreen } from '@/components/common/ErrorScreen';
import { newErrorRef, reportClientError } from '@/lib/clientErrors';

/** Server error page (PRACTICE_POLISH_PLAN.md §3.1). Static, so it renders even when the server is struggling. */
export default function ServerErrorPage() {
  const [ref, setRef] = useState<string>();
  useEffect(() => {
    const r = newErrorRef();
    reportClientError(new Error('Server error page shown'), 'page-500', r);
    setRef(r);
  }, []);
  return (
    <>
      <Head><title>Something went wrong · TiEEdu</title><meta name="robots" content="noindex" /></Head>
      <ErrorScreen errorRef={ref} />
    </>
  );
}
