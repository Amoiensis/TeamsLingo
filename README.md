# TeamsLingo

<img src="TeamsLingo_3D.png" width="160" align="right" />

中文 | **[English](README.en.md)** | [日本語](README.ja.md)

适用于 Microsoft Edge 和 Google Chrome 的 Teams Web 实时字幕翻译浏览器扩展。TeamsLingo 监听 Teams 页面中的实时字幕，调用你配置的翻译服务进行翻译，支持可直接免费调用的 Google 翻译和微软翻译，以及 OpenAI 及兼容 API（包括 Poe 和本地 LLM 服务），译文同步显示在原文字幕旁及页面右侧悬浮窗口中，并支持会议字幕与译文的导出。


---

## 安装

1. 在浏览器地址栏打开扩展管理页：
   - Edge：`edge://extensions/`
   - Chrome：`chrome://extensions/`
2. 打开页面上的“开发人员模式 / Developer mode”。
3. 点击“加载解压缩的扩展 / Load unpacked”，选择本项目解压后的根目录。

![Chromium 扩展页与加载解压缩扩展](docs/images/edge-extensions-page.png)

> 截图示例来自 Edge；Chrome 中的入口和安装方式相同。

4. 安装完成后，点击浏览器工具栏中的 TeamsLingo 图标，再进入“配置”页。
5. 填写翻译服务配置，包括 API 格式、Endpoint、API Key、Model，以及源语言模式和目标语言。其中 Google 翻译 / 微软翻译可直接留空 API Key 使用免费模式。

![TeamsLingo 设置页](docs/images/settings-page.png)

> **安装方式：** 当前仓库版本可通过开发者模式在 Edge 和 Chrome 中安装；扩展商店版本后续再发布。

## 使用

1. 用 Edge 或 Chrome 打开 Teams Web 会议页面。
2. 在 Teams 中开启“隐藏实时字幕 / Live Captions”。
3. TeamsLingo 会自动在页面右侧显示悬浮翻译窗口；当一句字幕稳定后，译文会显示在字幕旁和侧边面板中。
4. 需要时可通过面板导出原文字幕或双语字幕记录。

![Teams 会议页与悬浮翻译窗口](docs/images/teams-meeting-page.png)

---

## 翻译服务配置

支持三类翻译服务。

### OpenAI 兼容 API（含 Poe / 本地 LLM 服务）

支持两种 OpenAI 兼容请求格式。

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
翻译服务: OpenAI 兼容 API / Poe
API 格式: Responses API
API Endpoint 或 Base URL: https://api.poe.com/v1
Model: gpt-4o-mini
```

本地 LLM 服务示例配置：

```text
翻译服务: OpenAI 兼容 API / Poe
API 格式: Chat Completions API
API Endpoint 或 Base URL: http://localhost:11434/v1
Model: gemma3:4b
```

### Google Translate

默认走免费 Google 网页翻译通道：

```http
POST https://translate.googleapis.com/translate_a/t?client=gtx&dt=t&sl=auto&tl=zh-CN
Content-Type: application/x-www-form-urlencoded
```

免费模式示例配置：

```text
翻译服务: Google Translate
API Endpoint 或 Base URL: 留空，或 https://translate.googleapis.com/translate_a/t
API Key: 留空
```

如果填写了 API Key，则会改走官方 Google Cloud Translation Basic v2：

```http
POST https://translation.googleapis.com/language/translate/v2
```

插件会发送 `q`、`target`；固定源语言时会额外发送 `source`，自动识别时会使用 `sl=auto`。

### Microsoft Translator

默认走免费 Microsoft Edge 翻译通道：

```http
GET https://edge.microsoft.com/translate/auth
POST https://api-edge.cognitive.microsofttranslator.com/translate?api-version=3.0&to=zh-Hans&includeSentenceLength=true
Authorization: Bearer <edge auth token>
```

免费模式示例配置：

```text
翻译服务: Microsoft Translator
API Endpoint 或 Base URL: 留空，或 https://api-edge.cognitive.microsofttranslator.com/translate
API Key: 留空
Microsoft Region: 留空
```

如果填写了 API Key，则会改走官方 Microsoft Translator Text API v3：

```http
POST https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=zh-Hans
```

官方 API 模式示例配置：

```text
翻译服务: Microsoft Translator
API Endpoint 或 Base URL: 留空，或 https://api.cognitive.microsofttranslator.com
API Key: Azure Translator key
Microsoft Region: 按 Azure 资源填写；全局单服务 Translator 可留空
```

免费模式会先获取 Edge 网页翻译 token，再请求 `api-edge.cognitive.microsofttranslator.com`。如果填写了 Microsoft Region，则仅在官方 API 模式下发送 `Ocp-Apim-Subscription-Region`。

> 免费网页翻译链路属于非官方网页接口，可能出现限流、失效或行为变更；如果你需要更稳定的 SLA，建议改用官方付费 API Key。

---

## 工作方式

- 主选择器来自当前目录中的 Teams 保存页样本：`data-tid="closed-caption-text"` 和 `data-tid="author"`。
- 字幕文本不再变化超过配置的毫秒数后，扩展认为这句话已经讲完并入队翻译。
- 源语言默认根据字幕内容自动识别；也可以固定为 Teams 支持的会议发言/转写语言。
- 目标语言下拉列表使用 Teams 实时翻译字幕支持的目标语言，并保留自定义输入。
- 相同发言人和相同字幕会在 30 分钟内去重，避免 Teams 虚拟列表重绘造成重复翻译。
- API key 存在 `chrome.storage.local`，不会写入会议文件。

## 功能特点

- **支持 Edge / Chrome 安装** — 可作为解压扩展安装到 Microsoft Edge 和 Google Chrome。
- **实时字幕翻译** — 监听 Teams 实时字幕，在一句话讲完后自动调用翻译服务。
- **多种翻译引擎** — 支持免费 Google / 微软网页翻译、OpenAI 及兼容 API（包括 Poe 和本地 LLM 服务），以及官方 Google Cloud Translation / Microsoft Translator。
- **可配置语言对** — 可自动识别源语言，或固定为 Teams 支持的转写语言；目标语言支持多种常用语言。
- **智能去重** — Teams 虚拟列表重绘时自动去重，避免重复翻译。
- **双语对照显示** — 译文同步显示在原文字幕旁及侧边悬浮窗口中，方便对照阅读。
- **多语言界面** — 扩展界面支持中文、英文和日文。
- **隐私优先** — 翻译服务配置仅保存在本地，字幕文本仅发送至你配置的翻译服务接口，不经过任何第三方。

---

## 注意

- 该浏览器扩展可安装在 Microsoft Edge 和 Google Chrome 中，但只能运行在 Teams **Web** 页面（teams.microsoft.com / teams.cloud.microsoft / teams.live.com），不支持 Teams 桌面客户端。
- 因为 Endpoint 可配置，扩展声明了较宽的 `http/https` host permission，用于后台脚本向你配置的翻译服务接口发请求。

## 隐私

TeamsLingo 不收集、存储或传输任何个人数据。详见 [PRIVACY_POLICY.md](PRIVACY_POLICY.md)。

## 链接

- **GitHub：** https://github.com/Amoiensis/TeamsLingo
- **Releases：** https://github.com/Amoiensis/TeamsLingo/releases
- **更新指引：** [docs/UPDATE_GUIDE.md](docs/UPDATE_GUIDE.md)
- **Issues：** https://github.com/Amoiensis/TeamsLingo/issues
