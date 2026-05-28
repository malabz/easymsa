import { useLanguage } from "../../lib/i18n/useLanguage";

export function Footer() {
  const { dictionary: d } = useLanguage();

  return (
    <footer className="border-t border-slate-200/80 bg-white/55">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-slate-600 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <p className="font-medium text-slate-700">{d.footer.tagline}</p>
        <p>{d.footer.note}</p>
      </div>
    </footer>
  );
}
