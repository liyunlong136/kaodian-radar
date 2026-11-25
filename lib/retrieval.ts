// 混合召回：BM25（词面）+ 中文向量（bigram 加权向量、余弦相似），RRF 融合取 top-N 章节。
// 全部在浏览器本地计算，不需要任何密钥；5 份资料随站点打包，索引在模块加载时建一次。

import { DOCS, type Doc, type Section } from "@/lib/corpus";
import { splitSentences, tokenize, type Sentence } from "@/lib/text";

export type SectionIndex = {
  section: Section;
  doc: Doc;
  sentences: Sentence[];
  tokens: string[];
  tf: Map<string, number>;
  vec: Map<string, number>;
};

export type SentenceIndex = {
  sentence: Sentence;
  sectionId: string;
  tokens: string[];
  tf: Map<string, number>;
  vec: Map<string, number>;
};

const K1 = 1.5;
const B = 0.75;
const RRF_K = 60;

const df = new Map<string, number>();
const sectionIndex: SectionIndex[] = [];
const sentenceIndex: SentenceIndex[] = [];

function weightOf(tf: Map<string, number>): Map<string, number> {
  const vec = new Map<string, number>();
  const idfSum = (term: string) =>
    Math.log(1 + (sectionIndex.length - (df.get(term) ?? 0) + 0.5) / ((df.get(term) ?? 0) + 0.5));
  for (const [term, count] of tf) vec.set(term, (1 + Math.log(count)) * idfSum(term));
  let norm = 0;
  for (const value of vec.values()) norm += value * value;
  norm = Math.sqrt(norm) || 1;
  for (const [term, value] of vec) vec.set(term, value / norm);
  return vec;
}

function termFreqs(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) tf.set(token, (tf.get(token) ?? 0) + 1);
  return tf;
}

function build(): void {
  for (const doc of DOCS) {
    for (const section of doc.sections) {
      const sentences = splitSentences(section.id, section.paragraphs);
      const tokens = sentences.flatMap((sentence) => tokenize(sentence.text));
      sectionIndex.push({
        section,
        doc,
        sentences,
        tokens,
        tf: termFreqs(tokens),
        vec: new Map(),
      });
      for (const sentence of sentences) {
        const st = tokenize(sentence.text);
        sentenceIndex.push({
          sentence,
          sectionId: section.id,
          tokens: st,
          tf: termFreqs(st),
          vec: new Map(),
        });
      }
      for (const term of new Set(tokens)) df.set(term, (df.get(term) ?? 0) + 1);
    }
  }
  // 语料规模确定，第二轮再算 idf 权重，保证向量在半持久语料上稳定。
  for (const unit of [...sectionIndex, ...sentenceIndex]) unit.vec = weightOf(unit.tf);
}

build();

function idf(term: string): number {
  const n = df.get(term) ?? 0;
  return Math.log(1 + (sectionIndex.length - n + 0.5) / (n + 0.5));
}

function bm25(query: Map<string, number>, unit: { tf: Map<string, number>; vec: Map<string, number>; tokens: string[] }, avgdl: number): number {
  let score = 0;
  const dl = unit.tokens.length;
  for (const [term, qCount] of query) {
    const tf = unit.tf.get(term);
    if (!tf) continue;
    const denom = tf + K1 * (1 - B + (B * dl) / (avgdl || dl));
    score += qCount * idf(term) * ((tf * (K1 + 1)) / denom);
  }
  return score;
}

function cosine(queryVec: Map<string, number>, unitVec: Map<string, number>): number {
  let dot = 0;
  const [small, large] = queryVec.size <= unitVec.size ? [queryVec, unitVec] : [unitVec, queryVec];
  for (const [term, value] of small) {
    const other = large.get(term);
    if (other) dot += value * other;
  }
  return dot;
}

export type Hit = {
  sectionId: string;
  docId: string;
  docTitle: string;
  docShort: string;
  label: string;
  title: string;
  /** 引用摘录所用的原句（含 LaTeX） */
  quote: Sentence;
  bm25: number;
  vector: number;
  fused: number;
  rank: number;
};

export type RetrievalResult = {
  hits: Hit[];
  /** 每个通道各自的排名，用于答案区展示召回过程 */
  channels: { bm25: string[]; vector: string[] };
};

