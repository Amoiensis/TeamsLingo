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
  translationMode: "balanced",
  thinkingControlMode: "none",
  thinkingControlSignature: "",
  thinkingControlDetection: "unknown",
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

    if (message?.type === "probeModel") {
      const settings = sanitizeSettings(message.settings || await getSettings());
      const profile = await probeModelProfile(settings);
      return { ok: true, profile };
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
  settings.translationMode = ["fast", "balanced", "complete"].includes(settings.translationMode)
    ? settings.translationMode
    : DEFAULT_SETTINGS.translationMode;
  settings.thinkingControlMode = [
    "none",
    "think_false",
    "reasoning_effort_none",
    "reasoning_effort_minimal",
    "reasoning_effort_low",
    "reasoning_object_minimal",
    "reasoning_object_low",
    "reasoning_object_none"
  ].includes(settings.thinkingControlMode)
    ? settings.thinkingControlMode
    : DEFAULT_SETTINGS.thinkingControlMode;
  settings.thinkingControlSignature = String(settings.thinkingControlSignature || "").trim();
  settings.thinkingControlDetection = ["probe", "heuristic", "not_applicable", "unknown"].includes(settings.thinkingControlDetection)
    ? settings.thinkingControlDetection
    : DEFAULT_SETTINGS.thinkingControlDetection;
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

  const request = buildProviderRequest(text, settings);
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

async function probeModelProfile(settings) {
  if (settings.provider !== "openai") {
    return {
      endpointKind: settings.provider,
      modelExists: null,
      isThinkingModel: false,
      detection: "not_applicable",
      recommendedControl: "none",
      cacheSettings: buildThinkingCachePatch(settings, {
        mode: "none",
        detection: "not_applicable",
        verified: false
      })
    };
  }

  if (!settings.endpoint) {
    throw new Error("API endpoint is not configured.");
  }

  if (!settings.model) {
    throw new Error("Model is not configured.");
  }

  const endpointUrl = resolveEndpoint(settings.endpoint, settings.apiFormat);
  const endpointKind = detectEndpointKind(endpointUrl);
  const capability = classifyModelCapability(settings.model, endpointKind);
  let registry = {
    listed: false,
    exists: null
  };

  try {
    registry = await fetchModelRegistry(settings);
  } catch (error) {
    registry = {
      listed: false,
      exists: null,
      error: error.message || String(error)
    };
  }

  const control = await probeThinkingControl(settings, endpointUrl, capability);

  return {
    endpointKind,
    modelExists: registry.exists,
    modelListed: registry.listed,
    modelRegistryError: registry.error || "",
    isThinkingModel: capability.isThinkingModel || control.thinkingDetected,
    detection: control.detection,
    recommendedControl: capability.recommendedControl,
    resolvedControl: control.mode,
    controlVerified: control.verified,
    cacheSettings: buildThinkingCachePatch(settings, control, endpointUrl)
  };
}

async function probeThinkingControl(settings, endpointUrl, capability) {
  const candidates = buildThinkingControlCandidates(settings, endpointUrl, capability);
  let thinkingDetected = false;

  for (const candidate of candidates) {
    const result = await tryThinkingControlCandidate(settings, endpointUrl, candidate);
    thinkingDetected = thinkingDetected || result.thinkingDetected;
    if (result.ok) {
      return {
        mode: candidate.mode,
        detection: "probe",
        verified: true,
        thinkingDetected
      };
    }
  }

  const fallbackMode = resolveHeuristicThinkingMode(endpointUrl, settings.model);
  return {
    mode: fallbackMode,
    detection: fallbackMode === "none" ? capability.detection : "heuristic",
    verified: false,
    thinkingDetected
  };
}

function buildThinkingControlCandidates(settings, endpointUrl, capability) {
  if (!capability.isThinkingModel) {
    return [];
  }

  const endpointKind = detectEndpointKind(endpointUrl);
  if (settings.apiFormat === "responses") {
    const candidates = [
      { mode: "reasoning_object_none" },
      { mode: "reasoning_object_minimal" },
      { mode: "reasoning_object_low" }
    ];
    if (endpointKind === "ollama" && supportsBooleanThinkToggle(settings.model)) {
      candidates.push({ mode: "think_false" });
    }
    return candidates;
  }

  const candidates = [
    { mode: "reasoning_effort_none" },
    { mode: "reasoning_effort_minimal" },
    { mode: "reasoning_effort_low" }
  ];
  if (endpointKind === "ollama" && supportsBooleanThinkToggle(settings.model)) {
    candidates.push({ mode: "think_false" });
  }
  return candidates;
}

async function tryThinkingControlCandidate(settings, endpointUrl, candidate) {
  const headers = {
    "Content-Type": "application/json"
  };

  if (settings.apiKey) {
    headers.Authorization = `Bearer ${settings.apiKey}`;
  }

  const response = await fetch(endpointUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(buildProbeBody(settings, endpointUrl, candidate))
  });

  const raw = await response.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch (_error) {
    data = null;
  }

  const thinkingDetected = hasThinkingTrace(data, raw);
  if (response.ok) {
    return {
      ok: !thinkingDetected,
      thinkingDetected
    };
  }

  return {
    ok: false,
    thinkingDetected
  };
}

