import { FileText, Upload } from "lucide-react";
import { type ChangeEvent, useMemo, useRef, useState } from "react";
import { Button } from "../components/common/Button";
import { PageContainer } from "../components/layout/PageContainer";
import { MSAViewer } from "../components/results/MSAViewer";
import { useLanguage } from "../lib/i18n/useLanguage";
import type { MSAResult } from "../lib/types/msa";
import {
  declaredAlphabetForFileName,
  MsaInputError
} from "../features/msa-viewer/inputWorkerProtocol";
import { useAlignmentInput } from "../features/msa-viewer/useAlignmentInput";
import { createLocalViewerContext } from "../features/msa-viewer/viewerContext";
import {
  estimateFastaSequenceCount,
  MAX_FASTA_CHARACTERS,
  MAX_LOCAL_FASTA_BYTES
} from "../lib/utils/fasta";

export function ViewerPage() {
  const { dictionary: d } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const loadGenerationRef = useRef(0);
  const { cancel: cancelInput, processInput } = useAlignmentInput();
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

  async function loadFasta(
    generation: number,
    name: string,
    request: Parameters<typeof processInput>[0]
  ) {
    try {
      const nextAlignment = await processInput(request);
      if (generation === loadGenerationRef.current) {
        setSourceName(name);
        setAlignment(nextAlignment);
        setError(null);
      }
    } catch (inputError) {
      if (
        generation !== loadGenerationRef.current ||
        (inputError instanceof MsaInputError && inputError.code === "INPUT_CANCELLED")
      ) {
        return;
      }
      const code = inputError instanceof MsaInputError ? inputError.code : null;
      const message = code === "INPUT_TOO_LARGE"
        ? request.sourceKind === "local-file"
          ? d.viewerPage.fileTooLarge.replace("{limit}", MAX_LOCAL_FASTA_BYTES.toLocaleString())
          : d.viewerPage.characterLimit.replace("{limit}", MAX_FASTA_CHARACTERS.toLocaleString())
        : code === "INPUT_DECODE_FAILED"
          ? d.viewerPage.inputErrors.decode
          : code === "INPUT_EMPTY"
            ? d.viewerPage.inputErrors.empty
            : code === "INPUT_INVALID_FASTA"
              ? d.viewerPage.inputErrors.invalid
              : code === "PROTOCOL_VERSION_MISMATCH"
                ? d.viewerPage.inputErrors.protocol
                : code === "INPUT_WORKER_FAILED"
                  ? d.viewerPage.inputErrors.worker
                  : d.viewerPage.readError;
      setError(message);
      setAlignment(null);
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const generation = loadGenerationRef.current + 1;
    loadGenerationRef.current = generation;
    cancelInput();

    if (file.size > MAX_LOCAL_FASTA_BYTES) {
      setError(
        d.viewerPage.fileTooLarge.replace(
          "{limit}",
          MAX_LOCAL_FASTA_BYTES.toLocaleString()
        )
      );
      setAlignment(null);
      return;
    }

    try {
      const bytes = await file.arrayBuffer();
      if (generation !== loadGenerationRef.current) {
        return;
      }
      await loadFasta(
        generation,
        file.name,
        {
          sourceKind: "local-file",
          sourceName: file.name,
          declaredAlphabet: declaredAlphabetForFileName(file.name),
          payload: { kind: "bytes", bytes }
        }
      );
    } catch {
      if (generation === loadGenerationRef.current) {
        setError(d.viewerPage.readError);
        setAlignment(null);
      }
    }
  }

  function handlePasteLoad() {
    if (pastedFasta.length > MAX_FASTA_CHARACTERS) {
      return;
    }
    const generation = loadGenerationRef.current + 1;
    loadGenerationRef.current = generation;
    void loadFasta(generation, d.viewerPage.pastedSource, {
      sourceKind: "pasted",
      sourceName: d.viewerPage.pastedSource,
      payload: { kind: "text", text: pastedFasta }
    });
  }

  function resetViewer() {
    loadGenerationRef.current += 1;
    cancelInput();
    setAlignment(null);
    setError(null);
  }

  const inputPanel = (
    <section className="mx-auto max-w-3xl rounded-lg border border-slate-200/80 bg-white/70 p-5">
      <h2 className="text-lg font-semibold text-slate-950">{d.viewerPage.input}</h2>
      <div className="mt-4 space-y-4">
        <input
          accept=".fa,.fasta,.fna,.faa,.txt,text/plain"
          aria-label={d.viewerPage.uploadFasta}
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

        <MSAViewer
          alignment={alignment}
          context={createLocalViewerContext(
            alignment.descriptor?.sourceKind === "pasted" ? "pasted" : "local-file",
            sourceName
          )}
        />
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
