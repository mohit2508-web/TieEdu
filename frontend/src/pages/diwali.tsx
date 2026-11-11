import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { BookOpen, Building2, Crown } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { DiwaliHero } from '@/components/festival/DiwaliHero';
import { MembershipClaim, MEMBER_PERKS } from '@/components/festival/MembershipClaim';
import { InternshipsBoard } from '@/components/festival/InternshipsBoard';
import { Diya } from '@/components/festival/Ornaments';
import { useFestival } from '@/lib/festival';
import { COMPLETE_PACK_PRICE, regularPackPrice, packPrice } from '@/lib/packPricing';

const FAQ = [
  ['When does the offer end?', 'The Diwali Sale runs until 10 November 2026, 11:59 PM IST. After that, prices return to normal automatically.'],
  ['What is 50% OFF on?', 'Every paid course and every company prep pack. Free courses stay free. You pay exactly the price you see at checkout.'],
  ['Can I use a coupon too?', 'Coupons cannot be added on top of the sale price. If your coupon is bigger than 50%, checkout uses the cheaper coupon price instead of the sale.'],
  ['What does the free membership include?', `${MEMBER_PERKS.join(', ')}. It lasts 3 months from the day you claim it, even after the sale ends.`],
  ['Refunds?', 'Our standard refund policy applies — see the refund policy page.'],
] as const;

export default function DiwaliPage() {
  const f = useFestival();

  return (
    <>
      <Head>
        <title>Diwali Sale — 50% OFF + Free Membership | TiEEdu</title>
        <meta name="description" content="TiEEdu Diwali Sale: 50% off every course and company prep pack, a free 3-month TiEEdu membership and internship opportunities. Till 10 Nov 2026." />
        <meta property="og:title" content="TiEEdu Diwali Sale — 50% OFF + Free Membership" />
        <meta property="og:description" content="50% OFF every course and company pack, a free membership and internships. Until 10 Nov." />
        <meta property="og:url" content="https://tieedu.in/diwali" />
      </Head>

      <main className="bg-app">
        {f.active ? (
          <DiwaliHero />
        ) : (
          <section className="mx-auto max-w-2xl px-5 py-20 text-center">
            <Diya size={64} lit={false} />
            <h1 className="mt-4 font-display text-3xl font-extrabold text-heading">The Diwali Sale has ended</h1>
            <p className="mt-2 text-body">The sale ended on 10 Nov 2026. Memberships claimed during the sale are still active.</p>
            <Link href="/courses" className="mt-6 inline-block rounded-xl bg-signal px-5 py-3 font-extrabold text-on-primary">Browse courses</Link>
          </section>
        )}

        {f.active && (
          <div className="mx-auto max-w-6xl space-y-16 px-5 py-14">
            {/* The three offers */}
            <section aria-labelledby="offers-h">
              <h2 id="offers-h" className="font-display text-3xl font-extrabold text-heading">Three Diwali gifts 🎁</h2>
              <div className="mt-6 grid gap-5 md:grid-cols-3">
                <div className="offer-card" style={{ background: 'linear-gradient(135deg,#D6246E,#7A1530)' }}>
                  <BookOpen className="text-[#FFD966]" aria-hidden />
                  <p className="mt-2 font-display text-2xl font-extrabold">{f.discount_percent}% OFF courses</p>
                  <p className="mt-1 text-sm text-white/85">Every paid course — AI, coding, aptitude, interview prep.</p>
                  <Link href="/courses" className="mt-4 inline-block font-extrabold text-[#FFD966] underline">Browse courses →</Link>
                </div>
                <div className="offer-card" style={{ background: 'linear-gradient(135deg,#B8860B,#6B3E00)' }}>
                  <Building2 className="text-[#FFF3B0]" aria-hidden />
                  <p className="mt-2 font-display text-2xl font-extrabold">Company packs {f.discount_percent}% OFF</p>
                  <p className="mt-1 text-sm text-white/90">
                    Complete pack <s className="opacity-70">₹{COMPLETE_PACK_PRICE}</s> <b>₹{packPrice(4)}</b> · single round <s className="opacity-70">₹{regularPackPrice(1)}</s> <b>₹{packPrice(1)}</b>
                  </p>
                  <Link href="/companies" className="mt-4 inline-block font-extrabold text-[#FFF3B0] underline">Browse companies →</Link>
                </div>
                <div className="offer-card" style={{ background: 'linear-gradient(135deg,#0F6B5C,#063B33)' }}>
                  <Crown className="text-[#FFD966]" aria-hidden />
                  <p className="mt-2 font-display text-2xl font-extrabold">FREE Membership</p>
                  <p className="mt-1 text-sm text-white/85">3 months — extra mocks, every prep lesson, internships.</p>
                  <a href="#membership" className="mt-4 inline-block font-extrabold text-[#FFD966] underline">Claim now →</a>
                </div>
              </div>
            </section>

            <section id="membership" aria-labelledby="member-h" className="scroll-mt-32">
              <h2 id="member-h" className="font-display text-3xl font-extrabold text-heading">Free TiEEdu Membership</h2>
              <p className="mt-1 text-body">Claim in one tap — no card, no auto-debit.</p>
              <div className="mt-6 max-w-md"><MembershipClaim /></div>
            </section>

            <section id="internships" aria-labelledby="intern-h" className="scroll-mt-32">
              <h2 id="intern-h" className="font-display text-3xl font-extrabold text-heading">Internship opportunities</h2>
              <p className="mt-1 text-body">Members apply in one tap. Every listing is real and verified by our team.</p>
              <div className="mt-6"><InternshipsBoard /></div>
            </section>

            <section aria-labelledby="faq-h">
              <h2 id="faq-h" className="font-display text-3xl font-extrabold text-heading">FAQs</h2>
              <div className="mt-4 divide-y divide-[var(--border-subtle)] rounded-2xl border border-line bg-card">
                {FAQ.map(([q, a]) => (
                  <details key={q} className="group p-5">
                    <summary className="cursor-pointer list-none font-bold text-heading">{q}</summary>
                    <p className="mt-2 text-sm text-body">
                      {a}{q === 'Refunds?' && <> <Link href="/refund-policy" className="text-link underline">Refund policy</Link></>}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
