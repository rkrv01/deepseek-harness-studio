import type {
  QaAnswer,
  QaCitation,
  QaConnectionTestResponse,
  QaFallbackItem,
  QaModelConfigResponse,
  QaModelId,
  QaResponse,
} from '@llmwiki/contracts'
import type { ModelPreferences } from './model-settings'

type QaStreamChunk =
  | { type: 'meta'; metrics: QaResponse['metrics']; compiledAt: string; confidence: QaResponse['confidence']; mode: QaResponse['mode']; model: QaModelId; providerConfigured: boolean }
  | { type: 'generation'; generation?: QaResponse['generation']; mode: QaResponse['mode'] }
  | { type: 'delta'; text: string }
  | { type: 'answer_complete'; answers: QaAnswer[] }
  | { type: 'answer'; answer: QaAnswer }
  | { type: 'citations'; citations: QaCitation[] }
  | { type: 'fallback'; fallback: QaFallbackItem[] }
  | { type: 'done' }

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

function apiUrl(path: string) {
  return API_BASE_URL ? new URL(path, API_BASE_URL).toString() : path
}

async function responseMessage(response: Response) {
  try {
    const data = (await response.json()) as { message?: string }
    return data.message ?? `请求失败（${response.status}）`
  } catch {
    return `请求失败（${response.status}）`
  }
}

async function request<T>(path: string, init?: RequestInit) {
  const response = await fetch(apiUrl(path), init)
  if (!response.ok) throw new Error(await responseMessage(response))
  return response.json() as Promise<T>
}

/** Reads the public model configuration without exposing credentials. */
export function getQaModelConfig() {
  return request<QaModelConfigResponse>('/api/qa/config')
}

/** Runs a minimal provider connectivity test for the selected model. */
export function testQaModelConnection(model: QaModelId) {
  return request<QaConnectionTestResponse>('/api/qa/config/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model }),
  })
}

function emitResponse(response: QaResponse, onChunk: (chunk: QaStreamChunk) => void) {
  onChunk({
    type: 'meta',
    metrics: response.metrics,
    compiledAt: response.compiledAt,
    confidence: response.confidence,
    mode: response.mode,
    model: response.generation?.model ?? 'deepseek-v4-flash',
    providerConfigured: response.generation?.provider === 'deepseek',
  })
  if (response.generation) onChunk({ type: 'generation', generation: response.generation, mode: response.mode })
  onChunk({ type: 'answer_complete', answers: response.answers })
  if (response.citations.length > 0) onChunk({ type: 'citations', citations: response.citations })
  if (response.fallback.length > 0) onChunk({ type: 'fallback', fallback: response.fallback })
}

/** Streams a knowledge answer and exposes each server-sent update to the question view. */
export async function streamQa(
  question: string,
  preferences: ModelPreferences,
  onChunk: (chunk: QaStreamChunk) => void,
  onDone: () => void,
  onError: (message: string) => void,
) {
  try {
    const response = await fetch(apiUrl('/api/qa/stream'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, ...preferences }),
    })
    if (!response.ok) throw new Error(await responseMessage(response))

    if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) {
      emitResponse((await response.json()) as QaResponse, onChunk)
      onDone()
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let pending = ''
    let completed = false
    while (true) {
      const { done, value } = await reader.read()
      pending += decoder.decode(value, { stream: !done })
      const messages = pending.split('\n\n')
      pending = messages.pop() ?? ''
      for (const message of messages) {
        const data = message.split('\n').find(line => line.startsWith('data: '))?.slice(6)
        if (!data) continue
        const chunk = JSON.parse(data) as QaStreamChunk
        if (chunk.type === 'done') completed = true
        else onChunk(chunk)
      }
      if (done) break
    }
    if (completed) onDone()
    else throw new Error('问答流意外结束，请重试')
  } catch (error) {
    onError(error instanceof Error ? error.message : '问答请求失败，请重试')
  }
}
