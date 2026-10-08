import "./msa-workspace.css";
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
  sourceBar?: ReactNode;
  onCloseTransient?: () => boolean;
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
  overview?: ReactNode;
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
  sourceBar,
  onCloseTransient,
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
  overview,
  onDockClose,
  onDockWidthChange,
  returnFocusRef,
  statusBar,
  workspaceLabel,
  ...modeProps
}: MsaWorkspaceShellProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const closeTransientRef = useRef(onCloseTransient);
  closeTransientRef.current = onCloseTransient;
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
    const handleEscape = (event: KeyboardEvent) => {
      if (immersive || event.key !== "Escape" || event.defaultPrevented || !shellRef.current?.contains(event.target as Node)) return;
      const menu = shellRef.current.querySelector<HTMLDetailsElement>("details[data-msa-popup][open]");
      if (menu) { menu.open = false; menu.querySelector<HTMLElement>("summary")?.focus(); event.preventDefault(); }
      else if (closeTransientRef.current?.()) event.preventDefault();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [immersive]);

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
      if (event.key !== "Escape" || event.defaultPrevented) {
        return;
      }

      const target = event.target;
      if (
        target instanceof Element &&
        target.closest('[aria-modal="true"]')
      ) {
        return;
      }

      const openMenu = shellRef.current?.querySelector<HTMLDetailsElement>("details[data-msa-popup][open], details[data-msa-row-menu][open]");
      if (openMenu) { openMenu.open = false; openMenu.querySelector<HTMLElement>("summary")?.focus(); event.preventDefault(); return; }
      if (closeTransientRef.current?.()) { event.preventDefault(); return; }
      event.preventDefault();
      onExitImmersiveRef.current?.();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
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
        if (element.matches("header, footer, [data-msa-workspace-navigator], [data-msa-source]")) {
          return height + element.getBoundingClientRect().height;
        }
        return height;
      }, 0);
      shell.style.setProperty(
        "--msa-embedded-height",
        `${Math.max(420, Math.ceil(fixedHeight + 240), Math.floor(viewportHeight - top - (document.querySelector("#root > div > footer")?.getBoundingClientRect().height ?? 0)))}px`
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
      if (element.matches("header, footer, [data-msa-workspace-navigator], [data-msa-source]")) {
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
        "msa-workspace flex min-h-0 w-full flex-col overflow-hidden bg-slate-50 outline-none",
        immersive
          ? "fixed inset-0 z-[60] !m-0 h-[100dvh] w-screen"
          : "relative h-[var(--msa-embedded-height,calc(100dvh-1rem))] min-h-[420px]",
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
      {sourceBar && <div className="shrink-0" data-msa-source="true">{sourceBar}</div>}
      <header className="relative z-30 shrink-0 border-b border-slate-200 bg-white">
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

      <div className="relative z-0 flex min-h-0 flex-1 flex-col lg:flex-row">
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

        {!dockOpen && overview}
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
                className="sticky right-1 top-1 z-10 ml-auto mr-1 mt-1 flex h-9 w-9 items-center justify-center rounded text-slate-500 bg-white hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                onClick={onDockClose}
                type="button"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            ) : null}
            <div className={cn(onDockClose && dockCloseLabel ? "-mt-10 pt-2" : "")}>
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
