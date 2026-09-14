'use server';

import { revalidatePath } from 'next/cache';
import { assertSameOrigin, getSession } from '@/lib/auth/session';
import { prisma } from '@/server/db';

/**
 * Reading and filing.
 *
 * Every one of these is scoped by `userId` in the `where` clause rather than
 * checked after the fetch — an entry belonging to somebody else must not be
 * reachable by id, and the safest way to guarantee that is never to select it.
 */

export type DossierState = { status: 'idle' | 'error' | 'success'; message?: string };

export async function markDossierEntryRead(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const session = await getSession();
  if (!session) return;

  const id = String(formData.get('id') ?? '');
  if (!id) return;

  await prisma.notification.updateMany({
    where: { id, userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath('/creator/dossier');
}

export async function markAllDossierRead(): Promise<void> {
  await assertSameOrigin();
  const session = await getSession();
  if (!session) return;

  await prisma.notification.updateMany({
    where: { userId: session.user.id, readAt: null, archivedAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath('/creator/dossier');
}

/**
 * Filing an entry away.
 *
 * Archiving is not deleting: the entry stays, and the archive is one click
 * from the front of the Dossier. PALMA does not offer a way to destroy a
 * notice that it did something to you — that would make the Dossier a place
 * where inconvenient history goes missing.
 *
 * An unread important entry cannot be archived. Reading it first is the point.
 */
export async function archiveDossierEntry(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const session = await getSession();
  if (!session) return;

  const id = String(formData.get('id') ?? '');
  if (!id) return;

  await prisma.notification.updateMany({
    where: {
      id,
      userId: session.user.id,
      archivedAt: null,
      NOT: { isImportant: true, readAt: null },
    },
    data: { archivedAt: new Date(), readAt: new Date() },
  });

  revalidatePath('/creator/dossier');
}

export async function restoreDossierEntry(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const session = await getSession();
  if (!session) return;

  const id = String(formData.get('id') ?? '');
  if (!id) return;

  await prisma.notification.updateMany({
    where: { id, userId: session.user.id, archivedAt: { not: null } },
    data: { archivedAt: null },
  });

  revalidatePath('/creator/dossier');
}
