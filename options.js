const DEFAULT_OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const DEFAULT_RESPONSES_ENDPOINT = "https://api.poe.com/v1";
const DEFAULT_GOOGLE_ENDPOINT = "https://translate.googleapis.com/translate_a/t";
const DEFAULT_MICROSOFT_ENDPOINT = "https://api-edge.cognitive.microsofttranslator.com/translate";
const MANIFEST = chrome.runtime.getManifest();
const CURRENT_EXTENSION_VERSION = MANIFEST.version;
const PROJECT_REPO_URL = MANIFEST.homepage_url || "https://github.com/Amoiensis/TeamsLingo";
const PROJECT_RELEASES_URL = `${PROJECT_REPO_URL}/releases`;
const PROJECT_UPDATE_GUIDE_URLS = {
  "zh-CN": `${PROJECT_REPO_URL}/blob/main/docs/UPDATE_GUIDE.md`,
  en: `${PROJECT_REPO_URL}/blob/main/docs/UPDATE_GUIDE.en.md`,
  ja: `${PROJECT_REPO_URL}/blob/main/docs/UPDATE_GUIDE.ja.md`
};
const DEFAULT_UI_LANGUAGE = resolveInitialUiLanguage();
const DEFAULT_PROVIDER = resolveDefaultProvider(DEFAULT_UI_LANGUAGE);
const DEFAULT_SETTINGS = {
  enabled: true,
  provider: DEFAULT_PROVIDER,
  apiFormat: "chat_completions",
  endpoint: resolveDefaultEndpoint(DEFAULT_PROVIDER, "chat_completions"),
  apiKey: "",
  model: "gpt-4o-mini",
  microsoftRegion: "",
  sourceLanguageMode: "auto",
  sourceLanguage: "",
  targetLanguage: "Chinese Simplified",
  translationMode: "balanced",
  uiLanguage: DEFAULT_UI_LANGUAGE,
  panelTheme: "system",
  settleDelayMs: 1400,
  minChars: 2,
  maxItems: 30,
  processExistingOnStart: false
};

function resolveInitialUiLanguage() {
  try {
    const language = chrome?.i18n?.getUILanguage?.() || navigator?.language || "";
    if (/^zh\b/i.test(language)) {
      return "zh-CN";
    }
    if (/^ja\b/i.test(language)) {
      return "ja";
    }
    return "en";
  } catch (_error) {
    return "zh-CN";
  }
}

function resolveDefaultProvider(uiLanguage) {
  return uiLanguage === "zh-CN" ? "microsoft" : "google";
}

function resolveDefaultEndpoint(provider, apiFormat) {
  if (provider === "google") {
    return DEFAULT_GOOGLE_ENDPOINT;
  }
  if (provider === "microsoft") {
    return DEFAULT_MICROSOFT_ENDPOINT;
  }
  return apiFormat === "responses" ? DEFAULT_RESPONSES_ENDPOINT : DEFAULT_OPENAI_ENDPOINT;
}

const i18n = window.TCT_I18N;
const form = document.getElementById("settings-form");
const message = document.getElementById("message");
const DEFAULT_PROVIDER_ENDPOINTS = {
  google: DEFAULT_GOOGLE_ENDPOINT,
  microsoft: DEFAULT_MICROSOFT_ENDPOINT
};
const fields = {
  enabled: document.getElementById("enabled"),
  uiLanguage: document.getElementById("uiLanguage"),
  panelTheme: document.getElementById("panelTheme"),
  provider: document.getElementById("provider"),
  providerAdvanced: document.getElementById("providerAdvanced"),
  apiFormat: document.getElementById("apiFormat"),
  endpoint: document.getElementById("endpoint"),
  endpointHelp: document.getElementById("endpointHelp"),
  apiKey: document.getElementById("apiKey"),
  model: document.getElementById("model"),
  microsoftRegion: document.getElementById("microsoftRegion"),
  sourceLanguageMode: document.getElementById("sourceLanguageMode"),
  sourceLanguageSelect: document.getElementById("sourceLanguageSelect"),
  sourceLanguageCustom: document.getElementById("sourceLanguageCustom"),
  targetLanguageSelect: document.getElementById("targetLanguageSelect"),
  targetLanguageCustom: document.getElementById("targetLanguageCustom"),
  translationMode: document.getElementById("translationMode"),
  settleDelayMs: document.getElementById("settleDelayMs"),
  minChars: document.getElementById("minChars"),
  maxItems: document.getElementById("maxItems"),
  processExistingOnStart: document.getElementById("processExistingOnStart"),
  checkUpdate: document.getElementById("checkUpdate"),
  currentVersion: document.getElementById("currentVersion"),
  latestVersion: document.getElementById("latestVersion"),
  updateStatus: document.getElementById("updateStatus"),
  releaseLink: document.getElementById("releaseLink"),
  updateGuideLink: document.getElementById("updateGuideLink"),
  footerVersion: document.getElementById("footerVersion")
};

