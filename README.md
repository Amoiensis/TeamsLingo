# TeamLingo

Edge for Mac 的 Teams Web 实时字幕翻译扩展原型。TeamLingo 监听 Teams 页面里的实时字幕，在某句话稳定一段时间后调用 OpenAI-compatible API，并把译文显示在页面右侧悬浮窗口中。

## 安装

1. 在 Edge 地址栏打开 `edge://extensions/`。
2. 打开左侧或页面上的开发人员模式。
3. 点击加载解压缩的扩展，选择本目录：
   `/data_hdd_lvm/data_store/Teams_subtitle/teams-caption-translator`
4. 打开扩展的 API 配置页，填写 API 格式、Endpoint、API Key、Model，并选择源语言模式和目标语言。
5. 用 Edge 打开 Teams Web 会议并开启实时字幕，悬浮翻译窗口会自动出现在页面右侧。

## API 配置

支持三类翻译服务。

### OpenAI-compatible / Poe

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

## 工作方式

- 主选择器来自当前目录中的 Teams 保存页样本：`data-tid="closed-caption-text"` 和 `data-tid="author"`。
- 字幕文本不再变化超过配置的毫秒数后，扩展认为这句话已经讲完并入队翻译。
- 源语言默认根据字幕内容自动识别；也可以固定为 Teams 支持的会议发言/转写语言。
- 目标语言下拉列表使用 Teams 实时翻译字幕支持的目标语言，并保留自定义输入。
- 相同发言人和相同字幕会在 30 分钟内去重，避免 Teams 虚拟列表重绘造成重复翻译。
- API key 存在 `chrome.storage.local`，不会写入会议文件。

## 注意

- 浏览器扩展只能运行在 Teams Web 页面中，不能注入 Mac 原生 Teams App。
- 因为 Endpoint 可配置，扩展声明了较宽的 `http/https` host permission，用于后台脚本向你的翻译 API 发请求。
- 如果要在本地 `.mhtml` 保存页上测试，需要在 Edge 扩展详情页里手动允许访问文件 URL；实际 Teams Web 会议不需要这一步。
