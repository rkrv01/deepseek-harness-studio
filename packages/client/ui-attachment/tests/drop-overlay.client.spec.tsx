// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { DropOverlay } from '../src/DropOverlay.tsx'
import { dropOverlayLabels } from '../src/client/labels.ts'

afterEach(cleanup)

describe('DropOverlay', () => {
  it('portals the invitation with its title and limits desc to the body', () => {
    const view = render(
      <DropOverlay disabled={false} labels={{ title: '图片拖动到此处即可添加', desc: '最多 20 张，每张 5MB' }} />,
    )
    const overlay = view.getByRole('status')
    expect(overlay.parentElement).toBe(document.body)
    expect(overlay.textContent).toContain('图片拖动到此处即可添加')
    expect(overlay.textContent).toContain('最多 20 张，每张 5MB')
  })

  it('omits the desc line when none is resolved', () => {
    const view = render(<DropOverlay disabled={false} labels={{ title: '图片拖动到此处即可添加' }} />)
    expect(view.getByRole('status').textContent).toBe('图片拖动到此处即可添加')
  })

  it('drops the desc and switches the illustration while disabled', () => {
    const enabled = render(
      <DropOverlay disabled={false} labels={{ title: '拖入', desc: '限制' }} />,
    )
    const enabledSvg = enabled.getByRole('status').querySelector('svg')!.innerHTML
    enabled.unmount()
    const disabled = render(
      <DropOverlay disabled labels={{ title: '当前无法添加图片', desc: '限制' }} />,
    )
    const overlay = disabled.getByRole('status')
    expect(overlay.textContent).toBe('当前无法添加图片')
    expect(overlay.querySelector('svg')!.innerHTML).not.toBe(enabledSvg)
  })
})

describe('dropOverlayLabels documents branch', () => {
  it('resolves the mixed image-and-document copy for project-brain sessions', () => {
    const zh = ((t: string) => ({
      'image.dropTitle.mixed': '图片或文件拖动到此处即可添加',
      'image.dropDesc.mixed': '图片最多 {count} 张、每张 {size}；文档支持 txt / Markdown / Word / Excel / PDF',
    })[t] ?? t) as never
    const labels = dropOverlayLabels(zh as never, true, { count: 20, size: '20MB' }, { documents: true })
    expect(labels.title).toBe('图片或文件拖动到此处即可添加')
    expect(labels.desc).toContain('Word / Excel / PDF')

    const imageOnly = dropOverlayLabels(zh as never, true, { count: 20, size: '20MB' })
    expect(imageOnly.title).toBe('image.dropTitle')
    expect(imageOnly.desc).toBe('image.dropDesc')
  })
})
