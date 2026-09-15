import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CONTACTS, ENTITY, LEGAL_DOCUMENTS, legalDocument } from '@/lib/legal';
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

/**
 * The parent company.
 *
 * PALMA is a One Cō Ltd company, and that fact appears in the footer, the
 * legal register, the settings screen, `llms.txt` and `.well-known/palma.txt`.
 * Every one of those reads `ENTITY.parent`, so these assertions are about the
 * one place the name is written rather than the five places it is shown.
 */
describe('the parent company', () => {
  it('is spelled with the macron', () => {
    // "One Co Ltd" is a different company name. The macron is part of it, and
    // it is the kind of character that gets quietly normalised by a keyboard,
    // a spellchecker or somebody retyping it from a screenshot.
    expect(ENTITY.parent.name).toBe('One Cō Ltd');
    expect(ENTITY.parent.name).toContain('ō');
  });

  it('admits the registration number is outstanding rather than omitting it', () => {
    // Until a number is supplied this is null, and the surfaces print "not yet
    // supplied". An ownership claim with a blank where its registration should
    // be is worse than one that says the registration is outstanding.
    expect(ENTITY.parent.companyNumber).toBeNull();
  });

  it('is not confused with the operating company', () => {
    expect(ENTITY.parent.name).not.toBe(ENTITY.name);
    expect(ENTITY.name).toBe('Palma Awards Ltd');
  });
});
