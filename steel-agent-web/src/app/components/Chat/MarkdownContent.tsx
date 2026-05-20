"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={cn("break-words", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="text-[15px] leading-[1.6] text-steel-body m-0 mb-1">
              {children}
            </p>
          ),
          li: ({ children }) => (
            <li className="text-[15px] leading-[1.6] text-steel-body m-0 mb-0 list-outside">
              {children}
            </li>
          ),
          ul: ({ children }) => (
            <ul className="m-0 p-0 pl-4 list-disc">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="m-0 p-0 pl-5">{children}</ol>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-steel-ink">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic">{children}</em>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-steel-ink underline"
            >
              {children}
            </a>
          ),
          pre: ({ children }) => (
            <pre className="bg-steel-surface rounded-lg px-3 py-2 my-1 overflow-x-auto border border-steel-line text-[13px] leading-[1.5]">
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
                    codeClassName
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
          table: ({ children }) => (
            <table className="w-full table-auto border-collapse my-1 mb-2 text-[14px]">
              {children}
            </table>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-steel-line">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="text-left px-2 py-1.5 text-steel-muted font-medium text-[12px] tracking-[0.18em] uppercase">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-2 py-1 text-steel-body">{children}</td>
          ),
          tr: ({ children, ...props }: any) => {
            const isEven = (props.index ?? 0) % 2 === 0;
            return (
              <tr
                className={`border-b border-steel-line last:border-b-0 ${isEven ? "" : "bg-steel-surface/50"}`}
              >
                {children}
              </tr>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-steel-line pl-3 my-1 text-steel-muted">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="border-steel-line my-1" />,
          h1: ({ children }) => (
            <h1 className="text-[20px] text-steel-ink font-medium mt-2 mb-1.5">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-[18px] text-steel-ink font-medium mt-2 mb-1.5">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[16px] text-steel-ink font-medium mt-2 mb-1.5">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-[15px] text-steel-ink font-medium mt-2 mb-1.5">
              {children}
            </h4>
          ),
          h5: ({ children }) => (
            <h5 className="text-[14px] text-steel-ink font-medium mt-2 mb-1.5">
              {children}
            </h5>
          ),
          h6: ({ children }) => (
            <h6 className="text-[13px] text-steel-ink font-medium mt-2 mb-1.5">
              {children}
            </h6>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export { MarkdownContent };
export default MarkdownContent;
