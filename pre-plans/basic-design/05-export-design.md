# 基本設計書: エクスポート・変換設計

## 文書情報

| 項目 | 内容 |
|------|------|
| 文書名 | 基本設計書: エクスポート・変換設計 |
| バージョン | 0.2.0 |
| 作成日 | 2026-02-26 |
| ステータス | ドラフト |
| 対応する要件定義書 | Intuitive D4UI 要件定義書 v0.3.0 |

---

## 1. 概要

### 1.1 本設計書の範囲

本設計書は、Intuitive D4UI のエクスポート機能について、内部データモデル（`ElementNode`）から各出力形式への変換パイプライン、変換ルール、および操作仕様を定義する。

**エクスポート対象（7ターゲット）**:

| カテゴリ | ターゲット | ファイル形式 |
|---------|-----------|-------------|
| 画像 | PNG | `.png` |
| 画像 | SVG | `.svg` |
| コード | HTML/CSS | `.html` |
| コード | WPF XAML | `.xaml` |
| コード | WinUI 3 XAML | `.xaml` |
| コード | .NET MAUI XAML | `.xaml` |
| コード | Avalonia UI XAML | `.xaml` |

**対応する要件定義書の未決定事項**:
- No.12: コードエクスポートの各ターゲット別変換ルール → 本設計書で確定

### 1.2 前提とする設計書からの入力

| 入力元 | 参照する決定事項 |
|--------|----------------|
| テーマ1（アプリケーション基盤） | ドメイン層にエクスポート変換ロジック配置、File System Access API |
| テーマ2（データ設計・永続化） | `ElementNode`（フラットマップ構造）、`LayoutConfig`（Free/Flex/Grid）、`TypeSpecificProps`、`Spacing` |
| テーマ3（キャンバス・レンダリング設計） | `calculateLayout()`（純粋関数・描画技術非依存）、`getGlobalPosition()`、`LayoutResult`、overflow設定 |
| テーマ4（操作・インタラクション設計） | グループとコンテナの操作上の区別、ページ間リンクのデータ構造 |

### 1.3 品質目標の定義

要件定義書の品質目標「レイアウトの忠実な再現」を以下の具体的基準として定義する。

| レベル | 基準 | 適用範囲 |
|--------|------|---------|
| 必須 | 親子関係の構造が完全に再現される | 全ターゲット |
| 必須 | レイアウトモード（Free/Flex/Grid）が対応する機能に正しくマッピングされる | 全ターゲット |
| 必須 | padding, margin, gap が正しく反映される | 全ターゲット |
| 必須 | justifyContent, alignItems 等のレイアウトパラメータが正しくマッピングされる | 全ターゲット |
| 必須 | 色・枠線・角丸等のスタイルプロパティが正しく反映される | 全ターゲット |
| 目標 | Free配置の座標・サイズの誤差が1px以内 | 全ターゲット |
| 許容 | フォントレンダリングによる微小な差異 | 全ターゲット |
| 許容 | ターゲット固有の制約による表現差（例: XAML角丸の指定方式の違い） | XAML系 |

---

## 2. 変換パイプラインアーキテクチャ

### 2.1 パイプライン全体像

内部データモデルから各ターゲットへの変換は、**中間表現（IR）方式 + ターゲット固有AST経由**の2段パイプラインで行う。

```
[入力]
  ElementNode（フラットマップ: Record<string, ElementNode>）
  + Page（キャンバスサイズ等のページ情報）
    │
    ▼ 【共通前処理】
  ExportNode ツリー（レイアウト解決済み中間表現）
    │
    ├─▼ HTML/CSS 変換器 → HTML DOMツリー → HTML文字列
    ├─▼ XAML 変換器 → XAMLノードツリー → XAML文字列
    ├─▼ SVG 変換器 → SVG要素ツリー → SVG文字列
    └─▼ PNG 変換器 → Konva.Stage.toBlob() → PNG Blob ※パイプライン外
```

> **PNG の特別扱い**: PNGエクスポートはKonva.jsのキャンバス描画結果をそのまま画像化するため、ExportNodeパイプラインを経由しない。Konva.Stage の `toBlob()` を直接使用する。

### 2.2 レイアウト解決済み中間表現（ExportNode）

フラットマップ構造の `ElementNode` をツリー構造に変換し、レイアウト計算結果を付与した中間表現。

