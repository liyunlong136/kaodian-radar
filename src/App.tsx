import { CorpusPanel, type ActiveCitation } from "@/components/CorpusPanel";
import { AnswerPanel, type AskState } from "@/components/AnswerPanel";
import { AskBar } from "@/components/AskBar";
import { BookOpenText, FileQuestion, MessagesSquare } from "lucide-react";
import { SECTION_COUNT, retrieve, type Hit } from "@/lib/retrieval";
import { useCallback, useEffect, useRef, useState } from "react";
import { DOCS } from "@/lib/corpus";
import { cn } from "@/lib/utils";
import { generateAnswer, validateQuestion, type Answer } from "@/lib/answer";

export default function App() {
  const [question, setQuestion] = useState("");
  const [keyword, setKeyword] = useState("");
  const [state, setState] = useState<AskState>("idle");
  const [message, setMessage] = useState<string>();
  const [hits, setHits] = useState<Hit[]>([]);
  const [answer, setAnswer] = useState<Answer>();
  const [active, setActive] = useState<ActiveCitation>(null);
  const [tab, setTab] = useState<"answer" | "docs">("answer");
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(() => new Set(["A"]));
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set(["A-4.1"]));
  const timer = useRef<number[]>([]);

  useEffect(() => () => timer.current.forEach(clearTimeout), []);

  const ask = useCallback(async (value: string) => {
    const error = validateQuestion(value);
    timer.current.forEach(clearTimeout);
    timer.current = [];
    if (error) {
      setState("invalid");
      setMessage(error);
      return;
    }
    setQuestion(value.trim());
    setMessage(undefined);
    setAnswer(undefined);
    setActive(null);
    setState("retrieving");
    setTab("answer");

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timer.current.push(window.setTimeout(resolve, ms));
      });

    await wait(220);
    const result = retrieve(value);
    setHits(result.hits);
    setState("answering");
    await wait(200);
    const generated = await generateAnswer(value, result.hits);
    setAnswer(generated);
    const first = result.hits[0];
    if (first) {
      setExpandedDocs((prev) => new Set(prev).add(first.docId));
      setOpenSections((prev) => new Set(prev).add(first.sectionId));
    }
    setState("done");
  }, []);

  const openCitation = useCallback((hit: Hit) => {
    setExpandedDocs((prev) => new Set(prev).add(hit.docId));
    setOpenSections((prev) => new Set(prev).add(hit.sectionId));
    setKeyword("");
    setTab("docs");
    setActive({ sectionId: hit.sectionId, sentenceId: hit.quote.id });
  }, []);

  const toggle = (setter: typeof setExpandedDocs) => (id: string) =>
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const recalled = new Set(hits.map((hit) => hit.sectionId));

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-3 px-4 py-4 md:h-dvh md:gap-4 md:overflow-hidden md:py-6">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--site-radius)] bg-[var(--site-accent)] text-[var(--site-on-accent)]">
          <BookOpenText className="size-5" />
        </span>
        <div className="min-w-0">
          <h1 className="text-lg leading-tight font-semibold tracking-tight md:text-xl">考点雷达</h1>
          <p className="text-xs text-muted-foreground md:text-[13px]">
            课程与论文资料问答 · 每条结论都能跳回原文那一句
          </p>
        </div>
        <p className="ml-auto hidden items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] text-muted-foreground sm:inline-flex">
          <FileQuestion className="size-3.5" />
          内置 {DOCS.length} 份资料 · {SECTION_COUNT} 节，随站点发布
        </p>
      </header>

      <AskBar question={question} onQuestion={setQuestion} onSubmit={ask} busy={state === "retrieving" || state === "answering"} />

      <div className="flex gap-1 rounded-[var(--site-radius)] bg-secondary p-1 text-sm md:hidden">
        {([
          ["answer", "答案"],
          ["docs", `资料 ${DOCS.length}`],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 rounded-[calc(var(--site-radius)-4px)] py-1.5",
              tab === id ? "bg-background font-medium" : "text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <main className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row">
        <aside
          className={cn(
            "h-[58vh] min-h-0 shrink-0 md:order-first md:h-auto md:w-[330px]",
            tab === "docs" ? "flex" : "hidden",
            "md:flex",
          )}
        >
          <CorpusPanel
            keyword={keyword}
            onKeyword={setKeyword}
            expandedDocs={expandedDocs}
            onToggleDoc={toggle(setExpandedDocs)}
            openSections={openSections}
            onToggleSection={toggle(setOpenSections)}
            active={active}
            recalled={recalled}
          />
        </aside>

        <section
          className={cn(
            "scrollbar-thin min-h-0 flex-1 overflow-y-auto rounded-[var(--site-radius)] border bg-card p-3.5 md:p-5",
            tab === "answer" ? "block" : "hidden",
            "md:block",
          )}
        >
          {question && state !== "invalid" && state !== "idle" && (
            <p className="mb-3 flex items-start gap-1.5 border-b pb-2 text-xs text-muted-foreground">
              <MessagesSquare className="mt-0.5 size-3.5 shrink-0" />
              <span className="text-foreground">Q：</span>
              {question}
            </p>
          )}
          <AnswerPanel question={question} state={state} message={message} hits={hits} answer={answer} onCite={openCitation} />
        </section>
      </main>
    </div>
  );
}
