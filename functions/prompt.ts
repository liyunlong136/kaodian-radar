// 纯逻辑：入参校验、提示词组装、模型输出解析。不触碰 Deno / 密钥，便于本地无凭据验证。

export type Evidence = {
  ref: string;
  docShort: string;
  label: string;
  title: string;
  quote: string;
  text: string;
};

export type Statement = { text: string; refs: string[] };

export type Validated = { question: string; evidence: Evidence[] };

const REF = /^[A-E]-[0-9A-Za-z.]{1,24}$/;

export function validatePayload(raw: unknown): { ok: true; value: Validated } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "invalid_input" };
  const body = raw as Record<string, unknown>;
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question || question.length > 200) return { ok: false, error: "invalid_question" };
  if (!Array.isArray(body.evidence) || body.evidence.length < 1 || body.evidence.length > 5) {
    return { ok: false, error: "invalid_evidence" };
  }
  const evidence: Evidence[] = [];
  const seen = new Set<string>();
  for (const item of body.evidence) {
    if (!item || typeof item !== "object") return { ok: false, error: "invalid_evidence" };
    const entry = item as Record<string, unknown>;
    const ref = typeof entry.ref === "string" ? entry.ref : "";
    if (!REF.test(ref) || seen.has(ref)) return { ok: false, error: "invalid_ref" };
    seen.add(ref);
    const str = (value: unknown, max: number) =>
      typeof value === "string" ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").slice(0, max) : "";
    const quote = str(entry.quote, 1200);
    if (!quote) return { ok: false, error: "invalid_evidence" };
    evidence.push({
      ref,
      quote,
      text: str(entry.text, 600),
      docShort: str(entry.docShort, 60),
      label: str(entry.label, 24),
      title: str(entry.title, 120),
    });
  }
  return { ok: true, value: { question, evidence } };
}

export const SYSTEM_PROMPT = [
  "你是期末复习助手，只依据用户提供的资料片段回答问题。",
  "硬性要求：",
  "1) 不得使用片段以外的知识；证据不足时明确说明缺口，不要编造。",
  "2) 输出 2-4 条结论，每条是一句可直接抄进笔记的话，保留原文里的数学术语与 LaTeX 记号（用 $...$ 包裹）。",
  "3) 每条结论必须标注支撑它的资料 ref（取自片段编号），refs 只能使用给定的 ref 值，至少 1 个。",
  "4) 严格输出 JSON，不要 Markdown 代码块、不要解释性前后缀。",
  '输出结构：{"statements":[{"text":"结论正文 [1]","refs":["A-4.1"]}]}',
].join("\n");

export function buildUserPrompt({ question, evidence }: Validated): string {
  const blocks = evidence.map((item, index) =>
    `[${index + 1}] ref=${item.ref} 资料《${item.docShort}》${item.label} ${item.title}\n原文：${item.quote}`,
  ).join("\n\n");
  return `问题：${question}\n\n可引用的资料片段（top-3 混合召回结果，只能引用这些）：\n\n${blocks}`;
}

/** 从模型回复里取出 JSON 语句列表；解析失败返回 undefined，交给上层兜底 */
export function parseStatements(raw: string, allowedRefs: string[]): Statement[] | undefined {
  const text = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return undefined;
  let payload: unknown;
  try {
    payload = JSON.parse(text.slice(start, end + 1));
  } catch {
    return undefined;
  }
  const list = (payload as { statements?: unknown })?.statements;
  if (!Array.isArray(list)) return undefined;
  const out: Statement[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const entry = item as { text?: unknown; refs?: unknown };
    if (typeof entry.text !== "string" || !entry.text.trim()) continue;
    const refs = Array.isArray(entry.refs)
      ? entry.refs.filter((ref): ref is string => typeof ref === "string" && allowedRefs.includes(ref))
      : [];
    if (!refs.length) continue;
    out.push({ text: entry.text.trim().slice(0, 600), refs });
    if (out.length >= 6) break;
  }
  return out.length ? out : undefined;
}

/** 模型选择：优先平台标记为默认的可用模型，其次按返回顺序取第一个 */
export function pickModel(data: unknown): string | undefined {
  if (!Array.isArray(data)) return undefined;
  const enabled = data.filter((item) => item && typeof item === "object" && (item as { enabled?: boolean }).enabled !== false);
  const preferred = enabled.find((item) => (item as { is_default?: boolean }).is_default === true);
  const chosen = preferred ?? enabled[0];
  const id = (chosen as { id?: unknown })?.id;
  return typeof id === "string" && id ? id : undefined;
}