```typescript
interface ExportNode {
  // --- 元データ参照 ---
  /** 要素ID */
  id: string;
  /** 要素種別 */
  type: ElementType;
  /** 種別固有プロパティ */
  props: TypeSpecificProps;
  /** 表示名（元の ElementNode.name。HTML の id 属性やコメント生成で使用） */
  name: string;

  // --- ツリー構造（実体化済み） ---
  /** 子ノード配列（childrenIds を実体化したもの。配列順 = Zオーダー） */
  children: ExportNode[];

  // --- レイアウト解決済み座標（親相対） ---
  /** 計算済みX座標（親要素基準） */
  computedX: number;
  /** 計算済みY座標（親要素基準） */
  computedY: number;
  /** 計算済み幅 */
  computedWidth: number;
  /** 計算済み高さ */
  computedHeight: number;

  // --- グローバル座標（SVG等で必要） ---
  /** キャンバス上の絶対X座標 */
  globalX: number;
  /** キャンバス上の絶対Y座標 */
  globalY: number;

  // --- レイアウト・表示情報 ---
  /** このノードが持つレイアウト設定（コンテナのみ。他は null） */
  resolvedLayout: LayoutConfig | null;
  /** 回転角度（度） */
  rotation: number;
  /** 不透明度（0.0〜1.0） */
  opacity: number;

  // --- コンテナ固有 ---
  /** パディング */
  padding?: Spacing;
  /** マージン（コンテナ内の子要素として持つ場合） */
  margin?: Spacing;
  /** オーバーフロー設定 */
  overflow?: 'visible' | 'clip';

  // --- メタデータ ---
  /** ページ間リンク先ID */
  linkToPageId?: string;
  /** group タイプかどうか（変換時の分岐用フラグ） */
  isGroup: boolean;
}
```

### 2.3 共通前処理の仕様

共通前処理は以下の手順で `ElementNode`（フラットマップ）を `ExportNode`（ツリー）に変換する。

```
Step 1: フラットマップからツリー構造を構築
  - ルート要素（parentId === null）を起点に、childrenIds を辿って再帰的にツリーを構築
  - 配列順（Zオーダー）を維持

Step 2: 非表示要素のフィルタリング
  - visible === false の要素とその子孫をツリーから除外
  - locked 要素はエクスポート対象に含める（locked は編集時の操作制約であり、エクスポート出力には影響しない）

Step 3: レイアウト計算の実行
  - テーマ3で設計した calculateLayout() を再帰的に呼び出し
  - 各ノードの computedX/Y/Width/Height を確定
  - 外側から内側へ再帰的に計算（親から子へ effectiveSize を受け渡し）

Step 4: グローバル座標の算出
  - テーマ3で設計した getGlobalPosition() を使用
  - 各ノードの globalX/Y を確定

Step 5: メタデータの設定
  - ElementNode.name を ExportNode.name にコピー
  - type === 'group' の要素に isGroup = true を設定
  - その他の要素に isGroup = false を設定
  - linkToPageId をコピー
```

### 2.4 ターゲット固有変換器のインターフェース

各ターゲットの変換器は共通のインターフェースに準拠する。

```typescript
interface ExportTarget {
  /** ターゲット識別名 */
  name: string;

  /** ExportNode ツリーを出力形式に変換する */
  convert(root: ExportNode, options: ExportOptions): ExportResult;
}

interface ExportOptions {
  /** ページ名 */
  pageName: string;
  /** キャンバス幅 */
  canvasWidth: number;
  /** キャンバス高さ */
  canvasHeight: number;
  /** 背景色 */
  backgroundColor: string;
  /** プロジェクト一括エクスポート時のページ名一覧（リンク解決用） */
  allPageNames?: string[];
}

interface ExportResult {
  /** 出力ファイル名 */
  fileName: string;
  /** 出力内容（文字列） */
  content: string;
  /** MIMEタイプ */
  mimeType: string;
}
```

### 2.5 レイアウトエンジンの再利用

テーマ3で設計した以下の関数を、エクスポートパイプラインの共通前処理で直接再利用する。

| 関数 | 用途 | 備考 |
|------|------|------|
| `calculateLayout(element, layoutConfig, children)` | コンテナ内の子要素の座標・サイズを計算 | 純粋関数。描画技術非依存 |
| `getGlobalPosition(elementId, elements, getLayoutResult)` | 要素のキャンバス上の絶対座標を算出 | 親チェーンを辿って累積 |

これらは**ドメイン層の共通ユーティリティ**として実装し、キャンバス描画（Konva.js）とエクスポート変換の両方から参照する。

---

## 3. HTML/CSS 変換ルール

### 3.1 レイアウトマッピング

内部レイアウトモデルをCSSの対応機能に直接マッピングし、レイアウトの「意図」を保持する。

#### レイアウトモード → CSS

| 内部レイアウト | CSSプロパティ（コンテナ） | 子要素の配置 |
|--------------|------------------------|------------|
| Free | `position: relative;` | `position: absolute; left: {x}px; top: {y}px;` |
| Flex | `display: flex;` + 各種プロパティ | CSS Flexboxに委ねる |
| Grid | `display: grid;` + 各種プロパティ | CSS Gridに委ねる |
| グループ | `position: relative;` | `position: absolute;`（Free と同様。レイアウト機能なし） |

#### Flex パラメータ → CSS

| 内部モデル | CSSプロパティ |
|-----------|-------------|
| `direction: 'row'` | `flex-direction: row;` |
| `direction: 'column'` | `flex-direction: column;` |
| `gap` | `gap: {value}px;` |
| `wrap: true` | `flex-wrap: wrap;` |
| `wrap: false` | `flex-wrap: nowrap;` |
| `justifyContent` | `justify-content: {value};` ※ |
| `alignItems` | `align-items: {value};` ※ |

※ justifyContent / alignItems の値名は内部モデルとCSSで同一（`start`, `center`, `end`, `space-between`, `space-around`, `space-evenly`, `stretch`）。

#### Grid パラメータ → CSS

