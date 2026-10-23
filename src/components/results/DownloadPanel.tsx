import { Download } from "lucide-react";
import { ExternalButtonLink } from "../common/Button";
import { useLanguage } from "../../lib/i18n/useLanguage";
import type { ResultFile } from "../../lib/types/result";

export function DownloadPanel({ files, artifacts = [] }: { files: ResultFile[]; artifacts?: string[] }) {
  const { dictionary: d, locale } = useLanguage();
  const descriptions = locale === "zh" ? {
    archive: "完整结果包",
    "alignment-gzip": "比对序列 · FASTA，gzip 压缩",
    "alignment-gzip-xz": "比对序列 · FASTA，gzip 与 xz 双重压缩"
  } : {
    archive: "Complete result archive",
    "alignment-gzip": "Aligned sequences · gzip-compressed FASTA",
    "alignment-gzip-xz": "Aligned sequences · FASTA compressed with gzip and xz"
  };
  const primaryFiles = files.filter(file => file.kind !== "alignment-gzip-xz");
  const additionalFiles = files.filter(file => file.kind === "alignment-gzip-xz");
  function fileRow(file: ResultFile) {
    const description = file.kind ? descriptions[file.kind] : file.description;
    return <div className="flex min-w-0 flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between" key={file.name}>
      <div className="min-w-0 flex-1">
        <p className="break-all font-mono text-sm font-semibold text-slate-900">{file.name}</p>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
        {file.size && file.size !== "remote" && <p className="mt-1 text-xs text-slate-500">{file.size}</p>}
      </div>
      <ExternalButtonLink className="shrink-0" download={file.name} href={file.href} aria-label={`${d.common.download} ${file.name}`}>
        <Download className="h-4 w-4" aria-hidden="true" />{d.common.download}
      </ExternalButtonLink>
    </div>;
  }

  return (
    <section className="space-y-5">
      <div className="max-w-3xl space-y-2">
        <h2 className="text-2xl font-semibold text-slate-950">
          {d.results.downloads.title}
        </h2>
        <p className="text-sm leading-6 text-slate-600">
          {d.results.downloads.description}
        </p>
      </div>
      <div className="divide-y divide-slate-200 border-y border-slate-200">
        {primaryFiles.map(fileRow)}
      </div>
      {additionalFiles.length > 0 && <details className="border-b border-slate-200 pb-3 text-sm">
        <summary className="cursor-pointer font-medium text-teal-700">{locale === "zh" ? "其他压缩格式" : "Other compressed formats"}</summary>
        {additionalFiles.map(fileRow)}
      </details>}
      {artifacts.length > 0 && <details className="border-t border-slate-200 pt-3 text-sm">
        <summary className="cursor-pointer font-medium text-slate-700">{d.results.overview.outputs.title} · {artifacts.length}</summary>
        <ul className="mt-3 grid gap-2 font-mono text-xs text-slate-600 sm:grid-cols-2">
          {artifacts.map(file => <li className="break-all" key={file}>{file}</li>)}
        </ul>
      </details>}
    </section>
  );
}
