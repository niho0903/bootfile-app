# BootFile — Claude Code Context

Auto-loaded at the start of every Claude Code session in this repo. Keep it concise, current, and authoritative. Update the "Current Strategic State" section whenever the live state shifts.

---

## What this is

BootFile (bootfile.ai) is a Next.js SaaS that sells personalized AI instruction profiles. A visitor takes an 8-question quiz (see `lib/questions.ts`) → gets assigned one of 8 cognitive archetypes → sees a preview of a generated BootFile → pays $4.99 one-time → unlocks the full 9-section file to paste into ChatGPT / Claude / Gemini / DeepSeek / Copilot / Grok custom instructions.

The product is a text file of behavioral instructions for an AI, personalized from quiz answers. Not a subscription, not a chat interface, not an app the user installs.

## Tech stack

- Next.js 16 (App Router) + React 19 + TypeScript strict mode
- Tailwind CSS 4, but most styling is inline style objects
- Stripe Payment Intents (live, $4.99 = 499 cents), embedded checkout
- Anthropic Claude API — Sonnet 4.6 for the full BootFile, Haiku for the streamed preview
- Supabase (partially wired; draft storage not yet using it)
- Sentry (error tracking), Vercel Analytics (`track()` events), Vercel crons (content generation)
- Deployed to Vercel as `bootfile.ai`
- GitHub: `niho0903/bootfile-app`

## Product taxonomy (don't deviate)

**8 archetypes** (IDs used everywhere):
`surgeon`, `architect`, `sparring`, `translator`, `copilot`, `librarian`, `closer`, `maker`

**9 BootFile sections** (generated output):
First Message, About Me, How I Think, How to Reason With Me, Communication Rules, Format Preferences, Failure Detection, Never Do This, Quick Commands

Any new archetype copy, demo content, excerpts, or trust copy must cover all 8 archetypes. If a spec references 6 archetypes (Architect/Operator/Explorer/Anchor/Builder/Strategist) that's an older taxonomy — rewrite for the 8.

## Commercial state

- **Price:** $4.99 one-time. Brief $1.99 push on 2026-06-09 was reverted same day (~36 hours, no measurement read) after Fable MAX strategy session re-anchored the plan on a positioning rebuild before any further price moves. Do not propose or implement subscription pricing without explicit go-ahead. Variable-isolation rule still holds: positioning rebuild first (Phase 1A), then two-SKU architecture (Phase 1B). Do not bundle price + positioning changes again.
- **Stripe:** LIVE. Real payments flow. Env vars: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. Webhook configured.
- **Refunds:** Terms of Service (`app/terms/page.tsx` §4) updated 2026-06-09 to a **7-day refund** policy (full refund via Stripe within 7 days of purchase, request via support@bootfile.ai, no promised response time). Marketing copy may now reference the 7-day refund. Refund email = `support@bootfile.ai` (existing routing, no new alias).
- **Ads:** Google Ads `AW-18052246616` live but PAUSED through Phase 1A/1B measurement. Reddit pixel `a2_io9m8gl1e3jf` live. "Frustration" creative is the prior Reddit winner. Conversion event fires on `/build/success`.

## Current strategic state

*Last updated 2026-06-10. Refresh when materially different.*

