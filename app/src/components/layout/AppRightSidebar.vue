<script setup lang="ts">
/**
 * 右サイドバー
 *
 * v-navigation-drawer（location="right"、幅 280px）で構成する。
 * レイヤーツリー（上部）とプロパティパネル（下部）を上下分割で配置する。
 * 分割境界はドラッグリサイズ可能（自前実装）。
 *
 * 設計書: pre-plans/basic-design/07-screen-layout.md セクション 7
 *
 * Note: フェーズ1 Step ③ では構造とプレースホルダーのみ実装する。
 *       - レイヤーツリーの実際の内容: Step ⑤ 以降
 *       - プロパティパネルの実際の内容: Step ⑤ 以降
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { useUIStore } from '@/stores/useUIStore'
import { useSelectionStore } from '@/stores/useSelectionStore'
import { useProjectStore } from '@/stores/useProjectStore'

const uiStore = useUIStore()
const selectionStore = useSelectionStore()
const projectStore = useProjectStore()

// ============================================================
// 上下分割の高さ管理
// ============================================================

/** レイヤーツリーの高さ（px）。残余がプロパティパネルに割り当てられる */
const layerTreeHeight = ref(200)

/** ドラッグリサイズ中かどうか */
const isResizing = ref(false)

/** ドラッグ開始時のY座標 */
let resizeStartY = 0
/** ドラッグ開始時のレイヤーツリー高さ */
let resizeStartHeight = 0

const MIN_LAYER_TREE_HEIGHT = 80
const MIN_PROPERTY_PANEL_HEIGHT = 120

function onResizeStart(event: PointerEvent): void {
  isResizing.value = true
  resizeStartY = event.clientY
  resizeStartHeight = layerTreeHeight.value
  ;(event.target as HTMLElement).setPointerCapture(event.pointerId)
}

function onResizeMove(event: PointerEvent): void {
  if (!isResizing.value) return
  const delta = event.clientY - resizeStartY
  const sidebarEl = (event.target as HTMLElement).closest('.sidebar-inner')
  const totalHeight = sidebarEl?.clientHeight ?? 600

  const newHeight = resizeStartHeight + delta
  const clamped = Math.max(
    MIN_LAYER_TREE_HEIGHT,
    Math.min(totalHeight - MIN_PROPERTY_PANEL_HEIGHT, newHeight),
  )
  layerTreeHeight.value = clamped
}

function onResizeEnd(): void {
  isResizing.value = false
}

onMounted(() => {
  document.addEventListener('pointerup', onResizeEnd)
})
onUnmounted(() => {
  document.removeEventListener('pointerup', onResizeEnd)
})
</script>

<template>
  <v-navigation-drawer
    :model-value="uiStore.panelVisibility.rightSidebar"
    location="right"
    :width="280"
    permanent
  >
    <div class="sidebar-inner">

      <!-- レイヤーツリー（上部） -->
      <div class="layer-tree-panel" :style="{ height: layerTreeHeight + 'px' }">
        <div class="panel-header">
          <span class="panel-title">レイヤー</span>
        </div>
        <v-divider />
        <div class="panel-content">
          <div v-if="!projectStore.hasProject" class="empty-state">
            <span class="text-caption text-disabled">プロジェクトがありません</span>
          </div>
          <div v-else-if="Object.keys(projectStore.activeElements).length === 0" class="empty-state">
            <span class="text-caption text-disabled">要素がありません</span>
          </div>
          <!-- TODO: Step ⑤ で LayerTreePanel コンポーネントに置き換える -->
          <div v-else class="layer-placeholder">
            <v-list density="compact">
              <v-list-item
                v-for="id in projectStore.rootElementIds"
                :key="id"
                :title="projectStore.activeElements[id]?.name ?? id"
                :prepend-icon="'mdi-rectangle-outline'"
                density="compact"
              />
            </v-list>
          </div>
        </div>
      </div>

      <!-- リサイズハンドル -->
      <div
        class="resize-handle"
        :class="{ 'resize-handle--active': isResizing }"
        @pointerdown="onResizeStart"
        @pointermove="onResizeMove"
      />

      <!-- プロパティパネル（下部） -->
      <div class="property-panel">
        <div class="panel-header">
          <span class="panel-title">プロパティ</span>
        </div>
        <v-divider />
        <div class="panel-content">
          <!-- 未選択時 -->
          <div
            v-if="!selectionStore.hasSelection"
            class="empty-state"
          >
            <v-icon icon="mdi-cursor-default-click-outline" size="32" class="mb-2 text-disabled" />
            <p class="text-caption text-disabled text-center">
              要素を選択すると<br>プロパティが表示されます
            </p>
          </div>

          <!-- 選択あり -->
          <!-- TODO: Step ⑤ で PropertyPanel コンポーネントに置き換える -->
          <div v-else class="property-placeholder pa-3">
            <p class="text-caption text-disabled">
              {{ selectionStore.selectedCount }}件 選択中
            </p>
            <p class="text-caption text-disabled">
              （プロパティパネルは Step ⑤ で実装予定）
            </p>
          </div>
        </div>
      </div>

    </div>
  </v-navigation-drawer>
</template>

<style scoped>
.sidebar-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* レイヤーツリーパネル */
.layer-tree-panel {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
}

/* プロパティパネル（残余高さを埋める） */
.property-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* リサイズハンドル */
.resize-handle {
  height: 4px;
  flex-shrink: 0;
  cursor: row-resize;
  background-color: transparent;
  transition: background-color 0.15s;

  &:hover,
  &.resize-handle--active {
    background-color: rgba(var(--v-theme-primary), 0.4);
  }
}

/* 共通パネルヘッダー */
.panel-header {
  height: 32px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  flex-shrink: 0;
}

.panel-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.6;
}

/* コンテンツ領域 */
.panel-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

/* 空状態 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  height: 100%;
}

.layer-placeholder,
.property-placeholder {
  width: 100%;
}
</style>
