import { CheckCircle2, FilePlus2, FileText, Loader2, Upload } from "lucide-react";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../components/common/Button";
import { PageContainer } from "../components/layout/PageContainer";
import { InputMethodTabs } from "../components/submit/InputMethodTabs";
import type { InputMethod } from "../lib/types/job";
import { MSAViewer } from "../components/results/MSAViewer";
import { useLanguage } from "../lib/i18n/useLanguage";
import type { MSAResult } from "../lib/types/msa";
import {
  declaredAlphabetForFileName,
  MsaInputError
} from "../features/msa-viewer/inputWorkerProtocol";
import { useAlignmentInput } from "../features/msa-viewer/useAlignmentInput";
import { Link } from "react-router-dom";
import { loadExamples, loadExampleResult } from "../lib/examples";
import { workspaceText } from "../lib/i18n/workspace";
import { useDraftState, useRememberWork } from "../lib/workspace";
import { createLocalViewerContext, type MsaViewerContext } from "../features/msa-viewer/viewerContext";
import {
  estimateFastaSequenceCount,
} from "../lib/utils/fasta";

export function ViewerPage() {
  const { dictionary: d, locale } = useLanguage();
  const t = workspaceText[locale];
  useRememberWork("viewer");
  const [examplePending, setExamplePending] = useState(false);
  const [exampleContext, setExampleContext] = useDraftState<MsaViewerContext | null>("viewer:context", null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const loadGenerationRef = useRef(0);
  const { cancel: cancelInput, processInput } = useAlignmentInput();
  const [pastedFasta, setPastedFasta] = useDraftState("viewer:paste", "");
  const [inputMethod, setInputMethod] = useDraftState<InputMethod>("viewer:input-method", "paste");
  const [sourceName, setSourceName] = useDraftState("viewer:name", d.viewerPage.uploadedSource);
  const [alignment, setAlignment] = useDraftState<MSAResult | null>("viewer:alignment", null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => () => { loadGenerationRef.current += 1; }, []);
  const pastedCharacterCount = pastedFasta.length;
  const pastedSequenceCount = useMemo(
    () => estimateFastaSequenceCount(pastedFasta),
    [pastedFasta]
  );

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
    setExamplePending(false);
    try {
      const nextAlignment = await processInput(request);
      if (generation === loadGenerationRef.current) {
        setExampleContext(null);
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
      const message = code === "INPUT_DECODE_FAILED"
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
    setExamplePending(false);
    cancelInput();

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
    const generation = loadGenerationRef.current + 1;
    loadGenerationRef.current = generation;
    void loadFasta(generation, d.viewerPage.pastedSource, {
      sourceKind: "pasted",
      sourceName: d.viewerPage.pastedSource,
      payload: { kind: "text", text: pastedFasta }
    });
  }

  function resetViewer() {
    setExamplePending(false);
    loadGenerationRef.current += 1;
    cancelInput();
    setAlignment(null);
    setExampleContext(null);
    setError(null);
  }

  async function loadSample() {
    const generation = ++loadGenerationRef.current;
    cancelInput(); setExamplePending(true); setError(null);
    try {
      const example = (await loadExamples()).find(item => item.id === "alignment-small");
      if (!example) throw new Error("EXAMPLE_UNAVAILABLE");
      const result = await loadExampleResult(example, "final");
      if (generation !== loadGenerationRef.current) return;
      setAlignment(result.alignment); setExampleContext(result.context);
      setSourceName("alignment-small.fasta");
    } catch {
      if (generation === loadGenerationRef.current) setError(t.exampleFailed);
    } finally {
      if (generation === loadGenerationRef.current) setExamplePending(false);
    }
  }

  const inputPanel = (
    <section className="work-viewer-input">
      <div className="work-input-heading">
        <h2>{d.viewerPage.input}</h2>
        <button type="button" className="work-link" disabled={examplePending} onClick={() => void loadSample()}>
          {examplePending ? <Loader2 size={15} className="animate-spin" /> : <FilePlus2 size={15} />}
          {examplePending ? t.exampleLoading : t.sample}
        </button>
      </div>
      <InputMethodTabs value={inputMethod} onChange={setInputMethod} />
      <div className="mt-4 space-y-4">
        <div id="input-panel-upload" role="tabpanel" aria-labelledby="input-tab-upload" hidden={inputMethod !== "upload"}>
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
        <p className="work-hint mt-3">{d.viewerPage.inputHint}</p>
        </div>
        <div className="space-y-2" id="input-panel-paste" role="tabpanel" aria-labelledby="input-tab-paste" hidden={inputMethod !== "paste"}>
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
          <div className="text-xs leading-5 text-slate-600">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>{pasteStatsText}</span>

            </div>
            <p className="mt-1">{d.viewerPage.inputHint}</p>
          </div>
          <Button
            className="w-full"
            disabled={!pastedFasta.trim()}
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
      <PageContainer className="msa-viewer-loaded">
        <MSAViewer
          alignment={alignment}
          sourceName={sourceName}
          example={Boolean(exampleContext)}
          onReplaceInput={resetViewer}
          context={exampleContext ?? createLocalViewerContext(
            alignment.descriptor?.sourceKind === "pasted" ? "pasted" : "local-file",
            sourceName
          )}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="workflow-page">
      <div className="work-heading">
        <div><h1>{d.viewerPage.title}</h1><p>{d.viewerPage.subtitle}</p></div>
        <Link className="work-link" to="/docs">{t.help}</Link>
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
