import { Upload } from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/common/Button";
import { PageContainer } from "../components/layout/PageContainer";
import {
  jobRoute,
  saveJobAccess,
  validateJobAccess
} from "../lib/api/tokens";
import { useLanguage } from "../lib/i18n/useLanguage";

export function LookupPage() {
  const { dictionary: d } = useLanguage();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [jobId, setJobId] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);

  function restore(nextJobId: string, nextToken: string) {
    const trimmedJobId = nextJobId.trim();
    const trimmedToken = nextToken.trim();

    if (!trimmedJobId || !trimmedToken) {
      setError(d.lookup.missingFields);
      return;
    }

    navigate(jobRoute(trimmedJobId, trimmedToken));
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const parsed = JSON.parse(await file.text());
      const access = validateJobAccess(parsed);

      if (!access) {
        setError(d.lookup.invalidJson);
        return;
      }

      saveJobAccess(access);
      navigate(jobRoute(access.jobId, access.token));
    } catch {
      setError(d.lookup.readJsonFailed);
    }
  }

  return (
    <PageContainer className="space-y-8">
      <div className="max-w-3xl space-y-3">
        <h1 className="text-4xl font-semibold text-slate-950">{d.lookup.title}</h1>
        <p className="text-lg leading-8 text-slate-600">
          {d.lookup.subtitle}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200/80 bg-white/70 p-6">
          <h2 className="text-xl font-semibold text-slate-950">
            {d.lookup.manualTitle}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {d.lookup.manualDescription}
          </p>
          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor="jobId">
                {d.lookup.jobId}
              </label>
              <input
                className="h-10 w-full rounded-md border border-slate-300 bg-white/80 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                id="jobId"
                onChange={(event) => setJobId(event.target.value)}
                value={jobId}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor="token">
                {d.lookup.token}
              </label>
              <input
                className="h-10 w-full rounded-md border border-slate-300 bg-white/80 px-3 font-mono text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                id="token"
                onChange={(event) => setToken(event.target.value)}
                value={token}
              />
            </div>
            <Button onClick={() => restore(jobId, token)} type="button">
              {d.lookup.restore}
            </Button>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200/80 bg-white/70 p-6">
          <h2 className="text-xl font-semibold text-slate-950">
            {d.lookup.uploadTitle}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {d.lookup.uploadDescription}
          </p>
          <div className="mt-5 space-y-4">
            <input
              accept="application/json,.json"
              className="hidden"
              onChange={handleFileChange}
              ref={fileInputRef}
              type="file"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              type="button"
              variant="outline"
            >
              <Upload className="h-4 w-4" />
              {d.lookup.chooseJson}
            </Button>
          </div>
        </section>
      </div>

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}
    </PageContainer>
  );
}
