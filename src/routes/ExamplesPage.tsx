import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Download, Send } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useRememberWork, useResultLocation } from "../lib/workspace";
import { PageContainer } from "../components/layout/PageContainer";
import { ButtonLink } from "../components/common/Button";
import { LoadingState } from "../components/common/LoadingState";
import { ErrorState } from "../components/common/ErrorState";
import { ResultPanels } from "../components/results/ResultPanels";
import { ResultTabs } from "../components/results/ResultTabs";
import { AnalysisWorkspace } from "../components/layout/AnalysisWorkspace";
import { ResultSidebar } from "../components/results/ResultSidebar";
import { ResultStageControl, ResultStageNotice } from "../components/results/ResultStageControl";
import {
  exampleTitle,
  exampleUrl,
  loadExamples,
  loadExampleResult,
  type PublicExample,
} from "../lib/examples";
import { useLanguage } from "../lib/i18n/useLanguage";
import type { ResultStage } from "../lib/types/job";
const link = "font-medium text-teal-800 underline underline-offset-4";
export function ExamplesPage() {
  const { locale } = useLanguage();
  const zh = locale === "zh";
  const { exampleId } = useParams();
  const query = useQuery({
    queryKey: ["public-examples", "v1"],
    queryFn: ({ signal }) => loadExamples(signal),
    staleTime: Infinity,
    retry: 1,
  });
  const example = query.data?.find((e) => e.id === exampleId);
  if (example) return <ExampleResult key={`${example.id}:${example.version}`} example={example} />;
  return (
    <PageContainer className="workflow-page">
      <div className="work-heading">
        <div><h1>{zh ? "示例" : "Examples"}</h1>
        <p>
          {zh
            ? "打开示例，体验查看与下载。"
            : "Explore alignment results, switch between stages, and download example files."}
        </p></div>
      </div>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState
          message={
            zh
              ? "示例资源无法加载，请稍后重试。"
              : "Example resources could not be loaded. Please retry later."
          }
        />
      ) : exampleId && !example ? (
        <>
          <ErrorState message={zh ? "找不到此示例。" : "Example not found."} />
          <Link className={link} to="/examples">
            {zh ? "返回示例目录" : "Back to examples"}
          </Link>
        </>
      ) : (
        <div className="example-grid">
          {query.data?.map((e) => (
            <section key={e.id} className="example-card" data-kind={e.kind}>
              <ExamplePreview seed={e.id} gapped={e.kind === "realignment"} />
              <div className="example-card-body">
                <span className="example-kind">
                  {e.kind === "alignment" ? (zh ? "多序列比对" : "Alignment") : (zh ? "重比对" : "Realignment")}
                </span>
                <h2>{exampleTitle(e, locale)}</h2>
                <p className="example-description">
                  {e.kind === "alignment"
                    ? zh ? "从未比对的序列开始，用 minipoa 完成比对。" : "Starts from unaligned sequences and aligns them with minipoa."
                    : zh ? "从已有的比对开始，重新优化比对结果。" : "Starts from an existing alignment and refines it."}
                </p>
                <ul className="example-facts">
                  <li>{zh ? "合成 DNA" : "Synthetic DNA"}</li>
                  <li>{e.stages.final.sequenceCount} {zh ? "条序列" : "sequences"}</li>
                  <li>{e.stages.final.alignmentLength} {zh ? "列" : "columns"}</li>
                </ul>
                <ExampleActions example={e} />
              </div>
            </section>
          ))}
        </div>
      )}
      <p className="work-hint mt-5">
        {zh
          ? "示例使用合成 DNA。"
          : "Examples use synthetic DNA."}
      </p>
    </PageContainer>
  );
}
export function ExampleActions({ example, showView = true }: { example: PublicExample; showView?: boolean }) {
  const { locale } = useLanguage();
  const zh = locale === "zh";
  return (
    <div className="example-actions">
      {showView && <ButtonLink to={`/examples/${example.id}`}>
        {zh ? "查看示例结果" : "View example results"}<ArrowRight size={16} aria-hidden="true" />
      </ButtonLink>}
      <div className="example-secondary">
        <a className="example-link" href={exampleUrl(example, "input.fasta")} download>
          <Download size={14} aria-hidden="true" />{zh ? "下载输入 FASTA" : "Download input FASTA"}
        </a>
        {example.kind === "realignment" && (
          <a className="example-link" href={exampleUrl(example, "input.fasta.gz.bin")} download="input.fasta.gz">
            <Download size={14} aria-hidden="true" />FASTA.gz
          </a>
        )}
        <Link className="example-link" to={`/${example.kind === "alignment" ? "submit" : "realign"}?example=${example.id}`}>
          <Send size={14} aria-hidden="true" />{zh ? "用此示例提交任务" : "Submit this example"}
        </Link>
      </div>
    </div>
  );
}

