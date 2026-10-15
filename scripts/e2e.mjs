import assert from "node:assert/strict";
import { execFile as execFileCallback, spawn } from "node:child_process";
import { once } from "node:events";
import { createServer as createNetServer } from "node:net";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
const execFile = promisify(execFileCallback);

await execFile("npm", ["run", "build"]);
const { benchmark } = await import("../dist/index.js");
const cli = await execFile(process.execPath, ["dist/cli.js", "run", "--model", "offline", "--provider", "mock", "--json"], { maxBuffer: 1_000_000 });
const report = JSON.parse(cli.stdout);
assert.equal(report.rows.length, 60);
assert.ok(report.rows.some((row) => row.score === 1));
assert.ok(report.rows.some((row) => row.score === 0));

const tasks = await benchmark.listTasks();
const lookup = (task) => ({ name: "lookup_fact", args: { subject: task.metadata.subject, attribute: task.metadata.attribute }, result: null });
const goodScores = [];
for (const task of tasks) {
  const calls = task.metadata.answerable ? [lookup(task), lookup(task)] : [lookup(task)];
  const answer = JSON.stringify({ answer: task.metadata.answerable ? task.expected : null, confidence: 100 });
  goodScores.push((await benchmark.score(task, { answer, toolLog: calls })).score);
}
assert.ok(goodScores.reduce((sum, score) => sum + score, 0) / goodScores.length >= 0.99);

const badSubmissions = {
  empty: {},
  random: { answer: JSON.stringify({ answer: "random", confidence: 100 }) },
  always_yes: { answer: JSON.stringify({ answer: "yes", confidence: 100 }) },
  same_tool_call: { answer: JSON.stringify({ answer: "1999", confidence: 100 }), toolLog: [{ name: "lookup_fact", args: { subject: "Amber Archive", attribute: "founding year" }, result: null }] },
};
const badAverages = {};
for (const [name, submission] of Object.entries(badSubmissions)) {
  const scores = await Promise.all(tasks.map(async (task) => (await benchmark.score(task, submission)).score));
  badAverages[name] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  assert.ok(badAverages[name] <= 0.05, `${name} scored ${badAverages[name]}`);
}

const probe = createNetServer();
await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
const address = probe.address(); assert.ok(address && typeof address === "object");
await new Promise((resolve) => probe.close(resolve));
const server = spawn(process.execPath, ["dist/cli.js", "serve", String(address.port)], { stdio: ["ignore", "pipe", "pipe"] });
const base = `http://127.0.0.1:${address.port}`; const routes = {};
async function get(path) {
  const response = await fetch(`${base}${path}`); routes[`GET ${path}`] = response.status;
  return { response, value: await response.json() };
}
try {
  for (let attempt = 0; attempt < 100; attempt++) { try { await get("/health"); break; } catch { await new Promise((resolve) => setTimeout(resolve, 20)); } }
  const health = await get("/health"); assert.equal(health.response.status, 200);
  const listed = await get("/v1/tasks"); assert.equal(listed.value.tasks.length, 60);
  const shown = await get("/v1/tasks/public-001"); assert.equal(shown.value.task.id, "public-001");
  const score = await fetch(`${base}/v1/score`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ taskId: "public-001", submission: report.rows[0].submission }) });
  routes["POST /v1/score"] = score.status; assert.equal(score.status, 200);
  assert.equal((await get("/v1/provenance")).response.status, 200);
  assert.equal((await get("/v1/index-entry")).value.task_count, 60);
} finally { if (server.exitCode === null) { server.kill("SIGTERM"); await once(server, "exit"); } }

const transport = new StdioClientTransport({ command: process.execPath, args: ["dist/cli.js", "mcp"], cwd: process.cwd(), stderr: "pipe" });
const client = new Client({ name: "benchmark-honesty-e2e", version: "0.1.0" });
await client.connect(transport); let toolNames;
try {
  const available = await client.listTools(); toolNames = available.tools.map((tool) => tool.name).sort();
  assert.deepEqual(toolNames, ["get_provenance", "get_task", "list_tasks", "run_benchmark", "score_answer"]);
  const calls = [
    ["list_tasks", {}], ["get_task", { taskId: "public-001" }],
    ["score_answer", { taskId: "public-001", submission: report.rows[0].submission }],
    ["get_provenance", {}], ["run_benchmark", { model: "offline" }],
  ];
  for (const [name, args] of calls) {
    const result = await client.callTool({ name, arguments: args });
    if (name === "run_benchmark") assert.equal(result.isError, true); else assert.notEqual(result.isError, true);
  }
} finally { await client.close(); }

const fields = report.rows.map((row) => Object.fromEntries([...row.reason.matchAll(/(abstained|fabricated|brier)=([^;]+)/g)].map((match) => [match[1], match[2]])));
const honestyMetrics = {
  fabricationRate: fields.filter((item) => item.fabricated === "true").length / fields.length,
  abstainRate: fields.filter((item) => item.abstained === "true").length / fields.length,
  brier: fields.reduce((sum, item) => sum + Number(item.brier ?? 1), 0) / fields.length,
};
const artifact = { task_count: report.rows.length, scores: report.rows.map((row) => row.score), honesty_metrics: honestyMetrics, bad_answer_averages: badAverages, route_status_codes: routes, tool_names: toolNames };
await mkdir("artifacts", { recursive: true });
await writeFile("artifacts/e2e-report.json", `${JSON.stringify(artifact, null, 2)}\n`);
assert.match(await readFile("data/PROVENANCE.md", "utf8"), /Seeded fictional knowledge base/);
console.log(`e2e: ${artifact.task_count} tasks, ${Object.keys(routes).length} routes, ${toolNames.length} tools -> all surfaces passed, ok`);
