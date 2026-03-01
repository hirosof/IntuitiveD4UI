/**
 * 要素ノード関連の型定義
 *
 * ElementNode は Discriminated Union（判別共用体）パターンで実装する。
 * type フィールドで要素種別を識別し、対応する props の型を TypeScript レベルで保証する。
 * 設計書: pre-plans/basic-design/02-data-design.md セクション 2.4
 */

import type { LayoutConfig, Spacing } from './layoutTypes'

// ============================================================
// ElementType（要素種別）
// ============================================================

/** 全要素種別の共用体型 */
export type ElementType =
  // 基本図形
  | 'rectangle' // 矩形（角丸対応）
  | 'ellipse' // 円/楕円
  | 'line' // 線
  | 'arrow' // 矢印
  | 'text' // テキスト
  | 'image-placeholder' // 画像プレースホルダー
  // 構造要素
  | 'container' // コンテナ（子要素を内包、レイアウト機能あり）
  | 'group' // グループ（表示上の便宜的まとまり）
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
  | 'ui-modal'

// ============================================================
// TypeSpecificProps（各要素種別の固有プロパティ）
// ============================================================

// --- 基本図形 ---

/** 矩形（rectangle）の固有プロパティ */
export interface RectangleProps {
  /** 塗りつぶし色 */
  fill: string
  /** 枠線色 */
  stroke: string
  /** 枠線の太さ（px） */
  strokeWidth: number
  /** 角丸半径（px） */
  cornerRadius: number
}

/** 楕円（ellipse）の固有プロパティ */
export interface EllipseProps {
  /** 塗りつぶし色 */
  fill: string
  /** 枠線色 */
  stroke: string
  /** 枠線の太さ（px） */
  strokeWidth: number
}

/** 線（line）の固有プロパティ */
export interface LineProps {
  /**
   * 始点・終点の座標
   * バウンディングボックス左上を原点とした相対座標 [x1, y1, x2, y2]
   */
  points: [number, number, number, number]
  /** 線色 */
  stroke: string
  /** 線の太さ（px） */
  strokeWidth: number
}

/** 矢印（arrow）の固有プロパティ */
export interface ArrowProps {
  /**
   * 始点・終点の座標
   * バウンディングボックス左上を原点とした相対座標 [x1, y1, x2, y2]
   */
  points: [number, number, number, number]
  /** 線色 */
  stroke: string
  /** 線の太さ（px） */
  strokeWidth: number
  /** 始点側に矢印を表示するか */
  startArrow: boolean
  /** 終点側に矢印を表示するか */
  endArrow: boolean
}

/** テキスト（text）の固有プロパティ */
export interface TextProps {
  /** テキスト内容 */
  content: string
  /** フォントサイズ（px） */
  fontSize: number
  /** フォントファミリー */
  fontFamily: string
  /** 太字 */
  bold: boolean
  /** 斜体 */
  italic: boolean
  /** テキスト色 */
  color: string
  /** 水平方向の配置 */
  textAlign: 'left' | 'center' | 'right'
}

/** 画像プレースホルダー（image-placeholder）の固有プロパティ */
export interface ImagePlaceholderProps {
  /** プレースホルダーのラベルテキスト（省略時は空） */
  label: string
  /** 枠線色 */
  stroke: string
  /** 枠線の太さ（px） */
  strokeWidth: number
}

// --- 構造要素 ---

/** コンテナ（container）の固有プロパティ（描画上の外観） */
export interface ContainerProps {
  /** 塗りつぶし色 */
  fill: string
  /** 枠線色 */
  stroke: string
  /** 枠線の太さ（px） */
  strokeWidth: number
}

/**
 * グループ（group）の固有プロパティ
 * グループは描画上の固有プロパティを持たない（子要素の描画のみ）
 */
export type GroupProps = Record<string, never>

// --- UIコンポーネント ---

/** UIボタン（ui-button）の固有プロパティ */
export interface UIButtonProps {
  /** ボタンラベル */
  label: string
  /** ボタンスタイル */
  variant: 'filled' | 'outlined' | 'text'
  /** 無効状態 */
  disabled: boolean
}

