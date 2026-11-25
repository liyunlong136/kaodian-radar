import { EXAMPLE_QUESTIONS } from "@/lib/corpus";
import { Search, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function AskBar({
  question,
  onQuestion,
  onSubmit,
  busy,
}: {
  question: string;
  onQuestion: (value: string) => void;
  onSubmit: (value: string) => void;
  busy: boolean;
}) {
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(question);
      }}
    >
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={question}
            onChange={(event) => onQuestion(event.target.value)}
            maxLength={200}
            placeholder="问问这门课考什么，例如：不平衡数据该看哪个指标？"
            aria-label="向内置资料提问"
            className="h-11 pr-10 pl-9 text-sm"
          />
          {question && (
            <button
              type="button"
              onClick={() => onQuestion("")}
              aria-label="清空问题"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <Button type="submit" disabled={busy} size="lg" className="h-11 shrink-0 px-5 text-sm">
          {busy ? "正在检索" : "提问"}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Sparkles className="size-3.5" /> 示例问题
        </span>
        {EXAMPLE_QUESTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSubmit(item.text)}
            title={item.hint}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs",
              "border-[var(--site-border)] bg-[var(--site-bg)] text-foreground",
              "hover:border-[var(--site-accent)] hover:bg-secondary active:bg-secondary",
              question.trim() === item.text && "border-[var(--site-accent)] bg-secondary",
            )}
          >
            {item.text}
          </button>
        ))}
      </div>
    </form>
  );
}
