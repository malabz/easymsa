import { ArrowRight, FlaskConical, PlayCircle } from "lucide-react";
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
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <p className="text-xs font-semibold uppercase text-cyan-700">MSA preview</p>
          <p className="text-sm text-slate-600">12 sequences · 80 sites</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          completed
        </span>
      </div>
      <div className="space-y-2 font-mono text-xs">
        {previewRows.map(([id, sequence]) => (
          <div className="grid grid-cols-[5.5rem_1fr] gap-3" key={id}>
            <span className="truncate text-slate-500">{id}</span>
            <span className="overflow-hidden whitespace-nowrap text-slate-800">
              {sequence.split(" ").map((base, index) => (
                <span
                  className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded bg-slate-100"
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
    <section className="grid gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-14">
      <div className="space-y-7">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-sm font-medium text-cyan-800">
          <FlaskConical className="h-4 w-4" />
          {d.home.visualTitle}
        </div>
        <div className="space-y-4">
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
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
          <ButtonLink size="lg" to="/results/demo-job" variant="outline">
            <PlayCircle className="h-4 w-4" />
            {d.common.tryDemo}
          </ButtonLink>
        </div>
        <p className="max-w-2xl rounded-md border border-slate-200 bg-white/75 px-4 py-3 text-sm leading-6 text-slate-600">
          {d.home.demoNotice}
        </p>
      </div>
      <div className="space-y-4">
        <AlignmentPreview />
        <p className="text-sm leading-6 text-slate-600">{d.home.visualCaption}</p>
      </div>
    </section>
  );
}
