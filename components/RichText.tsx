import katex from "katex";
import "katex/dist/katex.min.css";
import type { ReactNode } from "react";

/** 解析 $...$ / $$...$$ 与 **强调**，数学交给 KaTeX，其余按原样输出 */
export function RichText({ text, className }: { text: string; className?: string }) {
  return <span className={className}>{renderSegments(text)}</span>;
}

function renderSegments(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\$\$[^$]+\$\$|\$[^$]+\$|\*\*[^*]+\*\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else {
      const display = token.startsWith("$$");
      const math = display ? token.slice(2, -2) : token.slice(1, -1);
      nodes.push(
        <span
          key={key++}
          className={display ? "my-2 block text-center" : "whitespace-nowrap"}
          dangerouslySetInnerHTML={{ __html: toHtml(math, display) }}
        />,
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function toHtml(math: string, displayMode: boolean): string {
  try {
    return katex.renderToString(math, { displayMode, throwOnError: false, output: "html" });
  } catch {
    return math;
  }
}
