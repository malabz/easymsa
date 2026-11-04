import { useMemo } from "react";
import type { BenchmarkDataset, BenchmarkSnapshot, MetricKey } from "./model";
import { datasetGroup } from "./BenchmarkMatrix";
import { displayMetricKeys, metricSpecs, selectMetricRows } from "./metrics";
import { words, type Locale } from "./presentation";
import { Hint, metricHelp } from "./MetricHint";
import type { ResultScope } from "./selection";
import "./summary.css";

type DisplayKey = typeof displayMetricKeys[number];
export const summaryFamilies = [
  {id:"", group:-1, en:"All", zh:"全部"},
  {id:"16s", group:0, en:"16S", zh:"16S"},
  {id:"mt", group:1, en:"Mitochondrial", zh:"线粒体"},
  {id:"mt-sim", group:2, en:"Mitochondrial simulation", zh:"线粒体模拟"},
  {id:"rna", group:3, en:"RNA", zh:"RNA"},
] as const;
const winLabels: Record<DisplayKey, [string, string]> = {
  wall_seconds:["Fastest","最快"], max_rss_kib:["Least memory","最省内存"],
  scaled_sp:["Top normalized SP","归一化 SP 最高"], q:["Top Q","Q 最高"], tc:["Top TC","TC 最高"],
};

export type MethodTally = {
  id: string; name: string; total: number; complete: number; timeout: number; oom: number; otherFailures: number;
  wins: Record<DisplayKey, number>;
};

export function familyDatasets(datasets: BenchmarkDataset[], family: string | null) {
  const selected = summaryFamilies.find(item => item.id === family);
  return !selected || selected.group < 0 ? datasets : datasets.filter(dataset => datasetGroup(dataset) === selected.group);
}

/**
 * Count raw best values within each dataset, including every tie. Colour emphasis
 * deliberately stays neutral for identical values or a single observation, so its
 * best flag is not a ranking rule. No raw values are compared across datasets.
 */
export function tallyMethods(snapshot: BenchmarkSnapshot, scope: ResultScope, datasets: BenchmarkDataset[]) {
  const rows: MethodTally[] = snapshot.methods.map(method => ({
    id:method.id, name:method.name, total:0, complete:0, timeout:0, oom:0, otherFailures:0,
    wins:Object.fromEntries(displayMetricKeys.map(key => [key,0])) as Record<DisplayKey, number>,
  }));
  const eligible = Object.fromEntries(displayMetricKeys.map(key => [key,0])) as Record<DisplayKey, number>;
  for (const dataset of datasets) {
    for (const key of displayMetricKeys) {
      const metricRows = selectMetricRows(snapshot, undefined, dataset.id, key, scope);
      const values = metricRows.flatMap(row => row.raw === null ? [] : [row.raw]);
      if (values.length) {
        eligible[key]++;
        const best = metricSpecs[key].direction === "lower" ? Math.min(...values) : Math.max(...values);
        metricRows.forEach((row,index) => { if (row.raw === best) rows[index].wins[key]++; });
      }
      if (key !== "wall_seconds") continue;
      metricRows.forEach((row, index) => {
        const tally = rows[index], status = row.result?.status;
        tally.total++;
        if (status === "complete") tally.complete++;
        else if (status === "timeout") tally.timeout++;
        else if (status === "failed" && row.result?.reason_code === "oom") tally.oom++;
        else if (status === "failed") tally.otherFailures++;
      });
    }
  }
  return {rows, eligible};
}

function Bar({value, total}: {value: number; total: number}) {
  return <span className="benchmark-summary-bar" aria-hidden="true"><i style={{width:`${total ? Math.round(value / total * 100) : 0}%`}}/></span>;
}

