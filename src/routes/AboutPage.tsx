import { Github } from "lucide-react";
import { ExternalButtonLink } from "../components/common/Button";
import { PageContainer } from "../components/layout/PageContainer";
import { useLanguage } from "../lib/i18n/useLanguage";

export function AboutPage() {
  const { dictionary: d } = useLanguage();

  return (
    <PageContainer className="space-y-8">
      <div className="max-w-3xl space-y-3">
        <h1 className="text-4xl font-semibold text-slate-950">{d.about.title}</h1>
        <p className="text-lg leading-8 text-slate-600">{d.about.subtitle}</p>
      </div>
      <section className="space-y-5 border-y border-slate-200 py-6">
        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold text-slate-950">easymsa</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            {d.about.project}
          </p>
        </div>
        <div className="space-y-3">
          <p className="text-sm leading-7 text-slate-600">{d.about.version}</p>
          <p className="text-sm leading-7 text-slate-600">{d.about.citation}</p>
          <p className="text-sm leading-7 text-slate-600">{d.about.contact}</p>
        </div>
        <ExternalButtonLink
          href="https://github.com/malabz/easymsa"
          rel="noreferrer"
          target="_blank"
        >
          <Github className="h-4 w-4" />
          {d.about.repository}
        </ExternalButtonLink>
      </section>
    </PageContainer>
  );
}
