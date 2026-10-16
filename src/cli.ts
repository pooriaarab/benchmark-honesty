#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import {
  createCli, mockAdapter, openaiCompatAdapter, openrouterAdapter, renderMarkdown,
  run as runBenchmark, type Benchmark, type ModelAdapter, type RunReport, type Task,
} from "benchmark-core";
import { benchmark, createBenchmark } from "./benchmark.js";
import { honestyReport, type HonestyMetrics } from "./index.js";
import { startMcp } from "./mcp.js";

const bin = "benchmark-honesty";
const usage = `Usage: ${bin} <list|show|run|score|card|provenance|index-entry|serve|mcp> [options] [--tasks <path>]`;

function adapterFor(provider: string, model: string, seed: number, target: Benchmark<Task>): ModelAdapter {
  if (provider === "mock") return mockAdapter({ seed, ...target.definition.mockPolicies ? { policies: target.definition.mockPolicies } : {} });
  if (provider === "openrouter") return openrouterAdapter({ model });
  if (provider === "openai") return openaiCompatAdapter({ model });
  throw new Error("--provider must be openrouter, openai, or mock.");
}

function metricLines(metrics: HonestyMetrics): string {
  const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
  return [
    "",
    `- Balanced headline: ${percent(metrics.balanced)} (answerable accuracy ${percent(metrics.answerableAccuracy)} x unanswerable honesty ${percent(metrics.unanswerableHonesty)})`,
    `- Fabrication rate (unanswerable): ${percent(metrics.fabricationRate)}`,
    `- Abstain rate (unanswerable): ${percent(metrics.abstainRate)}`,
    `- Over-abstain rate (answerable): ${percent(metrics.overAbstainRate)}`,
    `- Mean Brier: ${metrics.brier.toFixed(4)}`,
    `- Per-task mean: ${percent(metrics.taskMean)}`,
  ].join("\n");
}

async function runCommand(clean: string[], json: boolean, target: Benchmark<Task>): Promise<number> {
  const parsed = parseArgs({
    args: clean,
    options: {
      model: { type: "string" }, provider: { type: "string" }, concurrency: { type: "string" },
      timeout: { type: "string" }, retries: { type: "string" }, seed: { type: "string" },
      "max-turns": { type: "string" }, "max-tool-calls": { type: "string" }, budget: { type: "string" },
    },
    strict: true,
  });
  const model = parsed.values.model;
  const provider = parsed.values.provider;
  if (!model || !provider) throw new Error("run needs --model and --provider.");
  const seed = Number(parsed.values.seed ?? 1);
  const report = honestyReport(await runBenchmark(target, adapterFor(provider, model, seed, target), {
    ...parsed.values.concurrency ? { concurrency: Number(parsed.values.concurrency) } : {},
    ...parsed.values.timeout ? { timeoutMs: Number(parsed.values.timeout) } : {},
    ...parsed.values.retries ? { retries: Number(parsed.values.retries) } : {},
    seed,
    ...parsed.values["max-turns"] ? { maxTurns: Number(parsed.values["max-turns"]) } : {},
    ...parsed.values["max-tool-calls"] ? { maxToolCalls: Number(parsed.values["max-tool-calls"]) } : {},
    ...parsed.values.budget ? { budgetUsd: Number(parsed.values.budget) } : {},
  }));
  console.log(json ? JSON.stringify(report) : renderMarkdown(report) + metricLines(report.honesty));
  return report.rows.some((row) => row.error) ? 2 : 0;
}

async function scoreCommand(clean: string[], json: boolean, target: Benchmark<Task>): Promise<number> {
  const file = clean[0];
  if (!file) throw new Error("score needs a results JSON file.");
  const original: RunReport = JSON.parse(await readFile(file, "utf8"));
  if (!Array.isArray(original?.rows)) throw new Error("File is not a run report.");
  const rows = [];
  for (const row of original.rows) {
    const task = await target.getTask(row.taskId);
    if (!task || row.submission === undefined) throw new Error(`Cannot score task ${row.taskId}.`);
    const grade = await target.score(task, row.submission, { seed: original.seed });
    rows.push({ ...row, score: grade.score, reason: grade.reason });
  }
  const rescored = honestyReport({ ...original, rows });
  console.log(json ? JSON.stringify(rescored) : renderMarkdown(rescored) + metricLines(rescored.honesty));
  return 0;
}

async function main(): Promise<number> {
  const args = [...process.argv.slice(2)];
  const flag = args.indexOf("--tasks");
  let tasksPath: string | undefined;
  if (flag >= 0) {
    tasksPath = args[flag + 1];
    if (!tasksPath || tasksPath.startsWith("--")) throw new Error("--tasks needs a JSONL file path.");
    args.splice(flag, 2);
  }
  const target = tasksPath === undefined ? benchmark : createBenchmark(tasksPath);
  if (args[0] === "run" && args.includes("mock") && !args.includes("--model")) args.push("--model", "offline");
  const json = args.includes("--json");
  const clean = args.slice(1).filter((arg) => arg !== "--json");
  if (args[0] === "run") return runCommand(clean, json, target);
  if (args[0] === "score") return scoreCommand(clean, json, target);
  if (args[0] === "mcp") { await startMcp(target); return 0; }
  return createCli(target, { bin }).main(args);
}

try {
  process.exitCode = await main();
} catch (caught) {
  console.error(caught instanceof Error ? caught.message : String(caught));
  console.error(usage);
  process.exitCode = 2;
}
