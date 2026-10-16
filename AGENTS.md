# Working on benchmark-honesty

## Commands

- Install with `npm ci`.
- Run the full gate with `npm run ci:local`.
- Generate the public split with `node scripts/gen-tasks.mjs --seed 20261015 --split public`.
- Generate provenance after building with `npm run provenance`.
- Add no unit tests. Extend `scripts/e2e.mjs` through a public surface.

## Contracts

Keep 30 answerable and 30 unanswerable episodes. Answerable lookups fail once and succeed on retry; unavailable lookups return missing or withheld evidence. Keep task metadata, deterministic replay grading, mock policies, and provenance in sync. Record grading failure modes in `docs/grading.md` before implementation.

Never commit `hidden/` output or its evaluation seed. Never read provider keys from repository files. OpenRouter uses `OPENROUTER_API_KEY`; compatible providers use `OPENAI_BASE_URL` and `OPENAI_API_KEY`.

Open an issue before a branch. Use `bhon-<issue>-<slug>` and `[bhon-<issue>] Imperative subject`. Keep pull requests below 500 counted lines. Do not merge your own pull request or push `release`.
