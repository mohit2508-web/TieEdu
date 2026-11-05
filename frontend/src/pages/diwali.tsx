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
  ['Offer kab tak hai?', 'Diwali Utsav 10 November 2026, raat 11:59 PM (IST) tak hai. Uske baad prices apne aap normal ho jaate hain.'],
  ['50% OFF kis par hai?', 'Har paid course aur har company prep pack par. Free courses free hi rehte hain. Checkout par wahi price lagta hai jo aapko dikh raha hai.'],
  ['Kya coupon bhi saath mein lagega?', 'Nahi — sale price aur coupon ek saath nahi lagte. Agar aapka coupon 50% se bada hai, toh checkout sale ki jagah coupon wala sasta price laga deta hai.'],
  ['Free membership mein kya milta hai?', `${MEMBER_PERKS.join(', ')}. Membership claim karne ke din se 3 mahine chalti hai, sale khatam hone ke baad bhi.`],
  ['Refund?', 'Hamari normal refund policy hi lagti hai — refund policy page dekhiye.'],
] as const;

export default function DiwaliPage() {
  const f = useFestival();

  return (
    <>
      <Head>
        <title>Diwali Utsav — 50% OFF + Free Membership | TieEdu</title>
        <meta name="description" content="TieEdu Diwali Utsav: 50% off every course and company prep pack, a free 3-month TieEdu membership and internship opportunities. Till 10 Nov 2026." />
        <meta property="og:title" content="TieEdu Diwali Utsav — 50% OFF + Free Membership" />
        <meta property="og:description" content="Har course aur company pack par 50% OFF, free membership aur internships. 10 Nov tak." />
        <meta property="og:url" content="https://tieedu.in/diwali" />
      </Head>

      <main className="bg-app">
        {f.active ? (
          <DiwaliHero />
        ) : (
          <section className="mx-auto max-w-2xl px-5 py-20 text-center">
            <Diya size={64} lit={false} />
            <h1 className="mt-4 font-display text-3xl font-black text-heading">Diwali Utsav khatam ho gaya</h1>
            <p className="mt-2 text-body">Sale 10 Nov 2026 ko khatam hui. Jinhone membership claim ki thi, unki membership chal rahi hai.</p>
            <Link href="/courses" className="mt-6 inline-block rounded-xl bg-signal px-5 py-3 font-extrabold text-on-primary">Courses dekho</Link>
          </section>
        )}

        {f.active && (
          <div className="mx-auto max-w-6xl space-y-16 px-5 py-14">
            {/* The three offers */}
            <section aria-labelledby="offers-h">
              <h2 id="offers-h" className="font-display text-3xl font-black text-heading">Teen Diwali gifts 🎁</h2>
              <div className="mt-6 grid gap-5 md:grid-cols-3">
                <div className="offer-card" style={{ background: 'linear-gradient(135deg,#D6246E,#7A1530)' }}>
                  <BookOpen className="text-[#FFD966]" aria-hidden />
                  <p className="mt-2 font-display text-2xl font-black">{f.discount_percent}% OFF courses</p>
                  <p className="mt-1 text-sm text-white/85">Har paid course — AI, coding, aptitude, interview prep.</p>
                  <Link href="/courses" className="mt-4 inline-block font-extrabold text-[#FFD966] underline">Courses dekho →</Link>
                </div>
                <div className="offer-card" style={{ background: 'linear-gradient(135deg,#B8860B,#6B3E00)' }}>
                  <Building2 className="text-[#FFF3B0]" aria-hidden />
                  <p className="mt-2 font-display text-2xl font-black">Company packs {f.discount_percent}% OFF</p>
                  <p className="mt-1 text-sm text-white/90">
                    Complete pack <s className="opacity-70">₹{COMPLETE_PACK_PRICE}</s> <b>₹{packPrice(4)}</b> · single round <s className="opacity-70">₹{regularPackPrice(1)}</s> <b>₹{packPrice(1)}</b>
                  </p>
                  <Link href="/companies" className="mt-4 inline-block font-extrabold text-[#FFF3B0] underline">Companies dekho →</Link>
                </div>
                <div className="offer-card" style={{ background: 'linear-gradient(135deg,#3B2A8C,#1B1446)' }}>
                  <Crown className="text-[#FFD966]" aria-hidden />
                  <p className="mt-2 font-display text-2xl font-black">FREE Membership</p>
                  <p className="mt-1 text-sm text-white/85">3 mahine — extra mocks, saare prep lessons, internships.</p>
                  <a href="#membership" className="mt-4 inline-block font-extrabold text-[#FFD966] underline">Claim karo →</a>
                </div>
              </div>
            </section>

            <section id="membership" aria-labelledby="member-h" className="scroll-mt-32">
              <h2 id="member-h" className="font-display text-3xl font-black text-heading">Free TieEdu Membership</h2>
              <p className="mt-1 text-body">Ek tap mein claim karo — koi card nahi, koi auto-debit nahi.</p>
              <div className="mt-6 max-w-md"><MembershipClaim /></div>
            </section>

            <section id="internships" aria-labelledby="intern-h" className="scroll-mt-32">
              <h2 id="intern-h" className="font-display text-3xl font-black text-heading">Internship opportunities</h2>
              <p className="mt-1 text-body">Members ek tap mein apply karte hain. Har listing asli hai aur admin ne verify ki hai.</p>
              <div className="mt-6"><InternshipsBoard /></div>
            </section>

            <section aria-labelledby="faq-h">
              <h2 id="faq-h" className="font-display text-3xl font-black text-heading">Sawaal-jawaab</h2>
              <div className="mt-4 divide-y divide-[var(--border-subtle)] rounded-2xl border border-line bg-card">
                {FAQ.map(([q, a]) => (
                  <details key={q} className="group p-5">
                    <summary className="cursor-pointer list-none font-bold text-heading">{q}</summary>
                    <p className="mt-2 text-sm text-body">
                      {a}{q === 'Refund?' && <> <Link href="/refund-policy" className="text-link underline">Refund policy</Link></>}
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
