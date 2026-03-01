# 基本設計書: モジュール構成

## 文書情報

| 項目 | 内容 |
|------|------|
| 文書名 | 基本設計書: モジュール構成 |
| バージョン | 0.1.0 |
| 作成日 | 2026-02-27 |
| ステータス | ドラフト |
| 対応する要件定義書 | Intuitive D4UI 要件定義書 v0.3.0 |

---

## 1. 概要

### 1.1 本設計書の範囲

テーマ別設計書（01〜06）および横断07（画面レイアウト設計）で決定された論理モジュールを、実装プロジェクトの**物理的なディレクトリ・ファイル配置**に集約する。

本設計書が定義する範囲:

- `src/` 配下のディレクトリ構成とファイル配置方針
- プロジェクトルート直下の主要ディレクトリ（テスト、設定ファイル等）
- 4層レイヤーアーキテクチャとディレクトリの対応関係
- ファイル粒度・命名規則
- モジュール間の依存ルール

本設計書の範囲外:

- ドキュメント類（ユーザーマニュアル、開発者ガイド等）の体系 — `09-documentation-plan.md` で定義済み
- 各モジュールの内部実装詳細 — 各テーマ設計書を参照

### 1.2 各テーマ設計書からの入力

| 入力元 | 主な入力内容 |
|--------|------------|
| テーマ1（アプリ基盤） | 4層レイヤー構成（UI/アプリケーション/ドメイン/インフラ）、技術スタック |
| テーマ2（データ設計） | 型定義（ElementNode, Project, Page等）、Piniaストア論理構成、IndexedDB構成 |
| テーマ3（キャンバス） | 3レイヤー描画（grid/element/overlay）、レイアウトエンジン、vue-konvaコンポーネント10種 |
| テーマ4（操作設計） | Undo/Redoストア、選択管理、操作ハンドラ、ショートカット管理 |
| テーマ5（エクスポート） | 変換パイプライン（ExportNode中間表現、ExportTarget、XAMLアダプタ） |
| 横断07（画面レイアウト） | UIコンポーネントのディレクトリ構造（委譲）、Vuetifyプラグイン設定配置（委譲）、自前拡張コンポーネント |

---

## 2. ディレクトリ構成方針

### 2.1 設計方針

**ハイブリッド方式**を採用する: トップレベルはVue/Viteエコシステムの慣習に準拠し、ドメイン層とインフラ層は独立ディレクトリとして明示的に分離する。

選定理由:

- **Vue慣習との整合**: `components/`、`stores/`、`composables/` はVue開発者に広く認知されたディレクトリ名であり、学習コストが低い
- **レイヤー境界の明示**: ビジネスロジック（`domain/`）と外部リソースアクセス（`services/`）を独立ディレクトリとすることで、4層の依存方向を物理的に可視化する
- **Vite/Vue CLIとの互換**: 生成テンプレートやプラグインが想定するディレクトリ構成と大きく乖離しない

### 2.2 src/ 直下のディレクトリツリー

```
src/
├── components/         # UI層: Vueコンポーネント
├── stores/             # アプリケーション層: Piniaストア
├── composables/        # アプリケーション層: Vue Composables
├── domain/             # ドメイン層: ビジネスロジック（純粋関数）
├── services/           # インフラ層: 外部リソースアクセス
├── types/              # 共通型定義
├── plugins/            # Vuetify等プラグイン設定
├── assets/             # 静的リソース（アイコン、フォント等）
├── App.vue             # ルートコンポーネント
└── main.ts             # エントリーポイント
```

### 2.3 4層レイヤーとディレクトリの対応表

| レイヤー | ディレクトリ | 責務 | 依存してよい層 |
|---------|------------|------|--------------|
| **UI層** | `components/` | 画面描画、ユーザー入力の受付、vue-konva描画 | アプリケーション層、ドメイン層（型参照のみ）、`types/` |
| **アプリケーション層** | `stores/`、`composables/` | 状態管理、ユースケース実行、UI操作のオーケストレーション | ドメイン層、インフラ層 |
| **ドメイン層** | `domain/` | レイアウト計算、エクスポート変換、バリデーション（純粋関数） | `types/`のみ（他層に依存しない） |
| **インフラ層** | `services/` | File System Access API、IndexedDB、Service Worker | `types/`のみ（他層に依存しない） |

