import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { ButtonLink } from "../common/Button";
import { ServiceStatus } from "../common/ServiceStatus";
import {
  exampleUrl,
  loadExamples,
  loadExampleResult,
} from "../../lib/examples";
export function HeroSection() {
  const { locale, dictionary: d } = useLanguage();
  const zh = locale === "zh";
  const manifest = useQuery({
    queryKey: ["public-examples", "v1"],
    queryFn: ({ signal }) => loadExamples(signal),
    staleTime: Infinity,
    retry: 1,
  });
  const example = manifest.data?.find((e) => e.kind === "alignment");
  const result = useQuery({
    queryKey: ["public-example", "alignment-small", "v1", "final"],
    queryFn: ({ signal }) => loadExampleResult(example!, "final", signal),
    enabled: Boolean(example),
    staleTime: Infinity,
    retry: 1,
  });
  return (
    <section className="grid gap-10 overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white via-white to-teal-50/70 px-6 py-10 shadow-sm sm:px-10 lg:grid-cols-2 lg:items-center lg:py-14">
      <div className="space-y-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-teal-800">
          EasyMSA · DNA / RNA
        </p>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">
          {zh
            ? "核酸多序列比对与重比对"
            : "Nucleotide alignment and refinement"}
        </h1>
        <p className="text-lg leading-8 text-slate-600">
          {zh
            ? "上传 DNA 或 RNA 序列，自动选择比对方法，在线浏览并下载结果。"
            : "Upload DNA or RNA sequences, automatically select an alignment method, and explore and download your results."}
        </p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink to="/submit">{d.common.startAnalysis}</ButtonLink>
          <ButtonLink to="/examples" variant="outline">
            {zh ? "浏览示例结果" : "Browse example results"}
          </ButtonLink>
        </div>
        <div className="flex flex-wrap gap-4 text-sm font-medium text-teal-800 underline">
          {example && (
            <a href={exampleUrl(example, "input.fasta")} download>
              {zh ? "下载示例输入" : "Download example input"}
            </a>
          )}
          <Link to="/lookup">{zh ? "恢复已有任务" : "Recover a job"}</Link>
        </div>
        <p className="text-sm leading-7">
          {zh
            ? "学术、非商业及商业用途均免费，无需注册。"
            : "Free for academic, non-commercial and commercial use. No registration."}{" "}
          <Link className="text-teal-800 underline" to="/license">
            MIT / {zh ? "许可范围" : "license scope"}
          </Link>{" "}
          ·{" "}
          <Link className="text-teal-800 underline" to="/privacy">
            {zh ? "隐私与本地存储" : "Privacy and storage"}
          </Link>
        </p>
        <ServiceStatus compact />
      </div>
      <div className="space-y-5">
        <Link
          to="/examples/alignment-small"
          className="block space-y-5 overflow-hidden rounded-3xl border border-teal-200 bg-white p-6 shadow-soft focus:outline-none focus:ring-2 focus:ring-teal-600"
        >
          <div className="border-b pb-4">
            <h2 className="text-lg font-semibold">
              {zh ? "浏览示例结果" : "Explore example results"}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {example
                ? `${example.stages.final.sequenceCount} ${zh ? "条序列" : "sequences"} · ${example.stages.final.alignmentLength} ${zh ? "列" : "columns"} · MiniPOA 1.0`
                : zh
                  ? "合成 DNA"
                  : "Synthetic DNA"}
            </p>
          </div>
          {result.data ? (
            <div
              className="space-y-2 overflow-hidden font-mono text-xs"
              aria-label={
                zh
                  ? "真实比对的前四行预览"
                  : "Preview of the first four alignment rows"
              }
            >
              {result.data.alignment.sequences.slice(0, 4).map((row) => (
                <div key={row.id} className="flex gap-3">
                  <span className="w-24 shrink-0 truncate">{row.id}</span>
                  <span className="whitespace-nowrap tracking-widest text-teal-900">
                    {row.sequence.slice(0, 32)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm">
              {manifest.isError || result.isError
                ? zh
                  ? "预览暂时无法加载，请进入示例页重试。"
                  : "Preview unavailable. Open examples to retry."
                : zh
                  ? "正在读取示例…"
                  : "Loading example…"}
            </p>
          )}
          <p className="text-sm font-medium text-teal-800">
            {zh
              ? "搜索 · 区域选择 · 统计 · 导出 →"
              : "Search · Select regions · Statistics · Export →"}
          </p>
        </Link>
        <div className="space-y-2 px-2">
          <h2 className="font-semibold">
            {zh
              ? "比对方法"
              : "Alignment methods"}
          </h2>
          <p className="text-sm leading-7 text-slate-600">
            {zh
              ? "集成自研 MiniPOA、HAlign4、FMAlign2 与 ReAlign-N，支持自动方法选择和交互分析。"
              : "Explore our MiniPOA, HAlign4, FMAlign2 and ReAlign-N methods with automatic method selection and interactive analysis."}
          </p>
          <Link className="text-sm text-teal-800 underline" to="/about">
            {zh ? "方法介绍与原始论文" : "Methods and original papers"}
          </Link>
        </div>
      </div>
    </section>
  );
}
