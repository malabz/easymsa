import { describe, expect, it } from "vitest";
import {
  DOCS_SECTION_IDS,
  docsContent,
  flattenDocsText
} from "./content";
import { searchDocs } from "./search";
import { viewerWorkflowEn, viewerWorkflowZh } from "../i18n/viewerWorkflow";

describe("documentation content", () => {
  it("keeps stable section and article IDs across languages", () => {
    const ids = (locale: "zh" | "en") =>
      docsContent[locale].map((section) => ({
        id: section.id,
        articles: section.articles.map((article) => article.id)
      }));

    expect(docsContent.zh.map((section) => section.id)).toEqual(DOCS_SECTION_IDS);
    expect(ids("zh")).toEqual(ids("en"));
  });

  it("documents current input and alignment preview boundaries", () => {
    for (const locale of ["zh", "en"] as const) {
      const text = flattenDocsText(docsContent[locale]);
      expect(text).toContain("200,000");
      expect(text).toContain("100 MB");
      expect(text).toContain(locale === "zh" ? "固定" : "No fixed");

      expect(text).toContain("2,000");
      expect(text).toMatch(/IUPAC/i);
      expect(text).toMatch(/reference/i);
      expect(text).toMatch(/SVG/);
      expect(text).toMatch(/PNG/);
      expect(text).toMatch(/thread/);
      expect(text).toMatch(/maxiterate/);
      expect(text).toMatch(/策略|strategy/);
      expect(text).toMatch(/输出顺序|output order/);
    }
  });

  it("searches titles, body text, and keywords in both languages", () => {
    expect(searchDocs(docsContent.en, "IUPAC motif")).toEqual(expect.arrayContaining([expect.objectContaining({
      sectionId: "msa-viewer",
      articleId: "navigate-search"
    })]));
    expect(searchDocs(docsContent.zh, "访问 token")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sectionId: "status-access",
          articleId: "access-credentials"
        })
      ])
    );
    expect(searchDocs(docsContent.en, "query-that-does-not-exist")).toEqual([]);
  });

  it.each(["zh", "en"] as const)("uses the current viewer action names in %s instructions", (locale) => {
    const labels = locale === "zh" ? viewerWorkflowZh : viewerWorkflowEn;
    const section = docsContent[locale].find(item => item.id === "msa-viewer")!;
    // Search aliases may retain historic names, but visible instructions must
    // describe the controls users can currently find in the viewer.
    const visibleText = flattenDocsText([{
      ...section,
      keywords: [],
      articles: section.articles.map(article => ({ ...article, keywords: [] }))
    }]);
    for (const label of [labels.compare, labels.display, labels.checks, labels.showMatches,
      labels.saveView, labels.downloadSequences, labels.exportImage]) {
      expect(visibleText).toContain(label);
    }
    expect(visibleText).not.toMatch(/\bQC\b|rowKey|neutral|Analysis inspector|分析检查器|工作区设置|导出可见 FASTA/);
    expect(visibleText).toContain(locale === "zh"
      ? "统计默认使用全部序列；隐藏和筛选不会自动改变统计范围"
      : "Statistics default to all sequences; display filters do not change their scope automatically");
  });
});
