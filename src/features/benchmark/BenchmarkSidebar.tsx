import { datasetName } from "./names";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, Search } from "lucide-react";
import type { BenchmarkDataset } from "./model";
import { datasetGroup, orderedDatasets } from "./BenchmarkMatrix";
import { words, type Locale } from "./presentation";

export type BenchmarkSidebarProps = {
  datasets: BenchmarkDataset[];
  params: URLSearchParams;
  locale: Locale;
  selectedId?: string;
  onSearch?: (value: string) => void;
  catalogCount?: number;
  methodCount?: number;
};

const desktopQuery = "(min-width: 1024px)";
const chartParameters = ["returnTo", "chart", "x", "y", "scale", "zoom", "method", "sp", "timeScale", "memoryScale", "plotZoom"];
const dnaGroups: [number, string, string][] = [
  [0, "16S", "16S"],
  [1, "Mitochondrial", "线粒体"],
  [2, "Mitochondrial simulation", "线粒体模拟"],
];

function href(path: string, params: URLSearchParams) {
  return path + (params.size ? `?${params.toString()}` : "");
}

/** The caller owns dataset filtering; navigation never broadens that selection. */
export function BenchmarkSidebar({ datasets, params, locale, selectedId, onSearch }: BenchmarkSidebarProps) {
  const [, setSearchParams] = useSearchParams();
  const [desktop, setDesktop] = useState(() => typeof window.matchMedia === "function" && window.matchMedia(desktopQuery).matches);
  const [expanded, setExpanded] = useState(false);
  const sidebar = useRef<HTMLElement>(null);
  useEffect(() => {
    const header = document.querySelector(".app-header");
    if (!header || typeof ResizeObserver === "undefined") return;
    const update = () => sidebar.current?.style.setProperty("--studio-header-height",`${header.getBoundingClientRect().height}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(desktopQuery);
    const update = () => setDesktop(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const ordered = orderedDatasets(datasets);
  const dna = ordered.filter(dataset => dataset.sequence_type === "dna");
  const rna = ordered.filter(dataset => dataset.sequence_type === "rna");
  const selectedType = datasets.find(dataset => dataset.id === selectedId)?.sequence_type;
  const detailParams = new URLSearchParams(params);
  detailParams.delete("returnTo");
  const overviewParams = new URLSearchParams(params);
  chartParameters.forEach(key => overviewParams.delete(key));
  const search = (value: string) => {
    if (onSearch) { onSearch(value); return; }
    const next = new URLSearchParams(params);
    if (value) next.set("search", value); else next.delete("search");
    setSearchParams(next, {replace:true});
  };
  const links = (items: BenchmarkDataset[]) => <ul className="benchmark-studio-dataset-list">{items.map(dataset => {
    const title = datasetName(dataset, locale, true);
    return <li key={dataset.id}><Link
      to={href(`/benchmark/datasets/${encodeURIComponent(dataset.id)}`, detailParams)}
      data-testid="dataset-nav-link" data-dataset-id={dataset.id}
      className={`benchmark-studio-dataset-link${selectedId === dataset.id ? " is-active" : ""}`}
      aria-current={selectedId === dataset.id ? "page" : undefined}
      aria-label={datasetName(dataset,locale)}
      onClick={() => setExpanded(false)}>
      <span className="benchmark-studio-dataset-title">{title}</span>
    </Link></li>;
  })}</ul>;

  return <aside ref={sidebar} className="benchmark-studio-sidebar" data-testid="dataset-sidebar" aria-label={words(locale,"Dataset navigation","数据集导航")}>
    <details className="benchmark-studio-sidebar-menu" open={desktop || expanded} onToggle={event => { if (!desktop) setExpanded(event.currentTarget.open); }}>
      <summary className="benchmark-studio-sidebar-toggle">{words(locale,"Datasets","数据集")}<span>{datasets.length}</span><ChevronDown size={18} aria-hidden="true"/></summary>
      <div className="benchmark-studio-sidebar-content">
        <div className="benchmark-studio-sidebar-heading"><h2>{words(locale,"Datasets","数据集")}</h2><Link className="benchmark-studio-overview-link" to={href("/benchmark",overviewParams)} aria-current={!selectedId ? "page" : undefined} onClick={() => setExpanded(false)}><ArrowLeft size={14} aria-hidden="true"/>{words(locale,"All datasets","全部数据集")}</Link></div>
        <label className="benchmark-studio-sidebar-search"><span className="sr-only">{words(locale,"Search datasets","搜索数据集")}</span><Search size={16} aria-hidden="true"/><input type="search" value={params.get("search") ?? ""} onChange={event => search(event.target.value)} placeholder={words(locale,"Search datasets…","搜索数据集…")}/></label>
        <nav aria-label={words(locale,"Choose a dataset","选择数据集")}>
          {dna.length > 0 && <details className="benchmark-studio-sequence-group" open={!selectedId || selectedType === "dna"}><summary><ChevronDown size={16} aria-hidden="true"/><strong>DNA</strong><span>{words(locale,`${dna.length} datasets`,`${dna.length} 个数据集`)}</span></summary>{dnaGroups.map(([group,en,zh]) => {
            const items = dna.filter(dataset => datasetGroup(dataset) === group);
            return items.length > 0 && <section key={group} className="benchmark-studio-source-group"><h3>{words(locale,en,zh)}</h3>{links(items)}</section>;
          })}</details>}
          {rna.length > 0 && <details className="benchmark-studio-sequence-group" open={!selectedId || selectedType === "rna"}><summary><ChevronDown size={16} aria-hidden="true"/><strong>RNA</strong><span>{words(locale,`${rna.length} datasets`,`${rna.length} 个数据集`)}</span></summary>{links(rna)}</details>}
          {datasets.length === 0 && <p className="benchmark-studio-sidebar-empty" role="status">{words(locale,"No datasets match the current filters.","没有符合当前筛选的数据集。")}</p>}
        </nav>
      </div>
    </details>
  </aside>;
}
