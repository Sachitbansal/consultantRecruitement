-- CreateEnum
CREATE TYPE "Level" AS ENUM ('CONSULTANT', 'SENIOR_CONSULTANT', 'PRINCIPAL', 'PARTNER');

-- CreateEnum
CREATE TYPE "DeliveryFunction" AS ENUM ('SALES_AND_BD', 'MARKETING_AND_BRANDING', 'OPERATIONS_AND_SUPPLY_CHAIN', 'HR_OPS_AND_ORGANISATION_DESIGN', 'TALENT_ACQUISITION_AND_HEAD_HUNTING', 'LEARNING_AND_DEVELOPMENT', 'BUSINESS_TRANSFORMATION_WITH_AI', 'CORPORATE_FINANCE_AND_WORKING_CAPITAL', 'ACCOUNTING_AND_TAXATION', 'ACCOUNTS_RECEIVABLES_AND_PAYABLES');

-- CreateEnum
CREATE TYPE "Skill" AS ENUM ('STRATEGY', 'EXECUTION', 'PROCESS', 'SOP', 'TRACKERS', 'MIS', 'DATA_ANALYSIS', 'EXCEL', 'ADVANCED_EXCEL', 'BI', 'AGENTIC_AI', 'POWERPOINT', 'COMMUNICATION', 'DIGITAL_MARKETING_ASSETS_MANAGEMENT', 'KEY_ACCOUNTS_MANAGEMENT', 'LEAD_GENERATION', 'NEW_BUSINESS_DEVELOPMENT');

-- CreateEnum
CREATE TYPE "Industry" AS ENUM ('MANUFACTURING', 'PACKAGING', 'SERVICES', 'CONSULTING', 'PRIVATE_EQUITY', 'BANKING', 'OTHERS');

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "level" "Level" NOT NULL,
    "functions" "DeliveryFunction"[],
    "skills" "Skill"[],
    "industries" "Industry"[],
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "remote" BOOLEAN NOT NULL DEFAULT false,
    "additionalNotes" TEXT,
    "qWhatIsGop" TEXT NOT NULL,
    "qWhyJoinGop" TEXT NOT NULL,
    "qKeySkills" TEXT NOT NULL,
    "qRelevantExperience" TEXT NOT NULL,
    "qHowDeliver" TEXT NOT NULL,
    "cvFileName" TEXT,
    "cvStoredPath" TEXT,
    "cvMimeType" TEXT,
    "cvSizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Application_level_idx" ON "Application"("level");

-- CreateIndex
CREATE INDEX "Application_city_idx" ON "Application"("city");

-- CreateIndex
CREATE INDEX "Application_state_idx" ON "Application"("state");

-- CreateIndex
CREATE INDEX "Application_remote_idx" ON "Application"("remote");

-- CreateIndex
CREATE INDEX "Application_createdAt_idx" ON "Application"("createdAt");

-- CreateIndex
CREATE INDEX "Application_fullName_idx" ON "Application"("fullName");

-- CreateIndex
CREATE INDEX "Application_email_idx" ON "Application"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- GIN indexes for array-containment filters (has / hasSome) on the admin
-- dashboard. Not expressible via Prisma's @@index syntax, added manually.
CREATE INDEX "Application_functions_gin_idx" ON "Application" USING GIN ("functions");

CREATE INDEX "Application_skills_gin_idx" ON "Application" USING GIN ("skills");

CREATE INDEX "Application_industries_gin_idx" ON "Application" USING GIN ("industries");
