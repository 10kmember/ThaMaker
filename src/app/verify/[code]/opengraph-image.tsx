import { renderShareCard, SHARE_CARD_SIZE } from '@/lib/share-card';
import { getAchievementByCode } from '@/server/data/queries';
import { normaliseCode, isValidCodeFormat, verifyAchievement } from '@/lib/verification';
import { signingSecret } from '@/lib/env';

export const alt = 'PALMA verified achievement';
export const size = SHARE_CARD_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const normalised = normaliseCode(decodeURIComponent(code));
  const record = isValidCodeFormat(normalised) ? await getAchievementByCode(normalised) : null;

  if (!record) {
    return renderShareCard({ eyebrow: 'Verification', name: 'PALMA' });
  }

  // A share card is never issued for a record that does not verify.
  const valid =
    record.state === 'active' &&
    verifyAchievement(
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

  if (!valid) {
    return renderShareCard({
      eyebrow: 'Verification',
      name: 'Not verified',
      line: 'This record could not be verified by PALMA.',
    });
  }

  return renderShareCard({
    eyebrow: `${record.year} ${record.kind === 'winner' ? 'Winner' : 'Finalist'}`,
    name: record.creatorName,
    line: record.categoryName,
    footer: record.code,
  });
}
