# IntuitiveD4UI — CLAUDE.md

## プロジェクト概要

- **プロジェクト名:** Intuitive D4UI（Designer for User Interface）
- **目的:** Webサイト・Webアプリケーション・デスクトップアプリ（Windows）向けワイヤーフレーム作成ツール
- **対象ユーザー:** 開発者本人のみ（個人利用）
- **アプリ形態:** SPA + PWA（Chromium系ブラウザのみ対応）
- **UI言語:** 日本語のみ

### リポジトリ構成

| ディレクトリ | 内容 |
|-------------|------|
| `app/` | Vue アプリ本体（メイン開発対象） |
| `docs/` | VitePress ドキュメントサイト |
| `pre-plans/` | 設計書類 |

### 技術スタック

| カテゴリ | 技術 | バージョン |
|----------|------|-----------|
| パッケージマネージャー | npm | - |
| 言語 | TypeScript | ~5.9 |
| フレームワーク | Vue.js（Vue 3, Composition API） | ^3.5 |
| 状態管理 | Pinia | ^3.0 |
| ビルドツール | Vite | ^7.3 |
| Canvas描画 | Konva.js + vue-konva | ^10.2 / ^3.3 |
| UIコンポーネント | Vuetify | ^4.0 |
| CSS方針 | Vuetifyスタイルシステム + Vue SFC scoped CSS | - |
| ユニットテスト | Vitest | ^4.0 |
| E2Eテスト | Playwright | ^1.58 |
| PWA | vite-plugin-pwa（Workbox） | ^1.2 |
| Linter | OxLint + ESLint | - |
| フォーマッター | Prettier | 3.8 |
| 開発補助 | Vue DevTools（vite-plugin-vue-devtools） | - |

### 設計書

設計書類は `pre-plans/` に格納されている。

| パス | 内容 |
|------|------|
| `pre-plans/requirements/要件定義書.md` | 要件定義書 v0.3.0 |
| `pre-plans/basic-design/00-overview.md` | 基本設計: 全体概要（技術スタック・用語集） |
| `pre-plans/basic-design/01-application-architecture.md` | アプリケーション基盤 |
| `pre-plans/basic-design/02-data-design.md` | データ設計・永続化（.wfpファイル形式、IndexedDB） |
| `pre-plans/basic-design/03-canvas-rendering.md` | キャンバス・レンダリング設計 |
| `pre-plans/basic-design/04-interaction-design.md` | 操作・インタラクション設計 |
| `pre-plans/basic-design/05-export-design.md` | エクスポート・変換設計 |
| `pre-plans/basic-design/06-development-roadmap.md` | 開発ロードマップ（5フェーズ + PoCゲート） |
| `pre-plans/basic-design/07-screen-layout.md` | 画面レイアウト設計 |
| `pre-plans/basic-design/08-module-structure.md` | モジュール構成 |
| `pre-plans/basic-design/09-documentation-plan.md` | ドキュメント体系設計 |

### 開発フェーズ

| フェーズ | 内容 |
|---------|------|
| フェーズ1 | 基盤構築・基本機能（MVP）|
| フェーズ2 | UIコンポーネント・拡張機能 |
| フェーズ3 | プロジェクト管理・テンプレート |
| PoC-1 | HTML/CSS変換の実現性検証 |
| フェーズ4 | 画像・HTML/CSSエクスポート |
| PoC-2/3 | XAML差異の実機検証 |
| フェーズ5 | XAMLエクスポート（WPF / WinUI 3 / .NET MAUI / Avalonia UI） |

---

## 意思疎通・会話の言語

Claude Code とユーザーの会話・意思疎通は**日本語**で行います。

---

## 議論・回答の進め方（AskUserQuestion の使い方）

- 詳細な提案・説明は通常テキストで記述する（AskUserQuestion と同時に出さない）
- ユーザーが内容を読んだことを確認してから、AskUserQuestion で選択肢を提示する

具体的な流れ:

1. **メッセージ1（Claude）**: 詳細な提案・説明を記述。最後に「確認できたらお知らせください」等と書く
2. **メッセージ2（ユーザー）**: 「読んだ」「OK」等
3. **メッセージ3（Claude）**: AskUserQuestion で短い選択肢を提示（必要な場合のみ）

テキストでの回答が自然な場面では AskUserQuestion を使わなくてよい。

---

## コミュニケーション方針

**このプロジェクトでは、実装前の議論を重視します。**

### 1. 実装前の議論を必須とする

- 新機能の追加や仕様変更の依頼を受けた際は、**必ず実装前に要件や仕様について議論する**
- 不明点がある場合は、推測で進めず**必ずユーザーに確認を取る**
- 複数の実装方法や選択肢がある場合は、**提案してユーザーに選択してもらう**
- 「おそらくこうだろう」という推測で実装に着手しない

### 2. 段階的なアプローチ

要件確認 → 設計議論 → 実装 → 動作確認 の順で進める。

- 各段階でユーザーの合意を得てから次に進む
- 実装中に疑問が生じた場合は、その場で確認を取る

### 3. 避けるべき行動

- 要件が曖昧なまま実装に着手しない
- ユーザーが明示的に依頼していない機能を勝手に追加しない
- 仕様について独断で判断しない
