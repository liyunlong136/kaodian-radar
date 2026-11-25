import { DOCS } from "@/lib/corpus";
import { ChevronRight, FileText } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { RichText } from "@/components/RichText";
import { Input } from "@/components/ui/input";
import { filterDocs } from "@/lib/retrieval";
import { splitSentences } from "@/lib/text";
import { cn } from "@/lib/utils";

export type ActiveCitation = { sectionId: string; sentenceId: string } | null;

export function CorpusPanel({
  keyword,
  onKeyword,
  expandedDocs,
  onToggleDoc,
  openSections,
  onToggleSection,
  active,
  recalled,
}: {
  keyword: string;
  onKeyword: (value: string) => void;
  expandedDocs: Set<string>;
  onToggleDoc: (docId: string) => void;
  openSections: Set<string>;
  onToggleSection: (sectionId: string) => void;
  active: ActiveCitation;
  recalled: Set<string>;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const groups = useMemo(() => filterDocs(keyword), [keyword]);
  const sentencesOf = useMemo(() => {
    const map = new Map<string, ReturnType<typeof splitSentences>>();
    for (const doc of DOCS) for (const section of doc.sections) {
      if (!map.has(section.id)) map.set(section.id, splitSentences(section.id, section.paragraphs));
    }
    return map;
  }, []);

  useEffect(() => {
    if (!active) return;
    const node = rootRef.current?.querySelector<HTMLElement>(`[data-sentence="${active.sentenceId}"]`);
    if (!node) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  }, [active]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 pb-2">
        <h2 className="text-sm font-semibold">内置资料 <span className="text-muted-foreground">5 份 · {DOCS.reduce((n, d) => n + d.sections.length, 0)} 节</span></h2>
        <span className="text-xs text-muted-foreground">已随站点发布</span>
      </div>
      <Input
        value={keyword}
        onChange={(event) => onKeyword(event.target.value)}
        placeholder="按标题或关键词筛选资料"
        aria-label="筛选资料"
        className="mb-2 h-9 text-sm"
      />
      <div ref={rootRef} className="scrollbar-thin min-h-0 flex-1 overflow-y-auto pb-3">
        {groups.length === 0 && (
          <p className="rounded-[var(--site-radius)] border border-dashed p-4 text-xs text-muted-foreground">
            没有匹配「{keyword}」的资料，换个关键词试试。
          </p>
        )}
        <ul className="flex flex-col gap-1.5">
          {groups.map(({ doc, matchedSections }) => {
            const open = expandedDocs.has(doc.id) || matchedSections.length > 0;
            return (
              <li key={doc.id} className="rounded-[var(--site-radius)] border bg-card">
                <button
                  type="button"
                  onClick={() => onToggleDoc(doc.id)}
                  aria-expanded={open}
                  className="flex w-full items-start gap-2 p-2.5 text-left hover:bg-secondary"
                >
                  <ChevronRight className={cn("mt-0.5 size-4 shrink-0 text-muted-foreground", open && "rotate-90")} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm font-medium">{doc.short}</span>
                    </span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      {doc.sections.map((section) => (
                        <span
                          key={section.id}
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[11px] leading-4",
                            recalled.has(section.id)
                              ? "bg-[var(--site-accent)] text-[var(--site-on-accent)]"
                              : "bg-secondary text-muted-foreground",
                          )}
                        >
                          {section.label}
                        </span>
                      ))}
                    </span>
                  </span>
                </button>
                {open && (
                  <div className="border-t px-2.5 pt-2 pb-2.5">
                    {doc.note && (
                      <p className="mb-2 rounded bg-secondary px-2 py-1.5 text-[11px] text-muted-foreground">{doc.note}</p>
                    )}
                    <ul className="flex flex-col gap-1">
                      {doc.sections.map((section) => {
                        const expanded = openSections.has(section.id);
                        return (
                          <li key={section.id}>
                            <button
                              type="button"
                              onClick={() => onToggleSection(section.id)}
                              aria-expanded={expanded}
                              className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-xs hover:bg-secondary"
                            >
                              <span className="font-mono text-[11px] text-muted-foreground">{section.label}</span>
                              <span className="min-w-0 flex-1 truncate">{section.title}</span>
                              {recalled.has(section.id) && (
                                <span className="shrink-0 text-[10px] text-[var(--site-accent)]">本次召回</span>
                              )}
                            </button>
                            {expanded && (
                              <div className="mt-1 mb-1.5 rounded bg-secondary/60 px-2.5 py-2 text-xs leading-relaxed">
                                <p className="mb-1 font-medium">{doc.title}</p>
                                {(sentencesOf.get(section.id) ?? []).map((sentence) => (
                                  <span
                                    key={sentence.id}
                                    data-sentence={sentence.id}
                                    className={cn(
                                      "block rounded px-1 py-0.5",
                                      active?.sentenceId === sentence.id && "is-active-cite",
                                    )}
                                  >
                                    <RichText text={sentence.text} />
                                  </span>
                                ))}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
