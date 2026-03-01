<script setup lang="ts">
/**
 * アプリケーション全体レイアウト統合コンポーネント
 *
 * 以下の6コンポーネントを組み合わせ、画面全体のレイアウトを構成する:
 *   - AppMenuBar    : 上端固定メニューバー（32px, v-app-bar）
 *   - AppLeftSidebar : 左サイドバー（240px, v-navigation-drawer）
 *   - AppRightSidebar: 右サイドバー（280px, v-navigation-drawer）
 *   - AppToolbar    : ツールバー（40px, v-main 内上部）
 *   - AppStatusBar  : 下端固定ステータスバー（24px, v-footer）
 *   - v-main        : キャンバスエリア（残余スペース）
 *
 * キャンバスエリアは #default スロットで受け取る（Step ④ で TheCanvasStage を渡す）。
 *
 * 設計書: pre-plans/basic-design/07-screen-layout.md セクション 2
 *         pre-plans/basic-design/08-module-structure.md セクション 5.1
 */
import AppMenuBar from './AppMenuBar.vue'
import AppToolbar from './AppToolbar.vue'
import AppLeftSidebar from './AppLeftSidebar.vue'
import AppRightSidebar from './AppRightSidebar.vue'
import AppStatusBar from './AppStatusBar.vue'
</script>

<template>
  <!-- メニューバー（v-app-bar: レイアウト上端に固定） -->
  <AppMenuBar />

  <!-- 左サイドバー（v-navigation-drawer: 左端） -->
  <AppLeftSidebar />

  <!-- 右サイドバー（v-navigation-drawer: 右端） -->
  <AppRightSidebar />

  <!-- ステータスバー（v-footer: 下端固定） -->
  <AppStatusBar />

  <!-- メインコンテンツエリア（v-main: 残余スペースを埋める） -->
  <v-main class="main-area">
    <!-- ツールバー（v-main 内上部、CSS で高さ確保） -->
    <AppToolbar />

    <!-- キャンバスエリア（残余スペース、Step ④ で TheCanvasStage が入る） -->
    <div class="canvas-area">
      <slot>
        <!-- フォールバック: プロジェクト未作成時のウェルカム画面 -->
        <div class="welcome-screen">
          <v-icon icon="mdi-vector-square" size="64" class="mb-4" color="primary" opacity="0.4" />
          <h2 class="text-h6 mb-2 text-medium-emphasis">Intuitive D4UI</h2>
          <p class="text-body-2 text-disabled mb-6">
            ワイヤーフレーム作成ツール
          </p>
          <div class="d-flex gap-3">
            <v-btn
              prepend-icon="mdi-file-plus-outline"
              variant="tonal"
              color="primary"
            >
              新規プロジェクト
            </v-btn>
            <v-btn
              prepend-icon="mdi-folder-open-outline"
              variant="outlined"
            >
              開く
            </v-btn>
          </div>
        </div>
      </slot>
    </div>
  </v-main>
</template>

<style scoped>
.main-area {
  /* v-main は padding-top/left/right/bottom を Vuetify が自動管理する */
  display: flex;
  flex-direction: column;
}

/* v-main の内部コンテナに flex column を適用するため deep セレクタを使用 */
:deep(.v-main__scroller) {
  display: flex;
  flex-direction: column;
  /* キャンバスが v-main 全体を埋めるようにする */
  height: 100%;
  overflow: hidden;
}

.canvas-area {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  position: relative;
  background-color: rgb(var(--v-theme-surface-variant));
}

/* ウェルカム画面（プロジェクト未作成時） */
.welcome-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 32px;
}
</style>
