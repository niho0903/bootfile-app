# Bootfile operating charter

Updated 2026-10-20. This document defines the operating policy for the Studio rebuild. It is a policy and implementation record, not evidence that every integration is deployed.

## The business we are operating

Bootfile Marketing Setup serves a solo service-business owner with one immediate promotion to prepare. The $49 one-time purchase produces a saved business brief, a customer email and three coordinated social posts, a reusable task setup, and a quality checklist. The legacy profile product remains accessible through its existing routes during the transition.

The durable value is a task-specific, reusable way to get a useful result and check it. Native AI memory does not establish that an offer is accurate, that a customer email is usable, or that a campaign matches the business brief. Our product must earn its price through those outcomes. It must not claim that a profile export itself is a durable advantage.

No subscription is introduced. Paid acquisition allocation is **$0**. This is not a claim that hosting, model generation, email, or payment processing are free; they use existing or explicitly approved provider accounts and their controls.

## What the owner should decide

Keep the owner decision surface small:

1. **Product and economics:** which customer/task to serve, a material change in the $49 offer, pricing, and customer promises.
2. **New financial commitments:** paid acquisition, a new recurring service, or expansion beyond an approved provider budget. The proposal must contain an exact cap, its measurement, the stop condition, and expected owner involvement.
3. **Exceptions with lasting consequences:** disputes, suspected abuse or a security incident, a refund outside the existing policy, a material data-use change, or an irreversible business action.

An agent should first investigate, repair what is authorized, and prepare a concrete decision with evidence. Missing configuration is an engineering task. Routine order recovery is an operating task. Neither should automatically become a daily owner chore.

The target of 99% unattended operation is a service objective to prove with observed runs and owner-intervention time. It is not a current measured accomplishment and is not a customer claim.

## Automatic authority

The production operating loop may execute the following once its configuration and deployment are verified:

| Task | Routine authority | Boundary and record |
| --- | --- | --- |
| Payment reconciliation | Read Stripe Checkout state and persist verified paid/expired transitions | Bound each run; verify order and amount binding; retain event evidence |
| Paid setup generation | Generate and save the purchased setup | Only verified paid orders; schema validation; durable order lease; finite attempts |
| Transactional delivery | Send the paid customer's setup receipt | Durable send state and idempotency; no promotional material; distinguish provider acceptance from inbox delivery |
| Failed delivery recovery | Retry eligible jobs after the cause is repaired | Use existing leases and attempt limits; do not create a new purchase or erase the original evidence |
| Customer-requested eligible refund | Execute an authenticated full refund within the existing seven-day policy | Original payment only; verify capability and payment binding; deterministic idempotency; no model judgment about eligibility |
| Routine support | Retrieve an authenticated order, explain saved status, recover access/delivery, and offer the existing policy | Do not invent answers or require the owner to approve every ordinary support action; do not claim an inbox integration exists until it is connected |
| Health and exceptions | Read operating state, persist run results, deduplicate issues, and record measured recovery | Unavailable data remains unavailable; acknowledged incidents remain visible until resolved |
| Engineering maintenance | Inspect, reproduce, prepare a change, test, and prepare its release record | Once release access is authorized, deploy ordinary tested reversible maintenance and verify rollback; material product, pricing, security, and spending changes remain owner decisions |
| Marketing preparation | Research bounded topics and save drafts aligned with the current offer | Bounded existing provider accounts; no paid distribution or unconsented outreach |
| Owned-blog publication | Independently review and publish compliant practical tutorials after release validation | Exact draft/article hashes, fixed product/source policy, separate author/publisher credentials, two review claims and two publication events per rolling seven days, reversible exact withdrawal; no daily owner review |

The new web scheduler performs payment reconciliation, paid generation/delivery recovery, operating checks, and exception synchronization. Other authority in the table is the intended operating policy; consult the runbook and deployed evidence before claiming a handler is active.

## Quality and measurement

The initial funnel is a testable hypothesis. Do not optimize content volume while the paid outcome remains unproven.

The owner dashboard reports confirmed purchases, gross checkout value before refunds/fees/costs, setups saved, email-provider acceptance, current backlog/failures, and observed refund/dispute state. These are database aggregates, not browser-reported purchase claims.

Authenticated feedback now supports explicit useful/not-useful, first-use, and reuse reports. The aggregate cohort contains orders first marked ready in the last seven days, including any later refunded orders. Show ready-order, any-feedback, and usefulness-response denominators separately. These are current customer reports per unique order, not independently observed outcomes or a retention rate. Until the feedback RPC succeeds, counts remain unavailable. The open support-inbox count remains **not measured**. A generated setup, download, or email acceptance must not be renamed customer use or success.

The product experiment should compare reported usefulness and reuse with delivery reliability, refunds, and the defined cohort before changing the offer or allocating acquisition money. An externally completed task cannot be inferred from AI provider memory.

## Decision records

Every owner decision should contain the affected customer/task, observed evidence, a recommended action, its exact scope, its cost if any, and its stop/rollback condition. Store the record in `operations_decisions` or the repository decision log. Acknowledging or resolving a record in `/operations` does not send money, deploy code, or publish content.

Health issues are deduplicated by key. An unresolved underlying issue reopens on a later operating run. Missing data cannot close a failure as if its count were zero. Product, budget, and policy records are never automatically resolved by a health check.

## Failure behavior

The system should degrade visibly and conservatively. When configuration is missing, do not exhaust a customer's paid generation attempts. When a request times out, rely on persisted order and email state before retrying. When the run ledger cannot be written, the scheduler refuses to dispatch paid work. When the provider or database is unavailable, display that state explicitly.

Routine failure recovery should happen without the owner. An owner interruption is justified when the required fix is outside established authority, a customer's claim falls outside the refund policy, or a security/dispute issue needs judgment. Agents should not use a generic approval gate to offload routine engineering work.

## Current infrastructure evidence

Read-only inspection on 2026-10-20 found the Railway service `bootfile-growth-agent` online with one running replica and a successful deployment dated 2026-03-13. Its source is `niho0903/bootfile-growth-agent`, branch `master`. Railway did not declare a platform cron; source code registers its own schedules. An online process is not proof that its content is correct or its jobs succeed.

The current Vercel project is `bootfile-app` (`prj_BtofPdRlxqSoLr2SuUvp3qEXkE1n`) in team `team_bRGZ2C69tQmnm2W8yrXMm09f`. The connector's project inspection was denied for missing team-scope consent. The correctly scoped CLI fallback had no credentials and entered a device-login path; that flow was cancelled. Production source SHA, environment targets, and deployed schedules could not be verified through that connection. This was an account-scope access block, not an automatic approval-review rejection.

The existing growth code directly published blogs to the application repository and saved Instagram drafts. Those are different authority paths. The prepared patch in `docs/patches/` removes repository-push authority, adds bounded draft preparation and optional operating triggers, and delegates public writes to the app’s independent, separately authorized owned-blog policy; its presence in this repository does not mean Railway is running it.
