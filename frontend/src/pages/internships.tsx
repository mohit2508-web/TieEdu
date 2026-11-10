import React from 'react';
import Head from 'next/head';
import { Footer } from '@/components/layout/Footer';
import { InternshipsBoard } from '@/components/festival/InternshipsBoard';
import { MembershipClaim } from '@/components/festival/MembershipClaim';
import { useFestival } from '@/lib/festival';

export default function InternshipsPage() {
  const f = useFestival();
  return (
    <>
      <Head>
        <title>Internships | TiEEdu</title>
        <meta name="description" content="Internship opportunities for TiEEdu members — real listings, apply in one tap." />
      </Head>
      <main className="mx-auto max-w-6xl px-5 py-12">
        <h1 className="font-display text-4xl font-black text-heading">Internships</h1>
        <p className="mt-2 text-body">Real internship listings for TiEEdu members. Members apply in one tap.</p>
        {f.active && !f.membership && (
          <div id="membership" className="mt-6 max-w-md scroll-mt-32"><MembershipClaim compact /></div>
        )}
        <div className="mt-8"><InternshipsBoard /></div>
      </main>
      <Footer />
    </>
  );
}
