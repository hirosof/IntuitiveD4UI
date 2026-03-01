<script setup lang="ts">
/**
 * キャンバスステージコンポーネント
 *
 * Konva.Stage を中心に 3 レイヤー構成でキャンバスを描画する。
 *   - gridLayer   : グリッド線・キャンバス背景（listening: false）
 *   - elementLayer: ワイヤーフレーム要素（Step ⑤ で実装）
 *   - overlayLayer: 選択UI・スマートガイド（Step ⑥ で実装）
 *
 * ズーム・パンは useUIStore の zoom / panOffset を Konva.Stage の
 * scale / position にバインドして実現する。
 *
 * 設計書: pre-plans/basic-design/03-canvas-rendering.md セクション 2.4, 5.2, 5.3
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useUIStore } from '@/stores/useUIStore'
import { useProjectStore } from '@/stores/useProjectStore'

const uiStore = useUIStore()
const projectStore = useProjectStore()

// ============================================================
// コンテナサイズ管理（ResizeObserver）
// ============================================================

const containerRef = ref<HTMLDivElement | null>(null)
const stageWidth = ref<number>(0)
const stageHeight = ref<number>(0)
let resizeObserver: ResizeObserver | null = null

// ============================================================
// ズーム・パン操作の状態
// ============================================================

/** スペースキー押下中フラグ（手のひら操作の一時有効化） */
const isSpaceDown = ref<boolean>(false)
/** パン操作中フラグ */
const isPanning = ref<boolean>(false)
/** パン開始時のマウス座標・パンオフセット（非リアクティブ） */
let panStartClientX = 0
let panStartClientY = 0
let panStartOffsetX = 0
let panStartOffsetY = 0

// ============================================================
// アクティブページ情報
// ============================================================

const activePage = computed(() => projectStore.activePage)
/** キャンバス幅（ページ未選択時のフォールバック: 1920px） */
const canvasWidth = computed(() => activePage.value?.width ?? 1920)
/** キャンバス高さ（ページ未選択時のフォールバック: 1080px） */
const canvasHeight = computed(() => activePage.value?.height ?? 1080)

// ============================================================
// Konva Stage config
// ============================================================

/**
 * Konva.Stage の設定。
 * scaleX / scaleY でズーム、x / y でパンを実現する。
 */
const stageConfig = computed(() => ({
  width: stageWidth.value,
  height: stageHeight.value,
  x: uiStore.panOffset.x,
  y: uiStore.panOffset.y,
  scaleX: uiStore.zoom,
  scaleY: uiStore.zoom,
}))

// ============================================================
// gridLayer: キャンバス背景・枠線
// ============================================================

/**
 * キャンバス領域の白背景と枠線を 1 つの Rect で描画する。
 * 設計書 5.1.2: 白色矩形 + 薄いグレー枠線
 */
const canvasRectConfig = computed(() => ({
  x: 0,
  y: 0,
  width: canvasWidth.value,
  height: canvasHeight.value,
  fill: '#FFFFFF',
  stroke: '#CCCCCC',
  strokeWidth: 1,
  // ズームに関わらず枠線は常に 1px（画面上）
  strokeScaleEnabled: false,
  shadowEnabled: true,
  shadowColor: 'rgba(0, 0, 0, 0.12)',
  shadowBlur: 16,
  shadowOffsetX: 0,
  shadowOffsetY: 2,
}))

// ============================================================
// gridLayer: グリッド線（密度制御付き sceneFunc）
// ============================================================

/** グリッドのベース間隔（px）。設計書 5.3.1 デフォルト値 */
const GRID_BASE_SIZE = 8
/** グリッド線の最小画面上間隔（px）。設計書 5.3.3 */
const GRID_MIN_SCREEN_SPACING = 8

/**
 * グリッド表示フラグ。
 * TODO: useAppSettingsStore に移動し、ツールバーのトグルボタンと接続する（Step ⑦）
 * 設計書 5.3.1: 初期表示状態 OFF
 */
const gridVisible = ref<boolean>(false)

/**
 * グリッド線の描画設定（sceneFunc アプローチ）。
 *
 * 単一の Konva.Shape に sceneFunc を渡し、全グリッド線を 1 回のパスで描画する。
 * 数百本の <v-line> を使うより効率的。
 *
 * 密度制御: 画面上の間隔が GRID_MIN_SCREEN_SPACING 未満になった場合、
 * 表示間隔を倍加する（設計書 5.3.3）。
 */
