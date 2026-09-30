import { X } from "lucide-react";
import {
  useId,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type RefObject
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils/cn";

export type OverlayDialogVariant = "dialog" | "right-sheet" | "bottom-sheet";

export type OverlayDialogProps = {
  bodyClassName?: string;
  children: ReactNode;
  className?: string;
  closeLabel: string;
  closeOnBackdrop?: boolean;
  description?: ReactNode;
  footer?: ReactNode;
  initialFocusRef?: RefObject<HTMLElement>;
  isOpen: boolean;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLElement>;
  title: ReactNode;
  variant?: OverlayDialogVariant;
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "summary",
  "textarea:not([disabled])",
  "iframe",
  "object",
  "embed",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

let bodyScrollLockCount = 0;
let bodyOverflowBeforeLock = "";
let bodyPositionBeforeLock = "";
let bodyTopBeforeLock = "";
let bodyWidthBeforeLock = "";
let windowScrollXBeforeLock = 0;
let windowScrollYBeforeLock = 0;
const activeBlockingSurfaces: HTMLElement[] = [];
const originalBackgroundStates = new Map<
  HTMLElement,
  { ariaHidden: string | null; inert: boolean }
>();

/**
 * Shared by full-screen workspaces and overlays so nested surfaces cannot
 * accidentally unlock page scrolling while another surface is still open.
 */
export function acquireBodyScrollLock(
  preservedScroll?: Readonly<{ x: number; y: number }>
) {
  if (typeof document === "undefined") {
    return () => undefined;
  }

  if (bodyScrollLockCount === 0) {
    bodyOverflowBeforeLock = document.body.style.overflow;
    bodyPositionBeforeLock = document.body.style.position;
    bodyTopBeforeLock = document.body.style.top;
    bodyWidthBeforeLock = document.body.style.width;
    windowScrollXBeforeLock = preservedScroll?.x ?? window.scrollX;
    windowScrollYBeforeLock = preservedScroll?.y ?? window.scrollY;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${windowScrollYBeforeLock}px`;
    document.body.style.width = "100%";
  }
  bodyScrollLockCount += 1;

  let released = false;
  return () => {
    if (released) {
      return;
    }
    released = true;
    bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1);
    if (bodyScrollLockCount === 0) {
      const restoreScrollX = windowScrollXBeforeLock;
      const restoreScrollY = windowScrollYBeforeLock;
      document.body.style.overflow = bodyOverflowBeforeLock;
      document.body.style.position = bodyPositionBeforeLock;
      document.body.style.top = bodyTopBeforeLock;
      document.body.style.width = bodyWidthBeforeLock;
      const restoreScroll = () => {
        if (bodyScrollLockCount === 0 && (restoreScrollX !== 0 || restoreScrollY !== 0)) {
          window.scrollTo({
            top: restoreScrollY,
            left: restoreScrollX,
            behavior: "instant"
          });
        }
      };
      // A closing sheet can restore focus during the same React commit. Some
      // mobile browsers apply that focus scroll after the synchronous unlock,
      // so repeat the exact restoration after focus/layout have settled.
      restoreScroll();
      queueMicrotask(restoreScroll);
      window.requestAnimationFrame(restoreScroll);
      bodyOverflowBeforeLock = "";
      bodyPositionBeforeLock = "";
      bodyTopBeforeLock = "";
      bodyWidthBeforeLock = "";
      windowScrollXBeforeLock = 0;
      windowScrollYBeforeLock = 0;
    }
  };
}

function restoreBackgroundState(
  element: HTMLElement,
  state: { ariaHidden: string | null; inert: boolean }
) {
  element.inert = state.inert;
  if (state.ariaHidden === null) {
    element.removeAttribute("aria-hidden");
  } else {
    element.setAttribute("aria-hidden", state.ariaHidden);
  }
}

function synchronizeBackgroundInert() {
  originalBackgroundStates.forEach((state, element) => {
    if (element.isConnected) {
      restoreBackgroundState(element, state);
    }
  });

  const activeSurface = activeBlockingSurfaces[activeBlockingSurfaces.length - 1];
  if (!activeSurface?.isConnected) {
    if (!activeBlockingSurfaces.length) {
      originalBackgroundStates.clear();
    }
    return;
  }

  let current: HTMLElement = activeSurface;
  while (current.parentElement) {
    const parent = current.parentElement;
    Array.from(parent.children).forEach((sibling) => {
      if (!(sibling instanceof HTMLElement) || sibling === current) {
        return;
      }
      if (!originalBackgroundStates.has(sibling)) {
        originalBackgroundStates.set(sibling, {
          ariaHidden: sibling.getAttribute("aria-hidden"),
          inert: Boolean(sibling.inert)
        });
      }
      sibling.inert = true;
      sibling.setAttribute("aria-hidden", "true");
    });
    if (parent === document.body) {
      break;
    }
    current = parent;
  }
}

/**
 * Makes everything outside the active surface inert. Surfaces form a stack,
 * so a nested dialog temporarily blocks its parent and restores it when closed.
 */
export function acquireBackgroundInert(surface: HTMLElement) {
  activeBlockingSurfaces.push(surface);
  synchronizeBackgroundInert();

  let released = false;
  return () => {
    if (released) {
      return;
    }
    released = true;
    const index = activeBlockingSurfaces.lastIndexOf(surface);
    if (index >= 0) {
      activeBlockingSurfaces.splice(index, 1);
    }
    synchronizeBackgroundInert();
    if (!activeBlockingSurfaces.length) {
      originalBackgroundStates.forEach((state, element) => {
        if (element.isConnected) {
          restoreBackgroundState(element, state);
        }
      });
      originalBackgroundStates.clear();
    }
  };
}

function isTopBlockingSurface(surface: HTMLElement) {
  return activeBlockingSurfaces[activeBlockingSurfaces.length - 1] === surface;
}

function focusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => {
      if (
        element.getAttribute("aria-hidden") === "true" ||
        element.hasAttribute("hidden") ||
        element.tabIndex === -1 ||
        element.closest("[inert]")
      ) {
        return false;
      }
      const style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") {
        return false;
      }
      let ancestor = element.parentElement;
      while (ancestor && ancestor !== container) {
        if (ancestor instanceof HTMLDetailsElement && !ancestor.open) {
          const summary = ancestor.querySelector(":scope > summary");
          if (summary !== element && !summary?.contains(element)) return false;
        }
        ancestor = ancestor.parentElement;
      }
      return true;
    }
  );
}

const overlayPositionClasses: Record<OverlayDialogVariant, string> = {
  dialog: "items-center justify-center px-4 py-6",
  "right-sheet": "items-stretch justify-end",
  "bottom-sheet": "items-end justify-center"
};

const panelPositionClasses: Record<OverlayDialogVariant, string> = {
  dialog: "max-h-[92dvh] w-full max-w-3xl rounded-xl",
  "right-sheet": "h-[100dvh] w-[min(92vw,32rem)] rounded-l-xl",
  "bottom-sheet": "max-h-[90dvh] w-full max-w-4xl overscroll-contain rounded-t-2xl pb-[env(safe-area-inset-bottom)]"
};

export function OverlayDialog({
  bodyClassName,
  children,
  className,
  closeLabel,
  closeOnBackdrop = true,
  description,
  footer,
  initialFocusRef,
  isOpen,
  onClose,
  returnFocusRef,
  title,
  variant = "dialog"
}: OverlayDialogProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();

  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    const backdrop = backdropRef.current;
    const panel = panelRef.current;
    if (!backdrop || !panel) {
      return;
    }

    const focusedBeforeOpen =
      returnFocusRef?.current ??
      (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const releaseBodyScroll = acquireBodyScrollLock();
    const releaseBackgroundInert = acquireBackgroundInert(backdrop);
    const preferredFocus = initialFocusRef?.current;
    const firstFocusable = focusableElements(panel)[0];
    (preferredFocus ?? firstFocusable ?? panel).focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isTopBlockingSurface(backdrop)) {
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = focusableElements(panel);
      if (!focusable.length) {
        event.preventDefault();
        panel.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      releaseBackgroundInert();
      releaseBodyScroll();
      const focusTarget = returnFocusRef?.current ?? focusedBeforeOpen;
      if (focusTarget?.isConnected) {
        focusTarget.focus({ preventScroll: true });
      }
    };
  }, [initialFocusRef, isOpen, returnFocusRef]);

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[70] flex bg-slate-950/45 backdrop-blur-[1px]",
        overlayPositionClasses[variant]
      )}
      data-overlay-backdrop="true"
      onMouseDown={(event) => {
        if (
          closeOnBackdrop &&
          event.button === 0 &&
          event.target === event.currentTarget
        ) {
          onCloseRef.current();
        }
      }}
      ref={backdropRef}
    >
      <div
        aria-describedby={description === undefined ? undefined : descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className={cn(
          "flex min-h-0 flex-col overflow-hidden border border-slate-200 bg-white shadow-2xl outline-none",
          panelPositionClasses[variant],
          className
        )}
        data-overlay-dialog="true"
        data-overlay-variant={variant}
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-950" id={titleId}>
              {title}
            </h2>
            {description === undefined ? null : (
              <div className="mt-1 text-sm leading-6 text-slate-600" id={descriptionId}>
                {description}
              </div>
            )}
          </div>
          <button
            aria-label={closeLabel}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            onClick={() => onCloseRef.current()}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </header>

        <div className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-4", bodyClassName)}>
          {children}
        </div>

        {footer === undefined ? null : (
          <footer className="shrink-0 border-t border-slate-200 px-5 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
}
