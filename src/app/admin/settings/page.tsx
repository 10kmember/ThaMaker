import Link from 'next/link';
import { Notice } from '@/components/ui/feedback';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { prisma } from '@/server/db';
import { env, siteUrl } from '@/lib/env';
import { CODE_LENGTH, CODE_TTL_SECONDS, MAX_ATTEMPTS } from '@/domain/verification-code';
import { MAX_REASON_LENGTH, MIN_REASON_LENGTH } from '@/domain/nomination';
import {
  MAX_SCORE,
  RATIONALE_MAX_WORDS,
  RATIONALE_MIN_WORDS,
  SCORING_CRITERIA,
} from '@/domain/judging';
import { DEFAULT_FINALIST_COUNT, MIN_JUDGES_PER_CANDIDACY } from '@/domain/selection';
import { SESSION_TTL_SECONDS } from '@/lib/auth/session';
import { ENTITY } from '@/lib/legal';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Settings',
  description: 'PALMA configuration.',
  path: '/admin/settings',
  noIndex: true,
});

type Row = { label: string; value: string; source: 'code' | 'env' | 'database' };

function Group({ title, note, rows }: { title: string; note: string; rows: Row[] }) {
  return (
    <section>
      <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">{title}</h2>
      <p className="text-taupe mt-3 text-xs leading-relaxed">{note}</p>

      <dl className="mt-5 flex flex-col">
        {rows.map((row) => (
          <div
            key={row.label}
            className="border-stone-deep/60 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b py-3 last:border-none"
          >
            <dt className="text-taupe-deep text-sm">{row.label}</dt>
            <dd className="flex items-baseline gap-3">
              <span className="text-sm break-all">{row.value}</span>
              <span
                className={cn(
                  'palma-label shrink-0 text-xs',
                  row.source === 'database' ? 'text-olive' : 'text-taupe',
                )}
              >
                {row.source}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default async function SettingsPage() {
  await requirePermission('admin:manage_system', '/admin/settings');

  const [season, categories] = await Promise.all([
    prisma.awardYear.findFirst({ where: { isCurrent: true } }),
    prisma.category.count(),
  ]);

  return (
    <>
      <div className="flex flex-col gap-3">
        <span className="palma-label text-taupe-deep">System</span>
        <h1 className="text-4xl">Settings</h1>
        <p className="text-taupe-deep max-w-160 leading-relaxed">
          What PALMA is configured to do, and where each setting actually lives. Three sources, and
          the distinction matters: <strong className="text-ink">database</strong> is editable in the
          back office, <strong className="text-ink">env</strong> is a deployment decision, and{' '}
          <strong className="text-ink">code</strong> is a rule PALMA has published and cannot change
          without a release.
        </p>
      </div>

      <Notice className="mt-8" title="Rules are published before they are configurable">
        The judging criteria, the nomination limits and the selection counts are read from the
        domain by this page, by{' '}
        <Link href="/about/judging" className="palma-link text-ink">
          /about/judging
        </Link>{' '}
        and by the{' '}
        <Link href="/legal/rules" className="palma-link text-ink">
          competition rules
        </Link>
        . Making them editable from a dashboard would let a season&rsquo;s rules change after it
        opened, which the rules themselves forbid.
      </Notice>

      <div className="mt-12 grid gap-14 lg:grid-cols-2 lg:gap-16">
        <Group
          title="Institution"
          note="Who PALMA is, in law and on the wire."
          rows={[
            { label: 'Registered name', value: ENTITY.name, source: 'code' },
            { label: 'Jurisdiction', value: ENTITY.jurisdiction, source: 'code' },
            { label: 'Public site', value: siteUrl, source: 'env' },
            { label: 'Environment', value: env.NODE_ENV, source: 'env' },
          ]}
        />

        <Group
          title="Season"
          note="The only settings on this page that are genuinely editable, and they live in the database."
          rows={[
            {
              label: 'Current season',
              value: season?.title ?? 'None marked current',
              source: 'database',
            },
            { label: 'Stage', value: season?.stage.replace(/_/g, ' ') ?? '—', source: 'database' },
            {
              label: 'Nominations open',
              value: season?.nominationsOpenAt?.toISOString().slice(0, 10) ?? '—',
              source: 'database',
            },
            {
              label: 'Nominations close',
              value: season?.nominationsCloseAt?.toISOString().slice(0, 10) ?? '—',
              source: 'database',
            },
            {
              label: 'Ceremony',
              value: season?.ceremonyAt?.toISOString().slice(0, 10) ?? '—',
              source: 'database',
            },
            { label: 'Categories', value: String(categories), source: 'database' },
          ]}
        />

        <Group
          title="Nomination rules"
          note="Published in the competition rules. A change here is a change to a document."
          rows={[
            {
              label: 'Reason length',
              value: `${MIN_REASON_LENGTH}–${MAX_REASON_LENGTH} characters`,
              source: 'code',
            },
            { label: 'Verification code', value: `${CODE_LENGTH} digits`, source: 'code' },
            { label: 'Code lifetime', value: `${CODE_TTL_SECONDS / 60} minutes`, source: 'code' },
            { label: 'Code attempts', value: String(MAX_ATTEMPTS), source: 'code' },
            {
              label: 'Per person, per creator, per category',
              value: 'One — enforced by a database constraint',
              source: 'code',
            },
          ]}
        />

        <Group
          title="Judging"
          note="Criteria and thresholds, identical to what the panel and the public are shown."
          rows={[
            {
              label: 'Criteria',
              value: `${SCORING_CRITERIA.length}, ${MAX_SCORE} points each`,
              source: 'code',
            },
            {
              label: 'Judges per candidacy',
              value: `${MIN_JUDGES_PER_CANDIDACY} minimum`,
              source: 'code',
            },
            {
              label: 'Finalists per category',
              value: String(DEFAULT_FINALIST_COUNT),
              source: 'code',
            },
            {
              label: 'Rationale',
              value: `${RATIONALE_MIN_WORDS}–${RATIONALE_MAX_WORDS} words`,
              source: 'code',
            },
            { label: 'Score mutability', value: 'Immutable once submitted', source: 'code' },
          ]}
        />

        <Group
          title="Security"
          note="Sessions, signing and the two cookies PALMA sets."
          rows={[
            {
              label: 'Session lifetime',
              value: `${SESSION_TTL_SECONDS / 86400} days`,
              source: 'code',
            },
            {
              label: 'Signing secret',
              value: env.AUTH_SECRET ? 'Configured' : 'MISSING',
              source: 'env',
            },
            { label: 'Password hashing', value: 'scrypt, per-user salt', source: 'code' },
            { label: 'Two-factor authentication', value: 'Not yet available', source: 'code' },
            { label: 'Cookies set', value: 'palma_session, palma_csrf', source: 'code' },
          ]}
        />

        <Group
          title="Verification & email"
          note="Both are third parties. PALMA stores no documents and runs no analytics."
          rows={[
            { label: 'Assurance provider', value: env.AGE_VERIFICATION_PROVIDER, source: 'env' },
            {
              label: 'Provider key',
              value: env.AGE_VERIFICATION_API_KEY ? 'Configured' : 'Not set',
              source: 'env',
            },
            { label: 'Email provider', value: 'Resend', source: 'code' },
            {
              label: 'Email key',
              value: env.RESEND_API_KEY ? 'Configured' : 'Not set',
              source: 'env',
            },
            { label: 'Sending as', value: env.EMAIL_FROM, source: 'env' },
            { label: 'Analytics', value: 'None, by design', source: 'code' },
          ]}
        />
      </div>

      <p className="text-taupe mt-14 max-w-160 text-sm leading-relaxed">
        Retention periods are published in the{' '}
        <Link href="/legal/privacy" className="palma-link text-ink">
          privacy notice
        </Link>
        , and are currently applied by hand — see{' '}
        <Link href="/admin/health" className="palma-link text-ink">
          system health
        </Link>
        , which says so rather than showing a green tick for a job that does not exist.
      </p>
    </>
  );
}
