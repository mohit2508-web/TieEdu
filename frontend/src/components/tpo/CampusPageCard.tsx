import React, { useEffect, useState } from 'react';
import { ExternalLink, Globe } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { usePlacement } from '@/context/PlacementContext';
import { CampusPageSettings, getCampusPageSettings, saveCampusPageSettings } from '@/lib/placementApi';
import { cn } from '@/lib/cn';

/**
 * The officer's switch for the college's public campus page (§7.3). Shown only
 * to roles with `placement.settings.write`. States plainly what goes public —
 * aggregates only, none below 10 students — before the switch.
 */
export const CampusPageCard: React.FC = () => {
  const { me, activeCollegeId, hasPermission } = usePlacement();
  const [settings, setSettings] = useState<CampusPageSettings | null>(null);
  const [intro, setIntro] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canWrite = hasPermission('placement.settings.write');
  const college = (me?.colleges || []).find((c) => c.college_id === activeCollegeId);

  useEffect(() => {
    if (!canWrite) return;
    getCampusPageSettings(activeCollegeId)
      .then((s) => {
        setSettings(s);
        setIntro(s.intro);
      })
      .catch((e) => setError(e?.message || 'Could not load the campus page settings.'));
  }, [activeCollegeId, canWrite]);

  if (!canWrite || !settings) return error ? <p className="text-sm text-danger">{error}</p> : null;

  const save = async (patch: { enabled?: boolean; intro?: string }) => {
    setSaving(true);
    setError(null);
    try {
      const next = await saveCampusPageSettings(patch, activeCollegeId);
      setSettings(next);
      setIntro(next.intro);
    } catch (e: any) {
      setError(e?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xl">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-heading">
            <Globe className="h-5 w-5 text-signal" aria-hidden /> Public campus page
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            A page for your students and their parents: your college&apos;s name and colour, how many students are preparing,
            and batch-level readiness. Never anything about an individual student, and no numbers at all until 10 students
            have joined.
          </p>
          <label className="mt-4 block text-sm font-semibold text-heading" htmlFor="campus-intro">
            Introduction <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea
            id="campus-intro"
            rows={3}
            maxLength={600}
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line-strong bg-card p-3 text-sm text-heading focus:border-signal focus:outline-none"
          />
          {intro !== settings.intro && (
            <Button size="sm" kind="secondary" className="mt-2" disabled={saving} onClick={() => save({ intro })}>
              Save introduction
            </Button>
          )}
          {error && <p className="mt-2 text-sm text-danger" role="alert">{error}</p>}
        </div>
        <div className="flex flex-col items-start gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={settings.enabled}
            disabled={saving}
            onClick={() => save({ enabled: !settings.enabled })}
            className={cn(
              'focus-ring inline-flex min-h-[44px] items-center gap-3 rounded-xl border px-3 text-sm font-semibold',
              settings.enabled ? 'border-success/40 bg-success-soft text-success' : 'border-line bg-card text-heading'
            )}
          >
            <span className={cn('relative h-5 w-9 rounded-full', settings.enabled ? 'bg-success' : 'bg-line-strong')} aria-hidden>
              <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform', settings.enabled ? 'translate-x-4' : 'translate-x-0.5')} />
            </span>
            {settings.enabled ? 'Live' : 'Off'}
          </button>
          {settings.enabled && college?.slug && (
            <Button size="sm" href={`/campus/${college.slug}`} target="_blank" rel="noopener" icon={ExternalLink}>
              View the page
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default CampusPageCard;
