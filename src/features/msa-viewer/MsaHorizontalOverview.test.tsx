import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../lib/i18n/LanguageProvider";
import { MsaHorizontalOverview } from "./MsaHorizontalOverview";
import type { MinimapInput } from "./minimapData";

vi.mock("./useMinimapImages", () => ({
  useMinimapImages: () => ({ images: null, failed: false, retry: vi.fn() })
}));

function SiblingOrderHarness() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const input: MinimapInput = {
    rows: [{ id: "s1", sequence: "ACGT".repeat(13) }],
    positions: { kind: "filtered", positions: Uint32Array.from({ length: 52 }, (_, i) => i + 1), length: 52 },
    scheme: "nucleotide",
    store: null
  };
  return (
    <LanguageProvider>
      <MsaHorizontalOverview input={input} scrollRef={scrollRef} pitch={14} labelWidth={120} />
      <div ref={scrollRef} data-testid="matrix-scroller" />
    </LanguageProvider>
  );
}

beforeEach(() => {
  window.localStorage.setItem("easymsa.locale", "en");
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1000);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("MsaHorizontalOverview", () => {
  it("measures visible column range even when mounted before its sibling scrollRef element", async () => {
    render(<SiblingOrderHarness />);
    await waitFor(() => {
      expect(screen.getByRole("slider", { name: "Horizontal overview" })).toHaveAttribute(
        "aria-valuetext",
        "Visible columns 1–52"
      );
    });
  });
});
