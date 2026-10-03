import { Link } from "react-router-dom";
import { PageContainer } from "../components/layout/PageContainer";
import { useLanguage } from "../lib/i18n/useLanguage";
import { methods } from "../lib/methods";
export function AboutPage() {
  const { locale } = useLanguage();
  const zh = locale === "zh";
  return (
    <PageContainer className="space-y-8">
      <h1 className="text-4xl font-semibold">
        {zh ? "关于 EasyMSA" : "About EasyMSA"}
      </h1>
      <section className="max-w-4xl space-y-4 text-sm leading-7 text-slate-600">
        <p>
          {zh
            ? "EasyMSA 提供核酸多序列比对与可选重比对。MiniPOA、HAlign4、FMAlign2 和 ReAlign-N 来自实验室此前的方法工作；MAFFT 和 Mash 是外部工具。"
            : "EasyMSA provides nucleotide multiple sequence alignment and optional refinement. MiniPOA, HAlign4, FMAlign2 and ReAlign-N originate from the laboratory’s prior methods work; MAFFT and Mash are external tools."}
        </p>
        <p>
          {zh
            ? "Auto 根据序列特征自动选择比对方法。通过统一预处理、可选重比对、交互分析和任务恢复，完成从序列输入到结果下载的流程。"
            : "Auto selects an alignment method based on sequence features. Unified preprocessing, optional refinement, interactive analysis and job recovery support your workflow from input to download."}
        </p>
      </section>
      <h2 className="text-2xl font-semibold">
        {zh ? "方法、版本与引用" : "Methods, versions and citations"}
      </h2>
      <div className="grid gap-5 md:grid-cols-2">
        {methods.map((m) => (
          <section
            key={m.name}
            className="space-y-3 rounded-2xl border bg-white p-5"
          >
            <h3 className="text-xl font-semibold">
              {m.name}{" "}
              <span className="text-sm font-normal text-slate-500">
                {m.version}
              </span>
            </h3>
            <p className="text-xs font-medium text-teal-800">
              {m.origin === "lab"
                ? zh
                  ? "实验室自研方法"
                  : "Developed by our laboratory"
                : zh
                  ? "外部依赖"
                  : "External dependency"}
            </p>
            <p className="text-sm leading-7">
              {m.role[locale]} · {m.input[locale]}
            </p>
            <a
              className="block text-sm leading-6 text-teal-800 underline"
              href={m.paper}
            >
              {m.title}
            </a>
            <a className="text-sm text-teal-800 underline" href={m.source}>
              {zh ? "软件与原始文档" : "Software and original documentation"}
            </a>
          </section>
        ))}
      </div>
      <p className="text-sm leading-7">
        {zh
          ? "使用 EasyMSA 发表研究时，建议引用实际使用的方法。"
          : "When publishing work using EasyMSA, please cite the methods used."}
      </p>
      <div className="flex flex-wrap gap-4 text-teal-800 underline">
        <Link to="/license">
          {zh ? "许可与第三方声明" : "Licenses and third-party notices"}
        </Link>
        <a href="https://github.com/malabz/easymsa/issues">GitHub Issues</a>
        <a href="https://github.com/malabz/easymsa">GitHub</a>
      </div>
      <p className="text-sm text-slate-600">
        {zh
          ? "公开反馈请勿附带用户序列、邮箱或任务访问凭证。实验室已明确持续维护负责人与至少五年的服务维护安排。"
          : "Do not include user sequences, email addresses or task access credentials in public issues. The laboratory has designated maintainers and committed to at least five years of service maintenance."}
      </p>
    </PageContainer>
  );
}
