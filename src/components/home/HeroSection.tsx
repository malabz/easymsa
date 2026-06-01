import { ArrowRight, FlaskConical } from "lucide-react";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { ButtonLink } from "../common/Button";

const previewRows = [
  ["seq_001", "A T G C T A G C T A G C"],
  ["seq_002", "A T G C T A G - T A G C"],
  ["seq_003", "A T G C T A G C T A N C"],
  ["seq_004", "A T G C T A G C T - G C"]
];

function AlignmentPreview() {
  return (
    <div className="border-y border-slate-200 bg-white/60 py-4">
      <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">MSA preview</p>
          <p className="text-sm text-slate-600">12 sequences · 80 sites</p>
        </div>
        <span className="rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
          completed
        </span>
      </div>
      <div className="space-y-2 font-mono text-xs">
        {previewRows.map(([id, sequence]) => (
          <div className="grid grid-cols-[5.5rem_1fr] gap-3" key={id}>
            <span className="truncate text-slate-500">{id}</span>
            <span className="overflow-hidden whitespace-nowrap text-slate-700">
              {sequence.split(" ").map((base, index) => (
                <span
                  className="mr-1 inline-flex h-5 w-5 items-center justify-center border border-slate-200 bg-slate-50"
                  key={`${id}-${index}`}
                >
                  {base}
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HeroSection() {
  const { dictionary: d } = useLanguage();

  return (
    <section className="grid gap-10 border-b border-slate-200 pb-10 lg:grid-cols-[1fr_1fr] lg:items-center lg:pb-12">
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 border-l-2 border-teal-700 pl-3 text-sm font-medium text-teal-800">
          <FlaskConical className="h-4 w-4" />
          {d.home.visualTitle}
        </div>
        <div className="space-y-4">
          <h1 className="max-w-3xl text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl lg:text-5xl">
            {d.home.title}
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-slate-600">
            {d.home.subtitle}
          </p>
        </div>
        <p className="max-w-2xl text-base leading-7 text-slate-600">
          {d.home.intro}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink size="lg" to="/submit">
            {d.common.startAnalysis}
            <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        </div>
      </div>
      <div className="space-y-4">
        <AlignmentPreview />
        <p className="text-sm leading-6 text-slate-600">{d.home.visualCaption}</p>
      </div>
    </section>
  );
}
