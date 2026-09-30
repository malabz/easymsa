import { X } from "lucide-react";
import {
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject
} from "react";
import {
  acquireBackgroundInert,
  acquireBodyScrollLock
} from "../../components/common/OverlayDialog";
import { cn } from "../../lib/utils/cn";

export type MsaWorkspaceMode = "embedded" | "immersive";

type MsaWorkspaceShellBaseProps = {
  className?: string;
  commandBar: ReactNode;
  dock?: ReactNode;
  dockClassName?: string;
  dockCloseLabel?: string;
  dockLabel?: string;
  dockOpen?: boolean;
  dockResizeLabel?: string;
  dockWidth?: number;
  initialFocusRef?: RefObject<HTMLElement>;
  matrix: ReactNode;
  matrixClassName?: string;
  matrixLabel: string;
  navigator?: ReactNode;
  onDockClose?: () => void;
  onDockWidthChange?: (width: number) => void;
  returnFocusRef?: RefObject<HTMLElement>;
  statusBar?: ReactNode;
  workspaceLabel: string;
};

type EmbeddedWorkspaceProps = MsaWorkspaceShellBaseProps & {
  mode: "embedded";
  exitImmersiveLabel?: never;
  onExitImmersive?: never;
};

type ImmersiveWorkspaceProps = MsaWorkspaceShellBaseProps & {
  exitImmersiveLabel: string;
  mode: "immersive";
  onExitImmersive: () => void;
};

export type MsaWorkspaceShellProps =
  | EmbeddedWorkspaceProps
  | ImmersiveWorkspaceProps;

