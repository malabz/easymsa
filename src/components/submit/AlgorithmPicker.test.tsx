import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../lib/i18n/LanguageProvider";
import type { AlignmentAlgorithm } from "../../lib/types/job";
import { AlgorithmPicker } from "./AlgorithmPicker";

function Harness() {
  const [value, setValue] = useState<AlignmentAlgorithm>("auto");
  return (
    <LanguageProvider>
      <AlgorithmPicker
        isDisabled={() => false}
        onChange={setValue}
        value={value}
      />
    </LanguageProvider>
  );
}

function renderPicker(overrides: Partial<Parameters<typeof AlgorithmPicker>[0]> = {}) {
  const onChange = vi.fn();
  render(
    <LanguageProvider>
      <AlgorithmPicker
        isDisabled={() => false}
        onChange={onChange}
        value="auto"
        {...overrides}
      />
    </LanguageProvider>
  );
  return { onChange };
}

describe("AlgorithmPicker", () => {
  beforeEach(() => {
    window.localStorage.setItem("easymsa.locale", "en");
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("renders all six methods with the adaptive badge on auto", () => {
    renderPicker();

    expect(screen.getAllByRole("radio")).toHaveLength(6);
    expect(screen.getByRole("radio", { name: /Auto \(adaptive\)/ })).toBeChecked();
    expect(screen.getByText("Recommended · Adaptive")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /HAlign4/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /FMAlign2 \+ MAFFT/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /FMAlign2 \+ HAlign3/ })).toBeInTheDocument();
  });

  it("shows data-fit guidance and updates it when the method changes", () => {
    render(<Harness />);

    expect(screen.getByText(/fits the adaptive training domain/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /HAlign4/ }));
    expect(screen.getByText(/Ultra-large, globally similar DNA\/RNA/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /FMAlign2 \+ MAFFT/ }));
    expect(screen.getByText(/Accelerated pipeline for large datasets/i)).toBeInTheDocument();
  });

  it("disables unavailable methods and reports changes", () => {
    const { onChange } = renderPicker({
      isDisabled: (value) => value === "halign3",
      value: "minipoa"
    });

    const halign3 = screen.getByRole("radio", { name: /HAlign4/ });
    expect(halign3).toBeDisabled();

    fireEvent.click(screen.getByRole("radio", { name: /MAFFT/ }));
    expect(onChange).toHaveBeenCalledWith("mafft");
  });
});