const gridShapeConfig = computed(() => {
  const zoom = uiStore.zoom
  const w = canvasWidth.value
  const h = canvasHeight.value
  const visible = gridVisible.value

  // 密度制御: 画面上での間隔 = size * zoom が 8px 以上になるまで size を倍加
  let size = GRID_BASE_SIZE
  while (size * zoom < GRID_MIN_SCREEN_SPACING) {
    size *= 2
  }

  return {
    stroke: '#E0E0E0',
    strokeWidth: 1,
    // ズームに関わらずグリッド線は常に 1px（画面上）
    strokeScaleEnabled: false,
    listening: false,
    visible,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sceneFunc: (ctx: any, shape: any) => {
      ctx.beginPath()
      // 垂直グリッド線
      for (let x = size; x < w; x += size) {
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
      }
      // 水平グリッド線
      for (let y = size; y < h; y += size) {
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
      }
      // shape の stroke / strokeWidth / strokeScaleEnabled を適用して描画
      ctx.fillStrokeShape(shape)
    },
  }
})

// ============================================================
// ズーム操作: Ctrl + ホイール（カーソル位置を中心）
// ============================================================

function onWheel(e: WheelEvent): void {
  e.preventDefault()

  if (e.ctrlKey) {
    // Ctrl + ホイール: マウスカーソル位置を中心にズーム
    // 設計書 5.2.3 の式:
    //   newStageX = pointerX - (pointerX - oldStageX) * (newScale / oldScale)
    const rect = containerRef.value?.getBoundingClientRect()
    if (!rect) return
    const pointerX = e.clientX - rect.left
    const pointerY = e.clientY - rect.top
    const oldScale = uiStore.zoom
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
    const newScale = Math.max(0.1, Math.min(8.0, oldScale * factor))

    const newPanX = pointerX - (pointerX - uiStore.panOffset.x) * (newScale / oldScale)
    const newPanY = pointerY - (pointerY - uiStore.panOffset.y) * (newScale / oldScale)

    uiStore.setZoom(newScale)
    uiStore.setPanOffset(newPanX, newPanY)
  } else if (e.shiftKey) {
    // Shift + ホイール: 水平パン（設計書 5.2.4）
    uiStore.movePan(-e.deltaY, 0)
  } else {
    // ホイール: 垂直パン（設計書 5.2.4）
    uiStore.movePan(0, -e.deltaY)
  }
}

// ============================================================
// パン操作: スペース + 左ドラッグ / 中クリック + ドラッグ
// ============================================================

/** パン操作を開始する */
function startPan(clientX: number, clientY: number): void {
  isPanning.value = true
  panStartClientX = clientX
  panStartClientY = clientY
  panStartOffsetX = uiStore.panOffset.x
  panStartOffsetY = uiStore.panOffset.y
  document.addEventListener('mousemove', onPanMove)
  document.addEventListener('mouseup', onPanEnd)
}

function onPanMove(e: MouseEvent): void {
  if (!isPanning.value) return
  const dx = e.clientX - panStartClientX
  const dy = e.clientY - panStartClientY
  uiStore.setPanOffset(panStartOffsetX + dx, panStartOffsetY + dy)
}

function onPanEnd(): void {
  if (!isPanning.value) return
  isPanning.value = false
  document.removeEventListener('mousemove', onPanMove)
  document.removeEventListener('mouseup', onPanEnd)
}

/** コンテナへの mousedown ハンドラ */
function onContainerMouseDown(e: MouseEvent): void {
  const isMiddleClick = e.button === 1
  const isSpaceDrag = e.button === 0 && isSpaceDown.value
  if (isMiddleClick || isSpaceDrag) {
    e.preventDefault()
    startPan(e.clientX, e.clientY)
  }
}

// ============================================================
// キーボード: スペースキー（手のひらツール一時有効化）
// ============================================================

function onKeyDown(e: KeyboardEvent): void {
  if (e.code === 'Space') {
    // テキスト入力中はスペース操作をスキップ
    const target = e.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return
    }
    if (!isSpaceDown.value) {
      isSpaceDown.value = true
      e.preventDefault() // ページスクロールを防止
    }
  }
}

