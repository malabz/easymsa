import { Download } from "lucide-react";
import { ExternalButtonLink } from "../common/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../common/Card";
import { useLanguage } from "../../lib/i18n/useLanguage";
import type { ResultFile } from "../../lib/types/result";

export function DownloadPanel({ files }: { files: ResultFile[] }) {
  const { dictionary: d } = useLanguage();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{d.results.downloads.title}</CardTitle>
        <CardDescription>{d.results.downloads.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {files.map((file) => (
            <div
              className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
              key={file.name}
            >
              <div>
                <p className="font-mono text-sm font-semibold text-slate-900">
                  {file.name}
                </p>
                <p className="mt-1 text-sm text-slate-600">{file.description}</p>
                <p className="mt-1 text-xs text-slate-500">{file.size}</p>
              </div>
              <ExternalButtonLink download href={file.href}>
                <Download className="h-4 w-4" />
                {d.common.download}
              </ExternalButtonLink>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
