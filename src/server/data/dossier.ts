import 'server-only';
import { prisma } from '@/server/db';

/**
 * The Dossier.
 *
 * Everything PALMA has told this account, kept — decisions, honours, security
 * notices, the lot. It is written by `dispatch` whether or not the matching
 * email went out, so a muted channel or a bounced address never costs somebody
 * the knowledge that their honour was revoked.
 *
 * It is a record, not a feed. Nothing here is social: no likes, no comments,
 * no counts of who saw what. An entry appears because the institution did
 * something that concerns you.
 */

export type DossierEntry = {
  id: string;
  kind: string;
  subject: string;
  body: string;
  href: string | null;
  isImportant: boolean;
  readAt: string | null;
  archivedAt: string | null;
  createdAt: string;
};

export type Dossier = {
  entries: DossierEntry[];
  unread: number;
  /** Unread entries PALMA will not let an account dismiss without reading. */
  unreadImportant: number;
  archived: number;
};

function shape(row: {
  id: string;
  kind: string;
  subject: string;
  body: string;
  href: string | null;
  isImportant: boolean;
  readAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
}): DossierEntry {
  return {
    id: row.id,
    kind: row.kind,
    subject: row.subject,
    body: row.body,
    href: row.href,
    isImportant: row.isImportant,
    readAt: row.readAt?.toISOString() ?? null,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getDossier(
  userId: string,
  options: { archived?: boolean; take?: number } = {},
): Promise<Dossier> {
  const archived = options.archived ?? false;

  const [rows, unread, unreadImportant, archivedCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId, archivedAt: archived ? { not: null } : null },
      orderBy: { createdAt: 'desc' },
      take: options.take ?? 100,
    }),
    prisma.notification.count({ where: { userId, readAt: null, archivedAt: null } }),
    prisma.notification.count({
      where: { userId, readAt: null, archivedAt: null, isImportant: true },
    }),
    prisma.notification.count({ where: { userId, archivedAt: { not: null } } }),
  ]);

  return {
    entries: rows.map(shape),
    unread,
    unreadImportant,
    archived: archivedCount,
  };
}

/**
 * The one number every surface shows.
 *
 * Deliberately two counts rather than one: an account with three unread
 * announcements and an unread revocation is not in the same position as an
 * account with four unread announcements, and a single badge cannot say so.
 */
export async function getDossierBadge(
  userId: string,
): Promise<{ unread: number; important: number }> {
  const [unread, important] = await Promise.all([
    prisma.notification.count({ where: { userId, readAt: null, archivedAt: null } }),
    prisma.notification.count({
      where: { userId, readAt: null, archivedAt: null, isImportant: true },
    }),
  ]);
  return { unread, important };
}
