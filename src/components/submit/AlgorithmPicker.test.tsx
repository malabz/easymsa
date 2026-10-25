import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../lib/i18n/LanguageProvider";
import type { AlignmentAlgorithm } from "../../lib/types/job";
import { AlgorithmPicker } from "./AlgorithmPicker";

function Harness({ compact = false }: { compact?: boolean }) {
  const [value, setValue] = useState<AlignmentAlgorithm>("auto");
  return (
    <LanguageProvider>
      <AlgorithmPicker
        isDisabled={() => false}
        onChange={setValue}
        value={value}
        compact={compact}
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

  it("renders all five methods with the adaptive badge on auto", () => {
    renderPicker();

    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(screen.getByRole("radio", { name: /Auto/ })).toBeChecked();
    expect(screen.getByText("Recommended")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /^MiniPOA/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /^HAlign-5/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /^FMAlign2 \+ MAFFT/ })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /FMAlign2 \+ HAlign/ })).not.toBeInTheDocument();
  });

  it("shows data-fit guidance and updates it when the method changes", () => {
    render(<Harness />);

    expect(screen.getByText(/supported range and default handling depend on the current server configuration/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /^HAlign/ }));
    expect(screen.getByText(/Native high-speed alignment for ultra-large DNA\/RNA/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /^FMAlign2/ }));
    expect(screen.getByText(/Accelerated alignment for large datasets/i)).toBeInTheDocument();
  });

  it("disables unavailable methods and reports changes", () => {
    const { onChange } = renderPicker({
      isDisabled: (value) => value === "halign3",
      value: "minipoa"
    });

    const halign3 = screen.getByRole("radio", { name: /^HAlign/ });
    expect(halign3).toBeDisabled();

    fireEvent.click(screen.getByRole("radio", { name: /^MAFFT/ }));
    expect(onChange).toHaveBeenCalledWith("mafft");
  });

  it.each([
    ["zh", "Auto 的适用范围与默认处理", "超出适用范围时，服务器按默认策略处理"],
    ["en", "Auto: supported range and defaults", "Outside that range, the server applies its default strategy"]
  ] as const)("offers expandable Auto guidance in the compact %s picker", (locale, title, defaultText) => {
    window.localStorage.setItem("easymsa.locale", locale);
    render(<Harness compact />);

    const select = screen.getByRole("combobox");
    const summary = screen.getByText(title);
    const details = summary.closest("details");
    expect(details).not.toHaveAttribute("open");
    expect(select).toHaveAccessibleDescription();
    fireEvent.click(summary);
    expect(details).toHaveAttribute("open");
    expect(screen.getByText((text) => text.startsWith(defaultText))).toBeVisible();

    fireEvent.change(select, { target: { value: "mafft" } });
    expect(screen.queryByText(title)).not.toBeInTheDocument();
    expect(select).toHaveValue("mafft");
  });

  it("preserves API values and unavailable states behind the compact method names", () => {
    const { onChange } = renderPicker({ compact: true, isDisabled: (value) => value === "halign3" });

    expect(screen.getByRole("option", { name: "MiniPOA" })).toHaveValue("minipoa");
    expect(screen.getByRole("option", { name: "HAlign-5" })).toBeDisabled();
    expect(screen.getByRole("option", { name: "FMAlign2 + MAFFT" })).toHaveValue("fmalign2_mafft");
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "fmalign2_mafft" } });
    expect(onChange).toHaveBeenCalledWith("fmalign2_mafft");
  });
});
