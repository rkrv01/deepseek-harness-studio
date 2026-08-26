import { describe, expect, it } from 'vitest'
import { projectUserMessageProjection, projectUserMessageText } from '@deepseek-ai/dsh-client-ui-conversation/src/client/chat/MessageItem.tsx'
import { projectAssistantMessageText } from '@deepseek-ai/dsh-client-ui-conversation/src/client/chat/AssistantMarkdown.tsx'

describe('project brain revision message projection', () => {
  it('keeps the readable revision summary while hiding only its private payload', () => {
    const summary = '请按以下调整重新生成项目方案：删除 1 项任务。'
    const text = `${summary}\n\n<!-- project-brain:revision %7B%22tasks%22%3A%5B%5D%7D -->`

    expect(projectUserMessageText(text)).toBe(summary)
  })

  it('does not remove ordinary HTML-like user text', () => {
    const text = '请保留 <!-- 用户自己的备注 --> 这段内容。'
    expect(projectUserMessageText(text)).toBe(text)
  })

  it('hides the generic scenario envelope from rendering and copying', () => {
    const text = '确认执行会议方案。\n\n<!-- project-brain:scenario %7B%22version%22%3A1%7D -->'
    expect(projectUserMessageText(text)).toBe('确认执行会议方案。')
  })

  it('hides legacy meeting envelopes when projecting historical user messages', () => {
    const text = '已调整会议任务，请重新生成会议任务拆解。\n\n<!-- project-brain:meeting-revision %5B%5D -->'

    expect(projectUserMessageProjection(text)).toEqual({
      text: '已调整会议任务，请重新生成会议任务拆解。',
      revisionDetails: [],
    })
  })

  it('hides a private marker while its payload is still streaming', () => {
    expect(projectAssistantMessageText('今日工作已排好。\n\n<!-- project-brain:surface %7B%22version%22%3A1')).toBe('今日工作已排好。\n\n')
  })

  it('keeps revision details available for an expandable transcript disclosure', () => {
    const text = '请按以下调整重新生成项目方案：调整阶段信息。\n\n<!-- project-brain:revision-summary %5B%22%E6%96%B9%E6%A1%88%E8%AE%BE%E8%AE%A1%E9%98%B6%E6%AE%B5%EF%BC%9A%E8%B4%9F%E8%B4%A3%E4%BA%BA%E8%B0%83%E6%95%B4%E4%B8%BA%E7%8E%8B%E8%8E%89%22%5D -->\n<!-- project-brain:revision %7B%7D -->'

    expect(projectUserMessageProjection(text)).toEqual({ text: '请按以下调整重新生成项目方案：调整阶段信息。', revisionDetails: ['方案设计阶段：负责人调整为王莉'] })
  })
})
