import { useState } from "react";
import { Link } from "react-router-dom";
import { PageContainer } from "../components/layout/PageContainer";
import { Button } from "../components/common/Button";
import { useLanguage } from "../lib/i18n/useLanguage";
import {
  clearOwnStorage,
  TASK_STORAGE_KEYS,
  VIEWER_STORAGE_KEYS,
} from "../lib/storage";
export function PrivacyPage() {
  const { locale } = useLanguage();
  const zh = locale === "zh";
  const [confirm, setConfirm] = useState<"tasks" | "viewer" | null>(null);
  const [message, setMessage] = useState("");
  function clear() {
    const ok = clearOwnStorage(
      confirm === "tasks" ? TASK_STORAGE_KEYS : VIEWER_STORAGE_KEYS,
    );
    setMessage(
      ok
        ? zh
          ? "已清除所选本机记录。"
          : "Selected local records were cleared."
        : zh
          ? "浏览器存储不可用，无法确认清除。"
          : "Browser storage is unavailable; clearing could not be confirmed.",
    );
    setConfirm(null);
  }
  const paragraphs = zh
    ? [
        [
          "服务器如何处理数据",
          "上传序列仅用于你请求的预处理、比对或重比对。普通用户任务不会自动成为公开示例，上传数据不因使用服务而被授予开源许可。",
        ],
        [
          "访问与保留",
          "结果由任务访问凭证保护。持有恢复链接或凭证的人可以访问对应任务，请勿公开分享。输入和结果文件按任务到期及定时清理机制处理，当前保留期为七天，定时清理可能稍有延迟。请及时下载结果。",
        ],
        [
          "数据库、日志与备份",
          "七天保留期适用于输入和结果文件。任务状态、任务名、邮箱等数据库记录，以及运维日志和备份，按运维需要另行保留和管理。访问日志可能包含 IP、时间和请求路径；任务访问凭证不应写入日志。",
        ],
        [
          "可选邮件通知",
          "填写邮箱时，通知通过 Resend 发送。发送服务接触收件地址、任务状态及含访问凭证的恢复链接等邮件内容；序列文件不作为附件发送。不填邮箱也可使用服务。",
        ],
        [
          "浏览器本机存储",
          "EasyMSA 使用 localStorage 保存语言偏好、最近任务凭证及查看器工作区。工作区可含搜索词、motif、筛选、选区、注释和视图设置。共享电脑上的其他使用者可能读取这些记录。独立本地查看器在浏览器内解析文件，不会自动把文件提交到服务器。",
        ],
        [
          "Cookie 与跟踪",
          "当前应用不使用 Cookie、广告或第三方行为跟踪器。外部论文、软件仓库和邮件服务适用各自的隐私政策。存储或跟踪方式变化时，本说明将相应更新。",
        ],
      ]
    : [
        [
          "Server data processing",
          "Uploaded sequences are used for the preprocessing, alignment or refinement you request. Personal jobs do not automatically become public examples. Uploading does not license your data as open source.",
        ],
        [
          "Access and retention",
          "Job access credentials protect results. Anyone holding a recovery link or credential can access that job; keep them private. Input and result files follow job expiry and scheduled cleanup, currently seven days with possible cleanup delay. Download results promptly.",
        ],
        [
          "Database, logs and backups",
          "The seven-day retention period applies to input and result files. Database records such as job status, names and email addresses, along with operational logs and backups, are retained and managed separately as needed. Access logs may contain IP addresses, times and request paths; job credentials should not be logged.",
        ],
        [
          "Optional email",
          "Notifications use Resend when an email address is provided. This provider receives the recipient address and message contents, including job status and a recovery link containing access credentials. Sequence files are not attached. Email is optional.",
        ],
        [
          "Browser storage",
          "EasyMSA uses localStorage for language preferences, recent job credentials and viewer workspaces. Workspaces may contain searches, motifs, filters, selections, annotations and view settings. Other users of a shared computer may access these records. The standalone local viewer parses files in your browser and does not automatically submit them to the server.",
        ],
        [
          "Cookies and tracking",
          "The application uses no cookies, advertising or third-party behavioral trackers. External papers, software repositories and email services have their own privacy policies. This notice will be updated if storage or tracking practices change.",
        ],
      ];
  return (
    <PageContainer className="max-w-4xl space-y-8">
      <h1 className="text-4xl font-semibold">
        {zh ? "隐私与本地存储" : "Privacy and browser storage"}
      </h1>
      {paragraphs.map(([title, text]) => (
        <section key={title} className="space-y-3">
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm leading-7 text-slate-600">{text}</p>
        </section>
      ))}
      <section className="space-y-4 rounded-2xl border bg-white p-6">
        <h2 className="text-xl font-semibold">
          {zh ? "管理本机记录" : "Manage local records"}
        </h2>
        <p className="text-sm leading-7">
          {zh
            ? "清除前请保存需要的恢复链接。以下操作仅清除 EasyMSA 对应记录，不撤销恢复链接、不删除服务器任务或下载文件，也不影响同域其他网站数据或语言偏好。已打开的其他标签页可能再次保存工作区，建议先关闭它们。"
            : "Save any recovery links you need first. These controls clear only the corresponding EasyMSA records; they do not revoke links, delete server jobs or downloads, or affect other sites’ data or your language preference. Other open tabs may save workspaces again; close them first."}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setConfirm("tasks");
              setMessage("");
            }}
          >
            {zh ? "清除本地任务记录" : "Clear local job records"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setConfirm("viewer");
              setMessage("");
            }}
          >
            {zh ? "清除查看器工作区" : "Clear viewer workspaces"}
          </Button>
        </div>
        {confirm && (
          <div role="alert" className="space-y-3 rounded-lg bg-amber-50 p-4">
            <p>
              {zh
                ? "确定清除所选记录？此操作无法撤销；任务恢复凭证请另行保存。"
                : "Clear these records? This cannot be undone. Save your job recovery credentials separately."}
            </p>
            <Button onClick={clear}>{zh ? "确认清除" : "Confirm clear"}</Button>{" "}
            <Button variant="outline" onClick={() => setConfirm(null)}>
              {zh ? "取消" : "Cancel"}
            </Button>
          </div>
        )}
        {message && <p role="status">{message}</p>}
      </section>
      <p className="text-sm">
        <Link className="text-teal-800 underline" to="/docs">
          {zh ? "任务恢复帮助" : "Job recovery help"}
        </Link>{" "}
        ·{" "}
        <a
          className="text-teal-800 underline"
          href="https://resend.com/legal/privacy-policy"
        >
          Resend privacy policy
        </a>
      </p>
    </PageContainer>
  );
}
