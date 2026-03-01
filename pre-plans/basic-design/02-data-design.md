# 基本設計書: データ設計・永続化

## 文書情報

| 項目 | 内容 |
|------|------|
| 文書名 | 基本設計書: データ設計・永続化 |
| バージョン | 0.3.0 |
| 作成日 | 2026-02-23 |
| ステータス | ドラフト |
| 対応する要件定義書 | Intuitive D4UI 要件定義書 v0.3.0 |
| 対応する未決定事項 | No.4（独自ファイル形式の仕様）、No.7（自動保存機能の要否）、No.13（データ保存の具体的な実現手段） |
| 前提とする設計書 | 基本設計書: アプリケーション基盤 v0.2.0 |

---

## 1. 概要

本設計書では、Intuitive D4UI におけるデータの構造、保存、永続化に関する設計を定める。

### 1.1 本設計書の範囲

| 領域 | 内容 |
|------|------|
| 内部データモデル | プロジェクト・ページ・要素のオブジェクト構造、親子関係の管理方式 |
| 独自ファイル形式 | プロジェクトデータの保存フォーマット仕様 |
| ファイル操作 | File System Access API によるファイルの保存・読み込み |
| 内部データ永続化 | IndexedDB によるブラウザ内部へのデータ永続化 |
| クラッシュリカバリ | 自動バックアップと復元の仕組み |
| Service Worker | PWA のオフライン動作を実現するキャッシュ方式 |

### 1.2 テーマ1（アプリケーション基盤）からの前提

本設計書は、テーマ1で決定された以下の事項を前提とする。

- **アプリ形態**: SPA + PWA
- **対応ブラウザ**: Chromium系のみ（Chrome, Edge）
- **状態管理**: Pinia
- **ビルドツール**: Vite
- **オフライン動作**: Service Worker + Cache API で実現
- **ファイル操作**: File System Access API（Chromium系限定）を使用
- **内部永続化**: IndexedDB を使用

---

## 2. 内部データモデル

### 2.1 データ構造の全体像

プロジェクトデータは以下の3階層で構成される。

```
Project（プロジェクト）
├── メタデータ（名前、バージョン、作成日時、更新日時）
├── 設定情報（グリッド設定、スナップ設定）
└── pages: Page[]（ページの配列）
    └── Page（ページ）
        ├── メタデータ（名前、サイズ）
        ├── rootElementIds: string[]（ルート要素のID配列）
        └── elements: Map<id, ElementNode>（全要素のフラットマップ）
```

※ テンプレートはプロジェクトとは独立して IndexedDB に保存する（セクション2.5、セクション5.3.3 参照）。

### 2.2 プロジェクト構造（Project）

```typescript
interface Project {
  /** ファイル形式のバージョン（マイグレーション用） */
  formatVersion: string;

  /** プロジェクトの一意識別子 */
  id: string;

  /** プロジェクト名 */
  name: string;

  /** 作成日時（ISO 8601） */
  createdAt: string;

  /** 最終更新日時（ISO 8601） */
  updatedAt: string;

  /** プロジェクト設定 */
  settings: ProjectSettings;

  /** ページの配列（表示順） */
  pages: Page[];
}
```

```typescript
interface ProjectSettings {
  /** グリッド設定 */
  grid: {
    /** グリッド表示のON/OFF */
    visible: boolean;
    /** グリッド間隔（px） */
    size: number;
    /** スナップのON/OFF */
    snapEnabled: boolean;
  };
}
```

### 2.3 ページ構造（Page）

```typescript
interface Page {
  /** ページの一意識別子 */
  id: string;

  /** ページ名 */
  name: string;

  /** キャンバス幅（px） */
  width: number;

  /** キャンバス高さ（px） */
  height: number;

  /** ページの表示順序（0始まり） */
  order: number;

  /** ルート要素のID配列（配列順 = Zオーダー: 先頭が最背面） */
  rootElementIds: string[];

  /** 全要素のフラットマップ（キー: 要素ID） */
  elements: Record<string, ElementNode>;
}
```

