import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "../../lib/i18n/LanguageProvider";
import {
  DEFAULT_ALGORITHM_PARAMETER_DRAFT,
  type AlgorithmParameterDraft
} from "../../lib/submit/algorithmParameters";
import type { AlignmentAlgorithm } from "../../lib/types/job";
import { AlgorithmParameterFields } from "./AlgorithmParameterFields";

function Harness({ algorithm }: { algorithm: AlignmentAlgorithm }) {
  const [value, setValue] = useState<AlgorithmParameterDraft>({
    ...DEFAULT_ALGORITHM_PARAMETER_DRAFT
  });

  return (
    <LanguageProvider>
      <AlgorithmParameterFields
        algorithm={algorithm}
        error={null}
        maxThreadPerJob={8}
        onChange={setValue}
        onReset={() => setValue({ ...DEFAULT_ALGORITHM_PARAMETER_DRAFT })}
        value={value}
      />
    </LanguageProvider>
  );
}

describe("AlgorithmParameterFields", () => {
  beforeEach(() => {
    window.localStorage.setItem("easymsa.locale", "en");
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("shows MAFFT-specific controls and resets user values", async () => {
    const { container } = render(<Harness algorithm="mafft" />);
    const threads = screen.getByRole("spinbutton", { name: "Threads" });
    const iterations = screen.getByRole("spinbutton", {
      name: "Maximum iterations"
    });

    expect(threads).toHaveAttribute("max", "8");
    expect(screen.getByRole("combobox", { name: "MAFFT mode" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Reorder aligned sequences/ })).toBeInTheDocument();

    fireEvent.change(threads, { target: { value: "4" } });
    fireEvent.change(iterations, { target: { value: "500" } });
    expect(threads).toHaveValue(4);
    expect(iterations).toHaveValue(500);

    fireEvent.click(screen.getByRole("button", { name: "Restore server defaults" }));
    expect(threads).toHaveValue(null);
    expect(iterations).toHaveValue(null);

    const accessibility = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } }
    });
    expect(accessibility.violations.map((violation) => violation.id)).toEqual([]);
  });

  it("hides MAFFT-only parameters for MiniPOA", () => {
    render(<Harness algorithm="minipoa" />);

    expect(screen.getByRole("spinbutton", { name: "Threads" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "MAFFT mode" })).not.toBeInTheDocument();
    expect(screen.queryByRole("spinbutton", { name: "Maximum iterations" })).not.toBeInTheDocument();
  });

  it.each(["halign3", "fmalign2_mafft", "fmalign2_halign3"] as const)(
    "shows only the thread parameter for %s",
    (algorithm) => {
      render(<Harness algorithm={algorithm} />);

      expect(screen.getByRole("spinbutton", { name: "Threads" })).toBeInTheDocument();
      expect(screen.queryByRole("combobox", { name: "MAFFT mode" })).not.toBeInTheDocument();
      expect(screen.queryByRole("spinbutton", { name: "Maximum iterations" })).not.toBeInTheDocument();
      expect(screen.queryByRole("checkbox", { name: /Reorder aligned sequences/ })).not.toBeInTheDocument();
    }
  );
});