| 内部モデル | CSSプロパティ |
|-----------|-------------|
| `columns` | `grid-template-columns: repeat({n}, 1fr);` |
| `rows` (> 0) | `grid-template-rows: repeat({n}, auto);` |
| `rows` (= 0) | 省略（自動行追加） |
| `columnGap` | `column-gap: {value}px;` |
| `rowGap` | `row-gap: {value}px;` |

### 3.2 基本図形要素の変換ルール

| ElementType | HTML要素 | 主要CSS | 備考 |
|------------|---------|---------|------|
| rectangle | `<div>` | `background-color: {fill}; border: {strokeWidth}px solid {stroke}; border-radius: {cornerRadius}px;` | |
| ellipse | `<div>` | `border-radius: 50%; background-color: {fill}; border: {strokeWidth}px solid {stroke};` | 楕円形を表現 |
| text | `<p>` | `font-size: {fontSize}px; font-family: {fontFamily}; color: {color}; text-align: {textAlign};` | bold → `font-weight: bold;`, italic → `font-style: italic;` |
| line | `<svg>` + `<line>` | — | バウンディングボックスサイズのSVGを `position: absolute` で配置。内部に `<line>` 要素。stroke属性で色・太さを指定 |
| arrow | `<svg>` + `<line>` + `<marker>` | — | SVGの `<marker>` 要素で矢頭を表現。startArrow / endArrow に応じてマーカーを配置 |
| image-placeholder | `<div>` | `background-color: #e0e0e0; display: flex; align-items: center; justify-content: center; color: #999;` | 中央に「Image」テキストを配置 |

### 3.3 コンテナの変換ルール

```html
<!-- container: Flexレイアウトの例 -->
<div id="el-{id}" style="
  display: flex;
  flex-direction: row;
  gap: 10px;
  justify-content: center;
  align-items: stretch;
  padding: 10px 20px 10px 20px;
  overflow: hidden;
  background-color: {fill};
  border: {strokeWidth}px solid {stroke};
  width: {computedWidth}px;
  height: {computedHeight}px;
">
  <!-- 子要素 -->
</div>
```

| プロパティ | CSS変換 |
|-----------|--------|
| `layout` | セクション3.1のレイアウトマッピングに従う |
| `padding` | `padding: {top}px {right}px {bottom}px {left}px;` |
| `overflow: 'visible'` | `overflow: visible;` |
| `overflow: 'clip'` | `overflow: hidden;` |
| `props.fill` | `background-color: {fill};` |
| `props.stroke` / `props.strokeWidth` | `border: {strokeWidth}px solid {stroke};` |

### 3.4 グループの変換ルール

グループは**透明なコンテナ**として出力する。スタイルプロパティ（背景色・枠線等）は持たない。

```html
<!-- group -->
<div id="el-{id}" style="
  position: relative;
  width: {computedWidth}px;
  height: {computedHeight}px;
">
  <!-- 子要素は position: absolute で配置 -->
</div>
```

グループの子要素はFreeレイアウトと同様に `position: absolute; left: {x}px; top: {y}px;` で配置する。

### 3.5 UIコンポーネントの変換ルール

各UIコンポーネントをHTMLのネイティブ要素にマッピングする。

| UIコンポーネント | HTML出力 | 備考 |
|-----------------|---------|------|
| ui-button | `<button>` | テキスト・背景色を反映 |
| ui-input | `<input type="text">` | placeholder属性にラベルを設定 |
| ui-dropdown | `<select>` + `<option>` | 選択肢のモック |
| ui-checkbox | `<label>` + `<input type="checkbox">` + テキスト | ラベルテキスト付き |
| ui-radio | `<label>` + `<input type="radio">` + テキスト | ラベルテキスト付き |
| ui-navbar | `<nav>` + `<div>` 構造 | `display: flex;` で子要素を水平配置 |
| ui-sidebar | `<aside>` + `<div>` 構造 | `display: flex; flex-direction: column;` で子要素を垂直配置 |
| ui-list | `<ul>` + `<li>` | リスト項目を反映 |
| ui-table | `<table>` + `<thead>` + `<tbody>` + `<tr>` + `<td>` | 行列データを反映 |
| ui-card | `<div>` | `border-radius`, `box-shadow`, padding付き |
| ui-modal | `<div>` (overlay) + `<div>` (modal) | 半透明背景 + 中央配置のモーダル |

### 3.6 共通プロパティの変換ルール

全要素に適用される共通プロパティのCSS変換。

| 内部プロパティ | CSSプロパティ | 備考 |
|--------------|-------------|------|
| `rotation` | `transform: rotate({value}deg);` | 0の場合は省略 |
| `opacity` | `opacity: {value};` | 1.0の場合は省略 |
| `width` / `height` | `width: {value}px; height: {value}px;` | computedWidth/Height を使用 |
| `margin` | `margin: {top}px {right}px {bottom}px {left}px;` | Flex/Gridコンテナ内の子要素のみ |

### 3.7 ページ間リンクの変換

`linkToPageId` を持つ要素のエクスポート時の扱い。

