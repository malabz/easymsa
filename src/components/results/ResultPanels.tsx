import { lazy, Suspense, type ReactNode } from "react";
import { MsaWorkspaceShell } from "../../features/msa-viewer/MsaWorkspaceShell";
import { MsaWorkspaceHeader } from "../../features/msa-viewer/MsaWorkspaceHeader";
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
  sourceName, workspaceScope, headerActions, onRetry,
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
  sourceName?: string;
  workspaceScope?: string;
  headerActions?: ReactNode;
  onRetry?: () => void;
}) {
  const { dictionary: d, locale } = useLanguage();
  const onReturn = () => setActiveTab("overview");
  const message = error ?? alignmentError;
  const pendingWorkspace = <MsaWorkspaceShell mode="immersive" exitImmersiveLabel={locale === "zh" ? "返回结果" : "Back to results"}
    onExitImmersive={onReturn} workspaceLabel="MSA" matrixLabel={d.results.viewer.matrixNavigation}
    sourceBar={<MsaWorkspaceHeader title={sourceName ?? d.results.title} immersive onReturn={onReturn} extra={headerActions}/>}
    commandBar={null}
    matrix={<div className="msa-load-message">{message ? <>
      <p role="alert">{message}</p>
      {onRetry && <button type="button" className="text-teal-800 underline" onClick={onRetry}>{d.common.retry}</button>}
    </> : <LoadingState label={d.results.loading.alignment}/>}</div>}/>;
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
        {activeTab === "alignment" && (
          alignment && !message ? <Suspense fallback={pendingWorkspace}>
            <MSAViewer key={workspaceScope ?? alignment.descriptor?.sourceKey ?? alignment.jobId} workspaceScope={workspaceScope}
              alignment={alignment} context={context} sourceName={sourceName} presentation="immersive"
              onReturn={onReturn} headerActions={headerActions}/>
          </Suspense> : pendingWorkspace
        )}
      </section>
      <section
        aria-labelledby="result-tab-downloads"
        hidden={activeTab !== "downloads"}
        id="result-panel-downloads"
        role="tabpanel"
      >
        {activeTab === "downloads" ? <DownloadPanel files={files} artifacts={summary?.outputFiles} /> : null}
      </section>
    </>
  );
}
