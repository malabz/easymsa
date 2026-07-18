import "@testing-library/jest-dom/vitest";
import axe from "axe-core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "../../lib/i18n/LanguageProvider";
import type { InputMethod } from "../../lib/types/job";
import { InputMethodTabs } from "./InputMethodTabs";

function Harness() {
  const [value, setValue] = useState<InputMethod>("paste");
  return (
    <>
      <InputMethodTabs onChange={setValue} value={value} />
      <div id="input-panel-paste" role="tabpanel" />
      <div id="input-panel-upload" role="tabpanel" />
    </>
  );
}

describe("InputMethodTabs", () => {
  it("exposes tab state and supports switching input methods", async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <Harness />
      </LanguageProvider>
    );

    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    await user.click(tabs[1]);
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
  });

  it("has no serious or critical accessibility violations", async () => {
    const { container } = render(
      <LanguageProvider>
        <Harness />
      </LanguageProvider>
    );
    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } }
    });
    const seriousViolations = results.violations.filter((violation) =>
      violation.impact === "serious" || violation.impact === "critical"
    );
    expect(seriousViolations).toEqual([]);
  });
});
