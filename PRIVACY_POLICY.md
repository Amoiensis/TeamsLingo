# TeamsLingo Privacy Policy

**Last updated: 2026-04-22**

## Overview

TeamsLingo ("the Extension") is a browser extension for Microsoft Edge and Google Chrome that translates Microsoft Teams live captions in real time on Teams Web. This privacy policy explains what data the Extension collects, how it is used, and how it is protected.

## Author

Amoiensis (Xiping Yu)  
GitHub: https://github.com/Amoiensis/TeamsLingo

## Data Collection

### What the Extension does NOT collect

- The Extension does **not** collect, store, or transmit any personal identification information.
- The Extension does **not** use cookies or any third-party tracking/analytics services.
- The Extension does **not** collect browsing history or any data outside of Teams meeting pages.

### What data is processed

The Extension processes the following data **locally on your device**:

1. **Live caption text** — Read from the Teams web page DOM to detect spoken captions during meetings. This text is sent **only** to the translation API endpoint you configure.
2. **API configuration** — Your translation API endpoint, API key, model name, and language preferences are stored locally in `chrome.storage.local` (the browser's built-in extension storage). This data never leaves your browser except to make the translation API calls you explicitly configured.

### Translation API data flow

- Caption text is sent directly from your browser to **your chosen** translation API endpoint (e.g., OpenAI, Google Translate, Microsoft Translator, or any OpenAI-compatible API).
- The Extension does **not** intermediate or proxy any translation requests through a third-party server.
- You are solely responsible for the privacy practices of your chosen translation API provider.

## Permissions

The Extension requests the following browser permissions:

| Permission | Purpose |
|---|---|
| `storage` | Store your API configuration and preferences locally |
| `downloads` | Allow exporting translated captions as files |
| `host_permissions` (teams.microsoft.com, teams.cloud.microsoft, teams.live.com) | Inject translation UI into Teams meeting pages |
| `host_permissions` (https://\*/, http://\*/) | Send caption text to your configured translation API endpoint |

## Third-Party Services

The Extension may interact with third-party translation APIs based on your configuration:

- **OpenAI / OpenAI-compatible APIs** (e.g., Poe) — subject to [OpenAI Privacy Policy](https://openai.com/privacy)
- **Google Cloud Translation API** — subject to [Google Privacy Policy](https://policies.google.com/privacy)
- **Microsoft Translator API** — subject to [Microsoft Privacy Statement](https://privacy.microsoft.com/privacystatement)

The Extension does not endorse or control these services. Please review their respective privacy policies.

## Data Retention

- API configuration data is retained in local browser storage until you uninstall the Extension or clear browser data.
- Translated captions displayed in the floating window are only kept in the page's memory and are lost when you close or navigate away from the Teams meeting page.
- Deduplication cache (used to prevent redundant translations) is kept in memory for up to 30 minutes and is cleared automatically.

## Children's Privacy

The Extension is not directed at children under the age of 13. We do not knowingly collect personal information from children.

## Changes to This Policy

We may update this privacy policy from time to time. Changes will be reflected in the "Last updated" date above. Continued use of the Extension after changes constitutes acceptance of the updated policy.

## Contact

For questions or concerns about this privacy policy, please open an issue on GitHub:

https://github.com/Amoiensis/TeamsLingo/issues

## License

This Extension is open source. See the repository for license details.
