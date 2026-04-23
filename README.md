# TeamsLingo

<img src="TeamsLingo_3D.png" width="160" align="right" />

中文 | **[English](README.en.md)** | [日本語](README.ja.md)

适用于 Microsoft Edge 和 Google Chrome 的 Teams Web 实时字幕翻译浏览器扩展。TeamsLingo 监听 Teams 页面中的实时字幕，调用你配置的翻译服务进行翻译，支持可直接免费调用的 Google 翻译和微软翻译，以及 OpenAI 及兼容 API（包括 Poe 和本地 LLM 服务），译文同步显示在原文字幕旁及页面右侧悬浮窗口中，并支持会议字幕与译文的导出。

## 快速下载

如果你想直接安装，先下载最新打包版本：

**[下载最新版 TeamsLingo 安装包（TeamsLingo.zip）](https://github.com/Amoiensis/TeamsLingo/releases/latest/download/TeamsLingo.zip)**

下载后解压，再按下方“安装”步骤加载到 Edge 或 Chrome。

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
5. 选择一种翻译方式并填写必要配置：
   - OpenAI 兼容 API / Poe / 本地 LLM：填写 API 格式、Endpoint、API Key、Model。
   - Google Translate：API Key 留空可用免费模式；填写 Google Cloud API Key 则走官方接口。
   - Microsoft Translator：API Key 留空可用免费模式；填写 Azure Translator Key（按需再填 Region）则走官方接口。

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

只需要按你准备使用的服务选择其一：

### 1. OpenAI 兼容 API / Poe / 本地 LLM

- 适合已经有 API 服务、Poe，或本地模型服务的人。
- 需要填写 `API 格式`、`Endpoint`、`API Key`、`Model`。
- `API 格式` 选 Chat Completions 或 Responses；Poe 和部分服务通常用 Responses，本地 LLM 常见为 Chat Completions。

### 2. Google Translate

- `API Key` 留空时使用免费模式，上手最简单。
- 填写 Google Cloud API Key 时，走官方 Google Cloud Translation 接口。

### 3. Microsoft Translator

- `API Key` 留空时使用免费模式。
- 填写 Azure Translator Key 后，走官方 Microsoft Translator 接口；如 Azure 资源要求，再填写 `Microsoft Region`。

> Google / Microsoft 的免费模式依赖网页翻译链路，不保证长期稳定，可能出现限流、失效或行为变更；如果你更看重稳定性，建议使用官方付费 API。

---

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
- **最新正式版说明：** https://github.com/Amoiensis/TeamsLingo/releases/latest
- **更新指引：** [docs/UPDATE_GUIDE.md](docs/UPDATE_GUIDE.md)
- **Issues：** https://github.com/Amoiensis/TeamsLingo/issues
