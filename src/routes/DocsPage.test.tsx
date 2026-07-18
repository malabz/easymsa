import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor
} from "@testing-library/react";
import axe from "axe-core";
import { useLocation, MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../lib/i18n/LanguageProvider";
import { DocsPage } from "./DocsPage";

class IntersectionObserverMock implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds = [];
  disconnect = vi.fn();
  observe = vi.fn();
  takeRecords = vi.fn(() => []);
  unobserve = vi.fn();
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location-search">{location.search}</output>;
}

function renderDocs(entry = "/docs") {
  return render(
    <LanguageProvider>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route
            path="/docs"
            element={
              <>
                <DocsPage />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </LanguageProvider>
  );
}

describe("DocsPage", () => {
  let scrollIntoView: ReturnType<typeof vi.fn>;
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.localStorage.setItem("easymsa.locale", "en");
    scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView
    });
    vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText }
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("renders the complete center and opens an initial section deep link", async () => {
    const { container } = renderDocs("/docs?section=msa-viewer");

    expect(screen.getByRole("heading", { level: 1, name: "Documentation" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "MSA Viewer" })).toBeInTheDocument();
    expect(screen.getAllByRole("navigation", { name: "Documentation sections" })).toHaveLength(2);
    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
    });
    expect(screen.getByTestId("location-search")).toHaveTextContent("?section=msa-viewer");

    const accessibility = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } }
    });
    expect(accessibility.violations.map((violation) => violation.id)).toEqual([]);
  });

  it("searches content, handles empty results, and focuses with Ctrl+K", async () => {
    renderDocs();
    const search = screen.getByRole("searchbox", { name: "Search documentation" });

    fireEvent.keyDown(window, { ctrlKey: true, key: "k" });
    expect(search).toHaveFocus();

    fireEvent.change(search, { target: { value: "IUPAC motif" } });
    const result = screen.getByRole("button", { name: /Navigation, zoom, and search/ });
    expect(result).toBeInTheDocument();
    fireEvent.click(result);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    await waitFor(() => {
      expect(screen.getByTestId("location-search")).toHaveTextContent("?section=msa-viewer");
    });

    fireEvent.change(search, { target: { value: "no-such-document-term" } });
    expect(screen.getByText("No matching documentation")).toBeInTheDocument();
    fireEvent.keyDown(search, { key: "Escape" });
    expect(search).toHaveValue("");
  });

  it("navigates sections and copies a FASTA example", async () => {
    renderDocs();

    fireEvent.click(
      screen.getAllByRole("button", { name: /Results and downloads/ })[0]
    );
    await waitFor(() => {
      expect(screen.getByTestId("location-search")).toHaveTextContent(
        "?section=results-downloads"
      );
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Copy example: FASTA example" })
    );
    await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
    expect(writeText.mock.calls[0][0]).toContain(">reference_sequence");
    expect(await screen.findByText("Copied")).toBeInTheDocument();
    expect(document.querySelectorAll("details[data-docs-faq='true']")).toHaveLength(6);
  });

  it("opens an FAQ answer selected from search", () => {
    renderDocs();
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search documentation" }),
      { target: { value: "lost token" } }
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Can I restore a task after losing its token/ })
    );

    expect(document.querySelector("#docs-article-lost-token")).toHaveAttribute("open");
  });

  it("exposes all three product entry routes", () => {
    renderDocs();
    expect(screen.getByRole("link", { name: /Submit a task/ })).toHaveAttribute("href", "/submit");
    expect(screen.getByRole("link", { name: /Open local viewer/ })).toHaveAttribute("href", "/viewer");
    expect(screen.getByRole("link", { name: /Restore a task/ })).toHaveAttribute("href", "/lookup");
  });
});
