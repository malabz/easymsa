import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../lib/i18n/LanguageProvider";
import { ResultPanels } from "./ResultPanels";

describe("ResultPanels immersive loading and errors", () => {
  beforeEach(() => localStorage.setItem("easymsa.locale", "en"));
  afterEach(cleanup);
  for (const error of [null, "Alignment unavailable"]) {
    it(`keeps a return route while ${error ? "failed" : "loading"}`, () => {
      const onReturn = vi.fn();
      const retry = vi.fn();
      const { container } = render(<LanguageProvider><ResultPanels activeTab="alignment" setActiveTab={onReturn}
        sourceName="Validation example" summaryPending={false} alignmentPending={!error}
        alignmentError={error} files={[]} onRetry={retry}/></LanguageProvider>);
      expect(container.querySelector("[data-msa-workspace-shell]")).toHaveAttribute("data-msa-workspace-mode", "immersive");
      expect(screen.getByText("Validation example")).toBeVisible();
      if (error) {
        expect(screen.getByRole("alert")).toHaveTextContent(error);
        fireEvent.click(screen.getByRole("button", {name:"Retry"}));
        expect(retry).toHaveBeenCalledOnce();
      }
      fireEvent.click(screen.getByRole("button", {name:"Back to results"}));
      expect(onReturn).toHaveBeenCalledWith("overview");
    });
  }
});