/** UIテキストインプット（ui-input）の固有プロパティ */
export interface UIInputProps {
  /** プレースホルダーテキスト */
  placeholder: string
  /** 入力タイプ */
  inputType: 'text' | 'password' | 'email' | 'number' | 'search'
  /** 無効状態 */
  disabled: boolean
}

/** UIドロップダウン（ui-dropdown）の固有プロパティ */
export interface UIDropdownProps {
  /** プレースホルダーテキスト（未選択時の表示） */
  placeholder: string
  /** 選択肢の数（ワイヤーフレーム用） */
  itemCount: number
  /** 無効状態 */
  disabled: boolean
}

/** UIチェックボックス（ui-checkbox）の固有プロパティ */
export interface UICheckboxProps {
  /** ラベルテキスト */
  label: string
  /** チェック済み状態（ワイヤーフレーム用） */
  checked: boolean
  /** 無効状態 */
  disabled: boolean
}

/** UIラジオボタン（ui-radio）の固有プロパティ */
export interface UIRadioProps {
  /** ラベルテキスト */
  label: string
  /** 選択済み状態（ワイヤーフレーム用） */
  checked: boolean
  /** 無効状態 */
  disabled: boolean
}

/** UIナビゲーションバー（ui-navbar）の固有プロパティ */
export interface UINavbarProps {
  /** タイトル・ブランド名 */
  title: string
  /** ナビゲーションリンク数（ワイヤーフレーム用） */
  itemCount: number
  /** 検索バーを表示するか */
  showSearch: boolean
}

/** UIサイドバー（ui-sidebar）の固有プロパティ */
export interface UISidebarProps {
  /** メニュー項目数（ワイヤーフレーム用） */
  itemCount: number
  /** 折り畳み状態 */
  collapsed: boolean
}

/** UIリスト（ui-list）の固有プロパティ */
export interface UIListProps {
  /** リスト項目数（ワイヤーフレーム用） */
  itemCount: number
  /** 各項目の高さ（px） */
  itemHeight: number
  /** 区切り線を表示するか */
  showDividers: boolean
}

/** UIテーブル（ui-table）の固有プロパティ */
export interface UITableProps {
  /** 列数 */
  columns: number
  /** 行数（ヘッダー行を除く） */
  rows: number
  /** ヘッダー行を表示するか */
  showHeader: boolean
}

/** UIカード（ui-card）の固有プロパティ */
export interface UICardProps {
  /** カードタイトル */
  title: string
  /** 画像エリアを表示するか */
  showImage: boolean
  /** アクション（ボタン）エリアを表示するか */
  showActions: boolean
}

/** UIモーダル（ui-modal）の固有プロパティ */
export interface UIModalProps {
  /** モーダルタイトル */
  title: string
  /** フッターエリアを表示するか */
  showFooter: boolean
}

/** type 固有プロパティの共用体型 */
export type TypeSpecificProps =
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
  | UIDropdownProps
  | UICheckboxProps
  | UIRadioProps
  | UINavbarProps
  | UISidebarProps
  | UIListProps
  | UITableProps
  | UICardProps
  | UIModalProps

// ============================================================
// ElementNodeBase（全要素ノードに共通するプロパティ）
// ============================================================

/**
 * 全要素ノードに共通するプロパティ
 * type と props は Discriminated Union のためここには含めない
 */
export interface ElementNodeBase {
  /** 要素の一意識別子 */
  id: string
  /** 表示名（ツリービュー、レイヤーパネル等で使用） */
  name: string
  /** 親要素のID（ルート要素の場合は null） */
  parentId: string | null
  /** 子要素のID配列（配列順 = Zオーダー: 先頭が最背面） */
  childrenIds: string[]
  /** X座標（親要素からの相対位置、ルート要素の場合はキャンバス上の絶対位置） */
  x: number
  /** Y座標（親要素からの相対位置、ルート要素の場合はキャンバス上の絶対位置） */
  y: number
  /** 幅（px） */
  width: number
  /** 高さ（px） */
  height: number
  /** 回転角度（度） */
  rotation: number
  /** 不透明度（0.0〜1.0） */
  opacity: number
  /** 表示/非表示 */
  visible: boolean
  /** ロック（編集不可状態） */
  locked: boolean
  /** マージン（外側余白）: コンテナ内の子要素の場合のみ有効 */
  margin?: Spacing
  /** リンク先ページID（ページ間リンク） */
  linkToPageId?: string
}

