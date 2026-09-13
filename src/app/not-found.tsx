import Link from 'next/link';
import { Container, Section } from '@/components/palma/layout';
import { Button } from '@/components/ui/button';
import { PalmMark } from '@/components/brand/PalmMark';

export default function NotFound() {
  return (
    <Section className="py-28">
      <Container className="flex flex-col items-center gap-8 text-center">
        <PalmMark className="text-stone-deep h-12" />
        <div className="flex max-w-140 flex-col gap-4">
          <span className="palma-label text-taupe-deep">404</span>
          <h1 className="text-4xl sm:text-5xl">Not in the record</h1>
          <p className="text-taupe-deep leading-relaxed">
            This page does not exist, or the honour it referred to was never conferred. If you were
            given a verification code, check it directly.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="sm">
            <Link href="/verify">Verify an honour</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/paroh">Enter the PaROH</Link>
          </Button>
        </div>
      </Container>
    </Section>
  );
}
