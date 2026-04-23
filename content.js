(() => {
  const i18n = window.TCT_I18N;
  const CAPTION_SELECTOR = '[data-tid="closed-caption-text"]';
  const AUTHOR_SELECTOR = '[data-tid="author"]';
  const PANEL_ID = "tct-panel";
  const PANEL_MODE_FULL = "full";
  const PANEL_MODE_MINI = "mini";
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
      return "https://translate.googleapis.com/translate_a/t";
    }
    if (provider === "microsoft") {
      return "https://api-edge.cognitive.microsofttranslator.com/translate";
    }
    return apiFormat === "responses" ? DEFAULT_RESPONSES_ENDPOINT : DEFAULT_OPENAI_ENDPOINT;
  }
  const TRANSLATION_MODE_PRESETS = {
    fast: {
      compact: { baseSettleDelayMs: 1200, noPunctuationExtraDelayMs: 500, shortTextExtraDelayMs: 300, shortTextThreshold: 10, mergeWindowMs: 900, maxHoldMs: 2200 },
      mixed: { baseSettleDelayMs: 1100, noPunctuationExtraDelayMs: 450, shortTextExtraDelayMs: 250, shortTextThreshold: 6, mergeWindowMs: 900, maxHoldMs: 2200 },
      spaced: { baseSettleDelayMs: 900, noPunctuationExtraDelayMs: 300, shortTextExtraDelayMs: 150, shortTextThreshold: 4, mergeWindowMs: 700, maxHoldMs: 1700 },
      unknown: { baseSettleDelayMs: 1100, noPunctuationExtraDelayMs: 450, shortTextExtraDelayMs: 250, shortTextThreshold: 6, mergeWindowMs: 900, maxHoldMs: 2200 }
    },
    balanced: {
      compact: { baseSettleDelayMs: 1800, noPunctuationExtraDelayMs: 900, shortTextExtraDelayMs: 500, shortTextThreshold: 14, mergeWindowMs: 1800, maxHoldMs: 3600 },
      mixed: { baseSettleDelayMs: 1700, noPunctuationExtraDelayMs: 850, shortTextExtraDelayMs: 400, shortTextThreshold: 8, mergeWindowMs: 1600, maxHoldMs: 3400 },
      spaced: { baseSettleDelayMs: 1400, noPunctuationExtraDelayMs: 700, shortTextExtraDelayMs: 250, shortTextThreshold: 6, mergeWindowMs: 1200, maxHoldMs: 2600 },
      unknown: { baseSettleDelayMs: 1600, noPunctuationExtraDelayMs: 800, shortTextExtraDelayMs: 350, shortTextThreshold: 7, mergeWindowMs: 1400, maxHoldMs: 3200 }
    },
    complete: {
      compact: { baseSettleDelayMs: 2600, noPunctuationExtraDelayMs: 1400, shortTextExtraDelayMs: 700, shortTextThreshold: 18, mergeWindowMs: 2600, maxHoldMs: 5200 },
      mixed: { baseSettleDelayMs: 2400, noPunctuationExtraDelayMs: 1200, shortTextExtraDelayMs: 600, shortTextThreshold: 10, mergeWindowMs: 2200, maxHoldMs: 4800 },
      spaced: { baseSettleDelayMs: 1900, noPunctuationExtraDelayMs: 1000, shortTextExtraDelayMs: 350, shortTextThreshold: 8, mergeWindowMs: 1600, maxHoldMs: 3600 },
      unknown: { baseSettleDelayMs: 2200, noPunctuationExtraDelayMs: 1100, shortTextExtraDelayMs: 500, shortTextThreshold: 9, mergeWindowMs: 1800, maxHoldMs: 4200 }
    }
  };
  const COMPLETE_MODE_BATCH_LIMITS = {
    maxEntries: 6,
    maxChars: 900
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
      settings = sanitizeSettings(settings);

      applyPanelLocalization();
      applyPanelTheme();
      updateStatus();
    });
  }

  function loadSettings() {
    return sendMessage({ type: "getSettings" })
      .then((response) => sanitizeSettings(response?.settings ? response.settings : { ...DEFAULT_SETTINGS }))
      .catch(() => ({ ...DEFAULT_SETTINGS }));
  }

  function sanitizeSettings(input) {
    const next = { ...DEFAULT_SETTINGS, ...input };
    next.enabled = Boolean(next.enabled);
    next.uiLanguage = ["en", "ja"].includes(next.uiLanguage) ? next.uiLanguage : "zh-CN";
    next.provider = ["openai", "google", "microsoft"].includes(next.provider)
      ? next.provider
      : resolveDefaultProvider(next.uiLanguage);
    next.apiFormat = next.apiFormat === "responses" ? "responses" : "chat_completions";
    next.endpoint = String(next.endpoint || "").trim() || resolveDefaultEndpoint(next.provider, next.apiFormat);
    next.apiKey = String(next.apiKey || "").trim();
    next.model = String(next.model || "").trim();
    next.microsoftRegion = String(next.microsoftRegion || "").trim();
    next.sourceLanguageMode = next.sourceLanguageMode === "fixed" ? "fixed" : "auto";
    next.sourceLanguage = normalizeLegacyLanguage(next.sourceLanguage || "").trim();
    next.targetLanguage = normalizeLegacyLanguage(next.targetLanguage || DEFAULT_SETTINGS.targetLanguage).trim();
    next.translationMode = ["fast", "balanced", "complete"].includes(next.translationMode)
      ? next.translationMode
      : DEFAULT_SETTINGS.translationMode;
    next.panelTheme = ["system", "dark", "light"].includes(next.panelTheme) ? next.panelTheme : "system";
    next.settleDelayMs = clampNumber(next.settleDelayMs, 500, 6000, DEFAULT_SETTINGS.settleDelayMs);
    next.minChars = clampNumber(next.minChars, 1, 80, DEFAULT_SETTINGS.minChars);
    next.maxItems = clampNumber(next.maxItems, 5, 100, DEFAULT_SETTINGS.maxItems);
    next.processExistingOnStart = Boolean(next.processExistingOnStart);
    return next;
  }

  function clampNumber(value, min, max, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, Math.round(number)));
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
            rememberFingerprint(makeFingerprint(normalizeSpeakerKey(findSpeaker(node)), text));
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
    const speakerKey = normalizeSpeakerKey(speaker);
    const now = Date.now();

    if (!text) {
      const existing = captionStates.get(node);
      if (existing?.timer) {
        window.clearTimeout(existing.timer);
      }
      if (existing && !existing.emittedFingerprint) {
        commitCaptionState(node, existing, false);
      }
      clearInlineTranslation(node);
      return;
    }

    let state = captionStates.get(node);
    if (state && !state.emittedFingerprint && !canMergeSpeakers(state.speakerKey, speakerKey)) {
      window.clearTimeout(state.timer);
      commitCaptionState(node, state, false);
      state = captionStates.get(node);
    }

    if (state?.emittedFingerprint) {
      if (state.text === text && state.speakerKey === speakerKey) {
        return;
      }
      state = null;
    } else if (state && state.text === text && state.speakerKey === speakerKey) {
      return;
    }

    if (state?.timer) {
      window.clearTimeout(state.timer);
    }

    state = {
      text,
      speaker,
      speakerKey,
      token: createToken(),
      timer: 0,
      firstSeenAt: state && !state.emittedFingerprint ? state.firstSeenAt : now,
      lastChangedAt: now,
      emittedFingerprint: ""
    };
    clearInlineTranslation(node);
    scheduleFinalize(node, state);
    captionStates.set(node, state);
  }

  function scheduleFinalize(node, state) {
    const tuning = resolveCaptionTuning(state.text);
    const quietWindowMs = computeQuietWindow(state.text, tuning);
    const elapsedMs = Date.now() - state.firstSeenAt;
    const remainingHoldMs = Math.max(0, tuning.maxHoldMs - elapsedMs);
    const delayMs = remainingHoldMs === 0 ? 0 : Math.min(quietWindowMs, remainingHoldMs);

    state.token = createToken();
    state.timer = window.setTimeout(() => finalizeCaption(node, state.token), delayMs);
  }

  function finalizeCaption(node, token) {
    const state = captionStates.get(node);
    if (!state || state.token !== token || state.emittedFingerprint) {
      return;
    }

    const text = normalizeText(node.textContent);
    const speaker = findSpeaker(node);
    const speakerKey = normalizeSpeakerKey(speaker);
    if (text !== state.text || speakerKey !== state.speakerKey) {
      trackCaptionNode(node);
      return;
    }

    commitCaptionState(node, state, true);
  }

  function commitCaptionState(node, state, allowInline) {
    const fingerprint = makeFingerprint(state.speakerKey, state.text);
    state.timer = 0;
    state.emittedFingerprint = fingerprint;
    captionStates.set(node, state);

    if (seenFingerprints.has(fingerprint)) {
      return;
    }

    rememberFingerprint(fingerprint);
    const item = {
      id: createToken(),
      speaker: state.speaker,
      speakerKey: state.speakerKey,
      text: state.text,
      createdAt: Date.now()
    };
    const tuning = resolveCaptionTuning(state.text);
    const entry = upsertTranscriptEntry(item, tuning);

    if (!settings.enabled || entry.text.length < settings.minChars) {
      clearInlineTranslation(node);
      return;
    }

    if (allowInline) {
      attachInlineNode(entry, showPendingInlineTranslation(node, entry.id));
    }
    queueTranslation(entry);
  }

  function upsertTranscriptEntry(item, tuning) {
    const existing = findMergeableEntry(item, tuning);
    if (existing) {
      existing.speaker = item.speaker;
      existing.speakerKey = item.speakerKey;
      existing.text = item.text;
      existing.lastUpdatedAt = item.createdAt;
      existing.error = "";
      existing.translatedText = "";
      existing.translatedAt = 0;
      if (existing.card) {
        updateCardSource(existing.card, existing);
        list.prepend(existing.card);
      }
      return existing;
    }

    const entry = createTranscriptEntry(item);
    transcriptEntries.push(entry);
    return entry;
  }

  function queueTranslation(entry, bumpVersion = true) {
    if (entry.discarded || !settings.enabled || entry.text.length < settings.minChars) {
      return;
    }

    if (bumpVersion) {
      entry.version += 1;
    }

    entry.error = "";
    entry.translatedText = "";
    entry.translatedAt = 0;
    entry.card = entry.card || appendCard(entry);
    setCardPending(entry.card);

    if (entry.queued || entry.inFlight) {
      return;
    }

    entry.queued = true;
    queue.push(entry);
    pumpQueue();
  }

  function takeNextTranslationBatch() {
    let first = null;
    while (queue.length > 0) {
      const candidate = queue.shift();
      if (!candidate || candidate.discarded) {
        continue;
      }

      candidate.queued = false;
      if (!settings.enabled || candidate.text.length < settings.minChars) {
        continue;
      }

      first = candidate;
      break;
    }

    if (!first) {
      return null;
    }

    const entries = [first];
    if (settings.translationMode !== "complete" || !first.speakerKey) {
      return buildTranslationBatch(entries);
    }

    let totalChars = first.text.length;
    while (queue.length > 0 && entries.length < COMPLETE_MODE_BATCH_LIMITS.maxEntries) {
      const candidate = queue[0];
      if (!candidate || candidate.discarded) {
        queue.shift();
        if (candidate) {
          candidate.queued = false;
        }
        continue;
      }

      if (!settings.enabled || candidate.text.length < settings.minChars) {
        queue.shift();
        candidate.queued = false;
        continue;
      }

      if (!canMergeTranscriptEntries(first.speakerKey, candidate.speakerKey)) {
        break;
      }

      if (totalChars + candidate.text.length + 1 > COMPLETE_MODE_BATCH_LIMITS.maxChars) {
        break;
      }

      queue.shift();
      candidate.queued = false;
      entries.push(candidate);
      totalChars += candidate.text.length + 1;
    }

    return buildTranslationBatch(entries);
  }

  function buildTranslationBatch(entries) {
    return {
      entries,
      sourceText: entries.map((entry) => entry.text).join("\n"),
      versions: entries.map((entry) => entry.version)
    };
  }

  function hasBatchVersionMismatch(batch) {
    return batch.entries.some((entry, index) => entry.version !== batch.versions[index]);
  }

  function setBatchInFlight(batch, inFlight) {
    for (const entry of batch.entries) {
      entry.inFlight = inFlight;
    }
  }

  function applyTranslationBatchSuccess(batch, translatedText) {
    if (batch.entries.length === 1) {
      const [entry] = batch.entries;
      entry.translatedText = translatedText;
      entry.translatedAt = Date.now();
      entry.error = "";
      entry.batchLeaderId = "";
      entry.batchMemberIds = [];
      entry.batchSourceText = "";
      entry.batchStartAt = 0;
      updateCard(entry.card, translatedText, false);
      updateInlineTranslation(entry.inlineNode, entry.id, translatedText, false);
      return;
    }

    const leader = batch.entries[0];
    const batchTime = Date.now();
    leader.batchLeaderId = "";
    leader.batchMemberIds = batch.entries.map((entry) => entry.id);
    leader.batchSourceText = batch.entries.map((entry) => entry.text).join("\n");
    leader.batchStartAt = leader.createdAt;
    leader.translatedText = translatedText;
    leader.translatedAt = batchTime;
    leader.error = "";
    if (leader.card) {
      leader.card.hidden = false;
      updateCardSource(leader.card, leader);
      updateCard(leader.card, translatedText, false);
      list.prepend(leader.card);
    }

    const inlineTarget = resolveBatchInlineTarget(batch.entries);
    for (const entry of batch.entries) {
      if (entry === leader) {
        continue;
      }

      entry.batchLeaderId = leader.id;
      entry.batchMemberIds = [];
      entry.batchSourceText = "";
      entry.batchStartAt = 0;
      entry.translatedText = "";
      entry.translatedAt = batchTime;
      entry.error = "";
      if (entry.card) {
        entry.card.hidden = true;
      }
      if (entry.inlineNode && entry.inlineNode !== inlineTarget) {
        clearInlineTranslationElement(entry.inlineNode);
      }
    }

    if (inlineTarget) {
      updateInlineTranslation(inlineTarget, inlineTarget.dataset.tctItemId, translatedText, false);
    } else {
      updateInlineTranslation(leader.inlineNode, leader.id, translatedText, false);
    }
    if (leader.inlineNode && leader.inlineNode !== inlineTarget) {
      clearInlineTranslationElement(leader.inlineNode);
    }
  }

  function applyTranslationBatchError(batch, message) {
    for (const entry of batch.entries) {
      entry.translatedText = "";
      entry.translatedAt = 0;
      entry.error = message;
      updateCard(entry.card, message, true);
      updateInlineTranslation(entry.inlineNode, entry.id, t("panel.inlineTranslationFailed"), true);
    }
  }

  function resolveBatchInlineTarget(entries) {
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const entry = entries[index];
      if (entry?.inlineNode?.dataset?.tctItemId) {
        return entry.inlineNode;
      }
    }
    return null;
  }

  async function pumpQueue() {
    if (isProcessing) {
      return;
    }

    isProcessing = true;
    while (queue.length > 0) {
      const batch = takeNextTranslationBatch();
      if (!batch) {
        continue;
      }

      let shouldRequeueBatch = false;
      setBatchInFlight(batch, true);
      updateStatus(t("panel.statusTranslating"));

      try {
        const response = await sendMessage({
          type: "translate",
          payload: {
            text: batch.sourceText
          }
        });

        if (!response?.ok) {
          throw new Error(response?.error || "Translation failed.");
        }

        if (batch.entries.some((entry) => entry.discarded)) {
          continue;
        }

        if (hasBatchVersionMismatch(batch)) {
          shouldRequeueBatch = true;
          continue;
        }

        applyTranslationBatchSuccess(batch, response.result);
      } catch (error) {
        if (batch.entries.some((entry) => entry.discarded)) {
          continue;
        }

        if (hasBatchVersionMismatch(batch)) {
          shouldRequeueBatch = true;
          continue;
        }

        const message = error.message || String(error);
        applyTranslationBatchError(batch, message);
      } finally {
        setBatchInFlight(batch, false);
        if (shouldRequeueBatch) {
          for (const entry of batch.entries) {
            if (!entry.discarded) {
              queueTranslation(entry, false);
            }
          }
          continue;
        }
        for (let index = 0; index < batch.entries.length; index += 1) {
          const entry = batch.entries[index];
          if (!entry.discarded && entry.version !== batch.versions[index]) {
            queueTranslation(entry, false);
          }
        }
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

    updateCardSource(card, item);
    list.prepend(card);
    trimCards();
    return card;
  }

  function updateCard(card, text, isError) {
    card.hidden = false;
    card.classList.toggle("tct-pending", false);
    card.classList.toggle("tct-error", Boolean(isError));
    card.querySelector(".tct-translation").textContent = text;
  }

  function setCardPending(card) {
    if (!card) {
      return;
    }

    card.hidden = false;
    card.classList.toggle("tct-pending", true);
    card.classList.toggle("tct-error", false);
    card.querySelector(".tct-translation").textContent = t("panel.pendingTranslation");
  }

  function updateCardSource(card, item) {
    if (!card) {
      return;
    }

    card.querySelector(".tct-speaker").textContent = resolveEntrySpeakerLabel(item);
    card.querySelector(".tct-time").textContent = formatTime(resolveEntryStartTime(item));
    card.querySelector(".tct-source").textContent = resolveEntrySourceText(item);
  }

  function trimCards() {
    const cards = Array.from(list.querySelectorAll(".tct-card")).filter((card) => !card.hidden);
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
    for (const entry of transcriptEntries) {
      entry.discarded = true;
    }
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
    } else if (!hasTranslationConfiguration()) {
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

  function normalizeSpeakerKey(speaker) {
    const normalized = normalizeText(speaker).toLowerCase();
    if (!normalized) {
      return "";
    }

    const latinTokens = normalized
      .split(/[\s,]+/)
      .map((token) => token.replace(/[^a-z'-]+/g, ""))
      .filter(Boolean);

    if (latinTokens.length > 1 && latinTokens.join("").length >= normalized.replace(/[^a-z]+/g, "").length * 0.7) {
      return latinTokens.slice().sort().join(" ");
    }

    return normalized;
  }

  function canonicalizeComparisonText(text) {
    return normalizeText(text)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "");
  }

  function makeFingerprint(speakerKey, text) {
    return `${speakerKey || "unknown"}::${canonicalizeComparisonText(text)}`;
  }

  function canMergeSpeakers(left, right) {
    return left === right;
  }

  function canMergeTranscriptEntries(left, right) {
    return Boolean(left && right && left === right);
  }

  function findMergeableEntry(item, tuning) {
    for (let index = transcriptEntries.length - 1; index >= 0; index -= 1) {
      const entry = transcriptEntries[index];
      if (!entry || entry.discarded) {
        continue;
      }

      if (item.createdAt - entry.lastUpdatedAt > tuning.mergeWindowMs) {
        continue;
      }

      if (!canMergeTranscriptEntries(entry.speakerKey, item.speakerKey)) {
        continue;
      }

      if (shouldMergeTranscriptTexts(entry.text, item.text)) {
        return entry;
      }
    }

    return null;
  }

  function shouldMergeTranscriptTexts(previousText, nextText) {
    const previous = canonicalizeComparisonText(previousText);
    const next = canonicalizeComparisonText(nextText);
    if (!previous || !next) {
      return false;
    }

    if (previous === next) {
      return true;
    }

    const shorter = previous.length <= next.length ? previous : next;
    const longer = shorter === previous ? next : previous;
    if (shorter.length < 6) {
      return false;
    }

    if (longer.includes(shorter) && shorter.length / longer.length >= 0.5) {
      return true;
    }

    return commonPrefixLength(previous, next) / shorter.length >= 0.82;
  }

  function commonPrefixLength(left, right) {
    const limit = Math.min(left.length, right.length);
    let index = 0;
    while (index < limit && left[index] === right[index]) {
      index += 1;
    }
    return index;
  }

  function resolveCaptionTuning(text) {
    const mode = ["fast", "balanced", "complete"].includes(settings.translationMode)
      ? settings.translationMode
      : DEFAULT_SETTINGS.translationMode;
    const profile = resolveLanguageProfile(text);
    return {
      profile,
      ...TRANSLATION_MODE_PRESETS[mode][profile]
    };
  }

  function resolveLanguageProfile(text) {
    if (settings.sourceLanguageMode === "fixed" && settings.sourceLanguage) {
      return classifyFixedLanguageProfile(settings.sourceLanguage);
    }
    return inferLanguageProfileFromText(text);
  }

  function classifyFixedLanguageProfile(language) {
    const normalized = String(language || "").toLowerCase();
    if (/(japanese|japan|chinese|korean|korea|thai)/.test(normalized)) {
      return "compact";
    }
    return "spaced";
  }

  function inferLanguageProfileFromText(text) {
    const normalized = normalizeText(text);
    if (!normalized) {
      return "unknown";
    }

    const compactChars = (normalized.match(/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\u0e00-\u0e7f]/g) || []).length;
    const latinChars = (normalized.match(/[A-Za-z]/g) || []).length;
    const lettersOrDigits = (normalized.match(/[\p{L}\p{N}]/gu) || []).length || normalized.length;

    if (compactChars > 0 && latinChars > 0) {
      return "mixed";
    }
    if (compactChars / lettersOrDigits >= 0.35) {
      return "compact";
    }
    if (latinChars / lettersOrDigits >= 0.4 || /\s/.test(normalized)) {
      return "spaced";
    }
    return "unknown";
  }

  function computeQuietWindow(text, tuning) {
    let delayMs = Math.max(settings.settleDelayMs, tuning.baseSettleDelayMs);
    if (!hasSentenceEnding(text)) {
      delayMs += tuning.noPunctuationExtraDelayMs;
    }
    if (countTextUnits(text, tuning.profile) < tuning.shortTextThreshold) {
      delayMs += tuning.shortTextExtraDelayMs;
    }
    return delayMs;
  }

  function countTextUnits(text, profile) {
    if (profile === "spaced" || profile === "mixed") {
      return normalizeText(text).split(/\s+/).filter(Boolean).length;
    }
    return canonicalizeComparisonText(text).length;
  }

  function hasSentenceEnding(text) {
    return /[.!?。！？…]$/.test(normalizeText(text));
  }

  function hasTranslationConfiguration() {
    if (settings.provider === "openai") {
      return Boolean(settings.endpoint && settings.model);
    }
    if (settings.provider === "google" || settings.provider === "microsoft") {
      return true;
    }
    return false;
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

  function createTranscriptEntry(item) {
    return {
      id: item.id,
      speaker: item.speaker || "",
      speakerKey: item.speakerKey || "",
      text: item.text,
      createdAt: item.createdAt,
      lastUpdatedAt: item.createdAt,
      translatedText: "",
      translatedAt: 0,
      error: "",
      card: null,
      inlineNode: null,
      version: 0,
      queued: false,
      inFlight: false,
      discarded: false,
      batchLeaderId: "",
      batchMemberIds: [],
      batchSourceText: "",
      batchStartAt: 0
    };
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
      if (entry.batchLeaderId) {
        continue;
      }

      const members = resolveTranscriptBatchMembers(entry);
      if (members.length > 1) {
        for (const member of members) {
          lines.push(`[${formatDateForExport(member.createdAt)}] ${member.speaker || t("panel.unknownSpeaker")}`);
          lines.push(`${t("panel.exportSourcePrefix")}: ${member.text}`);
        }
        if (includeTranslations) {
          lines.push(`${t("panel.exportTranslationPrefix")}: ${resolveTranscriptTranslation(entry)}`);
        }
        lines.push("");
        continue;
      }

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

  function resolveTranscriptBatchMembers(entry) {
    if (!Array.isArray(entry.batchMemberIds) || entry.batchMemberIds.length < 2) {
      return [entry];
    }

    const members = entry.batchMemberIds
      .map((id) => transcriptEntries.find((candidate) => candidate?.id === id))
      .filter(Boolean);
    return members.length > 0 ? members : [entry];
  }

  function resolveEntrySourceText(entry) {
    return entry.batchSourceText || entry.text;
  }

  function resolveEntryStartTime(entry) {
    return entry.batchStartAt || entry.createdAt;
  }

  function resolveEntrySpeakerLabel(entry) {
    const speaker = entry.speaker || t("panel.unknownSpeaker");
    if (Array.isArray(entry.batchMemberIds) && entry.batchMemberIds.length > 1) {
      return `${speaker} · ${t("panel.batchCount", { count: entry.batchMemberIds.length })}`;
    }
    return speaker;
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

    clearInlineTranslationElement(inlineNode);
  }

  function clearInlineTranslationElement(inlineNode) {
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

  function attachInlineNode(entry, inlineNode) {
    if (entry.inlineNode && entry.inlineNode !== inlineNode) {
      clearInlineTranslationElement(entry.inlineNode);
    }
    entry.inlineNode = inlineNode;
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
