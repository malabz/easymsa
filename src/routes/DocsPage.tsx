import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "../components/common/Card";
import { PageContainer } from "../components/layout/PageContainer";
import { useLanguage } from "../lib/i18n/useLanguage";

export function DocsPage() {
  const { dictionary: d } = useLanguage();

  return (
    <PageContainer className="space-y-8">
      <div className="max-w-3xl space-y-3">
        <h1 className="text-4xl font-semibold text-slate-950">{d.docs.title}</h1>
        <p className="text-lg leading-8 text-slate-600">{d.docs.subtitle}</p>
      </div>
      <div className="grid gap-4">
        {d.docs.sections.map((section, index) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-50 text-sm font-semibold text-cyan-800">
                  {index + 1}
                </span>
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-7 text-slate-600">{section.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