function buildProbeBody(settings, endpointUrl, candidate) {
  const text = "Reply with OK.";
  if (settings.apiFormat === "responses") {
    return applyThinkingControlToBody({
      model: settings.model,
      input: text,
      temperature: 0,
      max_output_tokens: 4
    }, candidate.mode, "responses");
  }

  const endpointKind = detectEndpointKind(endpointUrl);
  return applyThinkingControlToBody({
    model: settings.model,
    messages: [
      {
        role: "user",
        content: text
      }
    ],
    temperature: 0,
    ...(endpointKind === "ollama"
      ? { max_tokens: 4 }
      : { max_completion_tokens: 4 }),
    stream: false
  }, candidate.mode, "chat_completions");
}

function buildThinkingCachePatch(settings, control, endpointUrl = "") {
  return {
    thinkingControlMode: control.mode,
    thinkingControlSignature: buildThinkingControlSignature(settings, endpointUrl),
    thinkingControlDetection: control.detection
  };
}

function buildThinkingControlSignature(settings, endpointUrl = "") {
  const url = endpointUrl || resolveEndpoint(settings.endpoint, settings.apiFormat);
  return [
    settings.provider,
    settings.apiFormat,
    url,
    settings.model
  ].join("::");
}

async function fetchModelRegistry(settings) {
  const url = resolveModelsEndpoint(settings.endpoint);
  if (!url) {
    return { listed: false, exists: null };
  }

  const headers = {};
  if (settings.apiKey) {
    headers.Authorization = `Bearer ${settings.apiKey}`;
  }

  const response = await fetch(url, {
    method: "GET",
    headers
  });

  const raw = await response.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch (_error) {
    data = null;
  }

  if (!response.ok) {
    const apiMessage = data?.error?.message || data?.message || raw.slice(0, 300);
    throw new Error(`Model registry request failed (${response.status}): ${apiMessage}`);
  }

  const models = Array.isArray(data?.data) ? data.data : [];
  return {
    listed: true,
    exists: models.some((item) => String(item?.id || "").trim() === settings.model)
  };
}

function resolveModelsEndpoint(endpoint) {
  const normalized = String(endpoint || "").trim().replace(/\/+$/, "");
  if (!normalized) {
    return normalized;
  }
  if (normalized.endsWith("/chat/completions")) {
    return normalized.replace(/\/chat\/completions$/, "/models");
  }
  if (normalized.endsWith("/responses")) {
    return normalized.replace(/\/responses$/, "/models");
  }
  if (normalized.endsWith("/models")) {
    return normalized;
  }
  if (normalized.endsWith("/v1")) {
    return `${normalized}/models`;
  }
  return `${normalized}/models`;
}