// Decorative alignment strip; the same example always draws the same pattern.
function ExamplePreview({ seed, gapped }: { seed: string; gapped: boolean }) {
  let state = [...seed].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7);
  const next = () => (state = (state * 1103515245 + 12345) >>> 0) / 2 ** 32;
  const consensus = Array.from({ length: 22 }, () => "ACGT"[Math.floor(next() * 4)]);
  const rows = Array.from({ length: 4 }, () => consensus.map(base =>
    next() < (gapped ? .16 : .08) ? "-" : next() < .12 ? "ACGT"[Math.floor(next() * 4)] : base));
  return (
    <div className="example-preview" aria-hidden="true">
      {rows.map((row, r) => <div key={r}>{row.map((base, c) => <i key={c} data-base={base} style={{ animationDelay: `${(r * 22 + c) * 8}ms` }} />)}</div>)}
    </div>
  );
}
function ExampleResult({ example }: { example: PublicExample }) {
  const { locale } = useLanguage();
  const zh = locale === "zh";
  const { stage, setStage, tab, setTab } = useResultLocation();
  useRememberWork("example");
  const query = useQuery({
    queryKey: ["public-example", example.id, example.version, stage],
    queryFn: ({ signal }) => loadExampleResult(example, stage, signal),
    staleTime: Infinity,
    retry: 1,
  });
  const error = query.isError
    ? zh
      ? "示例文件缺失或完整性校验失败，请重新加载。"
      : "Example files are missing or failed integrity verification. Please reload."
    : null;
  const stageControl = <ResultStageControl stage={stage} stages={Object.keys(example.stages) as ResultStage[]} onChange={setStage} />;
  return (
    <AnalysisWorkspace sidebar={<ResultSidebar
      title={exampleTitle(example, locale)}
      summary={query.data?.summary}
      onDownload={() => setTab("downloads")}
      links={<ExampleActions example={example} showView={false} />}
      note={<>
        <p>{zh ? "合成 DNA · 公开示例" : "Synthetic DNA · Public example"}</p>
        <a href={exampleUrl(example, "provenance.json")} download>{zh ? "生成记录" : "Provenance"}</a>
        {" · "}<a href={exampleUrl(example, "hashes.json")} download>SHA256</a>
      </>}
    />}>
      <div className="analysis-heading">
        <h1>{exampleTitle(example, locale)}</h1>
        <Link className="work-link" to="/examples">{zh ? "所有示例" : "All examples"}</Link>
      </div>
      <div className="analysis-toolbar">
        <ResultTabs value={tab} onChange={setTab} />
        {tab !== "alignment" && stageControl}
      </div>
      <div className="analysis-panels">
      {example.kind === "realignment" && (
        <section className="flex flex-wrap gap-x-4 gap-y-1 border-l-2 border-teal-700 pl-3 text-xs leading-6 text-slate-600">
          <ResultStageNotice stage={stage === "final" ? example.stages.refined ? "refined" : "initial" : stage} />
          {example.sameInitialAndRefined && <p>
            {zh
                ? "重比对结果与初始比对一致。"
                : "The refined alignment is identical to the initial alignment."}
          </p>}
          <a
            className={link}
            download="initial.fasta.gz"
            href={exampleUrl(example, "initial.fasta.gz.bin")}
          >
            {zh ? "下载初始比对" : "Download initial alignment"}
          </a>
        </section>
      )}
      {error && tab !== "alignment" && <ErrorState message={error} />}
      <ResultPanels
        sourceName={exampleTitle(example, locale)} headerActions={stageControl} onRetry={() => query.refetch()}
        key={`${example.id}:${example.version}:${stage}`}
        activeTab={tab}
        setActiveTab={setTab}
        summary={query.data?.summary}
        alignment={query.data?.alignment}
        files={query.data?.files ?? []}
        context={query.data?.context}
        summaryPending={query.isPending}
        alignmentPending={query.isPending}
        error={error}
      />
      </div>
    </AnalysisWorkspace>
  );
}