依存方向の原則: **UI → アプリケーション → ドメイン / インフラ**

- `domain/` と `services/` は同レイヤーではなく、それぞれ独立。互いに直接依存しない
- `stores/` がドメインロジック呼び出しとインフラ呼び出しを仲介する
- `types/` は全レイヤーから参照可能な最下層

---

## 3. ファイル粒度・命名規則

### 3.1 Vueコンポーネントの粒度

- **1コンポーネント = 1ファイル**（Vue SFC標準）
- コンポーネント名は **PascalCase** で、接頭辞で種類を区別する

| 接頭辞 | 用途 | 例 |
|--------|------|---|
| `Wf` | vue-konva描画コンポーネント | `WfRectangle.vue`、`WfContainer.vue` |
| `App` | アプリケーション固有のレイアウトコンポーネント | `AppMenuBar.vue`、`AppSidebar.vue` |
| `The` | シングルトンコンポーネント（1画面に1つ） | `TheCanvasStage.vue`、`ThePropertyPanel.vue` |
| なし | 汎用・再利用可能コンポーネント | `DragNumberInput.vue`、`PanelResizer.vue` |

### 3.2 Piniaストアの粒度

**機能別分割**を採用する。責務が独立しており、異なるタイミングで変更される単位で分割する。

| ストアファイル | 責務 | 出典 |
|--------------|------|------|
| `useProjectStore.ts` | Project/Page/ElementNode のCRUD、フラットマップ管理 | テーマ2 |
| `useSelectionStore.ts` | selectedIds、selectionContext、ドリルダウン状態 | テーマ4 |
| `useUndoStore.ts` | Undo/Redo履歴、トランザクションAPI（beginTransaction/commit/rollback） | テーマ4 |
| `useUIStore.ts` | アクティブツール、パネル開閉状態、ズーム倍率、スクロール位置等 | テーマ3/4/7 |
| `useTemplateStore.ts` | テンプレートCRUD | テーマ2 |
| `useAppSettingsStore.ts` | アプリ全体の設定（テーマ、言語等） | テーマ2 |

拡張方針: ストアが肥大化した場合は更に分割可能。例: `useProjectStore` → `usePageStore` + `useElementStore`。

### 3.3 ドメインモデル・ユーティリティの粒度

- **レイアウトエンジン**: 関数ごとにファイル分割（`calculateLayout.ts`、`getGlobalPosition.ts` 等）
- **エクスポート変換**: ターゲットごとにファイル分割（`HtmlCssExporter.ts`、`SvgExporter.ts` 等）
- **ユーティリティ**: 機能カテゴリ単位でファイル分割

### 3.4 命名規則

| 対象 | 規則 | 例 |
|------|------|---|
| Vueコンポーネント | PascalCase `.vue` | `WfRectangle.vue`、`AppMenuBar.vue` |
| Piniaストア | camelCase `use〜Store.ts` | `useProjectStore.ts` |
| Composables | camelCase `use〜.ts` | `useCanvasEvents.ts` |
| ドメインロジック（関数） | camelCase `.ts` | `calculateLayout.ts`、`buildExportTree.ts` |
| ドメインロジック（クラス） | PascalCase `.ts` | `HtmlCssExporter.ts`、`WpfAdapter.ts` |
| 型定義 | camelCase `.ts` | `elementTypes.ts`、`projectTypes.ts` |
| テストファイル | `〜.test.ts` または `〜.spec.ts` | `calculateLayout.test.ts` |
| ディレクトリ | kebab-case | `canvas/`、`file-system/`、`crash-recovery/` |

---

## 4. 型定義ファイルの配置

### 4.1 共通型 vs モジュール内型の分類基準

**2層構成**を採用する:

