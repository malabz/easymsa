import {
  CheckCircle2,
  FileArchive,
  FileText,
  UploadCloud,
  X
} from "lucide-react";
import {
  type ChangeEvent,
  type DragEvent,
  useMemo,
  useRef,
  useState
} from "react";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { cn } from "../../lib/utils/cn";
import { formatFileSize } from "../../lib/utils/format";
import {
  ALLOWED_INPUT_EXTENSIONS,
  REALIGN_INPUT_EXTENSIONS,
  validateInputFile
} from "../../lib/utils/fileValidation";
import { realignText } from "../../lib/i18n/realignment";
import { Button } from "../common/Button";

export function FileUploadCard({
  file,
  onChange,
  variant = "alignment",
  disabled = false
}: {
  variant?: "alignment" | "realignment";
  disabled?: boolean;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const { dictionary: d, locale } = useLanguage();
  const t = realignText[locale];
  const realignment = variant === "realignment";
  const inputId = realignment ? "alignedFile" : "inputFile";
  const depth = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const validation = useMemo(
    () => (file ? validateInputFile(file, variant, locale) : null),
    [file, variant, locale]
  );

  function handleFiles(files: FileList | null) {
    if (disabled) return;
    const nextFile = files?.[0] ?? null;
    onChange(nextFile);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    depth.current = 0;
    setDragActive(false);
    handleFiles(event.dataTransfer.files);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    handleFiles(event.target.files);
    event.target.value = "";
  }

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "rounded-lg border border-dashed bg-white/60 p-6 text-center transition",
          dragActive
            ? "border-teal-500 bg-teal-50"
            : "border-slate-300 hover:border-teal-400"
        )}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) { depth.current += 1; setDragActive(true); }
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          depth.current = Math.max(0, depth.current - 1);
          if (depth.current === 0) setDragActive(false);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <input
          accept={(realignment ? REALIGN_INPUT_EXTENSIONS : ALLOWED_INPUT_EXTENSIONS).join(",")}
          aria-label={realignment ? t.file : d.submit.uploadBrowse}
          aria-describedby={`${inputId}-hint ${inputId}-feedback`}
          aria-invalid={validation ? !validation.valid : false}
          disabled={disabled}
          className="hidden"
          id={inputId}
          onChange={handleInputChange}
          ref={inputRef}
          type="file"
        />
        <UploadCloud className="mx-auto mb-3 h-9 w-9 text-teal-700" />
        <h3 className="text-base font-semibold text-slate-950">
          {dragActive ? d.submit.uploadDrop : realignment ? t.uploadTitle : d.submit.uploadTitle}
        </h3>
        <p id={`${inputId}-hint`} className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
          {realignment ? t.uploadDescription : d.submit.uploadDescription}
        </p>
        <Button
          className="mt-5"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          variant="outline"
        >
          <FileText className="h-4 w-4" />
          {file ? t.replaceFile : d.submit.uploadBrowse}
        </Button>
      </div>

      {file ? (
        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white/55 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white/80 text-teal-700">
              <FileArchive className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="break-all text-sm font-medium text-slate-900" title={file.name}>
                {file.name}
              </p>
              <p className="text-sm text-slate-500">{formatFileSize(file.size)}</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-3" id={`${inputId}-feedback`} aria-live="polite">
            {validation?.valid ? (
              <span className="inline-flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0" />
                {realignment ? t.fileSelected : d.submit.uploadValid}
              </span>
            ) : (
              <span role="alert" className="text-sm text-rose-700">
                {validation?.errors.join(" ") ?? d.submit.uploadEmpty}
              </span>
            )}
            <Button
              aria-label={d.common.remove}
              className="h-9 w-9 shrink-0 px-0"
              disabled={disabled}
              onClick={() => { if (inputRef.current) inputRef.current.value = ""; onChange(null); }}
              size="sm"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <p id={`${inputId}-feedback`} className="text-sm text-slate-500">{d.submit.uploadEmpty}</p>
      )}
    </div>
  );
}
