# Bootfile Brand & AI Kit: researched product brief

Recorded: 2026-10-21. Source baseline: application PR #2 at `73ed664526112511c4d15ca44b8bd9e3cd47d7c2`.

## Status and authority

Nick selected the broader workflow direction, explicitly preserved the how-you-work quiz, and proposed a $49 one-time brand definition kit with portable AI instructions, brand voice/visual standards, three social posts and one customer email. This brief records that direction and recommends an executable first release. Detailed scope below is a design recommendation, not a claim that it has shipped or been customer-validated.

This is a documentation-only design branch. It does not change the deployed product, existing payment contracts, prices, production flags, database, subscriptions, publishing permissions or spending. Existing staged release and provider acceptance gates still apply. Do not treat this brief as permission to activate production or bypass inaccessible provider scope.

## Decision

Keep the quiz. Make the first workflow a guided brand-definition and AI-onboarding experience for an owner-operated small business. Keep marketing drafts as the first demonstration of the resulting inputs, not the sole value proposition. Do not launch a generic workflow marketplace or another autonomous marketing service.

Working offer: **Bootfile Brand & AI Kit — $49 once.**

Working promise: **Define your business. Give your AI a better brief.** A guided quiz helps the owner clarify the business, choose an intentional brand voice and visual direction, and export a reusable setup for supported tools. The first three social posts and customer email show how those decisions translate into work.

Strongest initial audience hypothesis: an owner with a real service or small creative business and an immediate offer to promote, but no coherent written brand system. An experienced brand team with approved guidelines may already be well served by its existing tools. This audience hypothesis requires customer testing; it is not observed demand.

## What current research establishes

These are first-party descriptions checked on 2026-10-21, not independent efficacy tests or proof of vendor traction.

| Alternative | Relevant documented overlap | Implication |
| --- | --- | --- |
| Enrich Labs / Helena | Describes learning existing content, brand guidelines and communication style during onboarding, then executing marketing work. | Complement execution tools by preparing better inputs; do not claim their onboarding ignores brand context. |
| Canva | Brand Kit Builder extracts colors, fonts, voice and guidelines from a brand-guidelines PDF on eligible plans; its manual brand-voice field is limited to 500 characters. | A well-structured PDF and a compact voice export are useful handoffs. Extraction is not guaranteed and needs checking. |
| Jasper IQ | Stores brand voice, audiences, visual standards, product facts and knowledge, and applies them to workflows. | A brand context layer is an existing category, not a new invention. |
| Markuva | Advertises guided brand strategy, visuals, voice and PDF/Markdown exports, with a $14.90 kit unlock. | A quiz, attractive report, one-time fee and Markdown alone do not justify differentiation or $49. |
| Brand Kit OS | Documents a guided ChatGPT export with brand sections, knowledge files, persona/preferences and stale-export warnings. | Portability and versioning are not unique; benchmark the experience rather than claim exclusivity. |
| Native ChatGPT | Projects retain files and project instructions. | The competing free workflow is a competent guided brand interview plus a saved project, not a deliberately weak prompt. |

Sources:
- https://www.enrichlabs.ai/ai-digital-marketing-agent
- https://www.canva.com/en_gb/help/brand-kit-builder/
- https://www.canva.com/help/brand-voice/
- https://help.jasper.ai/hc/en-us/articles/18618654325787-Jasper-IQ
- https://markuva.com/
- https://www.brandkitos.com/documentation/how-to/export-to-chatgpt
- https://help.openai.com/en/articles/10169521-projects-in-chatgpt

Research supports competitive overlap and technically plausible handoffs. It does NOT establish an underserved segment, willingness to pay, superior output, successful Enrich import, Canva extraction fidelity, customer reuse, or profitable acquisition. Those remain experiments.

## Differentiation to earn

The candidate advantage is a beginner completing meaningful brand decisions, understanding them, applying them in an existing tool and producing a usable result without hiring a consultant or learning prompting. The output files are a delivery mechanism, not the moat.

Prioritize decision quality, examples over jargon, editable recommendations, realistic installation instructions and first-use evidence. Do not claim universal compatibility, identical outputs across models, permanent memory, a scientifically validated founder personality, agency-equivalent strategy, trademark clearance or guaranteed business performance.

## Four separate layers

1. **Owner working preferences (private):** decision presentation, explanation depth, examples, collaboration style and how to raise concerns. Preserve the original eight-question quiz and scoring unless separately and deliberately versioned. Let the owner confirm the resulting operational instructions. An archetype may be an enjoyable summary, but never decides factual standards, permissions or visual identity.
2. **Business facts and evidence:** what is sold, intended customers, real capabilities, approved claims, exclusions and current evidence. Customer approval is not independent verification. Keep claims such as certifications or performance results tied to supplied evidence.
3. **Brand choices:** positioning proposals, messaging priorities, voice, visual style, palette roles, typography and imagery direction. Proposed choices are labeled as proposals until approved. A new slogan is creative work, not proof of market differentiation.
4. **Current campaign:** one offer, dates, prices, availability and exact next action. Keep changing facts out of timeless brand instructions; date them and request reconfirmation before reuse.