| シナリオ | HTML出力 |
|---------|---------|
| プロジェクト一括エクスポート | 要素を `<a href="{ページ名}.html">` で囲む |
| 単一ページエクスポート | 要素の直前に `<!-- Link to: {ページ名} -->` コメントを出力 |
| linkToPageId が null | リンク要素を出力しない |

### 3.8 出力HTMLの構造

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{ページ名}</title>
  <style>
    /* リセットCSS（最小限） */
    * { margin: 0; padding: 0; box-sizing: border-box; }

    /* キャンバスコンテナ */
    #canvas {
      position: relative;
      width: {canvasWidth}px;
      height: {canvasHeight}px;
      background-color: {backgroundColor};
    }

    /* 各要素のスタイル */
    #el-{id} {
      /* 要素固有のスタイル */
    }
  </style>
</head>
<body>
  <div id="canvas">
    <!-- ExportNode ツリーから生成された要素 -->
  </div>
</body>
</html>
```

**出力方式**: インライン方式（HTML + `<style>` 要素を1ファイルに統合）。1ページにつき1つの `.html` ファイルを出力する。

---

## 4. XAML 変換ルール

### 4.1 共通XAML変換基盤とアダプタ

4つのXAMLフレームワーク（WPF, WinUI 3, .NET MAUI, Avalonia UI）への変換は、**共通XAML変換基盤 + フレームワーク固有アダプタ**の構成で実現する。

```
ExportNode ツリー
  ↓ 共通XAML変換ロジック
抽象XAMLノードツリー（フレームワーク非依存）
  ↓ XamlFrameworkAdapter（差分適用）
XAML文字列
```

#### XamlFrameworkAdapter インターフェース

```typescript
interface XamlFrameworkAdapter {
  /** フレームワーク識別名 */
  name: 'wpf' | 'winui3' | 'maui' | 'avalonia';

  /** ルートXML名前空間 */
  rootNamespace: string;

  /** 追加XML名前空間 */
  additionalNamespaces: Record<string, string>;

  /** 抽象コントロール名 → フレームワーク固有名の解決 */
  resolveControlName(abstractName: string): string;

  /** 抽象プロパティ名 → フレームワーク固有名の解決 */
  resolvePropertyName(controlName: string, abstractProp: string): string;

  /** gap の実現方式（フレームワーク間で差異が大きい） */
  resolveGap(panelType: string, gap: number): XamlAttribute[];

  /** XAML文書テンプレートで出力を包む */
  wrapInDocument(content: string, options: ExportOptions): string;
}

interface XamlAttribute {
  /** 属性名 */
  name: string;
  /** 属性値 */
  value: string;
  /** 属性の適用先（'self' = パネル自身, 'children' = 各子要素） */
  target: 'self' | 'children';
}
```

### 4.2 レイアウトマッピング（XAML共通）

#### レイアウトモード → XAML パネル

| 内部レイアウト | XAML パネル | 備考 |
|--------------|-----------|------|
| Free | `Canvas` | 子要素に `Canvas.Left` / `Canvas.Top` 添付プロパティ |
| Flex (row, no-wrap) | `StackPanel Orientation="Horizontal"` | |
| Flex (column, no-wrap) | `StackPanel Orientation="Vertical"` | |
| Flex (wrap) | `WrapPanel` (WPF/Avalonia) / カスタム対応 (WinUI/MAUI) ※1 | |
| Grid | `Grid` + `RowDefinitions` + `ColumnDefinitions` | 子要素に `Grid.Row` / `Grid.Column` |
| グループ | `Canvas` | Freeと同様（レイアウト機能なし） |

※1 WinUI 3 と .NET MAUI には標準の `WrapPanel` が存在しない。WinUI 3 では Community Toolkit の `WrapPanel` または `StackPanel` へのフォールバックで対応。.NET MAUI では `FlexLayout` にマッピングする。

#### Flex パラメータ → XAML

| 内部モデル | XAMLプロパティ | 備考 |
|-----------|--------------|------|
| `direction: 'row'` | `StackPanel Orientation="Horizontal"` | |
| `direction: 'column'` | `StackPanel Orientation="Vertical"` | |
| `gap` | フレームワーク依存（セクション4.3参照） | |
| `justifyContent` | 子要素の `HorizontalAlignment` / `VerticalAlignment` | 主軸方向に応じて切り替え |
| `alignItems` | 子要素の交差軸方向の Alignment | |
| `wrap: true` | `WrapPanel` に切り替え | |

#### Grid パラメータ → XAML

| 内部モデル | XAML | 備考 |
|-----------|------|------|
| `columns` | `<ColumnDefinition Width="*"/>` × N | |
| `rows` (> 0) | `<RowDefinition Height="Auto"/>` × N | |
| `rows` (= 0) | 子要素数から行数を自動算出 | `ceil(子要素数 / columns)` |
| `columnGap` / `rowGap` | 子要素の `Margin` で代替 | 直接的な gap プロパティはXAMLのGridにない |

### 4.3 gap の実現方式（フレームワーク間差異）

gap の実現はXAMLフレームワーク間で最も差異が大きい部分であり、アダプタの `resolveGap()` で吸収する。

| フレームワーク | StackPanel gap | WrapPanel gap | Grid gap |
|--------------|---------------|---------------|---------|
| WPF | 子要素の `Margin` で代替 | 子要素の `Margin` で代替 | 子要素の `Margin` で代替 |
| WinUI 3 | `Spacing="{gap}"` | 子要素の `Margin` で代替 | 子要素の `Margin` で代替 |
| .NET MAUI | `StackLayout Spacing="{gap}"` | `FlexLayout` (gap未サポート、Marginで代替) | `ColumnSpacing="{colGap}" RowSpacing="{rowGap}"` |
| Avalonia UI | 子要素の `Margin` で代替 | 子要素の `Margin` で代替 | 子要素の `Margin` で代替 |

**Margin代替の計算ルール**: gap を子要素のMarginに変換する際、gap/2 を各要素の両端に設定する。ただし先頭・末尾の子要素は外側にMarginを付けない。

```
gap = 10 の場合:
  先頭要素: Margin="0,0,5,0"  （右のみ gap/2）
  中間要素: Margin="5,0,5,0"  （左右 gap/2）
  末尾要素: Margin="5,0,0,0"  （左のみ gap/2）
