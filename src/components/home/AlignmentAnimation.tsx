import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Locale } from "../../lib/i18n/dictionary";

// Illustrative alignment: each row keeps its nucleotide identity as gaps open.
const rows = [
  "ACGTAC-GTACG--TACG",
  "AC-TACGGTACG--TACG",
  "ACGTACGGT-CG--TACG",
  "ACGTAC-GTACGGGTACG",
  "ACGTACGGTACG--TACG",
];
const offsets = [1, 2, -1, 0, 1.5];

export function AlignmentAnimation({ locale }: { locale: Locale }) {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);
  const zh = locale === "zh";

  useEffect(() => {
    let inView = true;
    const update = () => setActive(inView && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      update();
    });
    if (root.current) observer.observe(root.current);
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return (
    <div className="alignment-animation" ref={root} data-paused={!active}>
      <div className="alignment-animation-caption">
        <span>{zh ? "从序列，到对齐。" : "Sequences, brought into alignment."}</span>
      </div>
      <div className="alignment-animation-matrix" role="img" aria-label={zh ? "五行核酸序列逐步对齐，显示共同位置和缺口" : "Five nucleotide sequences align into shared columns with gaps"}>
        {rows.map((row, rowIndex) => {
          let gaps = 0;
          return <div className="alignment-animation-row" key={rowIndex} aria-hidden="true" style={{ "--row-delay": `${rowIndex * 0.18}s` } as CSSProperties}>
            {Array.from(row).map((base, column) => {
              const from = offsets[rowIndex] - gaps;
              if (base === "-") gaps += 1;
              return <span key={column} data-base={base} className={`alignment-base${base === "-" ? " alignment-gap" : ""}${column === 8 ? " alignment-anchor" : ""}`} style={{ "--from": from } as CSSProperties}>{base === "-" ? "−" : base}</span>;
            })}
          </div>;
        })}
      </div>
      <div className="alignment-animation-rule" aria-hidden="true"><span>DNA / RNA</span><span>MULTIPLE SEQUENCE ALIGNMENT</span></div>
    </div>
  );
}
