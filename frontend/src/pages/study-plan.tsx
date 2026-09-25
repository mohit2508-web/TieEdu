import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { fetchCompanies, generateStudyPlanApi } from '@/lib/api';
import { ArrowLeft, Calendar, CheckCircle2, Sparkles, FlaskConical } from 'lucide-react';

interface RoadmapItem {
  day: string;
  focus: string;
  detail: string;
}

export default function StudyPlanPage() {
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [targetCompany, setTargetCompany] = useState('');
  const [targetRole, setTargetRole] = useState('SDE');
  const [daysRemaining, setDaysRemaining] = useState(14);
  const [generated, setGenerated] = useState(false);
  const [scheduleDays, setScheduleDays] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCompanies()
      .then((list) => {
        const comps = (list || []).map((c) => ({ id: c.id, name: c.name }));
        setCompanies(comps);
        if (comps.length > 0) setTargetCompany(comps[0].name);
      })
      .catch(() => {});
  }, []);

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await generateStudyPlanApi({
        targetCompany: targetCompany || 'Target Company',
        targetRole,
        daysRemaining: daysRemaining || 14,
      });
      setScheduleDays(res?.roadmap || []);
      setGenerated(true);
    } catch (e: any) {
      setError(e?.message || 'Could not generate a study plan right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Personalized Interview Study Plan | TieEdu</title>
        <meta name="description" content="Generate a day-by-day prep plan based on your target company, role, and interview timeline." />
      </Head>

      <div className="min-h-screen flex flex-col bg-[#FAFAF9]">
        <Header cartCount={0} onOpenCart={() => {}} onOpenSearch={() => {}} onOpenLeaderboard={() => {}} />

        <main className="flex-1 w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12 py-8">

          <Link href="/" className="inline-flex items-center gap-1 text-xs text-[#8A8A8A] hover:text-[#1A1A1A] mb-6">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Directory
          </Link>

          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-[#1F3A5F] border border-indigo-100 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#E8A33D]" />
              Prep Plan Generator
            </div>
            <h1 className="font-serif-heading text-2xl sm:text-3xl font-bold text-[#1A1A1A]">
              Personalized Candidate Study Plan
            </h1>
            <p className="text-xs text-[#8A8A8A]">Generates a day-by-day roadmap tailored to your target company and interview date.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Form Inputs Card */}
            <div className="bg-white border border-[#EDEDEB] p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="font-serif-heading font-bold text-sm text-[#1A1A1A]">Configure Target</h3>

              <div>
                <label className="block text-[11px] font-semibold text-[#1A1A1A] mb-1">Target Company</label>
                <select
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-xs font-semibold text-[#1A1A1A] bg-[#FAFAF9]"
                >
                  {companies.length === 0 && <option value="">No companies available yet</option>}
                  {companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#1A1A1A] mb-1">Target Role</label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-xs text-[#1A1A1A] bg-[#FAFAF9]"
                >
                  <option value="SDE">SDE</option>
                  <option value="Backend SDE-2">Backend SDE-2</option>
                  <option value="DevOps & Systems">DevOps & Systems</option>
                  <option value="Product Analyst">Product Analyst</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#1A1A1A] mb-1">Days Until Interview</label>
                <input
                  type="number"
                  value={daysRemaining}
                  onChange={(e) => setDaysRemaining(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg text-xs text-[#1A1A1A]"
                />
              </div>

              <button
                onClick={generate}
                disabled={loading}
                className="w-full py-2.5 bg-[#1F3A5F] hover:bg-[#2A4D7E] disabled:opacity-60 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
              >
                {loading ? 'Generating…' : 'Generate Study Schedule'}
              </button>

              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>

            {/* Generated Schedule Roadmap */}
            <div className="md:col-span-2 space-y-4">
              <h3 className="font-serif-heading font-bold text-sm text-[#1A1A1A] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#1F3A5F]" />
                {generated ? `${targetCompany} Preparation Roadmap (${daysRemaining} Days Schedule)` : 'Your Roadmap'}
              </h3>

              {!generated ? (
                <div className="bg-white border border-[#EDEDEB] rounded-2xl p-10 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-[#1F3A5F]/5 flex items-center justify-center mb-3">
                    <FlaskConical className="w-5 h-5 text-[#1F3A5F]" />
                  </div>
                  <p className="text-xs text-[#8A8A8A]">
                    Pick your target company and interview date, then hit
                    Generate Study Schedule to build a roadmap.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scheduleDays.map((item, idx) => (
                    <div key={idx} className="bg-white border border-[#EDEDEB] p-4 rounded-xl shadow-sm flex items-start gap-4">
                      <div className="px-3 py-1.5 bg-[#1F3A5F] text-white rounded-lg text-xs font-mono font-bold shrink-0">
                        {item.day}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-[#1A1A1A] mb-1">{item.focus}</h4>
                        <p className="text-xs text-[#4A4A4A] leading-relaxed">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                  <p className="text-[11px] text-[#8A8A8A] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#1E8E5A]" />
                    Sample roadmap generated on the server. Adjust timings to your real interview date.
                  </p>
                </div>
              )}
            </div>

          </div>

        </main>

        <Footer />
      </div>
    </>
  );
}