/**
 * UIツール状態・パネル開閉・ズーム・パンを管理するストア
 *
 * 責務:
 *   - アクティブツールの管理
 *   - ズーム倍率とパンオフセットの管理
 *   - パネル（サイドバー等）の表示/非表示状態
 *   - テキスト編集モードの管理
 *
 * 設計書: pre-plans/basic-design/03-canvas-rendering.md セクション 5.2
 *         pre-plans/basic-design/08-module-structure.md セクション 6.1
 */

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

// ============================================================
// ローカル型定義（このストア内でのみ使用）
// ============================================================

/** キャンバス操作ツールの種別 */
export type ToolType =
  | 'select' // 選択ツール（デフォルト）
  | 'rectangle' // 矩形追加ツール
  | 'ellipse' // 楕円追加ツール
  | 'line' // 線追加ツール
  | 'arrow' // 矢印追加ツール
  | 'text' // テキスト追加ツール
  | 'image-placeholder' // 画像プレースホルダー追加ツール
  | 'container' // コンテナ追加ツール
  | 'hand' // 手のひらツール（パン操作）

/** パネルの表示/非表示状態 */
export interface PanelVisibility {
  /** 左サイドバー（要素パレット・レイヤーツリー） */
  leftSidebar: boolean
  /** 右サイドバー（プロパティパネル） */
  rightSidebar: boolean
}

/** ズーム段階プリセット（%単位） */
const ZOOM_STEPS = [10, 25, 50, 75, 100, 150, 200, 400, 800] as const

/** ズームの最小値（10%） */
const ZOOM_MIN = 0.1
/** ズームの最大値（800%） */
const ZOOM_MAX = 8.0

// ============================================================
// Store 定義
// ============================================================

