import { Button } from '@/components/ui/button'
import { useTranslation } from '@/i18n/react-i18next-compat'
import { HUGGINGFACE_LOGO_SRC } from '@/lib/model-logo'

/** The picker stays runnable-only; this action leaves for the full Model Hub. */
export function HuggingFaceAction({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation()
  const label = t('common:modelPicker.downloadFromHuggingFace')

  return (
    <div className="shrink-0 border-t p-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        aria-label={label}
        onClick={onClick}
        className="w-full min-w-0"
        data-testid="model-picker-hugging-face-action"
      >
        <img
          src={HUGGINGFACE_LOGO_SRC}
          alt=""
          aria-hidden
          draggable={false}
          className="size-4 shrink-0 object-contain"
        />
        <span className="min-w-0 truncate">{label}</span>
      </Button>
    </div>
  )
}

/** Concise runnable-model empty/search state; the footer owns the Hub action. */
export function ModelPickerEmptyState({ query }: { query: string }) {
  const searching = query.trim().length > 0
  const { t } = useTranslation()
  return (
    <div className="px-3 py-4" data-testid="model-picker-empty">
      <div className="py-1.5 text-sm text-muted-foreground">
        {searching
          ? t('common:noModelsFoundFor', { searchValue: query })
          : t('common:modelPicker.noRunnableModels')}
      </div>
    </div>
  )
}
