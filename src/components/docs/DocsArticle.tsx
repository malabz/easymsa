import {
  Check,
  ChevronDown,
  Copy,
  Info,
  Lightbulb,
  TriangleAlert
} from "lucide-react";
import { useState } from "react";
import type { DocsArticle as DocsArticleType, DocsBlock } from "../../lib/docs/content";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { copyText } from "../../lib/utils/clipboard";
import { Button } from "../common/Button";

const calloutStyles = {
  info: {
    className: "border-sky-200 bg-sky-50 text-sky-950",
    icon: Info,
    iconClassName: "text-sky-700"
  },
  tip: {
    className: "border-teal-200 bg-teal-50 text-teal-950",
    icon: Lightbulb,
    iconClassName: "text-teal-700"
  },
  warning: {
    className: "border-amber-200 bg-amber-50 text-amber-950",
    icon: TriangleAlert,
    iconClassName: "text-amber-700"
  }
} as const;

function DocsCodeBlock({ block }: { block: Extract<DocsBlock, { type: "code" }> }) {
  const { dictionary: d } = useLanguage();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  async function copyCode() {
    try {
      await copyText(block.code);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <figure className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
      <figcaption className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-2.5 text-xs text-slate-300">
        <span>{block.label}</span>
        <Button
          aria-label={`${d.docs.copyCode}: ${block.label}`}
          className="h-8 border-slate-600 bg-slate-900 px-2.5 text-slate-200 hover:border-teal-400 hover:text-white"
          onClick={copyCode}
          size="sm"
          variant="outline"
        >
          {copyState === "copied" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copyState === "copied"
            ? d.docs.copiedCode
            : copyState === "failed"
              ? d.docs.copyFailed
              : d.docs.copyCode}
        </Button>
      </figcaption>
      <pre className="overflow-x-auto p-4 text-sm leading-6 text-slate-100">
        <code className="font-mono" data-language={block.language}>{block.code}</code>
      </pre>
    </figure>
  );
}

function DocsBlockView({ block }: { block: DocsBlock }) {
  if (block.type === "paragraph") {
    return <p className="text-sm leading-7 text-slate-600">{block.text}</p>;
  }

  if (block.type === "list") {
    return (
      <ul className="space-y-2 text-sm leading-7 text-slate-600">
        {block.items.map((item) => (
          <li className="flex gap-3" key={item}>
            <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (block.type === "steps") {
    return (
      <ol className="grid gap-3 sm:grid-cols-2">
        {block.items.map((item, index) => (
          <li className="rounded-xl border border-slate-200 bg-slate-50/70 p-4" key={item.title}>
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-xs font-semibold text-white">
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{item.body}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    );
  }

  if (block.type === "code") {
    return <DocsCodeBlock block={block} />;
  }

  if (block.type === "callout") {
    const style = calloutStyles[block.tone];
    const Icon = style.icon;
    return (
      <aside className={`rounded-xl border p-4 ${style.className}`}>
        <div className="flex gap-3">
          <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${style.iconClassName}`} />
          <div>
            <p className="text-sm font-semibold">{block.title}</p>
            <p className="mt-1 text-sm leading-6 opacity-90">{block.body}</p>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="bg-slate-100 text-slate-700">
          <tr>
            {block.headers.map((header) => (
              <th className="whitespace-nowrap border-b border-slate-200 px-4 py-3 font-semibold" key={header} scope="col">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {block.rows.map((row, rowIndex) => (
            <tr key={`${rowIndex}:${row.join(":")}`}>
              {row.map((cell, cellIndex) => (
                <td className={`min-w-40 px-4 py-3 align-top leading-6 text-slate-600 ${cellIndex === 0 ? "font-medium text-slate-900" : ""}`} key={`${cellIndex}:${cell}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ArticleBlocks({ blocks }: { blocks: DocsBlock[] }) {
  return (
    <div className="mt-4 space-y-5">
      {blocks.map((block, index) => (
        <DocsBlockView block={block} key={`${block.type}:${index}`} />
      ))}
    </div>
  );
}

export function DocsArticle({ article }: { article: DocsArticleType }) {
  const articleId = `docs-article-${article.id}`;

  if (article.collapsible) {
    return (
      <details
        className="group scroll-mt-24 rounded-xl border border-slate-200 bg-white open:border-teal-200 open:shadow-sm"
        data-docs-faq="true"
        id={articleId}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left">
          <span>
            <span aria-level={3} className="block text-base font-semibold text-slate-950" role="heading">
              {article.title}
            </span>
            <span className="mt-1 block text-sm leading-6 text-slate-600">{article.summary}</span>
          </span>
          <ChevronDown aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-500 transition group-open:rotate-180" />
        </summary>
        <div className="border-t border-slate-200 px-5 pb-5">
          <ArticleBlocks blocks={article.blocks} />
        </div>
      </details>
    );
  }

  return (
    <article className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/30 sm:p-6" id={articleId}>
      <h3 className="text-lg font-semibold text-slate-950">{article.title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-600">{article.summary}</p>
      <ArticleBlocks blocks={article.blocks} />
    </article>
  );
}
