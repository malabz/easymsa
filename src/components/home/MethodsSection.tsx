import { ArrowRight, ArrowUpRight, Download, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { useCallback, useState, type CSSProperties } from "react";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { homeBenefitsContent } from "../../lib/homeContent";
import { ServiceStatus } from "../common/ServiceStatus";
import { HomeAlignmentCanvas } from "./HomeAlignmentCanvas";
import { HomeDemoFallback } from "./HomeDemoFallback";
import { useHomeDemo } from "./HomeDemoProvider";
import { homeColumnSummary } from "./homeDemoData";
import { AutoMethodDemo } from "./AutoMethodDemo";

export function MethodsSection() {
  const { locale } = useLanguage();
  const copy = homeBenefitsContent[locale];
  const { data } = useHomeDemo();
  const [start, setStart] = useState(0);
  const [visibleColumns, setVisibleColumns] = useState(60);
  const [selected, setSelected] = useState<number | null>(39);
  const updateWindow = useCallback((columns: number) => {
    setVisibleColumns(columns);
    setStart(current => Math.min(current, Math.max(0, (data?.length ?? columns) - columns)));
  }, [data?.length]);
  const column = data && selected != null ? homeColumnSummary(data, selected) : null;
  return <>
    <AutoMethodDemo />
    <section className="home-section home-explore" aria-labelledby="home-explore-title">
      <div className="home-explore-heading">
        <div className="home-benefit-heading"><h2 id="home-explore-title">{copy.exploreTitle}</h2><p>{copy.exploreIntro}</p></div>
        <Link className="home-text-link" to="/examples/alignment-small?tab=alignment">{copy.openExample}<ArrowUpRight size={16} aria-hidden="true" /></Link>
      </div>
      <div className="home-public-preview">
        {data ? <>
          <div className="home-preview-meta"><span>{copy.exampleLabel}</span><span>{data.aligned.length} {copy.sequences} · {data.length} {copy.columns}</span></div>
          <div className="home-preview-overview">
            <label htmlFor="home-overview-scroll">{copy.overview}</label>
            <div>
              <HomeAlignmentCanvas data={data} kind="overview" label={copy.overviewLabel} />
              <input id="home-overview-scroll" type="range" min="0" max={Math.max(0, data.length - visibleColumns)} step="1" value={start}
                style={{ "--home-viewport-width": `${Math.max(6, visibleColumns / data.length * 100)}%` } as CSSProperties}
                aria-label={copy.pan} aria-valuetext={`${start + 1}–${Math.min(data.length, start + visibleColumns)}`}
                onChange={event => { setStart(Number(event.target.value)); setSelected(null); }} />
            </div>
          </div>
          <HomeAlignmentCanvas data={data} kind="preview" start={start} visibleColumns={visibleColumns} selected={selected}
            label={copy.previewLabel} onColumn={setSelected} onWindow={updateWindow} />
          <div className="home-preview-status">
            <label htmlFor="home-selected-column">{copy.position}<input id="home-selected-column" type="number" min="1" max={data.length} value={selected == null ? "" : selected + 1}
              placeholder="—" onChange={event => {
                if (!event.target.value) { setSelected(null); return; }
                const next = Math.min(data.length - 1, Math.max(0, Number(event.target.value) - 1));
                setSelected(next);
                if (next < start || next >= start + visibleColumns) setStart(Math.min(Math.max(0, next - Math.floor(visibleColumns / 2)), data.length - visibleColumns));
              }} /></label>
            <output aria-live="polite">{column ? `${copy.conservation} ${column.conservation == null ? "—" : (column.conservation * 100).toFixed(1) + "%"} · ${copy.gap} ${(column.gap * 100).toFixed(1)}%` : copy.dragHint}</output>
            <span>{start + 1}–{Math.min(data.length, start + visibleColumns)} / {data.length}</span>
          </div>
        </> : <HomeDemoFallback />}
      </div>
      <p className="home-interaction-hint">{copy.interactionHint}</p>
      <div className="home-benefits-actions">
        <Link to="/submit" className="home-benefits-primary">{copy.start}<ArrowRight size={18} aria-hidden="true" /></Link>
        <a href={`${import.meta.env.BASE_URL}examples/v1/alignment-small/input.fasta`} download="easymsa-example.fasta">{copy.downloadInput}<Download size={16} aria-hidden="true" /></a>
        <Link to="/lookup">{copy.recover}<RotateCcw size={16} aria-hidden="true" /></Link>
      </div>
      <div className="home-service"><ServiceStatus compact /></div>
    </section>
  </>;
}