| 配置先 | 対象 | 基準 |
|--------|------|------|
| `src/types/` | 共通型 | **3モジュール以上**から参照される型 |
| 各モジュール内 | モジュール固有型 | そのモジュール内（または密結合する1〜2モジュール）でのみ使用される型 |

循環参照防止ルール:

- `src/types/` は他のどのモジュールにも依存しない（最下層）
- モジュール固有型から共通型への参照は許可
- 共通型からモジュール固有型への参照は**禁止**

### 4.2 型定義ファイル一覧

#### 共通型（`src/types/`）

| ファイル名 | 主な型定義 | 出典 |
|-----------|----------|------|
| `elementTypes.ts` | `ElementNode`、`ElementType`、`TypeSpecificProps`、各要素Props（`RectangleProps`、`EllipseProps`、`LineProps`、`ArrowProps`、`TextProps`、`ImagePlaceholderProps`、`ContainerProps`、`GroupProps`、各UIコンポーネントProps） | テーマ2 |
| `projectTypes.ts` | `Project`、`ProjectSettings`、`Page` | テーマ2 |
| `layoutTypes.ts` | `LayoutConfig`、`FreeLayout`、`FlexLayout`、`GridLayout`、`Spacing`、`LayoutResult` | テーマ2/3 |
| `templateTypes.ts` | `Template` | テーマ2 |

共通型ファイル間の依存関係: `elementTypes.ts` は `layoutTypes.ts` の `LayoutConfig`、`Spacing` を参照する（`ElementNode` のプロパティとして使用）。循環参照を避けるため、`layoutTypes.ts` から `elementTypes.ts` への参照は禁止する。

#### モジュール固有型（各モジュール内に配置）

| 型定義 | 配置先 | 理由 |
|--------|--------|------|
| `UndoEntry`、`Patch` | `stores/useUndoStore.ts` 内 or `stores/types.ts` | Undo/Redoストア内でのみ使用 |
| `SelectionState` | `stores/useSelectionStore.ts` 内 | 選択管理ストア内でのみ使用 |
| `ExportNode`、`ExportTarget`、`ExportOptions`、`ExportResult` | `domain/export/types.ts` | エクスポートモジュール内で完結 |
| `XamlFrameworkAdapter`、`XamlAttribute` | `domain/export/xaml/types.ts` | XAML変換モジュール内で完結 |

---

## 5. UI層: Vueコンポーネント配置

### 5.1 画面レイアウトコンポーネント（横断07対応）

横断07で定義された画面エリア構成に基づき、レイアウトコンポーネントを配置する。

```
src/components/
├── layout/                          # 画面レイアウト
│   ├── AppMenuBar.vue               # メニューバー（v-app-bar）
│   ├── AppToolbar.vue               # ツールバー（v-toolbar）
│   ├── AppLeftSidebar.vue           # 左サイドバー（v-navigation-drawer）
│   ├── AppRightSidebar.vue          # 右サイドバー（v-navigation-drawer）
│   ├── AppStatusBar.vue             # ステータスバー
│   └── AppMainLayout.vue            # 全体レイアウト統合
```

### 5.2 vue-konva描画コンポーネント

テーマ3で定義された10種の描画コンポーネントを `canvas/` 配下に独立配置する。

```
src/components/
├── canvas/                          # vue-konva描画コンポーネント群
│   ├── TheCanvasStage.vue           # Konva.Stage + 3レイヤー管理
│   ├── WfElement.vue                # エントリーポイント（type振り分け）
│   ├── elements/                    # 各要素種別の描画コンポーネント
│   │   ├── WfRectangle.vue
│   │   ├── WfEllipse.vue
│   │   ├── WfLine.vue
│   │   ├── WfArrow.vue
│   │   ├── WfText.vue
│   │   ├── WfImagePlaceholder.vue
│   │   ├── WfContainer.vue
│   │   ├── WfGroup.vue
│   │   └── WfUIComponent.vue
│   └── overlays/                    # UI補助描画（overlayLayer上）
│       ├── SelectionOverlay.vue     # 選択範囲（ラバーバンド）
│       ├── SmartGuides.vue          # スマートガイド
│       └── TransformHandles.vue     # 変形ハンドル
```

