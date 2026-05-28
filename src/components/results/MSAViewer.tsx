import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "../common/EmptyState";
import { useLanguage } from "../../lib/i18n/useLanguage";
import type { MSAResult } from "../../lib/types/msa";
import { cn } from "../../lib/utils/cn";
import { baseClass, MSAColorLegend } from "./MSAColorLegend";

function SequenceCells({ sequence }: { sequence: string }) {
  return (
    <div className="flex min-w-max gap-0.5">
      {sequence.split("").map((base, index) => (
        <span
          className={cn(
            "inline-flex h-6 w-5 shrink-0 items-center justify-center rounded border font-mono text-[11px] font-semibold",
            baseClass(base)
          )}
          key={`${base}-${index}`}
        >
          {base}
        </span>
      ))}
    </div>
  );
}

export function MSAViewer({ alignment }: { alignment: MSAResult }) {
  const { dictionary: d } = useLanguage();
  const [search, setSearch] = useState("");

  const filteredSequences = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return alignment.sequences;
    }

    return alignment.sequences.filter((sequence) =>
      sequence.id.toLowerCase().includes(query)
    );
  }, [alignment.sequences, search]);

  const countText = d.results.viewer.sequenceCount
    .replace("{shown}", filteredSequences.length.toLocaleString())
    .replace("{total}", alignment.sequences.length.toLocaleString());

  const lengthText = d.results.viewer.alignmentLength.replace(
    "{length}",
    alignment.alignmentLength.toLocaleString()
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border-y border-slate-200 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            aria-label={d.results.viewer.search}
            className="h-10 w-full rounded-md border border-slate-300 bg-white/80 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            onChange={(event) => setSearch(event.target.value)}
            placeholder={d.results.viewer.searchPlaceholder}
            value={search}
          />
        </div>
        <div className="flex flex-wrap gap-2 text-sm text-slate-600">
          <span className="rounded-md bg-white/70 px-3 py-2">{countText}</span>
          <span className="rounded-md bg-white/70 px-3 py-2">{lengthText}</span>
        </div>
      </div>

      {filteredSequences.length === 0 ? (
        <EmptyState message={d.results.viewer.noMatches} />
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white/75 shadow-none">
          <div className="max-h-[34rem] overflow-auto rounded-lg">
            <div className="min-w-max">
              {filteredSequences.map((sequence) => (
                <div
                  className="grid grid-cols-[12rem_1fr] border-b border-slate-100 last:border-b-0"
                  key={sequence.id}
                >
                  <div className="sticky left-0 z-10 flex h-9 items-center border-r border-slate-200 bg-white px-3 font-mono text-xs font-medium text-slate-700">
                    <span className="truncate">{sequence.id}</span>
                  </div>
                  <div className="flex h-9 items-center px-3">
                    <SequenceCells sequence={sequence.sequence} />
                  </div>
                </div>
              ))}
              <div className="grid grid-cols-[12rem_1fr] border-t border-slate-300 bg-teal-50/70">
                <div className="sticky left-0 z-10 flex h-10 items-center border-r border-slate-200 bg-teal-50 px-3 font-mono text-xs font-semibold text-teal-900">
                  {d.results.viewer.consensus}
                </div>
                <div className="flex h-10 items-center px-3">
                  <SequenceCells sequence={alignment.consensus} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <MSAColorLegend />
    </div>
  );
}
