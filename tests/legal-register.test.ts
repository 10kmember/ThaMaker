import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CONTACTS, LEGAL_DOCUMENTS, legalDocument } from '@/lib/legal';
import { LEGAL_NAV } from '@/lib/navigation';

/**
 * The register is the source of truth for the legal layer: the index page, the
 * sitemap, llms.txt and the footer all read from it. That only holds if every
 * registered document actually has a page behind it — a link in the footer to
 * a 404 is worse than no link at all.
 */

const appRoot = fileURLToPath(new URL('../src/app', import.meta.url));

describe('the legal register', () => {
  it('has a page for every registered document', () => {
    for (const entry of LEGAL_DOCUMENTS) {
      expect(
        existsSync(`${appRoot}/legal/${entry.slug}/page.tsx`),
        `no page for /legal/${entry.slug}`,
      ).toBe(true);
    }
  });

  it('has an index page', () => {
    expect(existsSync(`${appRoot}/legal/page.tsx`)).toBe(true);
  });

  it('links every document from the footer register', () => {
    for (const entry of LEGAL_DOCUMENTS) {
      expect(
        LEGAL_NAV.some((item) => item.href === `/legal/${entry.slug}`),
        `${entry.slug} is not in LEGAL_NAV`,
      ).toBe(true);
    }
  });

  it('points every footer register link at a registered document', () => {
    for (const item of LEGAL_NAV) {
      if (item.href === '/legal') continue;
      const slug = item.href.replace('/legal/', '');
      expect(legalDocument(slug), `${item.href} is not in the register`).toBeDefined();
    }
  });

  it('gives every document a unique slug, a version and an effective date', () => {
    const slugs = new Set<string>();
    for (const entry of LEGAL_DOCUMENTS) {
      expect(slugs.has(entry.slug), `duplicate slug ${entry.slug}`).toBe(false);
      slugs.add(entry.slug);

      expect(entry.version).toMatch(/^\d+\.\d+$/);
      expect(entry.effective).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(new Date(entry.effective).getTime())).toBe(false);
    }
  });

  it('states a status honestly rather than leaving it implied', () => {
    for (const entry of LEGAL_DOCUMENTS) {
      expect(['in-force', 'draft']).toContain(entry.status);
    }
  });

  it('uses the palmaawards.com domain for every published address', () => {
    for (const address of Object.values(CONTACTS)) {
      expect(address.endsWith('@palmaawards.com'), address).toBe(true);
    }
  });
});
