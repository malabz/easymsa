import { TerminalSquare } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "../common/Card";
import { useLanguage } from "../../lib/i18n/useLanguage";

export function JobLogPanel({ logs }: { logs: string[] }) {
  const { dictionary: d } = useLanguage();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TerminalSquare className="h-5 w-5 text-cyan-700" />
          {d.job.logs}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-100">
          {logs.map((log, index) => (
            <p key={`${log}-${index}`}>
              <span className="text-cyan-300">{String(index + 1).padStart(2, "0")}</span>{" "}
              {log}
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
