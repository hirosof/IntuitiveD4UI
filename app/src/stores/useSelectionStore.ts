/**
 * 選択状態・ドリルダウン状態を管理するストア
 *
 * 責務:
 *   - selectedIds（選択中の要素IDセット）の管理
 *   - selectionContext（ドリルダウン中のコンテナID）の管理
 *   - 選択操作（単一選択・複数選択・トグル・全選択・解除）
 *   - ドリルダウン操作（drillDown / drillUp）
 *
 * 設計書: pre-plans/basic-design/04-interaction-design.md セクション 2
 *         pre-plans/basic-design/08-module-structure.md セクション 6.1
 */

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useProjectStore } from './useProjectStore'

export const useSelectionStore = defineStore('selection', () => {
  const projectStore = useProjectStore()

  // ============================================================
  // State
  // ============================================================

  /** 選択中の要素ID配列 */
  const selectedIds = ref<string[]>([])

  /**
   * 選択コンテキスト
   * - null: ルート階層で操作中
   * - string: そのコンテナ/グループの内部で操作中（ドリルダウン状態）
   */
  const selectionContext = ref<string | null>(null)

  // ============================================================
  // Getters
  // ============================================================

  /** 選択中の要素があるか */
  const hasSelection = computed<boolean>(() => selectedIds.value.length > 0)

  /** 単一選択か */
  const isSingleSelection = computed<boolean>(() => selectedIds.value.length === 1)

  /** 複数選択か */
  const isMultiSelection = computed<boolean>(() => selectedIds.value.length > 1)

  /** 選択中の要素数 */
  const selectedCount = computed<number>(() => selectedIds.value.length)

  /** 単一選択時の選択要素ID（複数選択・未選択時は undefined） */
  const selectedId = computed<string | undefined>(() =>
    isSingleSelection.value ? selectedIds.value[0] : undefined,
  )

  /** ドリルダウン中かどうか */
  const isDrilledDown = computed<boolean>(() => selectionContext.value !== null)

  // ============================================================
  // Actions — 選択操作
  // ============================================================

  /** 指定した要素を単独選択する（既存の選択は解除） */
  function select(id: string): void {
    selectedIds.value = [id]
  }

  /** 複数の要素を一括選択する（既存の選択は解除） */
  function selectMultiple(ids: string[]): void {
    selectedIds.value = [...ids]
  }

  /** 選択をトグルする（未選択→追加、選択済み→除外） */
  function toggleSelect(id: string): void {
    const idx = selectedIds.value.indexOf(id)
    if (idx === -1) {
      selectedIds.value = [...selectedIds.value, id]
    } else {
      selectedIds.value = selectedIds.value.filter((sid) => sid !== id)
    }
  }

  /** 選択を解除する */
  function clearSelection(): void {
    selectedIds.value = []
  }

  /**
   * 現在の selectionContext 階層の全要素を選択する（Ctrl+A 相当）
   * selectionContext が null の場合はルート要素を、
   * コンテナ内の場合はその childrenIds を全選択する
   */
  function selectAll(): void {
    const elements = projectStore.activeElements
    const ctx = selectionContext.value

    if (ctx === null) {
      selectedIds.value = [...projectStore.rootElementIds]
    } else {
      const container = elements[ctx]
      if (container) {
        selectedIds.value = [...container.childrenIds]
      }
    }
  }

  // ============================================================
  // Actions — ドリルダウン操作
  // ============================================================

  /**
   * コンテナ/グループ内に入る（ダブルクリック相当）
   * @param containerId ドリルダウン先のコンテナ/グループID
   */
  function drillDown(containerId: string): void {
    selectionContext.value = containerId
    selectedIds.value = []
  }

  /**
   * 1段上の階層に戻る（ESC 相当）
   * ルート階層にいる場合は選択解除のみ行う
   */
  function drillUp(): void {
    if (selectionContext.value === null) {
      // ルート階層：選択解除
      selectedIds.value = []
      return
    }

    // 1段上の親を辿る
    const elements = projectStore.activeElements
    const currentContainer = elements[selectionContext.value]
    selectionContext.value = currentContainer?.parentId ?? null
    selectedIds.value = currentContainer ? [currentContainer.id] : []
  }

  /**
   * selectionContext をリセットしてルート階層に戻る（キャンバス空白クリック相当）
   */
  function resetContext(): void {
    selectionContext.value = null
    selectedIds.value = []
  }

  /**
   * selectionContext を直接設定する
   * （Ctrl+クリックによるドリルダウンスキップ等で使用）
   */
  function setContext(contextId: string | null): void {
    selectionContext.value = contextId
  }

  // ============================================================
  // Public API
  // ============================================================

  return {
    // State
    selectedIds,
    selectionContext,
    // Getters
    hasSelection,
    isSingleSelection,
    isMultiSelection,
    selectedCount,
    selectedId,
    isDrilledDown,
    // Actions
    select,
    selectMultiple,
    toggleSelect,
    clearSelection,
    selectAll,
    drillDown,
    drillUp,
    resetContext,
    setContext,
  }
})
