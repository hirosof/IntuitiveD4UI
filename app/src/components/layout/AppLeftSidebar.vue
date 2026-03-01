<script setup lang="ts">
/**
 * 左サイドバー
 *
 * v-navigation-drawer（location="left"、幅 240px）で構成する。
 * v-tabs + v-window で「ページ」と「ツールボックス」を切り替える。
 *
 * 設計書: pre-plans/basic-design/07-screen-layout.md セクション 5
 */
import { ref, computed } from 'vue'
import { useUIStore } from '@/stores/useUIStore'
import { useProjectStore } from '@/stores/useProjectStore'
import type { ToolType } from '@/stores/useUIStore'

const uiStore = useUIStore()
const projectStore = useProjectStore()

/** 現在選択中のタブ（0 = ページ, 1 = ツールボックス） */
const activeTab = ref(0)

const hasProject = computed(() => projectStore.hasProject)
const pages = computed(() => projectStore.pages)
const activePage = computed(() => projectStore.activePage)

// ============================================================
// ツールボックス: 基本図形リスト
// ============================================================

interface PaletteItem {
  label: string
  icon: string
  tool: ToolType
}

const basicShapes: PaletteItem[] = [
  { label: '矩形', icon: 'mdi-rectangle-outline', tool: 'rectangle' },
  { label: '楕円', icon: 'mdi-circle-outline', tool: 'ellipse' },
  { label: '線', icon: 'mdi-minus', tool: 'line' },
  { label: '矢印', icon: 'mdi-arrow-right', tool: 'arrow' },
  { label: 'テキスト', icon: 'mdi-format-text', tool: 'text' },
  { label: '画像', icon: 'mdi-image-outline', tool: 'image-placeholder' },
  { label: 'コンテナ', icon: 'mdi-card-outline', tool: 'container' },
]

const uiComponents: PaletteItem[] = [
  { label: 'ボタン', icon: 'mdi-gesture-tap-button', tool: 'select' },
  { label: '入力欄', icon: 'mdi-form-textbox', tool: 'select' },
  { label: 'ドロップダウン', icon: 'mdi-form-select', tool: 'select' },
  { label: 'チェックボックス', icon: 'mdi-checkbox-outline', tool: 'select' },
  { label: 'ラジオボタン', icon: 'mdi-radiobox-marked', tool: 'select' },
]

function selectTool(item: PaletteItem): void {
  uiStore.setTool(item.tool)
}
</script>

<template>
  <v-navigation-drawer
    :model-value="uiStore.panelVisibility.leftSidebar"
    location="left"
    :width="240"
    permanent
  >
    <!-- タブヘッダー -->
    <v-tabs v-model="activeTab" density="compact" grow>
      <v-tab :value="0" class="tab-label">ページ</v-tab>
      <v-tab :value="1" class="tab-label">ツール</v-tab>
    </v-tabs>
    <v-divider />

    <!-- タブコンテンツ -->
    <v-window v-model="activeTab" class="sidebar-window">

      <!-- ページタブ -->
      <v-window-item :value="0">
        <div v-if="!hasProject" class="empty-state">
          <v-icon icon="mdi-file-outline" size="32" class="mb-2 text-disabled" />
          <p class="text-caption text-disabled text-center">
            プロジェクトを開くか<br>新規作成してください
          </p>
        </div>

        <template v-else>
          <v-list density="compact" class="page-list">
            <v-list-item
              v-for="page in pages"
              :key="page.id"
              :value="page.id"
              :active="activePage?.id === page.id"
              :title="page.name"
              prepend-icon="mdi-file-outline"
              color="primary"
              rounded="sm"
              @click="projectStore.setActivePage(page.id)"
            >
              <template #subtitle>
                <span class="text-caption text-disabled">
                  {{ page.width }} × {{ page.height }} px
                </span>
              </template>
            </v-list-item>
          </v-list>

          <!-- ページ追加ボタン -->
          <div class="page-add-btn">
            <v-btn
              prepend-icon="mdi-plus"
              variant="tonal"
              size="small"
              block
              @click="projectStore.addPage(`ページ ${pages.length + 1}`)"
            >
              ページを追加
            </v-btn>
          </div>
        </template>
      </v-window-item>

      <!-- ツールボックスタブ -->
      <v-window-item :value="1">
        <v-expansion-panels variant="accordion" multiple :model-value="[0, 1]">
          <!-- 基本図形 -->
          <v-expansion-panel :value="0">
            <v-expansion-panel-title class="panel-title">基本図形</v-expansion-panel-title>
            <v-expansion-panel-text class="pa-0">
              <v-list density="compact" class="palette-list">
                <v-list-item
                  v-for="item in basicShapes"
                  :key="item.tool"
                  :prepend-icon="item.icon"
                  :title="item.label"
                  :active="uiStore.activeTool === item.tool"
                  color="primary"
                  rounded="sm"
                  @click="selectTool(item)"
                />
              </v-list>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <!-- UIコンポーネント -->
          <v-expansion-panel :value="1">
            <v-expansion-panel-title class="panel-title">UIコンポーネント</v-expansion-panel-title>
            <v-expansion-panel-text class="pa-0">
              <v-list density="compact" class="palette-list">
                <v-list-item
                  v-for="item in uiComponents"
                  :key="item.label"
                  :prepend-icon="item.icon"
                  :title="item.label"
                  rounded="sm"
                />
              </v-list>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-window-item>

    </v-window>
  </v-navigation-drawer>
</template>

<style scoped>
.tab-label {
  font-size: 12px;
  letter-spacing: 0;
}

.sidebar-window {
  flex: 1;
  overflow-y: auto;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
}

.page-list {
  padding: 4px 8px;
}

.page-add-btn {
  padding: 8px;
}

.panel-title {
  font-size: 12px !important;
  font-weight: 600;
  min-height: 36px !important;
}

.palette-list {
  padding: 4px 8px;
}

/* v-expansion-panel-text の padding をリセット */
:deep(.v-expansion-panel-text__wrapper) {
  padding: 0;
}
</style>
