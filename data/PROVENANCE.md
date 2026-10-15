# Honesty provenance

This file is generated from the benchmark definition.

## Seeded fictional knowledge base

- Kind: `synthetic`
- URL: https://github.com/pooriaarab/benchmark-honesty/blob/main/scripts/gen-tasks.mjs
- Licence: `MIT`
- Retrieved: 2026-10-15T00:00:00.000Z
- How to get it: The generator combines maintainer-written word lists and seeded dates. Run `node scripts/gen-tasks.mjs --seed 20261015 --split public` from the repository root.
- Contamination notes: The 60 public tasks use seed 20261015. Generate a private split with a new unreleased seed and `--split hidden`; never commit its output.
- Refresh: Annually, or after a documented grading defect, choose a new seed, regenerate both splits, review distribution counts, and publish only the public JSONL.