let currentUiLanguage = DEFAULT_SETTINGS.uiLanguage;
let currentProvider = DEFAULT_SETTINGS.provider;
let lastMessage = null;
let updateState = createInitialUpdateState();

document.addEventListener("DOMContentLoaded", restore);
form.addEventListener("submit", save);
fields.uiLanguage.addEventListener("change", handleUiLanguageChange);
fields.sourceLanguageMode.addEventListener("change", syncLanguageControls);
fields.sourceLanguageSelect.addEventListener("change", syncLanguageControls);
fields.targetLanguageSelect.addEventListener("change", syncLanguageControls);
fields.provider.addEventListener("change", handleProviderChange);
fields.apiFormat.addEventListener("change", syncApiPlaceholder);
document.getElementById("test").addEventListener("click", testTranslation);
fields.checkUpdate.addEventListener("click", () => {
  void checkForUpdates();
});

async function restore() {
  initializeUpdateSection();
  populateLanguageSelect(fields.sourceLanguageSelect, TCT_SOURCE_LANGUAGES);
  populateLanguageSelect(fields.targetLanguageSelect, TCT_TARGET_LANGUAGES);

  const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);
  fields.enabled.checked = Boolean(settings.enabled);
  fields.uiLanguage.value = i18n.normalizeLanguage(settings.uiLanguage);
  fields.panelTheme.value = normalizePanelTheme(settings.panelTheme);
  fields.provider.value = ["openai", "google", "microsoft"].includes(settings.provider) ? settings.provider : "openai";
  fields.apiFormat.value = settings.apiFormat === "responses" ? "responses" : "chat_completions";
  fields.endpoint.value = settings.endpoint || "";
  fields.apiKey.value = settings.apiKey || "";
  fields.model.value = settings.model || "";
  fields.microsoftRegion.value = settings.microsoftRegion || "";
  fields.sourceLanguageMode.value = settings.sourceLanguageMode === "fixed" ? "fixed" : "auto";
  setLanguageSelection(fields.sourceLanguageSelect, fields.sourceLanguageCustom, normalizeLegacyLanguage(settings.sourceLanguage || "Japanese (Japan)"));
  setLanguageSelection(fields.targetLanguageSelect, fields.targetLanguageCustom, normalizeLegacyLanguage(settings.targetLanguage || DEFAULT_SETTINGS.targetLanguage));
  fields.translationMode.value = ["fast", "balanced", "complete"].includes(settings.translationMode)
    ? settings.translationMode
    : DEFAULT_SETTINGS.translationMode;
  fields.settleDelayMs.value = settings.settleDelayMs;
  fields.minChars.value = settings.minChars;
  fields.maxItems.value = settings.maxItems;
  fields.processExistingOnStart.checked = Boolean(settings.processExistingOnStart);

  applyInterfaceLanguage(fields.uiLanguage.value);
  currentProvider = fields.provider.value;
  syncLanguageControls();
  syncProviderControls();
  void checkForUpdates();
}

async function save(event) {
  event.preventDefault();
  const nextSettings = readForm();
  const probe = await probeAndPersistModelProfile(nextSettings);
  const probeSummary = summarizeModelProfile(probe);
  if (probeSummary) {
    showMessageText(`${t("options.saved")} ${probeSummary}`);
    return;
  }
  showMessageKey("options.saved");
}

async function testTranslation() {
  const nextSettings = readForm();
  const probe = await probeAndPersistModelProfile(nextSettings);
  showMessageKey("options.testing");

  try {
    const probeSummary = summarizeModelProfile(probe);
    const response = await sendMessage({
      type: "translate",
      settings: nextSettings,
      payload: {
        text: "この設定でリアルタイム字幕を翻訳します。",
        ignoreEnabled: true
      }
    });

    if (!response?.ok) {
      throw new Error(response?.error || t("options.testFailure"));
    }

    let summary = t("options.testSuccess", { result: response.result });
    if (probeSummary) {
      summary += ` ${probeSummary}`;
    }
    showMessageText(summary);
  } catch (error) {
    showMessageText(error.message || t("options.testFailure"), true);
  }
}

