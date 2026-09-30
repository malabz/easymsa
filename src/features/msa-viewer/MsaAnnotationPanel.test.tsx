import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../lib/i18n/LanguageProvider";
import { MsaAnnotationPanel } from "./MsaAnnotationPanel";

describe("MsaAnnotationPanel", () => {
  beforeEach(() => window.localStorage.setItem("easymsa.locale", "en"));

  it("creates a review marker for the active row and interval", () => {
    const onCreate = vi.fn();
    render(
      <LanguageProvider>
        <MsaAnnotationPanel
        activeTarget={{ rowKey: "row-2", start: 4, end: 8 }}
        annotations={[]}
        onCreate={onCreate}
        onDelete={() => undefined}
        onJump={() => undefined}
        onUpdate={() => undefined}
        rowLabels={new Map([["row-2", "duplicate header"]])}
        />
      </LanguageProvider>
    );
    fireEvent.change(screen.getByLabelText("New annotation: Category"), {
      target: { value: "review" }
    });
    fireEvent.change(screen.getByLabelText("New annotation: Note"), {
      target: { value: "inspect this region" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(onCreate).toHaveBeenCalledWith(
      "review",
      "inspect this region",
      { rowKey: "row-2", start: 4, end: 8 }
    );
  });
});