一般UIコンポーネント（Vuetify + DOM）とは描画方式が根本的に異なるため（Canvas API vs DOM）、独立ディレクトリとして分離する。

### 5.3 共通UIコンポーネント（自前拡張）

横断07で定義された自前拡張が必要なコンポーネント。

```
src/components/
├── common/                          # 自前拡張コンポーネント
│   ├── DragNumberInput.vue          # 数値入力（ドラッグで値変更）
│   └── PanelResizer.vue             # パネル分割リサイズ
```

### 5.4 ダイアログ・モーダル

```
src/components/
├── dialogs/                         # ダイアログ・モーダル
│   ├── ExportDialog.vue             # エクスポートダイアログ（テーマ5）
│   ├── ProjectSettingsDialog.vue    # プロジェクト設定
│   ├── CanvasSizeDialog.vue         # キャンバスサイズ変更
│   └── CrashRecoveryDialog.vue      # クラッシュリカバリ確認
```

### 5.5 パネルコンポーネント

```
src/components/
├── panels/                          # サイドバー内パネル
│   ├── ElementPalette.vue           # 要素パレット（左サイドバー）
│   ├── LayerTreePanel.vue           # レイヤーツリー（左サイドバー）
│   ├── PropertyPanel.vue            # プロパティパネル（右サイドバー）
│   ├── LayoutPropertySection.vue    # レイアウトプロパティ（アコーディオン）
│   └── StylePropertySection.vue     # スタイルプロパティ（アコーディオン）
```

---

## 6. アプリケーション層: ストア・Composables

### 6.1 Piniaストア一覧と責務

```
src/stores/
├── useProjectStore.ts        # Project/Page/ElementNode管理
├── useSelectionStore.ts      # 選択状態・ドリルダウン管理
├── useUndoStore.ts           # Undo/Redo履歴・トランザクション
├── useUIStore.ts             # UIツール状態・パネル開閉・ズーム
├── useTemplateStore.ts       # テンプレート管理
└── useAppSettingsStore.ts    # アプリ全体設定
```

各ストアの詳細:

| ストア | 主要State | 主要Actions | 出典 |
|--------|----------|------------|------|
| `useProjectStore` | `project`、`pages`、`elements`（フラットマップ）、`activePageId` | `addElement`、`updateElement`、`removeElement`、`addPage`、`reorderChildren`、`groupify`、`ungroupify`、`convertGroupToContainer`、`convertContainerToGroup` | テーマ2/4 |
| `useSelectionStore` | `selectedIds`、`selectionContext` | `select`、`toggleSelect`、`clearSelection`、`drillDown`、`drillUp` | テーマ4 |
| `useUndoStore` | `undoStacks`、`redoStacks`、`pendingTransaction` | `beginTransaction`、`commitTransaction`、`rollbackTransaction`、`undo`、`redo`、`record` | テーマ4 |
| `useUIStore` | `activeTool`、`zoom`、`panOffset`、`panelVisibility` | `setTool`、`setZoom`、`togglePanel` | テーマ3/4/7 |
| `useTemplateStore` | `templates` | `addTemplate`、`removeTemplate`、`applyTemplate` | テーマ2 |
| `useAppSettingsStore` | `settings` | `updateSetting` | テーマ2 |

### 6.2 Composablesの配置と責務

Composablesはアプリケーション層に属し、**用途別に2グループ**に分類する。

```
src/composables/
├── canvas/                   # UIイベント系（Konva/DOMイベント密結合）
│   ├── useCanvasEvents.ts    # Stage全体のイベントリスナー管理
│   ├── useDragHandler.ts     # 要素ドラッグ（dragstart/dragmove/dragend）
│   ├── useTransformHandler.ts # リサイズ・回転（Konva.Transformer連携）
│   └── useRubberBand.ts      # 範囲選択（ラバーバンド）
├── useClipboard.ts           # コピー/ペースト操作
├── useShortcuts.ts           # ショートカットキー管理
├── useFileOperations.ts      # ファイル保存/読み込み（servicesの呼び出し）
└── useAutoSave.ts            # 自動バックアップ（クラッシュリカバリ用）
```

