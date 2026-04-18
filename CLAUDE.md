# BootFile — Claude Code Context

Auto-loaded at the start of every Claude Code session in this repo. Keep it concise, current, and authoritative. Update the "Current Strategic State" section whenever the live state shifts.

---

## What this is

BootFile (bootfile.ai) is a Next.js SaaS that sells personalized AI instruction profiles. A visitor takes an 18-question quiz → gets assigned one of 8 cognitive archetypes → sees a preview of a generated BootFile → pays $4.99 one-time → unlocks the full 9-section file to paste into ChatGPT / Claude / Gemini / DeepSeek / Copilot / Grok custom instructions.

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

- **Price:** $4.99 one-time. Do not propose or implement subscription pricing without explicit go-ahead. Pricing has been tested at $0.99 and reverted — the lower price signaled "disposable novelty" and violated variable-isolation (don't change price and funnel simultaneously).
- **Stripe:** LIVE. Real payments flow. Env vars: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. Webhook configured.
- **Refunds:** Terms of Service (`app/terms/page.tsx`) says "all purchases are final, no refunds." Marketing copy must match — do NOT reintroduce "7-day refund" or similar claims without updating ToS first.
- **Ads:** Google Ads `AW-18052246616` live. Reddit pixel `a2_io9m8gl1e3jf` live. "Frustration" creative is the current Reddit winner. Conversion event fires on `/build/success`.

## Current strategic state

*Last updated 2026-04-18. Refresh when materially different.*

- **Funnel just redesigned.** `/result` consolidated into a single dark card (commits `05a1cf2`, `71cdfd8`, `86b3b6e` on 2026-04-17). No share buttons, no sticky CTA, no soft exit link — one decision per surface. `/build` got demo + excerpts + trust layer + FAQ on 2026-04-15 (`caad56e`).
- **Measurement anchor: 2026-04-24.** Check `/result → /build` lift. Do NOT layer additional funnel changes before this date — it contaminates the signal.
- **Known weak signal:** Google Ads and Reddit Ads have driven traffic but near-zero purchases pre-redesign. Redesign is the first serious conversion attempt.
- **Strategic lean:** fix conversion at $4.99 first; only consider price changes or adjacent one-time products (gift, check-in, playbook) *after* the current funnel is proven. Subscription is off the table until unit economics at one-time are known.
- **Content/marketing agent:** Helena (Enrich Labs) onboarded 2026-03-30. Cron-driven blog + Instagram drafts land in `/content/drafts/`. Published via admin review at `/admin`.
- **Content platform focus:** marketing content should center ChatGPT, Claude, Gemini, Perplexity (per `feedback_content_focus.md` in user memory). Product copy correctly lists all 6 supported platforms — the asymmetry is intentional.

## Hard rules

1. **Single-decision surfaces.** `/result` is a conversion funnel to `/build`. Don't add escape hatches (share, email capture, secondary CTAs) during measurement windows. `/build` is the payment funnel — don't fork that decision either.
2. **Cross-check ToS before making marketing claims.** Refund promises, guarantees, SLAs, data-handling claims — grep `app/terms/page.tsx` first. A marketing claim you shipped beats the ToS in a dispute.
3. **One-time pricing, no subscription** until the user explicitly reverses this. When asked about revenue expansion, propose price increase or adjacent one-time products before recurrence.
4. **Don't invent numbers.** "7-day refund," "2+ hours a day in Claude," "join X users," etc. — if the user hasn't told you it's true, don't put it in marketing copy. Flag it as a claim that needs validation.
5. **Brand visual system:** colors `#2D2926` (dark), `#F7F4EF` (cream), `#7D8B6E` (sage), `#ECEAE4` (light), `#7A746B` (grey). Font: `font-heading` class for display. Inline styles are the convention — don't introduce CSS modules or styled-components.
6. **Commit policy:** never commit unless the user explicitly asks. Create new commits; don't amend. Push only when asked.

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

- **Supabase for production draft storage** — filesystem-based drafts won't survive Vercel deploys. Not yet migrated.
- **Email capture / list** — no email gate on quiz results. Intentionally deferred until funnel is proven; see strategic state above.
- **TikTok** — profile exists, no content strategy yet.
- **Social proof** — once real purchase numbers exist, add honest counts to `/` and `/build`. Not before.
