# Provider acceptance runbook: paid Brand & AI Kit

Written 2026-11-13. **Status: step 1 done, nothing else run.** Checked again at 21:28 Eastern the same day: a preview read `paymentMode: "live"`, because the only Stripe and Supabase keys present are the production ones. No flag was set. The branch still needs its own Stripe test key, the acceptance database's service role key and a new `STUDIO_ACCESS_TOKEN_SECRET`; `NEXT_PUBLIC_SUPABASE_URL` for the acceptance database is now set on the branch. The acceptance database exists and is migrated; see `docs/DECISION_LOG.md`. No other step has been executed against any host or provider. One correction to the variables table found the same day: the project's existing Stripe, Supabase, model and email values already apply to Preview and are the production ones, so the Stripe keys and the Supabase service role key **must** be overridden on the acceptance branch before any flag is set. This is item 5 of `docs/PAID_BRAND_KIT_RELEASE_PLAN.md` and release gates 3 to 6 of `docs/STAGED_AUTONOMY_RELEASE_POLICY.md`.

The goal is one synthetic paid order for a fictional business, taken from approved intake to a delivered kit and a refund, on a preview deployment, with every provider in its test mode. It is not a production release and it turns nothing on for customers.

## What needs the owner

Only the owner can do these. An agent must not enter keys, change hosting or pay.

1. **Choose the database.** Recommended: a separate Supabase project used only for acceptance. The organization is on the Free plan with one active project (`bootfile`) and one paused. Supabase's documentation, read on 2026-11-13, allows two active free projects and does not count paused ones, so this costs nothing. It keeps synthetic orders out of the production ledger and its revenue totals, and it proves the whole migration chain on an empty database. Fallback: the hosted `bootfile` project, where the test order stays in the ledger and must be refunded and excluded from reporting.
2. **Set the Preview environment variables** listed below, scoped to the branch `rebuild/acceptance` only.
3. **Pay with a Stripe test card** on Stripe's own checkout page, and confirm the email reached the inbox.
4. **Optional, for the scripted path:** generate a Protection Bypass for Automation secret for the `bootfile-app` project. Preview addresses are behind Vercel Authentication (`all_except_custom_domains`, read on 2026-11-13), so a script cannot reach them without it. A browser signed in to Vercel needs nothing extra. The secret is sent as a request header only. Never put it in a URL.

## Environment variables

Names only. Values go into Vercel through its own controls, scope **Preview**, branch **`rebuild/acceptance`**. Do not reuse production values for the two generated secrets.

| Name | Value to use |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | The acceptance database chosen above |
| `STRIPE_SECRET_KEY` | A Stripe **test mode** secret key |
| `STRIPE_WEBHOOK_SECRET` | The signing secret printed by `stripe listen` in step 7 |
| `ANTHROPIC_API_KEY`, `RESEND_API_KEY` | Working keys. Resend needs a verified sender for `STUDIO_EMAIL_FROM` |
| `STUDIO_ACCESS_TOKEN_SECRET`, `CRON_SECRET` | Newly generated random values, 32 characters or more |
| `STUDIO_BASE_URL`, `NEXT_PUBLIC_BASE_URL` | The branch address, `https://bootfile-app-git-rebuild-acceptance-<team>.vercel.app` |
| `STUDIO_CHECKOUT_ENABLED`, `BRAND_KIT_CHECKOUT_ENABLED`, `STUDIO_FULFILLMENT_ENABLED`, `STUDIO_REFUNDS_ENABLED` | `true`, on this branch only |
| `STUDIO_MAX_GENERATIONS_PER_DAY` | `3` |
| `STUDIO_MODEL` | Leave unset first. If the provider rejects `claude-haiku-4-5-20251001`, which is past its published retirement floor, set `claude-sonnet-4-6` |

Checkout stays closed unless every key above is present and all of the first three flags are `true`. Presence is not verification: the steps below are.

## Steps

