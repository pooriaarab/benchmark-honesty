import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { benchmark, run } from '../../dist/index.js';
import { mockAdapter } from 'benchmark-core';
import { mean, wilson, bootstrap } from '../template/stats.mjs';
const hash = x => createHash('sha256').update(x).digest('hex');
const tasks = await benchmark.listTasks(), config = JSON.parse(await readFile('paper/config.json'));
const options = { seed: 1, concurrency: 1, retries: 0, maxTurns: 4, maxToolCalls: 4, budgetUsd: 0 };
const policies = ['empty', 'constant', 'echo', 'refuse', 'first-tool', 'packaged-good', 'packaged-bad', 'recovery', 'always-abstain', 'no-retry'];
const conditions = [...policies.map(policy => ({ policy, confidence: policy === 'packaged-bad' ? 95 : 100 })), ...[0, 25, 50, 75].map(confidence => ({ policy: 'recovery', confidence }))];
await mkdir('paper/data', { recursive: true });
const save = (name, x) => writeFile(`paper/data/${name}.generated.json`, JSON.stringify(x, null, 2) + '\n');
function adapter(policy, confidence) {
  if (policy.startsWith('packaged-')) {
    const script = benchmark.definition.mockPolicies[policy.slice(9)];
    return mockAdapter({ seed: 1, policies: { good: script, bad: script } });
  }
  return { id: `script:${policy}:${confidence}`, complete: async () => { throw new Error('Expected an episode'); }, async chat({ messages, tools }) {
    const reply = content => ({ content, toolCalls: [] });
    const prompt = messages.find(m => m.role === 'user').content;
    if (policy === 'empty') return reply('');
    if (policy === 'constant') return reply('OK');
    if (policy === 'echo') return reply(prompt);
    if (policy === 'refuse') return reply('I cannot help with that request.');
    const observations = messages.filter(m => m.role === 'tool');
    const call = args => ({ content: '', toolCalls: [{ id: `call-${observations.length}`, name: tools[0].name, args }] });
    if (policy === 'first-tool') return call({});
    const match = prompt.match(/^Use lookup_fact to find the (.+?) of (.+?)\./);
    assert.ok(match, 'Prompt format changed');
    const args = { attribute: match[1], subject: match[2] };
    const last = observations.length ? JSON.parse(observations.at(-1).content) : null;
    if (!last || (policy === 'recovery' && last.error?.code === 'TRANSIENT')) return call(args);
    return reply(JSON.stringify({ answer: policy === 'always-abstain' ? null : last.found ? last.value : null, confidence }));
  } };
}
const semantic = report => report.rows.map(({ taskId, submission, episode, score, reason }) => ({ taskId, submission, episode, score, reason }));
const reports = [], repeats = [];
for (const condition of conditions) {
  const report = await run(adapter(condition.policy, condition.confidence), options);
  const repeat = await run(adapter(condition.policy, condition.confidence), options);
  for (const r of [report, repeat]) {
    assert.deepEqual(r.rows.map(x => x.taskId), tasks.map(t => t.id));
    assert.ok(r.rows.every(x => !x.error), 'Infrastructure failure; do not score it');
    assert.equal(r.totals.costUsd ?? 0, 0);
  }
  const digest = hash(JSON.stringify(semantic(report)));
  assert.equal(digest, hash(JSON.stringify(semantic(repeat))));
  reports.push({ ...condition, report });
  repeats.push({ ...condition, sha256: digest, repeatSha256: hash(JSON.stringify(semantic(repeat))), repeat });
}
await save('runs', reports); await save('repeat', repeats);
const fields = row => Object.fromEntries([...row.reason.matchAll(/(\w+)=([^;]+)/g)].map(m => [m[1], m[2]]));
const stats = reports.map(({ policy, confidence, report }) => {
  const rows = report.rows.map(r => ({ ...r, f: fields(r) }));
  const groups = [true, false].map(a => rows.filter(r => r.f.answerable === String(a)));
  const rate = (g, key) => wilson(g.filter(r => r.f[key] === 'true').length, g.length);
  const balanced = bootstrap(groups, gs => Math.sqrt(mean(gs[0].map(r => +(r.f.correct === 'true'))) * mean(gs[1].map(r => +(r.f.correct === 'true')))));
  assert.equal(balanced.value, report.mean);
  return { policy, confidence, balanced, answerable: rate(groups[0], 'correct'), unavailable: rate(groups[1], 'correct'), fabrication: rate(groups[1], 'fabricated'), overAbstention: rate(groups[0], 'abstained'), brier: bootstrap(groups, gs => mean(gs.flat().map(r => +r.f.brier))), taskMean: bootstrap(groups, gs => mean(gs.flat().map(r => r.score))), outcomes: Object.fromEntries(['invalid', 'unsupported', 'fabrication', 'supported-answer', 'honest-abstention'].map(o => [o, rows.filter(r => r.f.outcome === o).length])) };
});
const reference = reports.find(r => r.policy === 'recovery' && r.confidence === 100).report.rows;
const contrasts = reports.filter(r => r.policy === 'recovery').map(r => {
  const paired = r.report.rows.map((row, i) => ({ a: tasks[i].metadata.answerable, brier: +fields(row).brier - +fields(reference[i]).brier, correct: +(fields(row).correct === 'true') - +(fields(reference[i]).correct === 'true') }));
  const groups = [true, false].map(a => paired.filter(x => x.a === a));
  return { confidence: r.confidence, brierDifference: bootstrap(groups, gs => mean(gs.flat().map(x => x.brier))), correctDifference: bootstrap(groups, gs => mean(gs.flat().map(x => x.correct))) };
});
const coverage = [...new Set(tasks.map(t => t.metadata.attribute))].map(attribute => ({ attribute, counts: ['answerable', 'missing-entity', 'withheld-attribute'].map(s => tasks.filter(t => t.metadata.attribute === attribute && (t.metadata.answerable ? 'answerable' : t.metadata.unavailable) === s).length) }));
const weights = (await readFile('src/benchmark.ts', 'utf8')).match(/fabricated \? 0 : ([0-9.]+) \* Number\(correct\) \+ ([0-9.]+)/);
assert.ok(weights, 'Scoring formula changed');
const summary = { scoreWeights: weights.slice(1).map(Number), schema_version: 1, kind: 'scripted-controls', options, tasks: tasks.length, strata: [30, 30], policies: policies.length, conditions: conditions.length, episodes: tasks.length * conditions.length * 2, costUsd: 0, ciLevel: 95, coverage, stats, contrasts, repeatIdentical: true, freeModels: { status: 'not-run', reason: 'No free-only proxy URL or OpenRouter credential configured at registration; availability elsewhere is unknown.' } };
assert.equal(tasks.filter(t => t.metadata.answerable).length, summary.strata[0]);
assert.equal(tasks.filter(t => !t.metadata.answerable).length, summary.strata[1]);
await save('summary', summary);
const sources = ['data/tasks.jsonl', 'package-lock.json', 'src/benchmark.ts', 'src/index.ts', 'paper/PREREG.md', 'paper/scripts/run.mjs', 'paper/template/stats.mjs'];
for (const p of sources.slice(0, 4)) assert.equal(hash(await readFile(p)), hash(execFileSync('git', ['show', `${config.source_commit}:${p}`])), `Frozen input changed: ${p}`);
await save('provenance', { source_commit: config.source_commit, prereg_commit: execFileSync('git', ['log', '--reverse', '--format=%H', '--', 'paper/PREREG.md'], { encoding: 'utf8' }).trim().split('\n')[0], node: process.version, files: Object.fromEntries(await Promise.all(sources.map(async p => [p, hash(await readFile(p))]))), run_hash: hash(await readFile('paper/data/runs.generated.json')) });
console.log(`Completed ${summary.episodes} episodes; ${conditions.length} repeated conditions agree; API cost USD 0`);
