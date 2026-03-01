<script setup lang="ts">
/**
 * ステータスバー
 *
 * v-footer（app）で画面下端に固定表示する高さ 24px のバー。
 * ズーム倍率・キャンバスサイズ・選択要素数などの状態を表示する。
 *
 * 設計書: pre-plans/basic-design/07-screen-layout.md セクション 2.2
 */
import { computed } from 'vue'
import { useUIStore } from '@/stores/useUIStore'
import { useProjectStore } from '@/stores/useProjectStore'
import { useSelectionStore } from '@/stores/useSelectionStore'

const uiStore = useUIStore()
const projectStore = useProjectStore()
const selectionStore = useSelectionStore()

const activePage = computed(() => projectStore.activePage)

const canvasSizeText = computed(() => {
  if (!activePage.value) return ''
  return `${activePage.value.width} × ${activePage.value.height} px`
})

const selectionText = computed(() => {
  const count = selectionStore.selectedCount
  if (count === 0) return ''
  return `${count}件 選択中`
})
</script>

<template>
  <v-footer app :height="24" class="app-status-bar" border="t">
    <!-- ズーム倍率 -->
    <span class="status-item">
      <v-icon icon="mdi-magnify" size="12" class="mr-1" />
      {{ uiStore.zoomPercent }}%
    </span>

    <!-- キャンバスサイズ（プロジェクトが開かれている場合） -->
    <template v-if="activePage">
      <span class="status-separator">|</span>
      <span class="status-item">
        <v-icon icon="mdi-crop-square" size="12" class="mr-1" />
        {{ canvasSizeText }}
      </span>
    </template>

    <!-- 選択状態 -->
    <template v-if="selectionText">
      <span class="status-separator">|</span>
      <span class="status-item">{{ selectionText }}</span>
    </template>

    <!-- 右端: アプリバージョン（将来用） -->
    <span class="ml-auto status-item version-text">
      v0.0.0
    </span>
  </v-footer>
</template>

<style scoped>
.app-status-bar {
  padding: 0 8px;
  font-size: 11px;
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.7;
  display: flex;
  align-items: center;
  gap: 0;
  user-select: none;
}

.status-item {
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.status-separator {
  margin: 0 8px;
  opacity: 0.3;
}

.version-text {
  opacity: 0.4;
  font-size: 10px;
}
</style>
