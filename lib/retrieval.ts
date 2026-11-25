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
/** 一次回答最多展示几条引用块 */
const SPAN_TOTAL = 4;
/** 单章节最多贡献几条引用，保证既有跨章节多来源，也能同章节多句 */
const MAX_PER_SECTION = 3;
/** 与 Function 侧的片段上限保持一致，超出的补漏不再追加 */
const SPAN_HARD_CAP = 5;
const CJK_SINGLE = /^[㐀-䶿一-鿿]$/;

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
  for (const token of tokens) {
    // 单个汉字的信息量远低于二字词（"考""出""点"这类字会把不相干的资料顶上来），按 0.45 折权。
    const weight = CJK_SINGLE.test(token) ? 0.45 : 1;
    tf.set(token, (tf.get(token) ?? 0) + weight);
  }
  return tf;
}

function build(): void {
  for (const doc of DOCS) {
    for (const section of doc.sections) {
      const sentences = splitSentences(section.id, section.paragraphs);
      // 资料名 + 章节标题重复计入本节词频：问"这门机器学习课"时，讲义的各节能被正确路由到文档 A。
      const meta = tokenize(`${doc.title} ${doc.short} ${section.label} ${section.title}`);
      const tokens = [...meta, ...meta, ...sentences.flatMap((sentence) => tokenize(sentence.text))];
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

const sectionById = new Map<string, SectionIndex>(sectionIndex.map((unit) => [unit.section.id, unit]));

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
  bm25: number;
  vector: number;
  fused: number;
  rank: number;
};

/** 句子级引用：章节负责召回，引用块负责精确到句 */
export type Span = {
  /** 发给生成端的引用号，如 "A-4.2#1" */
  ref: string;
  sectionId: string;
  sentenceId: string;
  docId: string;
  docTitle: string;
  docShort: string;
  label: string;
  title: string;
  quote: Sentence;
  rank: number;
};

export type RetrievalResult = {
  hits: Hit[];
  /** top-3 章节内按相关度排好的原文句，供引用块与高亮使用 */
  spans: Span[];
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

  const hits: Hit[] = fused.map((item, index) => ({
    sectionId: item.unit.section.id,
    docId: item.unit.doc.id,
    docTitle: item.unit.doc.title,
    docShort: item.unit.doc.short,
    label: item.unit.section.label,
    title: item.unit.section.title,
    bm25: Number(item.bm25.toFixed(3)),
    vector: Number(item.vector.toFixed(3)),
    fused: Number(item.fused.toFixed(4)),
    rank: index + 1,
  }));

  // 引用落到句子级：在召回章节内部再排一次名，单章节最多 MAX_PER_SECTION 句，
  // 这样跨章节问题（Q1/Q3）能拿到多来源引用，同章节多句问题（Q2/Q4）也能逐句对应原文。
  const sectionIds = new Set(hits.map((hit) => hit.sectionId));
  const ranked = sentenceIndex
    .filter((unit) => sectionIds.has(unit.sectionId))
    .map((unit) => ({
      unit,
      score:
        bm25(queryTf, unit, avgdl || unit.tokens.length) * 0.6 +
        cosine(queryVec, unit.vec) * 0.4,
    }))
    .sort((a, b) => b.score - a.score);

  const picked: typeof ranked = [];
  const perSection = new Map<string, number>();
  for (const item of ranked) {
    if (picked.length >= SPAN_TOTAL) break;
    const used = perSection.get(item.unit.sectionId) ?? 0;
    if (used >= MAX_PER_SECTION) continue;
    picked.push(item);
    perSection.set(item.unit.sectionId, used + 1);
  }
  for (const hit of hits) {
    if (picked.length >= SPAN_HARD_CAP) break;
    if (picked.some((item) => item.unit.sectionId === hit.sectionId)) continue;
    const best = ranked.find((item) => item.unit.sectionId === hit.sectionId);
    if (best) picked.push(best);
  }
  picked.sort((a, b) => b.score - a.score);

  const spans: Span[] = picked.map((item, index) => {
    const owner = sectionById.get(item.unit.sectionId)!;
    return {
      ref: item.unit.sentence.id,
      sectionId: item.unit.sectionId,
      sentenceId: item.unit.sentence.id,
      docId: owner.doc.id,
      docTitle: owner.doc.title,
      docShort: owner.doc.short,
      label: owner.section.label,
      title: owner.section.title,
      quote: item.unit.sentence,
      rank: index + 1,
    };
  });

  return {
    hits,
    spans,
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
