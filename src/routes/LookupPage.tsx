import { RecoveryImportDialog } from "../components/job/RecoveryImportDialog";
import { parseRecoveryBackup, type RecoveryEntry } from "../lib/api/recoveryBackup";
import { refinementText } from "../lib/i18n/refinements";
import { ArrowRight, ChevronDown, Download, FlaskConical, History, Inbox, Plus, Search, Trash2, Upload } from "lucide-react";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { zipSync, strToU8 } from "fflate";
import { useNavigate } from "react-router-dom";
import { Button, ButtonLink } from "../components/common/Button";
import { savedKeyLabel } from "../components/job/SavedJobAccessChoices";
import { PageContainer } from "../components/layout/PageContainer";
import {
  deleteJobAccess,
  type JobAccess,
  isValidJobId,
  jobRoute,
  downloadableAccessJson,
  saveJobAccess,
  validateJobAccess
} from "../lib/api/tokens";
import { useLanguage } from "../lib/i18n/useLanguage";
import { forgetJobWork, restoreJobWork, type WorkEntry } from "../lib/workspace";
import { useJobAccessRecords } from "../lib/query/useJobAccessRecords";

function sortCachedAccess(records: JobAccess[]) {
  return [...records]
    .sort(
      (left, right) =>
        new Date(right.lastOpenedAt ?? right.createdAt).getTime() - new Date(left.lastOpenedAt ?? left.createdAt).getTime()
    );
}

function formatCreatedAt(createdAt: string, locale: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(locale === "zh" ? "zh-CN" : "en-GB", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
  });
}

type RecoveryError = "missingFields" | "invalidJobId" | "invalidJson" | "readJsonFailed";