### 2.4 要素ノード（ElementNode）

全ての要素（基本図形、UIコンポーネント、コンテナ、グループ）を統一的な `ElementNode` 型で表現する。要素の種別は `type` フィールドで区別する。

#### 2.4.1 ElementNode の定義

```typescript
interface ElementNode {
  /** 要素の一意識別子 */
  id: string;

  /** 要素種別 */
  type: ElementType;

  /** 表示名（ツリービュー、レイヤーパネル等で使用） */
  name: string;

  /** 親要素のID（ルート要素の場合は null） */
  parentId: string | null;

  /** 子要素のID配列（配列順 = Zオーダー: 先頭が最背面） */
  childrenIds: string[];

  // --- 共通プロパティ ---
  /** X座標（親要素からの相対位置、ルート要素の場合はキャンバス上の絶対位置） */
  x: number;

  /** Y座標（親要素からの相対位置、ルート要素の場合はキャンバス上の絶対位置） */
  y: number;

  /** 幅（px） */
  width: number;

  /** 高さ（px） */
  height: number;

  /** 回転角度（度） */
  rotation: number;

  /** 不透明度（0.0〜1.0） */
  opacity: number;

  /** 表示/非表示 */
  visible: boolean;

  /** ロック（編集不可状態） */
  locked: boolean;

  // --- type 固有プロパティ ---
  /** 要素種別ごとの固有プロパティ */
  props: TypeSpecificProps;

  // --- コンテナ関連（type が container の場合のみ有効） ---
  /** レイアウト設定 */
  layout?: LayoutConfig;

  /** パディング（内側余白） */
  padding?: Spacing;

  // --- コンテナ内の子要素に適用（parentId が container を指す場合のみ有効） ---
  /** マージン（外側余白） */
  margin?: Spacing;

  // --- オーバーフロー設定（type が container の場合のみ有効） ---
  /** コンテナの子要素オーバーフロー設定（デフォルト: 'visible'） */
  overflow?: 'visible' | 'clip';

  // --- ページ間リンク（任意） ---
  /** リンク先ページID */
  linkToPageId?: string;
}
```

> **実装上の注記（型安全性）**: 上記の `ElementNode` は基本設計レベルでの概念的な定義であり、全フィールドを単一のインターフェースにまとめている。実装時には **Discriminated Union**（判別共用体）パターン等の手法を用い、`type` と `props` の対応関係（例: `type: 'rectangle'` のとき `props` は `RectangleProps`）を TypeScript の型レベルで保証すること。同様に、`layout`・`padding`・`overflow` がコンテナのみ、`margin` がコンテナ内の子要素のみに有効である制約も、型設計で適切に表現すること。

> **線・矢印の座標表現について**: 線（`line`）と矢印（`arrow`）は始点・終点で定義される要素だが、データモデル上は他の要素と同様に `x, y, width, height` でバウンディングボックスを表現する。始点・終点の実際の座標は、固有プロパティ（`LineProps` / `ArrowProps`）の `points` フィールドに、バウンディングボックス左上を原点とした相対座標で格納する。これにより、移動・選択・ヒットテスト等の共通操作をバウンディングボックスで統一的に扱える。

#### 2.4.2 要素種別（ElementType）

```typescript
type ElementType =
  // 基本図形
  | 'rectangle'     // 矩形（角丸対応）
  | 'ellipse'       // 円/楕円
  | 'line'          // 線
  | 'arrow'         // 矢印
  | 'text'          // テキスト
  | 'image-placeholder'  // 画像プレースホルダー
  // 構造要素
  | 'container'     // コンテナ（子要素を内包、レイアウト機能あり）
  | 'group'         // グループ（表示上の便宜的まとまり）
  // UIコンポーネント
  | 'ui-button'
  | 'ui-input'
  | 'ui-dropdown'
  | 'ui-checkbox'
  | 'ui-radio'
  | 'ui-navbar'
  | 'ui-sidebar'
  | 'ui-list'
  | 'ui-table'
  | 'ui-card'
  | 'ui-modal';
```

