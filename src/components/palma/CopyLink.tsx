'use client';

import * as React from 'react';
import { Check, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CopyLink({
  value,
  label = 'Copy verification link',
  variant = 'outline',
}: {
  value: string;
  label?: string;
  variant?: 'outline' | 'quiet' | 'ghost';
}) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2400);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard permission denied — the link is always visible as text too.
      setCopied(false);
    }
  }

  return (
    <Button type="button" variant={variant} size="sm" onClick={copy} aria-live="polite">
      {copied ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
      {copied ? 'Copied' : label}
    </Button>
  );
}