export const useUIStore = defineStore('ui', () => {
  // ============================================================
  // State
  // ============================================================

  /** 現在選択中のツール */
  const activeTool = ref<ToolType>('select')

  /**
   * ズーム倍率（1.0 = 100%）
   * 範囲: 0.1（10%）〜 8.0（800%）
   */
  const zoom = ref<number>(1.0)

  /**
   * パンオフセット（Konva.Stage の x, y に対応）
   * キャンバスの左上がビューポートの何ピクセル目にあるかを示す
   */
  const panOffset = ref<{ x: number; y: number }>({ x: 0, y: 0 })

  /** パネルの表示/非表示状態 */
  const panelVisibility = ref<PanelVisibility>({
    leftSidebar: true,
    rightSidebar: true,
  })

  /**
   * テキスト編集モード中かどうか
   * （DOMオーバーレイの textarea が表示されている状態）
   */
  const isTextEditing = ref<boolean>(false)

  /** テキスト編集中の要素ID（isTextEditing が true の場合のみ有効） */
  const textEditingElementId = ref<string | null>(null)

  // ============================================================
  // State — ダイアログ
  // ============================================================

  /** 新規プロジェクト作成ダイアログの表示状態 */
  const newProjectDialogVisible = ref<boolean>(false)

  // ============================================================
  // Getters
  // ============================================================

  /** ズーム倍率をパーセント整数で返す（例: 1.0 → 100） */
  const zoomPercent = computed<number>(() => Math.round(zoom.value * 100))

  /** 現在のツールが選択ツールかどうか */
  const isSelectTool = computed<boolean>(() => activeTool.value === 'select')

  /** 現在のツールが手のひらツール（パン）かどうか */
  const isHandTool = computed<boolean>(() => activeTool.value === 'hand')

  /** 現在のツールが要素追加ツール（select/hand 以外）かどうか */
  const isAddingTool = computed<boolean>(
    () => activeTool.value !== 'select' && activeTool.value !== 'hand',
  )

  // ============================================================
  // Actions — ツール管理
  // ============================================================

  /** アクティブツールを変更する */
  function setTool(tool: ToolType): void {
    activeTool.value = tool
  }

  // ============================================================
  // Actions — ズーム管理
  // ============================================================

  /**
   * ズーム倍率を設定する
   * @param value 倍率（1.0 = 100%）。ZOOM_MIN〜ZOOM_MAX の範囲でクランプされる
   */
  function setZoom(value: number): void {
    zoom.value = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, value))
  }

  /** 次のズームステップにズームインする */
  function zoomIn(): void {
    const currentPercent = zoomPercent.value
    const nextStep = ZOOM_STEPS.find((step) => step > currentPercent)
    if (nextStep !== undefined) {
      setZoom(nextStep / 100)
    } else {
      setZoom(ZOOM_MAX)
    }
  }

  /** 前のズームステップにズームアウトする */
  function zoomOut(): void {
    const currentPercent = zoomPercent.value
    const prevStep = [...ZOOM_STEPS].reverse().find((step) => step < currentPercent)
    if (prevStep !== undefined) {
      setZoom(prevStep / 100)
    } else {
      setZoom(ZOOM_MIN)
    }
  }

  /** ズームを100%にリセットする */
  function resetZoom(): void {
    setZoom(1.0)
    panOffset.value = { x: 0, y: 0 }
  }

  /**
   * ページ全体がビューポートに収まるようにズーム・パンを調整する
   * @param viewportWidth ビューポートの幅（px）
   * @param viewportHeight ビューポートの高さ（px）
   * @param canvasWidth キャンバスの幅（px）
   * @param canvasHeight キャンバスの高さ（px）
   */
  function fitToPage(
    viewportWidth: number,
    viewportHeight: number,
    canvasWidth: number,
    canvasHeight: number,
  ): void {
    const padding = 40 // ビューポートとキャンバスの余白（px）
    const scaleX = (viewportWidth - padding * 2) / canvasWidth
    const scaleY = (viewportHeight - padding * 2) / canvasHeight
    const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.min(scaleX, scaleY)))
    setZoom(newZoom)
    // キャンバスをビューポートの中央に配置
    panOffset.value = {
      x: (viewportWidth - canvasWidth * newZoom) / 2,
      y: (viewportHeight - canvasHeight * newZoom) / 2,
    }
  }

  // ============================================================
  // Actions — パン管理
  // ============================================================

  /** パンオフセットを設定する */
  function setPanOffset(x: number, y: number): void {
    panOffset.value = { x, y }
  }

  /** パンオフセットを相対移動する */
  function movePan(deltaX: number, deltaY: number): void {
    panOffset.value = {
      x: panOffset.value.x + deltaX,
      y: panOffset.value.y + deltaY,
    }
  }

  // ============================================================
  // Actions — パネル管理
  // ============================================================

  /** パネルの表示/非表示をトグルする */
  function togglePanel(panel: keyof PanelVisibility): void {
    panelVisibility.value[panel] = !panelVisibility.value[panel]
  }

  /** パネルの表示状態を設定する */
  function setPanel(panel: keyof PanelVisibility, visible: boolean): void {
    panelVisibility.value[panel] = visible
  }

  // ============================================================
  // Actions — テキスト編集管理
  // ============================================================

  /** テキスト編集モードを開始する */
  function startTextEditing(elementId: string): void {
    isTextEditing.value = true
    textEditingElementId.value = elementId
  }

  /** テキスト編集モードを終了する */
  function stopTextEditing(): void {
    isTextEditing.value = false
    textEditingElementId.value = null
  }

  // ============================================================
  // Actions — ダイアログ管理
  // ============================================================

  /** 新規プロジェクト作成ダイアログを開く */
  function openNewProjectDialog(): void {
    newProjectDialogVisible.value = true
  }

  /** 新規プロジェクト作成ダイアログを閉じる */
  function closeNewProjectDialog(): void {
    newProjectDialogVisible.value = false
  }

  // ============================================================
  // Public API
  // ============================================================

  return {
    // State
    activeTool,
    zoom,
    panOffset,
    panelVisibility,
    isTextEditing,
    textEditingElementId,
    // Getters
    zoomPercent,
    isSelectTool,
    isHandTool,
    isAddingTool,
    // Actions — ツール
    setTool,
    // Actions — ズーム
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToPage,
    // Actions — パン
    setPanOffset,
    movePan,
    // Actions — パネル
    togglePanel,
    setPanel,
    // Actions — テキスト編集
    startTextEditing,
    stopTextEditing,
    // State — ダイアログ
    newProjectDialogVisible,
    // Actions — ダイアログ
    openNewProjectDialog,
    closeNewProjectDialog,
  }
})