#### 2.4.3 type 固有プロパティ（TypeSpecificProps）

type 固有プロパティは、要素種別ごとに異なるプロパティを定義する。以下に主要な型の例を示す。

```typescript
/** type 固有プロパティの共用体型 */
type TypeSpecificProps =
  | RectangleProps
  | EllipseProps
  | LineProps
  | ArrowProps
  | TextProps
  | ImagePlaceholderProps
  | ContainerProps
  | GroupProps
  | UIButtonProps
  | UIInputProps
  /* ...他のUIコンポーネント */;

/** 矩形の固有プロパティ */
interface RectangleProps {
  /** 塗りつぶし色 */
  fill: string;
  /** 枠線色 */
  stroke: string;
  /** 枠線の太さ */
  strokeWidth: number;
  /** 角丸半径 */
  cornerRadius: number;
}

/** テキストの固有プロパティ */
interface TextProps {
  /** テキスト内容 */
  content: string;
  /** フォントサイズ（px） */
  fontSize: number;
  /** フォントファミリー */
  fontFamily: string;
  /** 太字 */
  bold: boolean;
  /** 斜体 */
  italic: boolean;
  /** テキスト色 */
  color: string;
  /** 水平方向の配置 */
  textAlign: 'left' | 'center' | 'right';
}

/** 線の固有プロパティ */
interface LineProps {
  /** 始点・終点の座標（バウンディングボックス左上を原点とした相対座標 [x1, y1, x2, y2]） */
  points: [number, number, number, number];
  /** 線色 */
  stroke: string;
  /** 線の太さ */
  strokeWidth: number;
}

/** 矢印の固有プロパティ */
interface ArrowProps {
  /** 始点・終点の座標（バウンディングボックス左上を原点とした相対座標 [x1, y1, x2, y2]） */
  points: [number, number, number, number];
  /** 線色 */
  stroke: string;
  /** 線の太さ */
  strokeWidth: number;
  /** 矢印の始点側表示 */
  startArrow: boolean;
  /** 矢印の終点側表示 */
  endArrow: boolean;
}

/** コンテナの固有プロパティ（描画上の外観） */
interface ContainerProps {
  /** 塗りつぶし色 */
  fill: string;
  /** 枠線色 */
  stroke: string;
  /** 枠線の太さ */
  strokeWidth: number;
}

/** グループの固有プロパティ */
interface GroupProps {
  /** グループは描画上の固有プロパティを持たない（子要素の描画のみ） */
}
```

#### 2.4.4 レイアウト設定（LayoutConfig）

コンテナ要素が持つ、子要素の自動配置に関する設定。コンテナを新規作成した場合のデフォルト値は **`FreeLayout`（自由配置）** とする。ユーザーがプロパティパネル等から明示的にレイアウトモードを切り替える操作を想定する。

```typescript
type LayoutConfig =
  | FreeLayout
  | FlexLayout
  | GridLayout;

/** 自由配置（絶対位置） */
interface FreeLayout {
  type: 'free';
}

/** Flexbox的レイアウト */
interface FlexLayout {
  type: 'flex';
  /** 配置方向 */
  direction: 'row' | 'column';
  /** 要素間のギャップ（px） */
  gap: number;
  /** 折り返しの有無 */
  wrap: boolean;
  /** 主軸の配置 */
  justifyContent: 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly';
  /** 交差軸の配置 */
  alignItems: 'start' | 'center' | 'end' | 'stretch';
}

/** Grid的レイアウト */
interface GridLayout {
  type: 'grid';
  /** 列数 */
  columns: number;
  /** 行数（0 = 自動） */
  rows: number;
  /** 列間ギャップ（px） */
  columnGap: number;
  /** 行間ギャップ（px） */
  rowGap: number;
}
```

