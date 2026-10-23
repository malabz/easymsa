import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "../lib/i18n/LanguageProvider";
import { methods } from "../lib/methods";
import { AboutPage } from "./AboutPage";

describe("AboutPage method presentation", () => {
  afterEach(() => { cleanup(); localStorage.clear(); });

  it.each(["en", "zh"] as const)("keeps canonical method names, publications and optional versions in %s", (locale) => {
    localStorage.setItem("easymsa.locale", locale);
    render(<LanguageProvider><MemoryRouter><AboutPage /></MemoryRouter></LanguageProvider>);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(locale === "zh" ? "关于 EasyMSA" : "About EasyMSA");
    for (const method of methods) {
      const heading = screen.getByRole("heading", { level: 3, name: method.name });
      const article = heading.closest("article")!;
      const version = article.querySelector("details")!;
      expect(version).not.toHaveAttribute("open");
      expect(version.querySelector("summary")).toHaveTextContent(locale === "zh" ? "部署版本" : "Deployed version");
      expect(within(article).getByRole("link", { name: method.title })).toHaveAttribute("href", method.paper);
      expect(within(article).getByText(method.journal, { exact: true })).toBeVisible();
      expect(within(article).getByRole("link", { name: locale === "zh" ? "软件与文档" : "Software & docs" })).toHaveAttribute("href", method.source);
      if ("additionalPapers" in method) {
        for (const paper of method.additionalPapers) {
          expect(within(article).getByRole("link", { name: paper.title })).toHaveAttribute("href", paper.paper);
          expect(within(article).getByText(paper.journal, { exact: true })).toBeVisible();
        }
      }
    }
    expect(screen.queryByRole("heading", { name: /MiniPOA|HAlign[ -][34]/ })).not.toBeInTheDocument();
  });
});
