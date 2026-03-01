/**
 * レイアウト関連の型定義
 *
 * コンテナ要素の子要素配置に関する設定を定義する。
 * 設計書: pre-plans/basic-design/02-data-design.md セクション 2.4.4, 2.4.5
 */

// ============================================================
// Spacing（余白）
// ============================================================

/** パディング・マージンに使用する4方向の余白定義 */
export interface Spacing {
  top: number
  right: number
  bottom: number
  left: number
}

/** Spacing のゼロ値を生成するファクトリ関数 */
export function createSpacing(value = 0): Spacing {
  return { top: value, right: value, bottom: value, left: value }
}

// ============================================================
// LayoutConfig（レイアウト設定）
// ============================================================

/** 自由配置（絶対位置指定） */
export interface FreeLayout {
  type: 'free'
}

/** Flexbox 的レイアウト */
export interface FlexLayout {
  type: 'flex'
  /** 配置方向 */
  direction: 'row' | 'column'
  /** 要素間のギャップ（px） */
  gap: number
  /** 折り返しの有無 */
  wrap: boolean
  /** 主軸の配置 */
  justifyContent: 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly'
  /** 交差軸の配置 */
  alignItems: 'start' | 'center' | 'end' | 'stretch'
}

/** Grid 的レイアウト */
export interface GridLayout {
  type: 'grid'
  /** 列数 */
  columns: number
  /** 行数（0 = 自動） */
  rows: number
  /** 列間ギャップ（px） */
  columnGap: number
  /** 行間ギャップ（px） */
  rowGap: number
}

/** コンテナ要素が持つレイアウト設定の判別共用体 */
export type LayoutConfig = FreeLayout | FlexLayout | GridLayout

// ============================================================
// LayoutResult（レイアウト計算結果）
// ============================================================

/** レイアウトエンジンが算出した要素の配置結果 */
export interface LayoutResult {
  /** 要素ID */
  id: string
  /** 算出後のX座標（グローバル座標） */
  x: number
  /** 算出後のY座標（グローバル座標） */
  y: number
  /** 算出後の幅（px） */
  width: number
  /** 算出後の高さ（px） */
  height: number
}

// ============================================================
// デフォルト値
// ============================================================

/** FreeLayout のデフォルト値 */
export const DEFAULT_FREE_LAYOUT: FreeLayout = { type: 'free' }

/** FlexLayout のデフォルト値 */
export const DEFAULT_FLEX_LAYOUT: FlexLayout = {
  type: 'flex',
  direction: 'row',
  gap: 8,
  wrap: false,
  justifyContent: 'start',
  alignItems: 'start',
}

/** GridLayout のデフォルト値 */
export const DEFAULT_GRID_LAYOUT: GridLayout = {
  type: 'grid',
  columns: 2,
  rows: 0,
  columnGap: 8,
  rowGap: 8,
}
