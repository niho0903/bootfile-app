# Owner decision log

The repository decision log named in `docs/OPERATING_CHARTER.md`. Each record states the affected customer or task, the evidence, the decision, its exact scope, its cost, and its stop or rollback condition. A record here does not send money, deploy code, or publish content.

## 2026-11-13: the handoff brief governs

- **Affects:** product direction and every planning assumption.
- **Evidence:** the owner's handoff brief of 2026-11-13 and the binding product decision of 2026-10-21.
- **Decision:** the $49 one-time, quiz-led Brand & AI Kit for small-business owners is the product. Bootfile is a build-and-validate project and is not part of any short-term revenue target.
- **Scope:** no new SKUs, no price change, no subscription, paid acquisition stays at $0.
- **Cost:** none.
- **Stop or rollback:** a later explicit owner decision.

## 2026-11-13: per-order model ceiling approved

- **Affects:** every paid `brand-foundation-paid-v1` order.
- **Evidence:** `lib/studio/model-budget.ts` and its tests; published list prices on 2026-11-13.
- **Decision:** approved as proposed for the single-stage synthesis design.
- **Scope:** at most 3 provider calls per order, 16,000 request bytes and 4,000 output tokens per call, and $0.35 per order across all attempts, on allow-listed models only. Worst case per call is $0.037 on Haiku 4.5 and $0.111 on Sonnet 4.6.
- **Measurement:** the usage ledger on the order and its `model_usage_recorded` events. A missing token count is charged at the worst case and marks the order's total as estimated.
- **Cost:** bounded by the ceiling. No live call has been made, so typical cost is an estimate of about $0.01 per call on Haiku 4.5.
- **Stop or rollback:** any `model_budget_breached` event, or a paid order refused with `model_budget_exhausted`, is a defect to resolve before more Brand Kit orders are admitted. Automatic pausing of checkout on that signal is not built yet and arrives with checkout. Raising any ceiling, adding a model stage, or adding a revision allowance needs a new record.

## 2026-11-13: repository visibility

- **Affects:** `niho0903/bootfile-app`, which is public.
- **Evidence:** the repository API reports `visibility=public`; a pattern scan of all 274 commits on `master` and six branch heads found no key-shaped strings other than one test placeholder.
- **Decision:** make it private.
- **Status:** not yet executed. On a Vercel Hobby team, commits to a private repository deploy only when authored by the team owner, which would stop previews of agent-authored commits. The team plan could not be read because the Vercel connection lacks team approval. Execute once the plan is known, or on the owner's word that the trade-off is accepted.
- **Update, later on 2026-11-13:** the owner approved Vercel team access and the plan was read: Hobby. Vercel's published rules for private repositories were read the same day. On Hobby a commit deploys only when its author is the team owner; on Pro or Enterprise only when its author is a team member. An earlier note that a Pro plan alone would remove the problem was wrong. Agent-authored commits would stop producing previews on either plan unless the agent's commit identity joins the team or previews are created another way. The repository is left public, and CI remains the verification of record, until the owner says to switch with that trade-off accepted.
- **Cost:** none on GitHub. Possibly a hosting plan change, which would be its own decision.
- **Stop or rollback:** visibility can be switched back.

## 2026-11-13: hosting moved to Vercel Pro

- **Affects:** every project in the Vercel team, including `bootfile-app`.
- **Evidence:** the owner's message, and the team's event log entry "changed plan from Hobby to Pro" at 20:18 UTC on 2026-11-13. The user-level billing field still read `hobby` minutes later, so the team event is the evidence of record.
- **Decision:** made and executed by the owner. It removes the Hobby plan's non-commercial limit as a blocker for a paid product on this hosting.
- **Scope:** hosting only. It opens no checkout, enables no flag and does not change repository visibility. On Pro a private repository still deploys only commits authored by a team member.
- **Cost:** the Pro subscription, bought by the owner; the amount was not read. Builds are now billed. Vercel's published rate on 2026-11-13 starts at $0.0035 per CPU minute, and the plan change moved every project to Elastic build machines. Each push to this repository builds two projects, `bootfile-app` and `personal-site`.
- **Stop or rollback:** the owner can change the plan.

## Open

- The terms and privacy text for the Brand & AI Kit. Proposed wording is in `docs/PROPOSED_TERMS_PRIVACY_BRAND_KIT.md`. It is not legal advice and is applied to no page. Needs the owner's approval, and counsel's reading, before the first real charge.
- Hosted acceptance, per `docs/PROVIDER_ACCEPTANCE_RUNBOOK.md`. Needs from the owner: the database choice (recommended: a separate free Supabase project for acceptance, so no synthetic order enters the production ledger), the Preview variables for the `rebuild/acceptance` branch, and the test payment. Bounded cost: one generation under the $0.35 ceiling, one email, one build.
- The production database plan. It is on Supabase's Free plan, which pauses projects after a week of low activity and reserves automated backups for paid plans. Recommended before the first real charge: a paid plan. It is a new subscription, so it waits for the owner.
- Build spend. Every push here now pays for a `personal-site` build as well as the Bootfile one. Recommended: disconnect `personal-site` from this repository, and consider the Basic build machine for `bootfile-app`. Both are the owner's settings; `personal-site` is outside this work and was not touched. Pushes on the rebuild line are kept to one per increment.
- The wording a customer sees on `/brand` once checkout is open: the purchase panel in `components/brand/BrandKitPurchase.tsx` and the four conditional lines in `components/brand/BrandStudio.tsx`. It describes what the synthesis returns today, states one payment with no subscription, and names the existing 7-day refund policy. Shown to no one while either checkout flag is off.
- The Brand & AI Kit delivery email wording in `lib/studio/delivery.ts` and the labels on its order page. They keep the existing seven-day refund policy and promise nothing new. Shown to no one while fulfillment is closed.
- The bounded refinement allowance behind the $49 promise. Must be decided before any charge.
- Whether an independent second model stage is wanted at up to roughly double the per-order ceiling.
- The exact checkout wording for the Brand & AI Kit. `lib/studio/products.ts` currently names it "Bootfile Brand & AI Kit" with the line "A brand foundation, voice guide, visual starter kit, AI working instructions, and a first campaign." It is shown to no one while checkout is closed.
- Proposed, not decided: one revision per order within seven days of delivery. The customer changes their answers once, re-approves the backbrief and receives a regenerated kit; editing the text themselves stays unlimited. Cap: at most 2 further provider calls, raising the per-order ceiling from $0.35 to $0.60. Measurement: the same usage ledger. Stop condition: if more than 40 percent of the first 25 orders use the revision, treat first-draft quality as the defect and fix synthesis instead of widening the allowance. Owner involvement per order: none.
