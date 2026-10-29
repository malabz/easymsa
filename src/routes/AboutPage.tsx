import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { CopyCitation } from "../components/common/CopyCitation";
import { PageContainer } from "../components/layout/PageContainer";
import { refinementText } from "../lib/i18n/refinements";
import { useLanguage } from "../lib/i18n/useLanguage";
import { methods } from "../lib/methods";
import "./about.css";

type Method = (typeof methods)[number];

function Publication({ publication, locale, current = false }: { publication: { paper: string; title: string; journal: string; year: number }; locale: "zh" | "en"; current?: boolean }) {
  return <div className="about-publication">
    {current && <p className="about-publication-label">{refinementText[locale].currentPaper}</p>}
    <a className="about-paper-link" href={publication.paper} rel="noreferrer" target="_blank" title={publication.title}>{publication.title}</a>
    <p className="about-publication-meta"><span>{publication.journal}</span><span aria-hidden="true">·</span><span>{publication.year}</span></p>
    <CopyCitation {...publication} />
  </div>;
}

function MethodList({ entries, locale }: { entries: readonly Method[]; locale: "en" | "zh" }) {
  const zh = locale === "zh";
  return <div className="about-method-list">
    <div className="about-method-columns" aria-hidden="true">
      <span>{zh ? "方法 / 部署版本" : "Method / deployed version"}</span>
      <span>{zh ? "用途与输入" : "Use and input"}</span>
      <span>{zh ? "研究与引用" : "Research and citations"}</span>
    </div>
    {entries.map(method => <article className="about-method" key={method.name}>
      <div className="about-method-identity">
        <h3>{method.name}</h3>
        <p className="about-version"><span>{zh ? "部署版本" : "Deployed version"}</span><code>{method.version}</code></p>
        <a className="about-source-link" href={method.source} rel="noreferrer" target="_blank">
          {zh ? "软件与文档" : "Software & docs"}<ArrowUpRight size={14} aria-hidden="true" />
        </a>
      </div>
      <div className="about-method-purpose"><p>{method.role[locale]}</p><p>{method.input[locale]}</p></div>
      <div className="about-method-publications">
        <Publication publication={method} locale={locale} current />
        {"additionalPapers" in method && <div className="about-related-publications">
          <p className="about-publication-label">{refinementText[locale].relatedPaper}</p>
          {method.additionalPapers.map(publication => <Publication key={publication.paper} publication={publication} locale={locale} />)}
        </div>}
      </div>
    </article>)}
  </div>;
}

export function AboutPage() {
  const { locale } = useLanguage();
  const zh = locale === "zh";
  return <PageContainer className="about-page">
    <header className="about-hero">
      <div className="about-hero-main">
        <p className="about-eyebrow">{zh ? "多序列比对 · 在线工作台" : "Multiple sequence alignment · Online workspace"}</p>
        <h1>{zh ? "关于 EasyMSA" : "About EasyMSA"}</h1>
        <p className="about-intro">{zh
          ? "EasyMSA 提供 MiniPOA、HAlign-5、MAFFT 和 FMAlign2 + MAFFT，支持 Auto 自动选择方法、ReAlign-N 重比对及结果浏览。"
          : "EasyMSA offers MiniPOA, HAlign-5, MAFFT and FMAlign2 + MAFFT, with Auto method selection, ReAlign-N realignment and interactive results."}</p>
      </div>
      <div className="about-hero-note">
        <p className="about-molecule">DNA <span aria-hidden="true">/</span> RNA</p>
        <p>{zh ? "从序列到比对结果" : "From sequences to alignment"}</p>
        <p className="about-workflow">{zh ? "比对、优化、探索。" : "Align, refine, explore."}</p>
      </div>
    </header>

    <section className="about-benchmark" aria-labelledby="about-benchmark-title">
      <div className="about-section-label"><span aria-hidden="true">01</span>{zh ? "评测与比较" : "Evaluation"}</div>
      <Link to="/benchmark" className="about-benchmark-link" aria-labelledby="about-benchmark-title" aria-describedby="about-benchmark-description">
        <div><h2 id="about-benchmark-title">Benchmark</h2><p id="about-benchmark-description">{zh ? "浏览 DNA / RNA 数据集，查看各方法的比对质量、运行时间和内存表现。" : "Explore DNA / RNA datasets and compare alignment quality, runtime and memory across methods."}</p></div>
        <span className="about-benchmark-arrow" aria-hidden="true"><ArrowRight size={26} strokeWidth={1.5} /></span>
      </Link>
    </section>

    <section className="about-research" aria-labelledby="lab-methods-title">
      <div className="about-section-heading">
        <div className="about-section-label"><span aria-hidden="true">02</span>{zh ? "研究与软件" : "Research & software"}</div>
        <div><h2 id="lab-methods-title">{zh ? "自主研发方法" : "Our methods"}</h2><p>{zh ? "方法、软件版本及其背后的研究。发表研究时，请引用实际使用的方法。" : "The methods, their deployed versions and the research behind them. Please cite the methods used in your work."}</p></div>
      </div>
      <MethodList entries={methods.filter(method => method.origin === "lab")} locale={locale} />
    </section>

    <footer className="about-footer">
      <div className="about-section-label"><span aria-hidden="true">03</span>{zh ? "开放与交流" : "Open source & support"}</div>
      <div>
        <div className="about-footer-links">
          <Link to="/license">{zh ? "使用许可" : "Licenses and third-party notices"}<ArrowRight size={14} aria-hidden="true" /></Link>
          <a href="https://github.com/malabz/easymsa/issues" rel="noreferrer" target="_blank">GitHub Issues<ArrowUpRight size={14} aria-hidden="true" /></a>
          <a href="https://github.com/malabz/easymsa" rel="noreferrer" target="_blank">GitHub<ArrowUpRight size={14} aria-hidden="true" /></a>
        </div>
        <p>{zh ? "反馈问题时，请勿公开序列和访问密钥。" : "Keep sequences and access keys private when reporting an issue."}</p>
      </div>
    </footer>
  </PageContainer>;
}
