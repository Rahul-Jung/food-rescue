-- Run on PRODUCTION only, right after `supabase db push` (deploy-prod.yml, T11).
-- Migration 0001 installs pgtap so tests run on local and staging; the plan keeps
-- test tooling off production. Applied migrations are never edited, so production
-- removes it here instead. Safe to run more than once.
drop extension if exists pgtap;
