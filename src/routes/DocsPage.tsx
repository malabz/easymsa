import {
  ArrowRight,
  BarChart3,
  BookOpen,
  ChartNoAxesCombined,
  CircleHelp,
  FileCode2,
  KeyRound,
  List,
  Microscope,
  Rocket,
  Rows3,
  Search,
  SlidersHorizontal,
  Upload,
  X,
  type LucideIcon
} from "lucide-react";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useSearchParams } from "react-router-dom";
import { ButtonLink } from "../components/common/Button";
import { DocsArticle } from "../components/docs/DocsArticle";
import { PageContainer } from "../components/layout/PageContainer";
import {
  DOCS_SECTION_IDS,
  docsContent,
  type DocsSection,
  type DocsSectionId
} from "../lib/docs/content";
import { searchDocs } from "../lib/docs/search";
import { useLanguage } from "../lib/i18n/useLanguage";
import { cn } from "../lib/utils/cn";

const sectionIcons: Record<DocsSectionId, LucideIcon> = {
  "quick-start": Rocket,
  "fasta-input": FileCode2,
  "submit-preprocess": SlidersHorizontal,
  "status-access": KeyRound,
  "results-downloads": ChartNoAxesCombined,
  "msa-viewer": Rows3,
  metrics: BarChart3,
  faq: CircleHelp
};

function validSection(value: string | null): value is DocsSectionId {
  return Boolean(value && DOCS_SECTION_IDS.includes(value as DocsSectionId));
}

function DocsNavigation({
  activeSection,
  label,
  onNavigate,
  sections
}: {
  activeSection: DocsSectionId;
  label: string;
  onNavigate: (sectionId: DocsSectionId) => void;
  sections: DocsSection[];
}) {
  return (
    <nav aria-label={label}>
      <ol className="space-y-1">
        {sections.map((section, index) => {
          const Icon = sectionIcons[section.id];
          const active = activeSection === section.id;
          return (
            <li key={section.id}>
              <button
                aria-current={active ? "location" : undefined}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition",
                  active
                    ? "bg-teal-50 font-semibold text-teal-900 ring-1 ring-teal-100"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                )}
                onClick={() => onNavigate(section.id)}
                type="button"
              >
                <span className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold",
                  active ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-white"
                )}>
                  {index + 1}
                </span>
                <Icon className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{section.title}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function QuickActions() {
  const { dictionary: d } = useLanguage();
  const actions = [
    { key: "submit", to: "/submit", icon: Upload, text: d.docs.quickActions.submit },
    { key: "viewer", to: "/viewer", icon: Microscope, text: d.docs.quickActions.viewer },
    { key: "lookup", to: "/lookup", icon: KeyRound, text: d.docs.quickActions.lookup }
  ] as const;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <ButtonLink
            className="h-auto min-h-16 justify-between bg-white/80 px-4 py-3 text-left"
            key={action.key}
            to={action.to}
            variant="outline"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-slate-900">{action.text.title}</span>
                <span className="mt-0.5 block text-xs font-normal leading-5 text-slate-500">{action.text.description}</span>
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </ButtonLink>
        );
      })}
    </div>
  );
}