export function MethodSummary({snapshot, scope, datasets, locale, family, onFamily, metric, onMetric}: {
  snapshot: BenchmarkSnapshot; scope: ResultScope; datasets: BenchmarkDataset[]; locale: Locale;
  family: string | null; onFamily: (family: string) => void; metric: MetricKey; onMetric: (metric: DisplayKey) => void;
}) {
  const included = familyDatasets(datasets, family);
  // The caller rebuilds the snapshot object on every render; key the tally on what it counts.
  const methodKey = snapshot.methods.map(method => method.id).join(","), datasetKey = included.map(dataset => dataset.id).join(",");
  const {rows, eligible} = useMemo(() => tallyMethods(snapshot, scope, included), [snapshot.catalog, snapshot.batches, methodKey, datasetKey, scope]);
  const leaders = Object.fromEntries(displayMetricKeys.map(key => [key, Math.max(0, ...rows.map(row => row.wins[key]))])) as Record<DisplayKey, number>;
  const activeFamily = summaryFamilies.some(item => item.id === family) ? family ?? "" : "";
  return <section className="benchmark-summary" aria-labelledby="benchmark-summary-heading" data-testid="method-summary">
    <div className="benchmark-summary-head">
      <div>
        <h2 id="benchmark-summary-heading">{words(locale,"Methods at a glance","方法一览")}</h2>
        <p>{words(locale,`How many of ${included.length} datasets each method wins`,`${included.length} 个数据集里，各方法拿第一的次数`)}</p>
      </div>
      <div className="benchmark-summary-families" role="group" aria-label={words(locale,"Dataset family","数据族")}>
        {summaryFamilies.map(item => <button key={item.id} type="button" aria-pressed={activeFamily === item.id} onClick={() => onFamily(item.id)}>{words(locale,item.en,item.zh)}</button>)}
      </div>
    </div>
    <div className="benchmark-summary-scroll" role="region" tabIndex={0} aria-label={words(locale,"Scrollable method summary","可横向滚动的方法一览")}>
      <table className="benchmark-summary-table">
        <caption className="sr-only">{words(locale,"Completed runs and best-in-dataset counts per method","各方法的完成数与各指标第一次数")}</caption>
        <thead><tr>
          <th scope="col">{words(locale,"Method","方法")}</th>
          <th scope="col"><Hint text={words(locale,"Datasets the method finished within the run limits.","在资源上限内正常跑完的数据集个数。")} align="end">{words(locale,"Completed","完成")}</Hint></th>
          {displayMetricKeys.map((key,index) => <th scope="col" key={key}><Hint align={index >= displayMetricKeys.length - 2 ? "end" : "center"} text={words(locale,"Datasets where it ranks first (ties count for each); click to see them below. ","排第一的数据集个数（并列都算），点击在下方矩阵查看。") + metricHelp(key,locale)}><button type="button" aria-pressed={metric === key} onClick={() => onMetric(key)}>{words(locale,...winLabels[key])}</button></Hint></th>)}
        </tr></thead>
        <tbody>{rows.map(row => {
          const failures = [
            row.timeout ? words(locale,`${row.timeout} timed out`,`超时 ${row.timeout}`) : "",
            row.oom ? words(locale,`${row.oom} memory limit`,`内存超限 ${row.oom}`) : "",
            row.otherFailures ? words(locale,`${row.otherFailures} failed`,`其他失败 ${row.otherFailures}`) : "",
          ].filter(Boolean).join(" · ");
          return <tr key={row.id} data-method={row.id}>
            <th scope="row">{row.name}</th>
            <td data-incomplete={row.complete < row.total} data-testid="summary-complete">
              <span className="benchmark-summary-value">{row.complete}<small> / {row.total}</small></span>
              {failures && <span className="benchmark-summary-failures">{failures}</span>}
              <Bar value={row.complete} total={row.total}/>
            </td>
            {displayMetricKeys.map(key => <td key={key} data-metric={key} data-top={row.wins[key] > 0 && row.wins[key] === leaders[key]} data-testid="summary-wins">
              <span className="benchmark-summary-value">{row.wins[key]}<small> / {eligible[key]}</small></span>
              <Bar value={row.wins[key]} total={eligible[key]}/>
            </td>)}
          </tr>;
        })}</tbody>
      </table>
    </div>
  </section>;
}
