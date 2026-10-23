import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { LanguageProvider } from "../../lib/i18n/LanguageProvider";
import { getDownloadFiles } from "../../lib/api/results";
import { DownloadPanel } from "./DownloadPanel";
afterEach(cleanup);
it("uses localized download descriptions and no invented file size", () => {
  localStorage.setItem("easymsa.locale", "zh");
  render(<LanguageProvider><DownloadPanel files={getDownloadFiles("test", "test-key", "initial")} /></LanguageProvider>);
  expect(screen.getByText("完整结果包")).toBeVisible();
  expect(screen.queryByText("remote")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "下载 alignment.fasta.gz.xz" })).not.toBeVisible();
  fireEvent.click(screen.getByText("其他压缩格式"));
  expect(screen.getAllByRole("link")).toHaveLength(3);
  expect(screen.getByRole("link", { name: "下载 alignment.fasta.gz.xz" })).toBeVisible();
  for (const link of screen.getAllByRole("link")) expect(link.getAttribute("href")).toContain("stage=initial");
});
