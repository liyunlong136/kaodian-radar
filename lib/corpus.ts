// 站点内置示例知识库：随站点产物一起发布，对所有访问者可见。
// 不写入 localStorage / IndexedDB，也不依赖访问者上传文件。

export type Section = {
  /** 全局唯一 id，用于引用定位与高亮 */
  id: string;
  /** 章节编号，如 §3.1 */
  label: string;
  /** 章节标题 */
  title: string;
  /** 原文段落，保留 LaTeX 与 **强调** 标记 */
  paragraphs: string[];
};

export type Doc = {
  id: string;
  /** 资料全名 */
  title: string;
  /** 列表里显示的短名 */
  short: string;
  kind: string;
  note?: string;
  sections: Section[];
};

export const DOCS: Doc[] = [
  {
    id: "A",
    title: "机器学习课程 · 第 3-4 章 讲义节选",
    short: "机器学习讲义",
    kind: "讲义",
    sections: [
      {
        id: "A-3.1",
        label: "§3.1",
        title: "经验风险与泛化能力",
        paragraphs: [
          String
            .raw`监督学习的目标不是最小化训练集上的误差，而是最小化**测试分布上的期望误差**（泛化误差）。我们只能用训练数据去估计这个不可直接观测的量，于是引出两个基本量：经验风险 $R(\hat f) = \frac{1}{n}\sum_{i=1}^n L(f(x_i), y_i)$，以及真实风险 $R(f) = \mathbb{E}_{(x,y)\sim P}[L(f(x), y)]$。`,
          String
            .raw`一个固定的假设类 $\mathcal{F}$ 上，经验风险是真实风险的无偏估计；但如果我们在同一个数据集上**既做模型选择、又做最终评估**，评估结果会系统性偏乐观。标准做法是把数据切成训练集、验证集、测试集三份，其中验证集用于调参和早停，测试集只在最后动一次。`,
        ],
      },
      {
        id: "A-3.2",
        label: "§3.2",
        title: "正则化与模型选择",
        paragraphs: [
          String
            .raw`正则化通过在损失里加入复杂度惩罚来抑制过拟合：$R_\lambda(\hat f) = R(\hat f) + \lambda \Omega(\hat f)$，其中 $\Omega$ 是复杂度度量，$\lambda \ge 0$ 是超参数。$\lambda$ 越大，模型越简单、训练误差上升但泛化误差可能下降——这就是偏差-方差权衡的具体实现。`,
          String
            .raw`正则化项的常见形式：L2 对应参数平方和惩罚（LASSO 用 L1，产生稀疏解），L1 对应参数绝对值惩罚。数据量少、特征多时，L1 常常同时完成特征选择。`,
          String
            .raw`模型选择的实用流程：先用一个强正则的基线模型跑通全流程，再逐步放开复杂度，每一步用**验证集**（不是测试集）判断是否值得。**任何时候都不要为了提升测试集分数而回头改模型选择策略**，那是典型的信息泄漏。`,
        ],
      },
      {
        id: "A-4.1",
        label: "§4.1",
        title: "偏差-方差分解",
        paragraphs: [
          String
            .raw`模型的期望误差可以分解为三部分：**偏差**（模型假设本身与真实规律的系统性差距）、**方差**（训练数据扰动导致的模型输出波动）、以及**不可约误差**（数据本身含噪）。`,
          String
            .raw`高容量模型（如深层网络）偏差低、方差高；低容量模型（如线性模型）偏差高、方差低。欠拟合是偏差主导，过拟合是方差主导。判断依据：训练误差和验证误差**都高** → 欠拟合；训练误差低但验证误差明显更高 → 过拟合。`,
        ],
      },
      {
        id: "A-4.2",
        label: "§4.2",
        title: "类别不平衡与评价指标",
        paragraphs: [
          String
            .raw`当正负样本比例悬殊（金融风控、疾病筛查、欺诈检测中常见）时，**准确率会被多数类完全主导**：一个"永远预测负类"的模型准确率可能高达 95%，却毫无价值。`,
          String
            .raw`此时应改用：查准率（Precision）、查全率（Recall）、以及二者调和平均的 **F1**。更关键的是 **ROC-AUC**：它衡量模型在所有阈值下区分两类样本的能力，对正负样本比例不敏感，常作为不平衡场景的主指标。与之相对，**PR-AUC（平均查准率-查全率）** 在极度不平衡时更敏感，常与 ROC-AUC 一起汇报。`,
          String
            .raw`实践建议：训练时用**类别权重**或**重采样**（过采样/欠采样）处理不平衡；**阈值不要用 0.5**，而应在验证集上按业务代价（假阳性 vs 假阴性的相对损失）选取。`,
        ],
      },
    ],
  },
  {
    id: "B",
    title: "线性代数复习提纲 · 三个必考结论",
    short: "线代复习提纲",
    kind: "提纲",
    sections: [
      {
        id: "B-2.1",
        label: "§2.1",
        title: "秩、零空间与四个基本子空间",
        paragraphs: [
          String
            .raw`设 $A \in \mathbb{R}^{m \times n}$，秩为 $r$。列空间 $\mathrm{Col}(A)$ 的维数是 $r$，零空间 $\mathrm{Null}(A)$ 的维数是 $n - r$；行空间维数同为 $r$，左零空间 $\mathrm{Null}(A^T)$ 维数为 $m - r$。`,
          String
            .raw`四个基本子空间两两正交，其中**列空间与零空间正交**这一条最常被用：$x \in \mathrm{Null}(A)$ 等价于 $x$ 与 $\mathrm{Col}(A)$ 的每个向量都正交，这是理解最小二乘的钥匙。`,
        ],
      },
      {
        id: "B-2.2",
        label: "§2.2",
        title: "最小二乘解 = 正交投影",
        paragraphs: [
          String
            .raw`求解 $\min_{\hat x} \|Ax - b\|_2$（即 $\min_{\hat x} \|A\hat x - b\|^2$）的最小二乘解为 $\hat x = A^+ b$，其中 $A^+$ 是 Moore-Penrose 伪逆；更实用的形式是 $\hat x = (A^T A)^{-1}A^T b$（$A$ 列满秩时）。`,
          String
            .raw`几何解释：当 $A$ 列满秩时，$\mathrm{Col}(A)$ 是 $\mathbb{R}^m$ 的子空间，最优解就是**把 $b$ 正交投影到 $\mathrm{Col}(A)$ 上**，残差 $b - A\hat x$ 与列空间正交。投影矩阵为 $P = A(A^TA)^{-1}A^T$，满足 $P^2 = P$、$P^T = P$。`,
          String
            .raw`推论（很重要）：**最优残差与每一个特征列正交**，即 $\sum_i x_i (b_i - \hat y_i) = 0$。这给出了"残差图应当没有可识别的模式"这一经典诊断。`,
        ],
      },
      {
        id: "B-2.3",
        label: "§2.3",
        title: "SVD 与低秩近似",
        paragraphs: [
          String
            .raw`任意矩阵 $A$ 的奇异值分解 $A = U\Sigma V^T$。取前 $k$ 个奇异值得到最佳低秩近似（Eckart–Young 定理），且在 Frobenius 范数下误差最小。`,
          String
            .raw`工程上这直接对应**降维与压缩**：PCA 实质上就是对中心化数据做 SVD，用前 $k$ 个主成分近似；嵌入向量的降维、去噪、模型压缩都用同一套数学。低秩结构在真实数据（用户-物品矩阵、词-文档矩阵、图像矩阵）中普遍存在，这正是低秩方法有效的原因。`,
        ],
      },
    ],
  },
  {
    id: "C",
    title: "概率论与数理统计 · 期末速记",
    short: "概率统计速记",
    kind: "速记",
    sections: [
      {
        id: "C-1.1",
        label: "§1.1",
        title: "大数定律与中心极限定理",
        paragraphs: [
          String
            .raw`大数定律说明样本均值依概率收敛到总体均值：$\bar X_n \xrightarrow{P} \mu$。中心极限定理进一步说明 $\frac{\sqrt{n}(\bar X_n - \mu)}{\sigma} \xrightarrow{d} \mathcal{N}(0,1)$，即**均值的抽样分布近似正态**，且与原始分布的形状无关（只要有限方差存在）。`,
          String
            .raw`这解释了一个常见经验：直方图看着不像正态，但**样本均值**的分布近似正态。正态性假设在很多统计推断里之所以稳健，根源就在这里。`,
        ],
      },
      {
        id: "C-1.2",
        label: "§1.2",
        title: "极大似然、MAP 与贝叶斯",
        paragraphs: [
          String
            .raw`**极大似然估计（MLE）**：最大化 $L(\theta) = \prod_i p(x_i|\theta)$，等价于最小化负对数似然。样本量大时 MLE 具有相合性与渐近正态性，但**可能过拟合**（如高斯混合里的协方差退化）。`,
          String
            .raw`**最大后验（MAP）**：在先验 $\pi(\theta)$ 约束下最大化后验，等价于 MLE 加上先验正则项 $\log \pi(\theta)$。当先验为高斯时，MAP 与岭回归（L2 正则）对应。`,
          String
            .raw`**贝叶斯估计**：不给出单点估计，而是给出后验分布 $p(\theta|x) \propto p(x|\theta)\pi(\theta)$，对预测更有意义，能自然表达不确定性。`,
          String
            .raw`这三者的关系是：贝叶斯 ⊃ MAP ⊃ MLE，且 **MAP = MLE + 正则化**，这是理解模型正则化的最快路径。`,
        ],
      },
      {
        id: "C-1.3",
        label: "§1.3",
        title: "置信区间与假设检验",
        paragraphs: [
          String
            .raw`95% 置信区间的正确解释是：**在重复抽样中，长期来看有 95% 的这类区间会覆盖真实参数**——它不表示"参数有 95% 的概率落在这个区间"。`,
          String
            .raw`假设检验基于 p 值：原假设成立时，观测到当前或更极端统计量的概率。p 值小于显著性水平就拒绝原假设。**多重比较**时需要校正（Bonferroni 或 FDR），因为做 20 次独立检验，即使全无效应也期望出现 1 次 p < 0.05。`,
        ],
      },
    ],
  },
  {
    id: "D",
    title: "示例论文摘要 · RAG for Knowledge-Intensive Tasks",
    short: "RAG 论文摘要",
    kind: "论文摘要（虚构示例）",
    note: "虚构示例材料：作者、期刊、年份均为编造，仅用于演示论文摘要类资料的检索与引用，不指向任何真实文献。",
    sections: [
      {
        id: "D-1",
        label: "摘要",
        title: "方法概述",
        paragraphs: [
          String
            .raw`检索增强生成（RAG）把"参数化记忆"与"非参数化记忆"结合起来：模型参数中编码的静态知识由外部可检索的知识库补充。具体而言，RAG 系统先用检索器从语料中召回 $k$ 个相关文档片段，再把片段与问题拼接进提示词交给生成器产出答案。`,
        ],
      },
      {
        id: "D-2",
        label: "问题",
        title: "两个核心问题",
        paragraphs: [
          String
            .raw`本文聚焦两个问题。其一，**检索质量与生成质量存在耦合**：实验表明，当召回文档中缺少答案依据时，生成器倾向于"编造"而非拒答，导致流畅但错误的输出。其二，**引用可追溯性是 RAG 落地的关键**：若答案无法定位回原文段落，使用者无法核验，这在教育、医疗等高风险场景尤其致命。`,
        ],
      },
      {
        id: "D-3",
        label: "方法",
        title: "带段级引用的生成范式",
        paragraphs: [
          String
            .raw`我们提出一种**带段级引用的生成范式**：生成器在产出每一句话的同时，标注其依据的文档片段编号，使得答案与证据严格对齐。评测上，除问答准确率外，我们引入**引用正确率**（答案所引片段是否真的支持该句）与**引用完整率**（答案所需证据是否被全部召回）两个指标。`,
        ],
      },
      {
        id: "D-4",
        label: "结论",
        title: "结论要点",
        paragraphs: [
          String
            .raw`① 检索器与生成器应联合评估，单看生成质量会掩盖检索缺陷；② 段级引用显著提升答案可核验性；③ 在样本量有限的场景，检索增强比单纯扩大模型参数更有效。`,
        ],
      },
    ],
  },
  {
    id: "E",
    title: "期末习题样例（含标准解答）",
    short: "期末习题与解答",
    kind: "习题",
    sections: [
      {
        id: "E-Q1",
        label: "题 1",
        title: "考查 §4.1",
        paragraphs: [
          String
            .raw`某模型在训练集上 MSE = 0.02，在验证集上 MSE = 0.11，增大正则化系数后训练集 MSE 上升到 0.05、验证集 MSE 降到 0.06。该模型原本的问题是什么？如何解释参数变化？`,
        ],
      },
      {
        id: "E-Q2",
        label: "题 2",
        title: "考查 §2.2",
        paragraphs: [
          String
            .raw`对于线性模型 $\hat y = X\hat\beta$，为什么要求残差 $y - X\hat\beta$ 与 $X$ 的每一列正交？这个条件在什么情况下自动成立？`,
        ],
      },
      {
        id: "E-Q3",
        label: "题 3",
        title: "考查 §1.2",
        paragraphs: [
          String
            .raw`为什么"给损失函数加 L2 正则"和"把 MLE 换成 MAP（高斯先验）"是同一件事？请写出对应的数学表达式。`,
        ],
      },
      {
        id: "E-A1",
        label: "解答 1",
        title: "题 1 参考解答",
        paragraphs: [
          String
            .raw`训练误差远小于验证误差 → **过拟合（高方差）**。增大 $\lambda$ 后训练误差上升、验证误差下降，说明原先的模型容量过大、方差主导。解法是继续增加正则化或引入更有效的特征/模型；不能以"训练误差更低"为由选回原模型。`,
        ],
      },
      {
        id: "E-A2",
        label: "解答 2",
        title: "题 2 参考解答",
        paragraphs: [
          String
            .raw`最优解的一阶条件 $\frac{\partial}{\partial \hat\beta}\|y - X\hat\beta\|^2 = -2X^T(y - X\hat\beta) = 0$ 意味着 $X^T(y - X\hat\beta) = 0$，即残差与 $X$ 的每一列正交——这正是 $b$ 在 $\mathrm{Col}(X)$ 上正交投影的定义。若 $X$ 列满秩，该驻点唯一，即最小二乘解。`,
        ],
      },
      {
        id: "E-A3",
        label: "解答 3",
        title: "题 3 参考解答",
        paragraphs: [
          String
            .raw`最小化 $\|y - X\beta\|^2 + \lambda\|\beta\|_2^2$ 的解为 $\hat\beta = (X^TX + \lambda I)^{-1}X^Ty$。而 MAP 的目标是在 $\beta \sim \mathcal{N}(0, \tau^2 I)$ 先验下最大化 $p(y|\beta)p(\beta) \propto \exp(-\|y-X\beta\|^2/(2\sigma^2)) \exp(-\|\beta\|^2/(2\tau^2))$，等价于最小化 $\|y-X\beta\|^2 + (\sigma^2/\tau^2)\|\beta\|^2$，形式完全一致（$\lambda = \sigma^2/\tau^2$）。**结论：L2 正则化 = 高斯先验下的 MAP 估计。**`,
        ],
      },
    ],
  },
];

export type ExampleQuestion = {
  id: string;
  text: string;
  hint: string;
};

/** 首屏可直接点击的示例问题，无需上传任何文件即可跑通完整流程 */
export const EXAMPLE_QUESTIONS: ExampleQuestion[] = [
  { id: "q1", text: "怎么判断模型是欠拟合还是过拟合？", hint: "讲义 §4.1 + 习题" },
  { id: "q2", text: "最小二乘的残差为什么要与特征列正交？", hint: "提纲 §2.2 + 解答" },
  { id: "q3", text: "类别不平衡时该看哪些评价指标？", hint: "讲义 §4.2 + 速记" },
  { id: "q4", text: "RAG 为什么强调段级引用？", hint: "论文摘要 D" },
];
