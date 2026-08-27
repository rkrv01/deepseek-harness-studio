// AssistantMarkdown: renders assistant blocks in order — markdown text body,
// reasoning as the figma Think summary row (expand = indented gray text),
// other-block JSON fallback. Tool-call heads are NOT rendered here: the chat
// view groups them into tool rows through its keyed toolview slot (figma
// step-summary flow). Shared by finalized nodes and the streaming partial;
// the turn-level loading dots live in the chat view's tail, not here.
// Finalized content (text) nodes append IconActions once their turn ends
// (`time` is omitted for mid-turn narration and while the turn still runs);
// their branch action is enabled only when the node is also the completed
// turn's transcript tail. Think / tool-head-only nodes stay chrome-free.

import { Fragment, memo, useMemo } from 'react'
import type { ReactNode } from 'react'
import type { AssistantBlock } from '@deepseek-ai/dsh-client-runtime/client'
import { JsonBlock, MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'
import type { MarkdownFileMentions } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ChatNodeOwnerProps, ChatViewSlotProps } from '../contract/slots.ts'
import { ReasoningRow } from './ReasoningRow.tsx'
import css from './AssistantMarkdown.module.css'

export interface AssistantMarkdownProps {
  blocks: readonly AssistantBlock[]
  streaming: boolean
  /** Frozen partial of an aborted turn: rendered with a stopped marker. */
  interrupted?: boolean | undefined
  /** Render consecutive image blocks through the attachment slot. */
  renderMessageImages: ChatNodeOwnerProps['renderMessageImages']
  /** Resolved prose file mentions for this Assistant's closing turn. */
  mentions?: MarkdownFileMentions | undefined
  /** Inline board renderer for a leading project-brain surface marker. */
  assistantSurface: ChatNodeOwnerProps['assistantSurface']
  /** The owning view's locale seat, passed down as a plain prop. */
  t: ChatViewSlotProps['t']
}

/** Remove complete and currently streaming Project Brain protocol markers. */
export function projectAssistantMessageText(text: string): string {
  return text
    .replace(/<!-- project-brain:[a-z-]+(?: [A-Za-z0-9%._~-]+)? -->/gu, '')
    .replace(/<!-- project-brain[\s\S]*$/u, '')
}

const LEADING_SURFACE_MARKER = /^<!-- project-brain:surface ([A-Za-z0-9%._~-]+) -->/

/**
 * Extract the payload of a surface marker that opens the reply, or null when
 * the text does not (yet) start with a complete leading marker.
 */
export function leadingSurfacePayload(text: string): string | null {
  const match = LEADING_SURFACE_MARKER.exec(text)
  return match?.[1] ?? null
}

/** Reasoning block as the Think variant summary row (figma 39:28304). */
export const AssistantMarkdown = memo(function AssistantMarkdown({
  blocks, streaming, interrupted, renderMessageImages, mentions, assistantSurface, t,
}: AssistantMarkdownProps) {
  // Stable per locale revision (t identity changes on switch): a fresh object
  // per render would rebuild MarkdownText's component table every chunk.
  const codeLabels = useMemo(() => ({ copyLabel: t('copy'), copiedLabel: t('copied') }), [t])
  const last = blocks.length - 1
  // Tool-call heads render as tool rows in the chat view's grouping pass, so
  // a node that is only those heads (or empty) would paint an empty root
  // between tool groups — skip the shell unless something visible remains.
  const hasVisible = streaming
    || interrupted === true
    || blocks.some(block => block.kind !== 'tool-call')
  if (!hasVisible) return null
  const rendered: ReactNode[] = []
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    if (block === undefined) continue
    switch (block.kind) {
      case 'text':
        // A surface marker opening the FIRST text block inlines its board above
        // the prose: the board leads the message while the wrap-up streams as
        // ordinary markdown beneath it. Later text blocks never carry it.
        if (i === blocks.findIndex(candidate => candidate?.kind === 'text')) {
          const payload = leadingSurfacePayload(block.text)
          if (payload !== null) {
            const board = assistantSurface(payload)
            if (board !== null) rendered.push(<Fragment key={`surface-${i}`}>{board}</Fragment>)
          }
        }
        rendered.push(
          <MarkdownText
            key={i}
            text={projectAssistantMessageText(block.text)}
            streaming={streaming}
            codeLabels={codeLabels}
            fileMentions={mentions}
          />,
        )
        break
      case 'reasoning':
        rendered.push(<ReasoningRow key={i} text={block.text} running={streaming && i === last} t={t} />)
        break
      case 'image': {
        // Consecutive image blocks share one gallery so several images tile
        // into rows instead of each opening a one-image group of its own.
        // Keyed by the group's FIRST block index: a streaming append that
        // extends the group then only grows `images` instead of remounting
        // the gallery under a shifted key.
        const start = i
        const group = [block]
        while (i + 1 < blocks.length) {
          const next = blocks[i + 1]
          if (next === undefined || next.kind !== 'image') break
          group.push(next)
          i += 1
        }
        rendered.push(
          <Fragment key={start}>
            {renderMessageImages({
              images: group.map(({ attachment }) => ({ attachment })),
              align: 'start',
            })}
          </Fragment>,
        )
        break
      }
      // Grouped into tool rows by ChatView; hasVisible above skips an empty shell.
      case 'tool-call':
        break
      default:
        rendered.push(
          <JsonBlock
            key={i}
            label={t('message.unknownBlock')}
            payload={block.block}
            truncatedLabel={total => t('json.truncated', { total })}
          />,
        )
    }
  }
  return (
    <div className={css.root} data-streaming={streaming || undefined}>
      <div className={css.body}>
        {rendered}
        {interrupted && <span className={css.stopped}>{t('message.stopped')}</span>}
      </div>
    </div>
  )
})
