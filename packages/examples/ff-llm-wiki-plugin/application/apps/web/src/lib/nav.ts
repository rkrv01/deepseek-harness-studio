import type { ComponentType, SVGProps } from 'react'
import {
  DashboardIcon,
  DocumentIcon,
  EvalIcon,
  GraphIcon,
  QaIcon,
  SettingsIcon,
  WikiIcon,
} from '../components/Icons'

type NavItem = {
  href: string
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

/** Primary application navigation in its displayed order. */
export const NAV: NavItem[] = [
  { href: '/', label: '工作台', icon: DashboardIcon },
  { href: '/documents', label: '资料中心', icon: DocumentIcon },
  { href: '/wiki', label: '知识 Wiki', icon: WikiIcon },
  { href: '/knowledge-graph', label: '知识图谱', icon: GraphIcon },
  { href: '/ask', label: '智能问答', icon: QaIcon },
  { href: '/evaluation', label: '质量评估', icon: EvalIcon },
  { href: '/settings', label: '系统设置', icon: SettingsIcon },
]

/** Returns whether the supplied pathname belongs to a navigation item. */
export function isNavActive(pathname: string | null, item: NavItem) {
  if (!pathname) return false
  return item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(`${item.href}/`)
}
