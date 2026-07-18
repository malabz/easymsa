import { FileText, Upload } from "lucide-react";
import { type ChangeEvent, useMemo, useRef, useState } from "react";
import { Button } from "../components/common/Button";
import { PageContainer } from "../components/layout/PageContainer";
import { MSAViewer } from "../components/results/MSAViewer";
import { useLanguage } from "../lib/i18n/useLanguage";
import type { MSAResult, MSASequence } from "../lib/types/msa";
import {
  estimateFastaSequenceCount,
  MAX_FASTA_CHARACTERS,
  parseFasta
} from "../lib/utils/fasta";

function consensusFromSequences(sequences: MSASequence[], length: number) {
  const consensus: string[] = [];

  for (let index = 0; index < length; index += 1) {
    const counts = new Map<string, number>();

    for (const sequence of sequences) {
      const base = sequence.sequence[index];
      if (!base) {
        continue;
      }
      counts.set(base, (counts.get(base) ?? 0) + 1);
    }

    consensus.push(
      Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ""
    );
  }

  return consensus.join("");
}

function toViewerResult(name: string, sequences: MSASequence[]): MSAResult {
  const alignmentLength = Math.max(
    0,
    ...sequences.map((sequence) => sequence.sequence.length)
  );

  return {
    jobId: name,
    truncated: false,
    sequences,
    consensus: consensusFromSequences(sequences, alignmentLength),
    alignmentLength,
    sequenceCount: sequences.length
  };
}

export function ViewerPage() {
  const { dictionary: d } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pastedFasta, setPastedFasta] = useState("");
  const [sourceName, setSourceName] = useState(d.viewerPage.uploadedSource);
  const [alignment, setAlignment] = useState<MSAResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pastedCharacterCount = pastedFasta.length;
  const pastedSequenceCount = useMemo(
    () => estimateFastaSequenceCount(pastedFasta),
    [pastedFasta]
  );
  const pastedTooLarge = pastedCharacterCount > MAX_FASTA_CHARACTERS;
  const pasteStatsText = d.viewerPage.pasteStats
    .replace("{chars}", pastedCharacterCount.toLocaleString())
    .replace("{count}", pastedSequenceCount.toLocaleString());

  const sequenceLengths = useMemo(
    () => alignment?.sequences.map((sequence) => sequence.sequence.length) ?? [],
    [alignment]
  );
  const isLengthConsistent =
    sequenceLengths.length > 0 &&
    new Set(sequenceLengths).size === 1;

  function loadFasta(input: string, name: string) {
    const parsed = parseFasta(input, 1);

    if (!parsed.valid) {
      setError(parsed.errors.join(" "));
      setAlignment(null);
      return;
    }

    const sequences = parsed.records.map((record) => ({
      id: record.id,
      sequence: record.sequence
    }));

    setSourceName(name);
    setAlignment(toViewerResult(name, sequences));
    setError(null);
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (file.size > MAX_FASTA_CHARACTERS) {
      setError(
        d.viewerPage.fileTooLarge.replace(
          "{limit}",
          MAX_FASTA_CHARACTERS.toLocaleString()
        )
      );
      setAlignment(null);
      return;
    }

    try {
      loadFasta(await file.text(), file.name);
    } catch {
      setError(d.viewerPage.readError);
      setAlignment(null);
    }
  }

  function handlePasteLoad() {
    loadFasta(pastedFasta, d.viewerPage.pastedSource);
  }

  function resetViewer() {
    setAlignment(null);
    setError(null);
  }

  const inputPanel = (
    <section className="mx-auto max-w-3xl rounded-lg border border-slate-200/80 bg-white/70 p-5">
      <h2 className="text-lg font-semibold text-slate-950">{d.viewerPage.input}</h2>
      <div className="mt-4 space-y-4">
        <input
          accept=".fa,.fasta,.fna,.faa,.txt,text/plain"
          className="hidden"
          onChange={handleFileChange}
          ref={fileInputRef}
          type="file"
        />
        <Button
          className="w-full"
          onClick={() => fileInputRef.current?.click()}
          type="button"
          variant="outline"
        >
          <Upload className="h-4 w-4" />
          {d.viewerPage.uploadFasta}
        </Button>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800" htmlFor="viewerFasta">
            {d.viewerPage.pasteFasta}
          </label>
          <textarea
            className="min-h-52 w-full rounded-md border border-slate-300 bg-white/80 px-3 py-2 font-mono text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            id="viewerFasta"
            onChange={(event) => setPastedFasta(event.target.value)}
            placeholder={d.viewerPage.pastePlaceholder}
            value={pastedFasta}
          />
          <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>{pasteStatsText}</span>
              <span className={pastedTooLarge ? "font-medium text-rose-700" : "text-slate-500"}>
                {d.viewerPage.characterLimit.replace(
                  "{limit}",
                  MAX_FASTA_CHARACTERS.toLocaleString()
                )}
              </span>
            </div>
            <p className="mt-1">{d.viewerPage.inputHint}</p>
          </div>
          <Button
            className="w-full"
            disabled={!pastedFasta.trim() || pastedTooLarge}
            onClick={handlePasteLoad}
            type="button"
          >
            <FileText className="h-4 w-4" />
            {d.viewerPage.viewPasted}
          </Button>
        </div>
      </div>
    </section>
  );

  if (alignment) {
    return (
      <PageContainer className="space-y-5">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-2">
            <h1 className="text-3xl font-semibold text-slate-950">
              {d.viewerPage.title}
            </h1>
            <p className="max-w-4xl text-sm leading-6 text-slate-600">
              {isLengthConsistent
                ? d.viewerPage.equalLength
                : d.viewerPage.rawSequenceView}
            </p>
          </div>
          <Button onClick={resetViewer} type="button" variant="outline">
            <Upload className="h-4 w-4" />
            {d.viewerPage.newFasta}
          </Button>
        </div>

        <div className="grid gap-3 border-b border-slate-200 pb-5 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase text-slate-500">{d.viewerPage.source}</p>
            <p className="mt-1 break-all font-mono text-slate-900">{sourceName}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-slate-500">{d.viewerPage.sequences}</p>
            <p className="mt-1 font-mono text-slate-900">
              {alignment.sequences.length.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-slate-500">{d.viewerPage.longestLength}</p>
            <p className="mt-1 font-mono text-slate-900">
              {(alignment.alignmentLength ?? 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-slate-500">{d.viewerPage.lengthStatus}</p>
            <p className="mt-1 text-slate-900">
              {isLengthConsistent
                ? d.viewerPage.equalLength
                : d.viewerPage.rawSequenceView}
            </p>
          </div>
        </div>

        <MSAViewer alignment={alignment} />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-8">
      <div className="max-w-3xl space-y-3">
        <h1 className="text-4xl font-semibold text-slate-950">{d.viewerPage.title}</h1>
        <p className="text-lg leading-8 text-slate-600">
          {d.viewerPage.subtitle}
        </p>
      </div>

      {inputPanel}

      {error ? (
        <div className="mx-auto max-w-3xl rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          {error}
        </div>
      ) : null}

    </PageContainer>
  );
}
