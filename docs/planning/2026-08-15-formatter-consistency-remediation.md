# Formatter Consistency Remediation — Selective Formatting for Under-Structured Prose

Date: 2026-08-15
Status: Planned — implementation pending approval
Scope: `apps/api`

## Goal

Fix the response-formatting pipeline so that:

1. The formatter uses the same per-user provider context as the original AI generation.
2. Long, under-structured plain-prose responses are selectively sent through the formatter.
3. Already well-structured responses are returned unchanged.
4. Short conversational responses are never unnecessarily rewritten.
5. Formatting improves presentation only and can never silently change facts, numbers, or meaning.
6. A formatter failure never breaks an otherwise successful chat response.

No redesign of the formatting architecture.

## Root cause

**[FACT]** The response formatter is effectively never exercised in production:

- `AI_FORMAT_MODEL` is unset in `apps/api/.env` and `.env.docker.example`. `finalizeAssistant` (`chat.service.ts:583`) therefore builds `formatter = undefined`, so only mechanical auto-fix ever runs.
- Plain prose scores ~100 on the validator: `ReadabilityRule` only flags 2+ stacked lines over 600 chars (`readability.rule.ts:33`), `SpacingRule` only blank-line runs/trailing whitespace. No rule penalizes the *absence* of markdown, so clean plain text ships past the ≥95 pass gate unchanged.
- Even if `AI_FORMAT_MODEL` were set, the formatter's `complete()` call passes no `providerContext` (`chat.service.ts:589-595`), so it cannot authenticate with the user's per-user provider key.

**[INFERENCE]** This is why switching models produces visibly different formatting: each model's raw markdown fidelity passes through with only mechanical fixes, and per-user provider context never reaches the (unconfigured) formatter.

## Design

