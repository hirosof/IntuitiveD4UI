<script setup lang="ts">
/**
 * アプリケーションルートコンポーネント
 *
 * Vuetify の v-app をルートとして AppMainLayout を展開する。
 * TheCanvasStage を AppMainLayout のデフォルトスロットに渡す。
 * プロジェクト未選択時の表示制御は AppMainLayout 側で行う（hasProject チェック）。
 */
import AppMainLayout from '@/components/layout/AppMainLayout.vue'
import TheCanvasStage from '@/components/canvas/TheCanvasStage.vue'
</script>

<template>
  <v-app>
    <AppMainLayout>
      <TheCanvasStage />
    </AppMainLayout>
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
