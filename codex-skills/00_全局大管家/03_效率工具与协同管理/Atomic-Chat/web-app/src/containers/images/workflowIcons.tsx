import {
  IconArrowsDiagonal,
  IconBrush,
  IconPencil,
  IconPhotoUp,
  IconSparkles,
  IconWand,
  IconZoomScan,
  type IconProps,
} from '@tabler/icons-react'
import type { ComponentType } from 'react'

import type { ImageWorkflowId } from '@/services/diffusion/types'

/** One icon per workflow, shown by the form's mode selector. */
export const WORKFLOW_ICONS: Record<ImageWorkflowId, ComponentType<IconProps>> = {
  create: IconSparkles,
  transform: IconWand,
  inpaint: IconBrush,
  extend: IconArrowsDiagonal,
  upscale: IconZoomScan,
  reference: IconPhotoUp,
  edit: IconPencil,
}
