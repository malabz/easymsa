import { useQuery } from "@tanstack/react-query";
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
        <div className="grid gap-6 lg:grid-cols-2">
          {query.data?.map((e) => (
            <section
              key={e.id}
              className="space-y-4 border-t border-slate-200 py-5"
            >
              <h2 className="text-2xl font-semibold">
                {exampleTitle(e, locale)}
              </h2>
              <p>
                {zh ? "合成 DNA" : "Synthetic DNA"} ·{" "}
                {e.stages.final.sequenceCount} {zh ? "条序列" : "sequences"} ·{" "}
                {e.stages.final.alignmentLength} {zh ? "列" : "columns"}
              </p>
              <p className="text-sm leading-7 text-slate-600">
                {e.kind === "alignment"
                  ? zh
                    ? "minipoa 比对示例"
                    : "minipoa alignment example"
                  : zh
                    ? "已有比对的重比对示例"
                    : "Refinement of an existing alignment"}
              </p>
              <ExampleActions example={e} />
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
    <div className="flex flex-wrap items-center gap-4 text-sm">
      {showView && <ButtonLink to={`/examples/${example.id}`}>
        {zh ? "查看示例结果" : "View example results"}
      </ButtonLink>}
      <a className={link} href={exampleUrl(example, "input.fasta")} download>
        {zh ? "下载输入 FASTA" : "Download input FASTA"}
      </a>
      {example.kind === "realignment" && (
        <a
          className={link}
          href={exampleUrl(example, "input.fasta.gz.bin")}
          download="input.fasta.gz"
        >
          FASTA.gz
        </a>
      )}
      <Link
        className={link}
        to={`/${example.kind === "alignment" ? "submit" : "realign"}?example=${example.id}`}
      >
        {zh ? "用此示例提交任务" : "Submit this example"}
      </Link>
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