function normalizeQueryTokens(text: string): Map<string, number> {
  const tokens = tokenize(text);
  const tf = termFreqs(tokens);
  const queryVec = new Map<string, number>();
  for (const [term, count] of tf) queryVec.set(term, (1 + Math.log(count)) * idf(term));
  let norm = 0;
  for (const value of queryVec.values()) norm += value * value;
  norm = Math.sqrt(norm) || 1;
  for (const [term, value] of queryVec) queryVec.set(term, value / norm);
  return queryVec;
}

export function retrieve(question: string, topN = 3): RetrievalResult {
  const queryTokens = tokenize(question);
  const queryTf = termFreqs(queryTokens);
  const queryVec = normalizeQueryTokens(question);
  const avgdl = sectionIndex.reduce((sum, unit) => sum + unit.tokens.length, 0) / sectionIndex.length;

  const scored = sectionIndex.map((unit) => ({
    unit,
    bm25: bm25(queryTf, unit, avgdl),
    vector: cosine(queryVec, unit.vec),
  }));

  const bm25Ranked = [...scored].sort((a, b) => b.bm25 - a.bm25);
  const vectorRanked = [...scored].sort((a, b) => b.vector - a.vector);
  const rankOf = (ranked: typeof scored, id: string) => ranked.findIndex((item) => item.unit.section.id === id);

  const fused = scored
    .filter((item) => item.bm25 > 0 || item.vector > 0)
    .map((item) => {
      const id = item.unit.section.id;
      const score = 1 / (RRF_K + rankOf(bm25Ranked, id) + 1) + 1 / (RRF_K + rankOf(vectorRanked, id) + 1);
      return { ...item, fused: score };
    })
    .sort((a, b) => b.fused - a.fused)
    .slice(0, topN);

  const hits: Hit[] = fused.map((item, index) => {
    const sentences = sentenceIndex.filter((unit) => unit.sectionId === item.unit.section.id);
    let best = sentences[0];
    let bestScore = -Infinity;
    for (const candidate of sentences) {
      const score =
        bm25(queryTf, candidate, avgdl || candidate.tokens.length) * 0.6 +
        cosine(queryVec, candidate.vec) * 0.4;
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
    return {
      sectionId: item.unit.section.id,
      docId: item.unit.doc.id,
      docTitle: item.unit.doc.title,
      docShort: item.unit.doc.short,
      label: item.unit.section.label,
      title: item.unit.section.title,
      quote: best?.sentence ?? { id: `${item.unit.section.id}:0`, text: item.unit.section.paragraphs[0] },
      bm25: Number(item.bm25.toFixed(3)),
      vector: Number(item.vector.toFixed(3)),
      fused: Number(item.fused.toFixed(4)),
      rank: index + 1,
    };
  });

  return {
    hits,
    channels: {
      bm25: bm25Ranked.slice(0, 5).map((item) => item.unit.section.id),
      vector: vectorRanked.slice(0, 5).map((item) => item.unit.section.id),
    },
  };
}

/** 左侧资料列表的关键词筛选：整串包含或双字以上词命中才算，避免单个虚字把全部资料顶出来 */
export function filterDocs(keyword: string): { doc: Doc; matchedSections: string[] }[] {
  const query = keyword.trim().toLowerCase();
  if (!query) return DOCS.map((doc) => ({ doc, matchedSections: [] }));
  const meaningful = tokenize(query).filter((token) => token.length >= 2);
  const hit = (body: string) => {
    const lower = body.toLowerCase();
    return lower.includes(query) || meaningful.some((token) => lower.includes(token));
  };
  const out: { doc: Doc; matchedSections: string[] }[] = [];
  for (const doc of DOCS) {
    const matchedSections = doc.sections
      .filter((section) => hit(`${section.label} ${section.title} ${section.paragraphs.join(" ")}`))
      .map((section) => section.id);
    if (hit(`${doc.title} ${doc.short} ${doc.kind}`) || matchedSections.length) out.push({ doc, matchedSections });
  }
  return out;
}

export function findSection(sectionId: string) {
  for (const doc of DOCS) {
    const section = doc.sections.find((item) => item.id === sectionId);
    if (section) return { doc, section, sentences: splitSentences(section.id, section.paragraphs) };
  }
  return undefined;
}

export const SECTION_COUNT = sectionIndex.length;