#### 2.4.5 スペーシング（Spacing）

パディング・マージンに使用する4方向の余白定義。

```typescript
interface Spacing {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
```

### 2.5 テンプレート構造（Template）

テンプレートは**プロジェクトファイル（.wfp）には含めず、IndexedDB に保存する**（セクション5.3.3 参照）。これにより、テンプレートはプロジェクト横断で再利用可能となる。

```typescript
interface Template {
  /** テンプレートの一意識別子 */
  id: string;

  /** テンプレート名 */
  name: string;

  /** テンプレート種別 */
  scope: 'page' | 'component';

  /** 作成日時（ISO 8601） */
  createdAt: string;

  /** テンプレートデータ（ページ or 要素ツリーのスナップショット） */
  data: Page | ElementNode[];
}
```

### 2.6 ツリー管理方式

要素の親子関係は**フラットマップ + 参照ID** 方式で管理する。

#### 2.6.1 方式の概要

- 全要素をページごとの `elements: Record<string, ElementNode>` にフラットに格納する
- 各要素は `parentId`（親のID）と `childrenIds`（子のID配列）で親子関係を表現する
- ルート要素（親を持たない要素）は `parentId: null` とし、ページの `rootElementIds` に列挙する
- `childrenIds` の配列順が Zオーダー（描画順）を表す（先頭が最背面、末尾が最前面）

#### 2.6.2 採用理由

| 観点 | フラットマップ + 参照ID | ネスト構造（children に実体） |
|------|----------------------|---------------------------|
| Pinia との相性 | 良好。フラットなオブジェクトのリアクティブ更新が効率的 | 深いネストの更新が親のウォッチャーに波及しパフォーマンスが低下する可能性 |
| 要素の検索・更新 | O(1)（IDで直接アクセス） | O(n)（ツリーを走査する必要がある場合あり） |
| 親子関係の変更 | `parentId` / `childrenIds` の書き換えのみ | ノードの削除と再挿入が必要 |
| ファイル保存時 | フラットマップをそのまま保存 | そのままツリー構造で保存 |

#### 2.6.3 Zオーダーの管理

- 同一親内の Zオーダーは `childrenIds` の配列順で管理する
- ルート要素の Zオーダーは `rootElementIds` の配列順で管理する
- 「最前面へ移動」等の操作は、配列内の要素位置を変更することで実現する

### 2.7 ID 生成方式

全てのエンティティ（Project、Page、ElementNode、Template）の ID 生成には **nanoid** を採用する。

| 判断軸 | nanoid | UUID v4 | 連番 |
|--------|--------|---------|------|
| 文字数 | 21文字（デフォルト） | 36文字 | 可変 |
| 一意性 | 暗号学的にセキュアな乱数ベース | 暗号学的にセキュアな乱数ベース | スコープ内でのみ一意 |
| パフォーマンス | 高速 | 標準 | 最速 |
| URL安全性 | URL-safe 文字セット（A-Za-z0-9_-） | ハイフン含む | 問題なし |
| 依存関係 | 軽量（ゼロ依存） | ブラウザ標準（`crypto.randomUUID()`） | 不要 |

以下の理由から nanoid を選定した。

1. **コンパクトさ**: UUID v4 の 36 文字に対し 21 文字で十分な一意性を確保できる。JSON ファイルに多数の要素 ID が格納されるため、ファイルサイズへの影響を抑えられる
2. **パフォーマンス**: コピー＆ペーストやテンプレート展開で大量の ID を短時間に生成する場面で、高速な生成が求められる
3. **URL-safe**: ID をそのまま URL パラメータ等に使用可能（将来の拡張性）

ID のプレフィックス（`proj-`, `page-`, `elem-` 等）の付与については、実装時にデバッグの容易さを考慮して決定する。

---

## 3. 独自ファイル形式（.wfp）

### 3.1 決定事項

プロジェクトデータの保存形式として**プレーンJSON**を採用する。ファイル拡張子は `.wfp`（Wireframe Project）とする。

