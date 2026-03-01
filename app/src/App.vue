<script setup lang="ts">
/**
 * アプリケーションルートコンポーネント
 *
 * Vuetify の v-app をルートとして AppMainLayout を展開する。
 * キャンバスエリアは Step ④ で TheCanvasStage に差し替える。
 */
import AppMainLayout from '@/components/layout/AppMainLayout.vue'
</script>

<template>
  <v-app>
    <AppMainLayout />
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
