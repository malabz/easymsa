import { Database, FileUp, TextCursorInput } from "lucide-react";
import { useLanguage } from "../../lib/i18n/useLanguage";

const icons = [TextCursorInput, FileUp, Database];

export function FeatureCards() {
  const { dictionary: d } = useLanguage();

  return (
    <section className="py-8">
      <h2 className="mb-6 text-2xl font-semibold text-slate-950">
        {d.home.featuresTitle}
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        {d.home.features.map((feature, index) => {
          const Icon = icons[index];
          return (
            <div
              className="rounded-lg border border-slate-200 bg-white p-6 shadow-soft"
              key={feature.title}
            >
              <Icon className="mb-5 h-6 w-6 text-cyan-700" />
              <h3 className="text-lg font-semibold text-slate-950">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {feature.text}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
