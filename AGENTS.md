# Bootfile operating instructions

## Owner intent

On 2026-10-20 the owner authorized rebuilding Bootfile into a revenue-generating product and having agents build and manage the infrastructure, with only a handful of material owner decisions. Work autonomously within that goal. Prepare concrete, tested changes and evidence before escalating an actual blocker.

The active offer is a $49 one-time Marketing Setup: an approved business brief, one promotional email, three coordinated social posts, reusable AI context and workflow, and a review checklist. AI drafts require the customer's review before publication. The original $4.99 profile product remains compatible. Subscriptions and paid acquisition remain unauthorized; the paid acquisition allocation is $0.

## Source of truth

- `lib/studio/types.ts`: offer, fixed price, input and output contract.
- `lib/studio/`: payment binding, generation, validation, capabilities, delivery, and refunds.
- `supabase/migrations/`: additive, reviewed database changes. Generate filenames with `supabase migration new`.
- `lib/operations/`, `/operations`, and `docs/OPERATING_CHARTER.md`: permitted jobs, measurements, and exceptions.
- `docs/RELEASE_STATUS.md`: observed deployment and verification evidence, including remaining access blockers.
- `app/terms/page.tsx` and `app/privacy/page.tsx`: actual customer commitments and data handling.
- `docs/LEGACY_PRODUCT_CONTEXT.md`: historical quiz positioning; not the current rebuild plan.

## Autonomy and change control

Agents may inspect, implement, test, prepare isolated branches/PRs, recover failed jobs within code-defined limits, and update runbooks. Routine maintenance should not create a daily owner approval burden. Production changes require functioning authorized access, passing release checks, a known rollback target, and the operating policy's scope. Prepare and escalate material changes to the product, price, customer promises, spending, access permissions, destructive data operations, or disputed payments.

Do not bypass a denied provider scope, switch organizations to evade denial, retrieve secrets for display, or invent missing credentials. Do not send unsolicited messages, start promotional campaigns, or raise spending. A provider access blocker does not stop unrelated preparation and verification.

## Payment and data boundaries

Never fulfill on a browser redirect alone. Verify Stripe's signature and retrieve current provider payment state; bind the order, product, version, quantity, amount, and currency. Persist the paid order before acknowledging the event. Keep generation and email delivery in independent durable ledgers with leases and bounded attempts. Persist validated output before delivery. Never erase or consume the customer's only recovery path before success.

New checkout is disabled until its release configuration and provider tests succeed. API secrets stay server-side. New private database tables and RPCs are service-role only with RLS and explicit revocation of public/anon/authenticated access. Order access uses a private capability in a URL fragment and session storage, never query strings or analytics. Do not log briefs, email addresses, raw provider bodies, or access tokens.

Customer-requested full refunds follow the existing seven-day policy, are bound to the original $49 payment, and use a stable idempotency key plus provider reconciliation. Never accept a destination or amount from a browser. Non-card methods, disputes, partial/prior failed refunds, ambiguous provider state, and policy exceptions require service review. Never execute a real test charge, refund, email, or campaign without the relevant authorization.

## Quality and evidence

Run meaningful tests for payment/authentication/lease/retry/privacy changes, `npm run typecheck`, `npm run lint`, and `npm run build`. Do not hide failed checks or blindly update snapshots. Existing archetype scoring, question weights, thresholds, and taxonomy changes remain owner product decisions; never run `vitest -u` automatically.

Separate observed facts from assumptions. No fabricated testimonials, user counts, revenue, quality scores, citations, or guaranteed marketing results. A provider-accepted email is not inbox arrival. A download is not actual use. A written scheduler is not an active scheduler. State missing measurements as unavailable.

Keep the existing cream, dark, and sage brand, accessible controls, responsive layout, and narrow CSS scope. Preserve original purchase recovery and avoid destructive migrations. Update release evidence whenever actual deployment state changes.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
