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
      <div className="divide-y divide-slate-200 border-y border-slate-200">
        {d.docs.sections.map((section, index) => (
          <section className="grid gap-4 py-5 md:grid-cols-[3rem_1fr]" key={section.title}>
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-teal-50 text-sm font-semibold text-teal-800">
              {index + 1}
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                {section.title}
              </h2>
              <p className="text-sm leading-7 text-slate-600">{section.body}</p>
            </div>
          </section>
        ))}
      </div>
    </PageContainer>
  );
}