```

### 4.4 基本図形要素の変換ルール

| ElementType | WPF / WinUI 3 / Avalonia | .NET MAUI | 備考 |
|------------|-------------------------|-----------|------|
| rectangle | `<Border>` ※2 | `<Border>` | Background, BorderBrush, BorderThickness, CornerRadius |
| ellipse | `<Ellipse>` | `<BoxView CornerRadius="...">` ※3 | Fill, Stroke, StrokeThickness |
| text | `<TextBlock>` | `<Label>` | Text, FontSize, FontFamily, FontWeight, FontStyle, Foreground/TextColor |
| line | `<Line>` | `<Line>` (Microsoft.Maui.Controls.Shapes) | X1, Y1, X2, Y2, Stroke, StrokeThickness |
| arrow | `<Path>` | `<Path>` (Microsoft.Maui.Controls.Shapes) | パスデータで線 + 矢頭を表現 |
| image-placeholder | `<Border>` + `<TextBlock>` / `<Label>` | `<Border>` + `<Label>` | グレー背景 + 中央に「Image」テキスト |

※2 rectangle はスタイルプロパティ（背景色、枠線、角丸）を持つため、`<Rectangle>` よりも `<Border>` の方が適切。`<Rectangle>` はコンテンツを持てないが、`<Border>` は子要素を内包できるためレイアウトの柔軟性が高い。

※3 .NET MAUI の `<Ellipse>` (Microsoft.Maui.Controls.Shapes) も使用可能だが、レイアウト統合の観点から `<BoxView>` に大きな CornerRadius を設定して楕円を近似する方が実用的。正確な楕円が必要な場合は `<Ellipse>` にフォールバック。

### 4.5 UIコンポーネントの変換ルール

| UIコンポーネント | WPF | WinUI 3 | .NET MAUI | Avalonia UI |
|-----------------|-----|---------|-----------|-------------|
| ui-button | `<Button>` | `<Button>` | `<Button>` | `<Button>` |
| ui-input | `<TextBox>` | `<TextBox>` | `<Entry>` | `<TextBox>` |
| ui-dropdown | `<ComboBox>` | `<ComboBox>` | `<Picker>` | `<ComboBox>` |
| ui-checkbox | `<CheckBox>` | `<CheckBox>` | `<CheckBox>` | `<CheckBox>` |
| ui-radio | `<RadioButton>` | `<RadioButton>` | `<RadioButton>` | `<RadioButton>` |
| ui-navbar | `<DockPanel>` + 子要素 | `<NavigationView>` | `<Grid>` + 子要素 | `<DockPanel>` + 子要素 |
| ui-sidebar | `<DockPanel>` + 子要素 | `<NavigationView>` | `<Grid>` + 子要素 | `<DockPanel>` + 子要素 |
| ui-list | `<ListBox>` | `<ListView>` | `<CollectionView>` | `<ListBox>` |
| ui-table | `<DataGrid>` | カスタムGrid構成 ※4 | `<Grid>` + 子要素 | `<DataGrid>` |
| ui-card | `<Border>` + 子要素 | `<Border>` + 子要素 | `<Frame>` + 子要素 | `<Border>` + 子要素 |
| ui-modal | `<Window>` / `<Popup>` | `<ContentDialog>` | モーダル `<ContentPage>` | `<Window>` / `<Popup>` |

※4 WinUI 3 にはWPFの `<DataGrid>` に直接対応するコントロールがない。Community Toolkit の DataGrid またはカスタム `<Grid>` + `<TextBlock>` で表形式を再現する。

### 4.6 フレームワーク間の差異テーブル

#### XML名前空間

| フレームワーク | ルート要素 | 主要名前空間 |
|--------------|-----------|-------------|
| WPF | `<Window>` / `<UserControl>` | `xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"` |
| WinUI 3 | `<Page>` / `<UserControl>` | `xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"` |
| .NET MAUI | `<ContentPage>` | `xmlns="http://schemas.microsoft.com/dotnet/2021/maui"` |
| Avalonia UI | `<Window>` / `<UserControl>` | `xmlns="https://github.com/avaloniaui"` |

#### 主要プロパティ名の差異

