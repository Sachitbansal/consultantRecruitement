-- NOTE: `prisma migrate dev` generated three `DROP INDEX` statements here for
-- Application_functions_gin_idx / Application_skills_gin_idx /
-- Application_industries_gin_idx. Those are the hand-written GIN indexes added
-- at the end of the init migration; Prisma cannot express GIN in schema.prisma
-- so it sees them as drift and tries to drop them on every new migration.
-- They were removed by hand. Do the same for any future generated migration,
-- or the admin dashboard's array-containment filters lose their indexes.

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'India';

-- CreateIndex
CREATE INDEX "Application_country_idx" ON "Application"("country");
