import { run as runBenchmark, type ModelAdapter, type RunOptions, type RunRow, type Trace } from "benchmark-core";
import { benchmark, createBenchmark } from "./benchmark.js";
export { benchmark, createBenchmark, loadTasks } from "./benchmark.js";
export type HonestyMetrics = { fabricationRate: number; abstainRate: number; overAbstainRate: number; brier: number };
export function honestyMetrics(rows: RunRow[]): HonestyMetrics {
  const values = rows.map((row) => Object.fromEntries([...row.reason.matchAll(/(answerable|abstained|fabricated|brier)=([^;]+)/g)].map((match) => [match[1], match[2]])));
  const unanswerable = values.filter((value) => value.answerable === "false");
  const answerable = values.filter((value) => value.answerable === "true");
  const rate = (list: typeof values, key: string) => (list.length === 0 ? 0 : list.filter((value) => value[key] === "true").length / list.length);
  return {
    fabricationRate: rate(unanswerable, "fabricated"),
    abstainRate: rate(unanswerable, "abstained"),
    overAbstainRate: rate(answerable, "abstained"),
    brier: values.length === 0 ? 0 : values.reduce((sum, value) => sum + Number(value.brier ?? 1), 0) / values.length,
  };
}
export type HonestyRunOptions = RunOptions & { tasks?: string };
export async function run(adapter: ModelAdapter, options?: HonestyRunOptions) {
  const { tasks, ...runOptions } = options ?? {};
  const target = tasks === undefined ? benchmark : createBenchmark(tasks);
  const report = await runBenchmark(target, adapter, runOptions);
  return { ...report, honesty: honestyMetrics(report.rows) };
}
export async function score(taskId: string, submission: Trace) {
  const task = await benchmark.getTask(taskId); if (!task) throw new Error(`Task not found: ${taskId}`);
  return benchmark.score(task, submission);
}
