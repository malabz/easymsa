import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../lib/i18n/LanguageProvider";
import { TASK_STORAGE_KEYS, VIEWER_STORAGE_KEYS } from "../lib/storage";
import { PrivacyPage } from "./PrivacyPage";

function renderPrivacy(locale: "en" | "zh" = "en") {
  localStorage.setItem("easymsa.locale", locale);
  [...TASK_STORAGE_KEYS, ...VIEWER_STORAGE_KEYS, "other-application"].forEach(key => localStorage.setItem(key, "preserve"));
  return render(<LanguageProvider><MemoryRouter><PrivacyPage /></MemoryRouter></LanguageProvider>);
}

describe("PrivacyPage local record controls", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

  it.each(["en", "zh"] as const)("uses saved-view vocabulary and describes local-only drafts in %s", (locale) => {
    const { container } = renderPrivacy(locale);
    expect(screen.getByRole("button", { name: locale === "zh" ? "清除查看记录" : "Clear saved views" })).toBeVisible();
    expect(container.textContent).toContain(locale === "zh" ? "输入草稿只在当前页面会话中保留" : "Input drafts are kept only in the current page session");
    expect(container.textContent).not.toMatch(/viewer workspace|查看器工作区|localStorage|rowKey/);
  });

  it("requires confirmation and cancellation keeps all records", () => {
    renderPrivacy();
    fireEvent.click(screen.getByRole("button", { name: "Clear local job records" }));
    expect(screen.getByRole("alert")).toHaveTextContent("This cannot be undone");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    [...TASK_STORAGE_KEYS, ...VIEWER_STORAGE_KEYS, "other-application"].forEach(key => expect(localStorage.getItem(key)).toBe("preserve"));
  });

  it.each(["tasks", "viewer"] as const)("clears only confirmed %s records, preserving language and unrelated data", (kind) => {
    renderPrivacy();
    fireEvent.click(screen.getByRole("button", { name: kind === "tasks" ? "Clear local job records" : "Clear saved views" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm clear" }));
    const cleared = kind === "tasks" ? TASK_STORAGE_KEYS : VIEWER_STORAGE_KEYS;
    const preserved = kind === "tasks" ? VIEWER_STORAGE_KEYS : TASK_STORAGE_KEYS;
    cleared.forEach(key => expect(localStorage.getItem(key)).toBeNull());
    [...preserved, "other-application"].forEach(key => expect(localStorage.getItem(key)).toBe("preserve"));
    expect(localStorage.getItem("easymsa.locale")).toBe("en");
    expect(screen.getByRole("status")).toHaveTextContent("Selected local records were cleared.");
  });
});