Example: the owner wants concise, analytical recommendations, while customers should encounter warm, reassuring copy. Never copy the owner's private working style into the brand voice by default. A customer's existing brand materials take precedence over a new generated preference unless the customer explicitly chooses to change them.

## Quiz and experience

Design target: an immediate useful preview, then a guided completion experience whose duration is measured in user tests. Do not advertise an unmeasured completion time.

The journey has five chapters:

### 1. How you work

Reuse the original quiz entry point and let returning users reuse their result. Translate answers into editable instructions such as: lead with one recommendation and a short rationale; give examples before terminology; flag material problems directly without manufacturing disagreement. Truthfulness, uncertainty and consent remain fixed across all styles.

### 2. What your business stands for

Ask concrete questions: What do you sell? Who is the best fit? What happens that makes them seek help? What do you do differently, and what can you substantiate? What is outside your offer? Offer plain-language examples and an honest 'not sure yet' path. Do not require an inexperienced owner to write a positioning statement unaided.

Offer two starting modes: define an emerging brand, or organize an existing brand. The second preserves existing approved choices and focuses on gaps instead of forcing a redesign.

### 3. How it should sound

Use short contrasting examples of the same message, not only sliders such as friendly-to-formal. Ask which sounds right, which sounds wrong and why. Capture preferred vocabulary, discouraged expressions and a supplied writing example. Explain a principle only when it helps the current decision. Recommend an editable voice with concrete do/don't pairs, not a generic adjective list.

### 4. How it should look

Let the owner keep existing colors/fonts, select from a small set of coherent visual directions, or request a conservative recommendation. Show each direction applied to the same sample card. Provide color roles, hex values, font roles/fallbacks and imagery guidance. Do not infer colors from a personality score or claim color preferences predict customer behavior.

Calculate intended text/background contrast; use WCAG AA text thresholds of 4.5:1 for normal text and 3:1 for large text. Passing a palette check is not a claim that every later design is accessible. Source: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html

### 5. Put it to work

Capture one real campaign's approved facts and next action. Show a plain-language backbrief before generating final materials: audience, offer, promise, evidence, voice, visual direction and unanswered questions. Contradictory essential facts require a focused correction, not a confident guess.

Show the $49 price before the user invests substantial effort. A free working-style result and limited illustrative preview can demonstrate value without unlimited unpaid model calls. Never hold a long quiz hostage to an undisclosed paywall. Preserve unfinished work and offer edit/undo without losing the whole journey.

## What $49 should buy

A single approved business foundation, owner instructions, visual/verbal kit, first promotion and destination-specific handoffs. Proposed revision scope: one initial kit with bounded refinement; exact limits must be disclosed and tested before selling. Download ownership is not a promise of unlimited cloud storage, perpetual tool updates or unlimited future generation.

- **Brand definition:** concise positioning, intended audience, customer problem, benefits with supported proof, differentiator hypotheses, message hierarchy and exclusions.
- **Voice guide:** concise rule set, positive/negative examples, vocabulary and channel adjustments.
- **Visual starter:** coherent palette, usage roles, checked text/background pairings, heading/body font guidance, imagery and layout direction. Preserve existing logos; do not promise bespoke logo creation or trademark clearance.
- **AI working-partner instructions:** private owner collaboration preferences plus approved business/brand context and boundaries. Begin with business planning and communications, not unrestricted autonomous management or professional advice.
- **First promotion:** one email with subject/preview/body and exactly three distinct social posts. Recommendation: include simple branded graphics from controlled layouts with the captions, so the visual kit is demonstrated. Graphics are a proposed scope improvement, not already implemented assets.
- **Use-it-now handoffs:** a readable PDF, editable Markdown/plain text, machine-readable JSON, copyable short instructions, and practical destination guides. Do not dump a confusing folder on a beginner: lead with one 'Use my kit' screen and show only the files relevant to the selected destination.

## Portability contract

**ChatGPT:** concise project instructions plus an uploadable source document and a normal-chat fallback. A new-chat verification task checks application; a model saying 'loaded' is not sufficient proof.

**Canva:** a text-readable brand-guidelines PDF with plainly labeled fonts, hex colors, voice and guidelines, plus a voice summary no longer than 500 characters and manual copyable values. Brand Kit Builder is plan/role dependent and extraction may be partial. Test a representative Bootfile PDF in a real eligible Canva account before advertising a tested handoff. Otherwise label manual transfer accurately. A PDF is not a native editable Canva template, and JSON is not a universal import format.

