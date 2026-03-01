/**
 * プロジェクト・ページ・要素を管理する中心的ストア
 *
 * 責務:
 *   - Project / Page / ElementNode の CRUD
 *   - フラットマップ（elements）の管理
 *   - アクティブページの管理
 *   - レイアウト計算結果の提供（ドメイン層への委譲）
 *
 * 設計書: pre-plans/basic-design/02-data-design.md,
 *         pre-plans/basic-design/08-module-structure.md セクション 6.1
 */

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { nanoid } from 'nanoid'

import type { Project, ProjectSettings, Page } from '@/types/projectTypes'
import type { ElementNode } from '@/types/elementTypes'
import type { LayoutResult } from '@/types/layoutTypes'
import { DEFAULT_PROJECT_SETTINGS, CURRENT_FORMAT_VERSION } from '@/types/projectTypes'

export const useProjectStore = defineStore('project', () => {
  // ============================================================
  // State
  // ============================================================

  /** 現在開いているプロジェクト（未オープン時は null） */
  const project = ref<Project | null>(null)

  /** 現在表示中のページID */
  const activePageId = ref<string>('')

  // ============================================================
  // Getters
  // ============================================================

  /** 現在プロジェクトが開かれているか */
  const hasProject = computed<boolean>(() => project.value !== null)

  /** ページ一覧（表示順） */
  const pages = computed<Page[]>(() => project.value?.pages ?? [])

  /** アクティブページ */
  const activePage = computed<Page | undefined>(() =>
    project.value?.pages.find((p) => p.id === activePageId.value),
  )

  /** アクティブページの要素フラットマップ */
  const activeElements = computed<Record<string, ElementNode>>(
    () => activePage.value?.elements ?? {},
  )

  /** アクティブページのルート要素ID配列 */
  const rootElementIds = computed<string[]>(() => activePage.value?.rootElementIds ?? [])

  // ============================================================
  // Actions — プロジェクト管理
  // ============================================================

  /** 新規プロジェクトを作成してアクティブにする */
  function createProject(name: string, pageWidth = 1920, pageHeight = 1080): void {
    const firstPage: Page = _createPage('ページ 1', pageWidth, pageHeight, 0)
    project.value = {
      formatVersion: CURRENT_FORMAT_VERSION,
      id: `proj-${nanoid()}`,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: structuredClone(DEFAULT_PROJECT_SETTINGS),
      pages: [firstPage],
    }
    activePageId.value = firstPage.id
  }

  /** 読み込んだプロジェクトをストアに展開する */
  function loadProject(loaded: Project): void {
    project.value = loaded
    activePageId.value = loaded.pages[0]?.id ?? ''
  }

  /** プロジェクトを閉じる */
  function closeProject(): void {
    project.value = null
    activePageId.value = ''
  }

  /** プロジェクト設定を更新する */
  function updateProjectSettings(changes: Partial<ProjectSettings>): void {
    if (!project.value) return
    project.value.settings = { ...project.value.settings, ...changes }
    _touch()
  }

  // ============================================================
  // Actions — ページ管理
  // ============================================================

  /** 新しいページを追加し、追加したページのIDを返す */
  function addPage(name: string, width = 1920, height = 1080): string {
    if (!project.value) return ''
    const page = _createPage(name, width, height, project.value.pages.length)
    project.value.pages.push(page)
    _touch()
    return page.id
  }

  /** ページを削除する（最後の1ページは削除不可） */
  function removePage(pageId: string): void {
    if (!project.value) return
    if (project.value.pages.length <= 1) return

    const idx = project.value.pages.findIndex((p) => p.id === pageId)
    if (idx === -1) return

    project.value.pages.splice(idx, 1)
    project.value.pages.forEach((p, i) => {
      p.order = i
    })

    if (activePageId.value === pageId) {
      // noUncheckedIndexedAccess: 配列アクセス前にページが存在することを確認
      const fallback = project.value.pages[Math.max(0, idx - 1)]
      if (fallback) {
        activePageId.value = fallback.id
      }
    }
    _touch()
  }

  /** ページの表示順を変更する */
  function reorderPages(orderedPageIds: string[]): void {
    if (!project.value) return
    const pageMap = new Map(project.value.pages.map((p) => [p.id, p]))
    const reordered = orderedPageIds
      .map((id, i) => {
        const p = pageMap.get(id)
        if (p) p.order = i
        return p
      })
      .filter((p): p is Page => p !== undefined)
    project.value.pages = reordered
    _touch()
  }

  /** アクティブページを切り替える */
  function setActivePage(pageId: string): void {
    if (!project.value) return
    if (!project.value.pages.find((p) => p.id === pageId)) return
    activePageId.value = pageId
  }

  /** ページサイズを変更する */
  function resizePage(pageId: string, width: number, height: number): void {
    const page = _getPage(pageId)
    if (!page) return
    page.width = width
    page.height = height
    _touch()
  }

  // ============================================================
  // Actions — 要素管理
  // ============================================================

  /**
   * アクティブページに要素を追加する
   * @param element 追加する要素（id・parentId は呼び出し元で設定済みであること）
   * @param targetParentId 親要素のID（省略時はルートに追加）
   * @param insertIndex 挿入位置（省略時は末尾）
   */
  function addElement(element: ElementNode, targetParentId?: string, insertIndex?: number): void {
    const page = activePage.value
    if (!page || !project.value) return

    page.elements[element.id] = element

    if (targetParentId) {
      const parent = page.elements[targetParentId]
      if (parent) {
        if (insertIndex !== undefined) {
          parent.childrenIds.splice(insertIndex, 0, element.id)
        } else {
          parent.childrenIds.push(element.id)
        }
      }
    } else {
      if (insertIndex !== undefined) {
        page.rootElementIds.splice(insertIndex, 0, element.id)
      } else {
        page.rootElementIds.push(element.id)
      }
    }
    _touch()
  }

  /**
   * 要素のプロパティを部分更新する
   * Note: ElementNode は Discriminated Union のため、型安全な更新は呼び出し元で保証すること
   */
  function updateElement(id: string, changes: Partial<ElementNode>): void {
    const page = activePage.value
    if (!page || !project.value) return
    const element = page.elements[id]
    if (!element) return
    Object.assign(element, changes)
    _touch()
  }

  /** 要素1件とその子孫を削除する */
  function removeElement(id: string): void {
    removeElements([id])
  }

  /** 複数の要素とそれらの子孫を削除する */
  function removeElements(ids: string[]): void {
    const page = activePage.value
    if (!page || !project.value) return

    // 削除対象IDとその全子孫を収集
    const toDelete = new Set<string>()
    const collect = (elementId: string) => {
      toDelete.add(elementId)
      const el = page.elements[elementId]
      el?.childrenIds.forEach(collect)
    }
    ids.forEach(collect)

    // ルートIDリストから除去
    page.rootElementIds = page.rootElementIds.filter((id) => !toDelete.has(id))

    // 全要素の childrenIds から除去
    for (const el of Object.values(page.elements)) {
      el.childrenIds = el.childrenIds.filter((id) => !toDelete.has(id))
    }

    // フラットマップから削除
    for (const id of toDelete) {
      delete page.elements[id]
    }
    _touch()
  }

  /**
   * コンテナまたはルートの childrenIds を並べ替える
   * （Zオーダー変更・Flex/Grid レイアウト内の順序変更に使用）
   * @param parentId null の場合は rootElementIds を並べ替える
   */
  function reorderChildren(parentId: string | null, newChildrenIds: string[]): void {
    const page = activePage.value
    if (!page || !project.value) return

    if (parentId === null) {
      page.rootElementIds = newChildrenIds
    } else {
      const parent = page.elements[parentId]
      if (parent) {
        parent.childrenIds = newChildrenIds
      }
    }
    _touch()
  }

  /**
   * 要素の親子関係を変更する（コンテナ間移動・ルートへの移動）
   * @param elementId 移動する要素のID
   * @param newParentId 新しい親のID（null でルートに移動）
   * @param insertIndex 挿入位置（省略時は末尾）
   */
  function reparentElement(
    elementId: string,
    newParentId: string | null,
    insertIndex?: number,
  ): void {
    const page = activePage.value
    if (!page || !project.value) return

    const element = page.elements[elementId]
    if (!element) return

    const oldParentId = element.parentId

    // 古い親から除去
    if (oldParentId === null) {
      page.rootElementIds = page.rootElementIds.filter((id) => id !== elementId)
    } else {
      const oldParent = page.elements[oldParentId]
      if (oldParent) {
        oldParent.childrenIds = oldParent.childrenIds.filter((id) => id !== elementId)
      }
    }

    // 新しい親に追加
    element.parentId = newParentId
    if (newParentId === null) {
      if (insertIndex !== undefined) {
        page.rootElementIds.splice(insertIndex, 0, elementId)
      } else {
        page.rootElementIds.push(elementId)
      }
    } else {
      const newParent = page.elements[newParentId]
      if (newParent) {
        if (insertIndex !== undefined) {
          newParent.childrenIds.splice(insertIndex, 0, elementId)
        } else {
          newParent.childrenIds.push(elementId)
        }
      }
    }
    _touch()
  }

  // ============================================================
  // Actions — グループ・コンテナ変換
  // ============================================================

  /**
   * 複数の要素をグループ化する
   * @param elementIds グループ化する要素のID配列（同一親であること）
   * @returns 作成されたグループ要素のID
   * @todo バウンディングボックス計算、座標変換の実装
   */
  function groupify(elementIds: string[]): string {
    const page = activePage.value
    if (!page || !project.value) return ''
    if (elementIds.length < 2) return ''

    const groupId = `elem-${nanoid()}`
    // TODO: バウンディングボックス計算・座標変換を実装する（フェーズ1 Step⑦）
    _touch()
    return groupId
  }

  /**
   * グループを解除する（子要素を親に昇格させる）
   * @todo 座標変換の実装
   */
  function ungroupify(groupId: string): void {
    const page = activePage.value
    if (!page || !project.value) return
    const element = page.elements[groupId]
    if (!element || element.type !== 'group') return
    // TODO: 子要素を親に昇格させる実装（フェーズ1 Step⑦）
    _touch()
  }

  /**
   * グループをコンテナに変換する
   * layout / padding / overflow をデフォルト値で追加する
   * @todo Discriminated Union の制約上、型キャストが必要な箇所の実装
   */
  function convertGroupToContainer(groupId: string): void {
    const page = activePage.value
    if (!page || !project.value) return
    const element = page.elements[groupId]
    if (!element || element.type !== 'group') return
    // TODO: type変更・layout/padding/overflow の追加実装（フェーズ1 Step⑦）
    _touch()
  }

  /**
   * コンテナをグループに変換する
   * layout / padding / overflow を除去する
   * @todo Flex/Grid レイアウト時の確認ダイアログ連携実装
   */
  function convertContainerToGroup(containerId: string): void {
    const page = activePage.value
    if (!page || !project.value) return
    const element = page.elements[containerId]
    if (!element || element.type !== 'container') return
    // TODO: type変更・layout/padding/overflow の除去実装（フェーズ1 Step⑦）
    _touch()
  }

  // ============================================================
  // Actions — レイアウト計算（ドメイン層への委譲）
  // ============================================================

  /**
   * コンテナの子要素のレイアウト計算結果を返す
   * ドメイン層の calculateLayout() 関数を呼び出す
   * @todo domain/layout/calculateLayout の実装後に接続する（フェーズ1 Step⑥）
   */
  function getLayoutResults(
    _containerId: string,
    _effectiveSize: { width: number; height: number },
  ): LayoutResult[] {
    // TODO: calculateLayout() を呼び出す実装（フェーズ1 Step⑥）
    return []
  }

  // ============================================================
  // Private helpers
  // ============================================================

  function _createPage(name: string, width: number, height: number, order: number): Page {
    return {
      id: `page-${nanoid()}`,
      name,
      width,
      height,
      order,
      rootElementIds: [],
      elements: {},
    }
  }

  function _getPage(pageId: string): Page | undefined {
    return project.value?.pages.find((p) => p.id === pageId)
  }

  function _touch(): void {
    if (project.value) {
      project.value.updatedAt = new Date().toISOString()
    }
  }

  // ============================================================
  // Public API
  // ============================================================

  return {
    // State
    project,
    activePageId,
    // Getters
    hasProject,
    pages,
    activePage,
    activeElements,
    rootElementIds,
    // Actions — プロジェクト
    createProject,
    loadProject,
    closeProject,
    updateProjectSettings,
    // Actions — ページ
    addPage,
    removePage,
    reorderPages,
    setActivePage,
    resizePage,
    // Actions — 要素
    addElement,
    updateElement,
    removeElement,
    removeElements,
    reorderChildren,
    reparentElement,
    // Actions — グループ・コンテナ変換
    groupify,
    ungroupify,
    convertGroupToContainer,
    convertContainerToGroup,
    // Actions — レイアウト計算
    getLayoutResults,
  }
})