function detectEndpointKind(endpoint) {
  if (isOllamaCompatibleEndpoint(endpoint)) {
    return "ollama";
  }
  if (isOpenAIOfficialEndpoint(endpoint)) {
    return "openai";
  }
  return "generic";
}

function isOpenAIOfficialEndpoint(endpoint) {
  const normalized = String(endpoint || "").trim();
  if (!normalized) {
    return false;
  }

  try {
    const url = new URL(normalized);
    return url.hostname === "api.openai.com";
  } catch (_error) {
    return false;
  }
}

function classifyModelCapability(model, endpointKind) {
  const normalized = String(model || "").trim().toLowerCase();
  const isOpenAIReasoningFamily = /^(gpt-5|o1|o3|o4)/.test(normalized);
  const isThirdPartyThinkingFamily = /(qwen3|qwq|deepseek-r1|deepseek-v3\.1|gpt-oss|gemma4)/.test(normalized);

  if (endpointKind === "ollama") {
    if (isThirdPartyThinkingFamily) {
      return {
        isThinkingModel: true,
        detection: "heuristic",
        recommendedControl: "reasoning_effort"
      };
    }
    return {
      isThinkingModel: false,
      detection: "heuristic",
      recommendedControl: "none"
    };
  }

  if (isOpenAIReasoningFamily) {
    return {
      isThinkingModel: true,
      detection: "heuristic",
      recommendedControl: "reasoning_effort"
    };
  }

  if (isThirdPartyThinkingFamily) {
    return {
      isThinkingModel: true,
      detection: "heuristic",
      recommendedControl: "reasoning_effort"
    };
  }

  return {
    isThinkingModel: false,
    detection: endpointKind === "generic" ? "unknown" : "heuristic",
    recommendedControl: "none"
  };
}

function buildProviderRequest(text, settings) {
  if (settings.provider === "google") {
    return buildGoogleRequest(text, settings);
  }

  if (settings.provider === "microsoft") {
    return buildMicrosoftRequest(text, settings);
  }

  return buildOpenAICompatibleRequest(text, settings);
}