// ============================================================
// Discriminated Union — 各要素ノード型
// ============================================================

// --- 基本図形ノード ---

export type RectangleNode = ElementNodeBase & {
  type: 'rectangle'
  props: RectangleProps
}

export type EllipseNode = ElementNodeBase & {
  type: 'ellipse'
  props: EllipseProps
}

export type LineNode = ElementNodeBase & {
  type: 'line'
  props: LineProps
}

export type ArrowNode = ElementNodeBase & {
  type: 'arrow'
  props: ArrowProps
}

export type TextNode = ElementNodeBase & {
  type: 'text'
  props: TextProps
}

export type ImagePlaceholderNode = ElementNodeBase & {
  type: 'image-placeholder'
  props: ImagePlaceholderProps
}

// --- 構造要素ノード ---

/**
 * コンテナノード
 * layout / padding / overflow は ContainerNode 専用の必須プロパティ
 */
export type ContainerNode = ElementNodeBase & {
  type: 'container'
  props: ContainerProps
  /** レイアウト設定（デフォルト: FreeLayout） */
  layout: LayoutConfig
  /** パディング（内側余白） */
  padding: Spacing
  /** 子要素のオーバーフロー設定 */
  overflow: 'visible' | 'clip'
}

export type GroupNode = ElementNodeBase & {
  type: 'group'
  props: GroupProps
}

// --- UIコンポーネントノード ---

export type UIButtonNode = ElementNodeBase & {
  type: 'ui-button'
  props: UIButtonProps
}

export type UIInputNode = ElementNodeBase & {
  type: 'ui-input'
  props: UIInputProps
}

export type UIDropdownNode = ElementNodeBase & {
  type: 'ui-dropdown'
  props: UIDropdownProps
}

export type UICheckboxNode = ElementNodeBase & {
  type: 'ui-checkbox'
  props: UICheckboxProps
}

export type UIRadioNode = ElementNodeBase & {
  type: 'ui-radio'
  props: UIRadioProps
}

export type UINavbarNode = ElementNodeBase & {
  type: 'ui-navbar'
  props: UINavbarProps
}

export type UISidebarNode = ElementNodeBase & {
  type: 'ui-sidebar'
  props: UISidebarProps
}

export type UIListNode = ElementNodeBase & {
  type: 'ui-list'
  props: UIListProps
}

export type UITableNode = ElementNodeBase & {
  type: 'ui-table'
  props: UITableProps
}

export type UICardNode = ElementNodeBase & {
  type: 'ui-card'
  props: UICardProps
}

export type UIModalNode = ElementNodeBase & {
  type: 'ui-modal'
  props: UIModalProps
}

// ============================================================
// ElementNode（要素ノードの判別共用体型）
// ============================================================

/**
 * 全要素ノードの判別共用体型
 *
 * type フィールドで絞り込みを行うと、対応する props の型が自動的に解決される。
 * @example
 *   if (node.type === 'rectangle') {
 *     node.props.cornerRadius // RectangleProps として解決される
 *   }
 *   if (node.type === 'container') {
 *     node.layout  // LayoutConfig として解決される（ContainerNode のみ）
 *   }
 */
export type ElementNode =
  | RectangleNode
  | EllipseNode
  | LineNode
  | ArrowNode
  | TextNode
  | ImagePlaceholderNode
  | ContainerNode
  | GroupNode
  | UIButtonNode
  | UIInputNode
  | UIDropdownNode
  | UICheckboxNode
  | UIRadioNode
  | UINavbarNode
  | UISidebarNode
  | UIListNode
  | UITableNode
  | UICardNode
  | UIModalNode

