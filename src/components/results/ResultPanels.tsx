import { lazy, Suspense } from "react";
import { LoadingState } from "../common/LoadingState";
import { DownloadPanel } from "./DownloadPanel";
import { ResultOverview } from "./ResultOverview";
import type { ResultTab } from "./ResultTabs";
import type { ResultFile, ResultSummary } from "../../lib/types/result";
import type { MSAResult } from "../../lib/types/msa";
import type { MsaViewerContext } from "../../features/msa-viewer/viewerContext";
import { useLanguage } from "../../lib/i18n/useLanguage";
const MSAViewer = lazy(() =>
  import("./MSAViewer").then((m) => ({ default: m.MSAViewer })),
);
export function ResultPanels({
  activeTab,
  setActiveTab,
  summary,
  alignment,
  summaryPending,
  alignmentPending,
  alignmentError,
  error,
  files,
  context,
}: {
  activeTab: ResultTab;
  setActiveTab: (tab: ResultTab) => void;
  summary?: ResultSummary;
  alignment?: MSAResult;
  summaryPending: boolean;
  alignmentPending: boolean;
  alignmentError?: string | null;
  error?: string | null;
  files: ResultFile[];
  context?: MsaViewerContext;
}) {
  const { dictionary: d } = useLanguage();
  return (
    <>
      <section
        aria-labelledby="result-tab-overview"
        hidden={activeTab !== "overview"}
        id="result-panel-overview"
        role="tabpanel"
      >
        {activeTab === "overview" && summaryPending && !error ? (
          <LoadingState label={d.results.loading.overview} />
        ) : null}
        {activeTab === "overview" && summary ? (
          <ResultOverview
            alignment={alignment}
            alignmentError={alignmentError}
            alignmentPending={alignmentPending}
            onOpenAlignment={() => setActiveTab("alignment")}
            onOpenDownloads={() => setActiveTab("downloads")}
            summary={summary}
          />
        ) : null}
      </section>
      <section
        aria-labelledby="result-tab-alignment"
        hidden={activeTab !== "alignment"}
        id="result-panel-alignment"
        role="tabpanel"
      >
        {activeTab === "alignment" && alignmentPending && !error ? (
          <LoadingState label={d.results.loading.alignment} />
        ) : null}
        {activeTab === "alignment" && alignment ? (
          <Suspense
            fallback={<LoadingState label={d.results.loading.viewer} />}
          >
            <MSAViewer alignment={alignment} context={context} />
          </Suspense>
        ) : null}
      </section>
      <section
        aria-labelledby="result-tab-downloads"
        hidden={activeTab !== "downloads"}
        id="result-panel-downloads"
        role="tabpanel"
      >
        {activeTab === "downloads" ? <DownloadPanel files={files} /> : null}
      </section>
    </>
  );
}
