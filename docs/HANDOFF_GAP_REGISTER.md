# Handoff gap register

Recorded 2026-11-13 at the owner's handoff to a new operator. The evidence is source inspection at the exact SHAs below and local verification of this branch. It is not hosted acceptance, provider acceptance, or customer evidence. Nothing here activates checkout, model calls, email, refunds, publishing, or a scheduler.

## Source state verified on 2026-11-13

| Repository | Branch | PR | Head | Observation |
| --- | --- | --- | --- | --- |
| bootfile-app | `master` | n/a | `5ede597` | Last commit 2026-10-22, an Instagram draft written by the legacy growth agent. |
| bootfile-app | `rebuild/task-studio-20261020` | #2 | `73ed664` | Matches the handoff. Base `master`. |
| bootfile-app | `rebuild/brand-kit-20261021` | #3 | `b612d88` | Matches the handoff. Stacked on #2. |
| bootfile-app | `build/paid-brand-synthesis-20261023` | #4 | `82bfe33` | Not in the handoff. Nine commits stacked on #3. |
| bootfile-growth-agent | `rebuild/studio-operations-20261020` | #1 | `46e5dc5` | Matches the handoff. Open draft. |
| bootfile-growth-agent | `ops/growth-suspension-brand-kit-plan-20261023` | #2 | `be3ff30` | Not in the handoff. One design document stacked on #1. Open draft. |

Hosted state was re-read later on 2026-11-13 once connectors were added. **Supabase:** the same six migrations are applied; `studio_orders`, `studio_order_events`, `studio_deliveries`, `operations_runs`, `operations_decisions`, `studio_feedback`, `studio_feedback_requests` and `operations_publications` each hold zero rows; `blog_posts` holds 12 and `content_drafts` 83; the server is PostgreSQL 17; every `studio_` table has row-level security and none of the 19 `studio_` functions is executable by the anonymous role. **Railway:** one service, latest deployment `783bbcb2` (2026-10-24) successful, no staged changes. Both match the handoff. **Vercel:** still returns 403 for the team scope; it needs the owner's one-time team approval, so deployments and the team plan remain unverified.

## What differs from the handoff

1. **A paid synthesis candidate already exists.** PR #4 adds `lib/brand-kit/synthesis.ts`, `paid-intake.ts` and `paid-output.ts` with tests, and `docs/PAID_BRAND_KIT_RELEASE_PLAN.md`. The work starts from that candidate, not from the template prototype in PR #3.
2. **The version identifier in code is `brand-foundation-paid-v1`.** The handoff proposed `brand-ai-kit-v1` subject to inspection. The existing identifier is kept.
3. **The growth v2 design is written down** on growth PR #2.
4. **bootfile-app is a public repository.** Every branch, operating document and migration is world-readable. Visibility is an owner decision.
5. **Both allowed models are legacy.** `claude-haiku-4-5-20251001` is past its published "not sooner than 2026-10-15" retirement floor and `claude-sonnet-4-6` has a floor of 2027-02-17. The current small model lists at one tenth of the Haiku 4.5 price. Moving the allow-list is recommended before provider acceptance, with an output-quality check, and it lowers cost.
6. **CI does not run on every stacked PR.** `verify.yml` runs for pushes to `master` and `rebuild/**` and for PRs whose base is one of those. A PR based on a `build/**` branch gets no run. This branch carries a `rebuild/` name so a push is verified.
7. **The Verify gate is red on the whole rebuild line as of 2026-11-13.** `npm audit --omit=dev --audit-level=high` fails on advisory GHSA-mrhx-c7xc-m3w5 in `zod` 4.3.6, a transitive dependency of `@anthropic-ai/sdk`. The lockfile is identical on #2, #3 and #4, so a re-run of any of them stops at the audit step; their earlier successful runs are no longer current evidence. This branch carries a three-line lockfile change to 4.6.7 as its own commit so it can be cherry-picked to the base of the stack. Five moderate advisories remain below the gate's threshold and were not assessed.

## Gaps in dependency order

| # | Gap | Evidence | Status |
| --- | --- | --- | --- |
| 1 | Versioned paid intake and approval | `paid-intake.ts` validates version, terms, backbrief snapshot and limits. No route calls it. | Candidate only |
| 2 | Per-order model ceilings for calls, tokens and cost | `lib/studio/model-budget.ts` | Done in this increment |
| 3 | Generation dispatched by the order's persisted version | `lib/studio/dispatch.ts`, `worker.ts` | Done in this increment, inert until gap 4 |
| 4 | Schema admits only one product | Migration `20261113185211_studio_product_versions_v1`, its rollback and `studio_product_versions_smoke.sql` | Done in source in the second increment. Not applied to the hosted database. |
| 5 | Commerce binds to one constant | `checkout.ts`, `payments.ts` and `refunds.ts` compare Stripe objects to `STUDIO_PRODUCT` in about forty places. | Not started. Needs a registry keyed by the persisted version. |
| 6 | Versioned delivery, order page and download | Renderers for Markdown and JSON exist in `paid-output.ts`. Email, receipt, order view and download understand only the old product. | Fails closed as of this increment. Renderers not built. |
| 7 | Synthesis is thinner than the promised kit | The candidate returns positioning, voice rules, one email, three posts and source quotations. It has no messaging hierarchy, differentiator hypotheses, missing or contradictory fact detection, independent content check, saved-output graphics, PDF, or bounded refinement. | Not started. A second model stage raises per-order cost and needs approval. |
| 8 | Durable customer state | The prototype stores drafts in the browser tab. | Not started |
| 9 | Customer promises | Terms, privacy and pricing copy describe Marketing Setup. The refinement allowance is undefined. | Owner decision before any charge |
| 10 | Provider and hosted acceptance | Stripe test mode, model schema and usage, email acceptance versus inbox arrival, authorized hosting access. | Not started |
| 11 | Growth service | Content contract still describes Marketing Setup. Production runs an idle placeholder per the handoff. | Not started |
| 12 | Unattended operations | Two observed five-minute runs and a tested support destination. | Not started |
| 13 | Customer value | Pilot of about ten owners against a strong free alternative. | Not started |