export function DocsPage() {
  const { dictionary: d, locale } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const sections = docsContent[locale];
  const requestedSection = searchParams.get("section");
  const initialSection = validSection(requestedSection) ? requestedSection : DOCS_SECTION_IDS[0];
  const [activeSection, setActiveSection] = useState<DocsSectionId>(initialSection);
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileTocRef = useRef<HTMLDetailsElement>(null);
  const activeSectionRef = useRef(activeSection);
  const sectionParamRef = useRef<string | null>(requestedSection);
  const internalParamUpdateRef = useRef(false);
  const results = useMemo(() => searchDocs(sections, query), [query, sections]);
  const normalizedQuery = query.trim();

  useEffect(() => {
    activeSectionRef.current = activeSection;
  }, [activeSection]);

  const syncSectionParam = useCallback((sectionId: DocsSectionId, replace: boolean) => {
    if (sectionParamRef.current === sectionId) return;
    internalParamUpdateRef.current = true;
    sectionParamRef.current = sectionId;
    setSearchParams({ section: sectionId }, { replace });
  }, [setSearchParams]);

  const navigateTo = useCallback((
    sectionId: DocsSectionId,
    articleId?: string,
    replace = false
  ) => {
    const target = document.getElementById(
      articleId ? `docs-article-${articleId}` : `docs-section-${sectionId}`
    );
    if (target instanceof HTMLDetailsElement) {
      target.open = true;
    }
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    activeSectionRef.current = sectionId;
    setActiveSection(sectionId);
    syncSectionParam(sectionId, replace);
    mobileTocRef.current?.removeAttribute("open");
  }, [syncSectionParam]);

  useEffect(() => {
    sectionParamRef.current = requestedSection;
    if (internalParamUpdateRef.current) {
      internalParamUpdateRef.current = false;
      return;
    }
    if (!validSection(requestedSection)) return;
    activeSectionRef.current = requestedSection;
    setActiveSection(requestedSection);
    document.getElementById(`docs-section-${requestedSection}`)?.scrollIntoView({
      behavior: "auto",
      block: "start"
    });
  }, [requestedSection]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) =>
            Math.abs(left.boundingClientRect.top) - Math.abs(right.boundingClientRect.top)
          )[0];
        const sectionId = visible?.target.getAttribute("data-docs-section") as DocsSectionId | null;
        if (!sectionId || activeSectionRef.current === sectionId) return;
        activeSectionRef.current = sectionId;
        setActiveSection(sectionId);
        syncSectionParam(sectionId, true);
      },
      { rootMargin: "-96px 0px -62% 0px", threshold: [0, 0.15, 0.5] }
    );
    sections.forEach((section) => {
      const element = document.getElementById(`docs-section-${section.id}`);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [sections, syncSectionParam]);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  function handleSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape" && query) {
      setQuery("");
      event.currentTarget.focus();
    }
  }

  return (
    <PageContainer className="space-y-7">
      <section className="overflow-hidden rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-cyan-50 p-6 shadow-sm sm:p-8 lg:p-10">
        <div className="max-w-4xl">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-800">
            <BookOpen className="h-4 w-4" />
            {d.docs.eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">{d.docs.title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">{d.docs.subtitle}</p>

          <div className="relative mt-7 max-w-3xl">
            <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              aria-controls={normalizedQuery ? "docs-search-results" : undefined}
              aria-label={d.docs.searchLabel}
              className="h-12 w-full rounded-xl border border-slate-300 bg-white/90 py-3 pl-12 pr-24 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={d.docs.searchPlaceholder}
              ref={searchInputRef}
              type="search"
              value={query}
            />
            {query ? (
              <button
                aria-label={d.docs.clearSearch}
                className="absolute right-14 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                onClick={() => {
                  setQuery("");
                  searchInputRef.current?.focus();
                }}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-500 sm:block">
              Ctrl K
            </kbd>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">{d.docs.searchHint}</p>
        </div>

        <div className="mt-7 border-t border-teal-100 pt-6">
          <p className="mb-3 text-sm font-semibold text-slate-800">{d.docs.quickActionsTitle}</p>
          <QuickActions />
        </div>
      </section>

      {normalizedQuery ? (
        <section
          aria-label={d.docs.searchResultsTitle}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          data-docs-search-results="true"
          id="docs-search-results"
        >
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-950">{d.docs.searchResultsTitle}</h2>
            <span aria-live="polite" className="text-xs font-medium text-slate-500">
              {d.docs.searchResultsCount.replace("{count}", results.length.toLocaleString())}
            </span>
          </div>
          {results.length ? (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {results.map((result) => (
                <li key={`${result.sectionId}:${result.articleId}`}>
                  <button
                    className="h-full w-full rounded-xl border border-slate-200 p-4 text-left transition hover:border-teal-300 hover:bg-teal-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                    onClick={() => navigateTo(result.sectionId, result.articleId)}
                    type="button"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wide text-teal-700">{result.sectionTitle}</span>
                    <span className="mt-1 block text-sm font-semibold text-slate-950">{result.articleTitle}</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-600">{result.summary}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
              <CircleHelp className="mx-auto h-6 w-6 text-slate-400" />
              <p className="mt-2 text-sm font-medium text-slate-700">{d.docs.noSearchResults}</p>
              <p className="mt-1 text-xs text-slate-500">{d.docs.noSearchResultsHint}</p>
            </div>
          )}
        </section>
      ) : null}

      <details
        className="rounded-xl border border-slate-200 bg-white lg:hidden"
        data-docs-mobile-toc="true"
        ref={mobileTocRef}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-900">
          <span className="flex items-center gap-2">
            <List className="h-4 w-4 text-teal-700" />
            {d.docs.mobileToc}
          </span>
          <span className="text-xs font-normal text-slate-500">
            {sections.find((section) => section.id === activeSection)?.title}
          </span>
        </summary>
        <div className="border-t border-slate-200 p-3">
          <DocsNavigation activeSection={activeSection} label={d.docs.tocLabel} onNavigate={navigateTo} sections={sections} />
        </div>
      </details>

      <div className="grid items-start gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="sticky top-24 hidden max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 lg:block" data-docs-desktop-toc="true">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{d.docs.tocTitle}</p>
          <DocsNavigation activeSection={activeSection} label={d.docs.tocLabel} onNavigate={navigateTo} sections={sections} />
        </aside>

        <div className="min-w-0 space-y-12">
          {sections.map((section, index) => {
            const Icon = sectionIcons[section.id];
            return (
              <section
                className="scroll-mt-24 space-y-5"
                data-docs-section={section.id}
                id={`docs-section-${section.id}`}
                key={section.id}
              >
                <header className="border-b border-slate-200 pb-4">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-teal-700">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <Icon className="h-4 w-4" />
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{section.title}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{section.summary}</p>
                </header>
                <div className="space-y-4">
                  {section.articles.map((article) => <DocsArticle article={article} key={article.id} />)}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </PageContainer>
  );
}
