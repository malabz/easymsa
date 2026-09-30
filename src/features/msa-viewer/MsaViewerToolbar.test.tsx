import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../lib/i18n/LanguageProvider";
import {
  MsaViewerToolbar,
  type MsaViewerToolbarProps
} from "./MsaViewerToolbar";
import type { MotifMatch, ViewerState } from "./types";
import { createInitialViewerState } from "./useViewerState";

function callbacks() {
  const callback = vi.fn();
  return {
    callback,
    onExportConsensusRange: callback,
    onExportImage: callback,
    onExportSelectedRange: callback,
    onExportSelectedRows: callback,
    onExportVisible: callback,
    onJump: callback,
    onJumpPositionChange: callback,
    onMotifNavigate: callback,
    onMotifSelect: callback,
    onOpenInspector: callback,
    onPatch: callback,
    onShowAll: callback,
    onToggleTrack: callback,
    onZoom: callback
  };
}

function renderToolbar({
  propOverrides = {},
  statePatch = {}
}: {
  propOverrides?: Partial<MsaViewerToolbarProps>;
  statePatch?: Partial<ViewerState>;
} = {}) {
  const shared = callbacks();
  const state = {
    ...createInitialViewerState("toolbar-test"),
    ...statePatch
  };
  const props: MsaViewerToolbarProps = {
    alignmentLength: 100,
    canExport: true,
    canExportSelectedRows: false,
    hiddenCount: 0,
    isSearchingMotif: false,
    jumpPosition: "",
    motifMatchCount: 0,
    motifMatches: [],
    motifMatchesTruncated: false,
    selectedRowCount: state.selectedRowKeys.size,
    state,
    totalSequenceCount: 3,
    visibleColumnCount: 100,
    visibleSequenceCount: 3,
    ...shared,
    ...propOverrides
  };
  return {
    ...render(
      <LanguageProvider>
        <MsaViewerToolbar {...props} />
      </LanguageProvider>
    ),
    props,
    shared
  };
}

