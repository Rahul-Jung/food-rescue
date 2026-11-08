-- 0001_extensions: extensions used across the schema.
-- pgtap is for local and staging tests only; the production deploy (T11.x)
-- must skip it or drop it after migrating.

create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pgtap with schema extensions;
