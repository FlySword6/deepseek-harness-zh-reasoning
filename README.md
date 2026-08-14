# DeepSeek Harness 中文思考展示版

这是基于 [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) 的个人修改版。

本仓库的目标很小：**让 Web UI 中的模型思考过程尽量以中文展示，同时不改变模型真实输出、会话日志、回放数据或后续模型上下文**。

> 本项目不是 DeepSeek 官方发布版本。官方项目请见：<https://github.com/deepseek-ai/deepseek-harness>

## 修改内容

本仓库只针对 Web UI 的思考展示做了显示层改造：

- 将聊天中的思考折叠行标题从硬编码 `Think` 改为本地化文案。
  - 中文界面显示为 `思考`。
  - 英文界面仍显示为 `Think`。
- 新增浏览器端显示翻译逻辑。
  - 如果浏览器提供内置 `Translator` API，会把英文 reasoning 文本翻译成简体中文后展示。
  - 如果浏览器不支持该 API、翻译失败、文本已经是中文，或文本不适合翻译，则自动显示原文。
- 翻译只发生在 React 展示层。
  - 不修改 `assistant/chunk`。
  - 不修改 `assistant/message`。
  - 不修改 session persistence。
  - 不修改后续发给模型的历史消息。
- 给相关组件测试补充了覆盖，验证翻译只改变 DOM 展示，不改变原始 reasoning block。

核心文件：

```text
packages/client/ui-conversation/src/client/chat/ReasoningRow.tsx
packages/client/ui-conversation/src/client/chat/reasoning-display-translation.ts
packages/client/ui-conversation/src/client/locales.ts
packages/client/ui-conversation/tests/reasoning-row.client.spec.tsx
packages/client/ui-conversation/tests/coverage-tails.client.spec.tsx
```

## 工作原理

DeepSeek Harness 原本的链路大致是：

```text
DeepSeek reasoning_content
  -> reasoning-delta
  -> session event log
  -> AssistantMarkdown
  -> ReasoningRow
  -> Web UI
```

本修改没有碰模型适配器和 session 日志，只在 `ReasoningRow` 渲染时生成一个 `displayText`：

```text
原始 reasoning text
  -> useChineseReasoningDisplay()
  -> 中文 displayText 或原文 fallback
  -> 显示在折叠摘要和展开内容中
```

也就是说，保存到磁盘、回放、导出、后续模型上下文里仍然是原始内容。你看到的中文只是 UI 投影。

## 环境要求

建议使用官方项目同样的环境：

- Node.js `^22.19.0` 或 `>=24.0.0`
- pnpm `11.7.0`
- Windows、macOS、Linux 均可尝试；本修改本身只影响浏览器 UI。

我本地验证环境：

```text
Node.js v24.16.0
pnpm 11.7.0
Windows
```

## 安装和运行

克隆本仓库：

```sh
git clone https://github.com/FlySword6/deepseek-harness-zh-reasoning.git
cd deepseek-harness-zh-reasoning
```

安装依赖：

```sh
pnpm install
```

构建：

```sh
pnpm run build
```

启动 Web UI：

```sh
pnpm dsh web
```

默认访问地址：

```text
http://127.0.0.1:3080
```

## 使用方式

1. 打开 Web UI：<http://127.0.0.1:3080>
2. 配置你的模型/API Key。
3. 选择支持 reasoning/thinking 的模型。
4. 正常发送消息。
5. 当模型返回思考过程时，聊天流中的 `思考` 折叠行会尝试显示中文。

## 翻译能力说明

本修改优先使用浏览器提供的内置 `Translator` API。

因此实际效果取决于你的浏览器：

- 支持该 API：英文思考内容会尝试显示为中文。
- 不支持该 API：会显示原始英文。
- 翻译初始化失败或翻译出错：会显示原始英文。
- 原文已经包含中文：会显示原文，避免二次翻译。

这个设计的好处是：

- 不需要额外 API Key。
- 不把 reasoning 内容发送到额外第三方翻译服务。
- 即使翻译能力不可用，DeepSeek Harness 仍可正常运行。

## 验证

本修改已执行过以下检查：

```sh
pnpm exec vitest run packages/client/ui-conversation/tests/reasoning-row.client.spec.tsx packages/client/ui-conversation/tests/coverage-tails.client.spec.tsx
pnpm run test:gui
pnpm run build
```

说明：

- `test:gui` 已通过。
- `pnpm run build` 已通过。
- `test:web` 在当前 Windows 环境中受到 Playwright 浏览器未安装、`pnpm` 子进程路径和 bash 工具平台差异影响，未作为本次修改的通过依据。

## 和官方版本的区别

官方版本的 Web UI 会原样显示 reasoning 文本。本仓库额外增加了一个纯展示层翻译：

```text
官方版本：reasoning text -> 原样显示
本仓库：reasoning text -> 浏览器端中文显示投影 -> 显示
```

除此之外，本仓库没有改变模型请求格式、工具调用、agent loop、session persistence 或 DeepSeek API 适配器。

## 停止服务

如果你在 Windows 上通过 `pnpm dsh web` 启动服务，可以用任务管理器停止 Node 进程，或在 PowerShell 中查看并结束监听 `3080` 的进程：

```powershell
Get-NetTCPConnection -LocalPort 3080
Stop-Process -Id <PID>
```

## 上游同步

这是基于上游某个时间点的个人修改版。后续如果官方项目更新较多，建议重新拉取官方仓库后再套用以下几个文件的改动：

```text
packages/client/ui-conversation/src/client/chat/ReasoningRow.tsx
packages/client/ui-conversation/src/client/chat/reasoning-display-translation.ts
packages/client/ui-conversation/src/client/locales.ts
packages/client/ui-conversation/tests/reasoning-row.client.spec.tsx
packages/client/ui-conversation/tests/coverage-tails.client.spec.tsx
```

## License

本仓库继承上游项目的 MIT License。第三方依赖许可请参考上游项目中的 `THIRD_PARTY_NOTICES.md`。
