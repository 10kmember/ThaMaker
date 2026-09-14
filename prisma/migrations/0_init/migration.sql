-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('visitor', 'creator', 'judge', 'moderator', 'admin', 'super_admin');

-- CreateEnum
CREATE TYPE "SeasonStage" AS ENUM ('announced', 'nominations_open', 'nominations_closed', 'shortlisting', 'shortlist_announced', 'judging', 'finalists_announced', 'winners_announced', 'archived');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('unverified', 'pending', 'verified', 'failed', 'expired', 'revoked');

-- CreateEnum
CREATE TYPE "NominationSource" AS ENUM ('organic', 'referral', 'editorial');

-- CreateEnum
CREATE TYPE "NominationStatus" AS ENUM ('pending_verification', 'counted', 'rejected', 'withdrawn');

-- CreateEnum
CREATE TYPE "CandidacyStatus" AS ENUM ('under_review', 'eligible', 'ineligible', 'shortlisted', 'finalist', 'winner', 'withdrawn');

-- CreateEnum
CREATE TYPE "EvidenceKind" AS ENUM ('external_link', 'press_mention', 'metric_statement', 'testimonial', 'award_record', 'other');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('assigned', 'in_progress', 'completed', 'recused', 'reassigned');

-- CreateEnum
CREATE TYPE "ConflictKind" AS ENUM ('personal_relationship', 'commercial_relationship', 'representation', 'employment', 'competitor', 'other');

-- CreateEnum
CREATE TYPE "ConflictStatus" AS ENUM ('declared', 'upheld', 'dismissed');

-- CreateEnum
CREATE TYPE "HonourKind" AS ENUM ('shortlist', 'finalist', 'winner', 'special_recognition');

-- CreateEnum
CREATE TYPE "HonourState" AS ENUM ('active', 'revoked');

-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('draft', 'in_review', 'scheduled', 'published', 'archived');

-- CreateEnum
CREATE TYPE "SponsorTier" AS ENUM ('headline', 'category_partner', 'supporting', 'media');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('impersonation', 'fabricated_achievement', 'explicit_content', 'harassment', 'ineligible_creator', 'vote_manipulation', 'other');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('open', 'investigating', 'actioned', 'dismissed');

-- CreateEnum
CREATE TYPE "ModerationActionKind" AS ENUM ('content_removed', 'profile_suspended', 'nomination_rejected', 'honour_revoked', 'creator_banned', 'warning_issued', 'restored');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('submitted', 'awaiting_information', 'escalated', 'approved', 'rejected', 'withdrawn');

-- CreateEnum
CREATE TYPE "VerificationCaseReason" AS ENUM ('provider_unavailable', 'provider_exception', 'result_requires_review', 'reverification_due');

-- CreateEnum
CREATE TYPE "VerificationCaseStatus" AS ENUM ('open', 'awaiting_information', 'verified', 'refused', 'abandoned');

-- CreateEnum
CREATE TYPE "ConsequentialActionKind" AS ENUM ('account_ban', 'honour_revocation');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('email', 'in_app');

-- CreateEnum
CREATE TYPE "EmailDeliveryStatus" AS ENUM ('queued', 'sent', 'delivered', 'bounced', 'complained', 'failed', 'suppressed');

-- CreateEnum
CREATE TYPE "SponsorshipPlacement" AS ENUM ('category', 'event', 'editorial', 'principal');

-- CreateEnum
CREATE TYPE "SuppressionReason" AS ENUM ('hard_bounce', 'soft_bounce', 'complaint');

-- CreateEnum
CREATE TYPE "EmailListType" AS ENUM ('awards', 'journal', 'events', 'opportunities', 'partner_offers');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('pending', 'confirmed', 'unsubscribed');

-- CreateEnum
CREATE TYPE "PortraitStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "RecordObjectionStatus" AS ENUM ('received', 'upheld', 'refused', 'withdrawn');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'scheduled', 'live', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "SponsorStatus" AS ENUM ('prospect', 'active', 'paused', 'expired', 'terminated');

