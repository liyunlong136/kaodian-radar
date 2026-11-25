// 无凭据的 Function 纯逻辑校验：node dev/fixture-prompt-check.ts
import { buildUserPrompt, parseStatements, pickModel, validatePayload } from "../functions/prompt.ts";

let failed = 0;
const check = (name: string, ok: boolean) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failed++;
};

const evidence = [
  { ref: "A-4.1:0", docShort: "机器学习讲义", label: "§4.1", title: "偏差-方差分解", quote: "欠拟合是偏差主导，过拟合是方差主导。", text: "欠拟合是偏差主导" },
  { ref: "E-A1:1", docShort: "期末习题与解答", label: "解答 1", title: "题 1 参考解答", quote: "训练误差远小于验证误差 → 过拟合（高方差）。", text: "训练误差远小于验证误差" },
];

const good = validatePayload({ question: "怎么判断欠拟合？", evidence });
check("接受合法召回载荷", good.ok === true);

const prompt = buildUserPrompt({ question: "怎么判断欠拟合？", evidence: evidence as never });
check("提示词包含问题与 ref", prompt.includes("怎么判断欠拟合？") && prompt.includes("ref=A-4.1:0"));
check("提示词包含原文", prompt.includes("欠拟合是偏差主导"));

check("拒绝空问题", validatePayload({ question: "  ", evidence }).ok === false);
check("拒绝超长问题", validatePayload({ question: "问".repeat(201), evidence }).ok === false);
check("拒绝 0 段证据", validatePayload({ question: "q", evidence: [] }).ok === false);
check("拒绝 6 段证据", validatePayload({ question: "q", evidence: Array(6).fill(evidence[0]) }).ok === false);
check("拒绝越界 ref", validatePayload({ question: "q", evidence: [{ ...evidence[0], ref: "../../etc" }] }).ok === false);
check("拒绝只到章节的 ref", validatePayload({ question: "q", evidence: [{ ...evidence[0], ref: "A-4.1" }] }).ok === false);
check("拒绝异常句号", validatePayload({ question: "q", evidence: [{ ...evidence[0], ref: "A-4.1:9999" }] }).ok === false);
check("拒绝重复 ref", validatePayload({ question: "q", evidence: [evidence[0], evidence[0]] }).ok === false);
check("剥离控制字符", validatePayload({ question: "q", evidence: [{ ...evidence[0], quote: "合\r\n规\x00文本" }] }).ok === true);

const statements = parseStatements(
  '```json\n{"statements":[{"text":"训练误差远低于验证误差即过拟合 [1]","refs":["A-4.1:0","E-A1:1"]},{"text":"无引用","refs":[]}]}\n```',
  ["A-4.1:0", "E-A1:1"],
);
check("解析带代码块的 JSON", statements?.length === 1);
check("保留合法 refs", statements?.[0].refs.join(",") === "A-4.1:0,E-A1:1");
check("丢弃无证据结论", !statements?.some((item) => item.text === "无引用"));
check("拒绝白名单外的 ref", parseStatements('{"statements":[{"text":"x","refs":["Z-9:0"]}]}', ["A-4.1:0"]) === undefined);
check("非 JSON 回复返回 undefined", parseStatements("抱歉我不知道", ["A-4.1:0"]) === undefined);
check("限制结论条数", (parseStatements(`{"statements":[${Array(9).fill('{"text":"结论","refs":["A-4.1:0"]}').join(",")}]}`, ["A-4.1:0"])?.length ?? 0) <= 6);

const tolerant = parseStatements(
  '好的，以下是结论：\n{"statements":[{"text":"过拟合是方差主导 [1]，先加正则。","refs":["A-4.1","2"]}]}\n希望有帮助。',
  ["A-4.1:0", "E-A1:1"],
);
check("容忍开场白与结语", tolerant?.length === 1);
check("章节号 ref 归位到该章节的句子", tolerant?.[0].refs[0] === "A-4.1:0");
check("序号 ref 归位到对应片段", tolerant?.[0].refs.includes("E-A1:1"));
check("去掉模型自写的角标", tolerant?.[0].text === "过拟合是方差主导，先加正则。");

check("优先默认模型", pickModel([{ id: "m-a", enabled: true }, { id: "m-b", enabled: true, is_default: true }]) === "m-b");
check("跳过停用模型", pickModel([{ id: "m-a", enabled: false }, { id: "m-b", enabled: true }]) === "m-b");
check("空列表不臆造模型", pickModel([]) === undefined);

console.log(failed ? `\n${failed} 项未通过` : "\n全部通过");
process.exit(failed ? 1 : 0);
