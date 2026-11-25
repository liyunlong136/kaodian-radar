// 中英混排文本处理：分句、分词、去数学公式，供检索与引用定位复用。

export type Sentence = {
  /** `${sectionId}:${n}`，全站唯一，引用点击后按此 id 定位高亮 */
  id: string;
  text: string;
};

const CJK = /[㐀-䶿一-鿿豈-﫿]/;

/** 把段落切成句子，跳过 $...$ 内部的标点，避免把 0.05 这类小数切断 */
export function splitSentences(sectionId: string, paragraphs: string[]): Sentence[] {
  const out: Sentence[] = [];
  for (const paragraph of paragraphs) {
    let depth = 0;
    let start = 0;
    const push = (end: number) => {
      const text = paragraph.slice(start, end).trim();
      if (text) out.push({ id: `${sectionId}:${out.length}`, text });
    };
    for (let i = 0; i < paragraph.length; i++) {
      const ch = paragraph[i];
      if (ch === "$") depth = depth === 0 ? 1 : 0;
      if (depth > 0) continue;
      if ("。！？".includes(ch)) {
        push(i + 1);
        start = i + 1;
      }
    }
    push(paragraph.length);
  }
  return out;
}

/** 去掉数学片段与标记，得到用于展示的纯文本 */
export function plainText(text: string): string {
  return text
    .replace(/\$[^$]*\$/g, " ")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set([
  "的", "了", "是", "在", "和", "与", "对", "上", "下", "中", "为", "也", "都", "就", "而",
  "及", "或", "把", "被", "给", "让", "这", "那", "其", "之", "所", "以", "并", "则", "但",
  "如果", "因为", "所以", "一个", "我们", "它们", "它", "他", "她", "the", "a", "an", "of",
  "and", "to", "in", "on", "is", "are", "for", "with", "by", "as", "that", "this",
]);

/** 英文按词、数字按串、中文按单字 + 双字组合切分，无需外部分词词典 */
export function tokenize(text: string): string[] {
  const stripped = plainText(text).toLowerCase();
  const tokens: string[] = [];
  const latin = stripped.match(/[a-z][a-z0-9-]*|\d+(?:\.\d+)?/g);
  if (latin) tokens.push(...latin.filter((t) => !STOPWORDS.has(t)));

  let run: string[] = [];
  const flush = () => {
    for (const gram of gramsOf(run)) tokens.push(gram);
    run = [];
  };
  for (const ch of stripped) {
    if (CJK.test(ch)) run.push(ch);
    else flush();
  }
  flush();
  return tokens;
}

/** 纯虚词构成的字：单字与双字组合都不参与召回，避免"为什么/怎么"把不相关章节顶进 top-3 */
const FUNC_CHARS = new Set("的了是在和与对上下中为也都就而及或把被给让这那其之以并则但什么怎样如何很些个能可会要说去来过着没不就要可以");

function gramsOf(chars: string[]): string[] {
  const grams: string[] = [];
  for (let i = 0; i < chars.length; i++) {
    const current = chars[i];
    const next = chars[i + 1];
    if (!FUNC_CHARS.has(current)) grams.push(current);
    if (next && !(FUNC_CHARS.has(current) && FUNC_CHARS.has(next))) grams.push(current + next);
  }
  return grams;
}
