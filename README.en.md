# TeamsLingo

**[中文](README.md)** | English

<img src="TeamsLingo_3D.png" width="160" align="right" />

Real-time translation of Microsoft Teams live captions for Microsoft Edge browser (Windows, macOS, Linux). TeamsLingo monitors the caption feed in Teams Web meetings, sends each sentence to a translation API, supports OpenAI, OpenAI-compatible endpoints, local LLM APIs, Google Translate, and Microsoft Translator, and displays the translated text alongside the original captions as well as in a floating side window. Meeting captions and translations can also be exported.


---

## Install from Source

1. Open `edge://extensions/` in Microsoft Edge.
2. Enable **Developer mode** using the toggle on the sidebar or page.
3. Click **Load unpacked** and select this project directory.

![Edge extensions page and Load unpacked button](docs/images/edge-extensions-page.png)

4. After installation, click the TeamsLingo toolbar icon and open the **API Configuration** page.
5. Fill in your translation settings, including API format, endpoint, API key, model, source language mode, and target language.

![TeamsLingo settings page](docs/images/settings-page.png)

> **Edge Add-ons store:** Coming soon — you'll be able to install directly from the Microsoft Edge Add-ons store.

## Usage

1. Open a Teams Web meeting in Edge.
2. Turn on **Live Captions** in Teams.
3. TeamsLingo will automatically show a floating translation panel on the right side of the page. Once a caption sentence settles, the translation appears both inline and in the side panel.
4. You can export either the source captions or a bilingual transcript from the panel when needed.

![Teams meeting page with floating translation panel](docs/images/teams-meeting-page.png)

---

## API Configuration

TeamsLingo supports three types of translation services.

### OpenAI-compatible / Poe / local LLM API

Two OpenAI-compatible request formats are supported.

**Chat Completions API:**

```http
POST https://api.openai.com/v1/chat/completions
Authorization: Bearer <API Key>
Content-Type: application/json
```

The request body includes `model`, `temperature`, and `messages`.

**Responses API:**

```http
POST https://api.poe.com/v1/responses
Authorization: Bearer <API Key>
Content-Type: application/json
```

The request body includes `model`, `temperature`, and `input`. If the endpoint is `https://api.poe.com/v1`, the extension automatically appends `/responses` or `/chat/completions` based on the selected API format.

**Poe example configuration:**

```text
Translation Service: OpenAI-compatible / Poe
API Format: Responses API
API Endpoint / Base URL: https://api.poe.com/v1
Model: gpt-4o-mini
```

**Local LLM API example configuration:**

```text
Translation Service: OpenAI-compatible / Poe
API Format: Chat Completions API
API Endpoint / Base URL: http://localhost:11434/v1
Model: gemma3:4b
```

### Google Translate

Uses Google Cloud Translation Basic v2:

```http
POST https://translation.googleapis.com/language/translate/v2
```

**Example configuration:**

```text
Translation Service: Google Translate
API Endpoint / Base URL: (leave blank, or https://translation.googleapis.com/language/translate/v2)
API Key: Google Cloud API key
```

The extension sends `q`, `target`, and `format=text`. When the source language is fixed, it also sends `source`; for auto-detection, `source` is omitted.

### Microsoft Translator

Uses Microsoft Translator Text API v3:

```http
POST https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=zh-Hans
```

**Example configuration:**

```text
Translation Service: Microsoft Translator
API Endpoint / Base URL: (leave blank, or https://api.cognitive.microsofttranslator.com)
API Key: Azure Translator key
Microsoft Region: Fill in per your Azure resource; leave blank for global single-service Translator
```

The extension sends `Ocp-Apim-Subscription-Key`. If a Microsoft Region is specified, `Ocp-Apim-Subscription-Region` is also sent.

---

## How It Works

- The main DOM selectors target Teams live caption elements: `data-tid="closed-caption-text"` and `data-tid="author"`.
- Once caption text stops changing for a configurable number of milliseconds, the extension considers the sentence complete and queues it for translation.
- Source language defaults to auto-detection; it can also be fixed to any Teams-supported spoken/transcription language.
- Target language dropdown includes all Teams live caption target languages, plus a custom input option.
- Identical speaker + caption pairs are deduplicated within a 30-minute window to prevent redundant translations caused by Teams' virtual list redraws.
- API keys are stored in `chrome.storage.local` and never written to meeting files.

---

## Features

- **Real-time caption translation** — Monitors Teams live captions and translates each completed sentence automatically.
- **Multiple translation engines** — Supports OpenAI, OpenAI-compatible APIs (including Poe and local LLM APIs), Google Cloud Translation, and Microsoft Translator.
- **Configurable language pair** — Auto-detect or fix the source language; choose from a wide range of target languages.
- **Smart deduplication** — Avoids redundant translations when Teams redraws its caption list.
- **Side-by-side display** — Translations appear alongside original captions and in a floating side panel for easy comparison.
- **Bilingual interface** — Extension UI available in English and 中文 (Chinese).
- **Privacy-first** — All API configuration is stored locally. Caption text is sent only to the translation API you configure — no middlemen, no analytics.

---

## Notes

- This extension only works on Teams **Web** pages (teams.microsoft.com / teams.cloud.microsoft / teams.live.com) — it does not support the Teams desktop client.
- Because the translation API endpoint is fully user-configurable, the extension declares broad `http/https` host permissions so the background service worker can make requests to your chosen API.

---

## Privacy

TeamsLingo does not collect, store, or transmit any personal data. See [PRIVACY_POLICY.md](PRIVACY_POLICY.md) for full details.

## Links

- **GitHub:** https://github.com/Amoiensis/TeamsLingo
- **Issues:** https://github.com/Amoiensis/TeamsLingo/issues