2グループの使い分け:

| グループ | 配置先 | 性質 | 依存先 |
|---------|--------|------|--------|
| **UIイベント系** | `composables/canvas/` | Konva/DOMイベントをハンドリングし、ストアを更新 | `stores/`、Konva API |
| **アプリ操作系** | `composables/` 直下 | ストア・サービスを組み合わせたユースケース実行 | `stores/`、`services/` |

### 6.3 ショートカット管理

テーマ4で定義されたショートカット管理は `useShortcuts.ts` composable として実装する。

```
src/composables/
├── useShortcuts.ts           # ショートカットキー管理
```

責務:
- ショートカットマッピングテーブルの保持（ハードコード、フェーズ2でカスタマイズ対応）
- `keydown` イベントリスナーの登録/解除
- ブラウザ標準ショートカットとの競合回避（`e.preventDefault()`）
- アクションのディスパッチ（対応するストアAction呼び出し）

---

## 7. ドメイン層: モデル・ロジック

ドメイン層は**フレームワーク非依存の純粋関数**で構成する。Vue、Pinia、Konva.js への依存を持たない。

### 7.1 レイアウトエンジン

テーマ3で定義されたレイアウト計算ロジック。

```
src/domain/
├── layout/
│   ├── calculateLayout.ts        # メインエントリーポイント（Free/Flex/Grid振り分け）
│   ├── calculateFreeLayout.ts    # Free配置計算
│   ├── calculateFlexLayout.ts    # Flex配置計算
│   ├── calculateGridLayout.ts    # Grid配置計算
│   └── getGlobalPosition.ts      # 祖先チェーンをたどるグローバル座標算出
```

各関数の入出力:
- 入力: `ElementNode`（フラットマップ）、コンテナサイズ
- 出力: `LayoutResult`（座標・サイズの計算結果）
- 全てテーマ2の型定義（`ElementNode`、`LayoutConfig`、`LayoutResult`）に依存。Vue/Konjaへの依存なし

### 7.2 エクスポート変換ロジック

テーマ5で定義された変換パイプライン。

```
src/domain/
├── export/
│   ├── types.ts                  # ExportNode, ExportTarget, ExportOptions, ExportResult
│   ├── buildExportTree.ts        # 共通前処理: フラットマップ→ExportNodeツリー構築
│   ├── HtmlCssExporter.ts        # HTML/CSS変換器（ExportTarget実装）
│   ├── SvgExporter.ts            # SVG変換器（ExportTarget実装）
│   └── xaml/                     # XAML変換サブモジュール
│       ├── types.ts              # XamlFrameworkAdapter, XamlAttribute
│       ├── XamlExporter.ts       # XAML共通変換ロジック
│       ├── WpfAdapter.ts         # WPFアダプタ
│       ├── WinUI3Adapter.ts      # WinUI 3アダプタ
│       ├── MauiAdapter.ts        # .NET MAUIアダプタ
│       └── AvaloniaAdapter.ts    # Avalonia UIアダプタ
```

PNGエクスポートはドメイン層を経由せず、`Konva.Stage.toBlob()` を直接使用する（UI層 or composableで処理）。

### 7.3 バリデーション・ユーティリティ

```
src/domain/
├── validation/
│   ├── nestingValidation.ts      # ネスト深さ制限チェック（推奨8/上限16階層）
│   └── elementValidation.ts      # 要素プロパティの妥当性検証
```

---

## 8. インフラ層: 外部リソースアクセス

インフラ層はブラウザAPIやストレージへのアクセスをカプセル化する。ドメインロジックを含まない。

### 8.1 ファイル操作（File System Access API）

```
src/services/
├── file-system/
│   ├── fileSystemService.ts      # showSaveFilePicker/showOpenFilePicker ラッパー
│   ├── fileHandleStore.ts        # FileSystemFileHandleのIndexedDB永続化
│   └── fileSerializer.ts         # Project⇔JSONシリアライズ/デシリアライズ
```

