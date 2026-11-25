// 站点后端：浏览器只送「已召回的章节」，模型调用与密钥都留在这里。
// 路由：POST /functions/v1/app?action=answer；GET 同路径返回引擎可用性（不含任何密钥信息）。

import { buildUserPrompt, parseStatements, pickModel, SYSTEM_PROMPT, validatePayload } from "./prompt.ts";
import { CloudAgentsError, createCloudAgentsClient, ensureCloudResources } from "./cloud-agents.mjs";

// 来自站点的运行时配置（sites.get_context.runtime.cloudAgents.apiOrigin），不接受请求侧覆盖。
const CLOUD_ORIGIN = "https://api.qoder.com.cn";
// 稳定的站点作用域：不取自 Host、不由访问者提供、不在每次冷启动重新生成。
const APP_SCOPE = "kaodian-radar-v1";
const AGENT_NAME = "考点雷达 · 资料问答";
const ENVIRONMENT_NAME = "考点雷达 · 检索问答环境";
const TURN_BUDGET_MS = 42000;
const POLL_MS = 1500;
const RATE_WINDOW_MS = 60000;
const RATE_LIMIT = 40;

const json = (payload: unknown, status = 200) =>
  Response.json(payload, { status, headers: { "Cache-Control": "no-store" } });

const rate = { start: 0, count: 0 };

function rateLimited(): boolean {
  const now = Date.now();
  if (now - rate.start > RATE_WINDOW_MS) {
    rate.start = now;
    rate.count = 0;
  }
  rate.count += 1;
  return rate.count > RATE_LIMIT;
}

// 进程内缓存，用于复用 Agent/Environment 绑定；不是跨实例的持久锁。
// 本端点无用户数据、无会话续用，云端资源按 metadata 精确匹配复用，冷启动后可自愈。
const records = new Map<string, unknown>();
const chains = new Map<string, Promise<unknown>>();

const coordinator = {
  withLock(key: string, callback: (lease: unknown) => Promise<unknown>) {
    const previous = chains.get(key) ?? Promise.resolve();
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    chains.set(
      key,
      previous.then(() => gate),
    );
    return previous.then(async () => {
      let held = true;
      const assertHeld = async () => {
        if (!held) throw new Error("lease_lost");
        await Promise.resolve();
      };
      const lease = {
        read: async () => records.get(key),
        write: async (value: unknown) => {
          if (!held) throw new Error("lease_lost");
          records.set(key, value);
        },
        assertHeld,
      };
      try {
        return await callback(lease);
      } finally {
        held = false;
        release();
        chains.delete(key);
      }
    });
  },
};

let bindingCache: unknown | undefined;

function patConfigured(): boolean {
  try {
    return !!String(Deno.env.get("QODER_PAT") ?? "").trim();
  } catch {
    return false;
  }
}

function client() {
  return createCloudAgentsClient({ origin: CLOUD_ORIGIN, timeoutMs: 20000 });
}

async function resolveBinding(cloud: unknown): Promise<{ agent: unknown; environment_id: unknown }> {
  if (bindingCache) return bindingCache as { agent: unknown; environment_id: unknown };
  const models = (await (cloud as { request: (p: string) => Promise<{ data?: unknown }> }).request(
    "/api/v1/cloud/models",
  )) as { data?: unknown };
  const model = pickModel(models?.data);
  if (!model) throw new Error("no_enabled_model");
  const binding = await ensureCloudResources({
    client: cloud,
    coordinator,
    applicationScope: APP_SCOPE,
    agent: {
      name: AGENT_NAME,
      model,
      system: SYSTEM_PROMPT,
      tools: [],
      metadata: { app: "kaodian-radar", purpose: "grounded-qa" },
    },
    environment: { name: ENVIRONMENT_NAME, config: { type: "cloud" } },
  });
  bindingCache = binding;
  return binding as { agent: unknown; environment_id: unknown };
}

function textOf(event: unknown): string {
  const content = (event as { content?: unknown })?.content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => (typeof (part as { text?: unknown })?.text === "string" ? (part as { text: string }).text : ""))
    .filter(Boolean)
    .join("\n");
}

async function askAgent(
  cloud: { request: (path: string, options?: Record<string, unknown>) => Promise<never> },
  question: string,
  evidence: { ref: string }[],
): Promise<string | undefined> {
  const binding = await resolveBinding(cloud);
  const session = await cloud.request("/api/v1/cloud/sessions", {
    method: "POST",
    body: {
      ...binding,
      title: `期末问答 ${evidence.length} 段召回`,
      metadata: { app: "kaodian-radar", purpose: "grounded-qa" },
    },
  });
  const sessionId = (session as { id?: string })?.id;
  if (!sessionId || !/^sess_[A-Za-z0-9_-]+$/.test(sessionId)) throw new Error("bad_session");

  await cloud.request(`/api/v1/cloud/sessions/${sessionId}/events`, {
    method: "POST",
    body: {
      events: [{ type: "user.message", content: [{ type: "text", text: buildUserPrompt({ question, evidence }) }] }],
    },
  });

  const deadline = Date.now() + TURN_BUDGET_MS;
  while (Date.now() < deadline) {
    const page = await cloud.request(`/api/v1/cloud/sessions/${sessionId}/events?order=asc&limit=100`);
    const events = Array.isArray((page as { data?: unknown })?.data) ? ((page as { data: unknown[] }).data) : [];
    const final = events.filter((event) => (event as { type?: string })?.type === "agent.message").map(textOf).filter(Boolean).pop();
    if (final) return final;
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  return undefined;
}

export async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (request.method === "GET" && (action === "status" || !action)) {
    return json({ ok: true, engine: "qca", ready: patConfigured() });
  }
  if (request.method !== "POST" || action !== "answer") {
    return json({ ok: false, error: "method_not_allowed" }, request.method === "POST" ? 400 : 405);
  }
  if (!patConfigured()) {
    return json({ ok: false, error: "engine_unavailable" }, 503);
  }
  if (rateLimited()) {
    return json({ ok: false, error: "rate_limited" }, 429);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_input" }, 400);
  }
  const checked = validatePayload(payload);
  if (!checked.ok) {
    return json({ ok: false, error: checked.error }, 400);
  }

  try {
    const raw = await askAgent(client(), checked.value.question, checked.value.evidence);
    const statements = raw
      ? parseStatements(raw, checked.value.evidence.map((item) => item.ref))
      : undefined;
    if (!statements) {
      return json({ ok: false, error: "upstream_error", diagnosticId: crypto.randomUUID() }, 502);
    }
    return json({ ok: true, engine: "qca", statements });
  } catch (error) {
    const code = error instanceof CloudAgentsError ? error.code : "upstream_error";
    const status = error instanceof CloudAgentsError ? error.status : 502;
    const publicError =
      code === "ai_not_configured" || code === "ai_access_denied" ? "engine_unavailable"
        : code === "ai_rate_limited" ? "rate_limited"
        : code.startsWith("ai_initialization") || code === "ai_resource_repair_required" ? "engine_initializing"
        : "upstream_error";
    return json({ ok: false, error: publicError, diagnosticId: error?.diagnosticId ?? crypto.randomUUID() }, status);
  }
}
