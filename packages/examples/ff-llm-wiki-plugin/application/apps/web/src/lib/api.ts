import type {
  DeleteDocumentResult,
  DocumentDetailResponse,
  DocumentProcessingResponse,
  DocumentsListResponse,
  DocumentsQuery,
  EvalLatestResponse,
  GraphEdgesResponse,
  GraphNodesResponse,
  GraphOverviewResponse,
  OverviewResponse,
  ReprocessResult,
  UpdateDocumentRequest,
  UpdateDocumentResult,
  UploadDocumentResult,
  WikiListResponse,
  WikiPageDetail,
  WikiQuery,
  WikiRecompileResult,
} from '@llmwiki/contracts'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

function apiUrl(path: string, query?: object) {
  const url = new URL(path, API_BASE_URL || window.location.origin)
  for (const [key, value] of Object.entries(query ?? {})) {
    if ((typeof value === 'string' || typeof value === 'number') && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }
  return API_BASE_URL ? url.toString() : `${url.pathname}${url.search}`
}

async function errorMessage(response: Response) {
  try {
    const data = (await response.json()) as { message?: string }
    return data.message ?? `请求失败（${response.status}）`
  } catch {
    return `请求失败（${response.status}）`
  }
}

async function request<T>(path: string, init?: RequestInit, query?: object) {
  const response = await fetch(apiUrl(path, query), init)
  if (!response.ok) throw new Error(await errorMessage(response))
  return response.json() as Promise<T>
}

/** Reads the current workbench overview. */
export function fetchOverview() {
  return request<OverviewResponse>('/api/overview')
}

/** Reads the latest quality evaluation report. */
export function fetchEvaluation() {
  return request<EvalLatestResponse>('/api/evaluation/latest')
}

/** Lists compiled Wiki pages using the supplied filters. */
export function fetchWikiList(query: WikiQuery = {}) {
  return request<WikiListResponse>('/api/wiki', undefined, query)
}

/** Reads one compiled Wiki page by slug. */
export function fetchWikiPage(slug: string) {
  return request<WikiPageDetail>(`/api/wiki/${encodeURIComponent(slug)}`)
}

/** Recompiles the Wiki from the current local knowledge data. */
export function recompileWiki() {
  return request<WikiRecompileResult>('/api/wiki/recompile', { method: 'POST' })
}

/** Lists uploaded and bundled documents using the supplied filters. */
export function fetchDocuments(query: DocumentsQuery = {}) {
  return request<DocumentsListResponse>('/api/documents', undefined, query)
}

/** Reads the latest processing job snapshot for a document. */
export function fetchDocumentProcessing(id: string) {
  return request<DocumentProcessingResponse>(`/api/documents/${encodeURIComponent(id)}/processing`)
}

/** Uploads a document and starts its local processing job. */
export function uploadDocument(file: File) {
  const body = new FormData()
  body.set('file', file)
  return request<UploadDocumentResult>('/api/documents', { method: 'POST', body })
}

/** Submits a document for local reprocessing. */
export function reprocessDocument(id: string) {
  return request<ReprocessResult>(`/api/documents/${encodeURIComponent(id)}/reprocess`, {
    method: 'POST',
  })
}

/** Reads a document together with its extracted content and Wiki links. */
export function fetchDocumentDetail(id: string) {
  return request<DocumentDetailResponse>(`/api/documents/${encodeURIComponent(id)}`)
}

/** Updates editable document metadata. */
export function updateDocument(id: string, update: UpdateDocumentRequest) {
  return request<UpdateDocumentResult>(`/api/documents/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  })
}

/** Deletes a document and its generated local artifacts. */
export function deleteDocument(id: string) {
  return request<DeleteDocumentResult>(`/api/documents/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

/** Reads aggregate graph statistics. */
export function fetchGraphOverview() {
  return request<GraphOverviewResponse>('/api/graph')
}

/** Lists all graph nodes. */
export function fetchGraphNodes() {
  return request<GraphNodesResponse>('/api/graph/nodes')
}

/** Lists all graph edges. */
export function fetchGraphEdges() {
  return request<GraphEdgesResponse>('/api/graph/edges')
}