### 8.2 IndexedDB

```
src/services/
├── indexeddb/
│   ├── dbService.ts              # intuitive-d4ui-db の初期化・マイグレーション
│   ├── projectRepository.ts      # projectsストアのCRUD
│   ├── settingsRepository.ts     # app-settingsストアのCRUD
│   └── templateRepository.ts     # templatesストアのCRUD
```

### 8.3 クラッシュリカバリ

```
src/services/
├── crash-recovery/
│   └── crashRecoveryService.ts   # デバウンス30秒バックアップ、isDirty管理、復元フロー
```

### 8.4 Service Worker（PWA）

```
src/services/
├── service-worker/
│   └── sw.ts                     # Service Worker登録、オフラインキャッシュ
```

---

## 9. テスト関連ファイルの配置

### 9.1 Vitest（ユニットテスト）

**コロケーション方式**を採用: テスト対象ファイルと同じディレクトリの `__tests__/` サブディレクトリにテストファイルを配置する。

```
src/domain/layout/
├── calculateLayout.ts
├── calculateFlexLayout.ts
├── getGlobalPosition.ts
└── __tests__/
    ├── calculateLayout.test.ts
    ├── calculateFlexLayout.test.ts
    └── getGlobalPosition.test.ts
```

コロケーション方式の利点:
- テスト対象とテストの物理的な近接性により、保守性が向上
- ドメイン層のテストが特に重要（純粋関数であるため、テストしやすい）

### 9.2 Playwright（E2Eテスト）

プロジェクトルート直下に `e2e/` ディレクトリを配置する。

```
e2e/
├── fixtures/                # テストデータ（.wfpファイル等）
├── canvas-basic.spec.ts     # キャンバス基本操作
├── export.spec.ts           # エクスポート機能
└── file-operations.spec.ts  # ファイル保存/読み込み
```

---

## 10. プラグイン・設定ファイル

### 10.1 Vuetifyプラグイン

```
src/plugins/
├── vuetify.ts               # Vuetifyインスタンス生成、テーマ設定、SASS変数設定
```

横断07で定義されたVuetifyコンポーネントマッピング（v-app-bar、v-navigation-drawer等）は各Vueコンポーネント内で直接使用する。プラグイン設定ファイルではグローバルな設定（テーマカスタマイズ、デフォルトオプション等）を管理する。

### 10.2 PWA設定

```
src/plugins/
├── pwa.ts                   # PWA登録、Service Worker設定
```

### 10.3 Vite設定

```
（プロジェクトルート）
├── vite.config.ts           # Viteビルド設定、プラグイン設定、パスエイリアス
├── tsconfig.json             # TypeScript設定
├── tsconfig.app.json         # アプリ用TypeScript設定（paths設定含む）
├── tsconfig.node.json        # Node.js用TypeScript設定
└── playwright.config.ts      # Playwright E2Eテスト設定
```

パスエイリアス: `vite.config.ts` の `resolve.alias` と `tsconfig.app.json` の `paths` で `@/` を `src/` にマッピングする。セクション12.3のインポート例で使用する `@/stores/...` 等のパスはこの設定に基づく。

---

## 11. ディレクトリツリー全体図

