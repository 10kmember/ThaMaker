'use client';

import { CheckboxField } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { setGazetteFromAccount } from '@/server/actions/gazette';

/**
 * Joining from inside the account.
 *
 * No confirmation email: the address is already proven by the fact that they
 * signed in with it. Pretending a double opt-in happened when it did not would
 * be theatre, and the subscription records that it came from the portal.
 */
export function GazetteToggle({ subscribed }: { subscribed: boolean }) {
  return (
    <form action={setGazetteFromAccount} className="flex flex-col gap-4">
      <CheckboxField
        id="gazetteSubscribed"
        name="subscribed"
        label="Send me the Gazette"
        defaultChecked={subscribed}
      />
      <Button type="submit" variant="outline" size="sm" className="self-start">
        Save
      </Button>
    </form>
  );
}
