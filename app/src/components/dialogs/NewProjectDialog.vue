<script setup lang="ts">
/**
 * 新規プロジェクト作成ダイアログ
 *
 * ユーザーが「プロジェクト名」と「キャンバスサイズ」を設定して
 * 新規プロジェクトを作成するためのダイアログ。
 *
 * - ダイアログの開閉状態は useUIStore.newProjectDialogVisible で一元管理する
 * - 送信時に projectStore.createProject(name, width, height) を呼び出す
 * - ダイアログを開くたびにフォームをリセットする（watch で検知）
 *
 * 設計書: pre-plans/basic-design/03-canvas-rendering.md セクション 5.1.1
 */
import { ref, computed, watch } from 'vue'
import { useProjectStore } from '@/stores/useProjectStore'
import { useUIStore } from '@/stores/useUIStore'

const projectStore = useProjectStore()
const uiStore = useUIStore()

// ============================================================
// キャンバスサイズプリセット
// ============================================================

interface CanvasPreset {
  id: string
  /** v-select に表示するラベル */
  label: string
  width: number
  height: number
}

const CANVAS_PRESETS: CanvasPreset[] = [
  { id: 'web-1920', label: 'Web（1920 × 1080 px）', width: 1920, height: 1080 },
  { id: 'web-1366', label: 'Web（1366 × 768 px）', width: 1366, height: 768 },
  { id: 'web-1280', label: 'Web（1280 × 800 px）', width: 1280, height: 800 },
  { id: 'tablet-h', label: 'タブレット横（1024 × 768 px）', width: 1024, height: 768 },
  { id: 'tablet-v', label: 'タブレット縦（768 × 1024 px）', width: 768, height: 1024 },
  { id: 'mobile', label: 'モバイル（390 × 844 px）', width: 390, height: 844 },
  { id: 'custom', label: 'カスタム', width: -1, height: -1 },
]

// ============================================================
// フォーム状態
// ============================================================

/** プロジェクト名 */
const projectName = ref<string>('新規プロジェクト')

/** 選択中のプリセット ID */
const selectedPresetId = ref<string>('web-1920')

/** カスタムサイズ: 幅（px） */
const customWidth = ref<number>(1920)

/** カスタムサイズ: 高さ（px） */
const customHeight = ref<number>(1080)

/** 選択中のプリセットオブジェクト */
const selectedPreset = computed<CanvasPreset | undefined>(() =>
  CANVAS_PRESETS.find((p) => p.id === selectedPresetId.value),
)

/** カスタムサイズが選択されているか */
const isCustom = computed<boolean>(() => selectedPresetId.value === 'custom')

/** 確定済みの幅（px） */
const resolvedWidth = computed<number>(() =>
  isCustom.value ? customWidth.value : (selectedPreset.value?.width ?? 1920),
)

/** 確定済みの高さ（px） */
const resolvedHeight = computed<number>(() =>
  isCustom.value ? customHeight.value : (selectedPreset.value?.height ?? 1080),
)

// ============================================================
// ダイアログ開閉と連動したフォームリセット
// ============================================================

const formRef = ref<{ validate: () => Promise<{ valid: boolean }>; resetValidation: () => void } | null>(null)

watch(
  () => uiStore.newProjectDialogVisible,
  (visible) => {
    if (visible) {
      // 開くたびに初期値に戻す
      projectName.value = '新規プロジェクト'
      selectedPresetId.value = 'web-1920'
      customWidth.value = 1920
      customHeight.value = 1080
      // バリデーションエラー表示もリセット
      formRef.value?.resetValidation()
    }
  },
)

// ============================================================
// バリデーションルール
// ============================================================

const nameRules = [
  (v: string) => !!v?.trim() || 'プロジェクト名を入力してください',
  (v: string) => v?.trim().length <= 100 || '100文字以内で入力してください',
]

const sizeRules = [
  (v: number | string) => {
    const n = Number(v)
    return (!isNaN(n) && n >= 1 && n <= 10000) || '1〜10000 の数値を入力してください'
  },
]

// ============================================================
// アクション
// ============================================================

/** 「作成」ボタン押下時の処理 */
async function onSubmit(): Promise<void> {
  const result = await formRef.value?.validate()
  if (!result?.valid) return

  projectStore.createProject(
    projectName.value.trim(),
    resolvedWidth.value,
    resolvedHeight.value,
  )
  uiStore.closeNewProjectDialog()
}

/** 「キャンセル」ボタン押下時の処理 */
function onCancel(): void {
  uiStore.closeNewProjectDialog()
}
</script>

<template>
  <v-dialog
    v-model="uiStore.newProjectDialogVisible"
    max-width="440"
  >
    <v-card>
      <!-- タイトル -->
      <v-card-title class="pt-5 px-6 text-subtitle-1 font-weight-medium">
        新規プロジェクト
      </v-card-title>

      <v-card-text class="px-6 pb-2">
        <v-form ref="formRef" @submit.prevent="onSubmit">
          <!-- プロジェクト名 -->
          <p class="text-caption text-medium-emphasis mb-1">プロジェクト名</p>
          <v-text-field
            v-model="projectName"
            variant="outlined"
            density="compact"
            :rules="nameRules"
            autofocus
            class="mb-5"
          />

          <!-- キャンバスサイズ プリセット選択 -->
          <p class="text-caption text-medium-emphasis mb-1">キャンバスサイズ</p>
          <v-select
            v-model="selectedPresetId"
            :items="CANVAS_PRESETS"
            item-title="label"
            item-value="id"
            variant="outlined"
            density="compact"
            class="mb-1"
          />

          <!-- カスタムサイズ入力（「カスタム」選択時にスライドイン） -->
          <v-expand-transition>
            <div v-if="isCustom" class="d-flex align-center ga-2 mb-2">
              <v-text-field
                v-model.number="customWidth"
                label="幅 (px)"
                variant="outlined"
                density="compact"
                type="number"
                :rules="sizeRules"
              />
              <span class="text-body-2 text-disabled flex-shrink-0">×</span>
              <v-text-field
                v-model.number="customHeight"
                label="高さ (px)"
                variant="outlined"
                density="compact"
                type="number"
                :rules="sizeRules"
              />
            </div>
          </v-expand-transition>

          <!-- 選択中サイズの表示（カスタム以外） -->
          <p v-if="!isCustom" class="text-caption text-disabled mb-2">
            {{ resolvedWidth }} × {{ resolvedHeight }} px
          </p>
        </v-form>
      </v-card-text>

      <!-- アクションボタン -->
      <v-card-actions class="pb-4 px-6">
        <v-spacer />
        <v-btn variant="text" @click="onCancel">キャンセル</v-btn>
        <v-btn variant="tonal" color="primary" @click="onSubmit">作成</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
