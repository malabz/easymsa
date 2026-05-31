import { ArrowRight, Download } from "lucide-react";
import { ButtonLink, ExternalButtonLink } from "../components/common/Button";
import { PageContainer } from "../components/layout/PageContainer";
import { resultsRoute } from "../lib/api/tokens";
import { useLanguage } from "../lib/i18n/useLanguage";
import { assetUrl } from "../lib/utils/format";

export function ExamplesPage() {
  const { dictionary: d } = useLanguage();

  return (
    <PageContainer className="space-y-8">
      <div className="max-w-3xl space-y-3">
        <h1 className="text-4xl font-semibold text-slate-950">{d.examples.title}</h1>
        <p className="text-lg leading-8 text-slate-600">{d.examples.subtitle}</p>
      </div>
      <section className="space-y-5 border-y border-slate-200 py-6">
        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold text-slate-950">
            {d.examples.title}
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            {d.examples.description}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <ExternalButtonLink href={assetUrl("demo/input_sequences.fasta")}>
            <Download className="h-4 w-4" />
            {d.examples.inputDownload}
          </ExternalButtonLink>
          <ExternalButtonLink href={assetUrl("demo/alignment.fasta")}>
            <Download className="h-4 w-4" />
            {d.examples.resultDownload}
          </ExternalButtonLink>
          <ButtonLink to={resultsRoute("demo-job", "demo-token")}>
            {d.common.tryDemo}
            <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        </div>
      </section>
    </PageContainer>
  );
}
