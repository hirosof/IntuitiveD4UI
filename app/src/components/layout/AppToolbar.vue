<script setup lang="ts">
/**
 * アプリケーションツールバー
 *
 * メニューバー直下に固定表示する高さ 40px のツールバー。
 * 選択ツール / Undo・Redo / ズーム制御 / 整列 の4グループを持つ。
 * v-main 内の最上部に配置し、CSS で高さを確保する（Vuetify layout コンポーネントではない）。
 *
 * 設計書: pre-plans/basic-design/07-screen-layout.md セクション 4
 */
import { computed } from 'vue'
import { useUIStore } from '@/stores/useUIStore'
import { useUndoStore } from '@/stores/useUndoStore'
import { useSelectionStore } from '@/stores/useSelectionStore'

const uiStore = useUIStore()
const undoStore = useUndoStore()
const selectionStore = useSelectionStore()

/**
 * 整列ボタンの有効条件:
 * 2要素以上が選択されている場合のみ有効
 */
const canAlign = computed(() => selectionStore.isMultiSelection)

/**
 * 均等配置ボタンの有効条件:
 * 3要素以上が選択されている場合のみ有効
 */
const canDistribute = computed(() => selectionStore.selectedCount >= 3)
</script>

<template>
  <div class="app-toolbar" role="toolbar" aria-label="ツールバー">
    <!-- グループ1: 選択ツール -->
    <v-tooltip text="選択ツール" location="bottom">
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          icon="mdi-cursor-default-outline"
          density="compact"
          variant="text"
          size="small"
          :color="uiStore.isSelectTool ? 'primary' : undefined"
          :class="{ 'tool-active': uiStore.isSelectTool }"
          @click="uiStore.setTool('select')"
        />
      </template>
    </v-tooltip>

    <v-divider vertical class="toolbar-divider" />

    <!-- グループ2: Undo / Redo -->
    <v-tooltip :text="undoStore.undoDescription ? `元に戻す: ${undoStore.undoDescription}` : '元に戻す'" location="bottom">
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          icon="mdi-undo"
          density="compact"
          variant="text"
          size="small"
          :disabled="!undoStore.canUndo"
        />
      </template>
    </v-tooltip>

    <v-tooltip :text="undoStore.redoDescription ? `やり直し: ${undoStore.redoDescription}` : 'やり直し'" location="bottom">
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          icon="mdi-redo"
          density="compact"
          variant="text"
          size="small"
          :disabled="!undoStore.canRedo"
        />
      </template>
    </v-tooltip>

    <v-divider vertical class="toolbar-divider" />

    <!-- グループ3: ズーム制御 -->
    <v-tooltip text="ズームアウト (Ctrl+-)" location="bottom">
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          icon="mdi-minus"
          density="compact"
          variant="text"
          size="small"
          @click="uiStore.zoomOut()"
        />
      </template>
    </v-tooltip>

    <span class="zoom-display text-body-2" title="クリックして倍率を入力">
      {{ uiStore.zoomPercent }}%
    </span>

    <v-tooltip text="ズームイン (Ctrl+=)" location="bottom">
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          icon="mdi-plus"
          density="compact"
          variant="text"
          size="small"
          @click="uiStore.zoomIn()"
        />
      </template>
    </v-tooltip>

    <v-tooltip text="フィット表示 (Ctrl+1)" location="bottom">
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          icon="mdi-fit-to-page-outline"
          density="compact"
          variant="text"
          size="small"
        />
      </template>
    </v-tooltip>

    <v-divider vertical class="toolbar-divider" />

    <!-- グループ4: 整列・配置（右寄せ） -->
    <div class="align-group ml-auto">
      <v-tooltip text="左揃え" location="bottom">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon="mdi-format-horizontal-align-left"
            density="compact"
            variant="text"
            size="small"
            :disabled="!canAlign"
          />
        </template>
      </v-tooltip>

      <v-tooltip text="水平中央揃え" location="bottom">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon="mdi-format-horizontal-align-center"
            density="compact"
            variant="text"
            size="small"
            :disabled="!canAlign"
          />
        </template>
      </v-tooltip>

      <v-tooltip text="右揃え" location="bottom">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon="mdi-format-horizontal-align-right"
            density="compact"
            variant="text"
            size="small"
            :disabled="!canAlign"
          />
        </template>
      </v-tooltip>

      <v-tooltip text="上揃え" location="bottom">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon="mdi-format-vertical-align-top"
            density="compact"
            variant="text"
            size="small"
            :disabled="!canAlign"
          />
        </template>
      </v-tooltip>

      <v-tooltip text="垂直中央揃え" location="bottom">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon="mdi-format-vertical-align-center"
            density="compact"
            variant="text"
            size="small"
            :disabled="!canAlign"
          />
        </template>
      </v-tooltip>

      <v-tooltip text="下揃え" location="bottom">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon="mdi-format-vertical-align-bottom"
            density="compact"
            variant="text"
            size="small"
            :disabled="!canAlign"
          />
        </template>
      </v-tooltip>

      <v-divider vertical class="toolbar-divider" />

      <v-tooltip text="水平均等配置" location="bottom">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon="mdi-distribute-horizontal-center"
            density="compact"
            variant="text"
            size="small"
            :disabled="!canDistribute"
          />
        </template>
      </v-tooltip>

      <v-tooltip text="垂直均等配置" location="bottom">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon="mdi-distribute-vertical-center"
            density="compact"
            variant="text"
            size="small"
            :disabled="!canDistribute"
          />
        </template>
      </v-tooltip>
    </div>
  </div>
</template>

<style scoped>
.app-toolbar {
  height: 40px;
  display: flex;
  align-items: center;
  padding: 0 6px;
  border-bottom: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  background-color: rgb(var(--v-theme-surface));
  flex-shrink: 0;
  user-select: none;
}

.toolbar-divider {
  height: 20px !important;
  margin: 0 4px;
  opacity: 0.4;
}

.zoom-display {
  min-width: 44px;
  text-align: center;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 12px;

  &:hover {
    background-color: rgba(var(--v-theme-on-surface), 0.06);
  }
}

.align-group {
  display: flex;
  align-items: center;
  gap: 0;
}

.tool-active {
  background-color: rgba(var(--v-theme-primary), 0.1) !important;
}
</style>
