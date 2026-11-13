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

Hosted state was re-read later on 2026-11-13 once connectors were added. **Supabase:** the same six migrations are applied; `studio_orders`, `studio_order_events`, `studio_deliveries`, `operations_runs`, `operations_decisions`, `studio_feedback`, `studio_feedback_requests` and `operations_publications` each hold zero rows; `blog_posts` holds 12 and `content_drafts` 83; the server is PostgreSQL 17; every `studio_` table has row-level security and none of the 19 `studio_` functions is executable by the anonymous role. **Railway:** one service, latest deployment `783bbcb2` (2026-10-24) successful, no staged changes. Both match the handoff. **Vercel:** read on 2026-11-13 after the owner approved team access. The team was on the Hobby plan at that reading and was moved to Pro by the owner at 20:18 UTC the same day, per the team's event log. Production serves `master` at `5ede597`, built 2026-10-22, which matches the handoff. Preview deployments for the heads of PRs #5, #6 and #7 reached READY. A preview being built is not hosted acceptance: no preview was exercised with provider credentials. The Vercel project `personal-site` is also connected to this repository and builds every push: its commit status appears on `5ede597` (failed), `73ed664`, `bfa0ab8` and `aa13a96`. That project is outside this work and was not touched; disconnecting it from this repository is the owner's action.

## What differs from the handoff

1. **A paid synthesis candidate already exists.** PR #4 adds `lib/brand-kit/synthesis.ts`, `paid-intake.ts` and `paid-output.ts` with tests, and `docs/PAID_BRAND_KIT_RELEASE_PLAN.md`. The work starts from that candidate, not from the template prototype in PR #3.
2. **The version identifier in code is `brand-foundation-paid-v1`.** The handoff proposed `brand-ai-kit-v1` subject to inspection. The existing identifier is kept.
3. **The growth v2 design is written down** on growth PR #2.
4. **bootfile-app is a public repository.** Every branch, operating document and migration is world-readable. Visibility is an owner decision.
5. **Both allowed models are legacy.** `claude-haiku-4-5-20251001` is past its published "not sooner than 2026-10-15" retirement floor and `claude-sonnet-4-6` has a floor of 2027-02-17. The current small model lists at one tenth of the Haiku 4.5 price. Moving the allow-list is recommended before provider acceptance, with an output-quality check, and it lowers cost.
6. **CI does not run on every stacked PR.** `verify.yml` runs for pushes to `master` and `rebuild/**` and for PRs whose base is one of those. A PR based on a `build/**` branch gets no run. This branch carries a `rebuild/` name so a push is verified.
7. **The Verify gate is red on the whole rebuild line as of 2026-11-13.** `npm audit --omit=dev --audit-level=high` fails on advisory GHSA-mrhx-c7xc-m3w5 in `zod` 4.3.6, a transitive dependency of `@anthropic-ai/sdk`. The lockfile is identical on #2, #3 and #4, so a re-run of any of them stops at the audit step; their earlier successful runs are no longer current evidence. This branch carries a three-line lockfile change to 4.6.7 as its own commit so it can be cherry-picked to the base of the stack. Five moderate advisories remain below the gate's threshold and were not assessed.

8. **Hosting is on a plan that does not cover a paid product.** The Vercel team is on Hobby. Vercel's published terms, read on 2026-11-13, limit Hobby to non-commercial use and count taking payments as commercial. `docs/LEGACY_PRODUCT_CONTEXT.md` records live Stripe payments for the original $4.99 product on this deployment; Stripe itself has not been inspected. A paid plan is a new subscription and an owner decision, to be settled before Brand Kit checkout opens. **Resolved later on 2026-11-13:** the owner moved the team to Pro. Builds are billed on a paid team, and the plan change moved every project to Elastic build machines, so each push to this repository now costs build time on two projects, `bootfile-app` and `personal-site`.
9. **Making the repository private stops agent previews on any plan.** Vercel's rules for private repositories, read the same day: on Hobby a commit deploys only when its author is the team owner, and on Pro or Enterprise only when its author is a team member. Commits on the rebuild line are authored by an agent identity that is neither. The repository is left public until the owner chooses with that trade-off stated.

## Gaps in dependency order

