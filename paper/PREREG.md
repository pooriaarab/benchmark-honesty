# Honesty pilot: plan before data

Plan date: 2026-10-29. Author: Pooria Arab, independent researcher.
This Git plan precedes study outputs. It is not an external registration.
No study data exist at registration. Source inspection and the family paper inform this plan.

## Question and hypotheses
H1: An evidence-reading recovery script and the packaged good script achieve perfect balanced scores.
H2: Empty, constant, echo, refuse, first-tool, packaged-bad, always-abstain, and no-retry controls achieve zero balanced scores.
H3: Changing only recovery-script confidence leaves balanced success unchanged but changes Brier loss.
These are deterministic checks, not population-level model comparisons. Report nulls and contradictions.

## Conditions and measurement
Freeze benchmark-honesty 0.2.0 at e04c36fa92b5e5bb5ca845100d7fdb87ce00415a and its lockfile.
Use all public tasks, seed 20261015: 30 answerable and 30 unavailable episodes.
Use the package runner, environment, replay grader, and headline aggregation.
Run seed 1, concurrency 1, maximum 4 turns and 4 tool calls, no retries.
Record outputs, tool traces, outcome classes, component correctness, Brier loss, and task score.
Primary measure: geometric mean of answerable accuracy and evidence-backed unavailable abstention.
Report component rates with 95% Wilson intervals over tasks within each fixed stratum.
Report balanced score, mean task score, and Brier loss with stratified percentile bootstrap intervals.
Use 2000 bootstrap draws, seed 20261029. Paired confidence contrasts reuse item indices.
Intervals describe hypothetical item resampling, not uncertainty about these deterministic finite-set outcomes.

## Policies and stopping rule
Run ten controls: empty text; constant "OK"; prompt echo; prose refusal; first tool with empty arguments;
packaged good; packaged bad; evidence-reading recovery; always-abstain after one correct lookup;
and no-retry recovery that abstains after the first transient error.
Recovery reads only prompts and tool responses. Packaged scripts can inspect task metadata.
Use confidence 100 for structured controls, except the unchanged packaged bad policy.
Sweep recovery confidence across 0, 25, 50, 75, 100; reuse its main 100 condition.
Repeat all fourteen conditions once to check semantic trace identity: 1680 episodes total.
Stop after this fixed design. Do not expand the sample after seeing results.
No human study, learned model, hidden split, or simulated agent population is planned.
Hosted free models are unavailable in this session: neither a free proxy URL nor an OpenRouter key is configured.
No credential search or paid fallback. Model API spend must remain USD 0.

## Exclusions, failure modes, and analysis
Exclude no task based on score. Empty, malformed, refusal, and exhausted-turn outcomes remain failures.
Infrastructure exceptions abort the run; record and repair them before a complete rerun.
Check that all policies cover identical task IDs and answerability strata.
Check that scripts cannot access ground truth, except the explicitly labelled packaged controls.
Check raw-to-summary aggregation, immutable task hashes, repeated trace hashes, and paired confidence invariance.
Check metadata ASCII/length, citation consistency, figure inputs, PDF compilation, and missing references.
Produce policy score, coverage, and confidence-sensitivity figures from generated data.
Publish raw outputs and hashes with the PR. Keep the PDF local and attach rendered proof.
Public tasks permit memorization. No human agreement or external validity claim is planned.
Log any design changes here before affected data collection. Report every planned hypothesis.

## Deviations
None at registration.
