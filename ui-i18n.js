(() => {
  const STRINGS = {
    "zh-CN": {
      common: {
        autoDetect: "自动识别",
        custom: "自定义"
      },
      options: {
        pageTitle: "TeamsLingo 配置",
        headerTitle: "TeamsLingo 配置",
        headerDescription: "为 TeamsLingo 配置 OpenAI-compatible 或本地 LLM API 后，即可在 Teams Web 会议中自动翻译实时字幕。",
        enabled: "启用自动翻译",
        uiLanguage: "界面语言 / Interface language",
        uiLanguageZh: "中文 / Chinese",
        uiLanguageEn: "English / 英文",
        panelTheme: "浮动窗口外观",
        panelThemeSystem: "自动跟随系统",
        panelThemeDark: "暗黑",
        panelThemeLight: "明亮",
        provider: "翻译服务",
        apiFormat: "API 格式",
        endpoint: "API Endpoint 或 Base URL",
        endpointHelpGoogle: "可留空使用默认 Google Cloud Translation Basic v2 endpoint。",
        endpointHelpMicrosoft: "可填资源 endpoint 或 https://api.cognitive.microsofttranslator.com，插件会自动请求 /translate。",
        endpointHelpResponses: "Responses API 可填 https://api.poe.com/v1，插件会自动请求 /responses。",
        endpointHelpChat: "Chat Completions API 可填 https://api.openai.com/v1，插件会自动请求 /chat/completions。",
        microsoftRegion: "Microsoft Region",
        microsoftRegionPlaceholder: "例如: eastus",
        microsoftRegionHelp: "区域资源或多服务资源需要填写；全局单服务 Translator 可留空。",
        apiKey: "API Key",
        apiKeyHelp: "Key 保存在此浏览器扩展的本地存储中。",
        model: "Model",
        sourceLanguage: "源语言",
        sourceModeAuto: "根据字幕内容自动识别",
        sourceModeFixed: "固定为 Teams 转写语言",
        sourceCustomPlaceholder: "例如: Japanese",
        sourceHelp: "自动识别会直接根据 Teams 实时字幕文本判断源语言。",
        targetLanguage: "目标语言",
        targetCustomPlaceholder: "例如: Simplified Chinese",
        targetHelp: "下拉列表使用 Teams 实时翻译字幕支持的目标语言，也可以自定义。",
        translationMode: "翻译模式",
        translationModeFast: "极速",
        translationModeBalanced: "均衡",
        translationModeComplete: "整句优先",
        translationModeHelp: "根据源语言自动调整静默等待、增量合并和最大持有时间。",
        settleDelay: "最小静默等待",
        settleDelayHelp: "单位毫秒；会作为自动调参后的下限，用来避免过早翻译半句话。",
        minChars: "最短字幕长度",
        maxItems: "窗口保留条数",
        processExistingOnStart: "启动时翻译已有字幕",
        save: "保存",
        test: "测试翻译",
        saved: "已保存。",
        testing: "正在测试...",
        testSuccess: "测试成功：{result}",
        testFailure: "测试失败。",
        modelProbeThinkFalse: "模型探测：已识别为支持关闭 thinking 的模型；兼容后端上会优先走快速回复策略。",
        modelProbeThinkFalseVerified: "模型探测：已实测确认当前接口支持禁用 thinking，后续翻译会自动使用快速模式。",
        modelProbeThinkLevel: "模型探测：已识别为 GPT-OSS 一类 thinking 模型；它不适用布尔 think=false。",
        modelProbeReasoningEffort: "模型探测：已识别为 reasoning 模型；在标准 OpenAI 接口下更适合用 reasoning_effort 控制速度。",
        modelProbeReasoningEffortVerified: "模型探测：已实测确认当前接口支持 reasoning_effort=none，后续翻译会自动使用该快速控制。",
        modelProbeReasoningEffortMinimalVerified: "模型探测：已实测确认当前接口支持 reasoning_effort=minimal，后续翻译会自动使用这一更快档位。",
        modelProbeReasoningEffortLowVerified: "模型探测：已实测确认当前接口支持 reasoning_effort=low，后续翻译会自动使用这一兼容快速档位。",
        modelProbeReasoningObjectVerified: "模型探测：已实测确认当前接口支持 reasoning.effort=none，后续翻译会自动使用该快速控制。",
        modelProbeReasoningObjectMinimalVerified: "模型探测：已实测确认当前接口支持 reasoning.effort=minimal，后续翻译会自动使用这一更快档位。",
        modelProbeReasoningObjectLowVerified: "模型探测：已实测确认当前接口支持 reasoning.effort=low，后续翻译会自动使用这一兼容快速档位。",
        modelProbePlain: "模型探测：当前未识别为 think / reasoning 模型。",
        modelProbeUnknown: "模型探测：标准 /v1/models 不暴露 thinking 能力字段，当前结果属于基于模型名的兼容推断。",
        modelProbeMissing: "模型探测：/v1/models 中未找到当前模型。",
        modelProbeFailed: "模型探测失败：{message}"
      },
      popup: {
        pageTitle: "TeamsLingo",
        title: "TeamsLingo",
        enabled: "启用",
        options: "API 配置",
        statusPaused: "当前已暂停。",
        statusNeedApi: "需要配置 API。"
      },
      panel: {
        ariaLabel: "TeamsLingo caption translation panel",
        title: "TeamsLingo",
        initializing: "正在初始化",
        waiting: "等待 Teams 实时字幕",
        togglePause: "暂停翻译",
        toggleResume: "继续翻译",
        exportSource: "导出原字幕记录",
        exportBilingual: "导出双语字幕记录",
        clear: "清空当前会话记录",
        options: "打开 API 配置",
        minimize: "缩小为迷你悬浮窗",
        restore: "恢复完整窗口",
        exportSourceShort: "原",
        exportBilingualShort: "双",
        statusPaused: "已暂停",
        statusNeedApi: "需要配置 API",
        statusTranslating: "翻译中",
        statusCleared: "已清空当前会话记录",
        statusNoTranscript: "当前没有可导出的字幕记录",
        statusExportFailed: "导出失败",
        statusExportedSource: "已导出原字幕",
        statusExportedBilingual: "已导出双语字幕",
        pendingTranslation: "翻译中...",
        inlineTranslationFailed: "翻译失败",
        unknownSpeaker: "未知发言人",
        batchCount: "整段 {count} 句",
        exportTranscriptTitle: "TeamsLingo 字幕记录",
        exportTime: "导出时间",
        exportContent: "导出内容",
        exportContentSource: "仅原文",
        exportContentBilingual: "原文 + 译文",
        exportSourcePrefix: "原文",
        exportTranslationPrefix: "译文",
        exportUntranslated: "[未生成翻译]",
        exportTranslationFailed: "[翻译失败] {message}"
      }
    },
    en: {
      common: {
        autoDetect: "Auto detect",
        custom: "Custom"
      },
      options: {
        pageTitle: "TeamsLingo Settings",
        headerTitle: "TeamsLingo Settings",
        headerDescription: "Configure an OpenAI-compatible or local LLM API for TeamsLingo to translate live captions automatically in Teams web meetings.",
        enabled: "Enable automatic translation",
        uiLanguage: "Interface language / 界面语言",
        uiLanguageZh: "中文 / Chinese",
        uiLanguageEn: "English / 英文",
        panelTheme: "Floating window appearance",
        panelThemeSystem: "Follow system",
        panelThemeDark: "Dark",
        panelThemeLight: "Light",
        provider: "Translation provider",
        apiFormat: "API format",
        endpoint: "API endpoint or base URL",
        endpointHelpGoogle: "Leave blank to use the default Google Cloud Translation Basic v2 endpoint.",
        endpointHelpMicrosoft: "Use your resource endpoint or https://api.cognitive.microsofttranslator.com; the extension will call /translate automatically.",
        endpointHelpResponses: "For the Responses API, you can enter https://api.poe.com/v1 and the extension will call /responses automatically.",
        endpointHelpChat: "For Chat Completions, you can enter https://api.openai.com/v1 and the extension will call /chat/completions automatically.",
        microsoftRegion: "Microsoft region",
        microsoftRegionPlaceholder: "For example: eastus",
        microsoftRegionHelp: "Required for regional or multi-service resources; leave blank for the global single-service Translator endpoint.",
        apiKey: "API key",
        apiKeyHelp: "The key is stored in this browser extension's local storage.",
        model: "Model",
        sourceLanguage: "Source language",
        sourceModeAuto: "Detect from the caption text",
        sourceModeFixed: "Use the Teams transcription language",
        sourceCustomPlaceholder: "For example: Japanese",
        sourceHelp: "Auto detect infers the source language directly from the Teams live caption text.",
        targetLanguage: "Target language",
        targetCustomPlaceholder: "For example: Simplified Chinese",
        targetHelp: "The dropdown uses Teams live translated caption targets, and you can also enter a custom value.",
        translationMode: "Translation mode",
        translationModeFast: "Fast",
        translationModeBalanced: "Balanced",
        translationModeComplete: "Complete sentence",
        translationModeHelp: "Automatically tunes waiting, incremental merge, and max hold times from the detected source-language profile.",
        settleDelay: "Minimum quiet wait",
        settleDelayHelp: "In milliseconds. Used as the lower bound after automatic tuning so half-sentences are less likely to be translated too early.",
        minChars: "Minimum caption length",
        maxItems: "Items kept in the window",
        processExistingOnStart: "Translate existing captions on startup",
        save: "Save",
        test: "Test translation",
        saved: "Saved.",
        testing: "Testing...",
        testSuccess: "Test succeeded: {result}",
        testFailure: "Test failed.",
        modelProbeThinkFalse: "Model probe: detected as a model that can disable thinking; supported compatible backends will favor a faster reply path.",
        modelProbeThinkFalseVerified: "Model probe: confirmed that this endpoint accepts disabling thinking, and future translations will automatically use that faster path.",
        modelProbeThinkLevel: "Model probe: detected as a GPT-OSS-style thinking model; boolean think=false is not appropriate.",
        modelProbeReasoningEffort: "Model probe: detected as a reasoning model; the standard OpenAI format should prefer reasoning_effort for speed control.",
        modelProbeReasoningEffortVerified: "Model probe: confirmed that this endpoint accepts reasoning_effort=none, and future translations will automatically use that faster control.",
        modelProbeReasoningEffortMinimalVerified: "Model probe: confirmed that this endpoint accepts reasoning_effort=minimal, and future translations will automatically use that faster level.",
        modelProbeReasoningEffortLowVerified: "Model probe: confirmed that this endpoint accepts reasoning_effort=low, and future translations will automatically use that compatible faster level.",
        modelProbeReasoningObjectVerified: "Model probe: confirmed that this endpoint accepts reasoning.effort=none, and future translations will automatically use that faster control.",
        modelProbeReasoningObjectMinimalVerified: "Model probe: confirmed that this endpoint accepts reasoning.effort=minimal, and future translations will automatically use that faster level.",
        modelProbeReasoningObjectLowVerified: "Model probe: confirmed that this endpoint accepts reasoning.effort=low, and future translations will automatically use that compatible faster level.",
        modelProbePlain: "Model probe: not identified as a think / reasoning model.",
        modelProbeUnknown: "Model probe: the standard /v1/models response does not expose thinking capability, so this result is a compatibility-oriented inference from the model name.",
        modelProbeMissing: "Model probe: the selected model was not found in /v1/models.",
        modelProbeFailed: "Model probe failed: {message}"
      },
      popup: {
        pageTitle: "TeamsLingo",
        title: "TeamsLingo",
        enabled: "Enabled",
        options: "API settings",
        statusPaused: "Translation is paused.",
        statusNeedApi: "API configuration is required."
      },
      panel: {
        ariaLabel: "TeamsLingo caption translation panel",
        title: "TeamsLingo",
        initializing: "Initializing",
        waiting: "Waiting for Teams live captions",
        togglePause: "Pause translation",
        toggleResume: "Resume translation",
        exportSource: "Export source captions",
        exportBilingual: "Export bilingual captions",
        clear: "Clear current session",
        options: "Open API settings",
        minimize: "Minimize to mini player",
        restore: "Restore full window",
        exportSourceShort: "S",
        exportBilingualShort: "B",
        statusPaused: "Paused",
        statusNeedApi: "API setup required",
        statusTranslating: "Translating",
        statusCleared: "Current session cleared",
        statusNoTranscript: "No captions available to export",
        statusExportFailed: "Export failed",
        statusExportedSource: "Source captions exported",
        statusExportedBilingual: "Bilingual captions exported",
        pendingTranslation: "Translating...",
        inlineTranslationFailed: "Translation failed",
        unknownSpeaker: "Unknown speaker",
        batchCount: "{count} merged lines",
        exportTranscriptTitle: "TeamsLingo Caption Transcript",
        exportTime: "Exported at",
        exportContent: "Content",
        exportContentSource: "Source only",
        exportContentBilingual: "Source + translation",
        exportSourcePrefix: "Source",
        exportTranslationPrefix: "Translation",
        exportUntranslated: "[Translation not available]",
        exportTranslationFailed: "[Translation failed] {message}"
      }
    }
  };

  function normalizeLanguage(language) {
    return language === "en" ? "en" : "zh-CN";
  }

  function getStrings(language) {
    return STRINGS[normalizeLanguage(language)];
  }

  function getValue(strings, key) {
    return key.split(".").reduce((current, segment) => current?.[segment], strings);
  }

  function format(text, values) {
    return String(text || "").replace(/\{(\w+)\}/g, (_match, name) => {
      return values?.[name] === undefined ? "" : String(values[name]);
    });
  }

  function text(language, key, values) {
    const strings = getStrings(language);
    const value = getValue(strings, key);
    if (typeof value !== "string") {
      return key;
    }
    return format(value, values);
  }

  function translatePage(root, language) {
    const strings = getStrings(language);

    for (const element of root.querySelectorAll("[data-i18n]")) {
      const key = element.getAttribute("data-i18n");
      element.textContent = getValue(strings, key) || "";
    }

    for (const element of root.querySelectorAll("[data-i18n-placeholder]")) {
      const key = element.getAttribute("data-i18n-placeholder");
      element.placeholder = getValue(strings, key) || "";
    }

    for (const element of root.querySelectorAll("[data-i18n-title]")) {
      const key = element.getAttribute("data-i18n-title");
      element.title = getValue(strings, key) || "";
    }
  }

  window.TCT_I18N = {
    normalizeLanguage,
    getStrings,
    text,
    translatePage
  };
})();
