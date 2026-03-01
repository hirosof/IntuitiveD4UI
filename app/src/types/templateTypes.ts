/**
 * テンプレート関連の型定義
 *
 * テンプレートはプロジェクトファイル（.wfp）には含めず、IndexedDB に保存する。
 * これによりプロジェクト横断での再利用が可能となる。
 * 設計書: pre-plans/basic-design/02-data-design.md セクション 2.5, 5.3.3
 */

import type { Page } from './projectTypes'
import type { ElementNode } from './elementTypes'

// ============================================================
// Template（テンプレート）
// ============================================================

/** テンプレート種別 */
export type TemplateScope =
  | 'page' // ページ全体をテンプレートとして保存
  | 'component' // 要素（群）をコンポーネントとして保存

/** テンプレート */
export interface Template {
  /** テンプレートの一意識別子 */
  id: string

  /** テンプレート名 */
  name: string

  /** テンプレート種別 */
  scope: TemplateScope

  /** 作成日時（ISO 8601） */
  createdAt: string

  /** テンプレートデータ（ページ or 要素ツリーのスナップショット） */
  data: Page | ElementNode[]
}

// ============================================================
// 型ガード
// ============================================================

/** テンプレートデータがページスナップショットであるかを判定する型ガード */
export function isPageTemplate(template: Template): template is Template & { data: Page } {
  return template.scope === 'page'
}

/** テンプレートデータが要素配列であるかを判定する型ガード */
export function isComponentTemplate(
  template: Template,
): template is Template & { data: ElementNode[] } {
  return template.scope === 'component'
}
