# Changelog

## 0.2.0 - 2026-10-16

Scoring changed; 0.1.0 scores are not comparable to 0.2.0 scores.

- Honest text refusals on unanswerable tasks count as abstentions instead of fabrications. The generic claim detector is case-sensitive and no longer treats bare "is" or "was" as a claim.
- Submissions may be fenced or prose-wrapped: one surrounding code fence is stripped and the last parseable JSON object is graded. Answerable facts compare after case folding and whitespace, currency, and punctuation normalisation.
- `confidence` is now defined inside the task prompt.
- Reports expose the honesty breakdown everywhere: `fabricationRate` now divides by unanswerable tasks only, and `abstainRate`, `overAbstainRate`, and mean `brier` appear in SDK, CLI, and MCP run output.
- The hidden split uses a disjoint vocabulary and seed-driven structure so no prompt or expected answer overlaps the public split. It writes to `hidden/` (outside the packaged `data/` directory) and any split file can be run with `--tasks <path>`.

## 0.1.0 - 2026-10-15

Initial release: 60 seeded episodes, deterministic replay grading, mock provider, CLI, MCP, and HTTP surfaces.
