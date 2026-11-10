import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const directory = process.argv[2] ?? "docs/performance/viewer-2026-11-10";
const baseline=JSON.parse(readFileSync(path.join(directory,"baseline.json"),"utf8"));
const candidate=JSON.parse(readFileSync(path.join(directory,"candidate.json"),"utf8"));
if(baseline.cpu!==candidate.cpu || baseline.browser!==candidate.browser) throw Error("Compare the same CPU and browser build.");
const median = values => {const a=values.toSorted((x,y)=>x-y);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;};
const duration=(record,start,end)=>record.marks.find(m=>m.name===end)?.time-record.marks.find(m=>m.name===start)?.time;
const groups=new Map();
for(const record of baseline.results.filter(r=>!r.warmup))groups.set(`${record.rows}x${record.columns}:${record.entry}`,record);
const stats=records=>({
  interactive:median(records.map(r=>r.interactive)),
  analysis:median(records.map(r=>duration(r,"easymsa:analysis-worker-start","easymsa:analysis-worker-done"))),
  firstPaint:median(records.map(r=>duration(r,"perf:start","easymsa:matrix-mounted"))),
  firstScrollP95:median(records.map(r=>r.scroll.p95)),
  settledScrollP95:median(records.map(r=>r.settledScroll.p95))
});
const comparison=[];
for (const [key,sample] of groups) {
  const select=data=>data.results.filter(r=>!r.warmup&&r.rows===sample.rows&&r.columns===sample.columns&&r.entry===sample.entry);
  const old=select(baseline),next=select(candidate);
  if(old.length!==3||next.length!==3||[...old,...next].some(r=>r.errors.length))throw Error(`${key}: expected three successful measured runs per version`);
  const before=stats(old),after=stats(next);
  comparison.push({rows:sample.rows,columns:sample.columns,entry:sample.entry,before,after,
    interactiveReduction:100*(1-after.interactive/before.interactive),analysisReduction:100*(1-after.analysis/before.analysis),
    passed:{interactive:after.interactive<=before.interactive*0.7,analysis:after.analysis<=before.analysis*0.5,scroll:after.firstScrollP95<=25&&after.settledScrollP95<=25}});
}
const seconds=n=>(n/1000).toFixed(2),ms=n=>n.toFixed(1);
const lines=["# 重复测量结果", "", "每组预热一次，以下为随后三次运行的中位数。耗时单位为秒；帧间隔单位为毫秒。", "",
  "| 规模 | 入口 | 首次操作：旧 → 新 | 缩短 | 列及行统计：旧 → 新 | 缩短 | 首轮滚动 P95：旧 → 新 | 统计完成后滚动 P95：旧 → 新 |",
  "|---|---|---:|---:|---:|---:|---:|---:|"];
for(const r of comparison)lines.push(`| ${r.rows.toLocaleString("en-US")} × ${r.columns.toLocaleString("en-US")} | ${r.entry==="file"?"本地文件":"网站结果"} | ${seconds(r.before.interactive)} → ${seconds(r.after.interactive)} | ${r.interactiveReduction.toFixed(1)}% | ${seconds(r.before.analysis)} → ${seconds(r.after.analysis)} | ${r.analysisReduction.toFixed(1)}% | ${ms(r.before.firstScrollP95)} → ${ms(r.after.firstScrollP95)} | ${ms(r.before.settledScrollP95)} → ${ms(r.after.settledScrollP95)} |`);
writeFileSync(path.join(directory,"comparison.json"),JSON.stringify(comparison,null,2));
writeFileSync(path.join(directory,"measurements.md"),lines.join("\n")+"\n");
console.log(JSON.stringify(comparison));