function readForm() {
  const sourceLanguageMode = fields.sourceLanguageMode.value === "fixed" ? "fixed" : "auto";
  return {
    enabled: fields.enabled.checked,
    uiLanguage: i18n.normalizeLanguage(fields.uiLanguage.value),
    panelTheme: normalizePanelTheme(fields.panelTheme.value),
    provider: fields.provider.value,
    apiFormat: fields.apiFormat.value === "responses" ? "responses" : "chat_completions",
    endpoint: fields.endpoint.value.trim(),
    apiKey: fields.apiKey.value.trim(),
    model: fields.model.value.trim(),
    microsoftRegion: fields.microsoftRegion.value.trim(),
    sourceLanguageMode,
    sourceLanguage: sourceLanguageMode === "fixed"
      ? readLanguageSelection(fields.sourceLanguageSelect, fields.sourceLanguageCustom)
      : "",
    targetLanguage: readLanguageSelection(fields.targetLanguageSelect, fields.targetLanguageCustom),
    translationMode: ["fast", "balanced", "complete"].includes(fields.translationMode.value)
      ? fields.translationMode.value
      : DEFAULT_SETTINGS.translationMode,
    settleDelayMs: Number(fields.settleDelayMs.value),
    minChars: Number(fields.minChars.value),
    maxItems: Number(fields.maxItems.value),
    processExistingOnStart: fields.processExistingOnStart.checked
  };
}

function populateLanguageSelect(select, languages) {
  select.textContent = "";
  for (const [value, label] of languages) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.append(option);
  }

  const custom = document.createElement("option");
  custom.value = TCT_CUSTOM_LANGUAGE;
  custom.dataset.customOption = "true";
  select.append(custom);
}

function setLanguageSelection(select, customInput, language) {
  const normalized = normalizeLegacyLanguage(language);
  const matchingOption = Array.from(select.options).find((option) => option.value === normalized);
  if (matchingOption) {
    select.value = matchingOption.value;
    customInput.value = "";
    return;
  }

  select.value = TCT_CUSTOM_LANGUAGE;
  customInput.value = normalized;
}

function readLanguageSelection(select, customInput) {
  if (select.value === TCT_CUSTOM_LANGUAGE) {
    return customInput.value.trim();
  }
  return select.value;
}

function handleUiLanguageChange() {
  applyInterfaceLanguage(fields.uiLanguage.value);
}

function handleProviderChange() {
  const nextProvider = fields.provider.value;
  if (nextProvider !== currentProvider) {
    fields.endpoint.value = getDefaultEndpointForProvider(nextProvider);
  }
  currentProvider = nextProvider;
  syncProviderControls();
}

function applyInterfaceLanguage(language) {
  currentUiLanguage = i18n.normalizeLanguage(language);
  document.documentElement.lang = currentUiLanguage;
  i18n.translatePage(document, currentUiLanguage);
  refreshCustomLanguageOptionLabels();
  syncApiPlaceholder();
  syncApiKeyPlaceholder();
  renderMessage();
  renderUpdateState();
}

function refreshCustomLanguageOptionLabels() {
  for (const option of document.querySelectorAll('option[data-custom-option="true"]')) {
    option.textContent = t("common.custom");
  }
}

function syncLanguageControls() {
  const fixedSource = fields.sourceLanguageMode.value === "fixed";
  fields.sourceLanguageSelect.disabled = !fixedSource;
  fields.sourceLanguageCustom.hidden = !fixedSource || fields.sourceLanguageSelect.value !== TCT_CUSTOM_LANGUAGE;
  fields.targetLanguageCustom.hidden = fields.targetLanguageSelect.value !== TCT_CUSTOM_LANGUAGE;
}

function syncProviderControls() {
  const provider = fields.provider.value;
  for (const element of document.querySelectorAll(".provider-openai")) {
    element.hidden = provider !== "openai";
  }
  for (const element of document.querySelectorAll(".provider-microsoft")) {
    element.hidden = provider !== "microsoft";
  }

  fields.providerAdvanced.classList.toggle("openai-mode", provider === "openai");
  fields.providerAdvanced.open = provider === "openai";
  syncApiPlaceholder();
  syncApiKeyPlaceholder();
}