| 概念 | WPF | WinUI 3 | .NET MAUI | Avalonia UI |
|------|-----|---------|-----------|-------------|
| 背景色 | `Background` | `Background` | `BackgroundColor` | `Background` |
| 前景色（テキスト） | `Foreground` | `Foreground` | `TextColor` | `Foreground` |
| 枠線色 | `BorderBrush` | `BorderBrush` | `BorderColor` (Border) / `Stroke` (Shape) | `BorderBrush` |
| 枠線太さ | `BorderThickness` | `BorderThickness` | `BorderWidth` (Border) / `StrokeThickness` (Shape) | `BorderThickness` |
| 角丸 | `CornerRadius` | `CornerRadius` | `CornerRadius` (Border) / `CornerRadius` (BoxView) | `CornerRadius` |
| クリッピング | `ClipToBounds="True"` | `Clip` (RectangleGeometry) | `IsClippedToBounds="True"` | `ClipToBounds="True"` |
| 透明度 | `Opacity` | `Opacity` | `Opacity` | `Opacity` |
| 回転 | `RenderTransform` + `RotateTransform` | `Rotation` | `Rotation` | `RenderTransform` + `RotateTransform` |

#### 色の指定方式

| フレームワーク | 単色指定 | 備考 |
|--------------|---------|------|
| WPF | `Background="#FF0000"` または `<SolidColorBrush Color="#FF0000"/>` | 文字列リテラルで簡略記法可能 |
| WinUI 3 | `Background="#FF0000"` | 同上 |
| .NET MAUI | `BackgroundColor="#FF0000"` | Color型への直接指定 |
| Avalonia UI | `Background="#FF0000"` | WPFと同様 |

### 4.7 コンテナ・グループの変換ルール

#### コンテナの変換

コンテナは `resolvedLayout` に応じたXAMLパネルで出力する（セクション4.2参照）。

| プロパティ | XAML変換 |
|-----------|--------|
| `padding` | `Padding="{top},{right},{bottom},{left}"` |
| `overflow: 'visible'` | （デフォルト動作。指定不要） |
| `overflow: 'clip'` | フレームワーク依存（セクション4.6の「クリッピング」参照） |
| `props.fill` | `Background="{fill}"` (WPF/WinUI/Avalonia) / `BackgroundColor="{fill}"` (MAUI) |
| `props.stroke` | `BorderBrush="{stroke}"` / `BorderColor="{stroke}"` |

#### グループの変換

グループは**Canvas パネル**（.NET MAUI では `AbsoluteLayout`）として出力する。

```xml
<!-- WPF/WinUI 3/Avalonia UI -->
<Canvas Width="{computedWidth}" Height="{computedHeight}">
  <Canvas.Left>{computedX}</Canvas.Left>
  <Canvas.Top>{computedY}</Canvas.Top>
  <!-- 子要素 -->
</Canvas>

<!-- .NET MAUI -->
<AbsoluteLayout WidthRequest="{computedWidth}" HeightRequest="{computedHeight}">
  <!-- 子要素 -->
</AbsoluteLayout>
```

### 4.8 出力XAMLの構造

#### WPF

```xml
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="{ページ名}"
        Width="{canvasWidth}" Height="{canvasHeight}">
  <Canvas Background="{backgroundColor}">
    <!-- ルート要素のExportNode ツリーから生成 -->
  </Canvas>
</Window>
```

#### WinUI 3

```xml
<Page xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
      xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">
  <Canvas Background="{backgroundColor}"
          Width="{canvasWidth}" Height="{canvasHeight}">
    <!-- ルート要素 -->
  </Canvas>
</Page>
```

#### .NET MAUI

```xml
<ContentPage xmlns="http://schemas.microsoft.com/dotnet/2021/maui"
             xmlns:x="http://schemas.microsoft.com/winfx/2009/xaml"
             Title="{ページ名}">
  <AbsoluteLayout BackgroundColor="{backgroundColor}"
                  WidthRequest="{canvasWidth}" HeightRequest="{canvasHeight}">
    <!-- ルート要素 -->
  </AbsoluteLayout>
</ContentPage>
```

#### Avalonia UI

```xml
<Window xmlns="https://github.com/avaloniaui"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="{ページ名}"
        Width="{canvasWidth}" Height="{canvasHeight}">
  <Canvas Background="{backgroundColor}">
    <!-- ルート要素 -->
  </Canvas>
</Window>
```

**ページ間リンクの XAML での扱い**: XAML出力ではページ間リンクをコメントとして注記する。

```xml
<!-- Navigation: {リンク先ページ名} -->
<Button Content="次へ" ... />
```

---

## 5. 画像エクスポート

### 5.1 PNGエクスポート

PNGエクスポートは、Konva.jsのキャンバス描画結果をそのまま画像化する。ExportNodeパイプラインは経由しない。

#### エクスポートフロー

```
Step 1: オーバーレイレイヤーを非表示にする
  - 選択枠（Transformer）
  - スマートガイド
  - ドロップインジケーター
  - その他UI要素

Step 2: Konva.Stage.toBlob() で画像を生成
  - pixelRatio でエクスポート解像度を制御

Step 3: オーバーレイレイヤーの表示を復元

Step 4: Blob をファイルとして保存
```

