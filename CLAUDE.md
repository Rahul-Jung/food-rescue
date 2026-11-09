# Food Rescue app: rules for Claude Code

- Source of truth: the Master Build Plan doc. Work only on the task named in the prompt.
- Do not start, scaffold or change anything outside that task. Ask before adding a dependency.
- Stack: Expo + Expo Router (apps/mobile), Next.js (apps/admin), Supabase (supabase/), shared Zod in packages/shared.
- Money is integer paisa. Time is timestamptz, shown in Asia/Kathmandu.
- Never write tables from the app; use the named RPCs / Edge Functions.
- Never put secrets in apps. Service role key only in Edge Functions.
- Every user string in locales/en.json AND locales/ne.json.
- Every new RPC / function needs tests (pgTAP or Deno test) in the same task.
- Finish by running: pnpm typecheck && pnpm lint && pnpm test && supabase test db
- Keep UI black and white (design kit tokens only).

## Save tokens: use the Graphify graph before reading files
- The repo is indexed in the Graphify connector (repository_id `Rahul-Jung/food-rescue`). Query it before opening files.
- Locate first, cheaply: `graphify_find` for a symbol, `query_graph` with `skeleton: true` and a small `budget` (800-2000) for "where/how" questions.
- Then read only what you need: `graphify_node` / `graphify_expand` for one definition, or Read with `offset`/`limit` on the lines the graph gave. Don't read whole files unless the graph has nothing.
- Before changing code: `graphify_callers`, `graphify_impact` and `graphify_tests_for` instead of grepping the repo.
- The graph is built from `main` on GitHub, not this working copy. Files changed on the current branch or not yet pushed may be missing or stale: for those, read the file. The result's `freshness.commit` says which commit it reflects.
- Refreshing: nothing to run locally. Graphify indexes `main` from GitHub; if `freshness` is older than the latest merge, re-index from the repo's page on Graphify.
- Docs (Master Build Plan, PRD, audit) live in `../Documenation`, outside the graph. Read only the section the task names, never the whole .docx.
