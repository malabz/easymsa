import { CopyCitation } from "../components/common/CopyCitation";
import { refinementText } from "../lib/i18n/refinements";
import { Link } from "react-router-dom";
import { PageContainer } from "../components/layout/PageContainer";
import { useLanguage } from "../lib/i18n/useLanguage";
import { methods } from "../lib/methods";

type Method = (typeof methods)[number];

function Publication({ publication, locale, current = false }: { publication: { paper: string; title: string; journal: string; year: number }; locale: "zh" | "en"; current?: boolean }) {
  return <div className="grid gap-1 lg:grid-cols-[minmax(14rem,2fr)_minmax(9rem,1.1fr)] lg:gap-4">
    <div>{current && <span className="mb-1 block text-xs text-slate-500">{refinementText[locale].currentPaper}</span>}
      <a className="w-fit break-words font-medium leading-5 text-teal-800 underline underline-offset-2 hover:text-teal-950" href={publication.paper} rel="noreferrer" target="_blank" title={publication.title}>{publication.title}</a>
      <CopyCitation {...publication}/>
    </div>
    <p className="text-xs leading-5 text-slate-600 lg:text-sm"><span className="font-medium">{publication.journal}</span><span className="block text-xs text-slate-500">{publication.year}</span></p>
  </div>;
}

function MethodList({ entries, locale }: { entries: readonly Method[]; locale: "en" | "zh" }) {
  const zh = locale === "zh";
  return (
    <div className="divide-y divide-slate-200 border-y border-slate-200">
      <div className="hidden grid-cols-[minmax(6rem,0.7fr)_minmax(10rem,1.5fr)_minmax(14rem,2fr)_minmax(9rem,1.1fr)_minmax(6rem,0.8fr)] gap-4 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 lg:grid">
        <span>{zh ? "方法" : "Method"}</span>
        <span>{zh ? "用途与特点" : "Use and input"}</span>
        <span>{zh ? "相关论文" : "Publication"}</span>
        <span>{zh ? "发表期刊" : "Journal"}</span>
        <span>{zh ? "源码 / 文档" : "Source / docs"}</span>
      </div>
      {entries.map((method) => (
        <article className="grid gap-2 py-4 text-sm lg:grid-cols-[minmax(6rem,0.7fr)_minmax(10rem,1.5fr)_minmax(14rem,2fr)_minmax(9rem,1.1fr)_minmax(6rem,0.8fr)] lg:gap-4 lg:px-3 lg:py-3" key={method.name}>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h3 className="font-semibold text-slate-950">{method.name}</h3>
          </div>
          <p className="leading-5 text-slate-600">{method.role[locale]} · {method.input[locale]}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 lg:contents">
            <div className="flex flex-col gap-3 lg:col-span-2">
              <Publication publication={method} locale={locale} current />
              {"additionalPapers" in method && <div className="space-y-3 text-sm">
                <p className="text-xs text-slate-500">{refinementText[locale].relatedPaper}</p>
                {method.additionalPapers.map(publication => <Publication key={publication.paper} publication={publication} locale={locale} />)}
              </div>}
            </div>
            <div className="min-w-0 space-y-2"><a className="w-fit font-medium text-teal-800 underline underline-offset-2 hover:text-teal-950" href={method.source} rel="noreferrer" target="_blank">
              {zh ? "软件与文档" : "Software & docs"}
            </a>
            <div className="text-xs text-slate-600"><p>{zh ? "部署版本" : "Deployed version"}</p>
              <code className="block break-all py-1">{method.version}</code>
            </div></div>
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
            ? "EasyMSA 提供 MiniPOA、HAlign-5、MAFFT 和 FMAlign2 + MAFFT，支持 Auto 自动选择方法、ReAlign-N 重比对及结果浏览。"
            : "EasyMSA offers MiniPOA, HAlign-5, MAFFT and FMAlign2 + MAFFT, with Auto method selection, ReAlign-N realignment and interactive results."}
        </p>

      </header>

      <div className="space-y-8">
        <section aria-labelledby="lab-methods-title">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-semibold text-slate-950" id="lab-methods-title">{zh ? "自主研发方法" : "Our methods"}</h2>
          </div>
          <MethodList entries={methods.filter((method) => method.origin === "lab")} locale={locale} />
        </section>
      </div>

      <footer className="border-t border-slate-200 pt-5 text-sm leading-6 text-slate-600">
        <p>{zh ? "发表研究时，建议引用实际使用的方法。" : "When publishing work using EasyMSA, please cite the methods used."}</p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 font-medium text-teal-800 underline underline-offset-2">
          <Link to="/license">{zh ? "使用许可" : "Licenses and third-party notices"}</Link>
          <a href="https://github.com/malabz/easymsa/issues" rel="noreferrer" target="_blank">GitHub Issues</a>
          <a href="https://github.com/malabz/easymsa" rel="noreferrer" target="_blank">GitHub</a>
        </div>
        <p className="mt-3 text-xs leading-6 text-slate-500">
          {zh
            ? "反馈问题时，请勿公开序列和访问密钥。"
            : "Keep sequences and access keys private when reporting an issue."}
        </p>
      </footer>
    </PageContainer>
  );
}
