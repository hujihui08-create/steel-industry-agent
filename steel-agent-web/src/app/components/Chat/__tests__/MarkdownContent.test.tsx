// ============================================================
// MarkdownContent 单元测试
//
// 覆盖场景：
//   1. 纯文本渲染
//   2. 加粗文本渲染
//   3. 行内代码渲染
//   4. 无序列表渲染
//   5. 链接渲染
//   6. 标题渲染
// ============================================================

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarkdownContent } from "@/app/components/Chat/MarkdownContent";

describe("MarkdownContent", () => {
  it("renders plain text", () => {
    render(<MarkdownContent content="Hello World" />);
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("renders bold text", () => {
    render(<MarkdownContent content="**Bold Text**" />);
    expect(screen.getByText("Bold Text")).toBeInTheDocument();
  });

  it("renders inline code", () => {
    render(<MarkdownContent content="Use `const x = 1` syntax" />);
    expect(screen.getByText("const x = 1")).toBeInTheDocument();
  });

  it("renders unordered list with single item", () => {
    render(<MarkdownContent content="- Single item" />);
    expect(screen.getByText("Single item")).toBeInTheDocument();
  });

  it("renders link", () => {
    render(<MarkdownContent content="[Click here](https://example.com)" />);
    const link = screen.getByText("Click here");
    expect(link).toBeInTheDocument();
    expect(link.tagName).toBe("A");
  });

  it("renders heading", () => {
    render(<MarkdownContent content="## Section Title" />);
    expect(screen.getByText("Section Title")).toBeInTheDocument();
  });

  it("renders blockquote", () => {
    render(<MarkdownContent content="> This is a quote" />);
    expect(screen.getByText("This is a quote")).toBeInTheDocument();
  });

  it("renders horizontal rule", () => {
    const { container } = render(<MarkdownContent content="---" />);
    expect(container.querySelector("hr")).toBeInTheDocument();
  });

  it("renders emphasized (italic) text", () => {
    render(<MarkdownContent content="*Italic Text*" />);
    expect(screen.getByText("Italic Text")).toBeInTheDocument();
  });

  it("renders heading level 1", () => {
    render(<MarkdownContent content="# H1 Title" />);
    expect(screen.getByText("H1 Title")).toBeInTheDocument();
  });
});
