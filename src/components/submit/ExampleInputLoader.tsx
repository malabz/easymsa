import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { loadExampleInput } from "../../lib/examples";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { Button } from "../common/Button";
export function ExampleInputLoader({
  kind,
  disabled,
  onLoad,
}: {
  kind: "alignment" | "realignment";
  disabled: boolean;
  onLoad: (file: File) => void;
}) {
  const { locale } = useLanguage();
  const zh = locale === "zh";
  const [params] = useSearchParams();
  const id = `${kind}-small`;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const callback = useRef(onLoad);
  callback.current = onLoad;
  const requested = useRef<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function load() {
    setPending(true);
    setError(false);
    try {
      const { file } = await loadExampleInput(id);
      if (mounted.current) {
        callback.current(file);
        setLoaded(true);
      }
    } catch {
      if (mounted.current) setError(true);
    } finally {
      if (mounted.current) setPending(false);
    }
  }
  useEffect(() => {
    if (params.get("example") === id && requested.current !== id && !disabled) {
      requested.current = id;
      void load();
    }
  }, [params, id, disabled]);
  return (
    <aside className="space-y-3 rounded-xl border border-teal-200 bg-teal-50/50 p-4 text-sm">
      <div className="flex flex-wrap items-center gap-4">
        <Button
          disabled={disabled || pending}
          variant="outline"
          size="sm"
          onClick={() => void load()}
        >
          {pending
            ? zh
              ? "正在载入…"
              : "Loading…"
            : zh
              ? "载入示例文件"
              : "Load example file"}
        </Button>
        <Link
          className="font-medium text-teal-800 underline"
          to={`/examples/${id}`}
        >
          {zh ? "浏览对应示例结果" : "Explore the example result"}
        </Link>
      </div>
      <p className="text-slate-600">
        {zh
          ? "载入后可调整参数并提交。"
          : "Load the example, adjust settings, and submit."}
      </p>
      {loaded && (
        <p role="status">
          {zh
            ? "示例已载入，请检查后提交。"
            : "Example loaded. Review and submit when ready."}
        </p>
      )}
      {error && (
        <p role="alert" className="text-rose-800">
          {zh
            ? "无法载入示例文件，请重试。"
            : "Unable to load the example file. Please retry."}
        </p>
      )}
    </aside>
  );
}
