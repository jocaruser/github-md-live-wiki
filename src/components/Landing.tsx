import { useState, type FormEvent } from 'react'
import { APP_NAME, APP_TAGLINE, PROJECT_URL } from '../appMeta'
import {
  isValidRepo,
  normalizeSelection,
  selectionKey,
  type Selection,
} from '../lib/library'
import type { Theme } from '../hooks/useTheme'

interface LandingProps {
  recents: Selection[]
  onOpen: (selection: Selection) => void
  onRemoveRecent: (selection: Selection) => void
  theme: Theme
  onToggleTheme: () => void
}

export function Landing({ recents, onOpen, onRemoveRecent, theme, onToggleTheme }: LandingProps) {
  const [repo, setRepo] = useState('')
  const [path, setPath] = useState('')
  const valid = isValidRepo(repo)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (valid) onOpen(normalizeSelection(repo, path))
  }

  return (
    <div className="min-h-screen bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">
      <div className="mx-auto flex max-w-xl flex-col gap-8 px-6 py-16">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{APP_NAME}</h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400">{APP_TAGLINE}</p>
          </div>
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Toggle colour theme"
            className="rounded p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </header>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Repository
            <input
              value={repo}
              onChange={(event) => setRepo(event.target.value)}
              placeholder="owner/repository"
              aria-label="Repository"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              className="rounded-md border border-slate-300 px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Path inside repository
            <input
              value={path}
              onChange={(event) => setPath(event.target.value)}
              placeholder="docs — leave empty for the repository root"
              aria-label="Path inside repository"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              className="rounded-md border border-slate-300 px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800"
            />
          </label>
          <button
            type="submit"
            disabled={!valid}
            className="self-start rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Load
          </button>
        </form>

        {recents.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Recent repositories
            </h2>
            <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
              {recents.map((item) => (
                <li key={selectionKey(item)} className="flex items-center gap-2 py-1">
                  <button
                    type="button"
                    onClick={() => onOpen(item)}
                    className="flex-1 truncate rounded px-2 py-1 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <span className="font-medium">{item.repo}</span>
                    <span className="text-slate-400"> / {item.path || '(root)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveRecent(item)}
                    aria-label={`Remove ${item.repo} from recent repositories`}
                    className="rounded px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="mt-auto pt-8 text-sm text-slate-400">
          <a href={PROJECT_URL} target="_blank" rel="noreferrer" className="hover:underline">
            {APP_NAME} on GitHub
          </a>
        </footer>
      </div>
    </div>
  )
}