function syncApiPlaceholder() {
  if (fields.provider.value === "google") {
    fields.endpoint.placeholder = DEFAULT_PROVIDER_ENDPOINTS.google;
    fields.endpointHelp.textContent = t("options.endpointHelpGoogle");
  } else if (fields.provider.value === "microsoft") {
    fields.endpoint.placeholder = DEFAULT_PROVIDER_ENDPOINTS.microsoft;
    fields.endpointHelp.textContent = t("options.endpointHelpMicrosoft");
  } else if (fields.apiFormat.value === "responses") {
    fields.endpoint.placeholder = "https://api.poe.com/v1";
    fields.endpointHelp.textContent = t("options.endpointHelpResponses");
  } else {
    fields.endpoint.placeholder = "https://api.openai.com/v1/chat/completions";
    fields.endpointHelp.textContent = t("options.endpointHelpChat");
  }
}

function syncApiKeyPlaceholder() {
  fields.apiKey.placeholder = fields.provider.value === "openai" ? "sk-..." : "";
}

function getDefaultEndpointForProvider(provider) {
  if (provider === "google") {
    return DEFAULT_PROVIDER_ENDPOINTS.google;
  }
  if (provider === "microsoft") {
    return DEFAULT_PROVIDER_ENDPOINTS.microsoft;
  }
  if (fields.apiFormat.value === "responses") {
    return DEFAULT_RESPONSES_ENDPOINT;
  }
  return DEFAULT_OPENAI_ENDPOINT;
}

function initializeUpdateSection() {
  fields.currentVersion.textContent = formatVersion(CURRENT_EXTENSION_VERSION);
  fields.footerVersion.textContent = formatVersion(CURRENT_EXTENSION_VERSION);
  fields.releaseLink.href = PROJECT_RELEASES_URL;
  updateState = createInitialUpdateState();
  renderUpdateState();
}

function createInitialUpdateState() {
  return {
    status: "idle",
    latestVersion: "",
    releaseUrl: PROJECT_RELEASES_URL
  };
}

async function checkForUpdates() {
  updateState = {
    ...updateState,
    status: "checking"
  };
  renderUpdateState();

  try {
    const response = await sendMessage({ type: "checkReleaseUpdate" });
    if (!response?.ok || !response.release?.tagName) {
      throw new Error(response?.error || "Unable to reach the project release URL.");
    }

    const latestVersion = String(response.release.tagName || "").trim();
    updateState = {
      status: compareVersions(latestVersion, CURRENT_EXTENSION_VERSION) > 0 ? "available" : "current",
      latestVersion,
      releaseUrl: String(response.release.htmlUrl || PROJECT_RELEASES_URL).trim() || PROJECT_RELEASES_URL
    };
  } catch (_error) {
    updateState = {
      status: "unavailable",
      latestVersion: "",
      releaseUrl: PROJECT_RELEASES_URL
    };
  }

  renderUpdateState();
}

function renderUpdateState() {
  fields.currentVersion.textContent = formatVersion(CURRENT_EXTENSION_VERSION);
  fields.latestVersion.textContent = updateState.latestVersion
    ? formatVersion(updateState.latestVersion)
    : t("options.updateLatestUnknown");
  fields.checkUpdate.disabled = updateState.status === "checking";

  let statusText = "";
  let statusClass = "";
  if (updateState.status === "checking") {
    statusText = t("options.updateChecking");
  } else if (updateState.status === "available") {
    statusText = t("options.updateAvailable", {
      latest: formatVersion(updateState.latestVersion),
      current: formatVersion(CURRENT_EXTENSION_VERSION)
    });
    statusClass = "success";
  } else if (updateState.status === "current") {
    statusText = t("options.updateCurrent", {
      current: formatVersion(CURRENT_EXTENSION_VERSION)
    });
    statusClass = "success";
  } else if (updateState.status === "unavailable") {
    statusText = t("options.updateUnavailable");
    statusClass = "error";
  }

  fields.updateStatus.textContent = statusText;
  fields.updateStatus.classList.toggle("success", statusClass === "success");
  fields.updateStatus.classList.toggle("error", statusClass === "error");
  renderUpdateLinks();
}

function renderUpdateLinks() {
  const guideUrl = resolveUpdateGuideUrl(currentUiLanguage);
  const showLinks = updateState.status === "available" || updateState.status === "current";

  fields.releaseLink.href = updateState.releaseUrl || PROJECT_RELEASES_URL;
  fields.updateGuideLink.href = guideUrl;
  fields.releaseLink.hidden = !showLinks;
  fields.updateGuideLink.hidden = !showLinks;
}

function resolveUpdateGuideUrl(language) {
  return PROJECT_UPDATE_GUIDE_URLS[i18n.normalizeLanguage(language)] || PROJECT_UPDATE_GUIDE_URLS["zh-CN"];
}

