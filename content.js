(() => {
  const i18n = window.TCT_I18N;
  const CAPTION_SELECTOR = '[data-tid="closed-caption-text"]';
  const AUTHOR_SELECTOR = '[data-tid="author"]';
  const PANEL_ID = "tct-panel";
  const PANEL_MODE_FULL = "full";
  const PANEL_MODE_MINI = "mini";
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

  let settings = { ...DEFAULT_SETTINGS };
  let captionStates = new WeakMap();
  let seenFingerprints = new Map();
  let queue = [];
  let isProcessing = false;
  let initializedCaptions = false;
  let scanTimer = 0;
  let statusTimer = 0;
  let panel;
  let list;
  let status;
  let emptyState;
  let panelMode = PANEL_MODE_FULL;
  let transcriptEntries = [];
  const systemThemeQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  init();

  async function init() {
    settings = await loadSettings();
    createPanel();
    bindSystemThemeListener();
    applyPanelTheme();
    await restorePanelState();
    updateStatus();
    observeCaptions();
    scheduleScan(250);
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") {
        return;
      }

      for (const key of Object.keys(DEFAULT_SETTINGS)) {
        if (changes[key]) {
          settings[key] = changes[key].newValue;
        }
      }

      applyPanelLocalization();
      applyPanelTheme();
      updateStatus();
    });
  }

  function loadSettings() {
    return sendMessage({ type: "getSettings" })
      .then((response) => response?.settings ? response.settings : { ...DEFAULT_SETTINGS })
      .catch(() => ({ ...DEFAULT_SETTINGS }));
  }

  function createPanel() {
    if (document.getElementById(PANEL_ID)) {
      panel = document.getElementById(PANEL_ID);
      list = panel.querySelector(".tct-list");
      status = panel.querySelector(".tct-status");
      emptyState = panel.querySelector(".tct-empty");
      return;
    }

    panel = document.createElement("section");
    panel.id = PANEL_ID;
    panel.setAttribute("aria-label", t("panel.ariaLabel"));
    panel.innerHTML = `
      <div class="tct-header">
        <div class="tct-heading">
          <div class="tct-title"></div>
          <div class="tct-status"></div>
        </div>
        <div class="tct-actions tct-actions-full">
          <button class="tct-icon-button" type="button" data-tct-action="toggle">⏸</button>
          <button class="tct-icon-button" type="button" data-tct-action="export-source"></button>
          <button class="tct-icon-button" type="button" data-tct-action="export-bilingual"></button>
          <button class="tct-icon-button" type="button" data-tct-action="clear">⌫</button>
          <button class="tct-icon-button" type="button" data-tct-action="options">⚙</button>
          <button class="tct-icon-button" type="button" data-tct-action="minimize">◱</button>
        </div>
        <div class="tct-actions tct-actions-mini" aria-hidden="true">
          <button class="tct-icon-button tct-mini-restore" type="button" data-tct-action="restore"></button>
          <button class="tct-icon-button tct-mini-toggle" type="button" data-tct-action="toggle">⏸</button>
        </div>
      </div>
      <div class="tct-list">
        <div class="tct-empty"></div>
      </div>
    `;

    document.documentElement.appendChild(panel);
    list = panel.querySelector(".tct-list");
    status = panel.querySelector(".tct-status");
    emptyState = panel.querySelector(".tct-empty");

    panel.addEventListener("click", handlePanelClick);
    makePanelDraggable(panel);
    applyPanelLocalization();
  }

  function handlePanelClick(event) {
    const button = event.target.closest("[data-tct-action]");
    if (!button) {
      return;
    }

    const action = button.getAttribute("data-tct-action");
    if (action === "toggle") {
      chrome.storage.local.set({ enabled: !settings.enabled });
    } else if (action === "export-source") {
      exportTranscript(false);
    } else if (action === "export-bilingual") {
      exportTranscript(true);
    } else if (action === "clear") {
      clearSession();
    } else if (action === "options") {
      sendMessage({ type: "openOptions" });
    } else if (action === "minimize") {
      setPanelMode(PANEL_MODE_MINI);
    } else if (action === "restore") {
      setPanelMode(PANEL_MODE_FULL);
    }
  }

  function observeCaptions() {
    const observer = new MutationObserver(() => scheduleScan(120));
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function scheduleScan(delay) {
    window.clearTimeout(scanTimer);
    scanTimer = window.setTimeout(scanCaptions, delay);
  }

  function scanCaptions() {
    const nodes = Array.from(document.querySelectorAll(CAPTION_SELECTOR));

    if (!initializedCaptions) {
      initializedCaptions = true;
      if (!settings.processExistingOnStart) {
        for (const node of nodes) {
          const text = normalizeText(node.textContent);
          if (text) {
            rememberFingerprint(makeFingerprint(findSpeaker(node), text));
          }
        }
      }
    }

    for (const node of nodes) {
      trackCaptionNode(node);
    }

    pruneSeenFingerprints();
  }

  function trackCaptionNode(node) {
    const text = normalizeText(node.textContent);
    const speaker = findSpeaker(node);

    if (!text) {
      clearInlineTranslation(node);
      return;
    }

    let state = captionStates.get(node);
    if (state && state.text === text && state.speaker === speaker) {
      return;
    }

    if (state?.timer) {
      window.clearTimeout(state.timer);
    }

    state = {
      text,
      speaker,
      token: createToken(),
      timer: 0
    };
    clearInlineTranslation(node);
    state.timer = window.setTimeout(() => finalizeCaption(node, state.token), settings.settleDelayMs);
    captionStates.set(node, state);
  }

  function finalizeCaption(node, token) {
    const state = captionStates.get(node);
    if (!state || state.token !== token) {
      return;
    }

    const text = normalizeText(node.textContent);
    const speaker = findSpeaker(node);
    if (text !== state.text || speaker !== state.speaker) {
      trackCaptionNode(node);
      return;
    }

    const fingerprint = makeFingerprint(speaker, text);
    if (seenFingerprints.has(fingerprint)) {
      return;
    }

    rememberFingerprint(fingerprint);
    const item = {
      id: createToken(),
      speaker,
      text,
      createdAt: Date.now()
    };

    recordTranscript(item);

    if (!settings.enabled || text.length < settings.minChars) {
      clearInlineTranslation(node);
      return;
    }

    enqueueTranslation({
      ...item,
      inlineNode: showPendingInlineTranslation(node, item.id)
    });
  }

  function enqueueTranslation(item) {
    const card = appendCard(item);
    queue.push({ ...item, card });
    pumpQueue();
  }

  async function pumpQueue() {
    if (isProcessing) {
      return;
    }

    isProcessing = true;
    while (queue.length > 0) {
      const job = queue.shift();
      updateStatus(t("panel.statusTranslating"));

      try {
        const response = await sendMessage({
          type: "translate",
          payload: {
            speaker: job.speaker,
            text: job.text
          }
        });

        if (!response?.ok) {
          throw new Error(response?.error || "Translation failed.");
        }

        updateCard(job.card, response.result, false);
        updateInlineTranslation(job.inlineNode, job.id, response.result, false);
        updateTranscript(job.id, {
          translatedText: response.result,
          translatedAt: Date.now(),
          error: ""
        });
      } catch (error) {
        updateCard(job.card, error.message || String(error), true);
        updateInlineTranslation(job.inlineNode, job.id, t("panel.inlineTranslationFailed"), true);
        updateTranscript(job.id, {
          translatedText: "",
          translatedAt: 0,
          error: error.message || String(error)
        });
      }
    }

    isProcessing = false;
    updateStatus();
  }

  function appendCard(item) {
    emptyState.hidden = true;

    const card = document.createElement("article");
    card.className = "tct-card tct-pending";
    card.innerHTML = `
      <div class="tct-card-header">
        <div class="tct-speaker"></div>
        <div class="tct-time"></div>
      </div>
      <div class="tct-source"></div>
      <div class="tct-translation">${t("panel.pendingTranslation")}</div>
    `;

    card.querySelector(".tct-speaker").textContent = item.speaker || t("panel.unknownSpeaker");
    card.querySelector(".tct-time").textContent = formatTime(item.createdAt);
    card.querySelector(".tct-source").textContent = item.text;
    list.prepend(card);
    trimCards();
    return card;
  }

  function updateCard(card, text, isError) {
    card.classList.toggle("tct-pending", false);
    card.classList.toggle("tct-error", Boolean(isError));
    card.querySelector(".tct-translation").textContent = text;
  }

  function trimCards() {
    const cards = Array.from(list.querySelectorAll(".tct-card"));
    for (const card of cards.slice(settings.maxItems)) {
      card.remove();
    }
  }

  function clearList() {
    for (const card of Array.from(list.querySelectorAll(".tct-card"))) {
      card.remove();
    }
    emptyState.hidden = false;
  }

  function clearSession() {
    queue = [];
    transcriptEntries = [];
    clearList();
    flashStatus(t("panel.statusCleared"));
  }

  function updateStatus(forcedText) {
    if (!status) {
      return;
    }

    if (forcedText) {
      status.textContent = forcedText;
      syncToggleButtons();
      return;
    }

    if (!settings.enabled) {
      status.textContent = t("panel.statusPaused");
    } else if (!settings.endpoint || !settings.model) {
      status.textContent = t("panel.statusNeedApi");
    } else {
      status.textContent = `${getSourceLabel()} → ${settings.targetLanguage}`;
    }

    syncToggleButtons();
  }

  function getSourceLabel() {
    if (settings.sourceLanguageMode === "fixed" && settings.sourceLanguage) {
      return settings.sourceLanguage;
    }
    return t("common.autoDetect");
  }

  function findSpeaker(textNode) {
    let current = textNode;
    for (let depth = 0; current && depth < 12; depth += 1) {
      const author = current.querySelector?.(AUTHOR_SELECTOR);
      if (author?.textContent?.trim()) {
        return normalizeText(author.textContent);
      }
      current = current.parentElement;
    }

    const wrapper = textNode.closest('[data-tid="closed-captions-v2-items-renderer"], [class*="ChatMessageCompact"]');
    const author = wrapper?.querySelector?.(AUTHOR_SELECTOR);
    return author?.textContent?.trim() ? normalizeText(author.textContent) : "";
  }

  function normalizeText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .replace(/\u00a0/g, " ")
      .trim();
  }

  function makeFingerprint(speaker, text) {
    return `${speaker || "unknown"}::${text}`.toLowerCase();
  }

  function rememberFingerprint(fingerprint) {
    seenFingerprints.set(fingerprint, Date.now());
  }

  function pruneSeenFingerprints() {
    const cutoff = Date.now() - 30 * 60 * 1000;
    for (const [fingerprint, seenAt] of seenFingerprints.entries()) {
      if (seenAt < cutoff) {
        seenFingerprints.delete(fingerprint);
      }
    }
  }

  function formatTime(timestamp) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(new Date(timestamp));
  }

  function formatDateForExport(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    const hour = `${date.getHours()}`.padStart(2, "0");
    const minute = `${date.getMinutes()}`.padStart(2, "0");
    const second = `${date.getSeconds()}`.padStart(2, "0");
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  }

  function makeExportFileName(timestamp, includeTranslations) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    const hour = `${date.getHours()}`.padStart(2, "0");
    const minute = `${date.getMinutes()}`.padStart(2, "0");
    const second = `${date.getSeconds()}`.padStart(2, "0");
    const suffix = includeTranslations ? "bilingual" : "source";
    return `teams-captions-${year}${month}${day}-${hour}${minute}${second}-${suffix}.txt`;
  }

  function recordTranscript(item) {
    transcriptEntries.push({
      id: item.id,
      speaker: item.speaker || "",
      text: item.text,
      createdAt: item.createdAt,
      translatedText: "",
      translatedAt: 0,
      error: ""
    });
  }

  function updateTranscript(id, patch) {
    const entry = transcriptEntries.find((candidate) => candidate.id === id);
    if (!entry) {
      return;
    }

    Object.assign(entry, patch);
  }

  async function exportTranscript(includeTranslations) {
    if (transcriptEntries.length === 0) {
      flashStatus(t("panel.statusNoTranscript"));
      return;
    }

    try {
      const createdAt = Date.now();
      const text = buildTranscriptText(includeTranslations);
      const response = await sendMessage({
        type: "downloadTranscript",
        payload: {
          text,
          filename: makeExportFileName(createdAt, includeTranslations)
        }
      });

      if (!response?.ok) {
        flashStatus(response?.error || t("panel.statusExportFailed"));
        return;
      }

      flashStatus(includeTranslations ? t("panel.statusExportedBilingual") : t("panel.statusExportedSource"));
    } catch (error) {
      flashStatus(error.message || String(error));
    }
  }

  function buildTranscriptText(includeTranslations) {
    const lines = [
      t("panel.exportTranscriptTitle"),
      `${t("panel.exportTime")}: ${formatDateForExport(Date.now())}`,
      `${t("panel.exportContent")}: ${includeTranslations ? t("panel.exportContentBilingual") : t("panel.exportContentSource")}`,
      ""
    ];

    for (const entry of transcriptEntries) {
      lines.push(`[${formatDateForExport(entry.createdAt)}] ${entry.speaker || t("panel.unknownSpeaker")}`);
      lines.push(`${t("panel.exportSourcePrefix")}: ${entry.text}`);
      if (includeTranslations) {
        lines.push(`${t("panel.exportTranslationPrefix")}: ${resolveTranscriptTranslation(entry)}`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  function resolveTranscriptTranslation(entry) {
    if (entry.translatedText) {
      return entry.translatedText;
    }
    if (entry.error) {
      return t("panel.exportTranslationFailed", { message: entry.error });
    }
    return t("panel.exportUntranslated");
  }

  function showPendingInlineTranslation(node, itemId) {
    const inlineNode = ensureInlineTranslationNode(node);
    inlineNode.hidden = false;
    inlineNode.dataset.tctItemId = itemId;
    inlineNode.classList.remove("tct-inline-error");
    inlineNode.classList.add("tct-inline-pending");
    inlineNode.textContent = t("panel.pendingTranslation");
    return inlineNode;
  }

  function updateInlineTranslation(inlineNode, itemId, text, isError) {
    if (!inlineNode || inlineNode.dataset.tctItemId !== itemId) {
      return;
    }

    inlineNode.hidden = false;
    inlineNode.classList.toggle("tct-inline-pending", false);
    inlineNode.classList.toggle("tct-inline-error", Boolean(isError));
    inlineNode.textContent = text;
  }

  function clearInlineTranslation(node) {
    const inlineNode = findInlineTranslationNode(node);
    if (!inlineNode) {
      return;
    }

    inlineNode.hidden = true;
    inlineNode.dataset.tctItemId = "";
    inlineNode.classList.remove("tct-inline-pending", "tct-inline-error");
    inlineNode.textContent = "";
  }

  function findInlineTranslationNode(node) {
    const candidate = node?.nextElementSibling;
    if (candidate?.classList?.contains("tct-inline-translation")) {
      return candidate;
    }
    return null;
  }

  function ensureInlineTranslationNode(node) {
    let inlineNode = findInlineTranslationNode(node);
    if (inlineNode) {
      return inlineNode;
    }

    inlineNode = document.createElement("div");
    inlineNode.className = "tct-inline-translation";
    inlineNode.hidden = true;
    node.insertAdjacentElement("afterend", inlineNode);
    return inlineNode;
  }

  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve(response);
      });
    });
  }

  function syncToggleButtons() {
    for (const button of panel?.querySelectorAll?.('[data-tct-action="toggle"]') || []) {
      button.textContent = settings.enabled ? "⏸" : "▶";
      const label = settings.enabled ? t("panel.togglePause") : t("panel.toggleResume");
      button.title = label;
      button.setAttribute("aria-label", label);
    }
  }

  function flashStatus(text) {
    updateStatus(text);
    window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() => updateStatus(), 2400);
  }

  function makePanelDraggable(target) {
    let drag = null;

    target.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button, .tct-list")) {
        return;
      }

      const rect = target.getBoundingClientRect();
      drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startLeft: rect.left,
        startTop: rect.top
      };
      target.setPointerCapture(event.pointerId);
    });

    target.addEventListener("pointermove", (event) => {
      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      const nextLeft = clamp(drag.startLeft + event.clientX - drag.startX, 8, window.innerWidth - target.offsetWidth - 8);
      const nextTop = clamp(drag.startTop + event.clientY - drag.startY, 8, window.innerHeight - 48);
      target.style.left = `${nextLeft}px`;
      target.style.right = "auto";
      target.style.top = `${nextTop}px`;
    });

    target.addEventListener("pointerup", async (event) => {
      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      drag = null;
      await persistPanelState();
    });
  }

  function setPanelMode(nextMode) {
    panelMode = nextMode === PANEL_MODE_MINI ? PANEL_MODE_MINI : PANEL_MODE_FULL;
    panel.classList.toggle("tct-mini", panelMode === PANEL_MODE_MINI);
    persistPanelState();
  }

  async function persistPanelState() {
    await chrome.storage.local.set({
      panelPosition: {
        left: panel.style.left,
        top: panel.style.top
      },
      panelMode
    });
  }

  async function restorePanelState() {
    const { panelPosition, panelMode: storedPanelMode } = await chrome.storage.local.get([
      "panelPosition",
      "panelMode"
    ]);

    if (panelPosition?.left && panelPosition?.top) {
      panel.style.left = panelPosition.left;
      panel.style.top = panelPosition.top;
      panel.style.right = "auto";
    }

    setPanelMode(storedPanelMode === PANEL_MODE_MINI ? PANEL_MODE_MINI : PANEL_MODE_FULL);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function bindSystemThemeListener() {
    if (!systemThemeQuery) {
      return;
    }

    const handleChange = () => {
      if (settings.panelTheme === "system") {
        applyPanelTheme();
      }
    };

    if (typeof systemThemeQuery.addEventListener === "function") {
      systemThemeQuery.addEventListener("change", handleChange);
    } else if (typeof systemThemeQuery.addListener === "function") {
      systemThemeQuery.addListener(handleChange);
    }
  }

  function applyPanelTheme() {
    if (!panel) {
      return;
    }

    const resolvedTheme = resolvePanelTheme();
    panel.classList.toggle("tct-theme-dark", resolvedTheme === "dark");
    panel.classList.toggle("tct-theme-light", resolvedTheme === "light");
  }

  function resolvePanelTheme() {
    if (settings.panelTheme === "dark") {
      return "dark";
    }
    if (settings.panelTheme === "light") {
      return "light";
    }
    return systemThemeQuery?.matches ? "dark" : "light";
  }

  function applyPanelLocalization() {
    if (!panel) {
      return;
    }

    panel.setAttribute("aria-label", t("panel.ariaLabel"));
    panel.querySelector(".tct-title").textContent = t("panel.title");
    emptyState.textContent = t("panel.waiting");

    const sourceButton = panel.querySelector('[data-tct-action="export-source"]');
    sourceButton.textContent = t("panel.exportSourceShort");
    sourceButton.title = t("panel.exportSource");
    sourceButton.setAttribute("aria-label", t("panel.exportSource"));

    const bilingualButton = panel.querySelector('[data-tct-action="export-bilingual"]');
    bilingualButton.textContent = t("panel.exportBilingualShort");
    bilingualButton.title = t("panel.exportBilingual");
    bilingualButton.setAttribute("aria-label", t("panel.exportBilingual"));

    const clearButton = panel.querySelector('[data-tct-action="clear"]');
    clearButton.title = t("panel.clear");
    clearButton.setAttribute("aria-label", t("panel.clear"));

    const optionsButton = panel.querySelector('[data-tct-action="options"]');
    optionsButton.title = t("panel.options");
    optionsButton.setAttribute("aria-label", t("panel.options"));

    const minimizeButton = panel.querySelector('[data-tct-action="minimize"]');
    minimizeButton.title = t("panel.minimize");
    minimizeButton.setAttribute("aria-label", t("panel.minimize"));

    const restoreButton = panel.querySelector('[data-tct-action="restore"]');
    restoreButton.title = t("panel.restore");
    restoreButton.setAttribute("aria-label", t("panel.restore"));

    syncToggleButtons();
  }

  function t(key, values) {
    return i18n.text(settings.uiLanguage, key, values);
  }

  function createToken() {
    if (crypto?.randomUUID) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
})();
