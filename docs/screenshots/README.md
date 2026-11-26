# 截图弹药库（评分④）

> 官方评分④「Qoder 使用深度」看的不是"你用没用 Qoder"，是**评委能不能从帖子里看出 Qoder 深度参与**。
> 官方明文："建议多用截图增强可信度"。
> **这 6 类截图就是评分④的全部弹药**，缺一类就丢一截分。

## 存放位置

先存在本目录（工作区）。**11-26 部署后，把整个文件夹复制进项目仓库** `C:\Users\l'y'l\Documents\Qoder\2026-11-25\b16a1e39\docs\screenshots\`，
这样 GitHub 仓库和论坛帖子里的图片是同一份，决赛交源码时一并带走。

## 命名规范

```
01_需求描述全文.png      02_Qoder执行过程.png
03_第一次生成结果.png    04_修改要求对话.png
05_改完对比.png          06_部署发布界面.png
```

编号 = 时间顺序。**帖子里的配图必须按这个顺序**，评委顺着看下来就是一条完整的"我是怎么让 Qoder 做出这个东西的"叙事。

## 六类截图清单

| # | 文件名 | 截什么 | 为什么必要 |
|---|---|---|---|
| 1 | `01_需求描述全文.png` | 你发给 Qoder 的完整需求描述（就是《素材包_给Qoder的第一句话.md》里那段） | 证明你知道怎么驱动 Agent，呼应官方"说明谁会使用、要解决什么问题" |
| 2 | `02_Qoder执行过程.png` | Qoder 的规划 / 执行过程（它列出的步骤、改了哪些文件） | 官方明确要看"开发与部署是否都由 Qoder 完成" |
| 3 | `03_第一次生成结果.png` | 第一次生成的站点预览 | 有对比才有说服力 |
| 4 | `04_修改要求对话.png` | 你提要求让它改的对话（自然语言 / 设计画布 / 标注 都算） | 官方三种改法都算，用哪种截哪种 |
| 5 | `05_改完对比.png` | 改完之后的效果 | 证明"你改了什么" |
| 6 | `06_部署发布界面.png` | 部署到 Qoder Sites 并设为公开访问 | 呼应"部署是否由 Qoder 完成" |

## ✅ 本仓库已收录的截图（2026-11-25 拍摄）

| 文件 | 实际内容 | 尺寸 |
|---|---|---|
| `01_requirements.png` | Qoder「完整消息」弹窗 = **第一轮需求描述全文**：谁在用/什么场景、5 份内置资料清单、页面结构、关键交互、硬性技术要求；右侧可见环境信息面板（分支 `main`、技能 `sites:sites-building`、产出「考点雷达.qoder.site」、来源两份素材） | 2317×1330 |
| `04_revision_request.png` | Qoder「完整消息」弹窗 = **第二轮要求**：4 道示例问题换回指定版本、发布并保持公开访问、项目路径切到 D:\ | 1647×1105 |
| `02_execution.png` | Qoder IDE 主界面：**已发布并保持公开访问 + 改动说明**（`lib/corpus.ts:288` 换题、`lib/retrieval.ts:24` 引用改句子级、`functions/prompt.ts:16` ref 白名单放宽）+ **线上实测四条** + 「考点雷达 · Website」卡片 + **已编辑 8 个文件清单**（含每个文件增删行数） | 2509×1521 |
| `06_deploy_published.png` | 与 `02` 同一场景（不同滚动位置/缩放）：**发布结果 + 线上实测报告 + 产出面板 + 8 文件清单** | 2302×1495 |
| `03_first_result.png` | Qoder 界面另一角度：已发布 + 线上实测 + 「考点雷达 · Website」卡片 + 8 文件清单 | 2284×1035 |
| `07_pat_server_side.png` | Qoder 首轮：**Cloud Agents PAT 授权弹窗**（"密钥不会进入前端代码"）+ 正在写 `corpus.ts` / `text.ts` / `retrieval.ts` | 2526×1503 |
| `08_github_repo.png` | GitHub 建仓页（Public / 不加 README / No .gitignore / No license） | 2265×1209 |
| `05_result_with_citations.png` | **站点实拍**（唯一的产品截图）：首屏提问框 + 4 个示例问题 + 左侧资料列表与章节 + 右侧答案区与 5 张引用卡片（每张带「定位原文」按钮） | 2410×1369 |

> ⚠️ **`05_result_with_citations.png` 需重拍**：这张拍到的是**降级路径** —— 右上角橙色横幅写着「本轮未走模型生成：模型这轮的回复没能解析成带引用的结论」，此时答案区展示的是本地原文抽取结果，而非 Cloud Agents 生成的结论；左侧也只是章节正文正常展开，**没有出现引用高亮**（高亮要点了「定位原文」才触发）。
> 重拍方法见下方「需重拍的截图」。

### 🔗 直接可用的图片 URL

文件名已全部改为 ASCII，可直接贴进任何 Markdown 编辑器的图片插入框（天池论坛用这一列）：

```
https://raw.githubusercontent.com/liyunlong136/kaodian-radar/main/docs/screenshots/01_requirements.png
https://raw.githubusercontent.com/liyunlong136/kaodian-radar/main/docs/screenshots/02_execution.png
https://raw.githubusercontent.com/liyunlong136/kaodian-radar/main/docs/screenshots/03_first_result.png
https://raw.githubusercontent.com/liyunlong136/kaodian-radar/main/docs/screenshots/04_revision_request.png
https://raw.githubusercontent.com/liyunlong136/kaodian-radar/main/docs/screenshots/05_result_with_citations.png
https://raw.githubusercontent.com/liyunlong136/kaodian-radar/main/docs/screenshots/06_deploy_published.png
https://raw.githubusercontent.com/liyunlong136/kaodian-radar/main/docs/screenshots/07_pat_server_side.png
https://raw.githubusercontent.com/liyunlong136/kaodian-radar/main/docs/screenshots/08_github_repo.png
```

> ⚠️ raw.githubusercontent.com 在国内可能加载较慢。**如果天池的插入图片支持本地上传，优先用本地上传**（图片会存在天池自己的 CDN，评委秒开）。
> 📌 **退路**：即使论坛帖里一张图都插不进去，**评分④照样拿得到** —— 官方"提交清单"只要求三项（公网链接 / 帖子五要素 / 写明 Qoder 账号），"建议多用截图"是建议；这 8 张原图在仓库里，评委点开仓库能看全、还能放大看文字。

## 📷 需重拍 / 需补拍的截图

| 目标 | 怎么拍 | 为什么 |
|---|---|---|
| **重拍 `05_result_with_citations.png`** | ① 打开站点 → ② 点示例问题 **q3** → ③ **等答案出来，确认右上角没有橙色横幅**（有横幅说明这次走了本地兜底，等下一轮再截）→ ④ **点任意一张引用卡右上角的「定位原文」** → ⑤ 等左侧章节展开、那句原文出现背景高亮 → ⑥ 截图，覆盖原文件 | 现有这张拍到的是降级路径（本地原文抽取），证明不了"Cloud Agents 生成"，也没拍到引用高亮。这是最关键的产品证据 |
| **补拍「执行过程」**（可选） | 在 Qoder 对话里往上滚到「执行工具 130 次，其中 6 次失败」「已思考」那段，**把它展开**再截一张 | 官方评分④要看"**过程**是否讲得清楚"。现有 02/06/07 都是**结果画面**（改动清单 + 线上实测），Qoder 的思考流是折叠的，展开才看得到 |
| **补拍「手机端」**（可选但推荐） | 手机浏览器打开站点，竖屏，点一个示例问题后截图 | 官方评分③"体验与设计"，评委可能用手机点开；有手机截图更可信 |

> ⏱️ **重拍 05 只要 2 分钟，而它是评分④的核心证据。** 模型生成本身是通的（Cloud Agents 侧实测 `engine:qca` 正常返回），偶发解析失败才走兜底 —— 多点两下、等到没有横幅的那一轮就行。
>
> 💡 **如果实在截不到没有横幅的**：也可以**保留现图**，但帖子文字里要主动说明这个降级是诚实设计（"模型输出解析失败时退回原文抽取并如实标注原因，不冒充模型输出"）。这反而是个技术加分项 —— 但**有真实生成效果的截图更好**。

## 补拍清单（验收清单用）

- [ ] 点 Q1 → 答案覆盖 3 个以上知识点，且每条结论后面跟着引用
- [ ] 点 Q2 → 答案出现"正交投影"，引用指向《线性代数复习提纲》§2.2
- [ ] 点 Q3 → 答案**先说怎么判断偏差/方差主导，再给动作**（顺序不能反）
- [ ] 点 Q4 → 答案**明确否定准确率**，并给出 ROC-AUC / PR-AUC / 阈值选取
- [ ] 点任意引用块 → 跳转到左侧对应资料的对应章节并高亮原文
- [ ] **手机打开 + 无痕窗口打开**，上述 4 条全部成立
- [ ] 首屏能看到：提问框 + 4 个示例问题 + 资料列表

## 💡 技巧

**不要追求"全自动一次生成完美"。** 官方看的是"过程讲不讲得清楚"，所以
**"我让它做了 v1，我发现 X 不行，于是我这样要求它改"这个叙事本身就是加分项** ——
它同时证明了你有能力判断和纠错。

所以第 4、5 号截图**不是可选的**，是把普通作品变成高分作品的关键。