0. **Record the source.** Create `rebuild/acceptance` at the reviewed head of the stack and note its commit. One push, one build.
1. **Database.** Apply the six existing migrations and `20261113185211_studio_product_versions_v1` to the acceptance database in order. Confirm `studio_product_versions()` reports `brand-foundation-paid-v1` and that no `studio_` function is executable by the anonymous role.
2. **Preflight.** `GET /api/studio/brand-config` must report `deployment: "preview"`, `paymentMode: "test"` and `checkoutEnabled: true`. Scripted: `npm run acceptance:brand -- preflight --url <origin>`. If any of the three differs, stop.
3. **Create the order.** In a browser signed in to Vercel, complete `/brand` for a fictional business, approve the review screen, and enter an inbox you control. The purchase panel must show its test-mode notice. Scripted alternative: `npm run acceptance:brand -- create --url <origin> --email <inbox> --confirm-test-order`.
4. **Pay.** The owner pays on Stripe's page with one of Stripe's published test cards. Stripe returns the browser to the private order page.
5. **Observe fulfillment.** The order page should move from saved, to preparing, to the kit. Scripted: `npm run acceptance:brand -- observe --url <origin> --email <inbox>`. It checks the page data, the three downloads, access without a token, and a replay of the paid intake.
6. **Email.** Two separate observations: the delivery row reaches `accepted`, and the owner sees the message and its attachment in the inbox. The attachment must be the public kit.
7. **Webhook signature and replay.** On the owner's machine: `stripe listen --forward-to <origin>/api/webhooks/stripe`, adding `-H "x-vercel-protection-bypass: <secret>"` if previews are protected. Set the printed signing secret as `STRIPE_WEBHOOK_SECRET` and redeploy before step 3. After payment, resend the completed-checkout event. Expected: accepted again, with no second generation, email or charge.
8. **Refund.** Request the full refund from the order page, or `npm run acceptance:brand -- refund --url <origin> --confirm-test-refund`. Expected: pending, then refunded, and the kit is no longer served.
9. **Database evidence.** Read aggregates only, never intake text: order status and attempts, `model_calls` at most 3, `model_cost_microusd` at most 350,000, whether the cost was estimated, the delivery row, the refund state, and row counts per table.
10. **Close.** Set the four flags back to `false` on the branch or remove its variables, stop `stripe listen`, revoke the bypass secret, and write the observed results into `docs/RELEASE_STATUS.md` with the commit, the times and anything that failed.

## What each observation proves

| Observation | Proves | Does not prove |
| --- | --- | --- |
| Preflight answer | The deployment reports test keys and a preview | That Stripe accepts the key |
| Stripe session opens and is paid | Key valid in test mode, amount and name bound to the order | Anything about live mode |
| Order reaches ready | Payment binding, lease, model call inside the budget, saved output | Kit quality, or behaviour under load |
| Delivery row `accepted` | The email provider took the message | Inbox arrival, which the owner confirms |
| Webhook resend | Signature check and idempotency | Behaviour of out-of-order refund or dispute events |
| Refund completes | Refund binding in test mode | Live refunds or disputes |

## Stop conditions

Stop and change nothing further if preflight reports `production` or `live`, if a checkout address is not a Stripe test session, if a second order or a second email appears for one payment, if the page or the public download carries the private working preferences, or if the recorded model cost exceeds the ceiling. Record what happened first.

## Cost and rollback

Expected cost: one model generation, bounded at $0.35 by the per-order ceiling, one transactional email, one Vercel build for the branch, and nothing at Stripe or Supabase. Rollback is step 10 plus deleting the branch. With a separate acceptance database nothing in production changes. If the hosted database was used instead, the migration has a tested rollback that refuses to run once a versioned order exists, so the test order is refunded and kept, not deleted.

## Still ahead of production

Acceptance does not release anything. Before a real charge: apply the migration to the production database after a rollback-only run, approve the customer wording and the revision allowance, describe this product in `/terms` and `/privacy`, and take an explicit owner decision with the exact commit and rollback plan. One further owner decision belongs here: the production database is on Supabase's Free plan, which that documentation says pauses a project after a week of low activity and reserves automated backups for paid plans. A customer ledger should not depend on either.

## The script

`scripts/brand-acceptance.mjs` creates at most one order per run. It refuses production hosts, any host that is not local or Vercel-generated, any server that does not report a preview on test keys, a checkout address that is not a Stripe test session, and any run without its confirmation flag. Its private state, which holds the order's access token, is written outside the repository. Its evidence file contains statuses, counts, sizes and hashes, and is refused if it contains a token, an address, a payment link or a key. The guards are unit-tested in `lib/studio/acceptance-guards.test.ts`. The script itself has not been run against a deployment.