export function MsaWorkspaceShell({
  className,
  commandBar,
  dock,
  dockClassName,
  dockCloseLabel,
  dockLabel,
  dockOpen = Boolean(dock),
  dockResizeLabel,
  dockWidth = 320,
  initialFocusRef,
  matrix,
  matrixClassName,
  matrixLabel,
  mode,
  navigator,
  onDockClose,
  onDockWidthChange,
  returnFocusRef,
  statusBar,
  workspaceLabel,
  ...modeProps
}: MsaWorkspaceShellProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const onExitImmersiveRef = useRef<(() => void) | null>(null);
  const embeddedScrollRef = useRef({ x: 0, y: 0 });
  const immersive = mode === "immersive";
  const minimumDockWidth = 256;
  const maximumDockWidth = 720;
  const clampDockWidth = (value: number) =>
    Math.min(maximumDockWidth, Math.max(minimumDockWidth, Math.round(value)));

  function handleDockResizeKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!onDockWidthChange) return;
    let nextWidth: number | null = null;
    if (event.key === "ArrowLeft") nextWidth = dockWidth + 16;
    if (event.key === "ArrowRight") nextWidth = dockWidth - 16;
    if (event.key === "Home") nextWidth = minimumDockWidth;
    if (event.key === "End") nextWidth = maximumDockWidth;
    if (nextWidth === null) return;
    event.preventDefault();
    onDockWidthChange(clampDockWidth(nextWidth));
  }

  function handleDockResizePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!onDockWidthChange) return;
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = dockWidth;
    const previousCursor = document.body.style.cursor;
    document.body.style.cursor = "col-resize";
    const handleMove = (moveEvent: PointerEvent) => {
      onDockWidthChange(clampDockWidth(startWidth + startX - moveEvent.clientX));
    };
    const handleEnd = () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleEnd);
      document.removeEventListener("pointercancel", handleEnd);
      document.body.style.cursor = previousCursor;
    };
    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleEnd, { once: true });
    document.addEventListener("pointercancel", handleEnd, { once: true });
  }

  useLayoutEffect(() => {
    onExitImmersiveRef.current =
      mode === "immersive" ? modeProps.onExitImmersive ?? null : null;
  }, [mode, modeProps]);

  useLayoutEffect(() => {
    if (!immersive) {
      return;
    }

    const focusedBeforeOpen =
      returnFocusRef?.current ??
      (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const releaseBodyScroll = acquireBodyScrollLock(embeddedScrollRef.current);
    const releaseBackgroundInert = shellRef.current
      ? acquireBackgroundInert(shellRef.current)
      : () => undefined;
    (initialFocusRef?.current ?? shellRef.current)?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      const target = event.target;
      if (
        target instanceof Element &&
        target.closest('[aria-modal="true"]')
      ) {
        return;
      }

      event.preventDefault();
      onExitImmersiveRef.current?.();
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      releaseBackgroundInert();
      releaseBodyScroll();
      const focusTarget = returnFocusRef?.current ?? focusedBeforeOpen;
      if (focusTarget?.isConnected) {
        queueMicrotask(() => {
          if (focusTarget.isConnected) {
            focusTarget.focus({ preventScroll: true });
          }
        });
      }
    };
  }, [immersive, initialFocusRef, returnFocusRef]);

  useLayoutEffect(() => {
    if (immersive) return;
    const rememberScroll = () => {
      embeddedScrollRef.current = { x: window.scrollX, y: window.scrollY };
    };
    rememberScroll();
    window.addEventListener("scroll", rememberScroll, { passive: true });
    return () => window.removeEventListener("scroll", rememberScroll);
  }, [immersive]);

  useLayoutEffect(() => {
    if (immersive || !shellRef.current) return;
    const shell = shellRef.current;
    let frame = 0;
    const applyHeight = () => {
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const top = Math.max(0, shell.getBoundingClientRect().top);
      const fixedHeight = Array.from(shell.children).reduce((height, element) => {
        if (element.matches("header, footer, [data-msa-workspace-navigator]")) {
          return height + element.getBoundingClientRect().height;
        }
        return height;
      }, 0);
      shell.style.setProperty(
        "--msa-embedded-height",
        `${Math.max(512, Math.ceil(fixedHeight + 194), Math.floor(viewportHeight - top - 16))}px`
      );
    };
    const updateHeight = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(applyHeight);
    };
    applyHeight();
    updateHeight();
    const resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(updateHeight);
    if (shell.parentElement) resizeObserver?.observe(shell.parentElement);
    Array.from(shell.children).forEach((element) => {
      if (element.matches("header, footer, [data-msa-workspace-navigator]")) {
        resizeObserver?.observe(element);
      }
    });
    void document.fonts?.ready.then(updateHeight);
    window.addEventListener("load", updateHeight);
    window.addEventListener("resize", updateHeight);
    window.addEventListener("scroll", updateHeight, { passive: true });
    window.visualViewport?.addEventListener("resize", updateHeight);
    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener("load", updateHeight);
      window.removeEventListener("resize", updateHeight);
      window.removeEventListener("scroll", updateHeight);
      window.visualViewport?.removeEventListener("resize", updateHeight);
    };
  }, [immersive]);

  return (
    <section
      aria-label={workspaceLabel}
      className={cn(
        "flex min-h-0 w-full flex-col overflow-hidden bg-slate-50",
        immersive
          ? "fixed inset-0 z-[60] !m-0 h-[100dvh] w-screen"
          : "relative h-[var(--msa-embedded-height,calc(100dvh-1rem))] min-h-[512px] rounded-xl border border-slate-200 shadow-sm",
        className
      )}
      data-msa-workspace-mode={mode}
      data-msa-workspace-shell="true"
      onClickCapture={() => {
        if (!immersive) {
          embeddedScrollRef.current = { x: window.scrollX, y: window.scrollY };
        }
      }}
      onKeyDownCapture={() => {
        if (!immersive) {
          embeddedScrollRef.current = { x: window.scrollX, y: window.scrollY };
        }
      }}
      ref={shellRef}
      tabIndex={-1}
    >
      <header className="relative z-30 flex shrink-0 items-start gap-2 border-b border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
        <div className="min-w-0 flex-1">{commandBar}</div>
      </header>

      {navigator === undefined ? null : (
        <div
          className="relative z-20 shrink-0 border-b border-slate-200 bg-white"
          data-msa-workspace-navigator="true"
        >
          {navigator}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div
          aria-label={matrixLabel}
          className={cn(
            "relative min-h-0 min-w-0 flex-1 overflow-hidden bg-white",
            matrixClassName
          )}
          data-msa-workspace-matrix="true"
          role="region"
        >
          {matrix}
        </div>

        {dock !== undefined && dockOpen ? (
          <aside
            aria-label={dockLabel}
            className={cn(
              "relative min-h-0 max-h-[45%] shrink-0 overflow-auto border-t border-slate-200 bg-white lg:max-h-none lg:w-[var(--msa-dock-width)] lg:min-w-64 lg:max-w-[min(720px,55vw)] lg:border-l lg:border-t-0",
              dockClassName
            )}
            data-msa-workspace-dock="true"
            style={{ "--msa-dock-width": `${clampDockWidth(dockWidth)}px` } as CSSProperties}
          >
            {onDockWidthChange && dockResizeLabel ? (
              <div
                aria-label={dockResizeLabel}
                aria-orientation="vertical"
                aria-valuemax={maximumDockWidth}
                aria-valuemin={minimumDockWidth}
                aria-valuenow={clampDockWidth(dockWidth)}
                className="absolute -left-1 top-0 z-20 hidden h-full w-2 cursor-col-resize touch-none outline-none after:absolute after:inset-y-0 after:left-1/2 after:w-px after:bg-slate-300 hover:after:bg-teal-500 focus-visible:after:w-0.5 focus-visible:after:bg-teal-600 lg:block"
                onKeyDown={handleDockResizeKeyDown}
                onPointerDown={handleDockResizePointerDown}
                role="separator"
                tabIndex={0}
              />
            ) : null}
            {onDockClose && dockCloseLabel ? (
              <button
                aria-label={dockCloseLabel}
                className="sticky right-2 top-2 z-10 ml-auto mr-2 mt-2 flex h-11 w-11 items-center justify-center rounded-md bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                onClick={onDockClose}
                type="button"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            ) : null}
            <div className={cn(onDockClose && dockCloseLabel ? "-mt-12 pt-12" : "")}>
              {dock}
            </div>
          </aside>
        ) : null}
      </div>

      {statusBar === undefined ? null : (
        <footer
          className="relative z-20 shrink-0 border-t border-slate-200 bg-slate-50"
          data-msa-workspace-status="true"
        >
          {statusBar}
        </footer>
      )}
    </section>
  );
}
