import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const dir = process.argv[2] ?? "docs/performance/viewer-scroll-2026-11-10";
const read = name => JSON.parse(readFileSync(path.join(dir, name), "utf8"));
const before = read("round1-repeat.json"), after = read("candidate.json");
const previous = JSON.parse(readFileSync("docs/performance/viewer-2026-11-10/candidate.json", "utf8"));
for (const data of [before, previous]) if (data.cpu !== after.cpu || data.browser !== after.browser)
  throw Error("CPU/browser changed between measurements.");
const median = xs => xs.toSorted((a,b) => a-b)[1];
const summarize = records => {
  if (records.length !== 3 || records.some(r => r.errors.length)) throw Error("Need three error-free measured runs per group.");
  const elapsed = r => r.marks.find(m => m.name === "easymsa:analysis-worker-done").time - r.marks.find(m => m.name === "easymsa:analysis-worker-start").time;
  return { interactiveMs: median(records.map(r => r.interactive)), analysisMs: median(records.map(elapsed)),
    firstScrollP95: median(records.map(r => r.scroll.p95)), settledScrollP95: median(records.map(r => r.settledScroll.p95)) };
};
const comparisons = [];
for (const rows of [500, 5000, 50000]) for (const columns of [1000, 10000, 100000]) for (const entry of ["file", "result"]) {
  const select = data => data.results.filter(r => !r.warmup && r.rows === rows && r.columns === columns && r.entry === entry);
  const next = select(after);
  if (!next.length) continue;
  const repeated = select(before), baseline = repeated.length ? repeated : select(previous);
  const a = summarize(baseline), b = summarize(next);
  comparisons.push({ rows, columns, entry, baselineSource: repeated.length ? "round1-repeat.json" : "../viewer-2026-11-10/candidate.json",
    before: a, after: b, firstScrollReductionPercent: 100*(1-b.firstScrollP95/a.firstScrollP95),
    settledScrollReductionPercent: 100*(1-b.settledScrollP95/a.settledScrollP95),
    scrollGoalMet: b.firstScrollP95 <= 25 && b.settledScrollP95 <= 25 });
}
if (comparisons.length !== 8) throw Error("Expected all four shapes and both entry paths.");
writeFileSync(path.join(dir, "comparison.json"), JSON.stringify(comparisons, null, 2));
const lines = ["# 滚动性能复测", "", "每个场景预热一次、正式测量三次，取中位数。5,000 × 10,000 的上轮版本在本次重新测量，其余上轮数字引用同日已保存的记录；不把这些数字称作本次成对重测。", "",
  "| 数据规模 | 入口 | 首次可操作（秒） | 列及行统计（秒） | 首轮滚动 P95：上轮 → 本轮（毫秒） | 统计后滚动 P95：上轮 → 本轮（毫秒） | 两项均 ≤25 毫秒 |",
  "|---|---|---:|---:|---:|---:|---|"];
for (const r of comparisons) lines.push(`| ${r.rows.toLocaleString("en-US")} × ${r.columns.toLocaleString("en-US")} | ${r.entry === "file" ? "文件" : "网站结果"} | ${(r.after.interactiveMs/1000).toFixed(2)} | ${(r.after.analysisMs/1000).toFixed(2)} | ${r.before.firstScrollP95.toFixed(1)} → ${r.after.firstScrollP95.toFixed(1)} | ${r.before.settledScrollP95.toFixed(1)} → ${r.after.settledScrollP95.toFixed(1)} | ${r.scrollGoalMet ? "是" : "否"} |`);
writeFileSync(path.join(dir, "measurements.md"), lines.join("\n") + "\n");
console.log(JSON.stringify(comparisons));