-- CreateEnum
CREATE TYPE "AgreementStatus" AS ENUM ('none', 'drafted', 'sent', 'signed', 'expired');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('planned', 'announced', 'on_sale', 'sold_out', 'held', 'cancelled');

-- CreateEnum
CREATE TYPE "TicketKind" AS ENUM ('general', 'premium', 'vip', 'table', 'hospitality', 'industry');

-- CreateEnum
CREATE TYPE "PhysicalItemStatus" AS ENUM ('not_ordered', 'ordered', 'in_production', 'ready', 'shipped', 'delivered', 'replacement', 'cancelled');

-- CreateEnum
CREATE TYPE "LicenceStatus" AS ENUM ('granted', 'suspended', 'revoked', 'expired');

-- CreateEnum
CREATE TYPE "OpportunityKind" AS ENUM ('collaboration', 'brand', 'application', 'programme', 'event', 'professional', 'partnership');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('draft', 'published', 'closed', 'withdrawn');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'creator',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "csrfSecret" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seasonAnnouncements" BOOLEAN NOT NULL DEFAULT true,
    "nominationUpdates" BOOLEAN NOT NULL DEFAULT true,
    "honourAnnouncements" BOOLEAN NOT NULL DEFAULT true,
    "journalDigest" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Creator" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "pronouns" TEXT,
    "countryCode" CHAR(2) NOT NULL,
    "city" TEXT,
    "headline" TEXT,
    "biography" TEXT,
    "portraitUrl" TEXT,
    "portraitAlt" TEXT,
    "websiteUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isClaimed" BOOLEAN NOT NULL DEFAULT false,
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "referralEnabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Creator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorLink" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CreatorLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorVerification" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'unverified',
    "provider" TEXT,
    "providerReference" TEXT,
    "method" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "failureCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AwardYear" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "stage" "SeasonStage" NOT NULL DEFAULT 'announced',
    "tagline" TEXT,
    "summary" TEXT,
    "nominationsOpenAt" TIMESTAMP(3),
    "nominationsCloseAt" TIMESTAMP(3),
    "shortlistAt" TIMESTAMP(3),
    "finalistsAt" TIMESTAMP(3),
    "ceremonyAt" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AwardYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "awardYearId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "strapline" TEXT,
    "description" TEXT NOT NULL,
    "eligibility" TEXT NOT NULL,
    "judgingCriteria" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nominator" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailKey" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "lastNominatedAt" TIMESTAMP(3),
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Nominator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NominatorVerification" (
    "id" TEXT NOT NULL,
    "nominatorId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NominatorVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidacy" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "awardYearId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "status" "CandidacyStatus" NOT NULL DEFAULT 'under_review',
    "nominationCount" INTEGER NOT NULL DEFAULT 0,
    "firstNominatedAt" TIMESTAMP(3),
    "lastNominatedAt" TIMESTAMP(3),
    "integrityFlag" BOOLEAN NOT NULL DEFAULT false,
    "integrityNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidacy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nomination" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "candidacyId" TEXT NOT NULL,
    "nominatorId" TEXT NOT NULL,
    "source" "NominationSource" NOT NULL DEFAULT 'organic',
    "status" "NominationStatus" NOT NULL DEFAULT 'pending_verification',
    "reason" TEXT NOT NULL,
    "referralSlug" TEXT,
    "ipHash" TEXT,
    "userAgentHash" TEXT,
    "integrityScore" INTEGER NOT NULL DEFAULT 0,
    "integritySignals" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "countedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,

    CONSTRAINT "Nomination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidacyEvidence" (
    "id" TEXT NOT NULL,
    "candidacyId" TEXT NOT NULL,
    "kind" "EvidenceKind" NOT NULL DEFAULT 'external_link',
    "label" TEXT NOT NULL,
    "url" TEXT,
    "note" TEXT,
    "addedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidacyEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Judge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "title" TEXT,
    "organisation" TEXT,
    "biography" TEXT,
    "countryCode" CHAR(2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Judge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JudgePanelMembership" (
    "id" TEXT NOT NULL,
    "judgeId" TEXT NOT NULL,
    "awardYearId" TEXT NOT NULL,
    "isChair" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JudgePanelMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JudgeConflict" (
    "id" TEXT NOT NULL,
    "judgeId" TEXT NOT NULL,
    "creatorId" TEXT,
    "candidacyId" TEXT,
    "kind" "ConflictKind" NOT NULL,
    "status" "ConflictStatus" NOT NULL DEFAULT 'declared',
    "note" TEXT,
    "declaredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,

    CONSTRAINT "JudgeConflict_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JudgingAssignment" (
    "id" TEXT NOT NULL,
    "judgeId" TEXT NOT NULL,
    "candidacyId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'assigned',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "recusedAt" TIMESTAMP(3),

    CONSTRAINT "JudgingAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JudgingScore" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "judgeId" TEXT NOT NULL,
    "candidacyId" TEXT NOT NULL,
    "originality" INTEGER NOT NULL,
    "consistency" INTEGER NOT NULL,
    "professionalism" INTEGER NOT NULL,
    "impact" INTEGER NOT NULL,
    "brand" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "remarks" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correctedAt" TIMESTAMP(3),
    "correctedById" TEXT,
    "correctionNote" TEXT,

    CONSTRAINT "JudgingScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Honour" (
    "id" TEXT NOT NULL,
    "awardYearId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "candidacyId" TEXT,
    "kind" "HonourKind" NOT NULL,
    "state" "HonourState" NOT NULL DEFAULT 'active',
    "position" INTEGER NOT NULL DEFAULT 0,
    "citation" TEXT,
    "announcedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Honour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "honourId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "HonourKind" NOT NULL,
    "state" "HonourState" NOT NULL DEFAULT 'active',
    "year" INTEGER NOT NULL,
    "categoryName" TEXT NOT NULL,
    "creatorName" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationRecord" (
    "id" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "payloadDigest" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastViewedAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VerificationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sponsor" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT,
    "websiteUrl" TEXT,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "legalName" TEXT,
    "tradingName" TEXT,
    "status" "SponsorStatus" NOT NULL DEFAULT 'prospect',
    "relationship" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "internalNotes" TEXT,
    "agreementStatus" "AgreementStatus" NOT NULL DEFAULT 'none',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sponsor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sponsorship" (
    "id" TEXT NOT NULL,
    "sponsorId" TEXT NOT NULL,
    "awardYearId" TEXT NOT NULL,
    "placement" "SponsorshipPlacement" NOT NULL DEFAULT 'category',
    "categoryId" TEXT,
    "eventId" TEXT,
    "articleId" TEXT,
    "packageId" TEXT,
    "tier" "SponsorTier" NOT NULL DEFAULT 'supporting',
    "billing" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "attribution" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sponsorship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorClaim" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'submitted',
    "claimedIdentity" TEXT NOT NULL,
    "supportingNote" TEXT,
    "contactEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "informationRequestedAt" TIMESTAMP(3),
    "informationRequestedNote" TEXT,
    "escalatedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,
    "decisionNote" TEXT,

    CONSTRAINT "CreatorClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorClaimLink" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "CreatorClaimLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimInvitation" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "issuedById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClaimInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorNote" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationCase" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "reason" "VerificationCaseReason" NOT NULL,
    "status" "VerificationCaseStatus" NOT NULL DEFAULT 'open',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,
    "decisionNote" TEXT,
    "resultHash" TEXT,
    "providerReference" TEXT,
    "mediaReceivedAt" TIMESTAMP(3),
    "mediaDeletedAt" TIMESTAMP(3),

    CONSTRAINT "VerificationCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsequentialAction" (
    "id" TEXT NOT NULL,
    "kind" "ConsequentialActionKind" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelledReason" TEXT,

    CONSTRAINT "ConsequentialAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ArticleCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "standfirst" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "ArticleStatus" NOT NULL DEFAULT 'draft',
    "categoryId" TEXT,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "heroImageUrl" TEXT,
    "heroImageAlt" TEXT,
    "readingMinutes" INTEGER NOT NULL DEFAULT 4,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sponsorId" TEXT,
    "sponsoredLabel" TEXT,
    "sponsorApprovedAt" TIMESTAMP(3),
    "sponsorApprovedById" TEXT,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'open',
    "detail" TEXT NOT NULL,
    "reporterId" TEXT,
    "creatorId" TEXT,
    "candidacyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationAction" (
    "id" TEXT NOT NULL,
    "reportId" TEXT,
    "actorId" TEXT NOT NULL,
    "kind" "ModerationActionKind" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" "Role",
    "actorLabel" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "summary" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'in_app',
    "kind" TEXT NOT NULL DEFAULT 'notice',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "isImportant" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailDelivery" (
    "id" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'queued',
    "providerId" TEXT,
    "detail" TEXT,
    "userId" TEXT,
    "creatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "EmailDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuppressedAddress" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" "SuppressionReason" NOT NULL,
    "detail" TEXT,
    "deliveryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clearedAt" TIMESTAMP(3),
    "clearedById" TEXT,

    CONSTRAINT "SuppressedAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "requestHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailChangeRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "newEmail" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSubscription" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "type" "EmailListType" NOT NULL,
    "userId" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'pending',
    "tokenHash" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'site',
    "consentVersion" TEXT,
    "consentAt" TIMESTAMP(3),
    "consentHash" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispatch" (
    "id" TEXT NOT NULL,
    "type" "EmailListType" NOT NULL DEFAULT 'journal',
    "number" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "standfirst" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "linkLabel" TEXT,
    "linkUrl" TEXT,
    "sponsorId" TEXT,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "sentById" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorPortrait" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "contentType" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "alt" TEXT,
    "status" "PortraitStatus" NOT NULL DEFAULT 'pending',
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorPortrait_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordObjection" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "note" TEXT,
    "status" "RecordObjectionStatus" NOT NULL DEFAULT 'received',
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecordObjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "awardYearId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB,
    "launchAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SponsorshipPackage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceMinor" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "duration" TEXT,
    "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "placements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "maxQuantity" INTEGER,
    "isAvailable" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SponsorshipPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "sponsorId" TEXT,
    "name" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'draft',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PalmaEvent" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "awardYearId" TEXT,
    "venue" TEXT,
    "city" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "description" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'planned',
    "capacity" INTEGER,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PalmaEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketType" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceMinor" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "capacity" INTEGER,
    "kind" "TicketKind" NOT NULL DEFAULT 'general',
    "isAvailable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AwardPhysicalItem" (
    "id" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL DEFAULT 'trophy',
    "status" "PhysicalItemStatus" NOT NULL DEFAULT 'not_ordered',
    "productionStatus" TEXT,
    "shippingStatus" TEXT,
    "trackingReference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AwardPhysicalItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AwardMarkLicence" (
    "id" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "status" "LicenceStatus" NOT NULL DEFAULT 'granted',
    "permittedUses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "grantedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AwardMarkLicence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT,
    "kind" "OpportunityKind" NOT NULL DEFAULT 'collaboration',
    "sponsorId" TEXT,
    "externalUrl" TEXT,
    "closesAt" TIMESTAMP(3),
    "status" "OpportunityStatus" NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "RateLimitCounter" (
    "id" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "identity" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowEndsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimitCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");

-- CreateIndex
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Creator_slug_key" ON "Creator"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Creator_userId_key" ON "Creator"("userId");

-- CreateIndex
CREATE INDEX "Creator_countryCode_idx" ON "Creator"("countryCode");

-- CreateIndex
CREATE INDEX "Creator_isPublished_idx" ON "Creator"("isPublished");

-- CreateIndex
CREATE INDEX "CreatorLink_creatorId_idx" ON "CreatorLink"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorVerification_creatorId_key" ON "CreatorVerification"("creatorId");

-- CreateIndex
CREATE INDEX "CreatorVerification_status_idx" ON "CreatorVerification"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AwardYear_year_key" ON "AwardYear"("year");

-- CreateIndex
CREATE INDEX "AwardYear_stage_idx" ON "AwardYear"("stage");

-- CreateIndex
CREATE INDEX "Category_awardYearId_idx" ON "Category"("awardYearId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_awardYearId_slug_key" ON "Category"("awardYearId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Nominator_email_key" ON "Nominator"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Nominator_emailKey_key" ON "Nominator"("emailKey");

-- CreateIndex
CREATE INDEX "Nominator_verifiedAt_idx" ON "Nominator"("verifiedAt");

-- CreateIndex
CREATE INDEX "NominatorVerification_nominatorId_idx" ON "NominatorVerification"("nominatorId");

-- CreateIndex
CREATE INDEX "NominatorVerification_expiresAt_idx" ON "NominatorVerification"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Candidacy_reference_key" ON "Candidacy"("reference");

-- CreateIndex
CREATE INDEX "Candidacy_status_idx" ON "Candidacy"("status");

-- CreateIndex
CREATE INDEX "Candidacy_awardYearId_categoryId_idx" ON "Candidacy"("awardYearId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Candidacy_awardYearId_categoryId_creatorId_key" ON "Candidacy"("awardYearId", "categoryId", "creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "Nomination_reference_key" ON "Nomination"("reference");

-- CreateIndex
CREATE INDEX "Nomination_status_idx" ON "Nomination"("status");

-- CreateIndex
CREATE INDEX "Nomination_candidacyId_idx" ON "Nomination"("candidacyId");

-- CreateIndex
CREATE UNIQUE INDEX "Nomination_nominatorId_candidacyId_key" ON "Nomination"("nominatorId", "candidacyId");

-- CreateIndex
CREATE INDEX "CandidacyEvidence_candidacyId_idx" ON "CandidacyEvidence"("candidacyId");

-- CreateIndex
CREATE UNIQUE INDEX "Judge_userId_key" ON "Judge"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "JudgePanelMembership_judgeId_awardYearId_key" ON "JudgePanelMembership"("judgeId", "awardYearId");

-- CreateIndex
CREATE INDEX "JudgeConflict_judgeId_idx" ON "JudgeConflict"("judgeId");

-- CreateIndex
CREATE INDEX "JudgeConflict_candidacyId_idx" ON "JudgeConflict"("candidacyId");

-- CreateIndex
CREATE INDEX "JudgingAssignment_status_idx" ON "JudgingAssignment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "JudgingAssignment_judgeId_candidacyId_key" ON "JudgingAssignment"("judgeId", "candidacyId");

-- CreateIndex
CREATE UNIQUE INDEX "JudgingScore_assignmentId_key" ON "JudgingScore"("assignmentId");

-- CreateIndex
CREATE INDEX "JudgingScore_candidacyId_idx" ON "JudgingScore"("candidacyId");

-- CreateIndex
CREATE INDEX "Honour_kind_state_idx" ON "Honour"("kind", "state");

-- CreateIndex
CREATE UNIQUE INDEX "Honour_awardYearId_categoryId_creatorId_kind_key" ON "Honour"("awardYearId", "categoryId", "creatorId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_honourId_key" ON "Achievement"("honourId");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_code_key" ON "Achievement"("code");

-- CreateIndex
CREATE INDEX "Achievement_creatorId_idx" ON "Achievement"("creatorId");

-- CreateIndex
CREATE INDEX "Achievement_year_idx" ON "Achievement"("year");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationRecord_code_key" ON "VerificationRecord"("code");

-- CreateIndex
CREATE INDEX "VerificationRecord_achievementId_idx" ON "VerificationRecord"("achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "Sponsor_slug_key" ON "Sponsor"("slug");

-- CreateIndex
CREATE INDEX "Sponsor_status_idx" ON "Sponsor"("status");

-- CreateIndex
CREATE INDEX "Sponsorship_isApproved_idx" ON "Sponsorship"("isApproved");

-- CreateIndex
CREATE INDEX "Sponsorship_placement_idx" ON "Sponsorship"("placement");

-- CreateIndex
CREATE INDEX "Sponsorship_categoryId_idx" ON "Sponsorship"("categoryId");

-- CreateIndex
CREATE INDEX "Sponsorship_eventId_idx" ON "Sponsorship"("eventId");

-- CreateIndex
CREATE INDEX "Sponsorship_articleId_idx" ON "Sponsorship"("articleId");

-- CreateIndex
CREATE UNIQUE INDEX "Sponsorship_sponsorId_awardYearId_placement_categoryId_even_key" ON "Sponsorship"("sponsorId", "awardYearId", "placement", "categoryId", "eventId", "articleId");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorClaim_reference_key" ON "CreatorClaim"("reference");

-- CreateIndex
CREATE INDEX "CreatorClaim_status_idx" ON "CreatorClaim"("status");

-- CreateIndex
CREATE INDEX "CreatorClaim_creatorId_idx" ON "CreatorClaim"("creatorId");

-- CreateIndex
CREATE INDEX "CreatorClaim_userId_idx" ON "CreatorClaim"("userId");

-- CreateIndex
CREATE INDEX "CreatorClaimLink_claimId_idx" ON "CreatorClaimLink"("claimId");

-- CreateIndex
CREATE UNIQUE INDEX "ClaimInvitation_tokenHash_key" ON "ClaimInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "ClaimInvitation_creatorId_idx" ON "ClaimInvitation"("creatorId");

-- CreateIndex
CREATE INDEX "CreatorNote_creatorId_idx" ON "CreatorNote"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationCase_reference_key" ON "VerificationCase"("reference");

-- CreateIndex
CREATE INDEX "VerificationCase_status_idx" ON "VerificationCase"("status");

-- CreateIndex
CREATE INDEX "VerificationCase_creatorId_idx" ON "VerificationCase"("creatorId");

-- CreateIndex
CREATE INDEX "ConsequentialAction_entityType_entityId_idx" ON "ConsequentialAction"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ConsequentialAction_executedAt_idx" ON "ConsequentialAction"("executedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleCategory_slug_key" ON "ArticleCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE INDEX "Article_status_publishedAt_idx" ON "Article"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "ModerationAction_entityType_entityId_idx" ON "ModerationAction"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "EmailDelivery_template_createdAt_idx" ON "EmailDelivery"("template", "createdAt");

-- CreateIndex
CREATE INDEX "EmailDelivery_status_createdAt_idx" ON "EmailDelivery"("status", "createdAt");

-- CreateIndex
CREATE INDEX "EmailDelivery_to_idx" ON "EmailDelivery"("to");

-- CreateIndex
CREATE INDEX "EmailDelivery_providerId_idx" ON "EmailDelivery"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "SuppressedAddress_email_key" ON "SuppressedAddress"("email");

-- CreateIndex
CREATE INDEX "SuppressedAddress_reason_idx" ON "SuppressedAddress"("reason");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailChangeRequest_tokenHash_key" ON "EmailChangeRequest"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailChangeRequest_userId_idx" ON "EmailChangeRequest"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailSubscription_tokenHash_key" ON "EmailSubscription"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailSubscription_type_status_idx" ON "EmailSubscription"("type", "status");

-- CreateIndex
CREATE INDEX "EmailSubscription_userId_idx" ON "EmailSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailSubscription_email_type_key" ON "EmailSubscription"("email", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Dispatch_slug_key" ON "Dispatch"("slug");

-- CreateIndex
CREATE INDEX "Dispatch_sentAt_idx" ON "Dispatch"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "Dispatch_type_number_key" ON "Dispatch"("type", "number");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorPortrait_creatorId_key" ON "CreatorPortrait"("creatorId");

-- CreateIndex
CREATE INDEX "CreatorPortrait_status_createdAt_idx" ON "CreatorPortrait"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RecordObjection_status_createdAt_idx" ON "RecordObjection"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RecordObjection_creatorId_idx" ON "RecordObjection"("creatorId");

-- CreateIndex
CREATE INDEX "FeatureSetting_key_idx" ON "FeatureSetting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureSetting_key_awardYearId_key" ON "FeatureSetting"("key", "awardYearId");

-- CreateIndex
CREATE UNIQUE INDEX "SponsorshipPackage_slug_key" ON "SponsorshipPackage"("slug");

-- CreateIndex
CREATE INDEX "SponsorshipPackage_isAvailable_idx" ON "SponsorshipPackage"("isAvailable");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_reference_key" ON "Campaign"("reference");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PalmaEvent_slug_key" ON "PalmaEvent"("slug");

-- CreateIndex
CREATE INDEX "PalmaEvent_status_idx" ON "PalmaEvent"("status");

-- CreateIndex
CREATE INDEX "TicketType_eventId_idx" ON "TicketType"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "AwardPhysicalItem_achievementId_key" ON "AwardPhysicalItem"("achievementId");

-- CreateIndex
CREATE INDEX "AwardPhysicalItem_status_idx" ON "AwardPhysicalItem"("status");

-- CreateIndex
CREATE INDEX "AwardMarkLicence_achievementId_idx" ON "AwardMarkLicence"("achievementId");

-- CreateIndex
CREATE INDEX "AwardMarkLicence_status_idx" ON "AwardMarkLicence"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_slug_key" ON "Opportunity"("slug");

-- CreateIndex
CREATE INDEX "Opportunity_status_publishedAt_idx" ON "Opportunity"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "RateLimitCounter_windowEndsAt_idx" ON "RateLimitCounter"("windowEndsAt");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitCounter_bucket_identity_key" ON "RateLimitCounter"("bucket", "identity");

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Creator" ADD CONSTRAINT "Creator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorLink" ADD CONSTRAINT "CreatorLink_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorVerification" ADD CONSTRAINT "CreatorVerification_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_awardYearId_fkey" FOREIGN KEY ("awardYearId") REFERENCES "AwardYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NominatorVerification" ADD CONSTRAINT "NominatorVerification_nominatorId_fkey" FOREIGN KEY ("nominatorId") REFERENCES "Nominator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidacy" ADD CONSTRAINT "Candidacy_awardYearId_fkey" FOREIGN KEY ("awardYearId") REFERENCES "AwardYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidacy" ADD CONSTRAINT "Candidacy_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidacy" ADD CONSTRAINT "Candidacy_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nomination" ADD CONSTRAINT "Nomination_candidacyId_fkey" FOREIGN KEY ("candidacyId") REFERENCES "Candidacy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nomination" ADD CONSTRAINT "Nomination_nominatorId_fkey" FOREIGN KEY ("nominatorId") REFERENCES "Nominator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidacyEvidence" ADD CONSTRAINT "CandidacyEvidence_candidacyId_fkey" FOREIGN KEY ("candidacyId") REFERENCES "Candidacy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Judge" ADD CONSTRAINT "Judge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JudgePanelMembership" ADD CONSTRAINT "JudgePanelMembership_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "Judge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JudgePanelMembership" ADD CONSTRAINT "JudgePanelMembership_awardYearId_fkey" FOREIGN KEY ("awardYearId") REFERENCES "AwardYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JudgeConflict" ADD CONSTRAINT "JudgeConflict_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "Judge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JudgingAssignment" ADD CONSTRAINT "JudgingAssignment_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "Judge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JudgingAssignment" ADD CONSTRAINT "JudgingAssignment_candidacyId_fkey" FOREIGN KEY ("candidacyId") REFERENCES "Candidacy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JudgingAssignment" ADD CONSTRAINT "JudgingAssignment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JudgingScore" ADD CONSTRAINT "JudgingScore_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "JudgingAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JudgingScore" ADD CONSTRAINT "JudgingScore_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "Judge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JudgingScore" ADD CONSTRAINT "JudgingScore_candidacyId_fkey" FOREIGN KEY ("candidacyId") REFERENCES "Candidacy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Honour" ADD CONSTRAINT "Honour_awardYearId_fkey" FOREIGN KEY ("awardYearId") REFERENCES "AwardYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Honour" ADD CONSTRAINT "Honour_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Honour" ADD CONSTRAINT "Honour_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Honour" ADD CONSTRAINT "Honour_candidacyId_fkey" FOREIGN KEY ("candidacyId") REFERENCES "Candidacy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_honourId_fkey" FOREIGN KEY ("honourId") REFERENCES "Honour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRecord" ADD CONSTRAINT "VerificationRecord_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sponsorship" ADD CONSTRAINT "Sponsorship_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sponsorship" ADD CONSTRAINT "Sponsorship_awardYearId_fkey" FOREIGN KEY ("awardYearId") REFERENCES "AwardYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sponsorship" ADD CONSTRAINT "Sponsorship_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sponsorship" ADD CONSTRAINT "Sponsorship_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "PalmaEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sponsorship" ADD CONSTRAINT "Sponsorship_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sponsorship" ADD CONSTRAINT "Sponsorship_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "SponsorshipPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorClaim" ADD CONSTRAINT "CreatorClaim_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorClaim" ADD CONSTRAINT "CreatorClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorClaim" ADD CONSTRAINT "CreatorClaim_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorClaimLink" ADD CONSTRAINT "CreatorClaimLink_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "CreatorClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimInvitation" ADD CONSTRAINT "ClaimInvitation_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimInvitation" ADD CONSTRAINT "ClaimInvitation_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorNote" ADD CONSTRAINT "CreatorNote_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorNote" ADD CONSTRAINT "CreatorNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationCase" ADD CONSTRAINT "VerificationCase_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationCase" ADD CONSTRAINT "VerificationCase_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsequentialAction" ADD CONSTRAINT "ConsequentialAction_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsequentialAction" ADD CONSTRAINT "ConsequentialAction_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ArticleCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_candidacyId_fkey" FOREIGN KEY ("candidacyId") REFERENCES "Candidacy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDelivery" ADD CONSTRAINT "EmailDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDelivery" ADD CONSTRAINT "EmailDelivery_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailChangeRequest" ADD CONSTRAINT "EmailChangeRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailSubscription" ADD CONSTRAINT "EmailSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorPortrait" ADD CONSTRAINT "CreatorPortrait_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordObjection" ADD CONSTRAINT "RecordObjection_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureSetting" ADD CONSTRAINT "FeatureSetting_awardYearId_fkey" FOREIGN KEY ("awardYearId") REFERENCES "AwardYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PalmaEvent" ADD CONSTRAINT "PalmaEvent_awardYearId_fkey" FOREIGN KEY ("awardYearId") REFERENCES "AwardYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketType" ADD CONSTRAINT "TicketType_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "PalmaEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwardPhysicalItem" ADD CONSTRAINT "AwardPhysicalItem_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwardMarkLicence" ADD CONSTRAINT "AwardMarkLicence_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

