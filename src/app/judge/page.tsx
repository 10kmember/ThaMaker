import { redirect } from 'next/navigation';
import { EntrancePanel } from '@/components/account/EntrancePanel';
import { buildMetadata } from '@/lib/seo';
import { getSession } from '@/lib/auth/session';
import { ENTRANCES, homeForRole } from '@/lib/auth/entrances';
import { CONTACTS } from '@/lib/legal';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Judges',
  description: 'The entrance to the PALMA judging room, for judges seated on a panel.',
  path: '/judge',
  noIndex: true,
});

export default async function JudgeEntrancePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getSession();
  // A judge already signed in goes straight through; anyone else goes to their
  // own building rather than being shown a door they cannot use.
  if (session) redirect(homeForRole(session.user.role));

  const { next } = await searchParams;

  return (
    <EntrancePanel entrance={ENTRANCES.judge} next={next}>
      <div className="border-stone-deep border p-7">
        <h2 className="palma-label text-taupe-deep mb-4">Before you enter</h2>
        <ul className="text-taupe-deep flex flex-col gap-3 text-sm leading-relaxed">
          <li>Everything inside the judging room is confidential, permanently.</li>
          <li>Score independently. You will not be shown another judge&rsquo;s assessment.</li>
          <li>
            Declare a conflict the moment you recognise one. Declaring removes the candidate from
            your assignments immediately.
          </li>
          <li>A submitted assessment cannot be edited.</li>
        </ul>
        <p className="text-taupe mt-5 text-xs leading-relaxed">
          Lost access, or think your seat is wrong? Write to{' '}
          <a href={`mailto:${CONTACTS.integrity}`} className="palma-link text-ink">
            {CONTACTS.integrity}
          </a>
          . PALMA never asks for your password by email.
        </p>
      </div>
    </EntrancePanel>
  );
}
