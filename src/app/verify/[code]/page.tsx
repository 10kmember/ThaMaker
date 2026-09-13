import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BadgeCheck, ShieldAlert } from 'lucide-react';
import { Container, Section } from '@/components/palma/layout';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/feedback';
import { CopyLink } from '@/components/palma/CopyLink';
import { PalmaSeal } from '@/components/brand/PalmaSeal';
import { Wordmark } from '@/components/brand/Wordmark';
import { JsonLd, absoluteUrl, awardJsonLd, buildMetadata } from '@/lib/seo';
import { countryName, formatDate } from '@/lib/format';
import { signingSecret } from '@/lib/env';
import { isValidCodeFormat, normaliseCode, verifyAchievement } from '@/lib/verification';
import { HONOUR_LABEL } from '@/components/palma/badges';
import { getAchievementByCode } from '@/server/data/queries';

export const revalidate = 300;

type Params = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Params) {
  const { code } = await params;
  const normalised = normaliseCode(decodeURIComponent(code));
  const record = isValidCodeFormat(normalised) ? await getAchievementByCode(normalised) : null;

  if (!record) {
    return buildMetadata({
      title: 'Verification',
      description: 'Check a PALMA honour.',
      path: `/verify/${normalised}`,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: `${record.creatorName} — PALMA ${record.year}`,
    description: `Verified PALMA record: ${record.creatorName}, ${HONOUR_LABEL[record.kind]}, ${record.categoryName}, PALMA ${record.year}.`,
    path: `/verify/${record.code}`,
    image: `/verify/${record.code}/opengraph-image`,
  });
}

export default async function VerifyPage({ params }: Params) {
  const { code } = await params;
  const normalised = normaliseCode(decodeURIComponent(code));
  if (!isValidCodeFormat(normalised)) notFound();

  const record = await getAchievementByCode(normalised);
  if (!record) notFound();

  // The signature binds every identity field of the record. A record whose
  // fields have been altered fails here and is never presented as verified.
  const signatureValid = verifyAchievement(
    signingSecret(),
    {
      code: record.code,
      creatorSlug: record.creatorSlug,
      creatorName: record.creatorName,
      categoryName: record.categoryName,
      year: record.year,
      kind: record.kind,
      issuedAt: record.issuedAt,
    },
    record.signature,
  );

  const revoked = record.state === 'revoked';
  const verified = signatureValid && !revoked;

  return (
    <>
      <section className="on-ink bg-ink text-ivory">
        <Container className="flex flex-col items-center gap-12 py-20 text-center sm:py-28">
          <Wordmark size="md" href={null} />

          <span className="palma-label text-champagne">
            {verified ? 'Verified achievement' : revoked ? 'Revoked honour' : 'Verification failed'}
          </span>

          {verified ? (
            <>
              <h1 className="text-5xl leading-[0.95] sm:text-7xl">{record.creatorName}</h1>
              <div className="flex flex-col items-center gap-3">
                <span className="font-display text-ivory/80 text-2xl sm:text-3xl">
                  {HONOUR_LABEL[record.kind]}
                </span>
                <span className="palma-label text-ivory/55">
                  {record.categoryName} · PALMA {record.year}
                </span>
              </div>

              <PalmaSeal
                legend={`PALMA ${record.year}`}
                sublegend="THE CREATOR HONOURS"
                centre={record.kind === 'winner' ? 'Winner' : 'Finalist'}
                className="text-champagne/90 h-44 w-44"
              />

              <p className="palma-label text-champagne inline-flex items-center gap-2">
                <BadgeCheck className="size-4" aria-hidden="true" />
                Verified by PALMA
              </p>
            </>
          ) : (
            <>
              <ShieldAlert className="text-ivory/60 size-12" aria-hidden="true" />
              <h1 className="max-w-160 text-4xl leading-tight sm:text-5xl">
                {revoked ? 'This honour has been revoked' : 'This record could not be verified'}
              </h1>
              <p className="text-ivory/65 max-w-120">
                {revoked
                  ? 'The honour recorded against this code was revoked by PALMA. It must not be presented as a current PALMA.'
                  : 'The signature on this record does not match its contents. PALMA cannot present it as a verified honour.'}
              </p>
            </>
          )}
        </Container>
      </section>

      <Section className="py-16 sm:py-20">
        <Container size="narrow">
          <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
            <div className="border-stone-deep flex flex-col gap-2 border-t pt-5">
              <dt className="palma-label text-taupe-deep">Recipient</dt>
              <dd className="font-display text-xl">
                {verified ? (
                  <Link href={`/creators/${record.creatorSlug}`} className="hover:text-olive">
                    {record.creatorName}
                  </Link>
                ) : (
                  record.creatorName
                )}
              </dd>
            </div>
            <div className="border-stone-deep flex flex-col gap-2 border-t pt-5">
              <dt className="palma-label text-taupe-deep">Country</dt>
              <dd className="font-display text-xl">{countryName(record.creatorCountry)}</dd>
            </div>
            <div className="border-stone-deep flex flex-col gap-2 border-t pt-5">
              <dt className="palma-label text-taupe-deep">Honour</dt>
              <dd className="font-display text-xl">{HONOUR_LABEL[record.kind]}</dd>
            </div>
            <div className="border-stone-deep flex flex-col gap-2 border-t pt-5">
              <dt className="palma-label text-taupe-deep">Category</dt>
              <dd className="font-display text-xl">
                <Link
                  href={`/categories/${record.categorySlug}?year=${record.year}`}
                  className="hover:text-olive"
                >
                  {record.categoryName}
                </Link>
              </dd>
            </div>
            <div className="border-stone-deep flex flex-col gap-2 border-t pt-5">
              <dt className="palma-label text-taupe-deep">Season</dt>
              <dd className="font-display text-xl">PALMA {record.year}</dd>
            </div>
            <div className="border-stone-deep flex flex-col gap-2 border-t pt-5">
              <dt className="palma-label text-taupe-deep">Issued</dt>
              <dd className="font-display text-xl">{formatDate(record.issuedAt)}</dd>
            </div>
            <div className="border-stone-deep flex flex-col gap-2 border-t pt-5 sm:col-span-2">
              <dt className="palma-label text-taupe-deep">Verification code</dt>
              <dd className="font-mono text-lg tracking-[0.16em]">{record.code}</dd>
            </div>
          </dl>

          {record.citation && verified ? (
            <blockquote className="border-champagne-deep font-display mt-12 border-l-2 pl-6 text-2xl leading-snug">
              “{record.citation}”
            </blockquote>
          ) : null}

          <div className="mt-12 flex flex-wrap items-center gap-3">
            <CopyLink value={absoluteUrl(`/verify/${record.code}`)} />
            <Button asChild variant="outline" size="sm">
              <Link href="/verify">Verify another honour</Link>
            </Button>
            {verified ? (
              <Button asChild variant="ghost" size="sm">
                <Link href={`/creators/${record.creatorSlug}`}>View the full record</Link>
              </Button>
            ) : null}
          </div>

          {!verified ? (
            <Notice tone="error" className="mt-10" title="If you were shown this code as proof">
              Treat it as unverified. If you believe someone is presenting a PALMA they do not hold,{' '}
              <Link href="/report" className="palma-link">
                report it to PALMA
              </Link>
              .
            </Notice>
          ) : (
            <Notice className="mt-10" title="How this page is produced">
              This record was signed when the honour was conferred and is checked on every request.
              PALMA does not publish judging scores, panel deliberations or nomination evidence.
            </Notice>
          )}
        </Container>
      </Section>

      {verified ? (
        <JsonLd
          data={awardJsonLd({
            creatorName: record.creatorName,
            creatorUrl: absoluteUrl(`/creators/${record.creatorSlug}`),
            categoryName: record.categoryName,
            year: record.year,
            kind: HONOUR_LABEL[record.kind],
            code: record.code,
          })}
        />
      ) : null}
    </>
  );
}