- `FORMATTER_PROMPT_V2`: same strict semantic-preservation contract as V1, plus explicit permission to convert plain prose into useful Markdown (headings, bullet/numbered lists, bold for key figures, tables only for genuine comparisons, paragraph separation, preserve code blocks), and to leave already-appropriate structure untouched.
- `isUnstructuredProse(buffer)`: deterministic, cheap, no LLM. True when ≥3 blank-line-separated paragraphs, total length ≥400 chars, and no markdown markers anywhere (`**`, `^#{1,6}\s`, `^[-*+]\s+`, `^\d+[.)]\s+`, table rows `|`, fenced ``` ``` ```). Never fires on one-liners, short replies, two-paragraph explanations, or any response already containing headings/lists/tables/code.
- `forceFormatter` option on `runFormattingPipeline`: the gate becomes `forceFormatter || scoreBefore < passScore`; the formatter runs when `forceFormatter || scoreBefore < autoFixScore`. Non-forced behavior is unchanged.
- `preservesNumbers(original, candidate)`: deterministic numeric-preservation safeguard. Its responsibility is strictly:
  - every meaningful numeric token present in the original must remain in the candidate;
  - formatter-added Markdown list markers such as `1.` must not create false failures;
  - changed/dropped financial figures, percentages, dates, quantities, etc. are rejected where they are represented as numeric tokens.
  
  Numeric preservation is only one semantic-safety signal. It does NOT guarantee preservation of non-numeric facts, conclusions, polarity, or wording. The `FORMATTER_PROMPT_V2` semantic-preservation contract and existing validation mechanisms remain in force. No LLM semantic classifier is introduced.
- **Acceptance model — two distinct paths:**
  - **NORMAL FORMATTING:** original → existing validator → existing formatter eligibility → formatter → existing score/acceptance rules (`reScore >= scoreBefore` retained) → accept candidate OR return the existing fallback/original behavior. Existing non-forced semantics are preserved unchanged.
  - **FORCED UNDER-STRUCTURED PROSE:** original → `isUnstructuredProse` → formatter V2 → candidate validation → numeric preservation → accept candidate if the safety/validity requirements pass → otherwise return the ORIGINAL response. The forced path bypasses ONLY the normal score gate. It does NOT require `reScore >= scoreBefore` (a plain-prose original can already score high while the formatted candidate scores slightly lower — rejecting on `98 < 100` would reproduce the bug). Forced acceptance requires: formatter completed successfully; candidate non-empty; existing minimum-length protection passes; numeric preservation passes; existing formatting/safety validation passes; no existing hard validation failure is triggered. A forced candidate may never bypass existing safety validation.
- **Mandatory fallback:** on any formatter failure/throw/timeout/invalid output/validation failure → return the original response; the chat request succeeds. (Change from today's auto-fix-on-reject fallback — deliberate, per invariant.)

## Files

- `apps/api/src/chat/formatting-prompts.ts` — add `FORMATTER_PROMPT_V2` (keep V1).
- `apps/api/src/chat/formatting-pipeline.ts` — `forceFormatter`, `isUnstructuredProse`, `preservesNumbers`, formatter gate + acceptance + original-buffer fallback.
- `apps/api/src/chat/chat.service.ts` — `finalizeAssistant(threadId, buffer, handlers, providerContext)`; `AI_FORMAT_MODEL ?? this.defaultModel`; pass `providerContext` into `complete()`; use `FORMATTER_PROMPT_V2`; wire `forceFormatter: isUnstructuredProse(buffer)`; telemetry `promptVersion: 'v2'`; both call sites pass the existing `providerContext` (`:515`, `:549`).
- `apps/api/.env.example`, `.env.docker.example` — document optional `AI_FORMAT_MODEL=` (unset → falls back to `AI_MODEL`/`defaultModel`; does NOT disable formatting; user provider key still used).

## Tests

- New `apps/api/src/chat/formatting-pipeline.spec.ts`:
  - `isUnstructuredProse` cases (one-liner/conversational/short/two-paragraph → false; 3+ plain paragraphs → true; heading/bullets/numbered/table/code → false).
  - **Normal / non-forced path:** structured + no-force → formatter not called; low-score + no-force → the existing formatter path is exercised; existing acceptance/rejection behavior remains unchanged; no regression to the current non-forced formatting behavior.
  - **Forced path:** forced + high original score → formatter is called; forced candidate with a slightly lower score but valid structure → ACCEPT; forced candidate with a changed number → REJECT and return original; forced candidate that is empty/too short → REJECT and return original; forced candidate failing existing hard validation → REJECT and return original; formatter throws → return original.
  - **Explicit regression test:** original plain prose scores high; formatted Markdown scores slightly lower → the formatted Markdown is still accepted, because this is the forced-prose path and safety checks pass.
- Extend `apps/api/src/chat/chat.service.spec.ts`: `AI_FORMAT_MODEL` set → used; unset → `defaultModel`; `complete.options.providerContext` equals `getDecryptedApiKey` result; no API key in `Logger` output; successful forced formatting → `response_reformatted` + `persistAssistant(formatted)`.

## Verification

- `apps/api`: `bun run test`, `bun run check-types`, `bun run build`.
- Root: `bun run check-types` (turbo).
- Manual: Case A (structured → unchanged), Case B (3+ paragraph prose → reformatted, `response_reformatted`), Case C (`"Thanks, that makes sense."` → untouched).

## Risks / limitations

- Number-preservation is deterministic and is only one semantic-safety signal; pure-rewording fact changes (no numbers) rely on the V2 prompt contract + length/score gates (no LLM classifier per scope).
- **The forced prose path intentionally does not require the formatter's score to improve over the original score.** The purpose of forced formatting is to add structure that the current validator may not reward correctly. Safety and numeric-preservation checks remain mandatory.
- Fallback formatter model is `defaultModel`, which may itself be weak at markdown; `AI_FORMAT_MODEL` is the escape hatch.
- One extra non-streaming formatter call per under-structured reply (user's provider, temp 0).