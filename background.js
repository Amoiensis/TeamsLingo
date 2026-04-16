const DEFAULT_SETTINGS = {
  enabled: true,
  provider: "openai",
  apiFormat: "chat_completions",
  endpoint: "https://api.openai.com/v1/chat/completions",
  apiKey: "",
  model: "gpt-4o-mini",
  microsoftRegion: "",
  sourceLanguageMode: "auto",
  sourceLanguage: "",
  targetLanguage: "Chinese Simplified",
  uiLanguage: "zh-CN",
  panelTheme: "system",
  settleDelayMs: 1400,
  minChars: 2,
  maxItems: 30,
  processExistingOnStart: false
};

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  const missing = {};

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    if (current[key] === undefined) {
      missing[key] = value;
    }
  }

  if (Object.keys(missing).length > 0) {
    await chrome.storage.local.set(missing);
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message?.type === "getSettings") {
      const settings = await getSettings();
      return { ok: true, settings };
    }

    if (message?.type === "saveSettings") {
      await chrome.storage.local.set(sanitizeSettings(message.settings || {}));
      const settings = await getSettings();
      return { ok: true, settings };
    }

    if (message?.type === "openOptions") {
      await chrome.runtime.openOptionsPage();
      return { ok: true };
    }

    if (message?.type === "translate") {
      const settings = await getSettings();
      const result = await translateCaption(message.payload || {}, settings);
      return { ok: true, result };
    }

    if (message?.type === "downloadTranscript") {
      const downloadId = await downloadTranscript(message.payload || {});
      return { ok: true, downloadId };
    }

    return { ok: false, error: "Unknown message type." };
  })()
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));

  return true;
});

async function getSettings() {
  const values = await chrome.storage.local.get(DEFAULT_SETTINGS);
  return sanitizeSettings(values);
}

function sanitizeSettings(input) {
  const settings = { ...DEFAULT_SETTINGS, ...input };
  settings.enabled = Boolean(settings.enabled);
  settings.provider = ["openai", "google", "microsoft"].includes(settings.provider) ? settings.provider : "openai";
  settings.apiFormat = settings.apiFormat === "responses" ? "responses" : "chat_completions";
  settings.endpoint = String(settings.endpoint || "").trim();
  settings.apiKey = String(settings.apiKey || "").trim();
  settings.model = String(settings.model || "").trim();
  settings.microsoftRegion = String(settings.microsoftRegion || "").trim();
  settings.sourceLanguageMode = settings.sourceLanguageMode === "fixed" ? "fixed" : "auto";
  settings.sourceLanguage = normalizeLegacyLanguage(settings.sourceLanguage || "").trim();
  settings.targetLanguage = normalizeLegacyLanguage(settings.targetLanguage || DEFAULT_SETTINGS.targetLanguage).trim();
  settings.uiLanguage = settings.uiLanguage === "en" ? "en" : "zh-CN";
  settings.panelTheme = ["system", "dark", "light"].includes(settings.panelTheme) ? settings.panelTheme : "system";
  settings.settleDelayMs = clampNumber(settings.settleDelayMs, 500, 6000, DEFAULT_SETTINGS.settleDelayMs);
  settings.minChars = clampNumber(settings.minChars, 1, 80, DEFAULT_SETTINGS.minChars);
  settings.maxItems = clampNumber(settings.maxItems, 5, 100, DEFAULT_SETTINGS.maxItems);
  settings.processExistingOnStart = Boolean(settings.processExistingOnStart);
  return settings;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(number)));
}

