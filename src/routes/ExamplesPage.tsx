import { ArrowRight, Download } from "lucide-react";
import { ButtonLink, ExternalButtonLink } from "../components/common/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../components/common/Card";
import { PageContainer } from "../components/layout/PageContainer";
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
      <Card>
        <CardHeader>
          <CardTitle>{d.examples.title}</CardTitle>
          <CardDescription>{d.examples.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ExternalButtonLink href={assetUrl("demo/input_sequences.fasta")}>
              <Download className="h-4 w-4" />
              {d.examples.inputDownload}
            </ExternalButtonLink>
            <ExternalButtonLink href={assetUrl("demo/alignment.fasta")}>
              <Download className="h-4 w-4" />
              {d.examples.resultDownload}
            </ExternalButtonLink>
            <ButtonLink to="/results/demo-job">
              {d.common.tryDemo}
              <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
