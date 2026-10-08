import { Link } from "react-router-dom";
import { PageContainer } from "../components/layout/PageContainer";
import { useLanguage } from "../lib/i18n/useLanguage";
import { methods } from "../lib/methods";

type Method = (typeof methods)[number];

function MethodList({ entries, locale }: { entries: readonly Method[]; locale: "en" | "zh" }) {
  const zh = locale === "zh";
  return (
    <div className="divide-y divide-slate-200 border-y border-slate-200">
      <div className="hidden grid-cols-[minmax(6.5rem,0.7fr)_minmax(12rem,2fr)_minmax(5.5rem,0.6fr)_minmax(13rem,1.65fr)_minmax(7rem,0.9fr)] gap-4 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 lg:grid">
        <span>{zh ? "方法" : "Method"}</span>
        <span>{zh ? "用途与特点" : "Use and input"}</span>
        <span>{zh ? "版本" : "Version"}</span>
        <span>{zh ? "相关论文" : "Publication"}</span>
        <span>{zh ? "源码 / 文档" : "Source / docs"}</span>
      </div>
      {entries.map((method) => (
        <article className="grid gap-2 py-4 text-sm lg:grid-cols-[minmax(6.5rem,0.7fr)_minmax(12rem,2fr)_minmax(5.5rem,0.6fr)_minmax(13rem,1.65fr)_minmax(7rem,0.9fr)] lg:gap-4 lg:px-3 lg:py-3" key={method.name}>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h3 className="font-semibold text-slate-950">{method.name}</h3>
            <span className="text-xs text-slate-500 lg:hidden">{method.version}</span>
          </div>
          <p className="leading-5 text-slate-600">{method.role[locale]} · {method.input[locale]}</p>
          <span className="hidden text-slate-600 lg:block">{method.version}</span>
          <div className="flex flex-wrap gap-x-4 gap-y-1 lg:contents">
            <a className="w-fit break-words font-medium leading-5 text-teal-800 underline underline-offset-2 hover:text-teal-950" href={method.paper} rel="noreferrer" target="_blank" title={method.title}>
              <span className="lg:hidden">{zh ? "论文" : "Paper"}</span><span className="hidden lg:inline">{method.title}</span>
            </a>
            <a className="w-fit font-medium text-teal-800 underline underline-offset-2 hover:text-teal-950" href={method.source} rel="noreferrer" target="_blank">
              {zh ? "软件与文档" : "Software & docs"}
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}

export function AboutPage() {
  const { locale } = useLanguage();
  const zh = locale === "zh";
  return (
    <PageContainer className="space-y-8 pb-10 pt-6 lg:space-y-10">
      <header className="max-w-4xl border-b border-slate-200 pb-7">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          {zh ? "关于 EasyMSA" : "About EasyMSA"}
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-700">
          {zh
            ? "EasyMSA 提供核酸多序列比对与可选重比对。MiniPOA、HAlign4、FMAlign2 和 ReAlign-N 来自实验室此前的方法工作；MAFFT 和 Mash 是外部工具。"
            : "EasyMSA provides nucleotide multiple sequence alignment and optional refinement. MiniPOA, HAlign4, FMAlign2 and ReAlign-N originate from the laboratory’s prior methods work; MAFFT and Mash are external tools."}
        </p>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          {zh
            ? "Auto 根据序列特征自动选择比对方法。统一预处理、交互分析和任务恢复连接从输入到下载的完整流程。"
            : "Auto selects an alignment method from sequence features. Preprocessing, interactive analysis and job recovery connect input to download."}
        </p>
      </header>

      <div className="space-y-8">
        <section aria-labelledby="lab-methods-title">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-semibold text-slate-950" id="lab-methods-title">{zh ? "实验室方法" : "Laboratory methods"}</h2>
            <span className="text-xs text-slate-500">{zh ? "来自实验室此前的方法工作" : "Methods developed by the laboratory"}</span>
          </div>
          <MethodList entries={methods.filter((method) => method.origin === "lab")} locale={locale} />
        </section>
        <section aria-labelledby="external-methods-title">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-semibold text-slate-950" id="external-methods-title">{zh ? "外部工具" : "External tools"}</h2>
            <span className="text-xs text-slate-500">{zh ? "第三方开源工具" : "Third-party open-source tools"}</span>
          </div>
          <MethodList entries={methods.filter((method) => method.origin === "external")} locale={locale} />
        </section>
      </div>

      <footer className="border-t border-slate-200 pt-5 text-sm leading-6 text-slate-600">
        <p>{zh ? "发表研究时，建议引用实际使用的方法。" : "When publishing work using EasyMSA, please cite the methods used."}</p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 font-medium text-teal-800 underline underline-offset-2">
          <Link to="/license">{zh ? "许可与第三方声明" : "Licenses and third-party notices"}</Link>
          <a href="https://github.com/malabz/easymsa/issues" rel="noreferrer" target="_blank">GitHub Issues</a>
          <a href="https://github.com/malabz/easymsa" rel="noreferrer" target="_blank">GitHub</a>
        </div>
        <p className="mt-3 text-xs leading-6 text-slate-500">
          {zh
            ? "公开反馈请勿附带用户序列、邮箱或任务访问凭证。实验室已明确持续维护负责人与至少五年的服务维护安排。"
            : "Do not include user sequences, email addresses or task access credentials in public issues. The laboratory has designated maintainers and committed to at least five years of service maintenance."}
        </p>
      </footer>
    </PageContainer>
  );
}