### 3.2 決定理由

| 判断軸 | プレーンJSON | JSON + gzip | ZIP アーカイブ |
|--------|-------------|-------------|---------------|
| 実装の容易さ | 最もシンプル | CompressionStream API で対応可 | JSZip 等のライブラリが必要 |
| デバッグ・可読性 | テキストエディタで直接確認可能 | 確認不可 | 展開すれば確認可能 |
| ファイルサイズ | やや大きい | 1/5〜1/10 に圧縮可能 | 圧縮可能 |
| バイナリアセット対応 | Base64 埋め込み（非効率） | 同左 | ネイティブに格納可能 |
| 差分管理（git等） | 相性が良い | 不可 | 部分的に可能 |

以下の理由からプレーンJSON を選定した。

1. **アセット不要**: 本ツールの画像は「プレースホルダー」であり、実画像データをプロジェクトに埋め込む要件がない（要件定義書セクション3.3.1）。テキストデータ（座標、プロパティ等）のみで構成されるため、バイナリ格納は不要
2. **実装のシンプルさ**: JSON.stringify / JSON.parse のみで完結し、追加ライブラリが不要
3. **デバッグの容易さ**: 個人開発において、保存データをテキストエディタで直接確認できることは開発効率に寄与する
4. **将来の拡張パス**: ファイル形式にバージョン番号を含めることで、将来的にZIPアーカイブ形式への移行が必要になった場合にも、バージョン判定によるマイグレーションが可能

### 3.3 ファイル構造

.wfp ファイルの JSON 構造は、セクション2で定義した `Project` インターフェースをそのまま JSON シリアライズしたものとする。

```json
{
  "formatVersion": "1.0.0",
  "id": "proj-xxxx-xxxx",
  "name": "プロジェクト名",
  "createdAt": "2026-02-23T10:00:00.000Z",
  "updatedAt": "2026-02-23T12:30:00.000Z",
  "settings": {
    "grid": {
      "visible": true,
      "size": 8,
      "snapEnabled": true
    }
  },
  "pages": [
    {
      "id": "page-xxxx",
      "name": "ホーム画面",
      "width": 1920,
      "height": 1080,
      "order": 0,
      "rootElementIds": ["elem-001", "elem-002"],
      "elements": {
        "elem-001": {
          "id": "elem-001",
          "type": "container",
          "name": "ヘッダー",
          "parentId": null,
          "childrenIds": ["elem-003"],
          "x": 0,
          "y": 0,
          "width": 1920,
          "height": 64,
          "rotation": 0,
          "opacity": 1.0,
          "visible": true,
          "locked": false,
          "props": { "fill": "#ffffff", "stroke": "#cccccc", "strokeWidth": 1 },
          "layout": { "type": "flex", "direction": "row", "gap": 16, "wrap": false, "justifyContent": "start", "alignItems": "center" },
          "padding": { "top": 8, "right": 16, "bottom": 8, "left": 16 }
        }
      }
    }
  ]
}
```

### 3.4 バージョニング方針

- `formatVersion` フィールドで、ファイル形式のバージョンを管理する
- セマンティックバージョニング（major.minor.patch）を採用する
- **major**: 後方互換性のない構造変更（新バージョンで開いた場合、マイグレーションが必要）
- **minor**: 後方互換性のあるフィールド追加（古いバージョンでも読み込み可能、新フィールドは無視される）
- **patch**: バグ修正等
- 読み込み時に `formatVersion` を確認し、必要に応じてマイグレーション処理を実行する

---

## 4. ファイル操作（File System Access API）

### 4.1 概要

File System Access API を使用して、ローカルファイルシステムへの .wfp ファイルの保存・読み込みを実現する。この API は Chromium 系ブラウザで利用可能であり、ネイティブのファイルダイアログ（開く/保存）を通じた自然なファイル操作を提供する。

### 4.2 保存操作

#### 4.2.1 名前を付けて保存

