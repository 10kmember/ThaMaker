import { describe, expect, it } from 'vitest';
import { ROLES, can, OUTCOME_PERMISSIONS } from '@/lib/auth/rbac';
import {
  HONOUR_KINDS,
  HONOUR_LABEL,
  honourCategoryName,
  honourCategorySlug,
  honourHref,
  isThePalma,
  mintsAchievement,
  THE_PALMA_SLUG,
} from '@/domain/honours';
import { conferralObjections, nameObjections, PER_SEASON, REPEATABLE } from '@/domain/the-palma';

/**
 * THE PALMA, as a kind of honour.
 *
 * The rules were written and tested before it could be conferred. These cover
 * the part that was missing: that it behaves as its own kind everywhere the
 * record is walked, and that it cannot be quietly turned into a category
 * honour by a caller that passes the wrong thing.
 */
describe('THE PALMA as an honour kind', () => {
  it('is a kind of its own, and only one kind is it', () => {
    expect(HONOUR_KINDS).toContain('the_palma');
    expect(HONOUR_KINDS.filter(isThePalma)).toEqual(['the_palma']);
  });

  it('is named without a qualifier', () => {
    expect(HONOUR_LABEL.the_palma).toBe('THE PALMA');
    // The label is the name, so the naming rules apply to it like any copy.
    expect(nameObjections(HONOUR_LABEL.the_palma)).toEqual([]);
  });

  it('mints a permanent record, like every honour a creator holds', () => {
    expect(mintsAchievement('the_palma')).toBe(true);
  });

  it('stands under its own name where a category would be', () => {
    expect(honourCategoryName('the_palma', null)).toBe('THE PALMA');
    expect(honourCategorySlug('the_palma', null)).toBe(THE_PALMA_SLUG);
    // A category honour is unaffected by any of this.
    expect(honourCategoryName('winner', 'Live Creator of the Year')).toBe(
      'Live Creator of the Year',
    );
    expect(honourCategorySlug('winner', 'live-creator-of-the-year')).toBe(
      'live-creator-of-the-year',
    );
  });

  it('points at its own page, never at a category that does not exist', () => {
    expect(honourHref('the_palma', THE_PALMA_SLUG, 2027)).toBe('/the-palma');
    expect(honourHref('winner', 'inked-creator-of-the-year', 2027)).toBe(
      '/categories/inked-creator-of-the-year?year=2027',
    );
  });
});

describe('who may confer it', () => {
  it('splits the work from the signature', () => {
    // The desk does the work: naming the panel's choice and writing the
    // citation. It cannot complete the act alone, because a moderator who can
    // both edit a creator's record and confer the highest honour on them is
    // the hole the outcome firewall exists to close.
    expect(can('moderator', 'honours:propose_the_palma')).toBe(true);
    expect(can('moderator', 'honours:confer_the_palma')).toBe(false);

    const mayConfer = ROLES.filter((role) => can(role, 'honours:confer_the_palma'));
    expect(mayConfer).toEqual(['admin', 'super_admin']);
  });

  it('is never open to a creator, a judge or the public', () => {
    // A judge scoring candidacies must not also be able to confer the honour
    // those candidacies compete beneath.
    for (const role of ['visitor', 'creator', 'judge'] as const) {
      expect(can(role, 'honours:confer_the_palma'), role).toBe(false);
      expect(can(role, 'honours:propose_the_palma'), role).toBe(false);
    }
  });

  it('treats conferring as an outcome and proposing as not one', () => {
    expect(OUTCOME_PERMISSIONS).toContain('honours:confer_the_palma');
    // Proposing must stay off this list, or the desk loses it again.
    expect(OUTCOME_PERMISSIONS).not.toContain('honours:propose_the_palma');
  });
});

describe('the conferral rules', () => {
  const sound = {
    existingThisSeason: 0,
    creatorHeldIn: [] as number[],
    creatorIsVerified: true,
    creatorIsPublished: true,
    citation:
      'For a body of work that changed what the industry believed an independent creator could build alone, and for insisting on terms that others can now ask for.',
  };

  it('allows a sound conferral', () => {
    expect(conferralObjections(sound)).toEqual([]);
  });

  it('refuses a second in the same season', () => {
    expect(PER_SEASON).toBe(1);
    expect(conferralObjections({ ...sound, existingThisSeason: 1 })).not.toEqual([]);
  });

  it('refuses a repeat to the same creator', () => {
    expect(REPEATABLE).toBe(false);
    const objections = conferralObjections({ ...sound, creatorHeldIn: [2025] });
    expect(objections.join(' ')).toMatch(/2025/);
  });

  it('refuses a citation that is too short to defend', () => {
    expect(
      conferralObjections({ ...sound, citation: 'For services to the industry.' }),
    ).not.toEqual([]);
    expect(conferralObjections({ ...sound, citation: null })).not.toEqual([]);
  });

  it('returns every objection at once rather than the first', () => {
    const objections = conferralObjections({
      existingThisSeason: 1,
      creatorHeldIn: [2025],
      creatorIsVerified: false,
      creatorIsPublished: false,
      citation: null,
    });
    expect(objections.length).toBeGreaterThanOrEqual(5);
  });
});
