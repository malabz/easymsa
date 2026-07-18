import type { DocsArticle, DocsSection, DocsSectionId } from "./content";
import { articleSearchText } from "./content";

export type DocsSearchResult = {
  sectionId: DocsSectionId;
  articleId: string;
  sectionTitle: string;
  articleTitle: string;
  summary: string;
};

function normalized(value: string) {
  return value.trim().toLocaleLowerCase();
}

function scoreResult(section: DocsSection, article: DocsArticle, terms: string[]) {
  const sectionTitle = normalized(section.title);
  const articleTitle = normalized(article.title);
  const keywords = normalized([...section.keywords, ...article.keywords].join(" "));
  const allText = normalized(articleSearchText(section, article));

  if (!terms.every((term) => allText.includes(term))) return -1;

  return terms.reduce((score, term) => {
    if (articleTitle.includes(term)) return score + 8;
    if (sectionTitle.includes(term)) return score + 5;
    if (keywords.includes(term)) return score + 3;
    return score + 1;
  }, 0);
}

export function searchDocs(sections: DocsSection[], query: string, limit = 12): DocsSearchResult[] {
  const terms = normalized(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];

  return sections
    .flatMap((section) => section.articles.map((article) => ({ article, score: scoreResult(section, article, terms), section })))
    .filter((result) => result.score >= 0)
    .sort((left, right) => right.score - left.score || left.section.title.localeCompare(right.section.title) || left.article.title.localeCompare(right.article.title))
    .slice(0, limit)
    .map(({ article, section }) => ({
      sectionId: section.id,
      articleId: article.id,
      sectionTitle: section.title,
      articleTitle: article.title,
      summary: article.summary
    }));
}