1. `showSaveFilePicker()` でファイル保存ダイアログを表示する
2. ユーザーがファイル名と保存先を指定する
3. 取得した `FileSystemFileHandle` を使用してファイルに書き込む
4. `FileSystemFileHandle` を IndexedDB に保存する（次回の上書き保存用）

```typescript
// 概念的な処理フロー
const options = {
  suggestedName: `${project.name}.wfp`,
  types: [{
    description: 'ワイヤーフレームプロジェクト',
    accept: { 'application/json': ['.wfp'] },
  }],
};
const fileHandle = await showSaveFilePicker(options);
const writable = await fileHandle.createWritable();
await writable.write(JSON.stringify(project, null, 2));
await writable.close();
```

#### 4.2.2 上書き保存

1. 既に保持している `FileSystemFileHandle` を使用する
2. `FileSystemFileHandle` が存在しない場合（新規プロジェクト等）は「名前を付けて保存」にフォールバックする
3. 書き込み権限の確認（`queryPermission` / `requestPermission`）を行い、必要に応じてユーザーに許可を求める

#### 4.2.3 保存時のデータ変換

- Pinia ストア上の内部データ（リアクティブオブジェクト）から、プレーンなオブジェクトに変換する
- `Project` インターフェースに準拠した JSON 文字列を生成する
- `updatedAt` フィールドを現在日時で更新する

### 4.3 読み込み操作

1. `showOpenFilePicker()` でファイル選択ダイアログを表示する
2. 選択された .wfp ファイルの内容を読み込む
3. JSON をパースし、`formatVersion` を確認する
4. 必要に応じてマイグレーション処理を実行する
5. パース結果を Pinia ストアに展開する
6. `FileSystemFileHandle` を IndexedDB に保存する（上書き保存用）

```typescript
// 概念的な処理フロー
const [fileHandle] = await showOpenFilePicker({
  types: [{
    description: 'ワイヤーフレームプロジェクト',
    accept: { 'application/json': ['.wfp'] },
  }],
});
const file = await fileHandle.getFile();
const json = await file.text();
const project = JSON.parse(json) as Project;
```

### 4.4 FileSystemFileHandle の永続化

`FileSystemFileHandle` は IndexedDB にシリアライズ可能（Chromium系限定の機能）であるため、以下の目的で IndexedDB に保存する。

- **上書き保存**: 「名前を付けて保存」後、同じファイルへの上書き保存を可能にする
- **最近のファイル**: アプリ次回起動時に「最近使ったファイル」として表示・再オープンを可能にする

#### 制約事項

- `FileSystemFileHandle` を使用したファイルアクセスは、アプリ起動後にユーザーの許可（permission prompt）が必要となる
- ユーザーがファイルを移動・削除した場合、`FileSystemFileHandle` は無効になる。この場合はエラーを表示し、再度「開く」操作を案内する

---

## 5. 内部データ永続化（IndexedDB）

### 5.1 概要

IndexedDB を使用して、アプリケーション内部のデータをブラウザのローカルストレージに永続化する。主な用途はクラッシュリカバリ用の自動バックアップ、アプリケーション設定の保存、テンプレートの保存である。

### 5.2 データベース設計

| 項目 | 値 |
|------|-----|
| データベース名 | `intuitive-d4ui-db` |
| バージョン管理 | IndexedDB のバージョニング機構を使用 |

### 5.3 ストア定義

#### 5.3.1 projects ストア

クラッシュリカバリ用の作業データを保存するストア。

| フィールド | 型 | 説明 |
|-----------|-----|------|
| projectId | string (keyPath) | プロジェクトID |
| data | object | プロジェクトデータ（`Project` オブジェクト全体） |
| fileHandle | FileSystemFileHandle \| null | ファイルハンドル（上書き保存用） |
| lastModified | string | 最終更新日時（ISO 8601） |
| isDirty | boolean | 未保存の変更があるか |

#### 5.3.2 app-settings ストア

アプリケーション全体の設定を保存するストア。

