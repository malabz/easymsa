import {
  BarChart3,
  ChartNoAxesCombined,
  CircleHelp,
  FileCode2,
  KeyRound,
  List,
  Rocket,
  Rows3,
  Search,
  SlidersHorizontal,
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
import { Link, useSearchParams } from "react-router-dom";
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
import { flushSync } from "react-dom";

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
      <ol className="space-y-0.5">
        {sections.map((section, index) => {
          const active = activeSection === section.id;
          return (
            <li key={section.id}>
              <button
                aria-current={active ? "location" : undefined}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition",
                  active
                    ? "border-l-[3px] border-teal-700 bg-teal-50 font-semibold text-teal-900"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                )}
                onClick={() => onNavigate(section.id)}
                type="button"
              >
                <span className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-semibold",
                  active ? "bg-teal-100 text-teal-800" : "bg-slate-100 text-slate-500 group-hover:bg-white"
                )}>
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate">{section.title}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
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
  const sectionParamRef = useRef<string | null>(requestedSection);
  const internalParamUpdateRef = useRef(false);
  const results = useMemo(() => searchDocs(sections, query), [query, sections]);
  const normalizedQuery = query.trim();

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
    flushSync(() => setActiveSection(sectionId));
    const target = document.getElementById(
      articleId ? `docs-article-${articleId}` : `docs-section-${sectionId}`
    );
    if (target instanceof HTMLDetailsElement) {
      target.open = true;
    }
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
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
    setActiveSection(requestedSection);
    document.getElementById(`docs-section-${requestedSection}`)?.scrollIntoView({
      behavior: "auto",
      block: "start"
    });
  }, [requestedSection]);

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
    <PageContainer className="space-y-5 pt-5 lg:pt-6">
      <section className="border-b border-slate-200 pb-5">
        <div className="grid items-center gap-4 lg:grid-cols-[minmax(15rem,0.85fr)_minmax(22rem,1.15fr)]">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{d.docs.title}</h1>
            <p className="mt-1 max-w-xl text-sm leading-6 text-slate-600">{d.docs.subtitle}</p>
            <nav aria-label={d.docs.quickActionsTitle} className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-teal-800">
              <Link className="hover:underline" to="/submit">{d.docs.quickActions.submit.title}</Link>
              <Link className="hover:underline" to="/viewer">{d.docs.quickActions.viewer.title}</Link>
              <Link className="hover:underline" to="/lookup">{d.docs.quickActions.lookup.title}</Link>
            </nav>
          </div>
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              aria-controls={normalizedQuery ? "docs-search-results" : undefined}
              aria-label={d.docs.searchLabel}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white py-2 pl-12 pr-24 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
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
        </div>
      </section>

      {normalizedQuery ? (
        <section
          aria-label={d.docs.searchResultsTitle}
          className="border-b border-slate-200 pb-5"
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
            <ul className="mt-3 divide-y divide-slate-200 border-t border-slate-200">
              {results.map((result) => (
                <li key={`${result.sectionId}:${result.articleId}`}>
                  <button
                    className="w-full px-2 py-3 text-left transition hover:bg-teal-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                    onClick={() => navigateTo(result.sectionId, result.articleId)}
                    type="button"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wide text-teal-700">{result.sectionTitle}</span>
                    <span className="mt-1 block text-sm font-semibold text-slate-950">{result.articleTitle}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-600">{result.summary}</span>
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

      <div className="grid items-start gap-7 lg:grid-cols-[13.5rem_minmax(0,1fr)]">
        <aside className="sticky top-20 hidden max-h-[calc(100vh-6rem)] overflow-y-auto border-r border-slate-200 pr-3 lg:block" data-docs-desktop-toc="true">
          <p className="mb-2 px-3 text-xs font-semibold text-slate-500">{d.docs.tocTitle}</p>
          <DocsNavigation activeSection={activeSection} label={d.docs.tocLabel} onNavigate={navigateTo} sections={sections} />
        </aside>

        <div className="min-w-0">
          {sections.map((section, index) => {
            const Icon = sectionIcons[section.id];
            const orderedArticles = section.id === "quick-start"
              ? [...section.articles].sort((left, right) => Number(right.id === "workflow") - Number(left.id === "workflow"))
              : section.articles;
            return (
              <section
                className="scroll-mt-24 space-y-4"
                data-docs-section={section.id}
                hidden={section.id !== activeSection}
                id={`docs-section-${section.id}`}
                key={section.id}
              >
                <header className="border-b border-slate-200 pb-4">
                  <p className="flex items-center gap-2 text-xs font-semibold text-teal-700">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <Icon className="h-4 w-4" />
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{section.title}</h2>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{section.summary}</p>
                </header>
                <div className="divide-y divide-slate-200">
                  {orderedArticles.map((article, articleIndex) => <DocsArticle article={article} defaultOpen={articleIndex === 0 && section.id !== "faq"} key={article.id} />)}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </PageContainer>
  );
}
