const DEFAULT_OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const DEFAULT_RESPONSES_ENDPOINT = "https://api.poe.com/v1";
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
  panelTheme: "system"
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
    return "https://translate.googleapis.com/translate_a/t";
  }
  if (provider === "microsoft") {
    return "https://api-edge.cognitive.microsofttranslator.com/translate";
  }
  return apiFormat === "responses" ? DEFAULT_RESPONSES_ENDPOINT : DEFAULT_OPENAI_ENDPOINT;
}

const i18n = window.TCT_I18N;
const enabled = document.getElementById("enabled");
const status = document.getElementById("status");

document.addEventListener("DOMContentLoaded", restore);
enabled.addEventListener("change", async () => {
  await chrome.storage.local.set({ enabled: enabled.checked });
  renderStatus();
});
document.getElementById("options").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

async function restore() {
  const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);
  applyInterfaceLanguage(settings.uiLanguage);
  enabled.checked = Boolean(settings.enabled);
  renderStatus(settings);
}

async function renderStatus(currentSettings) {
  const settings = currentSettings || await chrome.storage.local.get(DEFAULT_SETTINGS);
  applyInterfaceLanguage(settings.uiLanguage);

  if (!settings.enabled) {
    status.textContent = t(settings.uiLanguage, "popup.statusPaused");
  } else if (!hasTranslationConfiguration(settings)) {
    status.textContent = t(settings.uiLanguage, "popup.statusNeedApi");
  } else {
    status.textContent = `${getSourceLabel(settings)} → ${settings.targetLanguage}`;
  }
}

function applyInterfaceLanguage(language) {
  const uiLanguage = i18n.normalizeLanguage(language);
  document.documentElement.lang = uiLanguage;
  i18n.translatePage(document, uiLanguage);
}

function getSourceLabel(settings) {
  if (settings.sourceLanguageMode === "fixed" && settings.sourceLanguage) {
    return settings.sourceLanguage;
  }
  return t(settings.uiLanguage, "common.autoDetect");
}

function hasTranslationConfiguration(settings) {
  if (settings.provider === "openai") {
    return Boolean(settings.endpoint && settings.model);
  }
  if (settings.provider === "google" || settings.provider === "microsoft") {
    return true;
  }
  return false;
}

function t(language, key, values) {
  return i18n.text(language, key, values);
}
