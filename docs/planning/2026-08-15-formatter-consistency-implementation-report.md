# Formatter Consistency Remediation — Implementation Report

Date: 2026-08-15
Status: Implemented + verified
Scope: `apps/api`
Plan: `docs/planning/2026-08-15-formatter-consistency-remediation.md`

## 1. Summary

Implemented the selective-formatting remediation for under-structured prose. The
formatter now (a) always runs with the user's per-user provider context, (b) is
additionally forced on long plain-prose answers that the validator scores as
passing, (c) uses a new V2 prompt that permits adding Markdown structure while
keeping the strict semantic-preservation contract, and (d) can never break an
otherwise successful chat response — any formatter failure/throw or failed
safety check returns the original response.

## 2. Root cause

- `AI_FORMAT_MODEL` unset → `formatter` was `undefined` → only mechanical auto-fix
  ever ran (`finalizeAssistant`, previously `chat.service.ts:583`).
- Plain prose scores ~100 on the validator (no rule penalizes the absence of
  Markdown), so clean plain text shipped past the ≥95 pass gate unchanged.
- Even when configured, the formatter's `complete()` call passed no
  `providerContext`, so it could not authenticate with the user's per-user key.

## 3. Files changed

- `apps/api/src/chat/formatting-prompts.ts` — added `FORMATTER_PROMPT_V2` (V1 kept).
- `apps/api/src/chat/formatting-pipeline.ts` — `forceFormatter` option,
  `isUnstructuredProse`, `preservesNumbers`, gate + acceptance + original fallback.
- `apps/api/src/chat/chat.service.ts` — `finalizeAssistant(threadId, buffer,
  handlers, providerContext)`; formatter model fallback; `providerContext` into
  `complete()`; V2 prompt; `forceFormatter: isUnstructuredProse(buffer)`;
  telemetry `promptVersion: 'v2'`; both call sites pass the existing
  `providerContext` (`:518`, `:557`).
- `apps/api/.env.example`, `.env.docker.example` (root) — documented optional
  `AI_FORMAT_MODEL=` (unset → falls back to `AI_MODEL`/`defaultModel`; does NOT
  disable formatting; user provider key still used).
- `apps/api/src/chat/formatting-pipeline.spec.ts` (new) — pipeline tests.
- `apps/api/src/chat/chat.service.spec.ts` (extended) — formatter wiring tests.
- `apps/web/lib/api/assistant/stream.ts`, `apps/web/hooks/useChat.ts`,
  `apps/web/components/assistant/ChatActivityListener.tsx` — pre-existing
  in-progress 400/stuck-icon fixes riding on the same branch; unrelated to this
  change.

## 4. providerContext flow

`streamChat` resolves `providerContext = await getProviderContext(userId)` and
passes it to both `aiClient.stream` (generation) and `finalizeAssistant`. The
formatter's `complete()` call now receives the same `providerContext`, so it
authenticates with the same per-user provider key as generation.

## 5. AI_FORMAT_MODEL fallback

`formatterModel = process.env.AI_FORMAT_MODEL?.trim() || this.defaultModel`.
An unset `AI_FORMAT_MODEL` no longer disables formatting — it falls back to the
generation default model. `AI_FORMAT_MODEL` remains the escape hatch for a
stronger Markdown model. Tests cover both set and unset cases.

## 6. isUnstructuredProse

Deterministic, cheap, no LLM. True only when: total length ≥ 400 chars, ≥ 3
blank-line-separated paragraphs, and no Markdown markers anywhere (`**`, ATX
headings, `-`/`*` bullets, numbered lists, table rows, fenced code). Never fires
on one-liners, short replies, two-paragraph explanations, or responses already
carrying structure.

## 7. Forced / validator interaction (acceptance model)

Two distinct paths:

- **Normal:** unchanged. Formatter runs when `scoreBefore < autoFixScore`;
  candidate accepted only if `safe && reScore >= scoreBefore`; otherwise the
  existing auto-fix fallback applies.
- **Forced prose:** formatter runs whenever `isUnstructuredProse` is true,
  regardless of score. Forced acceptance requires non-empty, ≥ 50% of original
  length, `preservesNumbers`, and no hard (major) validation failure. The
  `reScore >= scoreBefore` gate is bypassed on purpose (a plain-prose original
  already scores high; rejecting on `98 < 100` would reproduce the bug). On
  rejection the ORIGINAL response is returned.

## 8. Semantic safety / fallback

- `preservesNumbers(original, candidate)`: every numeric token in the original
  must still appear in the candidate (set-subset, so formatter list markers like
  `1.` don't cause false failures). This is one semantic-safety signal, not a
  full fact checker — non-numeric rewording relies on the V2 prompt contract.
- Mandatory fallback: any formatter throw/empty/short/degraded/invalid output or
  failed safety validation → original response persisted; chat request succeeds.
  `finalizeAssistant` wraps the pipeline in try/catch and logs `[format] pipeline
  skipped, persisting raw: ...` on failure.

## 9. Tests added

`formatting-pipeline.spec.ts`:
- `isUnstructuredProse` cases (one-liner/short/two-paragraph → false; 3+ plain
  paragraphs → true; heading/bullets/numbered/table/code → false).
- Normal path: structured + no-force → formatter not called; low-score + no-force
  → formatter path exercised; acceptance/rejection unchanged.
- Forced path: forced + high score → formatter called; slightly-lower-score valid
  candidate → ACCEPT; changed number → REJECT → original; empty/short → REJECT →
  original; hard-validation failure → REJECT → original; formatter throws →
  original.
- Explicit regression: high-scoring plain prose, slightly-lower-score formatted
  Markdown → still accepted on the forced path.

`chat.service.spec.ts` (extended):
- `AI_FORMAT_MODEL` set → used; unset → `defaultModel`.
- `complete.options.providerContext` equals `getDecryptedApiKey` result.
- No API key in `Logger` output.
- Successful forced formatting → `response_reformatted` + `persistAssistant(formatted)`.
- Formatter throws → `response_reformatted` not emitted, raw response persisted.

## 10. Verification commands + results

| Command | Result |
| --- | --- |
| `apps/api` `bun run test` | 45/45 suites, 274/274 tests pass |
| `apps/api` `bun run check-types` | exit 0 |
| `apps/api` `bun run build` | exit 0 |
| Root `bun run check-types` (turbo, api + web) | 4/4 tasks pass |
| Lint on changed files | 0 errors (12 pre-existing errors in `src/ai/**` untouched) |

Manual cases A/B/C are covered directly by the automated tests:
- Case A (structured → unchanged): structured-response tests assert no formatter
  invocation and no rewrite.
- Case B (3+ paragraph prose → reformatted): forced-path + `response_reformatted`
  tests.
- Case C (`"Thanks, that makes sense."` → untouched): short-reply tests.

A live manual run requires the AI backend at `localhost:8000`, which was not
running during verification; no manual run was performed.

## 11. Remaining limitations

- Number-preservation is deterministic and only one semantic-safety signal;
  pure-rewording fact changes (no numbers) rely on the V2 prompt contract +
  length/score gates (no LLM classifier, per scope).
- Forced prose path intentionally does not require score improvement — safety and
  numeric checks remain mandatory.
- Fallback formatter model is `defaultModel`, which may be weak at Markdown;
  `AI_FORMAT_MODEL` is the escape hatch.
- One extra non-streaming formatter call per under-structured reply (user's
  provider, temp 0).

Not committed, not merged — awaiting review on branch `fix/formatting-pipeline`.