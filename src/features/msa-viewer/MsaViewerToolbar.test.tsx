import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../lib/i18n/LanguageProvider";
import { MsaViewerToolbar } from "./MsaViewerToolbar";
import { createInitialViewerState } from "./useViewerState";

describe("MsaViewerToolbar", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("easymsa.locale", "en");
  });

  it("exposes and opens the advanced controls with a stable accessible toggle", () => {
    const callback = vi.fn();
    const { container } = render(
      <LanguageProvider>
        <MsaViewerToolbar
          alignmentLength={100}
          canExport
          canExportSelectedRows={false}
          hiddenCount={0}
          isSearchingMotif={false}
          jumpPosition=""
          motifMatchCount={0}
          motifMatches={[]}
          motifMatchesTruncated={false}
          onExportConsensusRange={callback}
          onExportImage={callback}
          onExportSelectedRange={callback}
          onExportSelectedRows={callback}
          onExportVisible={callback}
          onJump={callback}
          onJumpPositionChange={callback}
          onMotifNavigate={callback}
          onMotifSelect={callback}
          onOpenInspector={callback}
          onPatch={callback}
          onShowAll={callback}
          onToggleTrack={callback}
          onZoom={callback}
          selectedRowCount={0}
          state={createInitialViewerState("toolbar-test")}
          totalSequenceCount={3}
          visibleColumnCount={100}
          visibleSequenceCount={3}
        />
      </LanguageProvider>
    );

    fireEvent.click(screen.getByLabelText("Advanced view and export"));
    expect(container.querySelector("details")?.open).toBe(true);
  });
});
