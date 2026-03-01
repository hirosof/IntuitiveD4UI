/**
 * Undo/Redo 履歴・トランザクションを管理するストア
 *
 * 責務:
 *   - ページ単位の Undo/Redo スタックの管理
 *   - プロパティ差分（Patch）方式による変更記録
 *   - トランザクション API（beginTransaction / commitTransaction / rollbackTransaction）
 *   - undo() / redo() の実行（プロジェクトストアへの変更適用）
 *
 * 設計書: pre-plans/basic-design/04-interaction-design.md セクション 6
 *         pre-plans/basic-design/08-module-structure.md セクション 6.1
 */

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useProjectStore } from './useProjectStore'

// ============================================================
// ローカル型定義（このストア内でのみ使用）
// ============================================================

/** 個別の変更差分 */
export interface Patch {
  /** 変更の対象種別 */
  target: 'element' | 'page'
  /** 変更の種別 */
  type: 'update' | 'add' | 'remove'
  /** 対象要素ID（target が 'element' の場合） */
  elementId?: string
  /** 変更前の値（Undo 用。add の場合は null） */
  before: Record<string, unknown> | null
  /** 変更後の値（Redo 用。remove の場合は null） */
  after: Record<string, unknown> | null
}

/** Undo/Redo の1エントリ（1つの操作に対応） */
export interface UndoEntry {
  /** 操作の説明（UI表示用。例: "要素を移動", "3個の要素を削除"） */
  description: string
  /** 操作のタイムスタンプ */
  timestamp: number
  /** 変更差分の配列（1操作で複数の変更が発生する場合） */
  patches: Patch[]
}

// ============================================================
// Store 定義
// ============================================================