describe("MsaViewerToolbar", () => {
  afterEach(cleanup);

  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("easymsa.locale", "en");
  });

  it("uses a non-sticky command bar and disables selected scope without selected rows", () => {
    const { container } = renderToolbar();

    const toolbar = container.querySelector("[data-msa-toolbar='true']");
    expect(toolbar).not.toBeNull();
    expect(toolbar?.className).not.toContain("sticky");
    expect(toolbar?.className).not.toContain("top-2");
    expect(toolbar?.className).not.toContain("z-40");
    expect(container.querySelector("details")).toBeNull();
    expect(
      (screen.getByRole("option", { name: "Explicitly selected rows" }) as HTMLOptionElement)
        .disabled
    ).toBe(true);
  });

  it("publishes motif rule changes and shows strand plus both coordinate systems", () => {
    const match: MotifMatch = {
      alignmentEnd: 14,
      alignmentStart: 12,
      positions: [12, 13, 14],
      rowKey: "row:duplicate:2",
      sequenceEnd: 9,
      sequenceId: "duplicate",
      sequenceStart: 7,
      start: 12,
      strand: "-"
    };
    const { shared } = renderToolbar({
      propOverrides: {
        motifMatchCount: 1,
        motifMatches: [match],
        selectedRowCount: 1
      },
      statePatch: { selectedRowKeys: new Set(["row:duplicate:2"]) }
    });

    fireEvent.change(screen.getByLabelText("Motif match rule"), {
      target: { value: "possible" }
    });
    fireEvent.change(screen.getByLabelText("Motif strand"), {
      target: { value: "both" }
    });

    expect(shared.onPatch).toHaveBeenCalledWith({
      activeMotifIndex: 0,
      motifMatchMode: "possible"
    });
    expect(shared.onPatch).toHaveBeenCalledWith({
      activeMotifIndex: 0,
      motifStrandMode: "both"
    });
    expect(
      screen.getByRole("option", {
        name: /duplicate · - strand · alignment 12-14 · sequence 7-9/
      })
    ).not.toBeNull();
    expect(
      (screen.getByRole("option", { name: "Explicitly selected rows" }) as HTMLOptionElement)
        .disabled
    ).toBe(false);
  });

  it("keeps active scientific state visible and each chip has an explicit clear action", () => {
    const clearFilter = vi.fn();
    const showAll = vi.fn();
    const toggleTrack = vi.fn();
    const { shared } = renderToolbar({
      propOverrides: {
        hiddenCount: 2,
        onClearColumnFilter: clearFilter,
        onShowAll: showAll,
        onToggleTrack: toggleTrack,
        referenceLabel: "reference header",
        selectedRowCount: 2,
        visibleSequenceCount: 1
      },
      statePatch: {
        analysisScope: "visible",
        columnFilter: "conserved",
        differenceMode: true,
        hiddenRowKeys: new Set(["row:2", "row:3"]),
        referenceRowKey: "row:1",
        selectedRange: { start: 4, end: 9 },
        selectedRowKeys: new Set(["row:1", "row:2"])
      }
    });

    expect(screen.getByText("Analysis: Visible rows (1 rows)")).not.toBeNull();
    expect(screen.getByText("Reference: reference header")).not.toBeNull();
    expect(screen.getByText("Range: 4-9")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Clear column filter" }));
    fireEvent.click(screen.getByRole("button", { name: "Show all" }));
    fireEvent.click(screen.getByRole("button", { name: "Hide Conservation track" }));

    expect(clearFilter).toHaveBeenCalledTimes(1);
    expect(showAll).toHaveBeenCalledTimes(1);
    expect(toggleTrack).toHaveBeenCalledWith("conservation");
    expect(shared.onPatch).not.toHaveBeenCalledWith({ columnFilter: "all" });
  });

  it("exposes batch actions in the settings dock", () => {
    const selectAll = vi.fn();
    const hide = vi.fn();
    const pin = vi.fn();
    const unpin = vi.fn();
    const undo = vi.fn();
    renderToolbar({
      propOverrides: {
        canUndoHide: true,
        hiddenCount: 1,
        onHideSelected: hide,
        onPinSelected: pin,
        onSelectAllVisible: selectAll,
        onUndoHide: undo,
        onUnpinSelected: unpin,
        selectedRowCount: 2,
        settingsPresentation: "dock"
      },
      statePatch: {
        lastHiddenRowKeys: ["row:3"],
        selectedRowKeys: new Set(["row:1", "row:2"]),
        settingsOpen: true
      }
    });

    fireEvent.click(screen.getByRole("button", { name: "Select visible" }));
    fireEvent.click(screen.getByRole("button", { name: "Hide selected" }));
    fireEvent.click(screen.getByRole("button", { name: "Pin selected" }));
    fireEvent.click(screen.getByRole("button", { name: "Unpin selected" }));
    fireEvent.click(screen.getByRole("button", { name: "Undo hide" }));

    expect(selectAll).toHaveBeenCalledTimes(1);
    expect(hide).toHaveBeenCalledTimes(1);
    expect(pin).toHaveBeenCalledTimes(1);
    expect(unpin).toHaveBeenCalledTimes(1);
    expect(undo).toHaveBeenCalledTimes(1);
  });

  it("shows motif validation failures without silently reporting a successful search", () => {
    renderToolbar({ propOverrides: { motifValidationError: "Gaps are not valid in a motif." } });
    expect(screen.getByRole("alert").textContent).toContain("Gaps are not valid in a motif.");
  });

  it("removes nucleotide-only controls and tracks in neutral browsing mode", () => {
    renderToolbar({
      propOverrides: {
        analysisDisabled: true,
        neutralReason: "Unequal row lengths are shown without padding.",
        settingsPresentation: "dock"
      },
      statePatch: {
        columnFilter: "conserved",
        differenceMode: true,
        referenceRowKey: "row:1",
        selectedRange: { start: 2, end: 4 },
        settingsOpen: true
      }
    });

    expect(screen.queryByLabelText("Motif match rule")).toBeNull();
    expect(screen.queryByLabelText("Analysis scope")).toBeNull();
    expect(screen.queryByRole("button", { name: "QC" })).toBeNull();
    expect(screen.queryByText(/^Track:/)).toBeNull();
    expect(screen.queryByLabelText("Reference position")).toBeNull();
    expect(screen.queryByText("Export consensus range")).toBeNull();
    expect(screen.queryByText(/^Reference:/)).toBeNull();
    expect(screen.getByRole("status").textContent).toContain(
      "Unequal row lengths are shown without padding."
    );
  });
});
