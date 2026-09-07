-- Seeds the taxonomy lookup tables (pillars, sub_tags, industries) from
-- changes.pdf §2 Sections C and D. Run as a SQL migration -- not a JS seed
-- script -- so the taxonomy exists in every environment the instant
-- migrations run, including a fresh server deploy where nobody remembers to
-- run a separate seed command.
--
-- Idempotent: every INSERT is keyed on the unique `code` column with
-- `ON CONFLICT (code) DO NOTHING`, so re-running this file (e.g. because a
-- future migration touches the same tables) is harmless -- it will not
-- duplicate rows or reset ids.
--
-- To extend the taxonomy later (new pillar, new sub_tag, new industry):
-- add a new migration with more `INSERT ... ON CONFLICT (code) DO NOTHING`
-- statements using this same pattern. Never hand-edit rows directly in the
-- database, and never renumber/reuse an existing `code` -- application code
-- and any already-tagged consultant/case-study rows reference these codes.

-- ============================================================================
-- Pillars -- the 7 S.C.A.L.E. categories (§2 Section C)
-- ============================================================================

INSERT INTO "pillars" ("code", "name") VALUES
    ('business-transformation', 'Business Transformation'),
    ('revenue-growth-acceleration', 'Revenue & Growth Acceleration'),
    ('operations-financial-discipline', 'Operations & Financial Discipline'),
    ('people-performance', 'People & Performance'),
    ('ai-led-efficiency', 'AI-Led Efficiency'),
    ('pe-readiness-institutional-infrastructure', 'PE Readiness & Institutional Infrastructure'),
    ('capital-ecosystem-access', 'Capital & Ecosystem Access')
ON CONFLICT ("code") DO NOTHING;

-- ============================================================================
-- Sub-tags -- nested under each pillar via a subquery on the pillar's code,
-- so this file has no environment-specific numeric ids in it anywhere.
-- ============================================================================

-- Business Transformation
INSERT INTO "sub_tags" ("pillar_id", "code", "name")
SELECT "pillar_id", v."code", v."name"
FROM "pillars", (VALUES
    ('strategy-design', 'Strategy design'),
    ('diagnostic-to-execution', 'Diagnostic-to-execution'),
    ('organisation-design', 'Organisation design'),
    ('change-management', 'Change management')
) AS v("code", "name")
WHERE "pillars"."code" = 'business-transformation'
ON CONFLICT ("code") DO NOTHING;

-- Revenue & Growth Acceleration
INSERT INTO "sub_tags" ("pillar_id", "code", "name")
SELECT "pillar_id", v."code", v."name"
FROM "pillars", (VALUES
    ('new-business-development', 'New business development'),
    ('key-account-management', 'Key account management'),
    ('pricing-strategy', 'Pricing strategy'),
    ('cross-sell-upsell-playbooks', 'Cross-sell/upsell playbooks'),
    ('lead-generation', 'Lead generation')
) AS v("code", "name")
WHERE "pillars"."code" = 'revenue-growth-acceleration'
ON CONFLICT ("code") DO NOTHING;

-- Operations & Financial Discipline
INSERT INTO "sub_tags" ("pillar_id", "code", "name")
SELECT "pillar_id", v."code", v."name"
FROM "pillars", (VALUES
    ('costing-architecture', 'Costing architecture'),
    ('mis-design', 'MIS design'),
    ('working-capital-management', 'Working capital management'),
    ('supply-chain', 'Supply chain'),
    ('financial-controls', 'Financial controls')
) AS v("code", "name")
WHERE "pillars"."code" = 'operations-financial-discipline'
ON CONFLICT ("code") DO NOTHING;

-- People & Performance
INSERT INTO "sub_tags" ("pillar_id", "code", "name")
SELECT "pillar_id", v."code", v."name"
FROM "pillars", (VALUES
    ('talent-acquisition', 'Talent acquisition'),
    ('learning-development', 'L&D'),
    ('kpi-kra-design', 'KPI-KRA design'),
    ('performance-management-systems', 'Performance management systems')
) AS v("code", "name")
WHERE "pillars"."code" = 'people-performance'
ON CONFLICT ("code") DO NOTHING;

-- AI-Led Efficiency
INSERT INTO "sub_tags" ("pillar_id", "code", "name")
SELECT "pillar_id", v."code", v."name"
FROM "pillars", (VALUES
    ('process-automation', 'Process automation'),
    ('agentic-ai', 'Agentic AI'),
    ('applied-data-science', 'Applied data science'),
    ('decision-support-tooling', 'Decision-support tooling')
) AS v("code", "name")
WHERE "pillars"."code" = 'ai-led-efficiency'
ON CONFLICT ("code") DO NOTHING;

-- PE Readiness & Institutional Infrastructure
INSERT INTO "sub_tags" ("pillar_id", "code", "name")
SELECT "pillar_id", v."code", v."name"
FROM "pillars", (VALUES
    ('qoe-reporting', 'QoE reporting'),
    ('governance-design', 'Governance design'),
    ('board-reporting', 'Board reporting'),
    ('due-diligence-prep', 'Due-diligence prep')
) AS v("code", "name")
WHERE "pillars"."code" = 'pe-readiness-institutional-infrastructure'
ON CONFLICT ("code") DO NOTHING;

-- Capital & Ecosystem Access
INSERT INTO "sub_tags" ("pillar_id", "code", "name")
SELECT "pillar_id", v."code", v."name"
FROM "pillars", (VALUES
    ('pe-vc-relationships', 'PE/VC relationships'),
    ('fundraise-support', 'Fundraise support'),
    ('deal-sourcing', 'Deal sourcing')
) AS v("code", "name")
WHERE "pillars"."code" = 'capital-ecosystem-access'
ON CONFLICT ("code") DO NOTHING;

-- ============================================================================
-- Industries -- primary sectors (§2 Section D), top-level (parent = NULL)
-- ============================================================================

INSERT INTO "industries" ("code", "name", "parent_industry_id") VALUES
    ('manufacturing', 'Manufacturing', NULL),
    ('services', 'Services', NULL),
    ('consulting', 'Consulting', NULL),
    ('private-equity', 'Private Equity', NULL),
    ('banking-financial-services', 'Banking & Financial Services', NULL),
    ('other', 'Other', NULL)
ON CONFLICT ("code") DO NOTHING;

-- Manufacturing's 9 sub-verticals, nested via parent_industry_id.
INSERT INTO "industries" ("code", "name", "parent_industry_id")
SELECT v."code", v."name", "industries"."industry_id"
FROM "industries", (VALUES
    ('auto-auto-components', 'Auto & Auto Components'),
    ('chemicals-specialty-chemicals', 'Chemicals & Specialty Chemicals'),
    ('textiles-apparel', 'Textiles & Apparel'),
    ('fmcg-consumer', 'FMCG & Consumer'),
    ('pharma-life-sciences', 'Pharma & Life Sciences'),
    ('industrial-equipment-capital-goods', 'Industrial Equipment & Capital Goods'),
    ('manufacturing-packaging', 'Packaging'),
    ('electronics', 'Electronics'),
    ('manufacturing-other', 'Other')
) AS v("code", "name")
WHERE "industries"."code" = 'manufacturing'
ON CONFLICT ("code") DO NOTHING;