function buildOpenAICompatibleRequest(text, settings) {
  const headers = {
    "Content-Type": "application/json"
  };

  if (settings.apiKey) {
    headers.Authorization = `Bearer ${settings.apiKey}`;
  }

  const url = resolveEndpoint(settings.endpoint, settings.apiFormat);

  return {
    url,
    options: {
      method: "POST",
      headers,
      body: JSON.stringify(buildRequestBody(text, settings, url))
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

function buildRequestBody(text, settings, requestUrl = "") {
  const body = settings.apiFormat === "responses"
    ? buildResponsesBody(text, settings)
    : buildChatCompletionBody(text, settings);
  const controlMode = resolveThinkingControlMode(settings, requestUrl);

  return applyThinkingControlToBody(body, controlMode, settings.apiFormat);
}

function resolveThinkingControlMode(settings, requestUrl) {
  const signature = buildThinkingControlSignature(settings, requestUrl);
  if (settings.thinkingControlSignature && settings.thinkingControlSignature === signature) {
    return settings.thinkingControlMode;
  }
  return resolveHeuristicThinkingMode(requestUrl || settings.endpoint, settings.model);
}

function resolveHeuristicThinkingMode(endpoint, model) {
  if (isOllamaCompatibleEndpoint(endpoint) && supportsBooleanThinkToggle(model)) {
    return "think_false";
  }
  return "none";
}

function applyThinkingControlToBody(body, mode, apiFormat) {
  if (mode === "think_false") {
    return {
      ...body,
      think: false
    };
  }

  const reasoningEffortMatch = /^reasoning_effort_(none|minimal|low)$/.exec(mode);
  if (reasoningEffortMatch && apiFormat === "chat_completions") {
    return {
      ...body,
      reasoning_effort: reasoningEffortMatch[1]
    };
  }

  const reasoningObjectMatch = /^reasoning_object_(none|minimal|low)$/.exec(mode);
  if (reasoningObjectMatch && apiFormat === "responses") {
    return {
      ...body,
      reasoning: {
        ...(body.reasoning || {}),
        effort: reasoningObjectMatch[1]
      }
    };
  }

  return body;
}

function isOllamaCompatibleEndpoint(endpoint) {
  const normalized = String(endpoint || "").trim();
  if (!normalized) {
    return false;
  }

  try {
    const url = new URL(normalized);
    return url.port === "11434" || /(^|\.)ollama($|\.)/i.test(url.hostname);
  } catch (_error) {
    return normalized.includes(":11434");
  }
}

function supportsBooleanThinkToggle(model) {
  const normalized = String(model || "").trim().toLowerCase();
  if (!normalized || /gpt-oss/.test(normalized)) {
    return false;
  }

  return /(qwen3|qwq|deepseek-r1|deepseek-v3\.1)/.test(normalized);
}

function hasThinkingTrace(data, raw = "") {
  const responseText = [
    raw,
    data?.choices?.[0]?.message?.content,
    data?.output_text
  ].filter((value) => typeof value === "string" && value.trim()).join("\n");

  if (typeof data?.choices?.[0]?.message?.thinking === "string" && data.choices[0].message.thinking.trim()) {
    return true;
  }

  const output = Array.isArray(data?.output) ? data.output : [];
  for (const item of output) {
    if (item?.type === "reasoning") {
      return true;
    }
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (part?.type === "reasoning" || part?.type === "reasoning_text") {
        return true;
      }
    }
  }

  return /<\|think\|>|<\|channel\|>thought|<channel\|>|\bmessage\.thinking\b/i.test(responseText);
}

function stripThinkingTraceText(text) {
  const normalized = String(text || "");
  if (!normalized.trim()) {
    return "";
  }

  return normalized
    .replace(/<\|think\|>\s*/gi, "")
    .replace(/<\|channel\|>thought[\s\S]*?<channel\|>\s*/gi, "")
    .replace(/<channel\|>\s*/gi, "")
    .trim();
}

function buildTranslationPrompt(text, settings) {
  const sourceInstruction = settings.sourceLanguageMode === "fixed" && settings.sourceLanguage
    ? `Translate from ${settings.sourceLanguage} to ${settings.targetLanguage}.`
    : `Detect the source language from the caption text, then translate to ${settings.targetLanguage}.`;

  return [
    "You are a real-time meeting caption translator.",
    sourceInstruction,
    `Return only the translated text in ${settings.targetLanguage}.`,
    "Keep names, product names, acronyms, code identifiers, and numbers unchanged when appropriate.",
    "If the caption mixes languages, preserve already clear technical English terms.",
    "If the caption is fragmentary ASR text, translate only the content that is present and do not invent missing words.",
    "Do not add pinyin, transliteration, notes, explanations, bullet points, or surrounding quotes.",
    "",
    "Caption:",
    text
  ].filter(Boolean).join("\n");
}

function buildResponsesBody(text, settings) {
  return {
    model: settings.model,
    temperature: 0.1,
    input: buildTranslationPrompt(text, settings)
  };
}

function buildChatCompletionBody(text, settings) {
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
          `Return only the translated text in ${settings.targetLanguage}.`,
          "Keep names, product names, acronyms, code identifiers, and numbers unchanged when appropriate.",
          "If the caption mixes languages, preserve already clear technical English terms.",
          "If the caption is fragmentary ASR text, translate only the content that is present and do not invent missing words.",
          "Do not add pinyin, transliteration, notes, explanations, bullet points, or surrounding quotes."
        ].join(" ")
      },
      {
        role: "user",
        content: [
          "Caption:",
          text
        ].filter(Boolean).join("\n")
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
    return stripThinkingTraceText(chatText);
  }

  const plainText = data?.output_text;
  if (typeof plainText === "string" && plainText.trim()) {
    return stripThinkingTraceText(plainText);
  }

  const output = Array.isArray(data?.output) ? data.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      const text = part?.text || part?.content;
      if (typeof text === "string" && text.trim()) {
        return stripThinkingTraceText(text);
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
