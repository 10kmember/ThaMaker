import 'server-only';
import { prisma } from '@/server/db';

/**
 * Addresses PALMA has stopped writing to.
 *
 * A bounce is the provider telling us an address does not work. Continuing to
 * send to it is how a sending domain's reputation is destroyed, which ends
 * with PALMA's mail landing in spam for everybody else — so the first job of a
 * bounce is to stop the next message.
 *
 * It is deliberately not a punishment. Nothing here blocks an account, refuses
 * a claim or affects a record; it governs one thing, which is whether an
 * envelope is worth putting in the post. Proving the address again clears it.
 */

export type SuppressionReason = 'hard_bounce' | 'soft_bounce' | 'complaint';

/** Is PALMA still willing to write to this address? */
export async function isSuppressed(
  email: string,
): Promise<{ reason: string; detail: string } | null> {
  const row = await prisma.suppressedAddress.findUnique({
    where: { email: email.toLowerCase() },
    select: { reason: true, detail: true, clearedAt: true },
  });

  if (!row || row.clearedAt) return null;
  return { reason: row.reason, detail: row.detail ?? '' };
}

export async function suppress(input: {
  email: string;
  reason: SuppressionReason;
  detail?: string | null;
  deliveryId?: string | null;
}): Promise<void> {
  const email = input.email.toLowerCase();

  await prisma.suppressedAddress.upsert({
    where: { email },
    create: {
      email,
      reason: input.reason,
      detail: input.detail ?? null,
      deliveryId: input.deliveryId ?? null,
    },
    // A repeat re-opens it: an address that bounced again after being cleared
    // has not fixed itself.
    update: {
      reason: input.reason,
      detail: input.detail ?? null,
      deliveryId: input.deliveryId ?? null,
      clearedAt: null,
      clearedById: null,
    },
  });
}

/**
 * Letting an address back in.
 *
 * Two routes, and both are legitimate: an operator who has spoken to the
 * person, or the person themselves proving the address still works — which
 * confirming a Gazette subscription or a password reset already does.
 */
export async function clearSuppression(email: string, clearedById?: string | null): Promise<void> {
  await prisma.suppressedAddress.updateMany({
    where: { email: email.toLowerCase(), clearedAt: null },
    data: { clearedAt: new Date(), clearedById: clearedById ?? null },
  });
}
