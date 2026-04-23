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
5. 翻訳サービス、API 形式、Endpoint、API Key、Model、原文言語モード、翻訳先言語を設定します。Google 翻訳 / Microsoft Translator は API Key を空欄にすると無料モードを使えます。

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

TeamsLingo は 3 種類の翻訳サービスに対応しています。

### OpenAI 互換 API、Poe、ローカル LLM サービス

OpenAI 互換の 2 つのリクエスト形式に対応します。

**Chat Completions API**

```http
POST https://api.openai.com/v1/chat/completions
Authorization: Bearer <API Key>
Content-Type: application/json
```

リクエスト本文には `model`、`temperature`、`messages` を含みます。

**Responses API**

```http
POST https://api.poe.com/v1/responses
Authorization: Bearer <API Key>
Content-Type: application/json
```

リクエスト本文には `model`、`temperature`、`input` を含みます。Endpoint に `https://api.poe.com/v1` を指定した場合、拡張機能が API 形式に応じて `/responses` または `/chat/completions` を自動で補完します。

**Poe の設定例**

```text
翻訳サービス: OpenAI 互換 API / Poe
API 形式: Responses API
API Endpoint / Base URL: https://api.poe.com/v1
Model: gpt-4o-mini
```

**ローカル LLM サービスの設定例**

```text
翻訳サービス: OpenAI 互換 API / Poe
API 形式: Chat Completions API
API Endpoint / Base URL: http://localhost:11434/v1
Model: gemma3:4b
```

### Google 翻訳

デフォルトでは無料の Google Web 翻訳経路を使います。

```http
POST https://translate.googleapis.com/translate_a/t?client=gtx&dt=t&sl=auto&tl=zh-CN
Content-Type: application/x-www-form-urlencoded
```

**無料モードの設定例**

```text
翻訳サービス: Google Translate
API Endpoint / Base URL: 空欄、または https://translate.googleapis.com/translate_a/t
API Key: 空欄
```

API Key を入力すると、公式の Google Cloud Translation Basic v2 に切り替わります。

```http
POST https://translation.googleapis.com/language/translate/v2
```

拡張機能は `q` と `target` を送信し、原文言語を固定した場合は `source` も追加します。自動判定時は `sl=auto` を使います。

### Microsoft Translator

デフォルトでは無料の Microsoft Edge 翻訳経路を使います。

```http
GET https://edge.microsoft.com/translate/auth
POST https://api-edge.cognitive.microsofttranslator.com/translate?api-version=3.0&to=zh-Hans&includeSentenceLength=true
Authorization: Bearer <edge auth token>
```

**無料モードの設定例**

```text
翻訳サービス: Microsoft Translator
API Endpoint / Base URL: 空欄、または https://api-edge.cognitive.microsofttranslator.com/translate
API Key: 空欄
Microsoft Region: 空欄
```

API Key を入力すると、公式の Microsoft Translator Text API v3 に切り替わります。

```http
POST https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=zh-Hans
```

**公式 API モードの設定例**

```text
翻訳サービス: Microsoft Translator
API Endpoint / Base URL: 空欄、または https://api.cognitive.microsofttranslator.com
API Key: Azure Translator key
Microsoft Region: Azure リソースに合わせて入力。グローバル単体 Translator なら空欄可
```

無料モードでは最初に Edge Web 翻訳トークンを取得し、その後 `api-edge.cognitive.microsofttranslator.com` を呼び出します。`Microsoft Region` は公式 API モードでのみ使用されます。

> 無料の Web 翻訳経路は非公式な Web インターフェースに依存するため、レート制限や仕様変更が起こる場合があります。安定した SLA が必要な場合は、公式の有料 API Key を利用してください。

---

## 動作の仕組み

- 主な DOM セレクターは Teams の字幕要素 `data-tid="closed-caption-text"` と `data-tid="author"` です。
- 字幕テキストが設定時間以上変化しなくなると、その文が完了したとみなして翻訳キューへ送ります。
- 原文言語はデフォルトで自動判定され、必要に応じて Teams 対応の会議発話 / 文字起こし言語へ固定できます。
- 翻訳先言語のプルダウンには Teams のリアルタイム翻訳字幕が対応する言語を表示し、カスタム入力も残しています。
- 同一話者・同一字幕の組み合わせは 30 分間重複排除し、Teams の仮想リスト再描画による重複翻訳を防ぎます。
- API Key は `chrome.storage.local` にのみ保存され、会議ファイルへは書き出しません。

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
- **Releases:** https://github.com/Amoiensis/TeamsLingo/releases
- **更新ガイド:** [docs/UPDATE_GUIDE.ja.md](docs/UPDATE_GUIDE.ja.md)
- **Issues:** https://github.com/Amoiensis/TeamsLingo/issues
