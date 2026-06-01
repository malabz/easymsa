import { Navigate, Route, Routes } from "react-router-dom";
import { Footer } from "./components/layout/Footer";
import { Header } from "./components/layout/Header";
import { AboutPage } from "./routes/AboutPage";
import { DocsPage } from "./routes/DocsPage";
import { HomePage } from "./routes/HomePage";
import { JobStatusPage } from "./routes/JobStatusPage";
import { LookupPage } from "./routes/LookupPage";
import { ResultsPage } from "./routes/ResultsPage";
import { SubmitPage } from "./routes/SubmitPage";
import { ViewerPage } from "./routes/ViewerPage";

export function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
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
      </main>
      <Footer />
    </div>
  );
}
