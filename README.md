# Indie Opportunity Radar

每天自动从公开信息源抓取独立开发相关信号，经过本地规则预筛和 OpenRouter 大模型总结后，在指定 Linear Team + Project 中生成一条日报 Issue。也可以把每天的日报创建为某条 Linear 父 Issue 的子 Issue。

## 当前能力

- Hacker News、GitHub、Product Hunt 三个来源
- 单个来源失败不影响整体运行
- OpenRouter Chat Completions API 生成中文 Markdown 日报
- Linear GraphQL API 创建 Issue
- 可选创建到指定父 Issue 下
- 同一天同标题去重，可配置跳过或更新
- 本地 dry-run 输出到 `output/daily-YYYY-MM-DD.md`
- GitHub Actions 每天自动运行，也支持手动触发

## 本地运行

1. 安装依赖：

```bash
npm install
```

2. 复制配置文件：

```bash
cp .env.example .env
```

3. 先跑本地 dry-run，不需要真实密钥：

```bash
DRY_RUN=true MOCK_SOURCES=true npm run start
```

4. 使用真实公开源但不发布到 Linear：

```bash
DRY_RUN=true npm run start
```

如果没有 `OPENROUTER_API_KEY`，dry-run 会自动跳过 LLM，用本地 fallback 模板生成报告。

## GitHub Actions 配置

仓库创建后，进入 GitHub 仓库的 `Settings -> Secrets and variables -> Actions`。

必填 secrets：

- `OPENROUTER_API_KEY`
- `LINEAR_API_KEY`
- `LINEAR_TEAM_ID`
- `LINEAR_PROJECT_ID`

建议 secrets：

- `PRODUCT_HUNT_TOKEN`：不填会跳过 Product Hunt，HN 和 GitHub 仍会运行

可选 secrets：

- `LINEAR_STATE_ID`
- `LINEAR_LABEL_IDS`：多个 label id 用英文逗号分隔

建议 repository variables：

- `OPENROUTER_MODEL`，默认 `qwen/qwen3.7-max`
- `TIMEZONE`，默认 `Asia/Shanghai`
- `LINEAR_ON_DUPLICATE`，默认 `update`
- `LINEAR_PARENT_ISSUE_ID`，可选；填写后每天的日报会创建为这条 Issue 的子 Issue

可选 repository variables：

- `OPENROUTER_MAX_TOKENS`，默认 `5000`
- `OPENROUTER_HTTP_REFERER`，可选，用于 OpenRouter app attribution
- `OPENROUTER_APP_TITLE`，默认 `Indie Opportunity Radar`
- `MAX_CANDIDATES_FOR_LLM`，默认 `35`

## Linear 配置说明

生产环境默认要求 `LINEAR_PROJECT_ID`，避免日报被创建到错误位置。如果你确实想创建到 Team 下但不放入 Project，可以设置：

```bash
ALLOW_PROJECTLESS_LINEAR=true
```

不建议这样做，因为你的目标是每天进入指定 Project。

如果你想把日报挂在一条固定 Issue 下面，打开那条父 Issue，按 `Cmd/Ctrl+K`，选择 `Copy model UUID`，然后设置：

```bash
LINEAR_PARENT_ISSUE_ID=父Issue的UUID
```

此时日报仍会属于 `LINEAR_TEAM_ID` 和 `LINEAR_PROJECT_ID` 指定的位置，同时也会显示为该父 Issue 的子 Issue。

## 修改核心提示词

核心提示词在：

```text
prompts/daily-radar.md
```

让日报更有价值的常见改法：

- 增加你的个人约束：例如“只关注一个人 2 周内能做出 MVP 的机会”。
- 明确商业偏好：例如“优先 B2B 小工具，不要内容社区、社交产品、硬件产品”。
- 加入你熟悉的技术栈：例如“优先 TypeScript、macOS、iOS、AI workflow、local-first”。
- 加入输出评分：例如“每个 Top 机会给出 1-5 分：付费意愿、获客难度、MVP 难度、竞争强度”。
- 加入反证要求：例如“必须写出一个可能证明这个机会不值得做的信号”。

修改后本地运行 `DRY_RUN=true MOCK_SOURCES=true npm run start`，查看 `output/` 里的 Markdown。

## GitHub Actions

`.github/workflows/daily.yml` 会在 `Asia/Shanghai` 每天 06:00 自动运行。也可以在 Actions 页面手动运行，并可指定 `run_date` 或开启 `dry_run`。

首次部署后，建议先在 Actions 页面手动运行一次，并确认 Linear 里出现或更新了 `Daily Indie Radar｜YYYY-MM-DD`。

## 注意

- 不使用爬虫，只使用公开 API。
- 所有 API key 只从环境变量读取。
- `output/` 不会提交到仓库。
- Product Hunt API 默认不应用于商业用途；本项目定位为个人决策辅助。