#### PNGエクスポートオプション

| 設定項目 | 型 | デフォルト | 選択肢 | 説明 |
|---------|---|----------|--------|------|
| pixelRatio | number | 2 | 1, 2, 3 | 解像度倍率（1x = 72dpi相当、2x = 144dpi、3x = 216dpi） |
| backgroundColor | string \| null | `'#ffffff'` | 白, 透明, カスタム色 | 背景色。null の場合は透明 |

### 5.2 SVGエクスポート

SVGエクスポートは ExportNode → SVG要素ツリーへの変換パイプラインで構築する。SVGにはCSS Flexbox/Gridのようなレイアウト機能がないため、**全ての要素を計算済み絶対座標で配置**する。

#### SVG要素マッピング

| ElementType | SVG要素 | 主要属性 |
|------------|---------|---------|
| rectangle | `<rect>` | x, y, width, height, rx, ry, fill, stroke, stroke-width |
| ellipse | `<ellipse>` | cx, cy, rx, ry, fill, stroke, stroke-width |
| text | `<text>` | x, y, font-size, font-family, font-weight, font-style, fill, text-anchor |
| line | `<line>` | x1, y1, x2, y2, stroke, stroke-width |
| arrow | `<line>` + `<marker>` | マーカーで矢頭を定義。`marker-start` / `marker-end` 属性で参照 |
| image-placeholder | `<rect>` + `<text>` | グレー矩形 + 中央に「Image」テキスト |
| container | `<g>` | `transform="translate(x, y)"` でネスト構造を表現 |
| group | `<g>` | `transform="translate(x, y)"` （スタイルなし） |

#### UIコンポーネントのSVG変換

SVGにはネイティブUIコントロールがないため、全てのUIコンポーネントを**視覚的な形状として描画**する。

| UIコンポーネント | SVG出力 |
|-----------------|--------|
| ui-button | `<rect>` + `<text>`（矩形ボタン + ラベル） |
| ui-input | `<rect>` + `<text>`（入力フィールド + プレースホルダ） |
| ui-dropdown | `<rect>` + `<text>` + `<polygon>`（フィールド + 三角アイコン） |
| ui-checkbox | `<rect>` + `<text>`（チェックボックス + ラベル） |
| ui-radio | `<circle>` + `<text>`（ラジオボタン + ラベル） |
| ui-navbar / ui-sidebar | `<rect>` + 子要素の形状 |
| ui-list | `<rect>` + 複数の `<text>` |
| ui-table | 複数の `<rect>` + `<line>` + `<text>`（セル罫線 + テキスト） |
| ui-card | `<rect rx="...">` + 子要素の形状（角丸矩形） |
| ui-modal | `<rect opacity="0.5">` + `<rect>` + 子要素（半透明背景 + モーダル） |

#### SVG出力テンプレート

```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="{canvasWidth}" height="{canvasHeight}"
     viewBox="0 0 {canvasWidth} {canvasHeight}">
  <!-- 背景 -->
  <rect width="100%" height="100%" fill="{backgroundColor}"/>

  <!-- 矢頭マーカー定義（arrow要素が存在する場合のみ） -->
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7"
            refX="10" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="{stroke}"/>
    </marker>
  </defs>

  <!-- ExportNode ツリーから生成された要素 -->
</svg>
```

#### 回転の扱い

回転はSVGの `transform` 属性で表現する。

```xml
<g transform="translate({x}, {y}) rotate({angle}, {cx}, {cy})">
  <!-- 要素内容 -->
</g>
```

cx, cy は要素の中心座標（width/2, height/2）を指定し、要素の中心を軸に回転する。

### 5.3 画像エクスポート共通設定

| 設定項目 | PNG | SVG | デフォルト |
|---------|-----|-----|----------|
| 背景色 | ○ | ○ | `#ffffff`（白） |
| 解像度倍率 | ○（pixelRatio） | ×（ベクタのため不要） | 2x |
| 透明背景 | ○（backgroundColor = null） | ○（背景rectを省略） | 無効 |

---

## 6. エクスポート操作と出力

### 6.1 エクスポートダイアログ

エクスポート機能はメニュー「ファイル > エクスポート」または `Ctrl+Shift+E` で起動する。

#### ダイアログ構成

```
┌─ エクスポート ─────────────────────────────────┐
│                                                │
│  [対象]                                         │
│    ○ 現在のページ    ○ 全ページ                   │
│                                                │
│  [形式]                                         │
│    ○ PNG    ○ SVG    ○ HTML/CSS                 │
│    ○ WPF XAML   ○ WinUI 3 XAML                 │
│    ○ .NET MAUI XAML   ○ Avalonia UI XAML        │
│                                                │
│  [オプション]                                    │
│    PNG選択時:  解像度 [1x / 2x / 3x ▼]           │
│               背景   [白 / 透明 / カスタム ▼]     │
│    SVG選択時:  背景   [白 / 透明 / カスタム ▼]     │
│    コード選択時: （追加オプションなし）              │
│                                                │
│                    [キャンセル]  [エクスポート]     │
└────────────────────────────────────────────────┘
```

### 6.2 ページ単位エクスポート

「現在のページ」を選択した場合の動作:

