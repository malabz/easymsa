import { Trash2, Upload } from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/common/Button";
import { PageContainer } from "../components/layout/PageContainer";
import {
  deleteJobAccess,
  type JobAccess,
  jobRoute,
  readJobAccessRecords,
  saveJobAccess,
  validateJobAccess
} from "../lib/api/tokens";
import { useLanguage } from "../lib/i18n/useLanguage";

function sortCachedAccess(records: JobAccess[]) {
  return [...records]
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    )
    .slice(0, 50);
}

function formatCreatedAt(createdAt: string) {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
}

function shortToken(token: string) {
  return token.length <= 12 ? token : `...${token.slice(-8)}`;
}

export function LookupPage() {
  const { dictionary: d } = useLanguage();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [jobId, setJobId] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cachedAccess, setCachedAccess] = useState<JobAccess[]>(() =>
    sortCachedAccess(readJobAccessRecords())
  );

  function refreshCachedAccess() {
    setCachedAccess(sortCachedAccess(readJobAccessRecords()));
  }

  function restore(nextJobId: string, nextToken: string) {
    const trimmedJobId = nextJobId.trim();
    const trimmedToken = nextToken.trim();

    if (!trimmedJobId || !trimmedToken) {
      setError(d.lookup.missingFields);
      return;
    }

    setError(null);
    navigate(jobRoute(trimmedJobId, trimmedToken));
  }

  function removeCachedAccess(access: JobAccess) {
    deleteJobAccess(access.jobId, access.token);
    setError(null);
    refreshCachedAccess();
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
      refreshCachedAccess();
      setError(null);
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
                autoComplete="off"
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
                autoComplete="off"
                className="h-10 w-full rounded-md border border-slate-300 bg-white/80 px-3 font-mono text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                id="token"
                onChange={(event) => setToken(event.target.value)}
                value={token}
                type="password"
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
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          {error}
        </div>
      ) : null}

      <section className="rounded-lg border border-slate-200/80 bg-white/70 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">
              {d.lookup.cachedTitle}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {d.lookup.cachedDescription}
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {cachedAccess.length}/50
          </span>
        </div>

        {cachedAccess.length > 0 ? (
          <div className="mt-5 overflow-hidden rounded-lg border border-slate-200">
            <div className="divide-y divide-slate-200">
              {cachedAccess.map((access) => (
                <div
                  className="grid gap-4 bg-white/80 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                  key={`${access.jobId}:${access.token}`}
                >
                  <div className="min-w-0 space-y-2">
                    <div className="truncate font-medium text-slate-950">
                      {access.jobId}
                    </div>
                    <dl className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                      <div>
                        <dt className="font-medium text-slate-500">
                          {d.lookup.cachedCreatedAt}
                        </dt>
                        <dd>{formatCreatedAt(access.createdAt)}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-slate-500">
                          {d.lookup.cachedToken}
                        </dt>
                        <dd className="font-mono">{shortToken(access.token)}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <Button
                      onClick={() => restore(access.jobId, access.token)}
                      size="sm"
                      type="button"
                    >
                      {d.lookup.cachedRestore}
                    </Button>
                    <Button
                      onClick={() => removeCachedAccess(access)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Trash2 className="h-4 w-4" />
                      {d.lookup.cachedDelete}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-md border border-dashed border-slate-300 bg-slate-50/70 px-4 py-5 text-sm text-slate-600">
            {d.lookup.cachedEmpty}
          </div>
        )}
      </section>
    </PageContainer>
  );
}
