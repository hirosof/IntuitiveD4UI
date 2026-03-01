<script setup lang="ts">
/**
 * アプリケーションメニューバー
 *
 * v-app-bar（高さ 32px）でアプリ上端に固定表示するメニューバー。
 * ファイル / 編集 / 表示 / 要素 / ヘルプ の5メニューを持つ。
 *
 * 設計書: pre-plans/basic-design/07-screen-layout.md セクション 3
 */
import { computed } from 'vue'
import { useProjectStore } from '@/stores/useProjectStore'
import { useSelectionStore } from '@/stores/useSelectionStore'
import { useUndoStore } from '@/stores/useUndoStore'
import { useUIStore } from '@/stores/useUIStore'

const projectStore = useProjectStore()
const selectionStore = useSelectionStore()
const undoStore = useUndoStore()
const uiStore = useUIStore()

const hasProject = computed(() => projectStore.hasProject)
const hasSelection = computed(() => selectionStore.hasSelection)
const canUndo = computed(() => undoStore.canUndo)
const canRedo = computed(() => undoStore.canRedo)
</script>

<template>
  <v-app-bar :height="32" flat border="b" class="app-menu-bar">
    <!-- アプリ名 -->
    <span class="app-title text-caption font-weight-medium px-3">Intuitive D4UI</span>
    <v-divider vertical class="my-1" />

    <!-- ファイルメニュー -->
    <v-menu>
      <template #activator="{ props }">
        <v-btn v-bind="props" variant="text" size="x-small" class="menu-btn">ファイル</v-btn>
      </template>
      <v-list density="compact" min-width="220">
        <v-list-item title="新規プロジェクト" @click="uiStore.openNewProjectDialog()">
          <template #append>
            <span class="shortcut-text">Ctrl+N</span>
          </template>
        </v-list-item>
        <v-list-item title="開く">
          <template #append>
            <span class="shortcut-text">Ctrl+O</span>
          </template>
        </v-list-item>
        <v-divider />
        <v-list-item title="上書き保存" :disabled="!hasProject">
          <template #append>
            <span class="shortcut-text">Ctrl+S</span>
          </template>
        </v-list-item>
        <v-list-item title="名前を付けて保存" :disabled="!hasProject">
          <template #append>
            <span class="shortcut-text">Ctrl+Shift+S</span>
          </template>
        </v-list-item>
        <v-divider />
        <v-list-item title="エクスポート..." :disabled="!hasProject">
          <template #append>
            <span class="shortcut-text">Ctrl+Shift+E</span>
          </template>
        </v-list-item>
      </v-list>
    </v-menu>

    <!-- 編集メニュー -->
    <v-menu>
      <template #activator="{ props }">
        <v-btn v-bind="props" variant="text" size="x-small" class="menu-btn">編集</v-btn>
      </template>
      <v-list density="compact" min-width="220">
        <v-list-item title="元に戻す" :disabled="!canUndo">
          <template #append>
            <span class="shortcut-text">Ctrl+Z</span>
          </template>
        </v-list-item>
        <v-list-item title="やり直し" :disabled="!canRedo">
          <template #append>
            <span class="shortcut-text">Ctrl+Shift+Z</span>
          </template>
        </v-list-item>
        <v-divider />
        <v-list-item title="カット" :disabled="!hasSelection">
          <template #append>
            <span class="shortcut-text">Ctrl+X</span>
          </template>
        </v-list-item>
        <v-list-item title="コピー" :disabled="!hasSelection">
          <template #append>
            <span class="shortcut-text">Ctrl+C</span>
          </template>
        </v-list-item>
        <v-list-item title="ペースト" :disabled="!hasProject">
          <template #append>
            <span class="shortcut-text">Ctrl+V</span>
          </template>
        </v-list-item>
        <v-list-item title="複製" :disabled="!hasSelection">
          <template #append>
            <span class="shortcut-text">Ctrl+D</span>
          </template>
        </v-list-item>
        <v-divider />
        <v-list-item title="全選択" :disabled="!hasProject">
          <template #append>
            <span class="shortcut-text">Ctrl+A</span>
          </template>
        </v-list-item>
        <v-list-item title="削除" :disabled="!hasSelection">
          <template #append>
            <span class="shortcut-text">Delete</span>
          </template>
        </v-list-item>
      </v-list>
    </v-menu>

    <!-- 表示メニュー -->
    <v-menu>
      <template #activator="{ props }">
        <v-btn v-bind="props" variant="text" size="x-small" class="menu-btn">表示</v-btn>
      </template>
      <v-list density="compact" min-width="220">
        <v-list-item title="ズームイン" :disabled="!hasProject">
          <template #append>
            <span class="shortcut-text">Ctrl+=</span>
          </template>
        </v-list-item>
        <v-list-item title="ズームアウト" :disabled="!hasProject">
          <template #append>
            <span class="shortcut-text">Ctrl+-</span>
          </template>
        </v-list-item>
        <v-list-item title="100%表示" :disabled="!hasProject">
          <template #append>
            <span class="shortcut-text">Ctrl+0</span>
          </template>
        </v-list-item>
        <v-list-item title="フィット表示" :disabled="!hasProject">
          <template #append>
            <span class="shortcut-text">Ctrl+1</span>
          </template>
        </v-list-item>
        <v-divider />
        <v-list-item title="グリッド表示" :disabled="!hasProject">
          <template #append>
            <span class="shortcut-text">Ctrl+'</span>
          </template>
        </v-list-item>
        <v-list-item title="グリッドスナップ" :disabled="!hasProject">
          <template #append>
            <span class="shortcut-text">Ctrl+Shift+'</span>
          </template>
        </v-list-item>
        <v-divider />
        <v-list-item
          title="左サイドバー"
          @click="uiStore.togglePanel('leftSidebar')"
        />
        <v-list-item
          title="右サイドバー"
          @click="uiStore.togglePanel('rightSidebar')"
        />
      </v-list>
    </v-menu>

    <!-- 要素メニュー -->
    <v-menu>
      <template #activator="{ props }">
        <v-btn v-bind="props" variant="text" size="x-small" class="menu-btn">要素</v-btn>
      </template>
      <v-list density="compact" min-width="220">
        <v-list-item title="グループ化" :disabled="!hasSelection">
          <template #append>
            <span class="shortcut-text">Ctrl+G</span>
          </template>
        </v-list-item>
        <v-list-item title="グループ解除" :disabled="!hasSelection">
          <template #append>
            <span class="shortcut-text">Ctrl+Shift+G</span>
          </template>
        </v-list-item>
        <v-divider />
        <v-list-item title="最前面へ" :disabled="!hasSelection">
          <template #append>
            <span class="shortcut-text">Ctrl+Shift+]</span>
          </template>
        </v-list-item>
        <v-list-item title="1つ前面へ" :disabled="!hasSelection">
          <template #append>
            <span class="shortcut-text">Ctrl+]</span>
          </template>
        </v-list-item>
        <v-list-item title="1つ背面へ" :disabled="!hasSelection">
          <template #append>
            <span class="shortcut-text">Ctrl+[</span>
          </template>
        </v-list-item>
        <v-list-item title="最背面へ" :disabled="!hasSelection">
          <template #append>
            <span class="shortcut-text">Ctrl+Shift+[</span>
          </template>
        </v-list-item>
        <v-divider />
        <v-list-item title="ロック/アンロック" :disabled="!hasSelection">
          <template #append>
            <span class="shortcut-text">Ctrl+L</span>
          </template>
        </v-list-item>
        <v-list-item title="表示/非表示" :disabled="!hasSelection">
          <template #append>
            <span class="shortcut-text">Ctrl+H</span>
          </template>
        </v-list-item>
        <v-divider />
        <v-list-item title="コンテナに変換" :disabled="!hasSelection" />
        <v-list-item title="グループに変換" :disabled="!hasSelection" />
      </v-list>
    </v-menu>

    <!-- ヘルプメニュー -->
    <v-menu>
      <template #activator="{ props }">
        <v-btn v-bind="props" variant="text" size="x-small" class="menu-btn">ヘルプ</v-btn>
      </template>
      <v-list density="compact" min-width="180">
        <v-list-item title="キーボードショートカット一覧" />
        <v-list-item title="バージョン情報" />
      </v-list>
    </v-menu>
  </v-app-bar>
</template>

<style scoped>
.app-menu-bar {
  user-select: none;
}

.app-title {
  opacity: 0.7;
  white-space: nowrap;
}

.menu-btn {
  height: 28px !important;
  font-size: 12px !important;
  letter-spacing: 0;
  min-width: auto !important;
  padding: 0 8px !important;
}

.shortcut-text {
  font-size: 11px;
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.5;
  margin-left: 16px;
  white-space: nowrap;
}
</style>