export function LookupPage() {
  const { dictionary: d, locale } = useLanguage();
  const navigate = useNavigate();
  const ui = refinementText[locale];
  const [importEntries, setImportEntries] = useState<RecoveryEntry[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const jobIdRef = useRef<HTMLInputElement | null>(null);
  const tokenRef = useRef<HTMLInputElement | null>(null);
  const [jobId, setJobId] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState<RecoveryError | null>(null);
  const records = useJobAccessRecords();
  const cachedAccess = useMemo(() => sortCachedAccess(records), [records]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const filteredAccess = useMemo(() => cachedAccess.filter(record => record.jobId.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())), [cachedAccess, search]);
  const pageCount = Math.max(1, Math.ceil(filteredAccess.length / 50));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleAccess = filteredAccess.slice(currentPage * 50, (currentPage + 1) * 50);
  const [removed, setRemoved] = useState<{ access: JobAccess; work: WorkEntry[] } | null>(null);
  useEffect(() => {
    if (!removed) return;
    const timeout = window.setTimeout(() => setRemoved(null), 10_000);
    return () => window.clearTimeout(timeout);
  }, [removed]);
  const [otherMethodsOpen, setOtherMethodsOpen] = useState(cachedAccess.length === 0);
  const invalidJobIdMessage = locale === "zh"
    ? "请输入有效任务号（最多 64 个字符），可包含文字、数字、空格、下划线、连字符、点和括号，不能包含连续两个点。"
    : "Enter a valid job ID (up to 64 characters): letters, numbers, spaces, underscores, hyphens, dots and parentheses are supported; consecutive dots are not allowed.";

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

    if (!isValidJobId(trimmedJobId)) {
      setOtherMethodsOpen(true);
      setError("invalidJobId");
      jobIdRef.current?.focus();
      return;
    }

    setError(null);
    navigate(jobRoute(trimmedJobId, trimmedToken));
  }

  function removeCachedAccess(access: JobAccess) {
    if (!deleteJobAccess(access.jobId, access.token)) return;
    const work = forgetJobWork(access.jobId, access.token);
    setRemoved({ access, work });
    setError(null);
  }

  function downloadRecoveryFiles() {
    const files = Object.fromEntries(cachedAccess.map((access, index) => [
      `job-${String(index + 1).padStart(4, "0")}.json`, strToU8(downloadableAccessJson(access))
    ]));
    const bytes = zipSync(files);
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/zip" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "easymsa-job-recovery.zip"; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setOtherMethodsOpen(true);
    try {
      if (file.name.toLowerCase().endsWith(".zip")) {
          if (file.size > 8 * 1024 * 1024) throw new Error("RECOVERY_TOO_LARGE");
        setImportEntries(parseRecoveryBackup(new Uint8Array(await file.arrayBuffer())));
        setError(null); return;
      }
      if (file.size > 128 * 1024) throw new Error("RECOVERY_TOO_LARGE");
      const parsed = JSON.parse(await file.text());
      const access = validateJobAccess(parsed);
      if (!access) {
        setError("invalidJson");
        return;
      }
      if (!isValidJobId(access.jobId)) {
        setError("invalidJobId");
        return;
      }
      // An imported file is a recovery attempt. The status page saves it only
      // after the server accepts its job ID and token.
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
          {cachedAccess.length > 0 && <span className="work-hint">{locale === "zh" ? "按最近访问排序" : "Most recently opened first"}</span>}
        </div>

        {cachedAccess.length > 0 && <div className="flex shrink-0 flex-wrap items-center gap-3 py-2">
          <label className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className="work-control !pl-9" type="search" value={search}
              aria-label={locale === "zh" ? "查找已保存任务" : "Find saved jobs"}
              placeholder={locale === "zh" ? "查找任务" : "Find a job"}
              onChange={event => { setSearch(event.target.value); setPage(0); }} />
          </label>
          <Button size="sm" variant="outline" onClick={downloadRecoveryFiles}><Download size={15} />{locale === "zh" ? "导出恢复文件" : "Export recovery files"}</Button>
        </div>}
        {removed && <div role="status" className="flex shrink-0 flex-wrap items-center gap-3 border-l-2 border-teal-600 px-3 py-2 text-sm">
          <span>{locale === "zh" ? "已移除本机记录。" : "Local record removed."}</span>
          <button type="button" className="work-link" onClick={() => {
            if (!saveJobAccess(removed.access)) return;
            restoreJobWork(removed.work); setRemoved(null);
          }}>{locale === "zh" ? "撤销" : "Undo"}</button>
        </div>}

        {cachedAccess.length > 0 ? (
          <div className="lookup-list">
            <div aria-hidden="true" className="lookup-column-labels">
              <span>{d.lookup.jobId}</span>
              <span>{locale === "zh" ? "最近访问 / 创建时间" : "Last opened / created"}</span>
              <span />
            </div>
            <ul aria-labelledby="cached-jobs-heading" className="lookup-rows">
              {visibleAccess.map((access) => {
                const matchingRecords = cachedAccess.filter(record => record.jobId === access.jobId);
                const keyLabel = matchingRecords.length > 1
                  ? savedKeyLabel(access, matchingRecords.indexOf(access), locale)
                  : null;
                return (
                <li className="lookup-row" key={access.jobId + ":" + access.token}>
                  <div className="lookup-job-id" title={access.jobId}>
                    <span className="sr-only">{d.lookup.jobId}: </span>
                    <span className="block truncate">{access.jobId}</span>
                    {keyLabel && <span className="block text-xs font-normal text-slate-500">{keyLabel}</span>}
                  </div>
                  <div className="lookup-created">
                    <span className="lookup-created-label">{locale === "zh" ? "最近访问" : "Last opened"}: </span>
                    <time dateTime={access.lastOpenedAt ?? access.createdAt}>{formatCreatedAt(access.lastOpenedAt ?? access.createdAt, locale)}</time>
                  </div>
                  <div className="lookup-row-actions">
                    <Button
                      aria-label={d.lookup.cachedRestore + ": " + access.jobId + (keyLabel ? ", " + keyLabel : "")}
                      onClick={() => restore(access.jobId, access.token)}
                      size="sm"
                    >
                      {d.lookup.cachedRestore}
                      <ArrowRight aria-hidden="true" size={15} />
                    </Button>
                    <Button
                      aria-label={d.lookup.cachedDelete + ": " + access.jobId + (keyLabel ? ", " + keyLabel : "")}
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
                );
              })}
            </ul>
            {filteredAccess.length === 0 && <p role="status" className="lookup-empty">{locale === "zh" ? "没有匹配的任务。" : "No matching jobs."}</p>}
          </div>
        ) : (
          <div className="lookup-empty">
            <Inbox aria-hidden="true" size={26} />
            <p>{d.lookup.cachedEmpty}</p>
            <div className="lookup-empty-actions">
              <ButtonLink size="sm" to="/submit"><Plus aria-hidden="true" size={15} />{locale === "zh" ? "提交新任务" : "Submit a job"}</ButtonLink>
              <ButtonLink size="sm" variant="outline" to="/examples/alignment-small"><FlaskConical aria-hidden="true" size={15} />{locale === "zh" ? "体验示例" : "Try an example"}</ButtonLink>
            </div>
          </div>
        )}
        {pageCount > 1 && <nav aria-label={locale === "zh" ? "任务列表分页" : "Job list pages"} className="flex shrink-0 items-center justify-end gap-3 py-2 text-sm">
          <Button size="sm" variant="outline" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>{locale === "zh" ? "上一页" : "Previous"}</Button>
          <span>{currentPage + 1} / {pageCount}</span>
          <Button size="sm" variant="outline" disabled={currentPage === pageCount - 1} onClick={() => setPage(currentPage + 1)}>{locale === "zh" ? "下一页" : "Next"}</Button>
        </nav>}
        <p className="work-hint lookup-storage-note">{d.lookup.cachedDescription}</p>
        {cachedAccess.length > 0 && <p className="work-hint shrink-0">{locale === "zh" ? "备份含访问密钥，请妥善保存；可直接导入 ZIP 或单个 JSON。" : "Backups contain access keys. Keep them private; import the ZIP or a single JSON directly."}</p>}
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
                aria-describedby={error === "missingFields" || error === "invalidJobId" ? "lookup-error" : undefined}
                aria-invalid={error === "invalidJobId" || error === "missingFields" && !jobId.trim() || undefined}
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
              accept="application/json,application/zip,.json,.zip"
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
            <span className="work-hint">{ui.recoveryHint}</span>
          </div>
          {error && <p className="work-error lookup-error" id="lookup-error" role="alert">{error === "invalidJobId" ? invalidJobIdMessage : d.lookup[error]}</p>}
        </div>
      </section>
      {importEntries && <RecoveryImportDialog entries={importEntries} onClose={() => setImportEntries(null)} />}
    </PageContainer>
  );
}
