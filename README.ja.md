# TeamsLingo

**[中文](README.md)** | [English](README.en.md) | 日本語

<img src="TeamsLingo_3D.png" width="160" align="right" />

Microsoft Edge と Google Chrome で利用できる Teams Web のリアルタイム字幕翻訳ブラウザー拡張です。TeamsLingo は Teams Web 会議ページ上のライブ字幕を監視し、設定した翻訳サービスに送信して翻訳します。無料で直接使える Google 翻訳と Microsoft Translator に加え、OpenAI および互換 API、Poe、ローカル LLM サービスにも対応しています。翻訳結果は元字幕の横と右側のフローティングパネルに同時表示され、会議字幕と訳文のエクスポートにも対応します。

---

## ソースからインストール

1. ブラウザーで拡張機能管理ページを開きます。
   - Edge: `edge://extensions/`
   - Chrome: `chrome://extensions/`
2. ページ上の **Developer mode** を有効にします。
3. **Load unpacked** をクリックし、このプロジェクトのディレクトリを選択します。

![Chromium extensions page and Load unpacked button](docs/images/edge-extensions-page.png)

> スクリーンショットは Edge の例ですが、Chrome でも流れは同じです。

4. インストール後、ブラウザーツールバーの TeamsLingo アイコンをクリックし、**設定** ページを開きます。
5. 利用する翻訳方法を 1 つ選び、必要な項目だけ設定します。
   - OpenAI 互換 API / Poe / ローカル LLM: API 形式、Endpoint、API Key、Model を設定します。
   - Google Translate: API Key を空欄にすると無料モード、Google Cloud API Key を入れると公式 API を使います。
   - Microsoft Translator: API Key を空欄にすると無料モード、Azure Translator Key を入れると公式 API を使います。必要な場合のみ Region も設定します。

![TeamsLingo settings page](docs/images/settings-page.png)

> **提供形態:** 現在は Edge / Chrome の開発者モードで読み込む形で利用できます。ストア版はまだ公開していません。

## 使い方

1. Edge または Chrome で Teams Web 会議ページを開きます。
2. Teams で **Live Captions** を有効にします。
3. TeamsLingo がページ右側にフローティング翻訳パネルを表示します。字幕が安定すると、訳文がインライン表示とサイドパネルに反映されます。
4. 必要に応じて、パネルから原文字幕または対訳字幕をエクスポートできます。

![Teams meeting page with floating translation panel](docs/images/teams-meeting-page.png)

---

## 翻訳サービス設定

TeamsLingo は 3 つの翻訳方法に対応しています。

### 1. OpenAI 互換 API / Poe / ローカル LLM

- 既存の API サービス、Poe、またはローカルモデルを使いたい場合向けです。
- `API 形式`、`Endpoint`、`API Key`、`Model` を設定します。
- サービスに合わせて Chat Completions または Responses を選びます。Poe や一部のホスト型サービスは Responses、ローカル LLM は Chat Completions が一般的です。

### 2. Google Translate

- `API Key` を空欄にすると無料モードを使えます。
- Google Cloud API Key を設定すると、公式 Google Cloud Translation API を使います。

### 3. Microsoft Translator

- `API Key` を空欄にすると無料モードを使えます。
- Azure Translator Key を設定すると、公式 Microsoft Translator API を使います。Azure リソースで必要な場合のみ `Microsoft Region` を設定してください。

> Google / Microsoft の無料モードは Web 翻訳経路に依存しており、安定性は保証されません。レート制限、仕様変更、停止が起こる可能性があります。安定性を重視する場合は、公式の有料 API を使ってください。

---

## 主な機能

- **Edge / Chrome 対応** - Microsoft Edge と Google Chrome に解凍済み拡張として導入できます。
- **リアルタイム字幕翻訳** - Teams のライブ字幕を監視し、文が確定した時点で自動翻訳します。
- **複数の翻訳エンジン** - 無料の Google / Microsoft Web 翻訳、OpenAI および互換 API、Poe、ローカル LLM サービス、公式 Google Cloud Translation / Microsoft Translator API に対応します。
- **言語ペアを柔軟に設定** - 原文言語は自動判定または固定設定が可能で、翻訳先言語も幅広く選べます。
- **重複の自動排除** - Teams の字幕リスト再描画による重複翻訳を防ぎます。
- **対訳表示** - 元字幕の横とフローティングサイドパネルの両方に訳文を表示します。
- **多言語 UI** - 拡張 UI は中国語、英語、日本語に対応します。
- **プライバシー重視** - 翻訳設定はローカル保存のみで、字幕テキストは指定した翻訳サービスにだけ送信されます。

---

## 注意事項

- この拡張機能は Microsoft Edge と Google Chrome に導入できますが、動作するのは Teams **Web** ページ（teams.microsoft.com / teams.cloud.microsoft / teams.live.com）のみで、Teams デスクトップアプリには対応しません。
- 翻訳サービスの Endpoint はユーザーが自由に指定できるため、バックグラウンドサービスワーカーが任意の翻訳先へ通信できるよう、広い `http/https` host permissions を宣言しています。

## プライバシー

TeamsLingo は個人データを収集、保存、送信しません。詳細は [PRIVACY_POLICY.md](PRIVACY_POLICY.md) を参照してください。

## リンク

- **GitHub:** https://github.com/Amoiensis/TeamsLingo
- **最新正式版の案内:** https://github.com/Amoiensis/TeamsLingo/releases/latest
- **最新パッケージのダウンロード:** https://github.com/Amoiensis/TeamsLingo/releases/latest/download/TeamsLingo.zip
- **更新ガイド:** [docs/UPDATE_GUIDE.ja.md](docs/UPDATE_GUIDE.ja.md)
- **Issues:** https://github.com/Amoiensis/TeamsLingo/issues
