import { useRef } from 'react'
import { IconSearch, IconX } from '@tabler/icons-react'
import { Loader } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/i18n/react-i18next-compat'

type HubSearchInputProps = {
  value: string
  onChange: (value: string) => void
  placeholder: string
  /** A search is running: a spinner stands in for the magnifier. */
  busy?: boolean
}

/**
 * The Hub's search box, the same in every category: the magnifier, the field,
 * and a cross that clears it while there is text.
 */
export function HubSearchInput({
  value,
  onChange,
  placeholder,
  busy = false,
}: HubSearchInputProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      {busy ? (
        <Loader className="size-4 shrink-0 animate-spin text-muted-foreground" />
      ) : (
        <IconSearch className="shrink-0 text-muted-foreground" size={14} />
      )}
      <input
        ref={inputRef}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        aria-label={placeholder}
        className="hub-models-search-input w-full min-w-0 flex-1 bg-transparent bg-clip-padding text-foreground shadow-none transition-none animate-none placeholder:text-muted-foreground focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
      />
      {value.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={t('hub:clearSearch')}
          onClick={() => {
            onChange('')
            inputRef.current?.focus()
          }}
        >
          <IconX size={14} className="text-muted-foreground" />
        </Button>
      )}
    </>
  )
}

type HubNoResultsProps = {
  message: string
  /** Present while a query is typed: the list is empty because of it. */
  onClearSearch?: () => void
}

/** An empty Hub list, with the way back out of the search that emptied it. */
export function HubNoResults({ message, onClearSearch }: HubNoResultsProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center gap-3 p-4 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      {onClearSearch && (
        <Button type="button" variant="outline" size="sm" onClick={onClearSearch}>
          {t('hub:clearSearch')}
        </Button>
      )}
    </div>
  )
}
