import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { MsaWorkspaceShell, type MsaWorkspaceMode } from "./MsaWorkspaceShell";

function WorkspaceHarness({ initialMode = "embedded" }: { initialMode?: MsaWorkspaceMode }) {
  const [mode, setMode] = useState<MsaWorkspaceMode>(initialMode);
  const [dockOpen, setDockOpen] = useState(true);
  const [dockWidth, setDockWidth] = useState(320);
  const expandButtonRef = useRef<HTMLButtonElement>(null);

  const commonProps = {
    commandBar: <span>Command bar</span>,
    dock: <div>Inspector content</div>,
    dockCloseLabel: "Close inspector",
    dockLabel: "Analysis inspector",
    dockOpen,
    dockResizeLabel: "Resize side panel",
    dockWidth,
    matrix: <div>Alignment matrix</div>,
    matrixLabel: "MSA matrix",
    navigator: <div>Alignment navigator</div>,
    onDockClose: () => setDockOpen(false),
    onDockWidthChange: setDockWidth,
    returnFocusRef: expandButtonRef,
    statusBar: <div>Selection status</div>,
    workspaceLabel: "MSA workspace"
  };

  return (
    <>
      <button
        onClick={() => setMode("immersive")}
        ref={expandButtonRef}
        type="button"
      >
        Expand workspace
      </button>
      {mode === "immersive" ? (
        <MsaWorkspaceShell
          {...commonProps}
          exitImmersiveLabel="Exit workspace"
          mode="immersive"
          onExitImmersive={() => setMode("embedded")}
        />
      ) : (
        <MsaWorkspaceShell {...commonProps} mode="embedded" />
      )}
    </>
  );
}

describe("MsaWorkspaceShell", () => {
  afterEach(() => {
    cleanup();
    document.body.style.overflow = "";
  });

  it("provides a dynamic embedded layout with named matrix, navigator, dock, and status slots", () => {
    render(<WorkspaceHarness />);

    const workspace = screen.getByRole("region", { name: "MSA workspace" });
    expect(workspace).toHaveAttribute("data-msa-workspace-mode", "embedded");
    expect(workspace.className).toContain("h-[var(--msa-embedded-height,calc(100dvh-1rem))]");
    expect(workspace.style.getPropertyValue("--msa-embedded-height")).not.toBe("");
    expect(screen.getByRole("region", { name: "MSA matrix" })).toHaveAttribute(
      "data-msa-workspace-matrix",
      "true"
    );
    expect(screen.getByText("Alignment navigator")).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Analysis inspector" })).toBeInTheDocument();
    expect(screen.getByText("Selection status")).toBeInTheDocument();
  });

  it("enters a 100dvh immersive workspace, exits with Escape, and restores scroll and focus", async () => {
    const user = userEvent.setup();
    document.body.style.overflow = "scroll";
    render(<WorkspaceHarness />);

    const trigger = screen.getByRole("button", { name: "Expand workspace" });
    await user.click(trigger);

    const workspace = screen.getByRole("region", { name: "MSA workspace" });
    expect(workspace).toHaveAttribute("data-msa-workspace-mode", "immersive");
    expect(workspace.className).toContain("h-[100dvh]");
    expect(workspace).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
    expect(trigger.inert).toBe(true);

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() =>
      expect(screen.getByRole("region", { name: "MSA workspace" })).toHaveAttribute(
        "data-msa-workspace-mode",
        "embedded"
      )
    );
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(document.body.style.overflow).toBe("scroll");
    expect(trigger.inert).toBe(false);
    document.body.style.overflow = "";
  });

  it("exposes a controlled collapsible dock", async () => {
    const user = userEvent.setup();
    render(<WorkspaceHarness />);

    expect(screen.getByRole("complementary", { name: "Analysis inspector" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close inspector" }));
    expect(screen.queryByRole("complementary", { name: "Analysis inspector" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "MSA matrix" })).toBeInTheDocument();
  });

  it("exposes a keyboard-operable dock resize separator", () => {
    render(<WorkspaceHarness />);
    const separator = screen.getByRole("separator", { name: "Resize side panel" });
    expect(separator).toHaveAttribute("aria-valuenow", "320");
    fireEvent.keyDown(separator, { key: "ArrowLeft" });
    expect(separator).toHaveAttribute("aria-valuenow", "336");
    fireEvent.keyDown(separator, { key: "Home" });
    expect(separator).toHaveAttribute("aria-valuenow", "256");
  });
});