1. 変換パイプラインで出力を生成
2. File System Access API の `showSaveFilePicker()` でファイル保存ダイアログを表示
3. ユーザーが保存先を選択
4. ファイルに出力を書き込み

**デフォルトファイル名**: `{ページ名}.{拡張子}`

### 6.3 プロジェクト一括エクスポート

「全ページ」を選択した場合の動作:

1. 全ページに対して変換パイプラインで出力を生成
2. File System Access API の `showDirectoryPicker()` でフォルダ選択ダイアログを表示
3. ユーザーが保存先フォルダを選択
4. 各ページの出力を個別ファイルとして書き込み

**ファイル命名規則**: `{ページ名}.{拡張子}`
- ページ名に使用できない文字（`\ / : * ? " < > |`）はハイフン（`-`）に置換
- 同名ページが存在する場合は末尾に連番を付与（`ページ名-1.html`, `ページ名-2.html`）

### 6.4 File System Access API 非対応時のフォールバック

File System Access API は Chromium系ブラウザで広くサポートされているが、非対応環境のために以下のフォールバックを用意する。

| シナリオ | フォールバック方式 |
|---------|----------------|
| ページ単位 | `<a download="{fileName}">` によるダウンロード |
| 全ページ（コード系） | JSZip でZIPファイルを生成し、`<a download>` でダウンロード |
| 全ページ（画像系） | JSZip でZIPファイルを生成し、`<a download>` でダウンロード |

**ZIP ファイル名**: `{プロジェクト名}_export.zip`

---

## 7. 実装フェーズの推奨分割

### 7.1 フェーズ4対象: 画像 + HTML/CSS

| 実装項目 | 詳細 |
|---------|------|
| 変換パイプライン基盤 | ExportNode生成、共通前処理、ExportTargetインターフェース |
| PNGエクスポート | Konva.Stage.toBlob() の呼び出し、解像度オプション |
| SVGエクスポート | ExportNode → SVG要素ツリー → SVG文字列 |
| HTML/CSSエクスポート | ExportNode → HTML DOMツリー → HTML文字列（インライン方式） |
| エクスポートUI | ダイアログ、ファイル保存、フォールバック |

### 7.2 フェーズ5対象: XAML 4種

| 実装項目 | 詳細 |
|---------|------|
| 共通XAML変換基盤 | ExportNode → 抽象XAMLノードツリー → XAML文字列 |
| WPF アダプタ | WPF固有の名前空間・コントロール名・プロパティ名 |
| WinUI 3 アダプタ | WinUI 3 固有の差異（Spacing, NavigationView等） |
| .NET MAUI アダプタ | MAUI固有の差異（Entry, Picker, FlexLayout, AbsoluteLayout等） |
| Avalonia UI アダプタ | Avalonia固有の差異（主にWPFに近い） |

### 7.3 PoC（実現性検証）の推奨計画

要件定義書ではコードエクスポートを「本ツール開発全体で最もリスクの高い部分」と指摘している。以下のPoCを実装フェーズの開始前に実施することを推奨する。

| PoC項目 | 検証内容 | タイミング |
|---------|---------|-----------|
| PoC-1: HTML/CSS変換 | Flex/Gridレイアウトを含む代表的なワイヤーフレームを手動で変換し、CSS出力の品質を検証 | フェーズ4開始前 |
| PoC-2: XAML gap差異 | WPF/WinUI/MAUI/Avalonia のgap実現方式（Spacing, Margin代替等）の実機検証 | フェーズ5開始前 |
| PoC-3: XAML WrapPanel | WinUI 3 / .NET MAUI でのFlex wrap対応の実現方式を検証 | フェーズ5開始前 |

---

## 8. 後続テーマへの引き継ぎ事項

### テーマ6（開発ロードマップ）への引き継ぎ

| 項目 | 内容 |
|------|------|
| フェーズ分割 | フェーズ4: PNG + SVG + HTML/CSS + パイプライン基盤、フェーズ5: XAML 4種 |
| PoC計画 | 3件のPoC（HTML/CSS変換、XAML gap差異、XAML WrapPanel）をフェーズ開始前に実施推奨 |
| リスク | コードエクスポートは「最もリスクの高い部分」（要件定義書5.2）。特にXAMLフレームワーク間のgap/WrapPanel差異に注意 |

### 横断: モジュール構成（08-module-structure.md）への引き継ぎ

| 項目 | 内容 |
|------|------|
| モジュール構成 | `export/` 配下に共通前処理、ExportNode定義、各ターゲット変換器、XAMLアダプタを配置 |
| 拡張パス | 新ターゲットの追加は ExportTarget インターフェースの新実装を追加するだけで対応可能 |
| 共通ユーティリティ | calculateLayout / getGlobalPosition はドメイン層の共通ユーティリティとしてキャンバス描画とエクスポートで共有 |

---

## 改訂履歴

| バージョン | 日付 | 内容 |
|-----------|------|------|
| 0.1.0 | 2026-02-26 | 初版作成（全13判断ポイントの決定事項を反映） |
| 0.2.0 | 2026-02-26 | レビュー指摘反映: ExportNodeにnameフィールド追加、共通前処理にlocked要素の扱いを補足 |
