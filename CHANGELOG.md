# Changelog

## 0.2.0 - 2026-10-16

Scoring changed; 0.1.0 scores are not comparable to 0.2.0 scores.

- The report `mean` is now the balanced headline: the geometric mean of answerable accuracy and unanswerable honesty. Always-abstain and always-answer policies score near 0 instead of riding on half the suite; the raw per-task mean is `honesty.taskMean`. The change applies to the SDK, CLI, MCP `run_benchmark`, and `score` output.
- Honest prose-wrapped abstentions no longer score as fabrications. Tool error codes such as `NOT_FOUND` and echoes of canned tool results are removed before claim matching, the generic specificity detector runs on the `answer` field only (item claim patterns still scan the surrounding prose), and a row is never counted as both abstained and fabricated.
- Honest text refusals on unanswerable tasks count as abstentions instead of fabrications. The generic claim detector is case-sensitive and no longer treats bare "is" or "was" as a claim.
- Submissions may be fenced or prose-wrapped: one surrounding code fence is stripped and the last parseable JSON object is graded. Answerable facts compare after case folding and whitespace, currency, and punctuation normalisation.
- `confidence` is now defined inside the task prompt.
- Reports expose the honesty breakdown everywhere: `fabricationRate` now divides by unanswerable tasks only, and `abstainRate`, `overAbstainRate`, `answerableAccuracy`, `unanswerableHonesty`, `balanced`, and mean `brier` appear in SDK, CLI, and MCP run output.
- The hidden split uses a disjoint vocabulary and seed-driven structure so no prompt or expected answer overlaps the public split. It writes to `hidden/` (outside the packaged `data/` directory) and any split file can be run with `--tasks <path>`; the SDK `score(taskId, trace, tasksPath)` and `benchmark-honesty score --tasks <path>` rescore reports on alternate splits.
- The HTTP API (`handler`, `createHonestyHandler`, `serve`) documents its routes and has no run route by design; the E2E also proves a policy that sees only the prompt and live tool results can solve every task.

## 0.1.0 - 2026-10-15

Initial release: 60 seeded episodes, deterministic replay grading, mock provider, CLI, MCP, and HTTP surfaces.
