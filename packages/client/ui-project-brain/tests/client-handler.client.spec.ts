// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import type { ClientContext, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import { apply } from '../src/client/index.ts'

describe('project brain client submit handler', () => {
  it('passes submitted document metadata into the launch-plan snapshot', () => {
    let submitHandler: ((request: unknown) => undefined) | undefined
    let brain: { getSnapshot(): { plan?: { documents?: unknown[] } } } | undefined
    const sessionId = 'brain-session' as SessionId
    const ctx = {
      effect: (register: () => () => void) => register(),
      provide: () => {},
      get: () => ({
        registerSubmitHandler: (handler: (request: unknown) => undefined) => {
          submitHandler = handler
          return () => {}
        },
      }),
      sessions: {
        binding: () => undefined,
        list: { getSnapshot: () => ({ byId: { [sessionId]: { agentPreset: 'project-brain' } } }) },
      },
      layout: { openDetails: vi.fn(), closeDetails: vi.fn() },
      slots: {
        register: (spec: { inject?: (id: SessionId) => { hooks: { projectBrain: { getSnapshot(): unknown } } } }) => ({
          inject: spec.inject,
          dispose: () => {},
        }),
        inject: (
          slotName: string,
          register: () => { inject?: (id: SessionId) => { hooks: { projectBrain: { getSnapshot(): unknown } } } },
        ) => {
          const entry = register()
          if (entry.inject === undefined || slotName !== 'conversation.chat.turnTail') return { id: slotName, dispose: () => {} }
          const injected = entry.inject(sessionId)
          brain = injected.hooks.projectBrain as typeof brain
          return { id: slotName, dispose: () => {} }
        },
      },
    }

    apply(ctx as unknown as ClientContext)
    const document = { name: '项目立项报告.pdf', type: 'application/pdf', size: 24 }
    submitHandler?.({
      sessionId,
      text: '帮我启动智慧园区建设项目。',
      imageIds: [],
      documentIds: ['doc-1'],
      documentMetas: [document],
      mode: 'queue',
      signal: new AbortController().signal,
    })

    expect(brain?.getSnapshot().plan?.documents).toEqual([document])
  })
})
