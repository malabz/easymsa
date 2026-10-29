import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { PageContainer } from "../components/layout/PageContainer";
import { useLanguage } from "../lib/i18n/useLanguage";
import { compatibleBatches, metricKeys, type MetricKey } from "../features/benchmark/model";
import { useBenchmark } from "../features/benchmark/useBenchmark";
import { metricSpecs, metricValue } from "../features/benchmark/metrics";
import { MetricPlots } from "../features/benchmark/MetricPlots";
import { BatchContext, BatchSelector, DownloadButtons, LoadState, MetricCell, StatusPill, reasonLabel, sourceLabel, stateLabel, words } from "../features/benchmark/presentation";
import "../features/benchmark/benchmark.css";
import "../features/benchmark/plots.css";

export function BenchmarkDatasetPage() {
  const { locale } = useLanguage();
  const { caseId } = useParams<{ caseId: string }>();
  const [params, setParams] = useSearchParams();
  const { data, failed, retry } = useBenchmark();
  const [view, setView] = useState<"charts" | "table">("charts");
  const incomingMetric = params.get("metric") as MetricKey;
  const selectedMetric: MetricKey = metricKeys.includes(incomingMetric) ? incomingMetric : "wall_seconds";
  const selectedMethod = params.get("method") ?? undefined;
  const incomingReturn = params.get("returnTo") ?? "";
  const returnTo = incomingReturn === "/benchmark" || incomingReturn.startsWith("/benchmark?") ? incomingReturn : "/benchmark";
  if (!data) return <PageContainer className="benchmark-page"><LoadState failed={failed} retry={retry} locale={locale} /></PageContainer>;
  const dataset = data.catalog.datasets.find(d => d.id === caseId);
  if (!dataset) return <PageContainer className="benchmark-page space-y-4"><h1 className="text-2xl font-semibold">{words(locale, "Dataset not found", "未找到数据集")}</h1><p>{words(locale, "This dataset is not part of the published catalog.", "公开目录中没有该数据集。")}</p><Link className="benchmark-back" to={returnTo}>{words(locale, "Back to Benchmark", "返回 Benchmark")}</Link></PageContainer>;
  // Keep an explicitly selected sparse batch when navigating to an unselected dataset.
  const batches = compatibleBatches(data);
  const batch = batches.find(b => b.id === params.get("batch")) ?? batches[0];
  const source = data.catalog.sources.find(s => s.id === dataset.source_id);
  const index = data.catalog.datasets.findIndex(d => d.id === dataset.id);
  const previous = data.catalog.datasets[index - 1];
  const next = data.catalog.datasets[index + 1];
  const destination = (id: string) => { const query = new URLSearchParams(params); if (batch) query.set("batch", batch.id); query.set("returnTo", returnTo); return `/benchmark/datasets/${encodeURIComponent(id)}?${query}`; };
  const metadata = [
    [words(locale, "Type", "类型"), dataset.sequence_type.toUpperCase()],
    [words(locale, "Sequences", "序列数"), dataset.sequence_count.toLocaleString()],
    [words(locale, "Length range", "长度范围"), `${dataset.min_length.toLocaleString()}–${dataset.max_length.toLocaleString()}`],
    [words(locale, "Reference alignment", "参考比对"), words(locale, dataset.reference ? "Full reference" : "No reference", dataset.reference ? "完整参考比对" : "无参考比对")],
    [words(locale, "Data origin", "数据来源类型"), sourceLabel(dataset.source_kind, locale)],
    [words(locale, "Size class", "规模分类"), words(locale, dataset.classification === "ordinary" ? "Ordinary" : dataset.classification === "large" ? "Large" : "Unclassified", dataset.classification === "ordinary" ? "普通" : dataset.classification === "large" ? "大型" : "未分类")]
  ];
  return <PageContainer className="benchmark-page benchmark-detail-v2">
    <header className="benchmark-detail-header">
      <div className="benchmark-detail-topline"><Link className="benchmark-back" to={returnTo}><ArrowLeft size={15} aria-hidden="true" />{words(locale, "All benchmark datasets", "全部评测数据集")}</Link><nav className="benchmark-neighbours" aria-label={words(locale, "Adjacent datasets", "相邻数据集")}>{previous && <Link to={destination(previous.id)}><ArrowLeft size={14} aria-hidden="true" />{words(locale, "Previous", "上一组")}</Link>}{next && <Link to={destination(next.id)}>{words(locale, "Next", "下一组")}<ArrowRight size={14} aria-hidden="true" /></Link>}</nav></div>
      <div className="benchmark-detail-titleline"><div><h1>{dataset.id}</h1>
      <p>{dataset.sequence_type.toUpperCase()} · {words(locale, `${dataset.sequence_count.toLocaleString()} sequences`, `${dataset.sequence_count.toLocaleString()} 条序列`)} · {words(locale, "Length ", "长度 ")}{dataset.min_length.toLocaleString()}–{dataset.max_length.toLocaleString()} · {words(locale, dataset.reference ? "Full reference" : "No reference", dataset.reference ? "完整参考比对" : "无参考比对")}</p></div><div className="benchmark-detail-toolbar"><BatchSelector batches={batches} value={batch?.id ?? ""} onChange={value => { const query = new URLSearchParams(params); query.set("batch", value); setParams(query, { replace: true }); }} locale={locale} /><DownloadButtons snapshot={data} batchId={batch?.id} datasetId={dataset.id} locale={locale} /></div></div>
    </header>
    {batch && <p className="benchmark-detail-conditions">{batch.conditions && <>{batch.conditions.cpu_limit} CPU · {batch.conditions.memory_limit_gib} GiB · {batch.conditions.alignment_timeout_seconds / 60} {words(locale, "min limit", "分钟限时")} · </>}<strong>{batch.repeats === 1 ? words(locale, "Single measurement", "单次测量") : batch.repeats ? words(locale, `${batch.repeats} planned repeats`, `计划重复 ${batch.repeats} 次`) : words(locale, "Reported repeat coverage", "按报告记录重复次数")}</strong></p>}
    <details className="benchmark-condition-details"><summary>{words(locale, "Evaluation conditions and scoring", "评测条件与评分说明")}</summary><BatchContext batch={batch} locale={locale} /><p className="benchmark-plots-caption">{data.catalog.id} · {data.catalog.version}</p></details>
    {!batch && <p role="status" className="benchmark-pending">{words(locale, "No evaluation results have been published for this dataset. Each method below is awaiting evaluation; missing values are not zero scores.", "该数据集尚未发布评测结果。下方方法处于待评测状态，缺失成绩不代表零分。")}</p>}
    {batch && <p className="benchmark-caption" data-testid="dataset-batch-scope">{words(locale, `${batch.results.filter(result => result.dataset_id === dataset.id).length} methods included for this dataset in the selected batch. Other methods are outside this batch; their earlier results are not substituted.`, `当前批次在本数据集纳入 ${batch.results.filter(result => result.dataset_id === dataset.id).length} 种方法。其余方法未纳入本批次，不以旧批次成绩补齐。`)}</p>}
    <section aria-labelledby="dataset-comparison-heading">
      <div className="benchmark-view-controls"><h2 id="dataset-comparison-heading">{words(locale, "Method comparison", "方法对比")}</h2><div className="benchmark-view-tabs" role="group" aria-label={words(locale, "Result view", "结果视图")}><button type="button" aria-pressed={view === "charts"} onClick={() => setView("charts")}>{words(locale, "Charts", "图表")}</button><button type="button" aria-pressed={view === "table"} onClick={() => setView("table")}>{words(locale, "Exact values", "精确数值表")}</button></div></div>
      <div hidden={view !== "charts"}><MetricPlots snapshot={data} batch={batch} dataset={dataset} locale={locale} selectedMetric={selectedMetric} selectedMethod={selectedMethod} /></div>
      <div hidden={view !== "table"} className="benchmark-detail-precise" data-testid="precise-results"><p className="benchmark-plots-caption">{words(locale, "All seven metrics. Memory is displayed in MiB; downloads retain the original KiB values. Missing values are states, not zero scores.", "全部七项指标。内存以 MiB 显示，下载保留原始 KiB。无值显示具体状态，不记作零分。")}</p><div tabIndex={0} role="region" aria-label={words(locale, "Scrollable method comparison", "可横向滚动的方法对比")} className="benchmark-table-scroll"><table className="benchmark-table"><caption className="sr-only">{words(locale, "Method results for ", "方法成绩：")}{dataset.id}</caption><thead><tr><th scope="col">{words(locale, "Method / version", "方法 / 版本")}</th><th scope="col">{words(locale, "State", "状态")}</th><th scope="col">{words(locale, "Valid repeats", "有效重复")}</th>{metricKeys.map(key => <th scope="col" key={key}>{metricSpecs[key][locale]}{metricSpecs[key].unit ? ` (${metricSpecs[key].unit})` : ""}</th>)}</tr></thead><tbody>{data.methods.map(method => {
        const result = batch?.results.find(r => r.method_id === method.id && r.dataset_id === dataset.id);
        const spec = batch?.methods.find(m => m.method_id === method.id);
        return <tr key={method.id} data-method={method.id}><th scope="row">{method.name}<span className="benchmark-cell-note">{spec?.version ?? (batch ? stateLabel("outside_batch", locale) : words(locale, "Version pending", "版本待确认"))}</span></th><td><StatusPill status={batch && !result ? "outside_batch" : result?.status ?? "not_run"} locale={locale} />{result?.reason_code && <span className="benchmark-cell-note">{reasonLabel(result.reason_code, locale)}</span>}</td><td>{result ? `${result.valid_repeats}/${result.planned_repeats}` : "—"}</td>{metricKeys.map(key => <td key={key} data-method={method.id} data-metric={key} data-raw-value={metricValue(result?.metrics[key]) ?? ""}>{batch && !result ? stateLabel("outside_batch", locale) : <MetricCell metric={result?.metrics[key]} metricKey={key} locale={locale} noReference={!dataset.reference && (key === "q" || key === "tc")} />}</td>)}</tr>;
      })}</tbody></table></div></div>
    </section>
    <details className="benchmark-source-details" open={dataset.validation_status === "requires_review"}>
      <summary>{words(locale, "Dataset information and provenance", "数据集信息与来源")}</summary>
      <dl className="benchmark-metadata">{metadata.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
      <div className="benchmark-provenance">{source && <p>{words(locale, "Source: ", "来源：")}<a className="break-words text-teal-800 underline underline-offset-4" href={source.url} target="_blank" rel="noreferrer">{source.title}</a></p>}{dataset.similarity_label !== null && <p>{words(locale, `Source similarity label: ${dataset.similarity_label}. This is not a newly measured sequence identity.`, `来源相似度标签：${dataset.similarity_label}。该数值不是重新测量的序列一致性。`)}</p>}{dataset.sampling && <p>{words(locale, dataset.sampling.with_replacement ? "Sampled with replacement: repeated sequences test scale, not additional biological diversity." : "Sampled without replacement from the source sequences.", dataset.sampling.with_replacement ? "采用有放回抽样：重复序列用于规模测试，不代表新增生物学多样性。" : "从来源序列中无放回抽样。")} {words(locale, "Sampling seed: ", "抽样种子：")}{dataset.sampling.seed}</p>}{dataset.source_kind === "unconfirmed" && <p>{words(locale, "The source’s generation method has not been confirmed. Having a reference alignment does not establish that this is simulated data.", "来源数据的生成方式尚未确认，存在参考比对不代表已确认其为模拟数据。")}</p>}</div>
      {dataset.validation_status === "requires_review" && <aside className="benchmark-data-issue" aria-labelledby="dataset-review-heading"><h2 id="dataset-review-heading">{words(locale, "Input data needs review", "输入数据待处理")}</h2>{dataset.issues.map(issue => <p key={issue.code}>{words(locale, `The input contains ${issue.count.toLocaleString()} colon (:) characters outside the nucleotide alphabet. The original data has been preserved pending a processing decision.`, `输入含有 ${issue.count.toLocaleString()} 个不属于核酸字母的冒号（:）。当前保留原始内容，等待确定处理方式。`)}</p>)}<p>{words(locale, "This is a dataset issue, not a method execution failure. Reported lengths include these characters.", "这是数据集问题，不是算法执行失败。长度统计包含这些字符。")}</p></aside>}
      {dataset.preprocessing && <p className="benchmark-provenance"><strong>{words(locale, "Data preparation: ", "数据处理：")}</strong>{words(locale, `${dataset.preprocessing.count} sequence colons were replaced with N in this frozen version. Original files and all titles were preserved; T/U and other IUPAC symbols were not converted.`, `本冻结版本将序列中的 ${dataset.preprocessing.count} 个冒号替换为 N。原始文件与全部标题保留，未转换 T/U 或其他 IUPAC 字符。`)}</p>}
    </details>
    <details className="benchmark-source-details"><summary>{words(locale, "Method versions and parameters", "方法版本与参数")}</summary><div tabIndex={0} role="region" aria-label={words(locale, "Scrollable method parameters", "可横向滚动的方法参数")} className="benchmark-table-scroll"><table className="benchmark-table"><caption className="sr-only">{words(locale, "Method parameters", "方法参数")}</caption><thead><tr><th scope="col">{words(locale, "Method", "方法")}</th><th scope="col">{words(locale, "Version", "版本")}</th><th scope="col">{words(locale, "Parameters / commit", "参数 / 提交版本")}</th></tr></thead><tbody>{data.methods.map(method => { const spec = batch?.methods.find(m => m.method_id === method.id); return <tr key={method.id}><th scope="row">{method.name}</th><td>{spec?.version ?? (batch ? stateLabel("outside_batch", locale) : words(locale, "Version pending", "版本待确认"))}</td><td className="benchmark-parameters">{spec ? spec.parameters.join(" ") || words(locale, "No additional parameters", "无附加参数") : batch ? stateLabel("outside_batch", locale) : words(locale, "Pending confirmation", "待确认")}{spec?.commit && <span className="benchmark-cell-note">{spec.commit}</span>}</td></tr>; })}</tbody></table></div></details>
  </PageContainer>;
}