```
IntuitiveD4UI/                           # プロジェクトルート
├── src/
│   ├── components/                      # UI層: Vueコンポーネント
│   │   ├── layout/                      # 画面レイアウト
│   │   │   ├── AppMenuBar.vue
│   │   │   ├── AppToolbar.vue
│   │   │   ├── AppLeftSidebar.vue
│   │   │   ├── AppRightSidebar.vue
│   │   │   ├── AppStatusBar.vue
│   │   │   └── AppMainLayout.vue
│   │   ├── canvas/                      # vue-konva描画
│   │   │   ├── TheCanvasStage.vue
│   │   │   ├── WfElement.vue
│   │   │   ├── elements/
│   │   │   │   ├── WfRectangle.vue
│   │   │   │   ├── WfEllipse.vue
│   │   │   │   ├── WfLine.vue
│   │   │   │   ├── WfArrow.vue
│   │   │   │   ├── WfText.vue
│   │   │   │   ├── WfImagePlaceholder.vue
│   │   │   │   ├── WfContainer.vue
│   │   │   │   ├── WfGroup.vue
│   │   │   │   └── WfUIComponent.vue
│   │   │   └── overlays/
│   │   │       ├── SelectionOverlay.vue
│   │   │       ├── SmartGuides.vue
│   │   │       └── TransformHandles.vue
│   │   ├── panels/                      # サイドバーパネル
│   │   │   ├── ElementPalette.vue
│   │   │   ├── LayerTreePanel.vue
│   │   │   ├── PropertyPanel.vue
│   │   │   ├── LayoutPropertySection.vue
│   │   │   └── StylePropertySection.vue
│   │   ├── common/                      # 自前拡張コンポーネント
│   │   │   ├── DragNumberInput.vue
│   │   │   └── PanelResizer.vue
│   │   └── dialogs/                     # ダイアログ
│   │       ├── ExportDialog.vue
│   │       ├── ProjectSettingsDialog.vue
│   │       ├── CanvasSizeDialog.vue
│   │       └── CrashRecoveryDialog.vue
│   ├── stores/                          # アプリケーション層: Piniaストア
│   │   ├── useProjectStore.ts
│   │   ├── useSelectionStore.ts
│   │   ├── useUndoStore.ts
│   │   ├── useUIStore.ts
│   │   ├── useTemplateStore.ts
│   │   └── useAppSettingsStore.ts
│   ├── composables/                     # アプリケーション層: Composables
│   │   ├── canvas/
│   │   │   ├── useCanvasEvents.ts
│   │   │   ├── useDragHandler.ts
│   │   │   ├── useTransformHandler.ts
│   │   │   └── useRubberBand.ts
│   │   ├── useClipboard.ts
│   │   ├── useShortcuts.ts
│   │   ├── useFileOperations.ts
│   │   └── useAutoSave.ts
│   ├── domain/                          # ドメイン層: ビジネスロジック
│   │   ├── layout/
│   │   │   ├── calculateLayout.ts
│   │   │   ├── calculateFreeLayout.ts
│   │   │   ├── calculateFlexLayout.ts
│   │   │   ├── calculateGridLayout.ts
│   │   │   ├── getGlobalPosition.ts
│   │   │   └── __tests__/
│   │   │       ├── calculateLayout.test.ts
│   │   │       ├── calculateFlexLayout.test.ts
│   │   │       └── getGlobalPosition.test.ts
│   │   ├── export/
│   │   │   ├── types.ts
│   │   │   ├── buildExportTree.ts
│   │   │   ├── HtmlCssExporter.ts
│   │   │   ├── SvgExporter.ts
│   │   │   ├── __tests__/
│   │   │   │   ├── buildExportTree.test.ts
│   │   │   │   ├── HtmlCssExporter.test.ts
│   │   │   │   └── SvgExporter.test.ts
│   │   │   └── xaml/
│   │   │       ├── types.ts
│   │   │       ├── XamlExporter.ts
│   │   │       ├── WpfAdapter.ts
│   │   │       ├── WinUI3Adapter.ts
│   │   │       ├── MauiAdapter.ts
│   │   │       ├── AvaloniaAdapter.ts
│   │   │       └── __tests__/
│   │   │           ├── XamlExporter.test.ts
│   │   │           └── WpfAdapter.test.ts
│   │   └── validation/
│   │       ├── nestingValidation.ts
│   │       ├── elementValidation.ts
│   │       └── __tests__/
│   │           └── nestingValidation.test.ts
│   ├── services/                        # インフラ層: 外部リソースアクセス
│   │   ├── file-system/
│   │   │   ├── fileSystemService.ts
│   │   │   ├── fileHandleStore.ts
│   │   │   └── fileSerializer.ts
│   │   ├── indexeddb/
│   │   │   ├── dbService.ts
│   │   │   ├── projectRepository.ts
│   │   │   ├── settingsRepository.ts
│   │   │   └── templateRepository.ts
│   │   ├── crash-recovery/
│   │   │   └── crashRecoveryService.ts
│   │   └── service-worker/
│   │       └── sw.ts
│   ├── types/                           # 共通型定義
│   │   ├── elementTypes.ts
│   │   ├── projectTypes.ts
│   │   ├── layoutTypes.ts
│   │   └── templateTypes.ts
│   ├── plugins/                         # プラグイン設定
│   │   ├── vuetify.ts
│   │   └── pwa.ts
│   ├── assets/                          # 静的リソース
│   │   ├── icons/
│   │   └── styles/
│   ├── App.vue
│   └── main.ts
├── docs/                                # ドキュメントサイト（09-documentation-plan.md で定義）
├── e2e/                                 # E2Eテスト（Playwright）
│   ├── fixtures/
│   ├── canvas-basic.spec.ts
│   ├── export.spec.ts
│   └── file-operations.spec.ts
├── public/                              # 静的公開ファイル
│   ├── favicon.ico
│   └── manifest.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── playwright.config.ts
├── package.json
└── index.html
```

