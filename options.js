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

const i18n = window.TCT_I18N;
const form = document.getElementById("settings-form");
const message = document.getElementById("message");
const fields = {
  enabled: document.getElementById("enabled"),
  uiLanguage: document.getElementById("uiLanguage"),
  panelTheme: document.getElementById("panelTheme"),
  provider: document.getElementById("provider"),
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
  settleDelayMs: document.getElementById("settleDelayMs"),
  minChars: document.getElementById("minChars"),
  maxItems: document.getElementById("maxItems"),
  processExistingOnStart: document.getElementById("processExistingOnStart")
};

let currentUiLanguage = DEFAULT_SETTINGS.uiLanguage;
let lastMessage = null;

document.addEventListener("DOMContentLoaded", restore);
form.addEventListener("submit", save);
fields.uiLanguage.addEventListener("change", handleUiLanguageChange);
fields.sourceLanguageMode.addEventListener("change", syncLanguageControls);
fields.sourceLanguageSelect.addEventListener("change", syncLanguageControls);
fields.targetLanguageSelect.addEventListener("change", syncLanguageControls);
fields.provider.addEventListener("change", syncProviderControls);
fields.apiFormat.addEventListener("change", syncApiPlaceholder);
document.getElementById("test").addEventListener("click", testTranslation);

async function restore() {
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
  fields.settleDelayMs.value = settings.settleDelayMs;
  fields.minChars.value = settings.minChars;
  fields.maxItems.value = settings.maxItems;
  fields.processExistingOnStart.checked = Boolean(settings.processExistingOnStart);

  applyInterfaceLanguage(fields.uiLanguage.value);
  syncLanguageControls();
  syncProviderControls();
}

async function save(event) {
  event.preventDefault();
  await chrome.storage.local.set(readForm());
  showMessageKey("options.saved");
}

async function testTranslation() {
  await chrome.storage.local.set(readForm());
  showMessageKey("options.testing");

  try {
    const response = await sendMessage({
      type: "translate",
      payload: {
        speaker: "Test",
        text: "この設定でリアルタイム字幕を翻訳します。"
      }
    });

    if (!response?.ok) {
      throw new Error(response?.error || t("options.testFailure"));
    }

    showMessageKey("options.testSuccess", { result: response.result });
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

function applyInterfaceLanguage(language) {
  currentUiLanguage = i18n.normalizeLanguage(language);
  document.documentElement.lang = currentUiLanguage;
  i18n.translatePage(document, currentUiLanguage);
  refreshCustomLanguageOptionLabels();
  syncApiPlaceholder();
  renderMessage();
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

  syncApiPlaceholder();
}

function syncApiPlaceholder() {
  if (fields.provider.value === "google") {
    fields.endpoint.placeholder = "https://translation.googleapis.com/language/translate/v2";
    fields.endpointHelp.textContent = t("options.endpointHelpGoogle");
  } else if (fields.provider.value === "microsoft") {
    fields.endpoint.placeholder = "https://api.cognitive.microsofttranslator.com";
    fields.endpointHelp.textContent = t("options.endpointHelpMicrosoft");
  } else if (fields.apiFormat.value === "responses") {
    fields.endpoint.placeholder = "https://api.poe.com/v1";
    fields.endpointHelp.textContent = t("options.endpointHelpResponses");
  } else {
    fields.endpoint.placeholder = "https://api.openai.com/v1/chat/completions";
    fields.endpointHelp.textContent = t("options.endpointHelpChat");
  }
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
