-- Relational redesign: replaces the old Application/Level(4)/DeliveryFunction/
-- Skill/Industry(enum) schema with the 10-table (11 named, see report)
-- consultant-network model from changes.pdf §2-§4. AdminUser is untouched.
--
-- Fresh start per explicit decision: all existing Application rows are
-- throwaway test data and are dropped along with the table, not migrated.
--
-- NOTE on `prisma migrate diff`: the auto-generated diff for this change
-- produced a broken "AlterEnum" block that tried to
-- `ALTER TABLE "consultants" ALTER COLUMN "level" ...` to narrow the old
-- 4-value Level enum down to 3 values -- but "consultants" doesn't exist
-- yet at that point in the script (it's created further down), and the
-- *actual* pre-existing user of the old Level enum was "Application",
-- which is being dropped anyway. That generated block has been replaced
-- by hand below with a plain DROP the old enum / CREATE the new one,
-- sequenced after Application is dropped and before consultants is
-- created.
--
-- NOTE on GIN indexes: Postgres GIN indexes on array columns
-- (consultants.client_revenue_bands, client_engagements.pillar_ids) are
-- NOT expressible via Prisma's `@@index` syntax and are appended by hand
-- at the end of this file. `prisma migrate dev` will generate `DROP INDEX`
-- statements for them on every SUBSEQUENT migration because it reads them
-- as drift relative to schema.prisma -- strip those DROP statements out of
-- any future generated migration by hand, exactly as was already done in
-- prisma/migrations/20260816185004_add_country/migration.sql for the old
-- schema's GIN indexes.

-- ============================================================================
-- 1. Drop the old schema
-- ============================================================================

-- DropTable
DROP TABLE "Application";

-- DropEnum (old flat taxonomy enums, fully replaced by lookup tables)
DROP TYPE "DeliveryFunction";
DROP TYPE "Industry";
DROP TYPE "Skill";

-- Drop and recreate Level rather than ALTER it in place -- see note above.
-- Its only prior user (Application) is already gone by this point.
DROP TYPE "Level";

-- ============================================================================
-- 2. New enums
-- ============================================================================

-- CreateEnum
CREATE TYPE "Level" AS ENUM ('CONSULTANT', 'SENIOR_CONSULTANT', 'PRINCIPAL');

-- CreateEnum
CREATE TYPE "TravelWillingness" AS ENUM ('NONE', 'DOMESTIC', 'DOMESTIC_INTERNATIONAL');

-- CreateEnum
CREATE TYPE "PnlBand" AS ENUM ('UNDER_5CR', 'CR_5_TO_25', 'CR_25_TO_100', 'OVER_100CR', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "ClientRevenueBand" AS ENUM ('UNDER_150CR', 'CR_150_TO_300', 'CR_300_TO_500', 'OVER_500CR');

-- CreateEnum
CREATE TYPE "ConsultantStatus" AS ENUM ('INVITED', 'APPLIED', 'APPROVED', 'ACTIVE', 'INACTIVE', 'DECLINED');

-- CreateEnum
CREATE TYPE "CaseStudyRole" AS ENUM ('LEAD', 'CORE_TEAM', 'CONTRIBUTOR');

-- CreateEnum
CREATE TYPE "Referenceable" AS ENUM ('NAMED', 'ANONYMIZED_ONLY');

-- CreateEnum
CREATE TYPE "EngagementType" AS ENUM ('FRACTIONAL', 'FULL_PROJECT', 'ADVISORY_ONLY', 'INTERIM');

-- CreateEnum
CREATE TYPE "ClientEngagementStatus" AS ENUM ('PROSPECT', 'ACTIVE', 'COMPLETED');

-- ============================================================================
-- 3. Consultant ID sequence
-- ============================================================================
-- Backs consultants.consultant_code (format GOP-C-000001). A real Postgres
-- sequence, not `SELECT max()+1` in application code, so concurrent
-- submissions never race for the same number. IF NOT EXISTS keeps a re-run
-- of this file harmless.
CREATE SEQUENCE IF NOT EXISTS consultant_code_seq;

-- ============================================================================
-- 4. New tables
-- ============================================================================

-- CreateTable
CREATE TABLE "consultants" (
    "id" TEXT NOT NULL,
    "consultant_code" VARCHAR(20) NOT NULL DEFAULT ('GOP-C-' || lpad((nextval('consultant_code_seq'::regclass))::text, 6, '0')),
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobile" TEXT,
    "linkedin_url" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "open_to_remote" BOOLEAN,
    "travel_willingness" "TravelWillingness",
    "level" "Level",
    "total_years_exp" INTEGER,
    "operating_years_exp" INTEGER,
    "advisory_years_exp" INTEGER,
    "max_team_managed" INTEGER,
    "max_pnl_band" "PnlBand",
    "client_revenue_bands" "ClientRevenueBand"[],
    "invited_by_id" TEXT,
    "status" "ConsultantStatus" NOT NULL DEFAULT 'APPLIED',
    "date_invited" DATE,
    "date_applied" DATE,
    "date_approved" DATE,
    "cv_file_name" TEXT,
    "cv_stored_path" TEXT,
    "cv_mime_type" TEXT,
    "cv_size_bytes" INTEGER,
    "deck_file_name" TEXT,
    "deck_stored_path" TEXT,
    "deck_mime_type" TEXT,
    "deck_size_bytes" INTEGER,
    "consent_flag" BOOLEAN NOT NULL DEFAULT false,
    "reason_for_joining" TEXT,
    "delivery_style" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pillars" (
    "pillar_id" SERIAL NOT NULL,
    "code" VARCHAR(60) NOT NULL,
    "name" VARCHAR(120) NOT NULL,

    CONSTRAINT "pillars_pkey" PRIMARY KEY ("pillar_id")
);

-- CreateTable
CREATE TABLE "sub_tags" (
    "tag_id" SERIAL NOT NULL,
    "pillar_id" INTEGER NOT NULL,
    "code" VARCHAR(60) NOT NULL,
    "name" VARCHAR(120) NOT NULL,

    CONSTRAINT "sub_tags_pkey" PRIMARY KEY ("tag_id")
);

-- CreateTable
CREATE TABLE "consultant_capabilities" (
    "consultant_id" TEXT NOT NULL,
    "tag_id" INTEGER NOT NULL,

    CONSTRAINT "consultant_capabilities_pkey" PRIMARY KEY ("consultant_id","tag_id")
);

-- CreateTable
CREATE TABLE "industries" (
    "industry_id" SERIAL NOT NULL,
    "code" VARCHAR(60) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "parent_industry_id" INTEGER,

    CONSTRAINT "industries_pkey" PRIMARY KEY ("industry_id")
);

-- CreateTable
CREATE TABLE "consultant_industries" (
    "consultant_id" TEXT NOT NULL,
    "industry_id" INTEGER NOT NULL,

    CONSTRAINT "consultant_industries_pkey" PRIMARY KEY ("consultant_id","industry_id")
);

-- CreateTable
CREATE TABLE "case_studies" (
    "case_study_id" TEXT NOT NULL,
    "consultant_id" TEXT NOT NULL,
    "title" VARCHAR(80) NOT NULL,
    "client_industry_id" INTEGER NOT NULL,
    "client_size_band" "ClientRevenueBand" NOT NULL,
    "role" "CaseStudyRole" NOT NULL,
    "situation_text" VARCHAR(200) NOT NULL,
    "intervention_text" VARCHAR(250) NOT NULL,
    "outcome_text" VARCHAR(150) NOT NULL,
    "duration_months" INTEGER NOT NULL,
    "referenceable" "Referenceable" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_studies_pkey" PRIMARY KEY ("case_study_id")
);

-- CreateTable
CREATE TABLE "case_study_pillars" (
    "case_study_id" TEXT NOT NULL,
    "pillar_id" INTEGER NOT NULL,

    CONSTRAINT "case_study_pillars_pkey" PRIMARY KEY ("case_study_id","pillar_id")
);

-- CreateTable
CREATE TABLE "engagement_profile" (
    "consultant_id" TEXT NOT NULL,
    "engagement_type" "EngagementType",
    "availability_days_week" INTEGER,
    "notice_period_days" INTEGER,
    "rate_band" TEXT,
    "currently_engaged" BOOLEAN,
    "exclusivity_notes" VARCHAR(150),
    "last_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "engagement_profile_pkey" PRIMARY KEY ("consultant_id")
);

-- CreateTable
CREATE TABLE "client_engagements" (
    "engagement_id" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "client_industry_id" INTEGER,
    "pillar_ids" INTEGER[],
    "start_date" DATE,
    "end_date" DATE,
    "status" "ClientEngagementStatus" NOT NULL DEFAULT 'PROSPECT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_engagements_pkey" PRIMARY KEY ("engagement_id")
);

-- CreateTable
CREATE TABLE "engagement_staffing" (
    "engagement_id" TEXT NOT NULL,
    "consultant_id" TEXT NOT NULL,
    "role_on_engagement" TEXT,

    CONSTRAINT "engagement_staffing_pkey" PRIMARY KEY ("engagement_id","consultant_id")
);

-- ============================================================================
-- 5. B-tree indexes
-- ============================================================================

-- CreateIndex
CREATE UNIQUE INDEX "consultants_consultant_code_key" ON "consultants"("consultant_code");

-- CreateIndex
CREATE UNIQUE INDEX "consultants_email_key" ON "consultants"("email");

-- CreateIndex
CREATE INDEX "consultants_status_idx" ON "consultants"("status");

-- CreateIndex
CREATE INDEX "consultants_level_idx" ON "consultants"("level");

-- CreateIndex
CREATE INDEX "consultants_city_idx" ON "consultants"("city");

-- CreateIndex
CREATE INDEX "consultants_state_idx" ON "consultants"("state");

-- CreateIndex
CREATE INDEX "consultants_country_idx" ON "consultants"("country");

-- CreateIndex
CREATE INDEX "consultants_open_to_remote_idx" ON "consultants"("open_to_remote");

-- CreateIndex
CREATE INDEX "consultants_travel_willingness_idx" ON "consultants"("travel_willingness");

-- CreateIndex
CREATE INDEX "consultants_created_at_idx" ON "consultants"("created_at");

-- CreateIndex
CREATE INDEX "consultants_full_name_idx" ON "consultants"("full_name");

-- CreateIndex
CREATE INDEX "consultants_invited_by_id_idx" ON "consultants"("invited_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "pillars_code_key" ON "pillars"("code");

-- CreateIndex
CREATE UNIQUE INDEX "sub_tags_code_key" ON "sub_tags"("code");

-- CreateIndex
CREATE INDEX "sub_tags_pillar_id_idx" ON "sub_tags"("pillar_id");

-- CreateIndex
CREATE INDEX "consultant_capabilities_tag_id_idx" ON "consultant_capabilities"("tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "industries_code_key" ON "industries"("code");

-- CreateIndex
CREATE INDEX "industries_parent_industry_id_idx" ON "industries"("parent_industry_id");

-- CreateIndex
CREATE INDEX "consultant_industries_industry_id_idx" ON "consultant_industries"("industry_id");

-- CreateIndex
CREATE INDEX "case_studies_consultant_id_idx" ON "case_studies"("consultant_id");

-- CreateIndex
CREATE INDEX "case_studies_client_industry_id_idx" ON "case_studies"("client_industry_id");

-- CreateIndex
CREATE INDEX "case_study_pillars_pillar_id_idx" ON "case_study_pillars"("pillar_id");

-- CreateIndex
CREATE INDEX "client_engagements_status_idx" ON "client_engagements"("status");

-- CreateIndex
CREATE INDEX "client_engagements_client_industry_id_idx" ON "client_engagements"("client_industry_id");

-- CreateIndex
CREATE INDEX "client_engagements_created_at_idx" ON "client_engagements"("created_at");

-- CreateIndex
CREATE INDEX "engagement_staffing_consultant_id_idx" ON "engagement_staffing"("consultant_id");

-- ============================================================================
-- 6. Foreign keys
-- ============================================================================

-- AddForeignKey
ALTER TABLE "consultants" ADD CONSTRAINT "consultants_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "consultants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_tags" ADD CONSTRAINT "sub_tags_pillar_id_fkey" FOREIGN KEY ("pillar_id") REFERENCES "pillars"("pillar_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultant_capabilities" ADD CONSTRAINT "consultant_capabilities_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "consultants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultant_capabilities" ADD CONSTRAINT "consultant_capabilities_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "sub_tags"("tag_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "industries" ADD CONSTRAINT "industries_parent_industry_id_fkey" FOREIGN KEY ("parent_industry_id") REFERENCES "industries"("industry_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultant_industries" ADD CONSTRAINT "consultant_industries_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "consultants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultant_industries" ADD CONSTRAINT "consultant_industries_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "industries"("industry_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_studies" ADD CONSTRAINT "case_studies_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "consultants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_studies" ADD CONSTRAINT "case_studies_client_industry_id_fkey" FOREIGN KEY ("client_industry_id") REFERENCES "industries"("industry_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_study_pillars" ADD CONSTRAINT "case_study_pillars_case_study_id_fkey" FOREIGN KEY ("case_study_id") REFERENCES "case_studies"("case_study_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_study_pillars" ADD CONSTRAINT "case_study_pillars_pillar_id_fkey" FOREIGN KEY ("pillar_id") REFERENCES "pillars"("pillar_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagement_profile" ADD CONSTRAINT "engagement_profile_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "consultants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_engagements" ADD CONSTRAINT "client_engagements_client_industry_id_fkey" FOREIGN KEY ("client_industry_id") REFERENCES "industries"("industry_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagement_staffing" ADD CONSTRAINT "engagement_staffing_engagement_id_fkey" FOREIGN KEY ("engagement_id") REFERENCES "client_engagements"("engagement_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagement_staffing" ADD CONSTRAINT "engagement_staffing_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "consultants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- 7. GIN indexes for array-containment filters (has / hasSome) on the admin
-- dashboard. Not expressible via Prisma's @@index syntax, added by hand.
-- See the file-header note: future `prisma migrate dev` runs will try to
-- DROP these -- strip those DROP statements out by hand every time.
-- ============================================================================

CREATE INDEX "consultants_client_revenue_bands_gin_idx" ON "consultants" USING GIN ("client_revenue_bands");

CREATE INDEX "client_engagements_pillar_ids_gin_idx" ON "client_engagements" USING GIN ("pillar_ids");
