# Bootfile Studio operations runbook

Updated 2026-10-20. Use this with `OPERATING_CHARTER.md`, the Studio commerce implementation, and the repository release instructions.

## Entry points

| Surface | Authentication | Purpose |
| --- | --- | --- |
| `/operations` | Existing admin password, held in tab memory | Order aggregates, configuration presence, run history, active decisions |
| `GET /api/operations/status` | `Authorization: Bearer <ADMIN_PASSWORD>` | Read a fresh private snapshot; never starts work |
| `GET /api/operations/run` | `Authorization: Bearer <CRON_SECRET>` | Run the bounded scheduled work |
| `POST /api/operations/run` | `Authorization: Bearer <ADMIN_PASSWORD>` | Run the same work from the owner UI |
| `POST /api/operations/publish` | `Authorization: Bearer <GROWTH_PUBLISHER_SECRET>` | Independent owned-blog review and limited publication under separate default-off flags |
| `PATCH /api/operations/publish` | Existing admin bearer credential | Withdraw only the exact unchanged owned article identified in its private audit |
| `GET/POST /api/operations/drafts` | `Authorization: Bearer <GROWTH_AGENT_SECRET>` | Idempotent pending-draft ingestion; cannot publish |
| `PATCH /api/operations/decisions` | Existing admin bearer credential | Record acknowledgment or resolution; no external side effects |

Server-to-server bearer requests are authenticated by the endpoint; an Origin header does not substitute for the credential. Do not put any credential in a URL, a checked-in file, a screenshot, an issue, or an agent log. The browser receives presence booleans, never environment secret values. The service-role database key is server-only.

## Database deployment

Apply the Studio commerce migration before `supabase/migrations/20261020192124_operations_control_v1.sql`. The operations migration adds two private tables, an aggregate function, and private run-claim/finalization functions. It enables RLS, revokes client-role access, and grants only the server service role the required permissions. It does not modify or delete legacy orders.

Before applying to production, inspect the actual schema and confirm the Studio column names in the aggregate function. After applying, use the rollback-only `supabase/tests/operations_control_smoke.sql` only on empty Studio and operations tables, then verify:

- `get_operations_metrics` returns exact counts and amounts using the service role.
- `anon` and `authenticated` have no table privileges or function execute privilege on the operating ledger.
- `/api/operations/status` returns 401 without the admin credential and displays real empty counts only after successful queries.
- A missing migration produces unavailable metrics, not zero sales.

The runner requires a successful database-clock claim and inserted audit row before it invokes any payment, refund, or fulfillment work. If this claim fails, its response is `run_ledger_unavailable` and it performs no reconciliation or generation.

## Runtime configuration

Required existing production configuration: `ADMIN_PASSWORD`, `CRON_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ANTHROPIC_API_KEY`, and `RESEND_API_KEY`, plus the Studio-specific commerce configuration documented by that implementation.

`BOOTFILE_OPERATIONS_PAUSED=true` stops reconciliation and fulfillment dispatch while preserving run/health recording. It is an operational control, not an instruction to cancel or refund orders. Pausing the runner does not itself disable new checkout; use the Studio checkout flag when sales must pause as well. A resumed run only considers work eligible under the durable Studio state machine.

The dashboard reports environment key presence only. Presence is not proof of a valid Stripe account, correct webhook destination, approved email sender, funded model account, or a running schedule. Verify those separately with an actual test transaction and the provider's deployment interface.

Paid acquisition remains fixed at $0 in the operating policy. The scheduler has no ad-spend or promotional-message action.

## Schedule and execution proof

The repository's `vercel.json` contains a daily `GET /api/operations/run` fallback at 14:00 UTC (`0 14 * * *`) and the separate weekly rarity snapshot at 15:00 UTC on Sundays (`0 15 * * 0`). The daily fallback alone does not satisfy the dashboard's twenty-minute freshness requirement. Normal five-minute recovery requires the optional Railway scheduler described in `GROWTH_AGENT_MIGRATION.md`, with its dedicated configured endpoint and `BOOTFILE_CRON_SECRET`; it defaults off. Confirm the actual deployed schedule and current hosting-plan limits. None of these source files proves an activated schedule. The route's maximum execution duration is 300 seconds.

A private database function serializes owner and cron claims, computes their shared UTC five-minute key using database time, and grants a six-minute lease. A live lease or existing window key yields `skipped` without provider work. The lease prevents adjacent-window overlap and exceeds the 300-second route limit. Only a current unexpired run can record completion. An expired run keeps its unknown outcome; a new run does not label it successful or failed. Per-order, email, and refund leases remain the side-effect boundary, including customer-triggered work outside this scheduler.

