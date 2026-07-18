import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { LoadingState } from "./components/common/LoadingState";
import { Footer } from "./components/layout/Footer";
import { Header } from "./components/layout/Header";
import { PageMetadata } from "./components/layout/PageMetadata";
import { useLanguage } from "./lib/i18n/useLanguage";
import { HomePage } from "./routes/HomePage";

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
      <Suspense fallback={<LoadingState label={d.common.loadingPage} />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/submit" element={<SubmitPage />} />
          <Route path="/viewer" element={<ViewerPage />} />
          <Route path="/lookup" element={<LookupPage />} />
          <Route path="/job/:jobId" element={<JobStatusPage />} />
          <Route path="/results/:jobId" element={<ResultsPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export function App() {
  const { dictionary: d } = useLanguage();

  return (
    <div className="flex min-h-screen flex-col">
      <a
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-lg transition focus:translate-y-0"
        href="#main-content"
      >
        {d.common.skipToContent}
      </a>
      <PageMetadata />
      <Header />
      <main className="flex-1" id="main-content" tabIndex={-1}>
        <AppRoutes />
      </main>
      <Footer />
    </div>
  );
}
