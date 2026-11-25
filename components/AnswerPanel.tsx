import { AlertTriangle, Crosshair, Loader2, Quote } from "lucide-react";
import { RichText } from "@/components/RichText";
import type { Answer } from "@/lib/answer";
import type { Hit, Span } from "@/lib/retrieval";
import { cn } from "@/lib/utils";

export type AskState = "idle" | "retrieving" | "answering" | "done" | "invalid";

export function AnswerPanel({
  question,
  state,
  message,
  hits,
  spans,
  answer,
  onCite,
}: {
  question: string;
  state: AskState;
  message?: string;
  hits: Hit[];
  spans: Span[];
  answer?: Answer;
  onCite: (span: Span) => void;
}) {
  if (state === "idle") {
    return (
      <div className="flex h-full flex-col justify-center gap-3 text-sm text-muted-foreground">
        <p className="text-base font-medium text-foreground">问一个问题，答案会带着原文出处回来。</p>
        <ul className="flex flex-col gap-1.5 text-xs leading-relaxed">
          <li>① 检索：BM25 + 中文向量混合召回，取 top-3 章节</li>
          <li>② 生成：只依据召回到的原文作答，不引入语料外的内容</li>
          <li>③ 引用：每条结论挂一处可点击的原文引用，点了直接跳过去并高亮那一句</li>
        </ul>
        <p className="text-xs">示例问题开箱即用，无需上传任何文件。</p>
      </div>
    );
  }

  if (state === "invalid") {
    return (
      <div className="flex items-start gap-2 rounded-[var(--site-radius)] border border-dashed p-4 text-sm text-muted-foreground">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <p>{message}</p>
      </div>
    );
  }

  if (state !== "done") {
    return (
      <div className="flex flex-col gap-3" role="status" aria-live="polite">
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {state === "retrieving" ? "正在检索相关资料…" : "正在依据召回章节生成答案…"}
        </p>
        <div className="flex flex-col gap-2">
          {[100, 92, 78, 96, 64].map((width, index) => (
            <div
              key={index}
              className="h-3.5 animate-pulse rounded bg-secondary"
              style={{ width: `${width}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!spans.length) {
    return (
      <div className="flex flex-col gap-2 text-sm">
        <p className="font-medium">内置的 5 份资料里没有相关内容。</p>
        <p className="text-xs text-muted-foreground">
          换种问法，或点上面任一示例问题看完整流程。当前问题：{question}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium text-muted-foreground">召回 {hits.length} 节</span>
        {hits.map((hit) => (
          <span
            key={hit.sectionId}
            className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground"
            title={`BM25 ${hit.bm25} · 向量 ${hit.vector} · 融合 ${hit.fused}`}
          >
            {hit.docShort} {hit.label} · B{hit.bm25} / V{hit.vector}
          </span>
        ))}
        <span
          className={cn(
            "ml-auto rounded-full px-2 py-0.5 text-[11px]",
            answer?.engine === "qca" ? "bg-secondary text-foreground" : "bg-secondary text-muted-foreground",
          )}
        >
          {answer?.engine === "qca" ? "Qoder Cloud Agents 生成" : "原文抽取兜底"}
        </span>
      </div>

      {answer?.degraded && (
        <p className="flex items-start gap-2 rounded-[var(--site-radius)] bg-secondary px-3 py-2 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>本轮未走模型生成：{answer.degraded}。下面直接展示召回章节的原文依据。</span>
        </p>
      )}

      <ol className="flex flex-col gap-4">
        {(answer?.statements ?? []).map((statement, index) => {
          const seen = new Set<string>();
          const cited: Span[] = [];
          for (const ref of statement.refs) {
            if (seen.has(ref)) continue;
            seen.add(ref);
            const span = spans.find((item) => item.ref === ref);
            if (span) cited.push(span);
          }
          return (
            <li key={index} className="flex flex-col gap-2">
              <p className="text-sm leading-relaxed">
                <RichText text={statement.text} />
                {cited.map((span) => (
                  <sup key={span.ref} className="ml-0.5 text-[10px] text-[var(--site-accent)]">
                    [{span.rank}]
                  </sup>
                ))}
              </p>
              <div className="flex flex-col gap-1.5">
                {cited.map((span) => (
                  <CitationBlock key={span.ref} span={span} onCite={onCite} />
                ))}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function CitationBlock({ span, onCite }: { span: Span; onCite: (span: Span) => void }) {
  return (
    <button
      type="button"
      onClick={() => onCite(span)}
      aria-label={`定位到 ${span.docShort} ${span.label} 的引用原文`}
      className="group w-full rounded-[var(--site-radius)] border bg-card px-3 py-2 text-left hover:border-[var(--site-accent)] hover:bg-secondary"
    >
      <span className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <Quote className="size-3 shrink-0 text-muted-foreground" />
        <span className="font-medium">{span.docTitle}</span>
        <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground group-hover:bg-background">
          {span.label} {span.title}
        </span>
        <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-[var(--site-accent)]">
          <Crosshair className="size-3" /> 定位原文
        </span>
      </span>
      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground group-hover:text-foreground">
        <RichText text={`“${span.quote.text}”`} />
      </span>
    </button>
  );
}
