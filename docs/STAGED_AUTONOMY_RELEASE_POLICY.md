# Bootfile staged autonomy release policy

Effective 2026-10-20. Applies to bootfile-app and bootfile-growth-agent.

## Authorization
Agents may prepare code, tests, content, documentation, and pull requests on isolated branches. They may run non-destructive checks and reversible test transactions. No new advertising spend is authorized (cap: $0). Do not merge into production branches, change production hosting or secrets, send unapproved external campaigns, or change product prices without explicit owner approval.

## Release gates
1. Record source commit SHAs and a release manifest for both repositories.
2. Pass lint, typecheck, unit/integration tests, and production build; record exact commands and outputs.
3. Verify Stripe webhook signature, idempotency, out-of-order refund/dispute events, payment-to-order linkage, and recovery after interrupted generation.
4. Verify private brief/output access, scoped tokens, Supabase RLS/grants, secret handling, and absence of ad pixels on sensitive customer pages.
5. Run rollback-only database transition tests and verify migration history. Never treat missing evidence as passing.
6. Confirm queue capacity, worker lease exclusion, bounded retries, monitoring, incident escalation, and refund policy behavior.
7. Review content claims and policy checks before any autonomous publication.
8. Require an owner approval decision with exact commit, environment, rollback plan, spend impact, and unresolved risks before enabling production.

## Owner decision queue
Escalate: new spending; price/offer changes; privacy/terms changes; disputes and material refunds; irreversible database migrations; production activation; security incidents; recurring reliability failures. Routine bounded retries and already-policy-eligible refunds may be automated only after their implementation is tested and approved for production.

## Fail-closed behavior
If a release gate fails or evidence is unavailable, leave production unchanged and present the blocker. Pause checkout if paid fulfillment capacity or worker health cannot be confirmed. Do not silently relax safeguards.

## Operating metrics
Track completed paid orders, net revenue, contribution after fees/model costs/refunds, delivery success and latency, chargebacks, customer-reported usefulness, and incident counts. No profitability claim without verified actual data.
