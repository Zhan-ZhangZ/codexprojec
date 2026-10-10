import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { makeVideoEstimate } from '@/lib/diffusion/__tests__/video-fixtures'

vi.mock('@/i18n/react-i18next-compat', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      key === 'videos:estimate.exceeds'
        ? `Needs ${values?.required} GB, ${values?.available} GB available`
        : key,
  }),
}))

import { ConfirmVideoExceedsMemory } from '../ConfirmVideoExceedsMemory'

/** The dialog as the form holds it: open until either answer closes it. */
function Harness({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void
  onCancel: () => void
}) {
  const [open, setOpen] = useState(true)
  return (
    <ConfirmVideoExceedsMemory
      open={open}
      estimate={makeVideoEstimate('exceeds')}
      onCancel={() => {
        setOpen(false)
        onCancel()
      }}
      onConfirm={() => {
        setOpen(false)
        onConfirm()
      }}
    />
  )
}

const setup = () => {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  render(<Harness onConfirm={onConfirm} onCancel={onCancel} />)
  return { onConfirm, onCancel, dialog: screen.getByRole('dialog') }
}

describe('ConfirmVideoExceedsMemory', () => {
  it('says what the clip needs against what there is and what to change, with Cancel focused', () => {
    const { dialog } = setup()
    expect(dialog).toHaveTextContent('videos:confirmExceeds.title')
    expect(dialog).toHaveTextContent('Needs 27.3 GB, 13.6 GB available')
    expect(dialog).toHaveTextContent('videos:confirmExceeds.body')
    expect(dialog).toHaveTextContent('videos:estimate.exceedsAdvice')
    expect(
      within(dialog).getByRole('button', { name: 'common:cancel' })
    ).toHaveFocus()
  })

  it('starts nothing on Escape', async () => {
    const { onConfirm, onCancel } = setup()
    await userEvent.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('starts nothing on Enter, which presses the focused Cancel', async () => {
    const { onConfirm, onCancel } = setup()
    await userEvent.keyboard('{Enter}')
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('starts nothing on a click outside', async () => {
    const { onConfirm, onCancel } = setup()
    // Radix listens for the outside pointer-down from the next tick on.
    await new Promise((resolve) => setTimeout(resolve, 0))
    const overlay = document.querySelector(
      '[data-slot="dialog-overlay"]'
    ) as HTMLElement
    await userEvent.click(overlay)
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('starts the clip on “Generate anyway”', async () => {
    const { onConfirm, onCancel } = setup()
    await userEvent.click(
      screen.getByRole('button', { name: 'videos:confirmExceeds.confirm' })
    )
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