---

## 12. モジュール間依存ルール

### 12.1 レイヤー間の依存方向

```
components/（UI層）
    ↓ import
stores/ ・ composables/（アプリケーション層）
    ↓ import          ↓ import
domain/（ドメイン層）  services/（インフラ層）
    ↓ import          ↓ import
types/（共通型定義）
```

依存方向の原則:

1. **上位レイヤーから下位レイヤーへの依存のみ許可**
2. **同レイヤー内の依存は許可**（例: `useProjectStore` → `useUndoStore`）
3. **下位レイヤーから上位レイヤーへの依存は禁止**
4. `domain/` と `services/` は互いに直接依存しない

### 12.2 禁止される依存パターン

| 禁止パターン | 理由 | 代替方法 |
|------------|------|---------|
| `domain/` → `stores/` | ドメインロジックがVue/Piniaに依存してしまう | ストアがドメイン関数を呼び出す（依存方向を逆転） |
| `domain/` → `services/` | ドメインロジックがブラウザAPIに依存してしまう | composableがドメインとサービスの両方を呼び出して仲介 |
| `services/` → `stores/` | インフラ層がアプリケーション層に依存してしまう | ストアがサービスを呼び出す（依存方向を逆転） |
| `services/` → `domain/` | インフラ層がドメインロジックに依存してしまう | composableがドメインとサービスの両方を呼び出して仲介 |
| `components/` → `services/` | UI層がインフラ層を直接呼び出す | composable経由でサービスを利用する |
| `components/` → `domain/`（ロジック呼び出し） | UI層がドメインロジックを直接呼び出す | composable/store経由で利用する（型の参照は許可） |
| `types/` → 他の全モジュール | 共通型が特定モジュールに依存すると循環参照のリスク | 共通型は最下層として独立を保つ |

### 12.3 許可される依存パターン（例示）

```typescript
// OK: composable がドメイン関数とストアを組み合わせる
// composables/canvas/useDragHandler.ts
import { useProjectStore } from '@/stores/useProjectStore'
import { useUndoStore } from '@/stores/useUndoStore'
import { calculateLayout } from '@/domain/layout/calculateLayout'

// OK: ストアがサービスを呼び出す
// stores/useProjectStore.ts
import { saveProject } from '@/services/file-system/fileSystemService'

// OK: ドメインが共通型のみに依存する
// domain/layout/calculateLayout.ts
import type { ElementNode, LayoutConfig, LayoutResult } from '@/types/layoutTypes'

// NG: ドメインがストアに依存する
// domain/layout/calculateLayout.ts
// import { useProjectStore } from '@/stores/useProjectStore'  // 禁止!
```

---

## 改訂履歴

| バージョン | 日付 | 内容 |
|-----------|------|------|
| 0.1.0 | 2026-02-27 | 初版作成 |
