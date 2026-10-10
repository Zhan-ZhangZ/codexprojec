import {
  useImageArtifact,
  type ImageArtifactState,
} from '@/hooks/useImageArtifact'
import { useImageForm } from '@/hooks/useImageForm'
import { useSelectedArtifact } from '@/hooks/useVideoSetting'
import { parseArtifactId } from '@/lib/diffusion/models'
import { familySupportsWorkflow } from '@/lib/diffusion/workflows'
import type { DiffusionModality } from '@/services/diffusion/types'
import { useImageGenerationStore } from '@/stores/image-generation-store'

export type MediaTarget = {
  /** The checkpoint the page works with; null when it has none it can use. */
  artifactId: string | null
  /** Its family, from the catalog or, for a model it does not know, the id. */
  familyId: string | null
  artifact: ImageArtifactState
}

/**
 * The checkpoint an Images or Video page works with: the one its model
 * picker shows, the form is shaped for, and Generate runs (starting it
 * first when it is stopped).
 *
 * The resident or in-flight model comes first when it suits the page — its
 * modality and, on Images, the workflow — then the user's installed pick.
 * An intentionally stopped model therefore stays the target, so Generate
 * can start it again without a trip through the list.
 */
export function useMediaTarget(modality: DiffusionModality): MediaTarget {
  const status = useImageGenerationStore((state) => state.status)
  const loadingArtifactId = useImageGenerationStore(
    (state) => state.loadingArtifactId
  )
  const unloadingArtifactId = useImageGenerationStore(
    (state) => state.unloadingArtifactId
  )
  const { selectedArtifactId } = useSelectedArtifact(modality)
  const workflow = useImageForm((state) => state.workflow)
  const runtimeArtifactId =
    status?.model.loaded?.modelId ?? loadingArtifactId ?? unloadingArtifactId
  const runtime = useImageArtifact(runtimeArtifactId ?? '')
  const selected = useImageArtifact(selectedArtifactId ?? '')

  const runtimeFamilyId =
    runtime.family?.id ??
    parseArtifactId(runtimeArtifactId ?? '')?.family ??
    null
  // The catalog names the modality of a family it knows; for one it does
  // not, the core's own report of the resident model does.
  const runtimeModality =
    runtime.family?.modality ?? status?.model.loaded?.modality ?? null
  const runtimeCompatible =
    Boolean(runtimeArtifactId) &&
    (runtimeModality === null || runtimeModality === modality) &&
    (modality === 'video' ||
      runtimeFamilyId === null ||
      familySupportsWorkflow(runtimeFamilyId, workflow))
  const selectedFamilyId =
    selected.family?.id ??
    parseArtifactId(selectedArtifactId ?? '')?.family ??
    null
  const selectedCompatible =
    Boolean(selectedArtifactId && selected.complete) &&
    (selected.family === null || selected.family.modality === modality) &&
    (modality === 'video' ||
      selectedFamilyId === null ||
      familySupportsWorkflow(selectedFamilyId, workflow))
  // A resident model is usable as it is; a stopped pick only once every
  // file it needs is on disk.
  const artifactId = runtimeCompatible
    ? runtimeArtifactId
    : selectedCompatible
      ? selectedArtifactId
      : null
  const artifact = useImageArtifact(artifactId ?? '')

  return {
    artifactId,
    familyId:
      artifact.family?.id ?? parseArtifactId(artifactId ?? '')?.family ?? null,
    artifact,
  }
}
