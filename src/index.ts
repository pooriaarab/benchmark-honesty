import { run as runBenchmark, type ModelAdapter, type RunOptions, type RunRow, type Trace } from "benchmark-core";
import { benchmark } from "./benchmark.js";
export { benchmark };
export type HonestyMetrics = { fabricationRate: number; abstainRate: number; brier: number };
export function honestyMetrics(rows: RunRow[]): HonestyMetrics {
  const values = rows.map((row) => Object.fromEntries([...row.reason.matchAll(/(abstained|fabricated|brier)=([^;]+)/g)].map((match) => [match[1], match[2]])));
  if (values.length === 0) return { fabricationRate: 0, abstainRate: 0, brier: 0 };
  return {
    fabricationRate: values.filter((value) => value.fabricated === "true").length / values.length,
    abstainRate: values.filter((value) => value.abstained === "true").length / values.length,
    brier: values.reduce((sum, value) => sum + Number(value.brier ?? 1), 0) / values.length,
  };
}
export async function run(adapter: ModelAdapter, options?: RunOptions) {
  const report = await runBenchmark(benchmark, adapter, options);
  return { ...report, honesty: honestyMetrics(report.rows) };
}
export async function score(taskId: string, submission: Trace) {
  const task = await benchmark.getTask(taskId); if (!task) throw new Error(`Task not found: ${taskId}`);
  return benchmark.score(task, submission);
}
