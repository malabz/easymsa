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

  function motif() {
    fireEvent.change(screen.getByLabelText("Search and navigation type"), { target: { value: "motif" } });
    fireEvent.click(screen.getByLabelText("Motif options and results"));
  }
  it("starts with one search input and only View, Analyze, zoom and Export entries", () => {
    const { container } = renderToolbar();
    expect(screen.getAllByRole("searchbox")).toHaveLength(1);
    expect(screen.queryByLabelText("Motif match rule")).toBeNull();
    expect(screen.getByRole("button", {name:"Workspace settings"}).getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByRole("button", {name:"Analysis inspector"}).getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector("details")?.hasAttribute("open")).toBe(false);
    expect(screen.queryByText(/^Track:/)).toBeNull();
  });
  it("switches between name, motif and position without losing their values", () => {
    const { shared } = renderToolbar({statePatch:{search:"row",motifQuery:"ACG"},propOverrides:{jumpPosition:"12"}});
    expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe("row");
    motif();
    expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe("ACG");
    fireEvent.change(screen.getByLabelText("Search and navigation type"),{target:{value:"position"}});
    expect((screen.getByRole("spinbutton") as HTMLInputElement).value).toBe("12");
    fireEvent.keyDown(screen.getByRole("spinbutton"),{key:"Enter"});
    expect(shared.onJump).toHaveBeenCalled();
  });
  it("publishes motif rules and both coordinate systems", () => {
    const match: MotifMatch={sequenceId:"duplicate",rowKey:"row:2",start:12,positions:[12,13,14],alignmentStart:12,alignmentEnd:14,sequenceStart:7,sequenceEnd:9,strand:"-"};
    const { shared }=renderToolbar({propOverrides:{motifMatchCount:1,motifMatches:[match]}});
    motif();
    fireEvent.change(screen.getByLabelText("Motif match rule"),{target:{value:"possible"}});
    fireEvent.change(screen.getByLabelText("Motif strand"),{target:{value:"both"}});
    expect(shared.onPatch).toHaveBeenCalledWith({motifMatchMode:"possible",activeMotifIndex:0});
    expect(shared.onPatch).toHaveBeenCalledWith({motifStrandMode:"both",activeMotifIndex:0});
    expect(screen.getByRole("option",{name:/duplicate · - strand · alignment 12-14 · sequence 7-9/})).not.toBeNull();
  });
  it("opens View exclusively and Analyze only on explicit activation", () => {
    const onOpenInspector=vi.fn();
    const {shared}=renderToolbar({propOverrides:{onOpenInspector}});
    fireEvent.click(screen.getByRole("button",{name:"Workspace settings"}));
    expect(shared.onPatch).toHaveBeenCalledWith({settingsOpen:true,inspectorOpen:false,qcPanelOpen:false});
    fireEvent.click(screen.getByRole("button",{name:"Analysis inspector"}));
    expect(onOpenInspector).toHaveBeenCalledOnce();
  });
  it("gathers exports in a menu and disables absent selections", () => {
    const {container, shared}=renderToolbar();
    fireEvent.click(container.querySelector(".msa-export-menu summary")!);
    expect((screen.getByRole("button",{name:"Export selected rows"}) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button",{name:"Export visible FASTA"}));
    expect(shared.onExportVisible).toHaveBeenCalledOnce();
    expect(container.querySelector("details")?.hasAttribute("open")).toBe(false);
  });
  it("shows motif errors in the search options", () => {
    renderToolbar({propOverrides:{motifValidationError:"Gaps are not valid in a motif."}});
    motif(); expect(screen.getByRole("alert").textContent).toContain("Gaps are not valid");
  });
  it("keeps neutral browsing information and excludes nucleotide controls", () => {
    renderToolbar({propOverrides:{analysisDisabled:true,neutralReason:"Unequal row lengths are shown without padding."}});
    expect(screen.queryByRole("option",{name:"Sequence motif"})).toBeNull();
    expect(screen.queryByText("Export consensus range")).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("Unequal row lengths");
  });
});
