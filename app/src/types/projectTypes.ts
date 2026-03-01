/**
 * プロジェクト・ページ関連の型定義
 *
 * 設計書: pre-plans/basic-design/02-data-design.md セクション 2.2, 2.3
 */

import type { ElementNode } from './elementTypes'

// ============================================================
// ProjectSettings（プロジェクト設定）
// ============================================================

/** プロジェクト設定 */
export interface ProjectSettings {
  /** グリッド設定 */
  grid: {
    /** グリッド表示のON/OFF */
    visible: boolean
    /** グリッド間隔（px） */
    size: number
    /** スナップのON/OFF */
    snapEnabled: boolean
  }
}

// ============================================================
// Page（ページ）
// ============================================================

/** ページ */
export interface Page {
  /** ページの一意識別子 */
  id: string

  /** ページ名 */
  name: string

  /** キャンバス幅（px） */
  width: number

  /** キャンバス高さ（px） */
  height: number

  /** ページの表示順序（0始まり） */
  order: number

  /** ルート要素のID配列（配列順 = Zオーダー: 先頭が最背面） */
  rootElementIds: string[]

  /** 全要素のフラットマップ（キー: 要素ID） */
  elements: Record<string, ElementNode>
}

// ============================================================
// Project（プロジェクト）
// ============================================================

/** プロジェクト */
export interface Project {
  /** ファイル形式のバージョン（マイグレーション用） */
  formatVersion: string

  /** プロジェクトの一意識別子 */
  id: string

  /** プロジェクト名 */
  name: string

  /** 作成日時（ISO 8601） */
  createdAt: string

  /** 最終更新日時（ISO 8601） */
  updatedAt: string

  /** プロジェクト設定 */
  settings: ProjectSettings

  /** ページの配列（表示順） */
  pages: Page[]
}

// ============================================================
// デフォルト値
// ============================================================

/** ProjectSettings のデフォルト値 */
export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  grid: {
    visible: true,
    size: 8,
    snapEnabled: true,
  },
}

/** .wfp ファイル形式の現在バージョン */
export const CURRENT_FORMAT_VERSION = '1.0.0'
