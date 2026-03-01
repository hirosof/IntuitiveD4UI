/**
 * アプリ全体設定ストア
 *
 * 責務:
 *   - アプリ起動をまたいで永続化される設定の管理
 *   - 最近開いたファイルの一覧管理
 *   - UIの表示設定（パネルの初期状態等）の永続化
 *   - IndexedDB の app-settings ストアとの同期（サービス経由）
 *
 * 設計書: pre-plans/basic-design/02-data-design.md セクション 5.3.2
 *         pre-plans/basic-design/08-module-structure.md セクション 6.1
 *
 * Note: IndexedDB 連携は フェーズ3 で実装する（settingsRepository.ts）。
 *       現時点ではインメモリ管理のみ。FileSystemFileHandle の永続化は
 *       fileHandleStore.ts で別途管理する（フェーズ1 Step ⑧）。
 */

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

// ============================================================
// ローカル型定義（このストア内でのみ使用）
// ============================================================

/**
 * 最近使ったファイルの情報
 * FileSystemFileHandle 自体は fileHandleStore で管理する。
 * ここでは表示用メタデータのみを保持する。
 */
export interface RecentFile {
  /** プロジェクトID */
  projectId: string
  /** プロジェクト名（表示用） */
  projectName: string
  /** ファイル名（表示用） */
  fileName: string
  /** 最後に開いた日時（ISO 8601） */
  lastOpenedAt: string
}

/**
 * UIの表示設定（セッション横断で永続化される設定）
 * ズーム倍率・パンオフセット等のセッション固有値はここに含めない。
 */
export interface UIPreferences {
  /** 左サイドバーの初期表示状態 */
  leftSidebarVisible: boolean
  /** 右サイドバーの初期表示状態 */
  rightSidebarVisible: boolean
}

/** 最近使ったファイルの最大件数 */
const RECENT_FILES_MAX = 10

/** UIPreferences のデフォルト値 */
const DEFAULT_UI_PREFERENCES: UIPreferences = {
  leftSidebarVisible: true,
  rightSidebarVisible: true,
}

// ============================================================
// Store 定義
// ============================================================

export const useAppSettingsStore = defineStore('appSettings', () => {
  // ============================================================
  // State
  // ============================================================

  /**
   * 最後に開いたプロジェクトのID
   * null = まだプロジェクトを開いたことがない
   */
  const lastOpenedProjectId = ref<string | null>(null)

  /** 最近使ったファイルの一覧（新しい順） */
  const recentFiles = ref<RecentFile[]>([])

  /** UIの表示設定 */
  const uiPreferences = ref<UIPreferences>({ ...DEFAULT_UI_PREFERENCES })

  /** 設定の読み込み状態 */
  const isLoaded = ref<boolean>(false)

  // ============================================================
  // Getters
  // ============================================================

  /** 最近使ったファイルが存在するか */
  const hasRecentFiles = computed<boolean>(() => recentFiles.value.length > 0)

  /** 最近使ったファイルの件数 */
  const recentFileCount = computed<number>(() => recentFiles.value.length)

  // ============================================================
  // Actions — 読み込み・保存
  // ============================================================

  /**
   * 設定を IndexedDB から読み込む
   * TODO: フェーズ3で settingsRepository.ts を実装後に接続する
   */
  async function loadSettings(): Promise<void> {
    if (isLoaded.value) return
    // TODO: settingsRepository.get('lastOpenedProjectId') を呼び出す
    // TODO: settingsRepository.get('recentFiles') を呼び出す
    // TODO: settingsRepository.get('uiPreferences') を呼び出す
    isLoaded.value = true
  }

  /**
   * 現在の設定を IndexedDB に保存する
   * TODO: フェーズ3で settingsRepository.ts を実装後に接続する
   */
  async function saveSettings(): Promise<void> {
    // TODO: settingsRepository.set('lastOpenedProjectId', lastOpenedProjectId.value) を呼び出す
    // TODO: settingsRepository.set('recentFiles', recentFiles.value) を呼び出す
    // TODO: settingsRepository.set('uiPreferences', uiPreferences.value) を呼び出す
  }

  // ============================================================
  // Actions — 最後に開いたプロジェクト
  // ============================================================

  /**
   * 最後に開いたプロジェクトIDを更新する
   * @param projectId プロジェクトID（null でクリア）
   */
  async function setLastOpenedProject(projectId: string | null): Promise<void> {
    lastOpenedProjectId.value = projectId
    await saveSettings()
  }

  // ============================================================
  // Actions — 最近使ったファイル
  // ============================================================

  /**
   * 最近使ったファイルの先頭に追加する（重複は除去して最新に更新）
   * @param file 追加するファイル情報
   */
  async function addRecentFile(file: Omit<RecentFile, 'lastOpenedAt'>): Promise<void> {
    // 同じ projectId のエントリを除去
    const filtered = recentFiles.value.filter((r) => r.projectId !== file.projectId)

    const newEntry: RecentFile = {
      ...file,
      lastOpenedAt: new Date().toISOString(),
    }

    // 先頭に追加し、上限を超えた分は切り捨て
    recentFiles.value = [newEntry, ...filtered].slice(0, RECENT_FILES_MAX)
    await saveSettings()
  }

  /**
   * 最近使ったファイルの一覧から指定エントリを除去する
   * @param projectId 除去対象のプロジェクトID
   */
  async function removeRecentFile(projectId: string): Promise<void> {
    recentFiles.value = recentFiles.value.filter((r) => r.projectId !== projectId)
    await saveSettings()
  }

  /**
   * 最近使ったファイルの一覧をすべてクリアする
   */
  async function clearRecentFiles(): Promise<void> {
    recentFiles.value = []
    await saveSettings()
  }

  // ============================================================
  // Actions — UI設定
  // ============================================================

  /**
   * UI設定を部分的に更新する
   * @param patch 更新する設定の部分オブジェクト
   */
  async function updateUIPreferences(patch: Partial<UIPreferences>): Promise<void> {
    uiPreferences.value = { ...uiPreferences.value, ...patch }
    await saveSettings()
  }

  /**
   * UI設定をデフォルト値にリセットする
   */
  async function resetUIPreferences(): Promise<void> {
    uiPreferences.value = { ...DEFAULT_UI_PREFERENCES }
    await saveSettings()
  }

  // ============================================================
  // Public API
  // ============================================================

  return {
    // State
    lastOpenedProjectId,
    recentFiles,
    uiPreferences,
    isLoaded,
    // Getters
    hasRecentFiles,
    recentFileCount,
    // Actions — 読み込み・保存
    loadSettings,
    saveSettings,
    // Actions — 最後に開いたプロジェクト
    setLastOpenedProject,
    // Actions — 最近使ったファイル
    addRecentFile,
    removeRecentFile,
    clearRecentFiles,
    // Actions — UI設定
    updateUIPreferences,
    resetUIPreferences,
  }
})
