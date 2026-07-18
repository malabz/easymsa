import { describe, expect, it } from "vitest";
import {
  DOCS_SECTION_IDS,
  docsContent,
  flattenDocsText
} from "./content";
import { searchDocs } from "./search";

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
      expect(text).toContain("1 MB");
      expect(text).toContain("500");
      expect(text).toContain("10,000");
      expect(text).toMatch(/IUPAC/i);
      expect(text).toMatch(/reference/i);
      expect(text).toMatch(/SVG/);
      expect(text).toMatch(/PNG/);
    }
  });

  it("searches titles, body text, and keywords in both languages", () => {
    expect(searchDocs(docsContent.en, "IUPAC motif")[0]).toMatchObject({
      sectionId: "msa-viewer",
      articleId: "navigate-search"
    });
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
});
