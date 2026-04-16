# TeamLingo

**[中文](README.md)** | English

Real-time translation of Microsoft Teams live captions for Microsoft Edge browser (Windows, macOS, Linux). TeamLingo monitors the caption feed in Teams Web meetings, sends each sentence to a translation API, and displays the translated text alongside the original captions as well as in a floating side window. Meeting captions and translations can also be exported.

**Author:** Amoiensis (Xiping Yu) · **License:** MIT

---

## Install from Source

1. Open `edge://extensions/` in Microsoft Edge.
2. Enable **Developer mode** (toggle on the left sidebar or page).
3. Click **Load unpacked** and select this project directory.
4. Open the extension's **Options** page and fill in your translation API settings (format, endpoint, API key, model, source/target language).
5. Open a Teams Web meeting and enable **Live Captions**. The floating translation window will appear on the right side of the page automatically.

> **Edge Add-ons store:** Coming soon — you'll be able to install directly from the Microsoft Edge Add-ons store.

---

## API Configuration

TeamLingo supports three types of translation services.

### OpenAI-compatible / Poe

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
- **Multiple translation engines** — Supports OpenAI-compatible APIs (including Poe), Google Cloud Translation, and Microsoft Translator.
- **Configurable language pair** — Auto-detect or fix the source language; choose from a wide range of target languages.
- **Smart deduplication** — Avoids redundant translations when Teams redraws its caption list.
- **Side-by-side display** — Translations appear alongside original captions and in a floating side panel for easy comparison.
- **Bilingual interface** — Extension UI available in English and 中文 (Chinese).
- **Privacy-first** — All API configuration is stored locally. Caption text is sent only to the translation API you configure — no middlemen, no analytics.

---

## Notes

- This extension only works on Teams **Web** pages (teams.microsoft.com / teams.live.com) — it does not support the Teams desktop client.
- Because the translation API endpoint is fully user-configurable, the extension declares broad `http/https` host permissions so the background service worker can make requests to your chosen API.

---

## Privacy

TeamLingo does not collect, store, or transmit any personal data. See [PRIVACY_POLICY.md](PRIVACY_POLICY.md) for full details.

## Links

- **GitHub:** https://github.com/Amoiensis/TeamLingo
- **Issues:** https://github.com/Amoiensis/TeamLingo/issues
