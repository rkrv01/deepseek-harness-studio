import type { GraphEdgeSemantic, GraphNodeType } from '@llmwiki/contracts'

/** Display labels for graph node types. */
export const NODE_TYPE_LABEL: Record<GraphNodeType, string> = {
  PAGE: '知识页',
  SOURCE: '来源文档',
  TOPIC: '主题',
  PAGE_TYPE: '页面类型',
}

/** Stable colors shared by graph controls, legends, and node rendering. */
export const NODE_TYPE_COLOR: Record<GraphNodeType, string> = {
  PAGE: '#86d8bb',
  SOURCE: '#c99a4a',
  TOPIC: '#f2d166',
  PAGE_TYPE: '#6f93a7',
}

/** Display order for graph node-type filters. */
export const NODE_TYPE_ORDER: GraphNodeType[] = ['PAGE', 'SOURCE', 'TOPIC', 'PAGE_TYPE']

/** Display labels for graph edge semantics. */
export const SEMANTIC_LABEL: Record<GraphEdgeSemantic, string> = {
  LINKS_TO: '页面关联',
  HAS_SOURCE: '引用来源',
  HAS_TOPIC: '所属主题',
  HAS_TYPE: '页面类型',
}

/** Display order for graph edge-semantic filters. */
export const SEMANTIC_ORDER: GraphEdgeSemantic[] = [
  'LINKS_TO',
  'HAS_SOURCE',
  'HAS_TOPIC',
  'HAS_TYPE',
]

/** Edge weights passed to the graph layout. */
export const SEMANTIC_WEIGHT: Record<GraphEdgeSemantic, number> = {
  LINKS_TO: 2,
  HAS_SOURCE: 1,
  HAS_TOPIC: 1.5,
  HAS_TYPE: 1,
}

/** Edges shown by default before optional relationship filters are enabled. */
export const DEFAULT_VISIBLE_SEMANTICS: GraphEdgeSemantic[] = ['LINKS_TO', 'HAS_TOPIC']