| # | Gap | Evidence | Status |
| --- | --- | --- | --- |
| 1 | Versioned paid intake and approval | `paid-intake.ts` validates version, terms, backbrief snapshot and limits. `POST /api/studio/brand-orders` accepts it behind two default-off flags. The `/brand` page offers the paid kit only when `GET /api/studio/brand-config` reports checkout open, then posts the approved brief. | Done in source in the fifth increment. The open-state wording needs the owner's approval. |
| 2 | Per-order model ceilings for calls, tokens and cost | `lib/studio/model-budget.ts` | Done in this increment |
| 3 | Generation dispatched by the order's persisted version | `lib/studio/dispatch.ts`, `worker.ts` | Done in this increment, inert until gap 4 |
| 4 | Schema admits only one product | Migration `20261113185211_studio_product_versions_v1`, its rollback and `studio_product_versions_smoke.sql` | Done in source in the second increment. Not applied to the hosted database. |
| 5 | Commerce binds to one constant | `lib/studio/products.ts`; `checkout.ts`, `payments.ts` and `refunds.ts` now resolve the product from the order's persisted version. | Done in source in the third increment. Provider acceptance in Stripe test mode has not been run. |
| 6 | Versioned delivery, order page and download | `lib/studio/outputs.ts`, `delivery.ts`, the download route, `studioOrderView` and `components/studio/BrandKitOrderView.tsx` render each order by its own persisted version. | Done in source in the fourth increment. Inbox arrival and hosted rendering are unverified until gap 10. The Stripe receipt was not touched. |
| 7 | Synthesis is thinner than the promised kit | The candidate returns positioning, voice rules, one email, three posts and source quotations. It has no messaging hierarchy, differentiator hypotheses, missing or contradictory fact detection, independent content check, saved-output graphics, PDF, or bounded refinement. | Not started. A second model stage raises per-order cost and needs approval. |
| 8 | Durable customer state | The prototype stores drafts in the browser tab. | Not started |
| 9 | Customer promises | Terms, privacy and pricing copy describe Marketing Setup. The refinement allowance is undefined. | Owner decision before any charge |
| 10 | Provider and hosted acceptance | Stripe test mode, model schema and usage, email acceptance versus inbox arrival, authorized hosting access. | Prepared in the sixth increment: `docs/PROVIDER_ACCEPTANCE_RUNBOOK.md` and a guarded script. Not run. Waits on the owner for keys, a database choice and the test payment. |
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

## Third increment

Branch `rebuild/versioned-checkout-20261113`, stacked on the second.

- `lib/studio/products.ts`: the registry of sold product versions. Checkout parameters, paid-session verification, reconciliation, webhook handling and refunds all resolve the product from the version persisted on the order. A session or payment for one product can never mark, resume or refund an order of the other.
- `POST /api/studio/brand-orders` and `createBrandKitCheckout`: the paid Brand & AI Kit intake. Closed unless `BRAND_KIT_CHECKOUT_ENABLED` and `STUDIO_CHECKOUT_ENABLED` are both `true` and the product-version schema is present. With a flag off the route answers 503 without reading the request. When open it saves the approved intake with its version and model budget before any payable session exists.
- The prelaunch smoke now asserts that route is closed in a production build.

Verification on this source: `npm run typecheck` exit 0, `npm run lint` 0 errors, `npm test` 239 passed in 23 files, `npm run test:sql` passes, dependency audit exit 0. No Stripe, model or email call was made; every provider is mocked in tests. The name and one-line description that will appear on the Stripe checkout page are customer wording and need the owner's approval before either flag is turned on.

## Fourth increment

Branch `rebuild/versioned-delivery-20261113`, stacked on the third.

- `lib/studio/outputs.ts`: the two accessors through which a saved output is read as a product. Each checks the order's persisted version against the output's own schema version and refuses a crossing with `output_version_mismatch`. Delivery, download and the order view all go through them.
- Delivery email: a Brand & AI Kit order has its own subject, body and attachment, `bootfile-brand-ai-kit.md`, which is the public kit. The Marketing Setup message keeps its wording. An unknown version is refused with `delivery_version_unsupported`.
- Download: `GET /api/studio/orders/[id]/download` serves the public kit as Markdown, or as JSON with `format=json`. The copy that includes the owner's private working preferences is served only for `scope=private`; any other value gets the public copy.
- Order view: `studioOrderView` returns the product name, the public allowlist of the kit, and the public assistant instructions and review checklist. Private working preferences are never in the page payload, and nothing is returned once a refund is requested.
- Order page: `components/studio/BrandKitOrderView.tsx` shows the foundation, voice guide, visual starter kit, first campaign, AI working instructions, source quotations and review checklist, with the private copy behind its own button. `StudioOrderClient` takes its labels from the order's own product.