async function downloadTranscript(payload) {
  const text = String(payload.text || "");
  if (!text) {
    throw new Error("Transcript is empty.");
  }

  const filename = sanitizeFilename(payload.filename || "teams-captions.txt");
  const url = `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;
  return chrome.downloads.download({
    url,
    filename,
    saveAs: true,
    conflictAction: "uniquify"
  });
}

function sanitizeFilename(filename) {
  const sanitized = String(filename || "teams-captions.txt")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return sanitized || "teams-captions.txt";
}

async function translateCaption(payload, settings) {
  const text = String(payload.text || "").trim();
  const speaker = String(payload.speaker || "").trim();

  if (!settings.enabled) {
    throw new Error("Translation is disabled.");
  }

  if (settings.provider === "openai" && !settings.endpoint) {
    throw new Error("API endpoint is not configured.");
  }

  if (settings.provider === "openai" && !settings.model) {
    throw new Error("Model is not configured.");
  }

  if (["google", "microsoft"].includes(settings.provider) && !settings.apiKey) {
    throw new Error("API key is not configured.");
  }

  if (!text) {
    throw new Error("Caption text is empty.");
  }

  const request = buildProviderRequest(text, speaker, settings);
  const response = await fetch(request.url, request.options);

  const raw = await response.text();
  let data = null;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch (_error) {
    data = null;
  }

  if (!response.ok) {
    const apiMessage = data?.error?.message || data?.message || raw.slice(0, 300);
    throw new Error(`API request failed (${response.status}): ${apiMessage}`);
  }

  const translated = extractProviderTranslation(data, settings.provider);

  if (!translated) {
    throw new Error("API response did not include translated text.");
  }

  return translated;
}

function buildProviderRequest(text, speaker, settings) {
  if (settings.provider === "google") {
    return buildGoogleRequest(text, settings);
  }

  if (settings.provider === "microsoft") {
    return buildMicrosoftRequest(text, settings);
  }

  return buildOpenAICompatibleRequest(text, speaker, settings);
}

function buildOpenAICompatibleRequest(text, speaker, settings) {
  const headers = {
    "Content-Type": "application/json"
  };

  if (settings.apiKey) {
    headers.Authorization = `Bearer ${settings.apiKey}`;
  }

  return {
    url: resolveEndpoint(settings.endpoint, settings.apiFormat),
    options: {
      method: "POST",
      headers,
      body: JSON.stringify(buildRequestBody(text, speaker, settings))
    }
  };
}

function buildGoogleRequest(text, settings) {
  const target = getLanguageCode(settings.targetLanguage, "google");
  const source = settings.sourceLanguageMode === "fixed"
    ? getLanguageCode(settings.sourceLanguage, "google")
    : "";
  const url = new URL(resolveGoogleEndpoint(settings.endpoint));

  if (settings.apiKey) {
    url.searchParams.set("key", settings.apiKey);
  }

  const body = {
    q: [text],
    target,
    format: "text"
  };

  if (source) {
    body.source = source;
  }

  return {
    url: url.toString(),
    options: {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  };
}

function buildMicrosoftRequest(text, settings) {
  const target = getLanguageCode(settings.targetLanguage, "microsoft");
  const source = settings.sourceLanguageMode === "fixed"
    ? getLanguageCode(settings.sourceLanguage, "microsoft")
    : "";
  const url = new URL(resolveMicrosoftEndpoint(settings.endpoint));
  url.searchParams.set("api-version", "3.0");
  url.searchParams.append("to", target);

  if (source) {
    url.searchParams.set("from", source);
  }

  const headers = {
    "Content-Type": "application/json",
    "Ocp-Apim-Subscription-Key": settings.apiKey
  };

  if (settings.microsoftRegion) {
    headers["Ocp-Apim-Subscription-Region"] = settings.microsoftRegion;
  }

  return {
    url: url.toString(),
    options: {
      method: "POST",
      headers,
      body: JSON.stringify([{ Text: text }])
    }
  };
}

function resolveGoogleEndpoint(endpoint) {
  const normalized = String(endpoint || "").trim().replace(/\/+$/, "");
  if (!normalized) {
    return "https://translation.googleapis.com/language/translate/v2";
  }
  if (normalized.endsWith("/language/translate/v2")) {
    return normalized;
  }
  if (normalized === "https://translation.googleapis.com") {
    return `${normalized}/language/translate/v2`;
  }
  return normalized;
}

function resolveMicrosoftEndpoint(endpoint) {
  const normalized = String(endpoint || "").trim().replace(/\/+$/, "");
  if (!normalized) {
    return "https://api.cognitive.microsofttranslator.com/translate";
  }
  if (normalized.endsWith("/translate")) {
    return normalized;
  }
  return `${normalized}/translate`;
}

function resolveEndpoint(endpoint, apiFormat) {
  const normalized = String(endpoint || "").trim().replace(/\/+$/, "");
  if (!normalized) {
    return normalized;
  }

  if (apiFormat === "responses") {
    if (normalized.endsWith("/chat/completions")) {
      return normalized.replace(/\/chat\/completions$/, "/responses");
    }
    if (normalized.endsWith("/responses")) {
      return normalized;
    }
    if (normalized.endsWith("/v1")) {
      return `${normalized}/responses`;
    }
    return normalized;
  }

  if (normalized.endsWith("/responses")) {
    return normalized.replace(/\/responses$/, "/chat/completions");
  }
  if (normalized.endsWith("/chat/completions")) {
    return normalized;
  }
  if (normalized.endsWith("/v1")) {
    return `${normalized}/chat/completions`;
  }
  return normalized;
}

function buildRequestBody(text, speaker, settings) {
  if (settings.apiFormat === "responses") {
    return buildResponsesBody(text, speaker, settings);
  }
  return buildChatCompletionBody(text, speaker, settings);
}

function buildTranslationPrompt(text, speaker, settings) {
  const sourceInstruction = settings.sourceLanguageMode === "fixed" && settings.sourceLanguage
    ? `Translate from ${settings.sourceLanguage} to ${settings.targetLanguage}.`
    : `Detect the source language from the caption text, then translate to ${settings.targetLanguage}.`;

  return [
    "You are a real-time meeting caption translator.",
    sourceInstruction,
    "Return only the translation.",
    "Keep names, product names, acronyms, code identifiers, and numbers unchanged when appropriate.",
    "If the caption mixes languages, preserve already clear technical English terms.",
    "",
    speaker ? `Speaker: ${speaker}` : "Speaker: Unknown",
    "Caption:",
    text
  ].join("\n");
}

function buildResponsesBody(text, speaker, settings) {
  return {
    model: settings.model,
    temperature: 0.1,
    input: buildTranslationPrompt(text, speaker, settings)
  };
}

function buildChatCompletionBody(text, speaker, settings) {
  const sourceInstruction = settings.sourceLanguageMode === "fixed" && settings.sourceLanguage
    ? `Translate from ${settings.sourceLanguage} to ${settings.targetLanguage}.`
    : `Detect the source language from the caption text, then translate to ${settings.targetLanguage}.`;

  return {
    model: settings.model,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content: [
          "You are a real-time meeting caption translator.",
          sourceInstruction,
          "Return only the translation.",
          "Keep names, product names, acronyms, code identifiers, and numbers unchanged when appropriate.",
          "If the caption mixes languages, preserve already clear technical English terms."
        ].join(" ")
      },
      {
        role: "user",
        content: [
          speaker ? `Speaker: ${speaker}` : "Speaker: Unknown",
          "Caption:",
          text
        ].join("\n")
      }
    ]
  };
}

function extractProviderTranslation(data, provider) {
  if (provider === "google") {
    return extractGoogleTranslation(data);
  }

  if (provider === "microsoft") {
    return extractMicrosoftTranslation(data);
  }

  return extractOpenAICompatibleTranslation(data);
}

function extractOpenAICompatibleTranslation(data) {
  const chatText = data?.choices?.[0]?.message?.content;
  if (typeof chatText === "string" && chatText.trim()) {
    return chatText.trim();
  }

  const plainText = data?.output_text;
  if (typeof plainText === "string" && plainText.trim()) {
    return plainText.trim();
  }

  const output = Array.isArray(data?.output) ? data.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      const text = part?.text || part?.content;
      if (typeof text === "string" && text.trim()) {
        return text.trim();
      }
    }
  }

  return "";
}

function extractGoogleTranslation(data) {
  const translated = data?.data?.translations?.[0]?.translatedText;
  if (typeof translated === "string" && translated.trim()) {
    return decodeHtmlEntities(translated.trim());
  }
  return "";
}

function extractMicrosoftTranslation(data) {
  const translated = data?.[0]?.translations?.[0]?.text;
  if (typeof translated === "string" && translated.trim()) {
    return translated.trim();
  }
  return "";
}

function normalizeLegacyLanguage(language) {
  const value = String(language || "").trim();
  if (value === "Simplified Chinese") {
    return "Chinese Simplified";
  }
  if (value === "Traditional Chinese") {
    return "Chinese Traditional";
  }
  if (value === "Japanese") {
    return "Japanese (Japan)";
  }
  return value;
}

function getLanguageCode(language, provider) {
  const normalized = normalizeLegacyLanguage(language);
  const entry = LANGUAGE_CODES[normalized] || LANGUAGE_CODES[stripRegion(normalized)];
  if (entry?.[provider]) {
    return entry[provider];
  }
  return normalized;
}

function stripRegion(language) {
  return String(language || "")
    .replace(/\s*\([^)]*\)\s*/g, "")
    .trim();
}

function decodeHtmlEntities(text) {
  return String(text)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

const LANGUAGE_CODES = {
  "Arabic": { google: "ar", microsoft: "ar" },
  "Chinese Simplified": { google: "zh-CN", microsoft: "zh-Hans" },
  "Chinese Traditional": { google: "zh-TW", microsoft: "zh-Hant" },
  "Czech": { google: "cs", microsoft: "cs" },
  "Danish": { google: "da", microsoft: "da" },
  "Dutch": { google: "nl", microsoft: "nl" },
  "English": { google: "en", microsoft: "en" },
  "English (US)": { google: "en", microsoft: "en" },
  "English (Canada)": { google: "en", microsoft: "en" },
  "English (India)": { google: "en", microsoft: "en" },
  "English (UK)": { google: "en", microsoft: "en" },
  "English (Australia)": { google: "en", microsoft: "en" },
  "English (New Zealand)": { google: "en", microsoft: "en" },
  "Finnish": { google: "fi", microsoft: "fi" },
  "French": { google: "fr", microsoft: "fr" },
  "French (Canada)": { google: "fr-CA", microsoft: "fr-ca" },
  "French (France)": { google: "fr", microsoft: "fr" },
  "German": { google: "de", microsoft: "de" },
  "German (Germany)": { google: "de", microsoft: "de" },
  "German (Switzerland)": { google: "de", microsoft: "de" },
  "Greek": { google: "el", microsoft: "el" },
  "Hebrew": { google: "iw", microsoft: "he" },
  "Hindi": { google: "hi", microsoft: "hi" },
  "Hungarian": { google: "hu", microsoft: "hu" },
  "Italian": { google: "it", microsoft: "it" },
  "Italian (Italy)": { google: "it", microsoft: "it" },
  "Japanese": { google: "ja", microsoft: "ja" },
  "Japanese (Japan)": { google: "ja", microsoft: "ja" },
  "Korean": { google: "ko", microsoft: "ko" },
  "Korean (Korea)": { google: "ko", microsoft: "ko" },
  "Norwegian": { google: "no", microsoft: "nb" },
  "Norwegian (Norway)": { google: "no", microsoft: "nb" },
  "Polish": { google: "pl", microsoft: "pl" },
  "Portuguese (Brazil)": { google: "pt-BR", microsoft: "pt" },
  "Portuguese (Portugal)": { google: "pt-PT", microsoft: "pt-pt" },
  "Romanian": { google: "ro", microsoft: "ro" },
  "Russian": { google: "ru", microsoft: "ru" },
  "Slovak": { google: "sk", microsoft: "sk" },
  "Spanish": { google: "es", microsoft: "es" },
  "Spanish (Mexico)": { google: "es", microsoft: "es" },
  "Spanish (Spain)": { google: "es", microsoft: "es" },
  "Swedish": { google: "sv", microsoft: "sv" },
  "Thai": { google: "th", microsoft: "th" },
  "Turkish": { google: "tr", microsoft: "tr" },
  "Ukrainian": { google: "uk", microsoft: "uk" },
  "Vietnamese": { google: "vi", microsoft: "vi" },
  "Vietnamese (Vietnam)": { google: "vi", microsoft: "vi" }
};
