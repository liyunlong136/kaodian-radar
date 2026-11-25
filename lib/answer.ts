import type { Hit } from "@/lib/retrieval";
import { plainText } from "@/lib/text";

export type Statement = { text: string; refs: string[] };

export type Answer = {
  /** qca = 站点后端调用 Qoder Cloud Agents；local = 浏览器内的原文抽取兜底 */
  engine: "qca" | "local";
  statements: Statement[];
  /** 走兜底时说明原因，界面上如实展示，不冒充模型输出 */
  degraded?: string;
};

const MAX_QUESTION = 200;

export function validateQuestion(question: string): string | undefined {
  const trimmed = question.trim();
  if (!trimmed) return "先输入一个问题，或点一个示例问题。";
  if (trimmed.length > MAX_QUESTION) return `问题请控制在 ${MAX_QUESTION} 字以内（当前 ${trimmed.length} 字）。`;
  return undefined;
}

type Evidence = {
  ref: string;
  docShort: string;
  label: string;
  title: string;
  quote: string;
  text: string;
};

function toEvidence(hits: Hit[]): Evidence[] {
  return hits.map((hit) => ({
    ref: hit.sectionId,
    docShort: hit.docShort,
    label: hit.label,
    title: hit.title,
    quote: hit.quote.text,
    text: plainText(hit.quote.text).slice(0, 400),
  }));
}

/** 只送召回到的章节，模型不接触完整知识库，也不接触任何密钥 */
export async function generateAnswer(question: string, hits: Hit[]): Promise<Answer> {
  if (!hits.length) return { engine: "local", statements: [] };
  const evidence = toEvidence(hits);
  try {
    const response = await fetch("/functions/v1/app?action=answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: question.trim(), evidence }),
    });
    const data = (await response.json()) as
      | { ok: true; engine: "qca"; statements: Statement[] }
      | { ok: false; error?: string; diagnosticId?: string };
    if (data.ok && Array.isArray(data.statements) && data.statements.length) {
      const allowed = new Set(hits.map((hit) => hit.sectionId));
      const statements = data.statements
        .map((item) => ({ text: String(item.text ?? "").slice(0, 600), refs: (item.refs ?? []).filter((ref) => allowed.has(ref)) }))
        .filter((item) => item.text && item.refs.length);
      if (statements.length) return { engine: "qca", statements };
    }
    return {
      engine: "local",
      statements: compose(hits, question),
      degraded: data.ok ? "生成服务未返回可用答案" : reasonOf(data),
    };
  } catch {
    return {
      engine: "local",
      statements: compose(hits, question),
      degraded: "站点后端未连通（本地预览未部署 Function 时属正常情况）",
    };
  }
}

function reasonOf(data: { error?: string; diagnosticId?: string }): string {
  switch (data.error) {
    case "engine_unavailable":
      return "站点尚未开启 Qoder 后端，或后端密钥未配置";
    case "engine_initializing":
      return "模型服务正在初始化（首次调用需准备云端资源）";
    case "rate_limited":
      return "提问过于频繁，后端已限流";
    case "invalid_input":
      return "请求内容不符合后端校验";
    case "upstream_error":
      return `模型服务返回异常${data.diagnosticId ? `（诊断号 ${data.diagnosticId}）` : ""}`;
    default:
      return "生成服务未返回可用答案";
  }
}

/** 兜底答案：按召回顺序直接引用各章节最匹配的原句，引用链与模型答案保持一致 */
function compose(hits: Hit[], question: string): Statement[] {
  const where = hits.map((hit) => `${hit.docShort} ${hit.label}`).join("、");
  const out: Statement[] = [
    { text: `「${question.trim()}」在内置语料中的直接依据来自 ${where}。`, refs: hits.map((hit) => hit.sectionId) },
  ];
  for (const hit of hits) out.push({ text: hit.quote.text, refs: [hit.sectionId] });
  return out;
}
