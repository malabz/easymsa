import { ArrowRight, ChevronDown, History, Trash2, Upload } from "lucide-react";
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
import { forgetJobWork } from "../lib/workspace";

function sortCachedAccess(records: JobAccess[]) {
  return [...records]
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    )
    .slice(0, 50);
}

function formatCreatedAt(createdAt: string, locale: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(locale === "zh" ? "zh-CN" : "en-GB", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
  });
}

type RecoveryError = "missingFields" | "invalidJson" | "readJsonFailed";

export function LookupPage() {
  const { dictionary: d, locale } = useLanguage();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const jobIdRef = useRef<HTMLInputElement | null>(null);
  const tokenRef = useRef<HTMLInputElement | null>(null);
  const [jobId, setJobId] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState<RecoveryError | null>(null);
  const [cachedAccess, setCachedAccess] = useState<JobAccess[]>(() =>
    sortCachedAccess(readJobAccessRecords())
  );
  const [otherMethodsOpen, setOtherMethodsOpen] = useState(cachedAccess.length === 0);

  function refreshCachedAccess() {
    const records = sortCachedAccess(readJobAccessRecords());
    setCachedAccess(records);
    if (records.length === 0) setOtherMethodsOpen(true);
  }

  function restore(nextJobId: string, nextToken: string) {
    const trimmedJobId = nextJobId.trim();
    const trimmedToken = nextToken.trim();

    if (!trimmedJobId || !trimmedToken) {
      setOtherMethodsOpen(true);
      setError("missingFields");
      if (!trimmedJobId) jobIdRef.current?.focus();
      else tokenRef.current?.focus();
      return;
    }

    setError(null);
    navigate(jobRoute(trimmedJobId, trimmedToken));
  }

  function removeCachedAccess(access: JobAccess) {
    forgetJobWork(access.jobId, access.token);
    deleteJobAccess(access.jobId, access.token);
    setError(null);
    refreshCachedAccess();
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setOtherMethodsOpen(true);
    try {
      const parsed = JSON.parse(await file.text());
      const access = validateJobAccess(parsed);
      if (!access) {
        setError("invalidJson");
        return;
      }
      saveJobAccess(access);
      refreshCachedAccess();
      setError(null);
      navigate(jobRoute(access.jobId, access.token));
    } catch {
      setError("readJsonFailed");
    }
  }

  return (
    <PageContainer className="workflow-page lookup-page">
      <div className="work-heading">
        <div>
          <h1>{d.lookup.title}</h1>
          <p>{d.lookup.subtitle}</p>
        </div>
      </div>

      <section aria-labelledby="cached-jobs-heading" className="lookup-saved">
        <div className="lookup-section-heading">
          <h2 id="cached-jobs-heading">
            <History aria-hidden="true" size={19} />
            {d.lookup.cachedTitle}
            <span className="lookup-count">{cachedAccess.length}</span>
          </h2>
          {cachedAccess.length > 0 && <span className="work-hint">{d.lookup.cachedOrder}</span>}
        </div>

        {cachedAccess.length > 0 ? (
          <div className="lookup-list">
            <div aria-hidden="true" className="lookup-column-labels">
              <span>{d.lookup.jobId}</span>
              <span>{d.lookup.cachedCreatedAt}</span>
              <span />
            </div>
            <ul aria-labelledby="cached-jobs-heading" className="lookup-rows">
              {cachedAccess.map((access) => (
                <li className="lookup-row" key={access.jobId + ":" + access.token}>
                  <div className="lookup-job-id" title={access.jobId}>
                    <span className="sr-only">{d.lookup.jobId}: </span>
                    {access.jobId}
                  </div>
                  <div className="lookup-created">
                    <span className="lookup-created-label">{d.lookup.cachedCreatedAt}: </span>
                    <time dateTime={access.createdAt}>{formatCreatedAt(access.createdAt, locale)}</time>
                  </div>
                  <div className="lookup-row-actions">
                    <Button
                      aria-label={d.lookup.cachedRestore + ": " + access.jobId}
                      onClick={() => restore(access.jobId, access.token)}
                      size="sm"
                    >
                      {d.lookup.cachedRestore}
                      <ArrowRight aria-hidden="true" size={15} />
                    </Button>
                    <Button
                      aria-label={d.lookup.cachedDelete + ": " + access.jobId}
                      className="lookup-delete"
                      onClick={() => removeCachedAccess(access)}
                      size="sm"
                      title={d.lookup.cachedDelete}
                      variant="ghost"
                    >
                      <Trash2 aria-hidden="true" size={16} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="lookup-empty">{d.lookup.cachedEmpty}</p>
        )}
        <p className="work-hint lookup-storage-note">{d.lookup.cachedDescription}</p>
      </section>

      <section aria-labelledby="other-recovery-heading" className="lookup-alternatives">
        <h2 id="other-recovery-heading">
          <button
            aria-controls="other-recovery-content"
            aria-expanded={otherMethodsOpen}
            className="lookup-alternatives-toggle"
            onClick={() => setOtherMethodsOpen((open) => !open)}
            type="button"
          >
            <span>{d.lookup.otherMethods}</span>
            <span className="lookup-alternatives-hint">{d.lookup.otherMethodsHint}</span>
            <ChevronDown aria-hidden="true" className={otherMethodsOpen ? "is-open" : ""} size={18} />
          </button>
        </h2>
        <div hidden={!otherMethodsOpen} id="other-recovery-content">
          <form
            aria-label={d.lookup.manualTitle}
            className="lookup-manual"
            onSubmit={(event) => { event.preventDefault(); restore(jobId, token); }}
          >
            <div className="work-field">
              <label className="work-label" htmlFor="jobId">{d.lookup.jobId}</label>
              <input
                aria-describedby={error === "missingFields" ? "lookup-error" : undefined}
                aria-invalid={error === "missingFields" && !jobId.trim() || undefined}
                autoCapitalize="none"
                autoComplete="off"
                className="work-control"
                id="jobId"
                onChange={(event) => { setJobId(event.target.value); setError(null); }}
                ref={jobIdRef}
                spellCheck={false}
                value={jobId}
              />
            </div>
            <div className="work-field">
              <label className="work-label" htmlFor="token">{d.lookup.token}</label>
              <input
                aria-describedby={error === "missingFields" ? "lookup-error" : undefined}
                aria-invalid={error === "missingFields" && !token.trim() || undefined}
                autoComplete="off"
                className="work-control"
                id="token"
                onChange={(event) => { setToken(event.target.value); setError(null); }}
                ref={tokenRef}
                type="password"
                value={token}
              />
            </div>
            <Button type="submit">{d.lookup.restore}</Button>
          </form>
          <div className="lookup-import">
            <input
              accept="application/json,.json"
              aria-label={d.lookup.uploadTitle}
              className="hidden"
              onChange={handleFileChange}
              ref={fileInputRef}
              type="file"
            />
            <Button onClick={() => fileInputRef.current?.click()} size="sm" variant="outline">
              <Upload aria-hidden="true" size={15} />
              {d.lookup.importJson}
            </Button>
            <span className="work-hint">{d.lookup.importHint}</span>
          </div>
          {error && <p className="work-error lookup-error" id="lookup-error" role="alert">{d.lookup[error]}</p>}
        </div>
      </section>
    </PageContainer>
  );
}
