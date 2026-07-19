import type { ReactNode } from 'react'
import type { Theme } from '../hooks/useTheme'

interface TopBarProps {
  siteTitle: string
  homeHref: string
  appUrl: string
  repoUrl?: string
  theme: Theme
  onToggleTheme: () => void
  onToggleSidebar: () => void
  children?: ReactNode
}

export function TopBar({
  siteTitle,
  homeHref,
  appUrl,
  repoUrl,
  theme,
  onToggleTheme,
  onToggleSidebar,
  children,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-slate-200 bg-white/95 px-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 sm:gap-3 sm:px-4">
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label="Toggle navigation"
        className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 md:hidden"
      >
        ☰
      </button>
      <a href={homeHref} className="truncate text-base font-semibold text-slate-800 dark:text-slate-100">
        {siteTitle}
      </a>
      <div className="ml-auto flex items-center gap-2">{children}</div>
      {appUrl && (
        <a
          href={appUrl}
          target="_blank"
          rel="noreferrer"
          className="hidden text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 sm:block"
        >
          App ↗
        </a>
      )}
      {repoUrl && (
        <a
          href={repoUrl}
          target="_blank"
          rel="noreferrer"
          className="hidden text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 sm:block"
        >
          GitHub ↗
        </a>
      )}
      <button
        type="button"
        onClick={onToggleTheme}
        aria-label="Toggle colour theme"
        className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </header>
  )
}