Verification on this source: `npm run typecheck` exit 0, `npm run lint` 0 errors, `npm test` 245 passed in 24 files, `npm run test:sql` passes, dependency audit exit 0. Every provider is mocked; no Stripe, model or email call was made and no flag was changed. Not verified: inbox arrival, the page in a hosted browser, and an accessibility pass on the new view. The Brand & AI Kit email body and the on-page labels are new customer wording, shown to no one while checkout and fulfillment are closed, and need the owner's approval with the checkout wording.

## Fifth increment

Branch `rebuild/brand-page-checkout-20261113`, stacked on the fourth.

- `GET /api/studio/brand-config`: tells the page whether to offer the paid kit. It reads nothing from the request and is closed unless both checkout flags are on, the product-version schema is present and capacity remains. It also carries the name, description and price the customer is shown, so the page invents none of them.
- `lib/brand-kit/paid-checkout.ts`: the browser's half. It reads any unexpected readiness answer as closed, builds the paid intake only while the stored approval still describes the answers on screen, reuses one request key per distinct intake, and will send the browser only to `https://checkout.stripe.com`.
- `components/brand/BrandKitPurchase.tsx` and `BrandStudio.tsx`: with checkout closed the page is unchanged and offers no purchase. With it open, an approved kit that is not the fictional example gets a purchase panel asking for a delivery email and acceptance of the Terms, and four lines that say no purchase exists are replaced. Answers leave the browser only when the customer presses the payment button.
- `brandBackbriefSnapshot` moved to the browser-safe `kit.ts` so the page and the server compute the approval from one function.
- `lib/studio/order-wording.ts`: the shared order page, where Stripe returns the buyer, takes its headings, waiting text and restart link from the product that was bought and names no product before the order has loaded. Before this, a Brand & AI Kit buyer would have read Marketing Setup wording while waiting and in the ready heading.

Verification on this source: `npm run typecheck` exit 0, `npm run lint` 0 errors, `npm test` 261 passed in 25 files, `npm run test:sql` passes, dependency audit exit 0. `scripts/brand-browser-smoke.mjs` gained a ninth group that simulates open checkout: the readiness answer, the order answer and the Stripe page are stand-ins at the browser's network boundary while the server stays closed. It checks that the example cannot be bought, that nothing is offered before approval, that an invalid email never reaches the server, that a retry reuses its request key, and that the only redirect is to Stripe. All nine groups passed locally in Chrome against a development server; CI runs them against the production build. A payload captured from that browser run was accepted by `validatePaidBrandIntake`.

Not verified: a real Stripe session, the return from Stripe to the order page, and anything on a hosted deployment. Known limits: a kit started from the fictional example stays labelled an example and cannot be bought until the draft is cleared; the draft still lives only in the browser tab (gap 8); and `/terms` and `/privacy` do not yet describe this product (gap 9).

## Sixth increment

Branch `rebuild/hosted-acceptance-kit-20261113`, stacked on the fifth.

- `docs/PROVIDER_ACCEPTANCE_RUNBOOK.md`: the ordered steps for one synthetic paid order on a preview in provider test modes, the Preview-scope variable names, what each observation proves and does not prove, stop conditions, cost and rollback.
- `GET /api/studio/brand-config` now also reports `paymentMode` (from the Stripe key's prefix) and `deployment` (from the host). The purchase panel shows a test-mode notice when the server reports test keys.
- `scripts/brand-acceptance.mjs` with `scripts/lib/acceptance-guards.mjs`: preflight, create, observe and refund phases. It refuses production hosts, servers that do not report a preview on test keys, checkout addresses that are not Stripe test sessions, and runs without a confirmation flag. Private state stays outside the repository and evidence is refused if it carries a token, an address, a payment link or a key.

Hosted facts read on 2026-11-13 for this increment: the Vercel project protects every address except custom domains with Vercel Authentication, which is why earlier hosted QA stopped at a sign-in wall; the Supabase organization is on the Free plan with one active project and one paused.

Verification on this source: `npm run typecheck` exit 0, `npm run lint` 0 errors, `npm test` 270 passed in 26 files, `npm run test:sql` passes, dependency audit exit 0. The script was exercised only for its refusals, which happen before any request is sent. It has not been run against a deployment, and no provider was called.

## Owner decisions

Recorded in `docs/DECISION_LOG.md`. Decided on 2026-11-13: the handoff brief governs and Bootfile is outside any short-term revenue target; the $0.35 per-order model ceiling is approved; the repository should be private, not yet executed because of the preview trade-off above; hosting moved to Vercel Pro. Still open: build spend from the second connected project, the bounded refinement allowance behind the $49 promise, the Brand & AI Kit checkout, purchase-panel and delivery wording, and whether an independent second model stage is wanted at up to roughly double the per-order ceiling.
