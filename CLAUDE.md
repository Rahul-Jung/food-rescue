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
