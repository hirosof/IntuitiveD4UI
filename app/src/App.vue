<script setup lang="ts">
/**
 * アプリケーションルートコンポーネント
 *
 * Vuetify の v-app をルートとして AppMainLayout を展開する。
 * TheCanvasStage を AppMainLayout のデフォルトスロットに渡す。
 * プロジェクト未選択時の表示制御は AppMainLayout 側で行う（hasProject チェック）。
 *
 * グローバルダイアログは v-app の直下に配置し、
 * どのコンポーネントからでも useUIStore 経由で開閉できる。
 */
import AppMainLayout from '@/components/layout/AppMainLayout.vue'
import TheCanvasStage from '@/components/canvas/TheCanvasStage.vue'
import NewProjectDialog from '@/components/dialogs/NewProjectDialog.vue'
</script>

<template>
  <v-app>
    <AppMainLayout>
      <TheCanvasStage />
    </AppMainLayout>

    <!-- グローバルダイアログ: v-app 直下に配置 -->
    <NewProjectDialog />
  </v-app>
</template>

<style>
/* グローバルリセット: スクロールバーの出現を防ぐ */
html,
body {
  overflow: hidden;
  height: 100%;
}

#app {
  height: 100%;
}
</style>
