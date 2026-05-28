import { Github } from "lucide-react";
import { ExternalButtonLink } from "../components/common/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../components/common/Card";
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
      <Card>
        <CardHeader>
          <CardTitle>easymsa</CardTitle>
          <CardDescription>{d.about.project}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-7 text-slate-600">{d.about.version}</p>
          <p className="text-sm leading-7 text-slate-600">{d.about.citation}</p>
          <p className="text-sm leading-7 text-slate-600">{d.about.contact}</p>
          <ExternalButtonLink
            href="https://github.com/malabz/easymsa"
            rel="noreferrer"
            target="_blank"
          >
            <Github className="h-4 w-4" />
            {d.about.repository}
          </ExternalButtonLink>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
