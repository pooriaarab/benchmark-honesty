import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { benchmark, honestyReport } from '../../dist/index.js';
const read = async p => JSON.parse(await readFile(p));
const runs = await read('paper/data/runs.generated.json'), summary = await read('paper/data/summary.generated.json');
let rows = 0;
for (const { report, policy, confidence } of runs) {
  for (const r of report.rows) {
    const task = await benchmark.getTask(r.taskId), grade = await benchmark.score(task, r.submission, { seed: report.seed });
    assert.equal(grade.score, r.score); assert.equal(grade.reason, r.reason); rows++;
  }
  const actual = honestyReport(report), saved = summary.stats.find(s => s.policy === policy && s.confidence === confidence);
  assert.equal(actual.mean, saved.balanced.value);
  assert.ok(Math.abs(actual.honesty.brier - saved.brier.value) < 1e-10);
}
const meta = await read('paper/meta.json'), cff = await readFile('CITATION.cff', 'utf8');
assert.ok(meta.abstract.length <= 1920 && /^[\x00-\x7f]*$/.test(meta.abstract));
assert.ok(cff.includes(meta.title) && cff.includes(meta.authors[0].orcid));
const text = execFileSync('pdftotext', ['paper/' + meta.artifact_name, '-'], { encoding: 'utf8' });
assert.ok(text.includes('Caveats') && text.includes('Authors') && !text.includes('??') && !text.includes('AuthorOrcid'));
assert.ok(!text.includes('\u2014'), 'Em dash in paper');
const pdf = await readFile('paper/' + meta.artifact_name);
await writeFile('paper/data/verification.generated.json', JSON.stringify({ replayedRows: rows, conditions: runs.length, summaryMatches: true, metadataMatches: true, pdfTextChecks: true, pdfSha256: createHash('sha256').update(pdf).digest('hex') }, null, 2) + '\n');
console.log(`Verified ${rows} replayed grades, metadata, and PDF text`);
