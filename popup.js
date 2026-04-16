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
  panelTheme: "system"
};

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
  } else if (!settings.endpoint || !settings.model) {
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

function t(language, key, values) {
  return i18n.text(language, key, values);
}