- **Phase 1A homepage rebuild shipped (2026-06-10).** Kicker ("The first personality test your AI can read"), H1 "How do you think?", 8-archetype card grid, artifact section (renders the first lines of `lib/sample-bootfile.ts` as a file card → `/sample`), and "How does the assessment work?" FAQ entry linking `/methodology`. No pricing copy touched — $4.99 unchanged. Phase 1B remains gated on the Architect-spine editorial test, which has NOT been written yet.
- **Fable MAX repositioning lock-in (2026-06-09).** Site is being rebuilt around "The first personality test your AI can read" / "How do you think?" — colloquial-category positioning in hero with the methodology page kept as the technical-honesty layer one click below. Split release: **Phase 1A** rebuilds the homepage (kicker, H1, archetype grid, artifact section, methodology link in FAQ/footer; no new pricing copy). **Phase 1B** ships the two-SKU price architecture and Full Archetype Report, gated by an Architect-spine editorial test (48-hour gap between writer's edit and read).
- **Tonight's go-list shipped (2026-06-09):** $4.99 restored everywhere; "not a personality test" disclaim language deleted from `app/page.tsx` FAQ, `components/build/BuildFAQ.tsx`, and `content/blog/why-your-ai-feels-generic.md`; "5 minutes" standardized to "3 minutes" across copy/metadata/llms.txt/email drip/Reddit cron prompt; `app/terms/page.tsx` §4 rewritten to 7-day refund via Stripe through support@bootfile.ai (last updated 2026-06-09).
- **Ads paused** through Phase 1A/1B for a clean measurement window. Do NOT re-enable until both phases ship and a baseline read exists.
- **Known weak signal:** Pre-rebuild Google + Reddit traffic produced near-zero purchases. The repositioning is the next serious conversion attempt; do not contaminate it with additional variable moves.
- **Strategic lean:** $4.99 holds as baseline through positioning rebuild. Phase 1B targets a two-SKU split ($9.99 BootFile + $19.99 Complete Profile with Full Archetype Report) only if the Architect-spine editorial test passes; otherwise single-SKU $9.99 and the Report becomes Phase 2. Subscription is off the table.
- **Content/marketing agent:** Helena (Enrich Labs) onboarded 2026-03-30. Cron-driven blog + Instagram drafts land in `/content/drafts/`. Published via admin review at `/admin`.
- **Content platform focus:** marketing content should center ChatGPT, Claude, Gemini, Perplexity (per `feedback_content_focus.md` in user memory). Product copy correctly lists all 6 supported platforms — the asymmetry is intentional.

## Known structural bugs

- ~~Blog publish flow broken in production~~ **FIXED & production-verified 2026-06-10.** Publish now flows draft → `/admin` approval → Supabase `blog_posts` → live page with no filesystem write (`lib/drafts.ts` `publishBlogDraft` → `upsertBlogPostSupabase`). First real publish (two posts on 2026-06-10) confirmed end-to-end. The filesystem read path in `lib/blog.ts` remains as a parallel-read fallback for the 10 pre-migration posts; safe to remove after a stability window.
  - **Staleness caveat (fixed 2026-06-16):** blog routes had no `revalidate`, so a *new* slug rendered on-demand once and cached forever — but editing an *already-published* post in Supabase never propagated to the live page (no redeploy, no on-demand revalidation anywhere). Added `export const revalidate = 3600` to `app/blog/[slug]/page.tsx` and `app/blog/page.tsx` so post edits self-propagate hourly. Requires deploy to take effect. If you ever need an instant push, add an on-demand `revalidatePath` route.
- ~~Draft schema inconsistency~~ **Resolved in `02fa873`** — `normalizeFilesystemDraft` in `lib/drafts.ts` folds the legacy Instagram shape into canonical `{id, channel, status, createdAt, content, metadata}`, and all 80 legacy filesystem drafts were backfilled into Supabase `content_drafts` on 2026-06-10 (same normalization), so status updates work on every draft.

## Foundation plan (Phase 0 → 1B)

**Phase 0 — pre-rebuild prep (must land before Phase 1A merges):**
- Install vitest + snapshot test suite for `lib/scoring.ts` (canonical fixtures, distribution invariants, threshold boundaries, question-set integrity). Hard Rule #5 — must precede any quiz changes.
- Quiz-completion persistence to Supabase + nightly `rarity_snapshot` cron. Rarity copy stays gated until threshold sample is in.
- Architect-spine editorial test: write 5 chapters of the Full Archetype Report concept. 48-hour edit gap before reading verdict.
- Fix `lib/drafts.ts` publish flow: move drafts AND published posts to Supabase, normalize the two-schema inconsistency in `app/api/admin/instagram-drafts/route.ts`.

**Phase 1A — homepage rebuild (per Fable HTML mockup):** ✅ shipped 2026-06-10
- Archetype grid, kicker "The first personality test your AI can read," H1 "How do you think?," artifact section, methodology link in FAQ + footer.
- 1A must NOT reference any new pricing. Price stays $4.99 through 1A.

**Phase 1B — pricing architecture (post-Architect-verdict):**
- If spine passes: two-SKU $9.99 BootFile + $19.99 Complete Profile with Full Archetype Report + lifetime platform updates (qualified as "as long as BootFile exists" in FAQ/ToS).
- If spine fails: single-SKU $9.99, Report becomes Phase 2.

**Post-1B (measurement-safe):**
- Read the funnel: `/result → /build` lift, quiz completion, time-on-page. Document the baseline.
- Install PostHog (post-baseline, additive instrumentation only).
- Set hard budget caps and CPA kill-switches on Google/Reddit Ads before re-enabling.

Agents (not before May):
- Content: draft-only autonomy, fact-check gate, admin approval, performance data back to Supabase.
- Competitive intelligence: read-only weekly digest.
- Ad creative generator (not allocator) — generates copy variants for manual approval.
- Explicitly NOT before May: autonomous code→prod, autonomous pricing, autonomous quiz content, autonomous ad budget allocation.

## Hard rules

1. **Single-decision surfaces.** `/result` is a conversion funnel to `/build`. Don't add escape hatches (share, email capture, secondary CTAs) during measurement windows. `/build` is the payment funnel — don't fork that decision either.
2. **Cross-check ToS and Privacy before making marketing or data-handling claims.** ToS §4 currently grants a **7-day refund via Stripe through support@bootfile.ai** (updated 2026-06-09). Other promises — guarantees, SLAs, fingerprinting, behavioral tracking — grep `app/terms/page.tsx` and `app/privacy/page.tsx` first. A marketing claim you shipped beats the ToS in a dispute.
3. **One-time pricing, no subscription** until the user explicitly reverses this. When asked about revenue expansion, propose price increase or adjacent one-time products before recurrence.
4. **Don't invent numbers or citations.** "7-day refund," "2+ hours a day in Claude," "join X users," "backed by research from Stanford," etc. — if the user hasn't told you it's true and you can't cite a specific verifiable source, don't put it in marketing copy. Flag it as a claim that needs validation.
5. **Archetype scoring is product thesis.** `lib/scoring.ts`, `lib/questions.ts`, and `lib/archetypes.ts` encode the taxonomy users pay for. Snapshot diffs in the scoring test suite require explicit human review — never run `vitest -u` in automation. Point-value changes, question edits, threshold changes (Δ≤3 secondary, Δ≤5 tertiary), and tiebreaker changes are all product decisions, not implementation details.
6. **Brand visual system:** colors `#2D2926` (dark), `#F7F4EF` (cream), `#7D8B6E` (sage), `#ECEAE4` (light), `#7A746B` (grey). Font: `font-heading` class for display. Inline styles are the convention — don't introduce CSS modules or styled-components.
7. **Commit policy:** never commit unless the user explicitly asks. Create new commits; don't amend. Push only when asked.

## Where canonical state lives

- `lib/archetypes.ts` — archetype metadata (name, icon, tagline, description)
- `lib/questions.ts` — quiz questions, `ArchetypeId` type
- `lib/archetype-copy.ts` — bridge lines, demo prompts/responses, excerpt fallbacks (8 × N)
- `lib/blog.ts` / `content/blog/` — markdown blog posts with gray-matter frontmatter
- `lib/drafts.ts` / `content/drafts/{blog,instagram}/` — draft CRUD (filesystem; Supabase migration is a known TODO)
- `lib/content-prompts.ts` — Blog & Instagram master prompts for the Claude API
- `lib/admin-auth.ts` — bearer token auth for `/admin` (password in `ADMIN_PASSWORD` env)
- `lib/stripe.ts` / `lib/stripe-client.ts` — Stripe init
- `middleware.ts` — rate limiting, CSRF, security headers
- `content/calendar.json` — content calendar consumed by the marketing agent
- `app/terms/page.tsx` — authoritative terms (refund policy, purchase terms)

## Known open work

- **Supabase migration — production side unverified.** Code landed in `02fa873` (`lib/blog-supabase.ts`, `lib/drafts-supabase.ts`, `/api/admin/migrate-content`), but it's unconfirmed whether the new Supabase tables and the `bootfile_variants` column exist in production, or whether the migration endpoint was ever run. Verify before relying on Supabase-backed publish.
- **Architect-spine editorial test.** Not started. Gates Phase 1B; the 48-hour edit gap doesn't start until the 5 chapters are drafted.
- **Test coverage.** `lib/scoring.test.ts` (25 snapshot/invariant tests) landed in `02fa873`. Broader coverage (API routes, drafts, payment flow) still open.
- **Pre-publish fact-check layer.** Encodes Hard Rule #4 as enforcement. Reads a draft + ToS + Privacy + CLAUDE.md hard rules, returns violations. Must be in place before any content agent has autonomy to auto-publish. Ships April 25.
- **Email capture / list** — no email gate on quiz results. Intentionally deferred until funnel is proven; see strategic state above.
- **TikTok** — profile exists, no content strategy yet.
- **Social proof** — once real purchase numbers exist, add honest counts to `/` and `/build`. Not before.
