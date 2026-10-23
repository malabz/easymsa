import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { LanguageProvider } from "../../lib/i18n/LanguageProvider";
import { resolvedResultStage, ResultStageNotice } from "./ResultStageControl";
afterEach(() => { cleanup(); localStorage.clear(); });
it("resolves final to the actual immutable artifact without confusing initial and refined", () => {
  const completed = {status:"completed" as const, initialAvailable:true, refinedAvailable:true};
  expect(resolvedResultStage("final", completed)).toBe("refined");
  expect(resolvedResultStage("initial", completed)).toBe("initial");
  expect(resolvedResultStage("final", {...completed,status:"failed",refinedAvailable:false})).toBe("initial");
  expect(resolvedResultStage("final", null)).toBe("final");
});
it("labels the selected initial stage correctly in English", () => {
  localStorage.setItem("easymsa.locale","en");
  render(<LanguageProvider><ResultStageNotice stage="initial" /></LanguageProvider>);
  expect(screen.getByRole("status")).toHaveTextContent(/initial/i);
  expect(screen.getByRole("status")).not.toHaveTextContent(/refined/i);
});
