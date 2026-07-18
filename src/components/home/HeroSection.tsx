import { ArrowRight, Dna, FlaskConical, Search } from "lucide-react";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { ButtonLink } from "../common/Button";
import { ServiceStatus } from "../common/ServiceStatus";

const previewRows = [
  ["seq_001", "A T G C T A G C T A G C"],
  ["seq_002", "A T G C T A G - T A G C"],
  ["seq_003", "A T G C T A G C T A N C"],
  ["seq_004", "A T G C T A G C T - G C"]
];

function AlignmentPreview() {
  const { dictionary: d } = useLanguage();

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
      <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-teal-100/60 blur-3xl" />
      <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">MSA preview</p>
          <p className="text-sm text-slate-600">12 sequences · 80 sites</p>
        </div>
        <span className="rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
          {d.job.statusLabels.completed}
        </span>
      </div>
      <div className="overflow-hidden space-y-2 font-mono text-xs">
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
    <section className="relative grid gap-10 overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white via-white to-teal-50/70 px-6 py-10 shadow-sm sm:px-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:px-12 lg:py-14">
      <Dna className="pointer-events-none absolute -left-10 -top-16 h-56 w-56 rotate-12 text-teal-100/50" strokeWidth={0.8} />
      <div className="relative space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-sm font-semibold text-teal-800">
          <FlaskConical className="h-4 w-4" />
          {d.home.eyebrow}
        </div>
        <div className="space-y-4">
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-[3.4rem]">
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
          <ButtonLink size="lg" to="/lookup" variant="outline">
            <Search className="h-4 w-4" />
            {d.home.restoreJob}
          </ButtonLink>
        </div>
        <ServiceStatus compact />
      </div>
      <div className="relative space-y-4">
        <AlignmentPreview />
        <p className="px-2 text-sm leading-6 text-slate-600">{d.home.visualCaption}</p>
      </div>
    </section>
  );
}