| フィールド | 型 | 説明 |
|-----------|-----|------|
| key | string (keyPath) | 設定キー |
| value | any | 設定値 |

想定される設定項目:
- `lastOpenedProjectId`: 最後に開いたプロジェクトのID
- `recentFiles`: 最近使ったファイルの一覧（FileSystemFileHandle の配列）
- `uiPreferences`: UIの表示設定（パネルの開閉状態等）

#### 5.3.3 templates ストア

ユーザーが作成したテンプレートを保存するストア。

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | string (keyPath) | テンプレートID |
| name | string | テンプレート名 |
| scope | string | テンプレート種別（'page' \| 'component'） |
| createdAt | string | 作成日時（ISO 8601） |
| data | object | テンプレートデータ |

※ テンプレートはプロジェクトファイル（.wfp）とは独立して IndexedDB に保存する。これにより、テンプレートはプロジェクト横断で再利用可能となる。

---

## 6. クラッシュリカバリ

### 6.1 決定事項

**ファイル保存は手動操作（Ctrl+S 等）とし、クラッシュリカバリのための自動バックアップのみを実装する**。フル自動保存（ファイルへの自動書き出し）は行わない。

### 6.2 決定理由

| 判断軸 | 手動保存のみ（リカバリなし） | 手動保存 + クラッシュリカバリ | フル自動保存 |
|--------|--------------------------|---------------------------|------------|
| データ損失リスク | クラッシュ時に全損 | バックアップ時点まで復元可能 | 最小 |
| 保存の予測可能性 | 高い（ユーザー操作のみ） | 高い（ファイルはユーザー操作のみ） | 低い（意図しない変更も保存される） |
| Undo/Redo との整合性 | シンプル | シンプル | 複雑（自動保存とUndoの境界問題） |
| 実装コスト | 最小 | 低（IndexedDB への定期書き込みのみ） | 高（ファイル書き込みの排他制御等） |

以下の理由から「手動保存 + クラッシュリカバリ」を選定した。

1. **データ損失の防止**: 手動保存のみでは、ブラウザクラッシュやタブの誤った閉じ操作で作業内容が失われる。個人ツールとしてこのリスクは許容できない
2. **UXの自然さ**: ファイルへの「保存」はユーザーの明示的な操作として残すことで、デスクトップアプリ的な操作感を維持する
3. **Undo/Redo との整合性**: フル自動保存は「保存前の状態に戻す」が困難になる等、Undo/Redo との整合性が複雑化する

### 6.3 自動バックアップの仕組み

編集中のプロジェクトデータを IndexedDB の `projects` ストアに定期的にバックアップする。

#### 6.3.1 バックアップタイミング

| タイミング | 条件 | 説明 |
|-----------|------|------|
| デバウンス | 最後の操作から30秒後 | 頻繁な操作中は書き込みを抑制し、操作が落ち着いた時点でバックアップ |
| ページ切り替え時 | 別のページに移動した時 | ページ切り替えは操作の区切りとして適切 |
| beforeunload イベント | タブを閉じる / ブラウザを閉じる直前 | 最後の砦としてのバックアップ。ただし実行が保証されない場合がある |

#### 6.3.2 バックアップデータの管理

- バックアップ時に `isDirty: true` を設定する（ファイル保存後は `isDirty: false` に戻す）
- ファイル保存（Ctrl+S）成功後、`isDirty` を `false` に更新する
- バックアップデータのサイズが問題になる場合は、変更差分のみの保存を将来的に検討する

### 6.4 復元フロー

アプリケーション起動時に、以下の手順で復元データの有無を確認する。

1. IndexedDB の `projects` ストアを確認する
2. `isDirty: true` のエントリが存在する場合、復元ダイアログを表示する
   - 「復元データがあります。前回の作業内容を復元しますか？」
   - 選択肢: 「復元する」/「破棄する」
3. 「復元する」を選択した場合、バックアップデータを Pinia ストアに展開する
4. 「破棄する」を選択した場合、バックアップデータを削除する