The loop checks at most two pending payment sessions, then runs at most two refund recoveries concurrently with the Studio worker for at most two eligible orders. The two lanes use their existing durable claims; a pending refund blocks fulfillment. This avoids stacking the refund provider timeout budget after generation and email. A deployment timeout or unavailable database can still leave an unknown run; no timer claims to cancel a provider action already in flight. It records counts and safe error codes, without intake text or email addresses. Missing provider keys do not consume paid generation attempts.

A committed schedule file is insufficient execution evidence. After deployment:

1. Verify the production deployment SHA, environment targets, and cron route in the provider.
2. Observe a cron-authenticated row in `operations_runs` and a final completed/partial/failed status.
3. Observe the next scheduled invocation without manually calling the route.
4. Check that a paid test order transitions to a saved setup and a durable delivery record; distinguish provider acceptance from inbox arrival.
5. Confirm the same order is not charged or sent again when a webhook or run is repeated.

The dashboard says **cron-authenticated invocation**, because that is what the application can directly prove. A caller holding the cron secret can also invoke the route manually. Provider schedule confirmation remains separate evidence.

## Recovering a paid order

Read the order state, last error code, generation attempts, lease expiration, payment binding, and any `studio_deliveries` record. Do not include customer intake in a general operating report.

If payment is still awaiting confirmation, run bounded reconciliation. If the order is already paid and queued, let the worker acquire the normal lease. If a lease is unexpired, do not start a second generation. If generation is saved but email failed, recover the receipt without generating a replacement setup.

Repair missing provider credentials or a transient provider failure before resetting a terminal attempt state. When an attempt ceiling is reached, preserve the original evidence and use a reviewed recovery operation; do not silently set attempts back to zero on every cron run. An agent can investigate and prepare this ordinary repair without making it an owner product decision.

If the customer asks for a refund, use `POST /api/studio/orders/[id]/refund` with that order's bearer capability once the handler is deployed and verified. It must bind to the original payment and enforce the existing seven-day full-refund policy and idempotency. Provider confirmation can come from an authenticated Stripe API response or a signed webhook, with the same payment binding and idempotency checks. Acknowledge a dispute or an outside-policy request as an exception; do not invent eligibility or send funds to a different destination.

## Error meanings

| Code/state | Meaning | Action |
| --- | --- | --- |
| `database_not_configured` | Server database client unavailable | Repair deployment configuration |
| `run_ledger_unavailable` | Durable run claim failed or did not positively confirm ownership | Check migration, permissions, and database access before paid dispatch |
| `run_already_active` | Another owner/cron run holds its six-minute lease | No duplicate dispatch; wait for the current run or its expiry |
| `run_already_recorded_for_window` | Duplicate invocation | No repair needed; wait for the next normal window |
| `payment_configuration_missing` | Stripe secret missing | Repair configuration; do not infer unpaid orders are paid |
| `fulfillment_configuration_missing` | Model or delivery key missing | Repair configuration; attempts have not been consumed by this loop |
| `payment_reconciliation_failed` | One or more Stripe reconciliation operations failed | Inspect relevant safe server logs and payment provider state |
| `fulfillment_requires_review` | Worker reported a terminal generation/email failure or an error | Inspect order/delivery evidence and repair the cause |
| `run_completion_not_persisted` | Work may have happened; final audit update failed or its lease expired | Treat the result as unknown; read order/provider state before retrying |
| Run still `running` after ten minutes | Response/process may have timed out | Inspect logs and leases; do not assume no side effect occurred |

## Monitoring gaps and release limits

The app does not independently monitor its own total outage. If the whole deployment or scheduler stops, its in-app dashboard cannot interrupt the owner by itself. External uptime/schedule monitoring and a verified alert destination are required before unattended operation can be relied on. Do not claim they are active because the runbook describes them.

No support inbox connection is installed by the operations dashboard. Self-service order recovery and deterministic policy-eligible refund handlers can reduce routine support, but an actual inbox queue and approved reply workflow must be connected before unattended email support can be claimed.

The feedback aggregate reports explicit first-use/reuse and useful/not-useful answers for orders first marked ready in the last seven days, including later refunds. It includes separate ready-order, any-feedback, and usefulness-response denominators. These are customer reports, not independently verified use or retention. Missing feedback data stays unavailable. Use the feedback migration and guarded rollback-only smoke to verify its access/measurement boundary.

The Railway growth service uses a separate repository and in-process cron. Its optional publisher trigger calls the app’s independent review/publish path with a distinct credential; both app flags default off. The dashboard reads actual publication/exception counts but does not verify the external service’s deployment or schedule. See the growth migration runbook for the exact controls and release evidence.

## Verification record to complete at release

Record the reviewed source SHA, migration identifiers and results, production deployment URL and SHA, Stripe test payment/refund result, saved order/delivery evidence, two unattended cron runs, and rollback route. Keep credentials and customer content out of this record. Unavailable access belongs in the release note as a concrete blocker, not a passed gate.