export const useUndoStore = defineStore('undo', () => {
  const projectStore = useProjectStore()

  // ============================================================
  // State
  // ============================================================

  /**
   * ページIDごとの Undo スタック
   * スタック末尾が最新の操作（LIFO）
   */
  const undoStacks = ref<Record<string, UndoEntry[]>>({})

  /**
   * ページIDごとの Redo スタック
   * Undo 後に積まれる。新しい操作が記録されるとクリアされる
   */
  const redoStacks = ref<Record<string, UndoEntry[]>>({})

  /**
   * 1操作にまとめるためのトランザクションバッファ
   * beginTransaction() で開始し、commit/rollback で終了する
   */
  const pendingTransaction = ref<UndoEntry | null>(null)

  /** 最大履歴保持数（プロジェクト設定と同期予定） */
  const maxHistory = ref<number>(50)

  // ============================================================
  // Getters
  // ============================================================

  /** アクティブページの Undo スタック */
  const currentUndoStack = computed<UndoEntry[]>(
    () => undoStacks.value[projectStore.activePageId] ?? [],
  )

  /** アクティブページの Redo スタック */
  const currentRedoStack = computed<UndoEntry[]>(
    () => redoStacks.value[projectStore.activePageId] ?? [],
  )

  /** Undo 可能か */
  const canUndo = computed<boolean>(() => currentUndoStack.value.length > 0)

  /** Redo 可能か */
  const canRedo = computed<boolean>(() => currentRedoStack.value.length > 0)

  /** Undo スタックの先頭エントリの説明文（UIのメニュー表示用） */
  const undoDescription = computed<string | undefined>(() => {
    const stack = currentUndoStack.value
    return stack[stack.length - 1]?.description
  })

  /** Redo スタックの先頭エントリの説明文（UIのメニュー表示用） */
  const redoDescription = computed<string | undefined>(() => {
    const stack = currentRedoStack.value
    return stack[stack.length - 1]?.description
  })

  // ============================================================
  // Actions — 基本操作
  // ============================================================

  /**
   * 変更差分エントリを記録する
   * トランザクション中の場合はバッファに追加する
   */
  function record(entry: UndoEntry): void {
    if (pendingTransaction.value) {
      // トランザクション中: バッファに差分を追加（同一要素・同一プロパティは最適化）
      _mergePatches(pendingTransaction.value, entry.patches)
      return
    }

    const pageId = projectStore.activePageId
    if (!pageId) return

    _ensureStack(pageId)
    _pushUndo(pageId, entry)
    // 新しい操作が記録されたら Redo スタックをクリア
    redoStacks.value[pageId] = []
  }

  /**
   * Undo を実行する（アクティブページの最新操作を取り消す）
   * @todo Patchをプロジェクトストアに適用する実装（フェーズ1 Step⑦）
   */
  function undo(): void {
    if (!canUndo.value) return
    const pageId = projectStore.activePageId
    const stack = undoStacks.value[pageId]
    if (!stack || stack.length === 0) return

    const entry = stack.pop()!
    _ensureStack(pageId)
    // _ensureStack により必ず配列が存在する
    redoStacks.value[pageId]!.push(entry)

    // TODO: entry.patches を逆順に走査し、各 Patch の before の値をストアに適用する
    _applyPatches(entry.patches, 'undo')
  }

  /**
   * Redo を実行する（アクティブページの最新 Undo を再適用する）
   * @todo Patchをプロジェクトストアに適用する実装（フェーズ1 Step⑦）
   */
  function redo(): void {
    if (!canRedo.value) return
    const pageId = projectStore.activePageId
    const stack = redoStacks.value[pageId]
    if (!stack || stack.length === 0) return

    const entry = stack.pop()!
    _ensureStack(pageId)
    // _ensureStack により必ず配列が存在する
    undoStacks.value[pageId]!.push(entry)

    // TODO: entry.patches を順方向に走査し、各 Patch の after の値をストアに適用する
    _applyPatches(entry.patches, 'redo')
  }

  // ============================================================
  // Actions — トランザクション管理
  // ============================================================

  /**
   * トランザクションを開始する
   * 以降の record() 呼び出しをバッファに蓄積する
   * @param description 操作の説明（UI表示用）
   */
  function beginTransaction(description: string): void {
    if (pendingTransaction.value) {
      // 前のトランザクションが未確定の場合はロールバック
      rollbackTransaction()
    }
    pendingTransaction.value = {
      description,
      timestamp: Date.now(),
      patches: [],
    }
  }

  /**
   * トランザクションを確定する
   * バッファの内容を1つの UndoEntry にまとめて記録する
   */
  function commitTransaction(): void {
    if (!pendingTransaction.value) return
    const entry = pendingTransaction.value
    pendingTransaction.value = null

    if (entry.patches.length === 0) return // 変更なし

    const pageId = projectStore.activePageId
    if (!pageId) return

    _ensureStack(pageId)
    _pushUndo(pageId, entry)
    redoStacks.value[pageId] = []
  }

  /**
   * トランザクションを破棄する
   * バッファの内容を破棄し、変更をロールバックする
   * @todo ロールバック処理の実装（フェーズ1 Step⑦）
   */
  function rollbackTransaction(): void {
    if (!pendingTransaction.value) return
    const patches = pendingTransaction.value.patches
    pendingTransaction.value = null

    // TODO: patches を逆順に走査して変更を取り消す
    if (patches.length > 0) {
      _applyPatches(patches, 'undo')
    }
  }

  // ============================================================
  // Actions — ページ管理
  // ============================================================

  /** 新しいページのスタックを初期化する */
  function initPage(pageId: string): void {
    _ensureStack(pageId)
  }

  /** ページ削除時にそのページのスタックを削除する */
  function removePage(pageId: string): void {
    delete undoStacks.value[pageId]
    delete redoStacks.value[pageId]
  }

  /** 最大履歴数を変更する */
  function setMaxHistory(count: number): void {
    maxHistory.value = Math.max(10, Math.min(200, count))
    // 各ページのスタックをトリムする
    for (const pageId of Object.keys(undoStacks.value)) {
      _trimStack(pageId)
    }
  }

  // ============================================================
  // Private helpers
  // ============================================================

  function _ensureStack(pageId: string): void {
    if (!undoStacks.value[pageId]) undoStacks.value[pageId] = []
    if (!redoStacks.value[pageId]) redoStacks.value[pageId] = []
  }

  function _pushUndo(pageId: string, entry: UndoEntry): void {
    // _ensureStack が呼ばれた後に実行されるため必ず配列が存在する
    undoStacks.value[pageId]!.push(entry)
    _trimStack(pageId)
  }

  function _trimStack(pageId: string): void {
    const stack = undoStacks.value[pageId]
    if (stack && stack.length > maxHistory.value) {
      stack.splice(0, stack.length - maxHistory.value)
    }
  }

  /**
   * トランザクションバッファへの Patch 追加時の最適化
   * 同一要素・同一プロパティが複数回変更された場合、最初の before と最後の after のみを保持する
   */
  function _mergePatches(transaction: UndoEntry, newPatches: Patch[]): void {
    for (const newPatch of newPatches) {
      const existing = transaction.patches.find(
        (p) =>
          p.target === newPatch.target &&
          p.type === newPatch.type &&
          p.elementId === newPatch.elementId,
      )
      if (existing) {
        // 既存パッチの after を最新値で上書き（before は最初の値を保持）
        existing.after = newPatch.after
      } else {
        transaction.patches.push(newPatch)
      }
    }
  }

  /**
   * パッチをプロジェクトストアに適用する
   * @todo 実際の適用ロジックを実装する（フェーズ1 Step⑦）
   */
  function _applyPatches(_patches: Patch[], _direction: 'undo' | 'redo'): void {
    // TODO: patches を走査し、direction に応じて before/after をプロジェクトストアに適用する
  }

  // ============================================================
  // Public API
  // ============================================================

  return {
    // State
    undoStacks,
    redoStacks,
    pendingTransaction,
    maxHistory,
    // Getters
    currentUndoStack,
    currentRedoStack,
    canUndo,
    canRedo,
    undoDescription,
    redoDescription,
    // Actions
    record,
    undo,
    redo,
    beginTransaction,
    commitTransaction,
    rollbackTransaction,
    initPage,
    removePage,
    setMaxHistory,
  }
})
