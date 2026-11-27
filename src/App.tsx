import { StorageNotice } from "./components/common/StorageNotice";
import { lazy, Suspense, useDeferredValue, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, type Location } from "react-router-dom";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { RouteLoadingState } from "./components/layout/RouteLoadingState";
import { focusMainContent, RouteNavigation } from "./components/layout/RouteNavigation";
import { NotFoundPage } from "./routes/NotFoundPage";
import { Footer } from "./components/layout/Footer";
import { Header } from "./components/layout/Header";
import { PageMetadata } from "./components/layout/PageMetadata";
import { useLanguage } from "./lib/i18n/useLanguage";
import { HomePage } from "./routes/HomePage";
import { WorkReturnBar } from "./components/layout/WorkReturnBar";
import { routeLoaders, schedulePrimaryRoutePreload } from "./lib/routePreload";
import "./components/layout/workspace.css";

const AboutPage = lazy(routeLoaders.about);
const DocsPage = lazy(routeLoaders.docs);
const JobStatusPage = lazy(routeLoaders.job);
const LookupPage = lazy(routeLoaders.lookup);
const ResultsPage = lazy(routeLoaders.results);
const SubmitPage = lazy(routeLoaders.submit);
const ViewerPage = lazy(routeLoaders.viewer);
const RealignPage = lazy(routeLoaders.realign);
const ExamplesPage = lazy(routeLoaders.examples);
const LicensePage = lazy(routeLoaders.license);
const PrivacyPage = lazy(routeLoaders.privacy);
const BenchmarkPage = lazy(routeLoaders.benchmark);
const BenchmarkDatasetPage = lazy(routeLoaders.benchmarkDataset);
const BenchmarkSubmitPage = lazy(routeLoaders.benchmarkSubmit);
const BenchmarkMinePage = lazy(routeLoaders.benchmarkMine);
const BenchmarkRunPage = lazy(routeLoaders.benchmarkRun);
const BenchmarkExamplePage = lazy(routeLoaders.benchmarkExample);

function AppRoutes({ location }: { location: Location }) {
  const { dictionary: d } = useLanguage();

  return (
    <ErrorBoundary
      resetKey={location.pathname}
      description={d.common.appErrorDescription}
      retryLabel={d.common.retry}
      title={d.common.appErrorTitle}
    >
      <Suspense fallback={<RouteLoadingState />}>
        <Routes location={location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/realign" element={<RealignPage />} />
          <Route path="/submit" element={<SubmitPage />} />
          <Route path="/viewer" element={<ViewerPage />} />
          <Route path="/lookup" element={<LookupPage />} />
          <Route path="/job/:jobId" element={<JobStatusPage />} />
          <Route path="/results/:jobId" element={<ResultsPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/examples" element={<ExamplesPage />} />
          <Route path="/examples/:exampleId" element={<ExamplesPage />} />
          <Route path="/benchmark" element={<BenchmarkPage />} />
          <Route path="/benchmark/datasets/:caseId" element={<BenchmarkDatasetPage />} />
          <Route path="/benchmark/submit" element={<BenchmarkSubmitPage />} />
          <Route path="/benchmark/recent" element={<BenchmarkMinePage />} />
          <Route path="/benchmark/mine" element={<Navigate to="/benchmark/recent" replace />} />
          <Route path="/benchmark/runs/:runId" element={<BenchmarkRunPage />} />
          <Route path="/benchmark/examples/msa-kit" element={<BenchmarkExamplePage />} />
          <Route path="/license" element={<LicensePage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export function App() {
  const { dictionary: d } = useLanguage();
  const location = useLocation();
  const deferredLocation = useDeferredValue(location);
  const pendingTransition = deferredLocation.pathname !== location.pathname;
  const [showPendingBar, setShowPendingBar] = useState(false);

  useEffect(() => {
    if (import.meta.env.MODE === "test") return;
    return schedulePrimaryRoutePreload();
  }, []);

  useEffect(() => {
    if (!pendingTransition) {
      setShowPendingBar(false);
      return;
    }
    const timer = window.setTimeout(() => setShowPendingBar(true), 180);
    return () => window.clearTimeout(timer);
  }, [pendingTransition]);

  const { pathname } = deferredLocation;
  const form = ["/submit", "/realign"].includes(pathname);
  const analysis = /^\/(job|results|examples)\/.+/.test(pathname);
  const benchmark = /^\/benchmark(?:\/|$)/.test(pathname);

  return (
    <div className={`app-shell flex min-h-screen flex-col${form ? " submission-shell" : ""}${analysis ? " analysis-shell" : ""}${pathname === "/lookup" ? " lookup-shell" : ""}${benchmark ? " benchmark-shell" : ""}`}>
      <a
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-lg transition focus:translate-y-0"
        href="#main-content"
        onClick={event => { event.preventDefault(); focusMainContent(); }}
      >
        {d.common.skipToContent}
      </a>
      <PageMetadata />
      <RouteNavigation />
      <Header />
      {showPendingBar ? <div aria-hidden="true" className="route-progress-bar" data-route-pending="true" /> : null}
      <StorageNotice />
      <main className="flex-1" id="main-content" tabIndex={-1}>
        {!analysis && <WorkReturnBar />}
        <AppRoutes location={deferredLocation} />
      </main>
      <Footer />
    </div>
  );
}