function onKeyUp(e: KeyboardEvent): void {
  if (e.code === 'Space') {
    isSpaceDown.value = false
    if (isPanning.value) {
      onPanEnd()
    }
  }
}

// ============================================================
// ライフサイクル
// ============================================================

onMounted(() => {
  const container = containerRef.value
  if (!container) return

  // 初期コンテナサイズを同期的に取得
  stageWidth.value = container.clientWidth
  stageHeight.value = container.clientHeight

  // ResizeObserver でコンテナサイズの変化を追跡
  resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0]
    if (!entry) return
    stageWidth.value = entry.contentRect.width
    stageHeight.value = entry.contentRect.height
  })
  resizeObserver.observe(container)

  // ホイールイベント: passive: false で preventDefault() を許可する
  // （Vue の @wheel はデフォルトで passive のため直接バインドが必要）
  container.addEventListener('wheel', onWheel, { passive: false })

  // キーボードイベント: document レベルで登録（フォーカス位置によらず動作）
  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('keyup', onKeyUp)

  // 初期表示: ページ全体がビューポートに収まるようにフィット
  if (activePage.value && stageWidth.value > 0 && stageHeight.value > 0) {
    uiStore.fitToPage(stageWidth.value, stageHeight.value, canvasWidth.value, canvasHeight.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  const container = containerRef.value
  if (container) {
    container.removeEventListener('wheel', onWheel)
  }
  document.removeEventListener('keydown', onKeyDown)
  document.removeEventListener('keyup', onKeyUp)
  // パン操作中にアンマウントされた場合のクリーンアップ
  document.removeEventListener('mousemove', onPanMove)
  document.removeEventListener('mouseup', onPanEnd)
})

/**
 * アクティブページが切り替わったらフィット表示を実行する。
 * 新規プロジェクト作成・ページ切替時に自動的にページ全体を表示する。
 */
watch(activePage, (newPage, oldPage) => {
  if (newPage && newPage.id !== oldPage?.id && stageWidth.value > 0 && stageHeight.value > 0) {
    uiStore.fitToPage(stageWidth.value, stageHeight.value, newPage.width, newPage.height)
  }
})
</script>

<template>
  <div
    ref="containerRef"
    class="canvas-stage-container"
    :class="{
      'cursor-grab': isSpaceDown && !isPanning,
      'cursor-grabbing': isPanning,
    }"
    @mousedown="onContainerMouseDown"
  >
    <!--
      stageWidth / stageHeight が 0 の場合（マウント直後、ResizeObserver 未発火）は
      v-stage をレンダリングしない。
      0×0 の Konva Stage に対して drawImage を呼ぶと InvalidStateError が発生するため。
    -->
    <v-stage v-if="stageWidth > 0 && stageHeight > 0" :config="stageConfig">
      <!-- ========================================== -->
      <!-- グリッドレイヤー（listening: false）       -->
      <!-- キャンバス背景・グリッド線を描画する        -->
      <!-- ========================================== -->
      <v-layer :config="{ listening: false }">
        <!-- キャンバス白背景 + 枠線 -->
        <v-rect :config="canvasRectConfig" />
        <!-- グリッド線（密度制御付き sceneFunc）-->
        <v-shape :config="gridShapeConfig" />
      </v-layer>

      <!-- ========================================== -->
      <!-- 要素レイヤー                              -->
      <!-- Step ⑤: ワイヤーフレーム要素で実装        -->
      <!-- ========================================== -->
      <v-layer>
        <!-- WfElement コンポーネントがここに入る -->
      </v-layer>

      <!-- ========================================== -->
      <!-- オーバーレイレイヤー                       -->
      <!-- Step ⑥: 選択・変形UI で実装              -->
      <!-- ========================================== -->
      <v-layer>
        <!-- 選択範囲・スマートガイド・変形ハンドルがここに入る -->
      </v-layer>
    </v-stage>
  </div>
</template>

<style scoped>
.canvas-stage-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  cursor: default;
  /* キャンバス外背景: Vuetify のサーフェイスバリアント色（グレー） */
  background-color: rgb(var(--v-theme-surface-variant));
}

/* スペースキー押下中: 手のひらカーソル */
.canvas-stage-container.cursor-grab {
  cursor: grab !important;
}

/* パン操作中: 掴んでいるカーソル */
.canvas-stage-container.cursor-grabbing {
  cursor: grabbing !important;
}
</style>