// ============================================================
// デフォルト値
// ============================================================

/** RectangleProps のデフォルト値 */
export const DEFAULT_RECTANGLE_PROPS: RectangleProps = {
  fill: '#e5e7eb',
  stroke: '#6b7280',
  strokeWidth: 1,
  cornerRadius: 0,
}

/** EllipseProps のデフォルト値 */
export const DEFAULT_ELLIPSE_PROPS: EllipseProps = {
  fill: '#e5e7eb',
  stroke: '#6b7280',
  strokeWidth: 1,
}

/** LineProps のデフォルト値 */
export const DEFAULT_LINE_PROPS: LineProps = {
  points: [0, 0, 100, 0],
  stroke: '#374151',
  strokeWidth: 2,
}

/** ArrowProps のデフォルト値 */
export const DEFAULT_ARROW_PROPS: ArrowProps = {
  points: [0, 0, 100, 0],
  stroke: '#374151',
  strokeWidth: 2,
  startArrow: false,
  endArrow: true,
}

/** TextProps のデフォルト値 */
export const DEFAULT_TEXT_PROPS: TextProps = {
  content: 'テキスト',
  fontSize: 14,
  fontFamily: 'sans-serif',
  bold: false,
  italic: false,
  color: '#111827',
  textAlign: 'left',
}

/** ImagePlaceholderProps のデフォルト値 */
export const DEFAULT_IMAGE_PLACEHOLDER_PROPS: ImagePlaceholderProps = {
  label: '',
  stroke: '#6b7280',
  strokeWidth: 1,
}

/** ContainerProps のデフォルト値 */
export const DEFAULT_CONTAINER_PROPS: ContainerProps = {
  fill: 'transparent',
  stroke: '#6b7280',
  strokeWidth: 1,
}

/** UIButtonProps のデフォルト値 */
export const DEFAULT_UI_BUTTON_PROPS: UIButtonProps = {
  label: 'ボタン',
  variant: 'filled',
  disabled: false,
}

/** UIInputProps のデフォルト値 */
export const DEFAULT_UI_INPUT_PROPS: UIInputProps = {
  placeholder: 'テキストを入力',
  inputType: 'text',
  disabled: false,
}

/** UIDropdownProps のデフォルト値 */
export const DEFAULT_UI_DROPDOWN_PROPS: UIDropdownProps = {
  placeholder: '選択してください',
  itemCount: 3,
  disabled: false,
}

/** UICheckboxProps のデフォルト値 */
export const DEFAULT_UI_CHECKBOX_PROPS: UICheckboxProps = {
  label: 'チェックボックス',
  checked: false,
  disabled: false,
}

/** UIRadioProps のデフォルト値 */
export const DEFAULT_UI_RADIO_PROPS: UIRadioProps = {
  label: 'ラジオボタン',
  checked: false,
  disabled: false,
}

/** UINavbarProps のデフォルト値 */
export const DEFAULT_UI_NAVBAR_PROPS: UINavbarProps = {
  title: 'アプリ名',
  itemCount: 4,
  showSearch: false,
}

/** UISidebarProps のデフォルト値 */
export const DEFAULT_UI_SIDEBAR_PROPS: UISidebarProps = {
  itemCount: 5,
  collapsed: false,
}

/** UIListProps のデフォルト値 */
export const DEFAULT_UI_LIST_PROPS: UIListProps = {
  itemCount: 5,
  itemHeight: 48,
  showDividers: true,
}

/** UITableProps のデフォルト値 */
export const DEFAULT_UI_TABLE_PROPS: UITableProps = {
  columns: 4,
  rows: 5,
  showHeader: true,
}

/** UICardProps のデフォルト値 */
export const DEFAULT_UI_CARD_PROPS: UICardProps = {
  title: 'カードタイトル',
  showImage: true,
  showActions: true,
}

/** UIModalProps のデフォルト値 */
export const DEFAULT_UI_MODAL_PROPS: UIModalProps = {
  title: 'ダイアログタイトル',
  showFooter: true,
}
