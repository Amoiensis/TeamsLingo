# TeamsLingo — Edge Add-ons Publishing Guide

This document provides everything needed to submit **TeamsLingo** to the [Microsoft Edge Add-ons store](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension) via Partner Center.

---

## Pre-submission Checklist

- [x] Working extension prototype
- [x] `manifest.json` with all required fields
- [x] Extension icons (16/32/48/128 px)
- [x] Privacy policy page (required — extension sends data to external APIs)
- [x] `.zip` package ready for upload

---

## 1. Developer Account

If you don't have one already:

1. Visit [Partner Center](https://partner.microsoft.com/dashboard)
2. Register as a Microsoft Edge extension developer
3. See: [Register as a Microsoft Edge extension developer](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/developer-account)

---

## 2. Package Contents

The `.zip` package includes these files:

```
manifest.json
background.js
content.js
content.css
popup.html
popup.js
popup.css
options.html
options.js
options.css
languages.js
ui-i18n.js
icons/
  icon16.png
  icon32.png
  icon48.png
  icon128.png
```

**Files intentionally excluded from package:**
- `codex_log.txt` — development log, not needed for production
- `README.md` — development documentation (info below is for store listing)
- `PRIVACY_POLICY.md` — content will be hosted on GitHub Pages or repo
- `PUBLISHING_GUIDE.md` — this file

---

## 3. Store Listing — English

### Extension name
TeamsLingo

### Short description (132 chars max)
Real-time translation of Microsoft Teams live captions. Supports OpenAI, Google Translate, and Microsoft Translator APIs.

### Detailed description

**TeamsLingo** brings real-time translation to Microsoft Teams live captions, displayed in a convenient floating side window during your meetings.

### Features
- **Real-time caption translation** — Monitors Teams live captions and translates each completed sentence automatically.
- **Multiple translation engines** — Supports OpenAI-compatible APIs (including Poe), Google Cloud Translation, and Microsoft Translator Text API.
- **Configurable language pair** — Auto-detect source language or fix it to any Teams-supported spoken language; choose from a wide range of target languages.
- **Smart deduplication** — Avoids redundant translations when Teams redraws its virtual caption list.
- **Clean floating UI** — Translations appear in a side panel that doesn't obstruct your meeting view.
- **Bilingual interface** — Extension UI available in English and 中文 (Chinese).
- **Privacy-first** — All API configuration is stored locally. Caption text goes only to the translation API you configure — no middlemen, no analytics.

### How it works
1. Install the extension and open the Options page.
2. Configure your preferred translation API (endpoint, key, model).
3. Join a Teams Web meeting and enable live captions.
4. Translations appear automatically in the floating window.

### Category
Productivity

### Language
English, Chinese (Simplified)

### Search terms (max 7)
`Teams translator`, `live captions`, `subtitle translation`, `Teams 翻译`, `实时字幕翻译`, `meeting translator`, `caption translate`

---

## 4. Store Listing — 中文 (Chinese Simplified)

### 扩展名称
TeamsLingo — Teams 实时字幕翻译

### 简短描述
为 Microsoft Teams 实时字幕提供即时翻译。支持 OpenAI、Google 翻译和微软翻译 API。

### 详细描述

**TeamsLingo** 为 Microsoft Teams 会议的实时字幕提供即时翻译，译文显示在页面右侧的悬浮窗口中，不遮挡会议内容。

### 功能特点
- **实时字幕翻译** — 监听 Teams 实时字幕，在一句话讲完后自动调用翻译 API。
- **多种翻译引擎** — 支持 OpenAI 兼容 API（包括 Poe）、Google Cloud Translation 和 Microsoft Translator Text API。
- **可配置语言对** — 可自动识别源语言，或固定为 Teams 支持的转写语言；目标语言支持多种常用语言。
- **智能去重** — Teams 虚拟列表重绘时自动去重，避免重复翻译。
- **简洁悬浮窗口** — 译文显示在侧边悬浮面板，不影响会议界面。
- **双语界面** — 扩展界面支持中文和英文。
- **隐私优先** — API 配置仅保存在本地，字幕文本仅发送至你配置的翻译 API，不经过任何第三方。

### 使用方法
1. 安装扩展后，打开选项页面。
2. 配置翻译 API（接口地址、密钥、模型）。
3. 加入 Teams Web 会议并开启实时字幕。
4. 翻译结果会自动出现在悬浮窗口中。

---

## 5. Properties (Partner Center)

| Field | Value |
|---|---|
| **Category** | Productivity |
| **Privacy policy** | Yes — the extension sends caption text to user-configured external APIs |
| **Privacy policy URL** | `https://github.com/Amoiensis/TeamsLingo/blob/main/PRIVACY_POLICY.md` |
| **Website URL** | `https://github.com/Amoiensis/TeamsLingo` |
| **Support contact** | `https://github.com/Amoiensis/TeamsLingo/issues` |
| **Mature content** | No |

---

## 6. Availability

| Field | Value |
|---|---|
| **Visibility** | Public |
| **Markets** | All markets (default) |

---

## 7. Testing Notes (for certification)

> TeamsLingo injects a content script into Microsoft Teams Web meeting pages (teams.microsoft.com and teams.live.com). It monitors the live caption DOM elements and sends caption text to a user-configured translation API endpoint when a sentence stabilizes.
>
> **To test:**
> 1. Install the extension in Edge.
> 2. Open the extension Options page and configure any OpenAI-compatible API (e.g., endpoint: `https://api.openai.com/v1`, key: a valid API key, model: `gpt-4o-mini`).
> 3. Open a Teams Web meeting (teams.microsoft.com) and start live captions.
> 4. Speak or play audio — captions will appear, and translations should show in the floating side window.
>
> **Important:** A working translation API key is required to test the translation feature. Without an API key, the extension UI (popup, options page) can still be verified.
>
> The extension declares broad `host_permissions` (`https://*/*`, `http://*/*`) because the translation API endpoint is fully user-configurable and may point to any domain.

---

## 8. Submission Steps

1. Go to [Partner Center → Extensions](https://partner.microsoft.com/dashboard/microsoftedge/)
2. Click **Create new extension**
3. On the **Packages** page, upload `TeamsLingo.zip`
4. On the **Availability** page, set Visibility to **Public**, Markets to **All**
5. On the **Properties** page, fill in values from Section 5 above
6. On the **Store Listings** page, add both English and Chinese (Simplified) listings using content from Sections 3–4
7. Add testing notes from Section 7
8. Click **Submit** to start the certification process

---

## Reference

- [Publish a Microsoft Edge extension](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension)
- [Manifest file format for extensions](https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/getting-started/manifest-format)
- [Developer policies for the Microsoft Edge Add-ons store](https://learn.microsoft.com/en-us/microsoft-edge/extensions/store-policies/developer-policies)
