import { useEffect, useMemo, type ReactNode } from 'react'
import HeaderPage from '@/containers/HeaderPage'
import { HubNoResults, HubSearchInput } from '@/containers/hub/HubSearch'
import { MediaFamilyDetailPanel } from '@/containers/hub/MediaFamilyDetailPanel'
import { MediaFamilyRow } from '@/containers/hub/MediaFamilyRow'
import { useTranslation } from '@/i18n/react-i18next-compat'
import {
  filterFamiliesBySearch,
  mediaFamilies,
  splitByInstalled,
} from '@/lib/hub-media'
import { cn } from '@/lib/utils'
import type { DiffusionModality } from '@/services/diffusion/types'
import type { DiffusionCatalogFamily } from '@/services/diffusion-catalog-registry'
import { useImageGenerationStore } from '@/stores/image-generation-store'

export type MediaHubProps = {
  modality: DiffusionModality
  /** The Chat / Images / Video switch, painted above the list. */
  categoryTabs?: ReactNode
  query: string
  onQueryChange: (query: string) => void
  /** Family id named by the URL. */
  selectedFamilyId: string | null
  onSelectFamily: (familyId: string, options?: { replace?: boolean }) => void
}

/**
 * The Hub's Images and Video categories: the curated diffusion catalog in the
 * Hub's two-column layout. Installed families come first; the search box
 * narrows the list by name, developer, description or repo.
 */
export function MediaHub({
  modality,
  categoryTabs,
  query,
  onQueryChange,
  selectedFamilyId,
  onSelectFamily,
}: MediaHubProps) {
  const { t } = useTranslation()
  const catalog = useImageGenerationStore((state) => state.catalog)
  const installedArtifacts = useImageGenerationStore(
    (state) => state.installedArtifacts
  )

  const families = useMemo(
    () => mediaFamilies(catalog, modality),
    [catalog, modality]
  )
  const installedIds = useMemo(
    () => new Set(installedArtifacts.map((artifact) => artifact.id)),
    [installedArtifacts]
  )
  const sections = useMemo(
    () =>
      splitByInstalled(filterFamiliesBySearch(families, query), installedIds),
    [families, query, installedIds]
  )

  // Resolved against the whole catalog, not the filtered list: typing a search
  // that hides the open family should not blank the panel beside it.
  const selectedFamily =
    families.find((family) => family.id === selectedFamilyId) ?? null
  const firstFamilyId = (sections.installed[0] ?? sections.available[0])?.id

  // Open on a populated panel, as the Chat category does.
  useEffect(() => {
    if (selectedFamily || !firstFamilyId) return
    onSelectFamily(firstFamilyId, { replace: true })
  }, [selectedFamily, firstFamilyId, onSelectFamily])

  const placeholder =
    modality === 'video'
      ? t('hub:searchVideoPlaceholder')
      : t('hub:searchImagePlaceholder')
  const isEmpty =
    sections.installed.length === 0 && sections.available.length === 0

  const renderSection = (
    label: string,
    items: DiffusionCatalogFamily[],
    installed: boolean
  ) =>
    items.length > 0 && (
      <section>
        <h2 className="px-2 pb-2 pt-4 text-base font-semibold text-foreground">
          {label}
        </h2>
        <div className="flex flex-col gap-1">
          {items.map((family) => (
            <MediaFamilyRow
              key={family.id}
              family={family}
              installed={installed}
              selected={family.id === selectedFamily?.id}
              onSelect={() => onSelectFamily(family.id)}
            />
          ))}
        </div>
      </section>
    )

  return (
    <div className="grid h-svh w-full grid-cols-[minmax(320px,420px)_1fr] grid-rows-[auto_minmax(0,1fr)]">
      <HeaderPage>
        <div
          className={cn(
            'relative z-20 flex h-10 w-full items-center gap-2 py-3 pr-3',
            !IS_MACOS && !IS_WINDOWS && 'pr-30'
          )}
          {...(IS_WINDOWS || IS_MACOS
            ? { 'data-tauri-drag-region': true }
            : {})}
        >
          <HubSearchInput
            value={query}
            onChange={onQueryChange}
            placeholder={placeholder}
          />
        </div>
      </HeaderPage>

      <div className="col-start-1 row-start-2 flex min-h-0 min-w-0 flex-col border-r border-border">
        {categoryTabs && (
          <div className="border-b border-border p-3">{categoryTabs}</div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {!catalog ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              {t('images:model.loadingCatalog')}
            </p>
          ) : isEmpty ? (
            <HubNoResults
              message={t('hub:noModels')}
              onClearSearch={
                query.length > 0 ? () => onQueryChange('') : undefined
              }
            />
          ) : (
            <>
              {renderSection(
                t('images:model.installed'),
                sections.installed,
                true
              )}
              {renderSection(
                t('images:model.available'),
                sections.available,
                false
              )}
            </>
          )}
        </div>
      </div>

      <div className="col-start-2 row-span-2 row-start-1 min-h-0 min-w-0 overflow-y-auto">
        <MediaFamilyDetailPanel family={selectedFamily} />
      </div>
    </div>
  )
}
