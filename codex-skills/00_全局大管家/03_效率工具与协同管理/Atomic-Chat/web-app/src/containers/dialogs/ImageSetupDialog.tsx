import { memo, useCallback } from 'react'
import { IconCircleCheckFilled, IconMovie, IconPhoto } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ImageModelSelector } from '@/containers/images/ImageModelSelector'
import { useImageEngine } from '@/hooks/useImageEngine'
import { useImageSetting } from '@/hooks/useImageSetting'
import { useTranslation } from '@/i18n/react-i18next-compat'
import {
  selectHasInstalledModel,
  useImageGenerationStore,
} from '@/stores/image-generation-store'

/**
 * The model list for the places with no picker of their own (Media settings).
 * First run never opens it: the setup card installs the engine in one click,
 * and the studio's own picker fetches the model.
 *
 * Mounted once at the root like `VoiceSetupDialog`.
 */
const ImageSetupDialog = memo(function ImageSetupDialog() {
  const { t } = useTranslation()
  const open = useImageGenerationStore((state) => state.setupOpen)
  const setupModality = useImageGenerationStore((state) => state.setupModality)
  const openSetup = useImageGenerationStore((state) => state.openSetup)
  const closeSetup = useImageGenerationStore((state) => state.closeSetup)
  const hasModel = useImageGenerationStore(
    selectHasInstalledModel(setupModality)
  )
  const modelRunning = useImageGenerationStore(
    (state) => state.status?.model.state === 'loaded'
  )
  const setSetupCompleted = useImageSetting((state) => state.setSetupCompleted)
  const { installed: engineInstalled } = useImageEngine()

  const ready = engineInstalled && hasModel

  const finish = useCallback(() => {
    setSetupCompleted(true)
    closeSetup()
  }, [closeSetup, setSetupCompleted])

  const dismiss = useCallback(() => {
    if (ready) setSetupCompleted(true)
    closeSetup()
  }, [closeSetup, ready, setSetupCompleted])

  // It says so once there is nothing left to get: a download that lands must
  // change what the dialog says, not only one row in a long list.
  const ns = setupModality === 'video' ? 'videos' : 'images'
  const title = ready ? 'images:setup.ready.title' : `${ns}:setup.model.title`
  const description = !ready
    ? `${ns}:setup.model.description`
    : modelRunning
      ? 'images:setup.ready.descriptionRunning'
      : 'images:setup.ready.description'

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? openSetup(setupModality) : dismiss())}
    >
      <DialogContent className="sm:max-w-lg lg:max-w-lg xl:max-w-lg">
        <DialogHeader
          data-testid="image-setup-header"
          className="items-center text-center sm:text-center"
        >
          <div className="mb-2 grid size-14 place-items-center rounded-2xl border bg-secondary/60 shadow-sm">
            {ready ? (
              <IconCircleCheckFilled
                size={28}
                aria-hidden
                className="text-emerald-600 dark:text-emerald-400"
              />
            ) : setupModality === 'video' ? (
              <IconMovie size={28} aria-hidden />
            ) : (
              <IconPhoto size={28} aria-hidden />
            )}
          </div>
          <DialogTitle data-testid="image-setup-title">{t(title)}</DialogTitle>
          <DialogDescription
            data-testid="image-setup-description"
            className="h-10 text-pretty"
          >
            {t(description)}
          </DialogDescription>
        </DialogHeader>

        {/* A list that can grow with the catalog, so it gets its own scroll.
            It gives height back on a short window: the dialog stops at 85vh,
            and a fixed 360px pushed Done below that edge. */}
        <div
          data-testid="image-setup-slot"
          className="flex h-[clamp(180px,calc(85vh_-_15rem),360px)] flex-col justify-start gap-2 overflow-y-auto py-1"
        >
          <ImageModelSelector
            variant="dialog"
            modality={setupModality}
            onDownloadStarted={closeSetup}
          />
        </div>

        <DialogFooter className="sm:justify-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button
                  size="sm"
                  disabled={!ready}
                  data-testid="image-setup-done"
                  onClick={finish}
                >
                  {t('images:setup.done')}
                </Button>
              </span>
            </TooltipTrigger>
            {!ready && (
              <TooltipContent align="end">
                <p>{t('images:setup.doneBlocked')}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})

export default ImageSetupDialog