The smallest coherent path is 4, then 5, then 6, which together let one synthetic paid order travel from approved intake to a saved, delivered kit in provider test modes. Gap 7 decides whether the kit is worth $49 and should be settled with the pilot design, not after it.

## This increment

Branch `rebuild/order-model-budget-20261113`, stacked on `82bfe33`.

- `lib/studio/model-budget.ts`: per-version ceilings and a guard that refuses before any provider spend. Unpriced models and unbudgeted versions are refused. A missing token count is charged at the worst case, never as zero.
- `lib/studio/dispatch.ts` and `lib/studio/worker.ts`: the worker selects the generator from the order's persisted `product_version`. Marketing Setup orders take the original path unchanged. Brand Kit failures are journaled under their own codes.
- `lib/brand-kit/synthesis.ts` and `paid-intake.ts`: the provider request is built by one pure function, measured before sending, and an intake whose request would exceed the cap is rejected before checkout instead of after payment.
- `lib/studio/delivery.ts`, `lib/studio/db.ts`, download route: a saved output is rendered only by the product version that produced it.

| Ceiling for `brand-foundation-paid-v1` | Value |
| --- | --- |
| Provider calls per order | 3 |
| Request size per call | 16,000 bytes, which bounds input at 17,000 tokens |
| Output per call | 4,000 tokens |
| Worst case per call | $0.037 on Haiku 4.5, $0.111 on Sonnet 4.6 |
| Ceiling per order, all attempts | $0.35 |
| Estimated typical call, unmeasured | about $0.01 on Haiku 4.5 |

Verification on this source: `npm ci` and `npm audit --omit=dev --audit-level=high` exit 0 after the lockfile fix. `npm run typecheck` exit 0. `npm run lint` 0 errors. `npm test` 226 passed in 22 files, 15 of them new. `npm run build` could not complete in the build sandbox because Google Fonts was unreachable; the Verify workflow run on this branch is the build and smoke evidence. No provider was called. No flag, route, migration or production setting changed.

## Second increment

Branch `rebuild/product-versions-schema-20261113`, stacked on the first.

- `supabase/migrations/20261113185211_studio_product_versions_v1.sql`: admits `brand-foundation-paid-v1` beside `marketing-setup-v1`, ties each saved output to its own version's schema, binds a model budget on every versioned order at creation, and adds a usage ledger that also counts failed attempts. The seven-day refund covers both products. Every existing function keeps its signature and the original creation path is untouched.
- `supabase/rollbacks/`: the matching rollback. It refuses to run once a versioned order exists.
- `scripts/sql-smoke.sh` (`npm run test:sql`): applies all seven migrations to a disposable local Postgres, proves the rollback restores the exact prior schema, and runs all six smoke suites. It touches no hosted database.
- The order row now stores the validated intake with a digest of the approved backbrief. The worker re-checks that digest before any model call and meters failed attempts through `studio_fail_metered_generation`.

The new size tests found one defect and one thin margin, both fixed before commit. A maximal Brand Kit (every field at its validated maximum, in a three-byte script) measures 101,140 bytes, above the 100,000-byte output bound it would have inherited, so that version has its own 150,000-byte bound. A saved intake that repeated the approved backbrief measures 23,125 bytes for the largest accepted brief, within 4 percent of the 24,000-byte intake bound, so the row stores a digest instead of a second copy and measures 11,656 bytes.

Verification on this source: `npm run test:sql` passes (seven migrations, rollback restores the baseline, six suites). Each of three seeded defects makes the new suite fail. `npm run typecheck` exit 0, `npm run lint` 0 errors, `npm test` 229 passed, dependency audit exit 0. The migration has not been applied to the hosted project; that belongs with the release step for the checkout that needs it, after a rollback-only run against the hosted database.

## Owner decisions

Recorded in `docs/DECISION_LOG.md`. Decided on 2026-11-13: the handoff brief governs and Bootfile is outside any short-term revenue target; the $0.35 per-order model ceiling is approved; the repository should be private. Still open: the bounded refinement allowance behind the $49 promise, and whether an independent second model stage is wanted at up to roughly double the per-order ceiling.
