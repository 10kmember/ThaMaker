import type { SeasonStage } from '@/domain/season';

export type HonourKind = 'shortlist' | 'finalist' | 'winner' | 'special_recognition';
export type HonourState = 'active' | 'revoked';
export type VerificationStatus =
  'unverified' | 'pending' | 'verified' | 'failed' | 'expired' | 'revoked';

export type SeasonView = {
  id: string;
  year: number;
  title: string;
  stage: SeasonStage;
  tagline: string | null;
  summary: string | null;
  nominationsOpenAt: string | null;
  nominationsCloseAt: string | null;
  shortlistAt: string | null;
  finalistsAt: string | null;
  ceremonyAt: string | null;
  isCurrent: boolean;
  categoryCount: number;
};

export type CategoryView = {
  id: string;
  slug: string;
  name: string;
  strapline: string | null;
  description: string;
  eligibility: string;
  judgingCriteria: string;
  isOpen: boolean;
  position: number;
  year: number;
  stage: SeasonStage;
  partner: { name: string; slug: string } | null;
};

export type CreatorSummary = {
  id: string;
  slug: string;
  displayName: string;
  countryCode: string;
  headline: string | null;
  portraitUrl: string | null;
  portraitAlt: string | null;
  verificationStatus: VerificationStatus;
  honourCount: number;
  winCount: number;
};

export type HonourEntry = {
  id: string;
  kind: HonourKind;
  state: HonourState;
  year: number;
  categoryName: string;
  categorySlug: string;
  citation: string | null;
  announcedAt: string | null;
  code: string | null;
  position: number;
};

export type CreatorProfile = CreatorSummary & {
  pronouns: string | null;
  city: string | null;
  biography: string | null;
  websiteUrl: string | null;
  links: { label: string; url: string }[];
  record: HonourEntry[];
  isClaimed: boolean;
};

export type FinalistView = {
  position: number;
  creator: CreatorSummary;
  citation: string | null;
};

export type CategoryOutcome = {
  category: CategoryView;
  finalists: FinalistView[];
  winner: (FinalistView & { code: string | null }) | null;
};

export type RollOfHonourEntry = {
  year: number;
  categoryName: string;
  categorySlug: string;
  creator: CreatorSummary;
  code: string | null;
  citation: string | null;
};

export type RollOfHonourYear = {
  year: number;
  title: string;
  entries: RollOfHonourEntry[];
};

export type ArticleSummary = {
  slug: string;
  title: string;
  standfirst: string;
  category: string | null;
  categorySlug: string | null;
  authorName: string;
  publishedAt: string | null;
  readingMinutes: number;
  heroImageUrl: string | null;
  heroImageAlt: string | null;
};

export type ArticleDetail = ArticleSummary & {
  body: string;
};

export type AchievementRecord = {
  code: string;
  kind: HonourKind;
  state: HonourState;
  year: number;
  categoryName: string;
  categorySlug: string;
  creatorName: string;
  creatorSlug: string;
  creatorCountry: string;
  citation: string | null;
  issuedAt: string;
  revokedAt: string | null;
  signature: string;
};

export type SeasonStats = {
  nominations: number;
  underReview: number;
  eligible: number;
  judging: number;
  finalists: number;
  winners: number;
};

export type SponsorView = {
  slug: string;
  name: string;
  summary: string | null;
  websiteUrl: string | null;
  tier: 'headline' | 'category_partner' | 'supporting' | 'media';
  categoryName: string | null;
};

export type JudgeView = {
  id: string;
  displayName: string;
  title: string | null;
  organisation: string | null;
  biography: string | null;
  countryCode: string | null;
  /** Seasons this judge has sat for, newest first. */
  seasons: { year: number; isChair: boolean }[];
  isChair: boolean;
};
