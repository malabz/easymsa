import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { OverlayDialog, type OverlayDialogVariant } from "./OverlayDialog";

function DialogHarness({
  variant = "dialog"
}: {
  variant?: OverlayDialogVariant;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const initialFocusRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button onClick={() => setIsOpen(true)} ref={triggerRef} type="button">
        Open dialog
      </button>
      <OverlayDialog
        closeLabel="Close dialog"
        description="A useful description"
        initialFocusRef={initialFocusRef}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        returnFocusRef={triggerRef}
        title="Dialog title"
        variant={variant}
      >
        <button ref={initialFocusRef} type="button">
          First action
        </button>
        <button type="button">Last action</button>
      </OverlayDialog>
    </>
  );
}

function NestedDialogHarness() {
  const [outerOpen, setOuterOpen] = useState(false);
  const [innerOpen, setInnerOpen] = useState(false);
  const outerTriggerRef = useRef<HTMLButtonElement>(null);
  const innerTriggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        onClick={() => setOuterOpen(true)}
        ref={outerTriggerRef}
        type="button"
      >
        Open outer
      </button>
      <OverlayDialog
        closeLabel="Close outer"
        isOpen={outerOpen}
        onClose={() => setOuterOpen(false)}
        returnFocusRef={outerTriggerRef}
        title="Outer dialog"
      >
        <button
          onClick={() => setInnerOpen(true)}
          ref={innerTriggerRef}
          type="button"
        >
          Open inner
        </button>
        <OverlayDialog
          closeLabel="Close inner"
          isOpen={innerOpen}
          onClose={() => setInnerOpen(false)}
          returnFocusRef={innerTriggerRef}
          title="Inner dialog"
        >
          Inner content
        </OverlayDialog>
      </OverlayDialog>
    </>
  );
}

function DetailsDialogHarness() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button onClick={() => setIsOpen(true)} type="button">Open details dialog</button>
      <OverlayDialog
        closeLabel="Close details dialog"
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Details dialog"
      >
        <details>
          <summary>Advanced choices</summary>
          <button type="button">Closed detail action</button>
        </details>
      </OverlayDialog>
    </>
  );
}

describe("OverlayDialog", () => {
  afterEach(() => {
    cleanup();
  });

  it("labels the dialog, moves focus inside, locks scrolling, and restores focus", async () => {
    const user = userEvent.setup();
    const { container } = render(<DialogHarness />);

    const trigger = screen.getByRole("button", { name: "Open dialog" });
    await user.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Dialog title" });
    const description = screen.getByText("A useful description");
    expect(dialog).toHaveAttribute("aria-labelledby", screen.getByRole("heading", { name: "Dialog title" }).id);
    expect(dialog).toHaveAttribute("aria-describedby", description.id);
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("button", { name: "First action" })).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
    expect(container).toHaveAttribute("aria-hidden", "true");
    expect(container.inert).toBe(true);

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
    expect(container).not.toHaveAttribute("aria-hidden");
    expect(container.inert).toBe(false);
  });

  it("traps forward and reverse Tab navigation inside the dialog", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    await user.click(screen.getByRole("button", { name: "Open dialog" }));

    const close = screen.getByRole("button", { name: "Close dialog" });
    const last = screen.getByRole("button", { name: "Last action" });

    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(close).toHaveFocus();

    close.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
  });

  it("supports sheet variants and closes only from the backdrop itself", async () => {
    const user = userEvent.setup();
    render(<DialogHarness variant="right-sheet" />);
    await user.click(screen.getByRole("button", { name: "Open dialog" }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("data-overlay-variant", "right-sheet");

    fireEvent.mouseDown(dialog);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const backdrop = document.querySelector<HTMLElement>("[data-overlay-backdrop='true']");
    expect(backdrop).not.toBeNull();
    fireEvent.mouseDown(backdrop!);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("keeps scroll locking and background inert correct for nested overlays", async () => {
    const user = userEvent.setup();
    const { container } = render(<NestedDialogHarness />);

    await user.click(screen.getByRole("button", { name: "Open outer" }));
    await user.click(screen.getByRole("button", { name: "Open inner" }));
    expect(screen.getByRole("dialog", { name: "Inner dialog" })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");
    expect(container.inert).toBe(true);

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Inner dialog" })).not.toBeInTheDocument()
    );
    expect(screen.getByRole("dialog", { name: "Outer dialog" })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");
    expect(container.inert).toBe(true);

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Outer dialog" })).not.toBeInTheDocument()
    );
    expect(document.body.style.overflow).toBe("");
    expect(container.inert).toBe(false);
    expect(screen.getByRole("button", { name: "Open outer" })).toHaveFocus();
  });

  it("includes summary but excludes controls inside closed details from its focus loop", async () => {
    const user = userEvent.setup();
    render(<DetailsDialogHarness />);
    await user.click(screen.getByRole("button", { name: "Open details dialog" }));
    const summary = screen.getByText("Advanced choices");
    summary.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(screen.getByRole("button", { name: "Close details dialog" })).toHaveFocus();
  });
});
