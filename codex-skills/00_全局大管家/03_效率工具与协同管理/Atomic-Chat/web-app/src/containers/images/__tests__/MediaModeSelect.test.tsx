import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { IconBrush, IconPhotoVideo, IconSparkles } from '@tabler/icons-react'

import { MediaModeSelect, type MediaMode } from '../MediaModeSelect'

const MODES: MediaMode<'create' | 'inpaint' | 'animate'>[] = [
  { id: 'create', icon: IconSparkles, title: 'Create', hint: 'From a prompt' },
  {
    id: 'inpaint',
    icon: IconBrush,
    title: 'Inpaint',
    hint: 'A painted region',
  },
  {
    id: 'animate',
    icon: IconPhotoVideo,
    title: 'Animate',
    hint: 'A still image',
    disabled: true,
    badge: 'Soon',
  },
]

function renderSelect(value: 'create' | 'inpaint' | 'animate' = 'create') {
  const onChange = vi.fn()
  render(
    <MediaModeSelect
      modes={MODES}
      value={value}
      onChange={onChange}
      label="Mode"
      testIdPrefix="image"
    />
  )
  return onChange
}

describe('MediaModeSelect', () => {
  it('labels the pill Mode, names the active mode in it and keeps the hints for the list', () => {
    renderSelect('inpaint')

    expect(screen.getByText('Mode')).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Mode Inpaint' })
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.getByTestId('image-workflow-title')).toHaveTextContent(
      'Inpaint'
    )
    expect(screen.getByTestId('image-workflow-select')).toHaveAttribute(
      'data-mode',
      'inpaint'
    )
    expect(screen.queryByText('A painted region')).not.toBeInTheDocument()
    expect(screen.queryByTestId('image-workflow-menu')).not.toBeInTheDocument()
  })

  it('lists every mode with its hint and marks the active one', async () => {
    const user = userEvent.setup()
    renderSelect('create')

    await user.click(screen.getByTestId('image-workflow-select'))

    const menu = screen.getByTestId('image-workflow-menu')
    expect(menu).toHaveTextContent('From a prompt')
    expect(menu).toHaveTextContent('A painted region')
    expect(screen.getByTestId('image-workflow-option-create')).toHaveAttribute(
      'data-selected',
      'true'
    )
    expect(screen.getByTestId('image-workflow-option-inpaint')).toHaveAttribute(
      'data-selected',
      'false'
    )
  })

  it('reports a picked mode and closes', async () => {
    const user = userEvent.setup()
    const onChange = renderSelect('create')

    await user.click(screen.getByTestId('image-workflow-select'))
    await user.click(screen.getByTestId('image-workflow-option-inpaint'))

    expect(onChange).toHaveBeenCalledWith('inpaint')
    expect(screen.queryByTestId('image-workflow-menu')).not.toBeInTheDocument()
  })

  it('does not report the mode that is already active', async () => {
    const user = userEvent.setup()
    const onChange = renderSelect('create')

    await user.click(screen.getByTestId('image-workflow-select'))
    await user.click(screen.getByTestId('image-workflow-option-create'))

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByTestId('image-workflow-menu')).not.toBeInTheDocument()
    expect(screen.getByTestId('image-workflow-select')).toHaveAttribute(
      'data-mode',
      'create'
    )
  })

  it('lists a mode that is not ready yet with its badge, but will not pick it', async () => {
    const user = userEvent.setup()
    const onChange = renderSelect('create')

    await user.click(screen.getByTestId('image-workflow-select'))
    const animate = screen.getByTestId('image-workflow-option-animate')
    expect(animate).toHaveAttribute('data-disabled')
    expect(animate).toHaveTextContent('Soon')

    await user.click(animate)
    expect(onChange).not.toHaveBeenCalled()
  })
})
