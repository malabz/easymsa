import { CheckCircle2, CircleDot, Eye } from "lucide-react";
import { useLanguage } from "../../lib/i18n/useLanguage";

const icons = [CircleDot, CheckCircle2, Eye];

export function WorkflowSection() {
  const { dictionary: d } = useLanguage();

  return (
    <section className="py-7">
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 className="text-2xl font-semibold text-slate-950">
          {d.home.workflowTitle}
        </h2>
      </div>
      <div className="grid gap-5 border-y border-slate-200 py-5 md:grid-cols-3">
        {d.home.workflow.map((item, index) => {
          const Icon = icons[index];
          return (
            <div
              className="flex gap-4"
              key={item.title}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-teal-100 bg-teal-50 text-teal-800">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-950">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {item.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
