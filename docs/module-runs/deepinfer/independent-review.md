# Independent DeepInfer review

Reviewed 2026-10-27 by the bounded independent review agent. This is a source/model and supplied-screenshot review, not a declaration of chapter completion.

## Scope and evidence

Read the teaching contract, research notes, component, canonical model, translations, CSS and model check. Independently inspected the pinned DeepInfer source clone; its HEAD was `553741557a57df44a46fb3ab72b6aafeaf945337`. No weights, GPU inference or upstream runtime were executed.

Opened these final screenshots at original detail: `evidence/final-1440-en-mixed.jpg`, `evidence/final-768-zh-pressure.jpg`, `evidence/final-390-en-long.jpg`, and `evidence/final-390-zh-pressure.jpg`. Did not operate the owner's active browser or independently repeat its live navigation/share/keyboard journeys.

Reran `node scripts/check-deepinfer.mjs` against the final source: PASS, 612 trace snapshots, 18 settings, 10 dependency/resource schedules, partial-prefill and first-output oracles, bilingual key parity. Earlier independent model probes also checked baseline commit 3 at 22–24, baseline schedule 2 at 8–9, and async commit 2 at 11–13.

## Findings and closure

- Closed P2: timing selection now carries both track and operation identity. Baseline selection no longer resolves through the async operation list; selected track, label and interval come from the same inspected model.
- Closed P2: decode scheduling uses its own explanation and decode source locator. Decode input indices drive outlines on the preceding committed output tokens.
- Closed P2: request-specific inclusion/progress observations are separated from global batch operations. Missing request IDs normalize consistently for both inspector and row highlight; scenario changes reset selection to A.
- Closed correspondence gap: the entrypoint request list derives from the scenario rows, including D in the pressure scenario.
- Closed responsive concern: the final CSS ends with the two-column mobile override `55px minmax(0,1fr)`. Both supplied mobile screenshots visibly use a narrow identity column and a usable token area; the earlier empty third-column concern no longer applies.

No remaining P0–P2 defect was observed within this review scope. The supplied desktop/tablet views keep the architecture, request ledger and operation inspector legible. Mobile stacks these relationships, wraps the long prompt without losing token identities, and retains a full-width operation selector and explicit timing legend to supplement small timeline segments. The partial-prefill screenshot visibly keeps output empty; pressure screenshots visibly distinguish sampled uncommitted A/B tokens from waiting C/D.

## Boundaries and minor evidence note

The reduced synchronous trace and separate synthetic overlap diagram are clearly bounded; their passing numerical checks do not establish full DeepInfer runtime equivalence, scientific truth, benchmark performance or successful live interactions. This review found no central numerical contradiction against the inspected source subset.

The full-page captures include a sticky header and focused skip link partway through the document. This reduces screenshot presentation quality and obscures a narrow strip of the architecture in the saved image. It is not sufficient evidence of permanent viewport clipping; a clean top-of-page, unfocused capture would improve the evidence artifact.

No production source, tests or screenshots were edited by this reviewer.
