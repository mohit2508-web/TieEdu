import React, { useEffect, useState } from 'react';
import { Search, ShieldCheck, ShieldOff, RotateCcw, ExternalLink, Copy, Award } from 'lucide-react';
import type { AdminCertificate, AdminCourseListItem } from '@/types';
import {
  fetchAdminCertificates,
  revokeCertificateAsAdmin,
  restoreCertificateAsAdmin,
  issueCertificateAsAdmin,
  fetchAdminCourses,
  fetchAdminCourse,
} from '@/lib/coursesApi';
import { Btn, Panel, ErrorNote, OkNote, Loading, Empty, Pill, TextInput, Field, Select } from './CourseAdminUi';

const fmt = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
};

/**
 * Certificate admin.
 *
 * Certificates are self-verifying: revoking does not destroy the signature, it
 * only flips the stored status, so the public verification page keeps working
 * and correctly reports "revoked" with the reason. That is the point of signing
 * at issue time.
 */
export const AdminCertificatesTab: React.FC = () => {
  const [rows, setRows] = useState<AdminCertificate[]>([]);
  const [counts, setCounts] = useState({ total: 0, active: 0, revoked: 0 });
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'' | 'active' | 'revoked'>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busySerial, setBusySerial] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminCertificates({ q: q || undefined, status: status || undefined });
      setRows(data.certificates || []);
      setCounts(data.counts || { total: 0, active: 0, revoked: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load certificates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status]);

  const revoke = async (c: AdminCertificate) => {
    const reason = window.prompt(
      `Revoke ${c.serial}?\n\nThis shows on the public verification page. Give a reason:`,
      'Issued in error'
    );
    if (reason === null) return;
    setBusySerial(c.serial);
    setError(null);
    try {
      await revokeCertificateAsAdmin(c.serial, reason.trim() || 'Revoked by admin');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not revoke the certificate');
    } finally {
      setBusySerial(null);
    }
  };

  const restore = async (c: AdminCertificate) => {
    if (!window.confirm(`Restore ${c.serial}? It will verify as genuine again.`)) return;
    setBusySerial(c.serial);
    setError(null);
    try {
      await restoreCertificateAsAdmin(c.serial);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not restore the certificate');
    } finally {
      setBusySerial(null);
    }
  };

  const copy = async (serial: string) => {
    try {
      await navigator.clipboard.writeText(serial);
      setCopied(serial);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      setError('Clipboard is not available in this browser.');
    }
  };

  // ---- manual issue -------------------------------------------------------
  // A learner normally claims their own certificate from /my-courses. This is
  // the admin path for the cases that never self-serve: a completion that
  // happened before the course was published, or a claim that failed for a
  // learner who has since finished. It deliberately offers only learners the
  // server would accept, and the server still re-checks completion itself.
  const [courses, setCourses] = useState<AdminCourseListItem[]>([]);
  const [courseId, setCourseId] = useState('');
  const [learners, setLearners] = useState<Awaited<ReturnType<typeof fetchAdminCourse>>['enrollments']>([]);
  const [learnersLoading, setLearnersLoading] = useState(false);
  const [issuing, setIssuing] = useState<string | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ serial: string; name: string } | null>(null);

  useEffect(() => {
    let live = true;
    fetchAdminCourses()
      .then((d) => {
        if (!live) return;
        const all = d.courses || [];
        setCourses(all);
        // Default to the first course that can actually award a certificate.
        const eligible = all.find((c) => c.certificate_eligible) || all[0];
        if (eligible) setCourseId(eligible.id);
      })
      .catch((e) => live && setIssueError(e instanceof Error ? e.message : 'Could not load courses'));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!courseId) {
      setLearners([]);
      return;
    }
    let live = true;
    setLearnersLoading(true);
    setIssueError(null);
    fetchAdminCourse(courseId)
      .then((d) => live && setLearners(d.enrollments || []))
      .catch((e) => live && setIssueError(e instanceof Error ? e.message : 'Could not load learners'))
      .finally(() => live && setLearnersLoading(false));
    return () => {
      live = false;
    };
  }, [courseId]);

  const selectedCourse = courses.find((c) => c.id === courseId);
  const isComplete = (l: { completed_lessons: number; total_lessons: number }) =>
    l.total_lessons > 0 && l.completed_lessons >= l.total_lessons;

  const issue = async (userId: string, name: string) => {
    setIssuing(userId);
    setIssueError(null);
    setIssued(null);
    try {
      const res = await issueCertificateAsAdmin({ user_id: userId, course_id: courseId });
      setIssued({ serial: res.certificate?.serial, name });
      await load();
    } catch (e) {
      setIssueError(e instanceof Error ? e.message : 'Could not issue the certificate');
    } finally {
      setIssuing(null);
    }
  };

  return (
    <div className="space-y-4">
      <Panel
        title="Issue a certificate"
        subtitle="For learners who completed the work but never claimed it themselves."
      >
        {!courses.length ? (
          <Empty>No courses yet. Create a course before issuing certificates.</Empty>
        ) : (
          <div className="space-y-3">
            <Field
              label="Course"
              hint={
                selectedCourse && !selectedCourse.certificate_eligible
                  ? 'This course is marked skill-practice only, so the server will refuse to issue. Turn on certificates in the course editor first.'
                  : undefined
              }
              className="max-w-md"
            >
              <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                    {c.certificate_eligible ? '' : ' — no certificates'}
                  </option>
                ))}
              </Select>
            </Field>

            {issueError && <ErrorNote>{issueError}</ErrorNote>}
            {issued && (
              <OkNote>
                Issued to {issued.name} — serial <span className="font-mono">{issued.serial}</span>. It is live on the
                public verification page now.
              </OkNote>
            )}

            {learnersLoading ? (
              <Loading label="Loading learners" />
            ) : learners.length === 0 ? (
              <Empty>Nobody has enrolled in this course yet.</Empty>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] border-b border-[#EDEDEB]">
                      <th className="py-2 pr-3">Learner</th>
                      <th className="py-2 pr-3">Progress</th>
                      <th className="py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3F2EE]">
                    {learners.map((l) => {
                      const eligible = isComplete(l);
                      return (
                        <tr key={l.user_id} className="align-top">
                          <td className="py-2.5 pr-3">
                            <div className="font-bold text-[#10151C]">{l.name}</div>
                            <div className="text-[11px] text-[#6B7280]">{l.email}</div>
                          </td>
                          <td className="py-2.5 pr-3">
                            <div className="text-[--text-body]">
                              {l.completed_lessons}/{l.total_lessons} lessons
                            </div>
                            <div className="mt-0.5">
                              {eligible ? (
                                <Pill tone="green">Complete</Pill>
                              ) : (
                                <Pill tone="gray">In progress</Pill>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 text-right">
                            <Btn
                              variant="primary"
                              disabled={!eligible}
                              busy={issuing === l.user_id}
                              title={
                                eligible
                                  ? 'Issue a signed certificate to this learner'
                                  : 'The server only issues to learners who have completed every lesson'
                              }
                              onClick={() => issue(l.user_id, l.name)}
                            >
                              <Award className="w-3.5 h-3.5" /> Issue
                            </Btn>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Panel>

      <Panel
        title="Certificates"
        subtitle={`${counts.total} issued · ${counts.active} active · ${counts.revoked} revoked`}
      >
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <TextInput
              value={q}
              placeholder="Search serial, name or course"
              onChange={(e) => setQ(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex gap-1.5">
            {(['', 'active', 'revoked'] as const).map((s) => (
              <Btn key={s || 'all'} onClick={() => setStatus(s)} variant={status === s ? 'primary' : 'ghost'}>
                {s || 'All'}
              </Btn>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-3">
            <ErrorNote>{error}</ErrorNote>
          </div>
        )}

        {loading ? (
          <Loading label="Loading certificates" />
        ) : rows.length === 0 ? (
          <Empty>No certificates match. They appear here the moment a learner completes an eligible course.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] border-b border-[#EDEDEB]">
                  <th className="py-2 pr-3">Serial</th>
                  <th className="py-2 pr-3">Recipient</th>
                  <th className="py-2 pr-3">Course</th>
                  <th className="py-2 pr-3">Issued</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F2EE]">
                {rows.map((c) => (
                  <tr key={c.serial} className="align-top">
                    <td className="py-2.5 pr-3">
                      <button
                        onClick={() => copy(c.serial)}
                        title="Copy serial"
                        className="font-mono text-[11.5px] text-[#0284C7] hover:underline flex items-center gap-1"
                      >
                        {copied === c.serial ? 'Copied' : c.serial}
                        <Copy className="w-3 h-3" />
                      </button>
                      <div className="text-[10px] text-[#9CA3AF] font-mono mt-0.5" title={c.signature}>
                        sig {c.signature_prefix}…
                      </div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="font-bold text-[#10151C]">{c.recipient_name}</div>
                      <div className="text-[11px] text-[#6B7280]">{c.recipient_email}</div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="text-[--text-body]">{c.course_title}</div>
                      {!c.course_still_exists && (
                        <div className="text-[10px] text-amber-700 font-bold uppercase tracking-wider mt-0.5">
                          course deleted
                        </div>
                      )}
                      <div className="text-[11px] text-[#6B7280]">
                        {c.lessons_completed}/{c.lessons_required} lessons · {c.xp_at_issue} XP
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-[11.5px] text-[#6B7280] whitespace-nowrap">{fmt(c.issued_at)}</td>
                    <td className="py-2.5 pr-3">
                      {c.cert_status === 'revoked' ? (
                        <>
                          <Pill tone="red">Revoked</Pill>
                          {c.revoked_reason && (
                            <div className="text-[11px] text-red-700 mt-1 max-w-[200px]">{c.revoked_reason}</div>
                          )}
                          <div className="text-[10px] text-[#9CA3AF] mt-0.5">{fmt(c.revoked_at)}</div>
                        </>
                      ) : (
                        <Pill tone="green">Active</Pill>
                      )}
                    </td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex gap-1.5">
                        <a
                          href={`/verify/${encodeURIComponent(c.serial)}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Open the public verification page"
                          className="inline-flex items-center px-2.5 py-1.5 rounded-lg border border-gray-300 text-[11px] font-bold uppercase tracking-wider text-[#3E4754] hover:bg-[#F3F2EE]"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        {c.cert_status === 'revoked' ? (
                          <Btn onClick={() => restore(c)} busy={busySerial === c.serial}>
                            <RotateCcw className="w-3.5 h-3.5" /> Restore
                          </Btn>
                        ) : (
                          <Btn variant="danger" onClick={() => revoke(c)} busy={busySerial === c.serial}>
                            <ShieldOff className="w-3.5 h-3.5" /> Revoke
                          </Btn>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="How revocation works">
        <p className="text-[12.5px] text-[#6B7280] leading-relaxed flex gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#0284C7] shrink-0 mt-0.5" />
          <span>
            Each certificate carries an Ed25519 signature computed over its claims at the moment it is issued,
            with a private key that never leaves the server — verifiers check it against the published public key
            only. Revoking flips the stored status; it does not and cannot re-sign the document. Anyone holding the PDF can
            still run the signature check, and the verification page will show the certificate as revoked with your
            reason attached — which is the honest outcome. Restoring puts it back to <em>genuine</em>.
          </span>
        </p>
      </Panel>
    </div>
  );
};
