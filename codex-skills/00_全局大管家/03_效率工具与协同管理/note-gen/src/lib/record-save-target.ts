import { getTags } from '@/db/tags'
import {
  resolveRecordSaveTargetId,
  type RecordSaveTargetMode,
} from '@/lib/record-save-preferences'
import useSettingStore from '@/stores/setting'
import useTagStore from '@/stores/tag'

export async function getDefaultRecordSaveTagId(): Promise<number> {
  const tags = await getTags()
  const currentTagId = useTagStore.getState().currentTagId
  const {
    recordSaveTargetMode,
    fixedRecordTagId,
    lastRecordTagId,
  } = useSettingStore.getState()

  return resolveRecordSaveTargetId({
    mode: recordSaveTargetMode,
    currentTagId,
    lastTagId: lastRecordTagId,
    fixedTagId: fixedRecordTagId,
    availableTagIds: tags.map((tag) => tag.id),
  })
}

export function getRecordSaveTagIdFromTags({
  mode,
  currentTagId,
  lastTagId,
  fixedTagId,
  tagIds,
}: {
  mode: RecordSaveTargetMode
  currentTagId: number
  lastTagId: number | null
  fixedTagId: number | null
  tagIds: number[]
}): number {
  return resolveRecordSaveTargetId({
    mode,
    currentTagId,
    lastTagId,
    fixedTagId,
    availableTagIds: tagIds,
  })
}
