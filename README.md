# TeamsLingo

<img src="TeamsLingo_3D.png" width="160" align="right" />

中文 | **[English](README.en.md)**

Microsoft Edge 浏览器的 Teams Web 实时字幕翻译扩展。TeamsLingo 监听 Teams 页面中的实时字幕，调用翻译 API 进行翻译，支持 OpenAI、OpenAI 兼容接口、本地 LLM API、Google 翻译和微软翻译，译文同步显示在原文字幕旁及页面右侧悬浮窗口中，并支持会议字幕与译文的导出。


---

## 安装

1. 在 Edge 地址栏打开 `edge://extensions/`。
2. 打开左侧或页面上的开发人员模式。
3. 点击“加载解压缩的扩展”，选择本项目解压后的根目录。

![Edge 扩展页与加载解压缩扩展](docs/images/edge-extensions-page.png)

4. 安装完成后，点击浏览器工具栏中的 TeamsLingo 图标，再进入“API 配置”页。
5. 填写翻译服务配置，包括 API 格式、Endpoint、API Key、Model，以及源语言模式和目标语言。

![TeamsLingo 设置页](docs/images/settings-page.png)

> **Edge Add-ons 商店：** 即将上线 — 届时可以直接从 Microsoft Edge Add-ons 商店安装。

## 使用

1. 用 Edge 打开 Teams Web 会议页面。
2. 在 Teams 中开启“隐藏实时字幕 / Live Captions”。
3. TeamsLingo 会自动在页面右侧显示悬浮翻译窗口；当一句字幕稳定后，译文会显示在字幕旁和侧边面板中。
4. 需要时可通过面板导出原文字幕或双语字幕记录。

![Teams 会议页与悬浮翻译窗口](docs/images/teams-meeting-page.png)

---

## API 配置

支持三类翻译服务。

### OpenAI-compatible / Poe / 本地 LLM API

支持两种 OpenAI-compatible 请求格式。

Chat Completions API：

```http
POST https://api.openai.com/v1/chat/completions
Authorization: Bearer <API Key>
Content-Type: application/json
```

请求体包含 `model`、`temperature` 和 `messages`。

Responses API：

```http
POST https://api.poe.com/v1/responses
Authorization: Bearer <API Key>
Content-Type: application/json
```

请求体包含 `model`、`temperature` 和 `input`。如果 Endpoint 填 `https://api.poe.com/v1`，插件会根据 API 格式自动拼接 `/responses` 或 `/chat/completions`。

Poe 示例配置：

```text
翻译服务: OpenAI-compatible / Poe
API 格式: Responses API
API Endpoint 或 Base URL: https://api.poe.com/v1
Model: gpt-4o-mini
```

本地 LLM API 示例配置：

```text
翻译服务: OpenAI-compatible / Poe
API 格式: Chat Completions API
API Endpoint 或 Base URL: http://localhost:11434/v1
Model: gemma3:4b
```

### Google Translate

使用 Google Cloud Translation Basic v2：

```http
POST https://translation.googleapis.com/language/translate/v2
```

示例配置：

```text
翻译服务: Google Translate
API Endpoint 或 Base URL: 留空，或 https://translation.googleapis.com/language/translate/v2
API Key: Google Cloud API key
```

插件会发送 `q`、`target`、`format=text`；固定源语言时会额外发送 `source`，自动识别时不发送 `source`。

### Microsoft Translator

使用 Microsoft Translator Text API v3：

```http
POST https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=zh-Hans
```

示例配置：

```text
翻译服务: Microsoft Translator
API Endpoint 或 Base URL: 留空，或 https://api.cognitive.microsofttranslator.com
API Key: Azure Translator key
Microsoft Region: 按 Azure 资源填写；全局单服务 Translator 可留空
```

插件会发送 `Ocp-Apim-Subscription-Key`。如果填写了 Microsoft Region，也会发送 `Ocp-Apim-Subscription-Region`。

---

## 工作方式

- 主选择器来自当前目录中的 Teams 保存页样本：`data-tid="closed-caption-text"` 和 `data-tid="author"`。
- 字幕文本不再变化超过配置的毫秒数后，扩展认为这句话已经讲完并入队翻译。
- 源语言默认根据字幕内容自动识别；也可以固定为 Teams 支持的会议发言/转写语言。
- 目标语言下拉列表使用 Teams 实时翻译字幕支持的目标语言，并保留自定义输入。
- 相同发言人和相同字幕会在 30 分钟内去重，避免 Teams 虚拟列表重绘造成重复翻译。
- API key 存在 `chrome.storage.local`，不会写入会议文件。

## 功能特点

- **实时字幕翻译** — 监听 Teams 实时字幕，在一句话讲完后自动调用翻译 API。
- **多种翻译引擎** — 支持 OpenAI、OpenAI 兼容 API（包括 Poe 和本地 LLM API）、Google Cloud Translation 和 Microsoft Translator。
- **可配置语言对** — 可自动识别源语言，或固定为 Teams 支持的转写语言；目标语言支持多种常用语言。
- **智能去重** — Teams 虚拟列表重绘时自动去重，避免重复翻译。
- **双语对照显示** — 译文同步显示在原文字幕旁及侧边悬浮窗口中，方便对照阅读。
- **双语界面** — 扩展界面支持中文和英文。
- **隐私优先** — API 配置仅保存在本地，字幕文本仅发送至你配置的翻译 API，不经过任何第三方。

---

## 注意

- 浏览器扩展只能运行在 Teams **Web** 页面（teams.microsoft.com / teams.cloud.microsoft / teams.live.com），不支持 Teams 桌面客户端。
- 因为 Endpoint 可配置，扩展声明了较宽的 `http/https` host permission，用于后台脚本向你的翻译 API 发请求。

## 隐私

TeamsLingo 不收集、存储或传输任何个人数据。详见 [PRIVACY_POLICY.md](PRIVACY_POLICY.md)。

## 链接

- **GitHub：** https://github.com/Amoiensis/TeamsLingo
- **Issues：** https://github.com/Amoiensis/TeamsLingo/issues