---

## 7. Service Worker 実装方式

### 7.1 決定事項

**vite-plugin-pwa（Workbox ベース）** を採用し、Service Worker を自動生成する。

### 7.2 決定理由

| 判断軸 | vite-plugin-pwa（Workbox） | 手書き Service Worker |
|--------|--------------------------|---------------------|
| 実装コスト | 低い（設定のみ） | 高い（全て自前実装） |
| Vite との統合 | プラグインとして自然に統合 | ビルドパイプラインの手動構築が必要 |
| キャッシュ管理 | Workbox のベストプラクティスが自動適用 | 全て自前で実装（バグのリスク） |
| カスタマイズ性 | 宣言的な設定で対応。injectManifest モードで拡張可能 | 完全な自由度 |

以下の理由から vite-plugin-pwa を選定した。

1. **Service Worker の役割が限定的**: 本ツールでは Service Worker は静的アセットのキャッシュ（オフライン起動）のみに使用する。プッシュ通知やバックグラウンド同期等の高度な機能は不要
2. **Vite エコシステムとの一貫性**: ビルドツールとして Vite を採用済みであり、プラグインとして自然に統合できる
3. **個人プロジェクトでの合理性**: Service Worker 周りの実装・保守コストを最小化できる
4. **拡張パス**: 将来的にカスタマイズが必要になった場合でも、`injectManifest` モードに切り替えることで手書きの Service Worker コードを注入可能

### 7.3 キャッシュ戦略

| リソース種別 | キャッシュ戦略 | 説明 |
|-------------|--------------|------|
| HTML / CSS / JS（静的アセット） | **Cache First** | ビルド時にプリキャッシュリストを自動生成。オフライン時でもキャッシュから即座に提供 |
| フォント等の外部リソース | **Stale While Revalidate** | キャッシュを使用しつつ、バックグラウンドで更新を確認 |

※ 本ツールはサーバーサイド API を持たないため、API 通信に対するキャッシュ戦略は不要。

### 7.4 アプリ更新通知

- アプリの新バージョンがデプロイされた場合、Service Worker が新しいアセットを検出する
- ユーザーに「新しいバージョンが利用可能です。更新しますか？」の通知を表示する
- vite-plugin-pwa の `registerSW` ユーティリティを使用して、更新 UI を容易に実装する

---

## 8. 後続テーマへの引き継ぎ事項

本設計書の決定事項を前提として、以下のテーマで詳細設計を行う。

| 後続テーマ | 本設計書からの引き継ぎ事項 |
|-----------|--------------------------|
| テーマ3（キャンバス・レンダリング設計） | `ElementNode` のデータモデルに基づく描画設計、`LayoutConfig` に対応するレイアウトエンジンの実装設計 |
| テーマ4（操作・インタラクション設計） | `ElementNode` の `parentId`/`childrenIds` を操作する D&D 設計、Undo/Redo のコマンド設計（Pinia ストア上のフラットマップ操作） |
| テーマ5（エクスポート・変換設計） | `Project` / `Page` / `ElementNode` のデータモデルから各ターゲットへの変換パイプライン設計 |

---

## 改訂履歴

| バージョン | 日付 | 内容 |
|-----------|------|------|
| 0.1.0 | 2026-02-23 | 初版作成 |
| 0.2.0 | 2026-02-24 | レビュー指摘反映: type/propsの型安全性に関する実装注記追加、コンテナのデフォルトレイアウト（FreeLayout）明記、テンプレート保存場所をIndexedDBに一本化（Project.templates削除）、線・矢印の座標表現（バウンディングボックス+相対座標points）明確化、ID生成方式（nanoid）追加、ContainerProps/GroupProps定義追加 |
| 0.3.0 | 2026-02-24 | テーマ3（キャンバス・レンダリング設計）での決定に伴い、ElementNodeに `overflow` プロパティ（コンテナのクリッピング設定）を追加 |
