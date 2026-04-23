# TeamsLingo

**[中文](README.md)** | English | [日本語](README.ja.md)

<img src="TeamsLingo_3D.png" width="160" align="right" />

A browser extension for real-time translation of Microsoft Teams live captions on Teams Web, installable in Microsoft Edge and Google Chrome (Windows, macOS, Linux). TeamsLingo monitors the caption feed in Teams Web meetings, sends each sentence to your configured translation service, supports free direct Google Translate and Microsoft Translator paths plus OpenAI and compatible APIs, including Poe and local LLM services, and displays the translated text alongside the original captions as well as in a floating side window. Meeting captions and translations can also be exported.

## Quick Download

If you want to install it right away, download the latest packaged build first:

**[Download the latest TeamsLingo package (TeamsLingo.zip)](https://github.com/Amoiensis/TeamsLingo/releases/latest/download/TeamsLingo.zip)**

After downloading, unzip it and follow the installation steps below to load it in Edge or Chrome.


---

## Install from Source

1. Open the extensions page in your browser:
   - Edge: `edge://extensions/`
   - Chrome: `chrome://extensions/`
2. Enable **Developer mode** using the toggle on the page.
3. Click **Load unpacked** and select this project directory.

![Chromium extensions page and Load unpacked button](docs/images/edge-extensions-page.png)

> The screenshot is from Edge; the flow is the same in Chrome.

4. After installation, click the TeamsLingo toolbar icon and open the **Settings** page.
5. Pick one translation option and fill in only the required fields:
   - OpenAI-compatible API / Poe / local LLM: set API format, endpoint, API key, and model.
   - Google Translate: leave API key blank for free mode, or provide a Google Cloud API key for the official API.
   - Microsoft Translator: leave API key blank for free mode, or provide an Azure Translator key (and Region if needed) for the official API.

![TeamsLingo settings page](docs/images/settings-page.png)

> **Availability:** The current package can be loaded through Developer mode in both Edge and Chrome. Store listings are not published yet.

## Usage

1. Open a Teams Web meeting in Edge or Chrome.
2. Turn on **Live Captions** in Teams.
3. TeamsLingo will automatically show a floating translation panel on the right side of the page. Once a caption sentence settles, the translation appears both inline and in the side panel.
4. You can export either the source captions or a bilingual transcript from the panel when needed.

![Teams meeting page with floating translation panel](docs/images/teams-meeting-page.png)

---

## Translation Service Configuration

TeamsLingo supports three translation options.

### 1. OpenAI-compatible API / Poe / local LLM

- Use this if you already have an API service, Poe access, or a local model server.
- Fill in `API Format`, `Endpoint`, `API Key`, and `Model`.
- Choose Chat Completions or Responses based on your provider. Poe and some hosted services usually use Responses; local LLM services often use Chat Completions.

### 2. Google Translate

- Leave `API Key` blank to use free mode.
- Provide a Google Cloud API key to use the official Google Cloud Translation API.

### 3. Microsoft Translator

- Leave `API Key` blank to use free mode.
- Provide an Azure Translator key to use the official Microsoft Translator API. Fill in `Microsoft Region` only if your Azure resource requires it.

> The free Google / Microsoft modes rely on web translation paths and are not guaranteed to stay stable. They may be rate-limited, changed, or stop working. If stability matters, use an official paid API.

---

## Features

- **Edge / Chrome ready** — Can be installed as an unpacked extension in Microsoft Edge and Google Chrome.
- **Real-time caption translation** — Monitors Teams live captions and translates each completed sentence automatically.
- **Multiple translation engines** — Supports free Google / Microsoft web translation, OpenAI and compatible APIs (including Poe and local LLM services), and the official Google Cloud Translation / Microsoft Translator APIs.
- **Configurable language pair** — Auto-detect or fix the source language; choose from a wide range of target languages.
- **Smart deduplication** — Avoids redundant translations when Teams redraws its caption list.
- **Side-by-side display** — Translations appear alongside original captions and in a floating side panel for easy comparison.
- **Multilingual interface** — Extension UI available in English, 中文 (Chinese), and 日本語 (Japanese).
- **Privacy-first** — All translation settings are stored locally. Caption text is sent only to the translation service you configure — no middlemen, no analytics.

---

## Notes

- This browser extension can be installed in Microsoft Edge and Google Chrome, but it only works on Teams **Web** pages (teams.microsoft.com / teams.cloud.microsoft / teams.live.com) — it does not support the Teams desktop client.
- Because the translation service endpoint is fully user-configurable, the extension declares broad `http/https` host permissions so the background service worker can make requests to your chosen service.

---

## Privacy

TeamsLingo does not collect, store, or transmit any personal data. See [PRIVACY_POLICY.md](PRIVACY_POLICY.md) for full details.

## Links

- **GitHub:** https://github.com/Amoiensis/TeamsLingo
- **Latest release notes:** https://github.com/Amoiensis/TeamsLingo/releases/latest
- **Update guide:** [docs/UPDATE_GUIDE.en.md](docs/UPDATE_GUIDE.en.md)
- **Issues:** https://github.com/Amoiensis/TeamsLingo/issues
