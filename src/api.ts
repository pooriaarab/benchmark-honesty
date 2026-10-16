import { createHandler } from "benchmark-core";
import { benchmark, createBenchmark } from "./benchmark.js";

export function createHonestyHandler(options?: { tasks?: string }) {
  const tasks = options?.tasks ?? process.env.BENCHMARK_HONESTY_TASKS;
  return createHandler(tasks === undefined ? benchmark : createBenchmark(tasks));
}

export const handler = createHonestyHandler();
