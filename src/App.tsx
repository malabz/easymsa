import { StorageNotice } from "./components/common/StorageNotice";
import { lazy, Suspense } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
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
import "./components/layout/workspace.css";

const AboutPage = lazy(() =>
  import("./routes/AboutPage").then((module) => ({ default: module.AboutPage }))
);
const DocsPage = lazy(() =>
  import("./routes/DocsPage").then((module) => ({ default: module.DocsPage }))
);
const JobStatusPage = lazy(() =>
  import("./routes/JobStatusPage").then((module) => ({ default: module.JobStatusPage }))
);
const LookupPage = lazy(() =>
  import("./routes/LookupPage").then((module) => ({ default: module.LookupPage }))
);
const ResultsPage = lazy(() =>
  import("./routes/ResultsPage").then((module) => ({ default: module.ResultsPage }))
);
const SubmitPage = lazy(() =>
  import("./routes/SubmitPage").then((module) => ({ default: module.SubmitPage }))
);
const ViewerPage = lazy(() =>
  import("./routes/ViewerPage").then((module) => ({ default: module.ViewerPage }))
);

const RealignPage = lazy(() => import("./routes/RealignPage").then(module => ({default: module.RealignPage})));

const ExamplesPage = lazy(() => import("./routes/ExamplesPage").then(m => ({default:m.ExamplesPage})));
const LicensePage = lazy(() => import("./routes/LicensePage").then(m => ({default:m.LicensePage})));
const PrivacyPage = lazy(() => import("./routes/PrivacyPage").then(m => ({default:m.PrivacyPage})));

function AppRoutes() {
  const location = useLocation();
  const { dictionary: d } = useLanguage();

  return (
    <ErrorBoundary
      key={location.pathname}
      description={d.common.appErrorDescription}
      retryLabel={d.common.retry}
      title={d.common.appErrorTitle}
    >
      <Suspense fallback={<RouteLoadingState />}>
        <Routes>
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
  const { pathname } = useLocation();
  const form = ["/submit", "/realign"].includes(pathname);
  const analysis = /^\/(job|results|examples)\/.+/.test(pathname);

  return (
    <div className={`app-shell flex min-h-screen flex-col${form ? " submission-shell" : ""}${analysis ? " analysis-shell" : ""}${pathname === "/lookup" ? " lookup-shell" : ""}`}>
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
      <StorageNotice />
      <main className="flex-1" id="main-content" tabIndex={-1}>
        {!analysis && <WorkReturnBar />}
        <AppRoutes />
      </main>
      <Footer />
    </div>
  );
}
