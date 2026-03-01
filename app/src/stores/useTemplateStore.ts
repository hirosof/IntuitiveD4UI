/**
 * テンプレート管理ストア
 *
 * 責務:
 *   - テンプレートの一覧管理（CRUD）
 *   - テンプレートデータの IndexedDB への永続化（サービス経由）
 *   - ページテンプレート・コンポーネントテンプレートのフィルタリング
 *
 * 設計書: pre-plans/basic-design/02-data-design.md セクション 2.5, 5.3.3
 *         pre-plans/basic-design/08-module-structure.md セクション 6.1
 *
 * Note: IndexedDB 連携は フェーズ3 で実装する（templateRepository.ts）。
 *       現時点ではインメモリ管理のみ。
 */

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { nanoid } from 'nanoid'
import type { Template, TemplateScope } from '@/types/templateTypes'
import type { Page } from '@/types/projectTypes'
import type { ElementNode } from '@/types/elementTypes'

// ============================================================
// Store 定義
// ============================================================

export const useTemplateStore = defineStore('template', () => {
  // ============================================================
  // State
  // ============================================================

  /** テンプレートの一覧（インメモリ） */
  const templates = ref<Template[]>([])

  /** テンプレートの読み込み状態 */
  const isLoaded = ref<boolean>(false)

  // ============================================================
  // Getters
  // ============================================================

  /** ページテンプレートのみを返す */
  const pageTemplates = computed<Template[]>(() =>
    templates.value.filter((t) => t.scope === 'page'),
  )

  /** コンポーネントテンプレートのみを返す */
  const componentTemplates = computed<Template[]>(() =>
    templates.value.filter((t) => t.scope === 'component'),
  )

  /** テンプレート総数 */
  const templateCount = computed<number>(() => templates.value.length)

  // ============================================================
  // Actions — 読み込み
  // ============================================================

  /**
   * テンプレート一覧を IndexedDB から読み込む
   * TODO: フェーズ3で templateRepository.ts を実装後に接続する
   */
  async function loadTemplates(): Promise<void> {
    if (isLoaded.value) return
    // TODO: templateRepository.getAll() を呼び出す
    // const loaded = await templateRepository.getAll()
    // templates.value = loaded
    isLoaded.value = true
  }

  // ============================================================
  // Actions — CRUD
  // ============================================================

  /**
   * ページ全体からテンプレートを作成・保存する
   * @param name テンプレート名
   * @param pageData ページデータのスナップショット
   * @returns 作成されたテンプレートのID
   */
  async function addPageTemplate(name: string, pageData: Page): Promise<string> {
    const template: Template = {
      id: `tmpl-${nanoid()}`,
      name,
      scope: 'page' satisfies TemplateScope,
      createdAt: new Date().toISOString(),
      data: structuredClone(pageData),
    }
    templates.value.push(template)
    // TODO: templateRepository.save(template) を呼び出す
    return template.id
  }

  /**
   * 要素（群）からコンポーネントテンプレートを作成・保存する
   * @param name テンプレート名
   * @param elements 要素ノードの配列（選択中の要素群）
   * @returns 作成されたテンプレートのID
   */
  async function addComponentTemplate(name: string, elements: ElementNode[]): Promise<string> {
    const template: Template = {
      id: `tmpl-${nanoid()}`,
      name,
      scope: 'component' satisfies TemplateScope,
      createdAt: new Date().toISOString(),
      data: structuredClone(elements),
    }
    templates.value.push(template)
    // TODO: templateRepository.save(template) を呼び出す
    return template.id
  }

  /**
   * テンプレートを削除する
   * @param templateId 削除対象のテンプレートID
   */
  async function removeTemplate(templateId: string): Promise<void> {
    const index = templates.value.findIndex((t) => t.id === templateId)
    if (index === -1) return
    templates.value.splice(index, 1)
    // TODO: templateRepository.remove(templateId) を呼び出す
  }

  /**
   * テンプレート名を更新する
   * @param templateId 対象テンプレートID
   * @param name 新しい名前
   */
  async function renameTemplate(templateId: string, name: string): Promise<void> {
    const template = templates.value.find((t) => t.id === templateId)
    if (!template) return
    template.name = name
    // TODO: templateRepository.save(template) を呼び出す
  }

  // ============================================================
  // Actions — 検索・取得
  // ============================================================

  /**
   * IDでテンプレートを取得する
   * @param templateId テンプレートID
   * @returns テンプレート、または undefined（見つからない場合）
   */
  function findById(templateId: string): Template | undefined {
    return templates.value.find((t) => t.id === templateId)
  }

  /**
   * 名前でテンプレートを検索する（部分一致）
   * @param query 検索文字列
   * @returns マッチしたテンプレートの配列
   */
  function searchByName(query: string): Template[] {
    const lowerQuery = query.toLowerCase()
    return templates.value.filter((t) => t.name.toLowerCase().includes(lowerQuery))
  }

  // ============================================================
  // Public API
  // ============================================================

  return {
    // State
    templates,
    isLoaded,
    // Getters
    pageTemplates,
    componentTemplates,
    templateCount,
    // Actions — 読み込み
    loadTemplates,
    // Actions — CRUD
    addPageTemplate,
    addComponentTemplate,
    removeTemplate,
    renameTemplate,
    // Actions — 検索
    findById,
    searchByName,
  }
})
