# Honesty paper pilot

Run from the repository root with Node 20+, npm, Python 3, Tectonic, and Poppler (`pdftotext`) on PATH:

```sh
npm ci
npm run build
node paper/scripts/run.mjs
node paper/scripts/render.mjs
python3 paper/template/build.py
node paper/scripts/verify.mjs
```

One-command repeat after installation: `sh paper/template/reproduce.sh`.
The output is `paper/honesty-paper.pdf`. PDFs and downloaded styles stay untracked.
The build downloads the official NeurIPS preprint style and verifies its pinned archive hash.
Tectonic can download TeX dependencies on its first run. Experiments use no network or credentials.
Do not publish the packet automatically. The parent handles publication and merge review.

## Copy this pilot
Copy `template/` unchanged: shared statistics, layout, style verification, and build orchestration.
Keep `scripts/`, `figures/`, `config.json`, `paper.tex`, and `references.bib` benchmark-specific.
Replace the adapter with the new benchmark's public execution path. Do not transplant honesty metrics without checking their meaning.
Write and commit `PREREG.md` before collecting results. Record all later design changes before affected runs.
Adapt `run.mjs` to produce raw traces, a summary, repeated-run evidence, and provenance hashes.
Adapt `render.mjs` to read generated data and write metadata, macros, tables, and figure CSVs.
Use `.generated.json` and `.generated.csv` for machine outputs. Never edit them by hand.
Keep prose free of repository details. Include construct, controls, uncertainty, limitations, citation, and authors.
Keep at least three data figures. Their current sources are coverage, component correctness, and confidence sensitivity.
Retain the checks for raw-to-summary agreement and reproducible semantic traces.

## Metadata contract, version 1
`meta.json` contains `schema_version`, `title`, `abstract`, `authors`, `license`, `keywords`, `code_url`, and `artifact_name`.
`abstract` is ASCII and at most 1920 characters. Each author has `name`, `affiliation`, and an HTTPS `orcid` URL.
`license` is `CC-BY-4.0`. `keywords` is a string array; `code_url` points to the benchmark repository.
`artifact_name` is a PDF basename. Keep title and authors aligned with `CITATION.cff`.
`config.json` holds identity and the frozen benchmark source commit. Copy only public identity fields into it.
The benchmark code and task license remains MIT; the paper text and generated figures use CC-BY-4.0.

## Evidence and limits
`data/runs.generated.json` stores actual runner reports, final outputs, and full tool transcripts.
`data/repeat.generated.json` stores repeated reports and matching semantic hashes; timings are excluded from those hashes.
`data/provenance.generated.json` records source hashes and the first study-plan commit.
`data/summary.generated.json` records intervals, counts, outcomes, paired contrasts, and the free-model omission.
The repeat command replaces generated files. Timings change; decisions and scores must agree.
Wilson intervals describe task-level uncertainty under a hypothetical sampling model. Bootstrap draws preserve the two availability strata.
Repeated runs do not increase sample size. Boundary bootstrap intervals collapse; report Wilson component intervals alongside them.
Free hosted inference is not configured in this session. We do not test provider availability or publish learned-model scores.
No human validation, deployment claim, or independent external registration is present.
House reference: `pooriaarab/benchmark-family-paper`, `paper/main.tex` and its honesty entries.
The paper follows PayBench's construct-first structure without claiming its matched-pair design.