**Enrich Labs / Helena:** prepare an onboarding brief with audience, approved product facts, voice examples, constraints and campaign goal. Public documentation confirms brand-aware onboarding but this research did not verify a native Bootfile-file importer, API contract or automatic synchronization. Provide guided copy/paste or a documented upload path only once tested; do not add a fake 'connected' badge.

**Other assistants/tools:** offer the canonical editable source and plain-text instructions. Claim only the named destinations tested. These exports help the user configure a tool; they do not train its underlying model, install themselves, grant publishing authority or stay synchronized automatically.

Each export records version, destination, build date, user-approved content version and reviewed compatibility notes. User edits mark affected exports stale. One canonical record drives every artifact to prevent disagreement between the PDF, short voice block and first campaign.

## Data, generation and safety design

Recommended canonical sections: `schemaVersion`, `ownerPreferences`, `businessFacts`, `brandDefinition`, `voiceGuide`, `visualSystem`, `campaignBrief`, `approvalState`, `exports` and `validationEvidence`. Field provenance distinguishes customer-stated, user-approved creative choice, generated recommendation, unknown and evidence-backed claim. Public brand exports omit private owner preferences unless deliberately selected.

Pipeline: bounded intake -> structured synthesis -> focused conflict review -> customer approval -> campaign generation -> deterministic validation and independent content review -> destination rendering -> install/test guidance. Use models where synthesis is needed and deterministic code for state, pricing, access, contrast, file structure, lengths and exports. A failed check is not fixed by relabeling an output as verified. Runtime fact and style checks have known limitations; retain human review.

All submitted text/files, model outputs and logs remain untrusted. No instruction inside a brand source can override product rules, request secrets, send messages, browse arbitrary privileged destinations or change amounts. No customer lists or sensitive personal records are needed. New model stages require a shared per-order call/token/cost ceiling, not uncapped agents. Do not make provider calls or change approved budget limits from this design branch.

## Reuse and migration of the current build

The inspected code still defines `marketing-setup-v1`, and `StudioIntake` has business/campaign text but no structured owner-workstyle, brand-strategy or visual-system objects. This is a meaningful product extension, not a homepage rename.

Reuse the quiz interaction/scoring assets, $49 commerce pattern, private delivery/access, leases, retry/refund policies, bundle viewer, test harness and operating ledgers. Introduce a separately versioned brand-foundation input/output contract and version-aware renderers. Preserve old orders and legacy profile recovery. Update metadata, pricing text, terms, privacy notices, examples and the growth service consistently before launch; agents must not keep marketing the superseded offer.

Do not rebuild payments, replace the stack, add an integration marketplace or ship ten workflow categories. Keep the first complete loop: quiz -> approved foundation -> first campaign -> export -> first useful run in another tool.

## Release criteria

Technical completion alone is not market validation. Before public promotion, verify payment/delivery/refund and private-access gates already recorded in the release runbook, then verify:

- One coherent kit from blank and existing-brand journeys; no missing required artifact.
- Owner preferences remain separate from public brand tone and private content stays out of public exports.
- No unsupported material claims in a reviewed synthetic/adversarial cohort; source approval and actual factual verification are distinguished.
- Palette roles and advertised contrast checks are deterministic and consistent across artifacts.
- Canva voice summary meets its documented limit without silently dropping critical prohibitions.
- The chosen ChatGPT setup works in a new task; the actual Canva PDF handoff is measured; Enrich compatibility is either tested or clearly limited to a manual brief.
- Production provider acceptance and unattended worker runs are observed, not inferred from passing unit tests.
- Real customer support has a working destination and triage boundary; email-provider acceptance is not inbox delivery.

Proposed pilot decision rules, not industry benchmarks: observe 10 target owners; at least 8 should finish the quiz and set up one supported tool without live help. Compare results with a strong free guided brand interview using equivalent facts and available models, and with the closest practical competing onboarding experience. Measure active time, corrections, factual failures, first-use completion, price acceptance and later reuse. Do not scale because users compliment the design.

## Economics and acquisition

Keep $49 one-time pricing and the $0 paid-acquisition authorization. Model costs, payment fees, refunds, support and failed/free sessions all count toward contribution. Do not promise unlimited personalization for a fixed price. Instrument owner intervention minutes and repeat incidents instead of claiming '99% hands-off' from task counts.

First acquisition hypotheses: the useful free quiz, transparent fictional before/after demonstrations, and partner distribution through small-business educators or implementation specialists. Any paid placements, referral commitments, outreach or automatic publications remain subject to the operating charter. SEO alone is not a guaranteed launch channel.

The next meaningful proof is a novice who pays, understands the resulting brand, installs the kit and produces a useful second task. A long brand book or more agents is not an adequate substitute.
