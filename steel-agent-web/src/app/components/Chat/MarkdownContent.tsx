"use client";

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface MarkdownContentProps {
  content: string;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const RISK_DISCLAIMER = "仅供参考，不构成投资建议";

/* ------------------------------------------------------------------ */
/*  Markdown render components                                        */
/* ------------------------------------------------------------------ */

const markdownComponents: Components = {
  p: ({ children, ...props }) => (
    <p className="text-[15px] leading-[1.6] text-steel-ink m-0 mb-1" {...props}>
      {children}
    </p>
  ),
  li: ({ children, ...props }) => (
    <li className="text-[15px] leading-[1.6] text-steel-ink m-0 mb-0 list-outside" {...props}>
      {children}
    </li>
  ),
  ul: ({ children, ...props }) => (
    <ul className="m-0 p-0 pl-4 list-disc" {...props}>{children}</ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="m-0 p-0 pl-5" {...props}>{children}</ol>
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-semibold text-steel-ink" {...props}>{children}</strong>
  ),
  em: ({ children, ...props }) => (
    <em className="italic" {...props}>{children}</em>
  ),
  a: ({ href, children, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-steel-ink underline"
      {...props}
    >
      {children}
    </a>
  ),
  pre: ({ children, ...props }) => (
    <pre className="bg-steel-surface rounded-lg px-3 py-2 my-1 overflow-x-auto border border-steel-line text-[13px] leading-[1.5]" {...props}>
      {children}
    </pre>
  ),
  code: ({ className: codeClassName, children, ...props }) => {
    const isBlock = codeClassName?.startsWith("language-");
    if (isBlock) {
      return (
        <code
          className={cn(
            "bg-transparent p-0 text-[13px] leading-[1.5] text-steel-body",
            codeClassName,
          )}
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className="bg-steel-surface px-[4px] py-[1px] rounded text-[13px] font-mono text-steel-body"
        {...props}
      >
        {children}
      </code>
    );
  },
  table: ({ children, ...props }) => (
    <table className="w-full table-auto border-collapse my-1 mb-2 text-[14px]" {...props}>
      {children}
    </table>
  ),
  thead: ({ children, ...props }) => (
    <thead className="border-b border-steel-line" {...props}>{children}</thead>
  ),
  th: ({ children, ...props }) => (
    <th className="text-left px-2 py-1.5 text-steel-muted font-medium text-[12px] tracking-[0.18em] uppercase" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="px-2 py-1 text-steel-body" {...props}>{children}</td>
  ),
  tr: ({ children, ...props }) => (
    <tr className="border-b border-steel-line last:border-b-0 [&:nth-child(even)]:bg-steel-surface/50" {...props}>
      {children}
    </tr>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote className="border-l-2 border-steel-line pl-3 my-1 text-steel-muted" {...props}>
      {children}
    </blockquote>
  ),
  hr: (props) => <hr className="border-steel-line my-1" {...props} />,
  h1: ({ children, ...props }) => (
    <h1 className="text-[20px] text-steel-ink font-medium mt-2 mb-1.5" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 className="text-[18px] text-steel-ink font-medium mt-2 mb-1.5" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="text-[16px] text-steel-ink font-medium mt-2 mb-1.5" {...props}>
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4 className="text-[15px] text-steel-ink font-medium mt-2 mb-1.5" {...props}>
      {children}
    </h4>
  ),
  h5: ({ children, ...props }) => (
    <h5 className="text-[14px] text-steel-ink font-medium mt-2 mb-1.5" {...props}>
      {children}
    </h5>
  ),
  h6: ({ children, ...props }) => (
    <h6 className="text-[13px] text-steel-ink font-medium mt-2 mb-1.5" {...props}>
      {children}
    </h6>
  ),
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function formatDisclaimerTime(updatedAt?: string): string {
  if (!updatedAt) return "";

  const trimmed = updatedAt.trim();

  // Pure time, e.g. "14:32"
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    return `数据更新至 ${trimmed}，`;
  }

  // DateTime string — try to extract time portion
  const timeMatch = trimmed.match(/(\d{1,2}:\d{2})/);
  if (timeMatch) {
    return `数据更新至 ${timeMatch[1]}，`;
  }

  return "";
}

function parseSegments(content: string): { type: "text"; content: string }[] {
  return [{ type: "text", content }];
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

function MarkdownContent({ content, className }: MarkdownContentProps) {
  const segments = useMemo(() => parseSegments(content), [content]);

  return (
    <div className={cn("break-words", className)}>
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return (
            <ReactMarkdown
              key={`text-${index}`}
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {segment.content}
            </ReactMarkdown>
          );
        }
        return null;
      })}
    </div>
  );
}

export { MarkdownContent };
export default MarkdownContent;