function formatVersion(version) {
  const value = String(version || "").trim();
  if (!value) {
    return t("options.updateLatestUnknown");
  }
  return value.startsWith("v") ? value : `v${value}`;
}

function compareVersions(left, right) {
  const leftParts = splitVersionParts(left);
  const rightParts = splitVersionParts(right);
  const maxLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftValue = leftParts[index] || 0;
    const rightValue = rightParts[index] || 0;
    if (leftValue > rightValue) {
      return 1;
    }
    if (leftValue < rightValue) {
      return -1;
    }
  }

  return 0;
}

function splitVersionParts(version) {
  return String(version || "")
    .trim()
    .replace(/^[^\d]+/, "")
    .split(/[^0-9]+/)
    .filter(Boolean)
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isFinite(part));
}

async function probeAndPersistModelProfile(settings) {
  let nextSettings = { ...settings };

  if (settings.provider !== "openai" || !settings.endpoint || !settings.model) {
    await chrome.storage.local.set(nextSettings);
    return null;
  }

  try {
    const response = await sendMessage({
      type: "probeModel",
      settings
    });

    if (!response?.ok) {
      throw new Error(response?.error || "Model probe failed.");
    }

    nextSettings = {
      ...nextSettings,
      ...(response.profile?.cacheSettings || {})
    };
    await chrome.storage.local.set(nextSettings);
    return response.profile || null;
  } catch (error) {
    nextSettings = {
      ...nextSettings,
      thinkingControlMode: "none",
      thinkingControlSignature: "",
      thinkingControlDetection: "unknown"
    };
    await chrome.storage.local.set(nextSettings);
    return {
      recommendedControl: "none",
      detection: "unknown",
      probeError: error.message || String(error)
    };
  }
}

function summarizeModelProfile(profile) {
  if (!profile) {
    return "";
  }

  if (profile.modelListed && profile.modelExists === false) {
    return t("options.modelProbeMissing");
  }

  if (profile.probeError) {
    return t("options.modelProbeFailed", {
      message: profile.probeError
    });
  }

  if (profile.resolvedControl === "think_false") {
    return profile.controlVerified
      ? t("options.modelProbeThinkFalseVerified")
      : t("options.modelProbeThinkFalse");
  }

  if (profile.resolvedControl === "reasoning_effort_none") {
    return t("options.modelProbeReasoningEffortVerified");
  }

  if (profile.resolvedControl === "reasoning_effort_minimal") {
    return t("options.modelProbeReasoningEffortMinimalVerified");
  }

  if (profile.resolvedControl === "reasoning_effort_low") {
    return t("options.modelProbeReasoningEffortLowVerified");
  }

  if (profile.resolvedControl === "reasoning_object_none") {
    return t("options.modelProbeReasoningObjectVerified");
  }

  if (profile.resolvedControl === "reasoning_object_minimal") {
    return t("options.modelProbeReasoningObjectMinimalVerified");
  }

  if (profile.resolvedControl === "reasoning_object_low") {
    return t("options.modelProbeReasoningObjectLowVerified");
  }

  if (profile.recommendedControl === "think_level") {
    return t("options.modelProbeThinkLevel");
  }

  if (profile.recommendedControl === "reasoning_effort") {
    return t("options.modelProbeReasoningEffort");
  }

  if (profile.recommendedControl === "think_false") {
    return t("options.modelProbeThinkFalse");
  }

  if (profile.detection === "unknown") {
    return t("options.modelProbeUnknown");
  }

  return t("options.modelProbePlain");
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

function normalizePanelTheme(value) {
  return ["system", "dark", "light"].includes(value) ? value : "system";
}

function showMessageKey(key, values, isError = false) {
  lastMessage = { mode: "key", key, values, isError };
  renderMessage();
}

function showMessageText(text, isError = false) {
  lastMessage = { mode: "raw", text, isError };
  renderMessage();
}

function renderMessage() {
  if (!lastMessage) {
    message.textContent = "";
    message.classList.toggle("error", false);
    return;
  }

  if (lastMessage.mode === "key") {
    message.textContent = t(lastMessage.key, lastMessage.values);
  } else {
    message.textContent = lastMessage.text;
  }
  message.classList.toggle("error", Boolean(lastMessage.isError));
}

function t(key, values) {
  return i18n.text(currentUiLanguage, key, values);
}

function sendMessage(payload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(payload, (response) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(response);
    });
  });
}
