import type { Hit, Span } from "@/lib/retrieval";
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

function toEvidence(spans: Span[]): Evidence[] {
  return spans.map((span) => ({
    ref: span.ref,
    docShort: span.docShort,
    label: span.label,
    title: span.title,
    quote: span.quote.text,
    text: plainText(span.quote.text).slice(0, 400),
  }));
}

/** 只送召回章节里的相关原句，模型不接触完整知识库，也不接触任何密钥 */
export async function generateAnswer(question: string, hits: Hit[], spans: Span[]): Promise<Answer> {
  if (!spans.length) return { engine: "local", statements: [] };
  const evidence = toEvidence(spans);
  const allowed = new Set(spans.map((span) => span.ref));
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
      const statements = data.statements
        .map((item) => ({ text: String(item.text ?? "").slice(0, 600), refs: (item.refs ?? []).filter((ref) => allowed.has(ref)) }))
        .filter((item) => item.text && item.refs.length);
      if (statements.length) return { engine: "qca", statements };
    }
    return {
      engine: "local",
      statements: compose(hits, spans, question),
      degraded: data.ok ? "生成服务未返回可用答案" : reasonOf(data),
    };
  } catch {
    return {
      engine: "local",
      statements: compose(hits, spans, question),
      degraded: "生成请求未拿到可用响应（后端刚发布后的首次冷启动最常见），稍后再问一次即可",
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
    case "engine_timeout":
      return "模型这轮没有在时限内回完，直接再问一次通常就好";
    case "engine_unparseable":
      return "模型这轮的回复没能解析成带引用的结论";
    case "invalid_input":
      return "请求内容不符合后端校验";
    case "upstream_error":
      return `模型服务返回异常${data.diagnosticId ? `（诊断号 ${data.diagnosticId}）` : ""}`;
    default:
      return "生成服务未返回可用答案";
  }
}

/** 兜底答案：按召回顺序直接引用原句，引用链与模型答案保持同一套句子级 ref */
function compose(hits: Hit[], spans: Span[], question: string): Statement[] {
  const where = hits.map((hit) => `${hit.docShort} ${hit.label}`).join("、");
  return [
    { text: `「${question.trim()}」在内置语料中的直接依据来自 ${where}。`, refs: spans.map((span) => span.ref) },
    ...spans.map((span) => ({ text: span.quote.text, refs: [span.ref] })),
  ];
}
